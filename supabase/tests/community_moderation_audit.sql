-- ZAP Lanche community moderation: homologation audit suite
-- Read-only checks. Safe to run repeatedly; this file does not create users,
-- change roles, suspend accounts, insert posts, or alter production.
-- Target: Supabase project nagrxownsslyeosuqzca (homologation only).

with checks as (
  select 'social_tables_exist'::text as test,
    (to_regclass('public.posts') is not null and to_regclass('public.comments') is not null and to_regclass('public.post_likes') is not null) as passed
  union all
  select 'moderation_log_exists', to_regclass('public.community_moderation_logs') is not null
  union all
  select 'all_admin_rpcs_exist',
    (select count(*) = 5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname in (
       'admin_list_community_members','admin_list_community_posts',
       'admin_set_community_suspension','admin_moderate_community_post',
       'admin_list_community_moderation_history'))
  union all
  select 'all_four_protection_triggers_exist',
    (select count(distinct trigger_name) = 4 from information_schema.triggers
     where trigger_schema='public' and trigger_name in (
       'enforce_suspension_comments','enforce_suspension_post_likes',
       'enforce_suspension_posts','protect_community_suspension_fields'))
  union all
  select 'trigger_function_not_client_executable',
    (not has_function_privilege('anon','public.protect_community_suspension_fields()','execute')
     and not has_function_privilege('authenticated','public.protect_community_suspension_fields()','execute'))
  union all
  select 'admin_rpcs_not_anon_executable',
    (select count(*) = 5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname in (
       'admin_list_community_members','admin_list_community_posts',
       'admin_set_community_suspension','admin_moderate_community_post',
       'admin_list_community_moderation_history')
       and not has_function_privilege('anon',p.oid,'execute'))
  union all
  select 'admin_rpcs_have_internal_guard',
    (select count(*) = 5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname in (
       'admin_list_community_members','admin_list_community_posts',
       'admin_set_community_suspension','admin_moderate_community_post',
       'admin_list_community_moderation_history')
       and position('is_admin()' in pg_get_functiondef(p.oid)) > 0)
  union all
  select 'rls_enabled_on_social_tables',
    ((select relrowsecurity from pg_class where oid='public.posts'::regclass)
     and (select relrowsecurity from pg_class where oid='public.comments'::regclass)
     and (select relrowsecurity from pg_class where oid='public.post_likes'::regclass))
)
select test, case when passed then 'PASS' else 'FAIL' end as result
from checks
order by test;

-- Authenticated negative test executed separately in the SQL editor:
-- select count(*) from public.admin_list_community_members();
-- Expected without an administrator JWT: SQLSTATE 42501, "Acesso restrito a administradores."
--
-- Full authenticated lifecycle test still requires a dedicated disposable Auth
-- admin + member pair and real JWT sessions. Do not promote or suspend real users.
-- Required cases:
-- 1. Admin lists members, posts and moderation history.
-- 2. Admin suspends disposable member (temporary and indefinite), with reason.
-- 3. Suspended member cannot INSERT/UPDATE posts, INSERT/UPDATE comments,
--    or INSERT/UPDATE likes; reads remain available.
-- 4. Admin hides a disposable post; status becomes removido_moderacao and
--    moderation_original_status preserves its previous status.
-- 5. Admin restores the post; original status returns and the saved status clears.
-- 6. Admin reinstates member; suspension fields clear and interactions work again.
-- 7. Non-admin JWT is rejected by every admin RPC.
-- 8. Blank/overlong reasons, past expiry, self-suspension, admin-target
--    suspension, missing post/member IDs are rejected.
-- 9. Confirm every test fixture is deleted after the test transaction.
