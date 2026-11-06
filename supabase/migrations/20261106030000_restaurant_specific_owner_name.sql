-- Keep each restaurant's responsible person's name on its own record.
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS owner_name text;

-- Preserve names for already-linked merchants without changing profile records.
UPDATE public.restaurants AS r
SET owner_name = p.full_name
FROM public.profiles AS p
WHERE r.owner_profile_id = p.id
  AND NULLIF(BTRIM(r.owner_name), '') IS NULL
  AND NULLIF(BTRIM(p.full_name), '') IS NOT NULL;
