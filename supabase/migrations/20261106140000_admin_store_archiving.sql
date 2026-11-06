-- Allow administrators to inspect every store, including archived ones.
-- Public users continue to see only active restaurants through the existing policy.
CREATE POLICY restaurants_select_admin_all
ON public.restaurants
FOR SELECT
TO authenticated
USING (public.is_admin());

