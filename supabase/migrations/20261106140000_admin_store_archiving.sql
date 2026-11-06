-- Admin-only permanent deletion of a restaurant and its store-owned records.
-- Customer accounts/profiles are deliberately preserved.
DROP POLICY IF EXISTS restaurants_select_admin_all ON public.restaurants;
CREATE POLICY restaurants_select_admin_all
ON public.restaurants
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.delete_restaurant_permanently(p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir estabelecimentos.';
  END IF;

  PERFORM 1
  FROM public.restaurants
  WHERE id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado.';
  END IF;

  -- Remove bridge rows first because credit_transaction_id uses ON DELETE RESTRICT.
  DELETE FROM public.loyalty_consumption
  WHERE debit_transaction_id IN (
    SELECT id FROM public.loyalty_transactions WHERE restaurant_id = p_restaurant_id
  )
  OR credit_transaction_id IN (
    SELECT id FROM public.loyalty_transactions WHERE restaurant_id = p_restaurant_id
  );

  -- These relations do not cascade from restaurants.
  DELETE FROM public.pending_invitations WHERE restaurant_id = p_restaurant_id;
  DELETE FROM public.loyalty_transactions WHERE restaurant_id = p_restaurant_id;

  -- Remaining store-owned relations use ON DELETE CASCADE.
  DELETE FROM public.restaurants WHERE id = p_restaurant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_restaurant_permanently(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_restaurant_permanently(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_restaurant_permanently(uuid) TO authenticated;
