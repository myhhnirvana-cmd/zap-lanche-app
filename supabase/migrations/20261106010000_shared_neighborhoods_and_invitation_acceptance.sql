BEGIN;

CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  zone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Rio de Janeiro',
  state text NOT NULL DEFAULT 'RJ',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS neighborhoods_name_city_state_unique
  ON public.neighborhoods (lower(btrim(name)), lower(btrim(city)), upper(btrim(state)));

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.neighborhoods FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.neighborhoods TO anon, authenticated;
DROP POLICY IF EXISTS neighborhoods_public_read_active ON public.neighborhoods;
CREATE POLICY neighborhoods_public_read_active
  ON public.neighborhoods FOR SELECT TO anon, authenticated
  USING (is_active = true);

INSERT INTO public.neighborhoods (name, zone, city, state)
VALUES
  ('Jacarepaguá', 'Zona Oeste', 'Rio de Janeiro', 'RJ'),
  ('Freguesia (Jacarepaguá)', 'Zona Oeste', 'Rio de Janeiro', 'RJ'),
  ('Cidade de Deus', 'Zona Oeste', 'Rio de Janeiro', 'RJ'),
  ('Taquara', 'Zona Oeste', 'Rio de Janeiro', 'RJ')
ON CONFLICT (lower(btrim(name)), lower(btrim(city)), upper(btrim(state))) DO NOTHING;

INSERT INTO public.neighborhoods (name, zone, city, state)
SELECT DISTINCT btrim(r.neighborhood), '', 'Rio de Janeiro', 'RJ'
FROM public.restaurants r
WHERE nullif(btrim(r.neighborhood), '') IS NOT NULL
ON CONFLICT (lower(btrim(name)), lower(btrim(city)), upper(btrim(state))) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_neighborhood(
  p_name text,
  p_city text DEFAULT 'Rio de Janeiro',
  p_state text DEFAULT 'RJ'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_name text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_city text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_city, 'Rio de Janeiro')), '\s+', ' ', 'g');
  v_state text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_state, 'RJ')));
  v_id uuid;
  v_row public.neighborhoods%ROWTYPE;
  v_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para adicionar um bairro.' USING ERRCODE = '42501';
  END IF;
  IF pg_catalog.char_length(v_name) < 2 OR pg_catalog.char_length(v_name) > 60 THEN
    RAISE EXCEPTION 'Informe um bairro com 2 a 60 caracteres.';
  END IF;
  IF pg_catalog.char_length(v_city) < 2 OR pg_catalog.char_length(v_city) > 80
     OR pg_catalog.char_length(v_state) <> 2 THEN
    RAISE EXCEPTION 'Cidade ou estado inválido.';
  END IF;

  INSERT INTO public.neighborhoods (name, city, state, zone, created_by)
  VALUES (v_name, v_city, v_state, '', auth.uid())
  ON CONFLICT (lower(btrim(name)), lower(btrim(city)), upper(btrim(state))) DO NOTHING;

  SELECT n.* INTO v_row
  FROM public.neighborhoods n
  WHERE lower(btrim(n.name)) = lower(v_name)
    AND lower(btrim(n.city)) = lower(v_city)
    AND upper(btrim(n.state)) = v_state
    AND n.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não foi possível cadastrar ou localizar este bairro.';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.restaurants r
  WHERE r.status = 'ativo'
    AND lower(btrim(coalesce(r.neighborhood, ''))) = lower(v_name);

  RETURN pg_catalog.jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'zone', v_row.zone,
    'city', v_row.city,
    'state', v_row.state,
    'activeSpotsCount', v_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_neighborhood(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_neighborhood(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_admin()
     AND NOT (
       OLD.role = 'cliente'
       AND NEW.role = 'comerciante'
       AND current_setting('app.accept_invitation_profile_id', true) = NEW.id::text
     ) THEN
    RAISE EXCEPTION 'Você não tem permissão para alterar o papel do perfil.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_invitation_proc(
    p_token_hash text,
    p_user_id uuid,
    p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
    v_invitation_id uuid;
    v_restaurant_id uuid;
    v_invitation_email text;
    v_authenticated_email text;
    v_profile_role text;
    v_owner_id uuid;
    v_restaurant_status text;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Sessão inválida para aceitar o convite.';
    END IF;
    IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Dados do convite inválidos.';
    END IF;

    SELECT i.id, i.restaurant_id, i.email
      INTO v_invitation_id, v_restaurant_id, v_invitation_email
      FROM public.pending_invitations AS i
     WHERE i.token_hash = p_token_hash
       AND i.status = 'pending'
       AND i.expires_at > pg_catalog.now()
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Convite inválido, utilizado ou expirado.';
    END IF;

    IF v_invitation_email IS NOT NULL THEN
        SELECT pg_catalog.lower(pg_catalog.btrim(u.email))
          INTO v_authenticated_email
          FROM auth.users AS u
         WHERE u.id = p_user_id;
        IF NOT FOUND
           OR v_authenticated_email IS NULL
           OR p_email IS NULL
           OR pg_catalog.lower(pg_catalog.btrim(p_email)) IS DISTINCT FROM v_authenticated_email
           OR pg_catalog.lower(pg_catalog.btrim(v_invitation_email)) IS DISTINCT FROM v_authenticated_email THEN
            RAISE EXCEPTION 'Convite inválido, utilizado ou expirado.';
        END IF;
    END IF;

    SELECT p.role INTO v_profile_role
      FROM public.profiles p
     WHERE p.id = p_user_id
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil do usuário não encontrado.';
    END IF;
    IF v_profile_role IS DISTINCT FROM 'cliente' THEN
        RAISE EXCEPTION 'Esta conta não pode aceitar o convite.';
    END IF;

    SELECT r.owner_profile_id, r.status
      INTO v_owner_id, v_restaurant_status
      FROM public.restaurants r
     WHERE r.id = v_restaurant_id
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Restaurante não encontrado.';
    END IF;
    IF v_restaurant_status IS DISTINCT FROM 'ativo' OR v_owner_id IS NOT NULL THEN
        RAISE EXCEPTION 'Restaurante indisponível para vinculação.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_profile_id = p_user_id) THEN
        RAISE EXCEPTION 'Esta conta já administra um restaurante.';
    END IF;

    -- Contexto transacional exclusivo desta RPC, validado pelo gatilho de proteção.
    PERFORM pg_catalog.set_config('app.accept_invitation_profile_id', p_user_id::text, true);

    UPDATE public.profiles
       SET role = 'comerciante'
     WHERE id = p_user_id AND role = 'cliente';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não foi possível atualizar o perfil.';
    END IF;

    UPDATE public.restaurants
       SET owner_profile_id = p_user_id
     WHERE id = v_restaurant_id AND owner_profile_id IS NULL AND status = 'ativo';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não foi possível vincular o restaurante.';
    END IF;

    UPDATE public.pending_invitations
       SET status = 'used'
     WHERE id = v_invitation_id AND status = 'pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não foi possível concluir o convite.';
    END IF;

    RETURN pg_catalog.jsonb_build_object('success', true, 'restaurant_id', v_restaurant_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.accept_invitation_proc(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation_proc(text, uuid, text) TO service_role;

COMMIT;