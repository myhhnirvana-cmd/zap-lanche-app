-- ZAP Lanche: moderação da comunidade.
-- Aplicar primeiro no projeto Supabase de TESTE. Não executar em produção sem aprovação.
begin;

alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspension_reason text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_until timestamptz,
  add column if not exists suspended_by uuid references public.profiles(id);

create table if not exists public.community_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  target_profile_id uuid references public.profiles(id) on delete set null,
  target_post_id uuid,
  action text not null check (action in ('user_suspended','user_reinstated','post_hidden','post_restored')),
  reason text not null,
  performed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.community_moderation_logs enable row level security;
revoke all on public.community_moderation_logs from anon, authenticated;

create or replace function public.is_community_user_suspended(p_profile_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select p.is_suspended and (p.suspended_until is null or p.suspended_until > now())
    from public.profiles p where p.id = p_profile_id
  ), false);
$$;
revoke all on function public.is_community_user_suspended(uuid) from public, anon, authenticated;

create or replace function public.enforce_community_suspension()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_profile_id uuid;
begin
  if tg_table_name = 'posts' then
    v_profile_id := new.author_profile_id;
  else
    v_profile_id := new.profile_id;
  end if;
  if v_profile_id is not null and public.is_community_user_suspended(v_profile_id) then
    raise exception 'CONTA_SUSPENSA: sua conta está temporariamente impedida de interagir com a comunidade.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_community_suspension() from public, anon, authenticated;

drop trigger if exists enforce_suspension_posts on public.posts;
create trigger enforce_suspension_posts before insert or update on public.posts
for each row when (new.status = 'publicado')
execute function public.enforce_community_suspension();

drop trigger if exists enforce_suspension_comments on public.comments;
create trigger enforce_suspension_comments before insert or update on public.comments
for each row execute function public.enforce_community_suspension();

drop trigger if exists enforce_suspension_post_likes on public.post_likes;
create trigger enforce_suspension_post_likes before insert or update on public.post_likes
for each row execute function public.enforce_community_suspension();

-- Impede que o próprio usuário altere os campos de suspensão no seu perfil.
create or replace function public.protect_community_suspension_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.id and not public.is_admin() and (
    new.is_suspended is distinct from old.is_suspended or
    new.suspension_reason is distinct from old.suspension_reason or
    new.suspended_at is distinct from old.suspended_at or
    new.suspended_until is distinct from old.suspended_until or
    new.suspended_by is distinct from old.suspended_by
  ) then
    raise exception 'Os dados de moderação não podem ser alterados pelo próprio usuário.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_community_suspension_fields on public.profiles;
create trigger protect_community_suspension_fields before update on public.profiles
for each row execute function public.protect_community_suspension_fields();

create or replace function public.admin_list_community_members()
returns table (
  profile_id uuid, full_name text, username text, role text,
  is_suspended boolean, suspension_reason text, suspended_until timestamptz, created_at timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, p.username, p.role, p.is_suspended,
      p.suspension_reason, p.suspended_until, p.created_at
    from public.profiles p order by p.created_at desc limit 300;
end;
$$;

create or replace function public.admin_list_community_posts()
returns table (id uuid, title text, content text, status text, created_at timestamptz, author_name text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  return query
    select p.id, p.title, p.content, p.status, p.created_at, pr.full_name
    from public.posts p left join public.profiles pr on pr.id = p.author_profile_id
    where p.status in ('publicado','removido_moderacao')
    order by p.created_at desc limit 200;
end;
$$;

create or replace function public.admin_set_community_suspension(
  p_profile_id uuid, p_reason text, p_suspended_until timestamptz, p_suspend boolean
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_role text;
begin
  if not public.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  if p_profile_id = auth.uid() then raise exception 'Não é permitido suspender a própria conta.' using errcode = '42501'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'O motivo é obrigatório.'; end if;
  select role into v_role from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Usuário não encontrado.'; end if;
  if v_role = 'admin' then raise exception 'Contas administrativas estão protegidas.' using errcode = '42501'; end if;
  update public.profiles set
    is_suspended = p_suspend,
    suspension_reason = case when p_suspend then btrim(p_reason) else null end,
    suspended_at = case when p_suspend then now() else null end,
    suspended_until = case when p_suspend then p_suspended_until else null end,
    suspended_by = case when p_suspend then auth.uid() else null end
  where id = p_profile_id;
  insert into public.community_moderation_logs(target_profile_id, action, reason, performed_by)
  values (p_profile_id, case when p_suspend then 'user_suspended' else 'user_reinstated' end, btrim(p_reason), auth.uid());
end;
$$;

create or replace function public.admin_moderate_community_post(
  p_post_id uuid, p_remove boolean, p_reason text
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_status text;
begin
  if not public.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'O motivo é obrigatório.'; end if;
  select status into v_status from public.posts where id = p_post_id for update;
  if not found then raise exception 'Publicação não encontrada.'; end if;
  if p_remove then
    update public.posts set status = 'removido_moderacao' where id = p_post_id;
  else
    update public.posts set status = 'publicado' where id = p_post_id and status = 'removido_moderacao';
  end if;
  insert into public.community_moderation_logs(target_post_id, action, reason, performed_by)
  values (p_post_id, case when p_remove then 'post_hidden' else 'post_restored' end, btrim(p_reason), auth.uid());
end;
$$;

create or replace function public.admin_list_community_moderation_history()
returns table (id uuid, action text, reason text, performed_by_name text, target_name text, created_at timestamptz)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Acesso restrito a administradores.' using errcode = '42501'; end if;
  return query
    select l.id, l.action, l.reason, actor.full_name,
      coalesce(target.full_name, post.title, 'Registro removido'),
      l.created_at
    from public.community_moderation_logs l
    left join public.profiles actor on actor.id = l.performed_by
    left join public.profiles target on target.id = l.target_profile_id
    left join public.posts post on post.id = l.target_post_id
    order by l.created_at desc limit 100;
end;
$$;

revoke all on function public.admin_list_community_members() from public, anon;
revoke all on function public.admin_list_community_posts() from public, anon;
revoke all on function public.admin_set_community_suspension(uuid,text,timestamptz,boolean) from public, anon;
revoke all on function public.admin_moderate_community_post(uuid,boolean,text) from public, anon;
revoke all on function public.admin_list_community_moderation_history() from public, anon;
grant execute on function public.admin_list_community_members() to authenticated;
grant execute on function public.admin_list_community_posts() to authenticated;
grant execute on function public.admin_set_community_suspension(uuid,text,timestamptz,boolean) to authenticated;
grant execute on function public.admin_moderate_community_post(uuid,boolean,text) to authenticated;
grant execute on function public.admin_list_community_moderation_history() to authenticated;

commit;
