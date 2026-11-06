BEGIN;

GRANT INSERT ON public.neighborhoods TO authenticated;
DROP POLICY IF EXISTS neighborhoods_authenticated_insert_own ON public.neighborhoods;
CREATE POLICY neighborhoods_authenticated_insert_own
  ON public.neighborhoods FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND is_active = true);

CREATE OR REPLACE FUNCTION public.create_neighborhood(
  p_name text,
  p_city text DEFAULT 'Rio de Janeiro',
  p_state text DEFAULT 'RJ'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_name text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_city text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_city, 'Rio de Janeiro')), '\s+', ' ', 'g');
  v_state text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_state, 'RJ')));
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

COMMIT;