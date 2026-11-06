BEGIN;

-- Award 5 loyalty points for one restaurant review, only when submitted
-- within two hours of a valid check-in at that same restaurant.
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_review_reward_once
ON public.loyalty_transactions (profile_id, restaurant_id)
WHERE transaction_type = 'avaliacao';

CREATE OR REPLACE FUNCTION public.award_review_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.loyalty_transactions
    WHERE profile_id = NEW.profile_id
      AND restaurant_id = NEW.restaurant_id
      AND transaction_type = 'checkin'
      AND created_at <= NEW.created_at
      AND created_at >= NEW.created_at - interval '2 hours'
  ) THEN
    INSERT INTO public.loyalty_transactions (
      profile_id, restaurant_id, points, transaction_type, description, expires_at
    )
    VALUES (
      NEW.profile_id,
      NEW.restaurant_id,
      5,
      'avaliacao',
      'Bônus por avaliação enviada dentro de 2 horas do check-in',
      NEW.created_at + interval '90 days'
    )
    ON CONFLICT (profile_id, restaurant_id)
      WHERE transaction_type = 'avaliacao'
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.award_review_loyalty_points() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS restaurant_review_award_loyalty_points ON public.restaurant_reviews;
CREATE TRIGGER restaurant_review_award_loyalty_points
AFTER INSERT ON public.restaurant_reviews
FOR EACH ROW
EXECUTE FUNCTION public.award_review_loyalty_points();

COMMIT;
