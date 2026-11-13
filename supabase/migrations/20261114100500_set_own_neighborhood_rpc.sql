-- Allow an authenticated resident to associate only their own profile with an active neighborhood.
-- No direct UPDATE grant on profiles is required.
BEGIN;

CREATE OR REPLACE FUNCTION public.set_my_neighborhood(p_neighborhood_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para selecionar seu bairro.'
      USING ERRCODE = '42501';
  END IF;

  IF p_neighborhood_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.neighborhoods n
    WHERE n.id = p_neighborhood_id
      AND n.is_active = true
  ) THEN
    RAISE EXCEPTION 'Bairro inválido ou indisponível.';
  END IF;

  UPDATE public.profiles
  SET neighborhood_id = p_neighborhood_id
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_my_neighborhood(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_neighborhood(uuid) TO authenticated;

COMMIT;
