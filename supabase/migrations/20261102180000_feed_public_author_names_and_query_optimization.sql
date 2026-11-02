-- Retorna apenas identificadores e nomes públicos dos autores vinculados a posts visíveis.
create or replace function public.get_public_post_authors(author_ids uuid[])
returns table (id uuid, full_name text, username text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.username, p.role
  from public.profiles p
  where p.id = any(author_ids);
$$;
revoke all on function public.get_public_post_authors(uuid[]) from public;
grant execute on function public.get_public_post_authors(uuid[]) to anon, authenticated;
