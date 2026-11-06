-- Allow each restaurant to select one active loyalty reward for the neighborhood Feed.
begin;

alter table public.loyalty_rewards
  add column if not exists is_daily_featured boolean not null default false;

create unique index if not exists loyalty_rewards_one_daily_featured_per_restaurant_idx
  on public.loyalty_rewards (restaurant_id)
  where is_daily_featured = true;

create or replace function public.set_daily_featured_reward(
  p_restaurant_id uuid,
  p_reward_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_is_valid boolean := false;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticação necessária para destacar um prêmio.'
      using errcode = '42501';
  end if;

  if not (
    (select public.is_admin())
    or (select public.is_restaurant_owner(p_restaurant_id))
  ) then
    raise exception 'Você não tem permissão para alterar os destaques desta loja.'
      using errcode = '42501';
  end if;

  if p_reward_id is not null then
    select exists (
      select 1
      from public.loyalty_rewards
      where id = p_reward_id
        and restaurant_id = p_restaurant_id
        and is_active = true
        and status = 'ativo'
        and stock > 0
    ) into v_is_valid;

    if not v_is_valid then
      raise exception 'O prêmio precisa estar ativo e ter estoque disponível para ser destacado.'
        using errcode = '22023';
    end if;
  end if;

  update public.loyalty_rewards
  set
    is_daily_featured = (p_reward_id is not null and id = p_reward_id),
    updated_at = now()
  where restaurant_id = p_restaurant_id;
end;
$$;

grant execute on function public.set_daily_featured_reward(uuid, uuid) to authenticated;

commit;
