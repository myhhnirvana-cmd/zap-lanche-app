alter table public.restaurants
  add column if not exists rating numeric(2,1) not null default 0,
  add column if not exists review_count integer not null default 0;

alter table public.restaurants
  drop constraint if exists restaurants_rating_check;
alter table public.restaurants
  add constraint restaurants_rating_check check (rating between 0 and 5);

alter table public.restaurants
  drop constraint if exists restaurants_review_count_check;
alter table public.restaurants
  add constraint restaurants_review_count_check check (review_count >= 0);

drop policy if exists "Public can read restaurant reviews" on public.restaurant_reviews;
drop policy if exists "Customers can read own restaurant reviews" on public.restaurant_reviews;
create policy "Customers can read own restaurant reviews"
  on public.restaurant_reviews for select
  to authenticated
  using (profile_id = (select auth.uid()));

revoke select on public.restaurant_reviews from anon;
grant select on public.restaurant_reviews to authenticated;
grant insert on public.restaurant_reviews to authenticated;

create index if not exists restaurant_reviews_profile_id_idx
  on public.restaurant_reviews (profile_id);

create or replace function public.recalculate_restaurant_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.restaurants r
  set
    rating = coalesce((
      select round(avg(rr.rating)::numeric, 1)
      from public.restaurant_reviews rr
      where rr.restaurant_id = new.restaurant_id
    ), 0),
    review_count = (
      select count(*)::integer
      from public.restaurant_reviews rr
      where rr.restaurant_id = new.restaurant_id
    )
  where r.id = new.restaurant_id;

  return new;
end;
$$;

revoke all on function public.recalculate_restaurant_rating() from public, anon, authenticated;

drop trigger if exists restaurant_reviews_refresh_rating on public.restaurant_reviews;
create trigger restaurant_reviews_refresh_rating
after insert on public.restaurant_reviews
for each row execute function public.recalculate_restaurant_rating();