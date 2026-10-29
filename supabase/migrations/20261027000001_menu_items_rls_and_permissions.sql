BEGIN;

-- ==============================================================================
-- MIGRATION: 20261027000001_menu_items_rls_and_permissions.sql
-- OBJETIVO: 
--   1. Conceder privilégios de tabela e definir políticas RLS seguras para
--      INSERT, UPDATE e DELETE em public.menu_items para dono da loja e admin.
--   2. Manter estritamente intacta a política existente 'public_read_available_menu_items'.
--   3. Proteger public.profiles contra escalonamento de privilégios com trigger seguro,
--      eliminando qualquer recursão na política RLS de profiles.
--   4. Configurar o bucket 'Zaplanche-images' no Supabase Storage:
--      - Leitura pública preservada de imagens (SELECT);
--      - Uploads (INSERT), alterações (UPDATE) e exclusões (DELETE) restritos
--        estritamente ao comerciante dono da loja ou admin autorizado.
--   5. Garantir persistência de dados de restaurantes (logo_url, banner_url) e nome do
--      proprietário no Supabase.
-- ==============================================================================

-- 1. Privilégios no nível de tabela (PostgreSQL Grants) para menu_items
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;

-- 2. Garantir que RLS esteja habilitado na tabela
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 3. Funções Auxiliares de Autorização Blindadas (SECURITY DEFINER + STABLE)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT (auth.uid() IS NOT NULL) AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_owner(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT (auth.uid() IS NOT NULL) AND (p_restaurant_id IS NOT NULL) AND EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = p_restaurant_id
      AND owner_profile_id = auth.uid()
  );
$$;

-- Função auxiliar para validar permissão de gerenciamento no Supabase Storage
CREATE OR REPLACE FUNCTION public.can_manage_storage_object(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_object_name IS NULL THEN
    RETURN false;
  END IF;

  IF p_object_name !~ '^restaurants/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[^/]+$' THEN
    RETURN false;
  END IF;

  IF public.is_admin() THEN
    RETURN true;
  END IF;

  BEGIN
    v_restaurant_id := split_part(p_object_name, '/', 2)::uuid;
  EXCEPTION
    WHEN others THEN
      RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = v_restaurant_id
      AND r.owner_profile_id = auth.uid()
  );
END;
$$;

-- Restrição de execução das funções: revoga de PUBLIC e concede somente a authenticated e service_role
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_restaurant_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_restaurant_owner(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_manage_storage_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_storage_object(text) TO authenticated, service_role;

-- 4. Limpeza Idempotente Apenas das Políticas Desta Migration
-- (A regra 'public_read_available_menu_items' é estritamente preservada)
DROP POLICY IF EXISTS "menu_items_select_owner" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_insert_owner" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_update_owner" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_delete_owner" ON public.menu_items;

-- 5. Leitura do Proprietário / Admin (SELECT):
-- Permite que o comerciante responsável ou admin visualize e receba no RETURNING
-- todos os itens do seu estabelecimento, inclusive os pausados ou em rascunho.
-- A política pública 'public_read_available_menu_items' continua preservada para clientes.
CREATE POLICY "menu_items_select_owner"
ON public.menu_items
FOR SELECT
TO authenticated
USING (
  public.is_restaurant_owner(restaurant_id) OR public.is_admin()
);

-- 6. Inserção (INSERT): Somente o comerciante proprietário da loja ou admin autorizado
CREATE POLICY "menu_items_insert_owner"
ON public.menu_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_restaurant_owner(restaurant_id) OR public.is_admin()
);

-- 7. Edição (UPDATE): Somente o proprietário da loja ou admin autorizado
CREATE POLICY "menu_items_update_owner"
ON public.menu_items
FOR UPDATE
TO authenticated
USING (
  public.is_restaurant_owner(restaurant_id) OR public.is_admin()
)
WITH CHECK (
  public.is_restaurant_owner(restaurant_id) OR public.is_admin()
);

