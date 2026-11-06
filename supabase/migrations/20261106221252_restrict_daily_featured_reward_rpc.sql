-- Restrict the daily featured reward RPC to authenticated callers.
begin;

revoke all on function public.set_daily_featured_reward(uuid, uuid) from public, anon;
grant execute on function public.set_daily_featured_reward(uuid, uuid) to authenticated;

commit;
