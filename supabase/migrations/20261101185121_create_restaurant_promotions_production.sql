-- ZAP Lanche production migration
-- Creates the persistent table used by the merchant "Promoções" panel
-- and the public "Prêmios" tab. No existing records or tables are modified.

create table if not exists public.restaurant_promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  badge text not null default 'Oferta',
  discount_price numeric not null check (discount_price >= 0),
  regular_price numeric not null check (regular_price >= discount_price),
  coupon_code text,
  valid_until timestamptz,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restaurant_promotions enable row level security;

grant select on public.restaurant_promotions to anon, authenticated;
grant insert, update, delete on public.restaurant_promotions to authenticated;

drop policy if exists restaurant_promotions_public_read_active on public.restaurant_promotions;
create policy restaurant_promotions_public_read_active
  on public.restaurant_promotions
  for select
  to anon
  using (
    is_active = true
    and (valid_until is null or valid_until >= now())
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_promotions.restaurant_id
        and r.status = 'ativo'
    )
  );

drop policy if exists restaurant_promotions_authenticated_read on public.restaurant_promotions;
create policy restaurant_promotions_authenticated_read
  on public.restaurant_promotions
  for select
  to authenticated
  using (
    (
      is_active = true
      and (valid_until is null or valid_until >= now())
      and exists (
        select 1
        from public.restaurants r
        where r.id = restaurant_promotions.restaurant_id
          and r.status = 'ativo'
      )
    )
    or public.is_restaurant_owner(restaurant_id)
    or public.is_admin()
  );

drop policy if exists restaurant_promotions_owner_insert on public.restaurant_promotions;
create policy restaurant_promotions_owner_insert
  on public.restaurant_promotions
  for insert
  to authenticated
  with check (
    public.is_restaurant_owner(restaurant_id)
    or public.is_admin()
  );

drop policy if exists restaurant_promotions_owner_update on public.restaurant_promotions;
create policy restaurant_promotions_owner_update
  on public.restaurant_promotions
  for update
  to authenticated
  using (
    public.is_restaurant_owner(restaurant_id)
    or public.is_admin()
  )
  with check (
    public.is_restaurant_owner(restaurant_id)
    or public.is_admin()
  );

drop policy if exists restaurant_promotions_owner_delete on public.restaurant_promotions;
create policy restaurant_promotions_owner_delete
  on public.restaurant_promotions
  for delete
  to authenticated
  using (
    public.is_restaurant_owner(restaurant_id)
    or public.is_admin()
  );

create index if not exists restaurant_promotions_restaurant_active_idx
  on public.restaurant_promotions (restaurant_id, is_active, valid_until);
