-- Bucket de imagens usado por uploads de capa, logo, cardápio e prêmios.
-- Mantém os nomes e o modelo de autorização compatíveis com o bucket já usado em produção.
-- Aplicado e validado somente no projeto zap-lanche-homologacao.

insert into storage.buckets (id, name, public)
values ('Zaplanche-images', 'Zaplanche-images', true)
on conflict (id) do update set public = excluded.public;

create or replace function public.can_manage_storage_object(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_restaurant_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_name is null then
    return false;
  end if;

  if p_name !~ '^restaurants/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[^/]+$' then
    return false;
  end if;

  v_restaurant_id := split_part(p_name, '/', 2)::uuid;

  return exists (
    select 1
    from public.restaurants r
    where r.id = v_restaurant_id
      and (
        r.owner_profile_id = v_user_id
        or exists (
          select 1
          from public.profiles p
          where p.id = v_user_id
            and p.role = 'admin'
        )
      )
  );
exception
  when others then return false;
end;
$function$;

revoke all on function public.can_manage_storage_object(text) from public;
grant execute on function public.can_manage_storage_object(text) to authenticated;

drop policy if exists zaplanche_images_public_read on storage.objects;
drop policy if exists zaplanche_images_owner_insert on storage.objects;
drop policy if exists zaplanche_images_owner_update on storage.objects;
drop policy if exists zaplanche_images_owner_delete on storage.objects;

drop policy if exists zaplanche_images_select_public on storage.objects;
create policy zaplanche_images_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'Zaplanche-images');

drop policy if exists zaplanche_images_insert_owner_admin on storage.objects;
create policy zaplanche_images_insert_owner_admin
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'Zaplanche-images'
    and public.can_manage_storage_object(name)
  );

drop policy if exists zaplanche_images_update_owner_admin on storage.objects;
create policy zaplanche_images_update_owner_admin
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'Zaplanche-images'
    and public.can_manage_storage_object(name)
  )
  with check (
    bucket_id = 'Zaplanche-images'
    and public.can_manage_storage_object(name)
  );

drop policy if exists zaplanche_images_delete_owner_admin on storage.objects;
create policy zaplanche_images_delete_owner_admin
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'Zaplanche-images'
    and public.can_manage_storage_object(name)
  );
