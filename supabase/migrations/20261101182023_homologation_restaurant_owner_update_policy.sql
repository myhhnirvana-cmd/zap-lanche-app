-- Habilita o proprietário da loja e administradores a persistirem dados e estado operacional.
-- Aplicado somente no projeto zap-lanche-homologacao.

grant update on public.restaurants to authenticated;

drop policy if exists restaurants_owner_update on public.restaurants;
create policy restaurants_owner_update
  on public.restaurants
  for update
  to authenticated
  using (owner_profile_id = (select auth.uid()) or public.is_admin())
  with check (owner_profile_id = (select auth.uid()) or public.is_admin());
