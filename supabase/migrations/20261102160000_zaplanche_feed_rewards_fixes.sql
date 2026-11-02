-- Correções seguras do feed e crédito por publicação vinculada a restaurante.
-- Aplicar somente após revisão e validação em homologação.

begin;

-- Permite que cada autor exclua suas próprias publicações reais.
drop policy if exists posts_delete_author on public.posts;
create policy posts_delete_author
  on public.posts
  for delete
  to authenticated
  using (author_profile_id = (select auth.uid()));

-- Identificador idempotente da publicação que originou o bônus.
alter table public.loyalty_transactions
  add column if not exists source_post_id uuid
  references public.posts(id) on delete set null;

create unique index if not exists loyalty_transactions_source_post_id_uidx
  on public.loyalty_transactions(source_post_id)
  where source_post_id is not null;

-- Um bônus de 5 pontos por usuário/restaurante a cada janela de 60 minutos.
-- O lock transacional evita que duas publicações simultâneas burlem o intervalo.
create or replace function public.award_points_for_restaurant_post()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := new.author_profile_id;

  if v_profile_id is null
     or new.restaurant_id is null
     or new.status <> 'publicado'
     or auth.uid() is null
     or auth.uid() <> v_profile_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_profile_id::text || ':' || new.restaurant_id::text, 0)
  );

  if exists (
    select 1
    from public.loyalty_transactions lt
    where lt.profile_id = v_profile_id
      and lt.restaurant_id = new.restaurant_id
      and lt.transaction_type = 'bonus'
      and lt.description like 'Bônus por publicação:%'
      and lt.created_at >= now() - interval '1 hour'
  ) then
    return new;
  end if;

  insert into public.loyalty_transactions (
    profile_id,
    restaurant_id,
    points,
    transaction_type,
    description,
    source_post_id
  )
  values (
    v_profile_id,
    new.restaurant_id,
    5,
    'bonus',
    'Bônus por publicação: ' || new.id::text,
    new.id
  )
  on conflict (source_post_id) where source_post_id is not null do nothing;

  return new;
end;
$$;

revoke all on function public.award_points_for_restaurant_post() from public, anon, authenticated;

drop trigger if exists award_points_for_restaurant_post on public.posts;
create trigger award_points_for_restaurant_post
  after insert on public.posts
  for each row
  execute function public.award_points_for_restaurant_post();

commit;
