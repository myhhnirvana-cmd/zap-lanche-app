revoke all privileges on table public.restaurant_reviews from anon, authenticated;
grant select, insert on table public.restaurant_reviews to authenticated;