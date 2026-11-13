begin;

create table if not exists public.merchant_registration_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  contact_email text,
  store_name text not null check (char_length(btrim(store_name)) between 2 and 120),
  owner_name text not null check (char_length(btrim(owner_name)) between 2 and 120),
  whatsapp text not null check (char_length(btrim(whatsapp)) between 10 and 20),
  neighborhood text not null check (char_length(btrim(neighborhood)) between 2 and 80),
  business_type text not null check (char_length(btrim(business_type)) between 2 and 80),
  products_description text not null check (char_length(btrim(products_description)) between 5 and 1000),
  address text check (address is null or char_length(address) <= 250),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists merchant_registration_requests_status_created_idx
  on public.merchant_registration_requests (status, created_at desc);

create index if not exists merchant_registration_requests_profile_created_idx
  on public.merchant_registration_requests (profile_id, created_at desc);

create unique index if not exists merchant_registration_one_pending_per_profile_idx
  on public.merchant_registration_requests (profile_id)
  where status = 'pending';

alter table public.merchant_registration_requests enable row level security;

drop policy if exists merchant_registration_select_own_or_admin
  on public.merchant_registration_requests;
create policy merchant_registration_select_own_or_admin
  on public.merchant_registration_requests
  for select
  to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists merchant_registration_insert_own_pending
  on public.merchant_registration_requests;
create policy merchant_registration_insert_own_pending
  on public.merchant_registration_requests
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and restaurant_id is null
  );

drop policy if exists merchant_registration_update_admin
  on public.merchant_registration_requests;
create policy merchant_registration_update_admin
  on public.merchant_registration_requests
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- New public-schema tables are not automatically exposed to the Data API.
revoke all on public.merchant_registration_requests from anon;
grant select, insert, update on public.merchant_registration_requests to authenticated;

create or replace function public.review_merchant_registration(
  p_request_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.merchant_registration_requests%rowtype;
  v_restaurant_id uuid;
  v_updated_rows integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas administradores podem analisar cadastros comerciais.'
      using errcode = '42501';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception 'Decisão inválida.';
  end if;

  select *
    into v_request
    from public.merchant_registration_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Esta solicitação já foi analisada.';
  end if;

  if p_decision = 'reject' then
    update public.merchant_registration_requests
       set status = 'rejected',
           reviewed_by = auth.uid(),
           reviewed_at = now()
     where id = p_request_id;

    return jsonb_build_object('status', 'rejected');
  end if;

  if exists (
    select 1
      from public.restaurants
     where owner_profile_id = v_request.profile_id
  ) then
    raise exception 'Este usuário já possui um estabelecimento vinculado.';
  end if;

  insert into public.restaurants (
    owner_profile_id,
    name,
    owner_name,
    neighborhood,
    whatsapp,
    description,
    status
  ) values (
    v_request.profile_id,
    v_request.store_name,
    v_request.owner_name,
    v_request.neighborhood,
    v_request.whatsapp,
    v_request.business_type || ': ' || v_request.products_description,
    'ativo'
  )
  returning id into v_restaurant_id;

  update public.profiles
     set role = 'comerciante'
   where id = v_request.profile_id
     and role = 'cliente';

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 1 then
    raise exception 'Não foi possível liberar o perfil de comerciante. Verifique o papel atual da conta.';
  end if;

  update public.merchant_registration_requests
     set status = 'approved',
         restaurant_id = v_restaurant_id,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_request_id;

  return jsonb_build_object(
    'status', 'approved',
    'restaurant_id', v_restaurant_id
  );
end;
$$;

revoke all on function public.review_merchant_registration(uuid, text) from public, anon;
grant execute on function public.review_merchant_registration(uuid, text) to authenticated;

commit;
