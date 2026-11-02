-- Correções do feed e crédito por publicação vinculada a restaurante.
-- Esta migração deve ser validada em homologação antes de ser aplicada em produção.

begin;

-- O autor autenticado pode excluir somente as próprias publicações.
drop policy if exists posts_delete_author on public.posts;
create policy posts_delete_author
  on public.posts
  for delete
  to authenticated
  using (author_profile_id = (select auth.uid()));

grant delete on public.posts to authenticated;

-- Ao excluir uma publicação, remove curtidas e comentários relacionados.
-- A FK das curtidas usa CASCADE; comentários usam post_id text e precisam do trigger.
alter table public.post_likes
  drop constraint if exists post_likes_post_id_fkey;
alter table public.post_likes
  add constraint post_likes_post_id_fkey
  foreign key (post_id) references public.posts(id) on delete cascade;

create schema if not exists zaplanche_private;
revoke all on schema zaplanche_private from public, anon, authenticated;

create or replace function zaplanche_private.cleanup_deleted_post_relations()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  delete from public.comments where post_id = old.id::text;
  return old;
end;
$$;

revoke all on function zaplanche_private.cleanup_deleted_post_relations() from public, anon, authenticated;

drop trigger if exists cleanup_deleted_post_relations on public.posts;
create trigger cleanup_deleted_post_relations
  before delete on public.posts
  for each row
  execute function zaplanche_private.cleanup_deleted_post_relations();

-- Liga cada bônus à publicação que o originou para impedir duplicidade.
alter table public.loyalty_transactions
  add column if not exists source_post_id uuid
  references public.posts(id) on delete set null;

create unique index if not exists loyalty_transactions_source_post_id_uidx
  on public.loyalty_transactions(source_post_id)
  where source_post_id is not null;

-- Concede 5 pontos por publicação real sobre restaurante, no máximo uma vez
-- por usuário/restaurante a cada 60 minutos. O lock evita corrida simultânea.
create or replace function zaplanche_private.award_points_for_restaurant_post()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if new.author_profile_id is null
     or new.restaurant_id is null
     or new.status <> 'publicado'
     or auth.uid() is null
     or auth.uid() <> new.author_profile_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.author_profile_id::text || ':' || new.restaurant_id::text, 0)
  );

  if exists (
    select 1
    from public.loyalty_transactions lt
    where lt.profile_id = new.author_profile_id
      and lt.restaurant_id = new.restaurant_id
      and lt.transaction_type = 'bonus'
      and lt.description like 'Bônus por publicação:%'
      and lt.created_at >= now() - interval '1 hour'
  ) then
    return new;
  end if;

  insert into public.loyalty_transactions (
    profile_id, restaurant_id, points, transaction_type, description, source_post_id
  )
  values (
    new.author_profile_id,
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

revoke all on function zaplanche_private.award_points_for_restaurant_post() from public, anon, authenticated;

drop trigger if exists award_points_for_restaurant_post on public.posts;
create trigger award_points_for_restaurant_post
  after insert on public.posts
  for each row
  execute function zaplanche_private.award_points_for_restaurant_post();

commit;
