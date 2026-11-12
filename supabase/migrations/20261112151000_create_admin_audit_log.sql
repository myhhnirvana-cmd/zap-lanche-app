create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  action text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  subject_profile_id uuid references public.profiles(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  source_table text not null,
  source_record_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_event_type_created_at_idx
  on public.admin_audit_logs (event_type, created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists admin_audit_logs_select_admin on public.admin_audit_logs;
create policy admin_audit_logs_select_admin
  on public.admin_audit_logs
  for select
  to authenticated
  using (public.is_admin());

revoke all on public.admin_audit_logs from anon, authenticated;
grant select on public.admin_audit_logs to authenticated;

create or replace function public.capture_admin_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_record_id uuid;
  v_restaurant_id uuid;
  v_subject_profile_id uuid;
  v_event_type text;
  v_action text;
  v_details jsonb;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_record_id := nullif(v_row ->> 'id', '')::uuid;
  v_restaurant_id := nullif(v_row ->> 'restaurant_id', '')::uuid;
  if tg_table_name = 'restaurants' then
    v_restaurant_id := v_record_id;
  end if;
  v_subject_profile_id := nullif(v_row ->> 'profile_id', '')::uuid;

  -- A cascade delete may fire child-table triggers after the restaurant row
  -- has already disappeared. Keep the audit insert independent of that FK.
  if v_restaurant_id is not null
     and not exists (select 1 from public.restaurants r where r.id = v_restaurant_id) then
    v_restaurant_id := null;
  end if;

  v_event_type := case
    when tg_table_name = 'loyalty_transactions' then 'pontos'
    when tg_table_name = 'restaurants' then 'lojas'
    when tg_table_name = 'menu_items' then 'cardapio'
    when tg_table_name = 'loyalty_rewards' then 'premios'
    when tg_table_name = 'restaurant_promotions' then 'promocoes'
    else 'sistema'
  end;

  v_action := case tg_op
    when 'INSERT' then 'Criou'
    when 'UPDATE' then 'Atualizou'
    when 'DELETE' then 'Excluiu'
    else tg_op
  end || ' ' || case tg_table_name
    when 'loyalty_transactions' then 'movimentação de pontos'
    when 'restaurants' then 'estabelecimento'
    when 'menu_items' then 'item do cardápio'
    when 'loyalty_rewards' then 'prêmio'
    when 'restaurant_promotions' then 'promoção'
    else tg_table_name
  end;

  v_details := jsonb_build_object(
    'operation', tg_op,
    'table', tg_table_name,
    'record_name', coalesce(v_row ->> 'name', v_row ->> 'title'),
    'points', v_row ->> 'points',
    'transaction_type', v_row ->> 'transaction_type'
  );

  insert into public.admin_audit_logs (
    event_type, action, actor_profile_id, subject_profile_id,
    restaurant_id, source_table, source_record_id, details
  ) values (
    v_event_type, v_action, auth.uid(), v_subject_profile_id,
    v_restaurant_id, tg_table_name, v_record_id, v_details
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.capture_admin_audit_event() from public, anon, authenticated;

drop trigger if exists audit_loyalty_transactions on public.loyalty_transactions;
create trigger audit_loyalty_transactions
  after insert or update or delete on public.loyalty_transactions
  for each row execute function public.capture_admin_audit_event();

drop trigger if exists audit_restaurants on public.restaurants;
create trigger audit_restaurants
  after insert or update or delete on public.restaurants
  for each row execute function public.capture_admin_audit_event();

drop trigger if exists audit_menu_items on public.menu_items;
create trigger audit_menu_items
  after insert or update or delete on public.menu_items
  for each row execute function public.capture_admin_audit_event();

drop trigger if exists audit_loyalty_rewards on public.loyalty_rewards;
create trigger audit_loyalty_rewards
  after insert or update or delete on public.loyalty_rewards
  for each row execute function public.capture_admin_audit_event();

drop trigger if exists audit_restaurant_promotions on public.restaurant_promotions;
create trigger audit_restaurant_promotions
  after insert or update or delete on public.restaurant_promotions
  for each row execute function public.capture_admin_audit_event();