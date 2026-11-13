begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('cliente','comerciante')),
  category text not null check (category in ('points','referral','redemption','merchant_activity','admin_message','system')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  dedupe_key text unique
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_profile_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications(recipient_profile_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (recipient_profile_id = (select auth.uid()));
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated using (recipient_profile_id = (select auth.uid()))
  with check (recipient_profile_id = (select auth.uid()));
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.send_merchant_notification(
  p_target_type text,
  p_title text,
  p_body text,
  p_target_profile_id uuid default null,
  p_neighborhood text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas administradores podem enviar comunicados.' using errcode = '42501';
  end if;
  if p_target_type not in ('all','individual','neighborhood') then
    raise exception 'Destinatário inválido.';
  end if;
  if char_length(btrim(coalesce(p_title,''))) not between 1 and 120
     or char_length(btrim(coalesce(p_body,''))) not between 1 and 1000 then
    raise exception 'Título ou mensagem fora do limite permitido.';
  end if;
  if p_target_type = 'individual' and p_target_profile_id is null then
    raise exception 'Selecione um comerciante.';
  end if;
  if p_target_type = 'neighborhood' and char_length(btrim(coalesce(p_neighborhood,''))) = 0 then
    raise exception 'Selecione um bairro.';
  end if;

  insert into public.notifications(recipient_profile_id, recipient_role, category, title, body, metadata)
  select distinct on (r.owner_profile_id) r.owner_profile_id, 'comerciante', 'admin_message',
         btrim(p_title), btrim(p_body),
         jsonb_build_object('restaurant_id',r.id,'restaurant_name',r.name,'neighborhood',r.neighborhood)
  from public.restaurants r
  join public.profiles p on p.id = r.owner_profile_id and p.role = 'comerciante'
  where r.owner_profile_id is not null
    and r.status = 'ativo'
    and (
      p_target_type = 'all'
      or (p_target_type = 'individual' and r.owner_profile_id = p_target_profile_id)
      or (p_target_type = 'neighborhood' and lower(btrim(coalesce(r.neighborhood,''))) = lower(btrim(p_neighborhood)))
    )
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return jsonb_build_object('sent',v_count);
end;
$$;

revoke all on function public.send_merchant_notification(text,text,text,uuid,text) from public, anon;
grant execute on function public.send_merchant_notification(text,text,text,uuid,text) to authenticated;

create or replace function public.create_notification_safely(
  p_recipient uuid,
  p_role text,
  p_category text,
  p_title text,
  p_body text,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient is null or p_role not in ('cliente','comerciante') then return; end if;
  insert into public.notifications(recipient_profile_id,recipient_role,category,title,body,metadata,dedupe_key)
  values(p_recipient,p_role,p_category,p_title,p_body,coalesce(p_metadata,'{}'::jsonb),p_dedupe)
  on conflict do nothing;
exception when others then
  -- Notification failures must never roll back check-ins, point credits or redemptions.
  raise warning 'ZAP Lanche notification skipped: %', SQLERRM;
end;
$$;
revoke all on function public.create_notification_safely(uuid,text,text,text,text,jsonb,text) from public, anon, authenticated;

create or replace function public.notify_loyalty_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_owner uuid;
  v_recipient_role text;
  v_title text;
  v_body text;
begin
  select p.role into v_recipient_role from public.profiles p where p.id = new.profile_id;
  if new.transaction_type = 'convite' then
    v_title := '15 pontos de indicação recebidos!';
    v_body := 'Seu convite foi concluído e os 15 pontos foram adicionados à sua carteira.';
    perform public.create_notification_safely(new.profile_id,'cliente','referral',v_title,v_body,
      jsonb_build_object('transaction_id',new.id,'points',new.points),'loyalty:'||new.id::text);
  elsif new.points > 0 then
    perform public.create_notification_safely(new.profile_id,coalesce(v_recipient_role,'cliente'),'points',
      'Pontos adicionados à sua carteira.',
      'Você recebeu '||new.points::text||' pontos no ZAP Lanche.',
      jsonb_build_object('transaction_id',new.id,'points',new.points,'restaurant_id',new.restaurant_id),
      'loyalty:'||new.id::text);
  end if;

  if new.transaction_type = 'checkin' and new.restaurant_id is not null then
    select r.owner_profile_id,r.name into v_owner,v_name
      from public.restaurants r where r.id = new.restaurant_id and r.status = 'ativo';
    if v_owner is not null then
      perform public.create_notification_safely(v_owner,'comerciante','merchant_activity',
        'Novo check-in na sua loja!',
        'Um cliente realizou check-in e recebeu pontos.',
        jsonb_build_object('restaurant_id',new.restaurant_id,'transaction_id',new.id),
        'merchant-checkin:'||new.id::text);
    end if;
  end if;
  return new;
exception when others then
  raise warning 'ZAP Lanche loyalty notification skipped: %', SQLERRM;
  return new;
end;
$$;

drop trigger if exists trg_notify_loyalty_transaction on public.loyalty_transactions;
create trigger trg_notify_loyalty_transaction
after insert on public.loyalty_transactions
for each row execute function public.notify_loyalty_transaction();

create or replace function public.notify_loyalty_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_restaurant_name text;
  v_reward_name text;
begin
  if tg_op = 'INSERT' then
    select r.owner_profile_id,r.name,lr.title
      into v_owner,v_restaurant_name,v_reward_name
      from public.restaurants r
      join public.loyalty_rewards lr on lr.restaurant_id = r.id
     where r.id = new.restaurant_id and lr.id = new.reward_id;
    perform public.create_notification_safely(new.profile_id,'cliente','redemption',
      'Seu resgate foi solicitado!',
      'Seu voucher foi gerado. Acompanhe o status em Meu Perfil e apresente o código na loja.',
      jsonb_build_object('redemption_id',new.id,'restaurant_id',new.restaurant_id,'voucher_code',new.voucher_code),
      'redemption-created:'||new.id::text);
    if v_owner is not null then
      perform public.create_notification_safely(v_owner,'comerciante','merchant_activity',
        'Novo resgate de prêmio!',
        'Um cliente solicitou um prêmio da sua loja. Confira os resgates no painel.',
        jsonb_build_object('redemption_id',new.id,'restaurant_id',new.restaurant_id,'reward_name',v_reward_name),
        'merchant-redemption:'||new.id::text);
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'utilizado' and old.status is distinct from new.status then
    select r.owner_profile_id into v_owner from public.restaurants r where r.id = new.restaurant_id;
    if v_owner is not null then
      perform public.create_notification_safely(v_owner,'comerciante','merchant_activity',
        'Prêmio validado!',
        'Um voucher foi validado com sucesso na sua loja.',
        jsonb_build_object('redemption_id',new.id,'restaurant_id',new.restaurant_id),
        'merchant-redemption-used:'||new.id::text);
    end if;
    perform public.create_notification_safely(new.profile_id,'cliente','redemption',
      'Prêmio validado com sucesso!',
      'Seu resgate foi concluído. Obrigado por participar do ZAP Lanche!',
      jsonb_build_object('redemption_id',new.id,'restaurant_id',new.restaurant_id),
      'redemption-used:'||new.id::text);
  end if;
  return new;
exception when others then
  raise warning 'ZAP Lanche redemption notification skipped: %', SQLERRM;
  return new;
end;
$$;

drop trigger if exists trg_notify_loyalty_redemption_insert on public.loyalty_redemptions;
create trigger trg_notify_loyalty_redemption_insert
after insert on public.loyalty_redemptions
for each row execute function public.notify_loyalty_redemption();
drop trigger if exists trg_notify_loyalty_redemption_update on public.loyalty_redemptions;
create trigger trg_notify_loyalty_redemption_update
after update of status on public.loyalty_redemptions
for each row execute function public.notify_loyalty_redemption();

commit;