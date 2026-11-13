-- Store each resident's chosen neighborhood on their profile.
-- Existing accounts remain valid and keep NULL until they choose a neighborhood.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS neighborhood_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_neighborhood_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_neighborhood_id_fkey
      FOREIGN KEY (neighborhood_id)
      REFERENCES public.neighborhoods(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS profiles_neighborhood_id_idx
  ON public.profiles (neighborhood_id)
  WHERE neighborhood_id IS NOT NULL;

-- Preserve the existing auth-to-profile creation behavior while accepting
-- only an active neighborhood that already exists in the shared catalog.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_neighborhood_id uuid;
BEGIN
  SELECT n.id
    INTO v_neighborhood_id
  FROM public.neighborhoods AS n
  WHERE n.id::text = NULLIF(NEW.raw_user_meta_data ->> 'neighborhood_id', '')
    AND n.is_active = true
  LIMIT 1;

  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    neighborhood_id
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    'cliente',
    v_neighborhood_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

COMMIT;
