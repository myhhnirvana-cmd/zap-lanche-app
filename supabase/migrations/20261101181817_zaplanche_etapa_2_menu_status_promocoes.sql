-- ZAP Lanche - Etapa 2
-- Schema aplicado exclusivamente no projeto zap-lanche-homologacao.
-- Não aplicar no projeto de produção sem uma revisão e autorização separadas.

alter table public.restaurants
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists neighborhood text,
  add column if not exists address text,
  add column if not exists whatsapp text,
  add column if not exists image_url text,
  add column if not exists logo_url text,
  add column if not exists is_open boolean not null default false,
  add column if not exists opening_hours text,
  add column if not exists category text,
  add column if not exists category_label text,
  add column if not exists rating numeric not null default 5,
  add column if not exists review_count integer not null default 0,
  add column if not exists delivery_time text,
  add column if not exists distance_km numeric not null default 1,
  add column if not exists delivery_fee numeric not null default 0,
  add column if not exists min_order numeric not null default 0,
  add column if not exists price_range text;

create unique index if not exists restaurants_slug_unique_idx
  on public.restaurants (slug) where slug is not null;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null default 0 check (price >= 0),
  original_price numeric check (original_price is null or original_price >= 0),
  image_url text,
  category text not null default 'Lanches',
  badge text,
  prep_time_minutes integer not null default 20 check (prep_time_minutes > 0),
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garante compatibilidade com a tabela menu_items que já existe no banco de produção.
alter table public.menu_items
  add column if not exists original_price numeric,
  add column if not exists category text not null default 'Lanches',
  add column if not exists badge text,
  add column if not exists prep_time_minutes integer not null default 20,
  add column if not exists updated_at timestamptz not null default now();

alter table public.menu_items enable row level security;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

drop policy if exists menu_items_public_read_available on public.menu_items;
create policy menu_items_public_read_available
  on public.menu_items for select to anon
  using (available = true and exists (
    select 1 from public.restaurants r
    where r.id = menu_items.restaurant_id and r.status = 'ativo'
  ));

drop policy if exists menu_items_authenticated_read on public.menu_items;
create policy menu_items_authenticated_read
  on public.menu_items for select to authenticated
  using (
    (available = true and exists (
      select 1 from public.restaurants r
      where r.id = menu_items.restaurant_id and r.status = 'ativo'
    ))
    or public.is_restaurant_owner(restaurant_id)
    or public.is_admin()
  );

drop policy if exists menu_items_owner_insert on public.menu_items;
create policy menu_items_owner_insert
  on public.menu_items for insert to authenticated
  with check (public.is_restaurant_owner(restaurant_id) or public.is_admin());

drop policy if exists menu_items_owner_update on public.menu_items;
create policy menu_items_owner_update
  on public.menu_items for update to authenticated
  using (public.is_restaurant_owner(restaurant_id) or public.is_admin())
  with check (public.is_restaurant_owner(restaurant_id) or public.is_admin());

drop policy if exists menu_items_owner_delete on public.menu_items;
create policy menu_items_owner_delete
  on public.menu_items for delete to authenticated
  using (public.is_restaurant_owner(restaurant_id) or public.is_admin());

create index if not exists menu_items_restaurant_available_idx
  on public.menu_items (restaurant_id, available);

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
  on public.restaurant_promotions for select to anon
  using (
    is_active = true
    and (valid_until is null or valid_until >= now())
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_promotions.restaurant_id and r.status = 'ativo'
    )
  );

drop policy if exists restaurant_promotions_authenticated_read on public.restaurant_promotions;
create policy restaurant_promotions_authenticated_read
  on public.restaurant_promotions for select to authenticated
  using (
    (is_active = true and (valid_until is null or valid_until >= now())
      and exists (
        select 1 from public.restaurants r
        where r.id = restaurant_promotions.restaurant_id and r.status = 'ativo'
      ))
    or public.is_restaurant_owner(restaurant_id)
    or public.is_admin()
  );

drop policy if exists restaurant_promotions_owner_insert on public.restaurant_promotions;
create policy restaurant_promotions_owner_insert
  on public.restaurant_promotions for insert to authenticated
  with check (public.is_restaurant_owner(restaurant_id) or public.is_admin());

drop policy if exists restaurant_promotions_owner_update on public.restaurant_promotions;
create policy restaurant_promotions_owner_update
  on public.restaurant_promotions for update to authenticated
  using (public.is_restaurant_owner(restaurant_id) or public.is_admin())
  with check (public.is_restaurant_owner(restaurant_id) or public.is_admin());

drop policy if exists restaurant_promotions_owner_delete on public.restaurant_promotions;
create policy restaurant_promotions_owner_delete
  on public.restaurant_promotions for delete to authenticated
  using (public.is_restaurant_owner(restaurant_id) or public.is_admin());

create index if not exists restaurant_promotions_restaurant_active_idx
  on public.restaurant_promotions (restaurant_id, is_active, valid_until);
