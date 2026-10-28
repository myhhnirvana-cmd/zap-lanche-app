BEGIN;

-- ==============================================================================
-- MIGRATION: 20261027000001_menu_items_rls_and_permissions.sql
-- OBJETIVO: Conceder privilégios de tabela e definir políticas RLS seguras
--           para INSERT, UPDATE e DELETE em public.menu_items.
-- PRESERVAÇÃO: A política existente 'public_read_available_menu_items' é mantida intacta.
-- ANTI-RECURSÃO & SEGURANÇA: Funções SECURITY DEFINER com search_path blindado,
--                           verificação explícita contra nulos e escopo restrito a
--                           proprietários da loja ou administradores autorizados.
-- ==============================================================================

-- 1. Privilégios no nível de tabela (PostgreSQL Grants)
-- PostgREST exige privilégios de tabela antes da validação das regras RLS.
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;

-- 2. Garantir que RLS esteja habilitado na tabela
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 3. Funções Auxiliares de Autorização Blindadas (SECURITY DEFINER + STABLE)
-- Medidas de Segurança:
-- a) search_path fixo em 'public, auth, pg_temp' para blindar contra ataques de injeção de schema.
-- b) Checagem explícita 'auth.uid() IS NOT NULL' para rejeitar sessões anônimas/inválidas.
-- c) Checagem 'p_restaurant_id IS NOT NULL' para impedir matching acidental em lojas sem proprietário.
-- d) STABLE para otimizar execução sem reavaliar recursivamente para cada linha.

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

-- Restrição de execução: revoga de PUBLIC e concede somente a authenticated e service_role
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_restaurant_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_restaurant_owner(uuid) TO authenticated, service_role;

-- 4. Limpeza Idempotente Apenas das Políticas Desta Migration
-- (A regra 'public_read_available_menu_items' é estritamente preservada)
DROP POLICY IF EXISTS "menu_items_insert_owner" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_update_owner" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_delete_owner" ON public.menu_items;

-- 5. Inserção (INSERT): Somente o comerciante proprietário da loja ou admin autorizado
CREATE POLICY "menu_items_insert_owner"
ON public.menu_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_restaurant_owner(restaurant_id) OR public.is_admin()
);

-- 6. Edição (UPDATE): Somente o proprietário da loja ou admin autorizado
-- USING: Garante que só pode selecionar/afetar itens da sua própria loja.
-- WITH CHECK: Impede transferir a posse do item alterando seu restaurant_id para outra loja.
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

-- 7. Exclusão (DELETE): Somente o proprietário da loja ou admin autorizado
CREATE POLICY "menu_items_delete_owner"
ON public.menu_items
FOR DELETE
TO authenticated
USING (
  public.is_restaurant_owner(restaurant_id) OR public.is_admin()
);

COMMIT;
