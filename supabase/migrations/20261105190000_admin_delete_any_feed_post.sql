BEGIN;

-- Permite que a administração remova qualquer publicação do feed.
-- A exclusão de publicações próprias continua permitida aos respectivos autores.
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

GRANT DELETE ON public.posts TO authenticated;

DROP POLICY IF EXISTS "posts_delete_owner_admin" ON public.posts;
CREATE POLICY "posts_delete_owner_admin"
ON public.posts
FOR DELETE
TO authenticated
USING (
  auth.uid() = profile_id
  OR public.is_admin()
);

COMMIT;
