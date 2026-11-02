-- Publica somente os campos de identificação necessários para exibir autores
-- de publicações já visíveis no feed. Dados sensíveis de profiles permanecem privados.
create or replace function public.get_public_post_authors(p_profile_ids uuid[])
returns table (
  id uuid,
  full_name text,
  username text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.username, p.role
  from public.profiles p
  where p.id = any(coalesce(p_profile_ids, '{}'::uuid[]));
$$;

revoke all on function public.get_public_post_authors(uuid[]) from public;
grant execute on function public.get_public_post_authors(uuid[]) to anon, authenticated;
