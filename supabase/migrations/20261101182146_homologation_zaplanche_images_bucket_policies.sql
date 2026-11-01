-- Bucket de imagens usado por uploads de capa, logo, cardápio e prêmios.
-- Criado e validado somente no projeto zap-lanche-homologacao.

insert into storage.buckets (id, name, public)
values ('Zaplanche-images', 'Zaplanche-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists zaplanche_images_public_read on storage.objects;
create policy zaplanche_images_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'Zaplanche-images');

drop policy if exists zaplanche_images_owner_insert on storage.objects;
create policy zaplanche_images_owner_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'Zaplanche-images'
    and (
      public.is_admin()
      or (
        name ~ '^restaurants/[0-9a-fA-F-]{36}/'
        and public.is_restaurant_owner(split_part(name, '/', 2)::uuid)
      )
    )
  );

drop policy if exists zaplanche_images_owner_update on storage.objects;
create policy zaplanche_images_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'Zaplanche-images'
    and (
      public.is_admin()
      or (
        name ~ '^restaurants/[0-9a-fA-F-]{36}/'
        and public.is_restaurant_owner(split_part(name, '/', 2)::uuid)
      )
    )
  )
  with check (
    bucket_id = 'Zaplanche-images'
    and (
      public.is_admin()
      or (
        name ~ '^restaurants/[0-9a-fA-F-]{36}/'
        and public.is_restaurant_owner(split_part(name, '/', 2)::uuid)
      )
    )
  );

drop policy if exists zaplanche_images_owner_delete on storage.objects;
create policy zaplanche_images_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'Zaplanche-images'
    and (
      public.is_admin()
      or (
        name ~ '^restaurants/[0-9a-fA-F-]{36}/'
        and public.is_restaurant_owner(split_part(name, '/', 2)::uuid)
      )
    )
  );
