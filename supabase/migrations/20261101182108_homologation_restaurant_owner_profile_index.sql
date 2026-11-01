-- Índice de apoio à política RLS e às consultas de lojas por proprietário.
-- Validado no projeto zap-lanche-homologacao.
create index if not exists restaurants_owner_profile_id_idx
  on public.restaurants (owner_profile_id)
  where owner_profile_id is not null;