-- 8. Exclusão (DELETE): Somente o proprietário da loja ou admin autorizado
CREATE POLICY "menu_items_delete_owner"
ON public.menu_items
FOR DELETE
TO authenticated
USING (
  public.is_restaurant_owner(restaurant_id) OR public.is_admin()
);

-- 9. Suporte a foto de logo e atualização de restaurantes pelo proprietário
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS logo_url text;
GRANT SELECT ON public.restaurants TO anon, authenticated;
GRANT UPDATE ON public.restaurants TO authenticated;

DROP POLICY IF EXISTS "restaurants_update_owner" ON public.restaurants;
CREATE POLICY "restaurants_update_owner"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (
  (owner_profile_id = auth.uid()) OR public.is_admin()
)
WITH CHECK (
  (owner_profile_id = auth.uid()) OR public.is_admin()
);

-- 10. Persistência de public.profiles e BLINDAGEM CONTRA ESCALONAMENTO SEM RECURSÃO
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- 10.1 Trigger de Integridade: impede estritamente que usuários comuns alterem o papel (role)
CREATE OR REPLACE FUNCTION public.protect_profiles_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Se for atualização e o campo 'role' estiver sendo modificado
  IF TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores autorizados podem alterar o papel (role) de um perfil.';
    END IF;
  END IF;

  -- Se for inserção com role admin por usuário não-admin
  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Acesso negado: auto-atribuição do papel admin não é permitida.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profiles_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profiles_role() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_profiles_role ON public.profiles;
CREATE TRIGGER trg_protect_profiles_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profiles_role();

-- 10.2 Política RLS sem subconsultas a public.profiles (elimina qualquer recursão de RLS)
DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (id = auth.uid()) OR public.is_admin()
)
WITH CHECK (
  (id = auth.uid()) OR public.is_admin()
);

-- 11. Configuração e Políticas para Supabase Storage (bucket Zaplanche-images)
DO $$
BEGIN
  -- a) Garantir criação e configuração do bucket público em storage.buckets
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'Zaplanche-images',
      'Zaplanche-images',
      true,
      5242880, -- 5 MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    )
    ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  -- b) Políticas RLS em storage.objects para upload, upsert, exclusão e leitura pública
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    GRANT SELECT ON storage.objects TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

    -- Limpeza de políticas prévias
    DROP POLICY IF EXISTS "zaplanche_images_select_public" ON storage.objects;
    DROP POLICY IF EXISTS "zaplanche_images_insert_auth" ON storage.objects;
    DROP POLICY IF EXISTS "zaplanche_images_update_auth" ON storage.objects;
    DROP POLICY IF EXISTS "zaplanche_images_delete_auth" ON storage.objects;
    DROP POLICY IF EXISTS "zaplanche_images_insert_owner_admin" ON storage.objects;
    DROP POLICY IF EXISTS "zaplanche_images_update_owner_admin" ON storage.objects;
    DROP POLICY IF EXISTS "zaplanche_images_delete_owner_admin" ON storage.objects;

    -- 1. Leitura pública preservada de imagens no bucket Zaplanche-images
    CREATE POLICY "zaplanche_images_select_public"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'Zaplanche-images');

    -- 2. Inserção / Upload restrito estritamente ao dono da loja ou admin
    CREATE POLICY "zaplanche_images_insert_owner_admin"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'Zaplanche-images'
      AND public.can_manage_storage_object(name)
    );

    -- 3. Alteração / Upsert restrito estritamente ao dono da loja ou admin
    CREATE POLICY "zaplanche_images_update_owner_admin"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'Zaplanche-images'
      AND public.can_manage_storage_object(name)
    )
    WITH CHECK (
      bucket_id = 'Zaplanche-images'
      AND public.can_manage_storage_object(name)
    );

    -- 4. Exclusão restrita estritamente ao dono da loja ou admin
    CREATE POLICY "zaplanche_images_delete_owner_admin"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'Zaplanche-images'
      AND public.can_manage_storage_object(name)
    );
  END IF;
END $$;

COMMIT;
