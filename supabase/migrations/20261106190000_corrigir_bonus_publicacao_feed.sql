-- Corrige a bonificação das publicações vinculadas a uma loja.
-- Cada publicação válida gera 5 pontos uma única vez; removida a trava global de 1 hora.
CREATE OR REPLACE FUNCTION zaplanche_private.award_points_for_restaurant_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
  IF NEW.author_profile_id IS NULL
     OR NEW.restaurant_id IS NULL
     OR NEW.status <> 'publicado'
     OR auth.uid() IS NULL
     OR auth.uid() <> NEW.author_profile_id THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.author_profile_id::text || ':' || NEW.restaurant_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.loyalty_transactions lt
    WHERE lt.source_post_id = NEW.id
      AND lt.profile_id = NEW.author_profile_id
      AND lt.restaurant_id = NEW.restaurant_id
      AND lt.transaction_type = 'bonus'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.loyalty_transactions (
    profile_id, restaurant_id, points, transaction_type, description, source_post_id
  )
  VALUES (
    NEW.author_profile_id, NEW.restaurant_id, 5, 'bonus',
    'Bônus por publicação: ' || NEW.id::text, NEW.id
  );

  RETURN NEW;
END;
$function$;
