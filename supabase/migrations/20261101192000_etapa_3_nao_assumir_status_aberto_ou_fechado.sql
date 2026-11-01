alter table public.restaurants alter column is_open drop not null;
alter table public.restaurants alter column is_open drop default;
update public.restaurants set is_open = null where is_open = false;