alter table public.restaurants
  add column if not exists is_open boolean not null default false,
  add column if not exists opening_hours text,
  add column if not exists delivery_time text,
  add column if not exists prep_time_minutes integer,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.restaurants
  drop constraint if exists restaurants_prep_time_minutes_check;
alter table public.restaurants
  add constraint restaurants_prep_time_minutes_check
  check (prep_time_minutes is null or prep_time_minutes between 1 and 600);

alter table public.restaurants
  drop constraint if exists restaurants_latitude_check;
alter table public.restaurants
  add constraint restaurants_latitude_check
  check (latitude is null or latitude between -90 and 90);

alter table public.restaurants
  drop constraint if exists restaurants_longitude_check;
alter table public.restaurants
  add constraint restaurants_longitude_check
  check (longitude is null or longitude between -180 and 180);

create table if not exists public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint restaurant_reviews_one_per_profile unique (restaurant_id, profile_id),
  constraint restaurant_reviews_comment_length check (comment is null or char_length(comment) <= 500)
);

create index if not exists restaurant_reviews_restaurant_id_idx
  on public.restaurant_reviews (restaurant_id, created_at desc);

alter table public.restaurant_reviews enable row level security;

drop policy if exists "Public can read restaurant reviews" on public.restaurant_reviews;
create policy "Public can read restaurant reviews"
  on public.restaurant_reviews for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated customers can add own restaurant review" on public.restaurant_reviews;
create policy "Authenticated customers can add own restaurant review"
  on public.restaurant_reviews for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.status = 'ativo'
    )
  );

grant select on public.restaurant_reviews to anon, authenticated;
grant insert on public.restaurant_reviews to authenticated;