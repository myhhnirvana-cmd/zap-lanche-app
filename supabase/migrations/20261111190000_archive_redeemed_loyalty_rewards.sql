-- Preserve loyalty redemption history while allowing merchants to remove redeemed rewards from their active catalog.
ALTER TABLE public.loyalty_rewards
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.loyalty_rewards.archived_at IS
  'When set, the reward is archived from merchant management and public listings while redemption history remains intact.';
