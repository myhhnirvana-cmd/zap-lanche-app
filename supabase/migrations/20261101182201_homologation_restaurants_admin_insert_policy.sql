-- Permite que o painel administrativo cadastre estabelecimentos no ambiente de homologação.
-- Aplicado somente no projeto zap-lanche-homologacao.

grant insert on public.restaurants to authenticated;

drop policy if exists restaurants_admin_insert on public.restaurants;
create policy restaurants_admin_insert
  on public.restaurants
  for insert
  to authenticated
  with check (public.is_admin());
