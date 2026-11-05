BEGIN;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
GRANT DELETE ON public.posts TO authenticated;

DROP POLICY IF EXISTS "posts_delete_admin" ON public.posts;
CREATE POLICY "posts_delete_admin"
ON public.posts
FOR DELETE
TO authenticated
USING (public.is_admin());

COMMIT;
