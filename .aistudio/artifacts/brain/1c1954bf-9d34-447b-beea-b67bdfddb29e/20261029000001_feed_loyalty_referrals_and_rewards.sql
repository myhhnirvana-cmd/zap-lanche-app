BEGIN;

-- ==============================================================================
-- MIGRATION: 20261029000001_feed_loyalty_referrals_and_rewards.sql
-- OBJETIVO:
--   1. Feed Compartilhado: tabela public.posts e public.post_likes com RLS.
--   2. Indicações e Recompensa Real de 15 Pontos (com unicidade e concorrência).
--   3. Prêmios de Fidelidade, Resgate Seguro com Global FIFO & Regra 70/30 (loyalty_consumption).
--   4. RLS estrita, Privilégios seguros e Ordem de Dependências corrigida.
-- ==============================================================================

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_restaurant_owner(uuid) FROM anon;

-- ------------------------------------------------------------------------------
-- 1. TABELA DE PUBLICAÇÕES COMPARTILHADAS (public.posts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id text PRIMARY KEY DEFAULT ('post-' || gen_random_uuid()::text),
    restaurant_id text NOT NULL,
    restaurant_name text NOT NULL,
    restaurant_category text NOT NULL,
    neighborhood text NOT NULL,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name text NOT NULL,
    author_avatar text,
    author_role text NOT NULL DEFAULT 'morador',
    content text NOT NULL,
    image_url text,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_restaurant_id_idx ON public.posts(restaurant_id);
CREATE INDEX IF NOT EXISTS posts_profile_id_idx ON public.posts(profile_id);

GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_public" ON public.posts;
CREATE POLICY "posts_select_public"
ON public.posts FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "posts_insert_auth" ON public.posts;
CREATE POLICY "posts_insert_auth"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "posts_update_owner_admin" ON public.posts;
CREATE POLICY "posts_update_owner_admin"
ON public.posts FOR UPDATE TO authenticated
USING (auth.uid() = profile_id OR public.is_admin())
WITH CHECK (auth.uid() = profile_id OR public.is_admin());

DROP POLICY IF EXISTS "posts_delete_owner_admin" ON public.posts;
CREATE POLICY "posts_delete_owner_admin"
ON public.posts FOR DELETE TO authenticated
USING (auth.uid() = profile_id OR public.is_admin());


-- ------------------------------------------------------------------------------
-- 2. TABELA DE CURTIDAS COMPARTILHADAS (public.post_likes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT post_likes_post_user_unique UNIQUE (post_id, profile_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_likes_profile_id_idx ON public.post_likes(profile_id);

GRANT SELECT ON public.post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_likes TO authenticated;

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select_public" ON public.post_likes;
CREATE POLICY "post_likes_select_public"
ON public.post_likes FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "post_likes_insert_auth" ON public.post_likes;
CREATE POLICY "post_likes_insert_auth"
ON public.post_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "post_likes_delete_auth" ON public.post_likes;
CREATE POLICY "post_likes_delete_auth"
ON public.post_likes FOR DELETE TO authenticated
USING (auth.uid() = profile_id);


-- ------------------------------------------------------------------------------
-- 3. CÓDIGO DE INDICAÇÃO E TABELA DE INDICAÇÕES (public.referrals)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_idx ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_profile_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_code text;
    v_exists boolean;
    i int;
BEGIN
    IF NEW.referral_code IS NOT NULL AND NEW.referral_code <> '' THEN
        RETURN NEW;
    END IF;

    FOR i IN 1..20 LOOP
        v_code := 'ZAP-' || pg_catalog.upper(pg_catalog.substring(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') from 1 for 6));
        SELECT pg_catalog.exists(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
        IF NOT v_exists THEN
            NEW.referral_code := v_code;
            RETURN NEW;
        END IF;
    END LOOP;

    NEW.referral_code := 'ZAP-' || pg_catalog.upper(pg_catalog.substring(NEW.id::text from 1 for 6));
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_profile_referral_code() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_generate_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_profile_referral_code
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.referral_code IS NULL OR NEW.referral_code = '')
EXECUTE FUNCTION public.generate_profile_referral_code();

-- Backfill retroativo seguro sem colisões
DO $$
DECLARE
    r record;
    v_new_code text;
    v_exists boolean;
BEGIN
    FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
        LOOP
            v_new_code := 'ZAP-' || pg_catalog.upper(pg_catalog.substring(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') from 1 for 6));
            SELECT pg_catalog.exists(SELECT 1 FROM public.profiles WHERE referral_code = v_new_code) INTO v_exists;
            IF NOT v_exists THEN
                UPDATE public.profiles SET referral_code = v_new_code WHERE id = r.id AND referral_code IS NULL;
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    referral_code text NOT NULL,
    status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recompensado')),
    rewarded_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT check_no_self_referral CHECK (referrer_profile_id <> referred_profile_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_profile_id);
CREATE INDEX IF NOT EXISTS referrals_referred_idx ON public.referrals(referred_profile_id);

GRANT SELECT ON public.referrals TO authenticated;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_participants" ON public.referrals;
CREATE POLICY "referrals_select_participants"
ON public.referrals FOR SELECT TO authenticated
USING (auth.uid() = referrer_profile_id OR auth.uid() = referred_profile_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.register_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_code text;
    v_referrer_id uuid;
    v_user_id uuid;
BEGIN
    v_user_id := pg_catalog.auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
    END IF;

    -- Bloqueio consultivo transacional por usuário
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 3));

    v_clean_code := pg_catalog.upper(pg_catalog.trim(p_code));
    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Código de indicação inválido.');
    END IF;

    SELECT id INTO v_referrer_id
      FROM public.profiles
     WHERE pg_catalog.upper(referral_code) = v_clean_code
     LIMIT 1;

    IF v_referrer_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Código de indicação não encontrado.');
    END IF;

    IF v_referrer_id = v_user_id THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Você não pode usar o seu próprio código de indicação.');
    END IF;

    IF pg_catalog.exists (SELECT 1 FROM public.referrals WHERE referred_profile_id = v_user_id) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Você já possui uma indicação vinculada.');
    END IF;

    INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, referral_code, status)
    VALUES (v_referrer_id, v_user_id, v_clean_code, 'pendente');

    RETURN pg_catalog.jsonb_build_object('success', true, 'message', 'Código de indicação aplicado! Conclua seu primeiro check-in para ativar as recompensas.');
END;
$$;

REVOKE ALL ON FUNCTION public.register_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_referral_code(text) TO authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 4. CHECK-IN COM BÔNUS ATÔMICO DE 15 PONTOS AO INDICADOR
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
    points integer NOT NULL,
    transaction_type text NOT NULL DEFAULT 'checkin',
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS expires_at timestamptz;

GRANT SELECT ON public.loyalty_transactions TO authenticated;
GRANT INSERT ON public.loyalty_transactions TO service_role;

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_transactions_select_owner" ON public.loyalty_transactions;
CREATE POLICY "loyalty_transactions_select_owner"
ON public.loyalty_transactions FOR SELECT TO authenticated
USING (auth.uid() = profile_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.register_restaurant_checkin(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_role text;
    v_restaurant_exists boolean;
    v_last_checkin timestamptz;
    v_referral_record record;
    v_is_first_checkin boolean;
    v_points_awarded int := 5;
    v_bonus_awarded boolean := false;
    v_expires_at timestamptz := pg_catalog.now() + pg_catalog.interval '90 days';
BEGIN
    v_user_id := pg_catalog.auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Sessão inválida. Conecte-se para registrar o check-in.');
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
    IF v_role IS DISTINCT FROM 'cliente' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Apenas clientes podem realizar check-in.');
    END IF;

    IF p_restaurant_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Identificador de restaurante inválido.');
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id AND status = 'ativo')
      INTO v_restaurant_exists;

    IF NOT v_restaurant_exists THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Restaurante não encontrado ou inativo.');
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_user_id::text || ':' || p_restaurant_id::text, 0)
    );

    SELECT max(created_at) INTO v_last_checkin
      FROM public.loyalty_transactions
     WHERE profile_id = v_user_id
       AND restaurant_id = p_restaurant_id
       AND transaction_type = 'checkin';

    IF v_last_checkin IS NOT NULL AND v_last_checkin > (pg_catalog.now() - pg_catalog.interval '24 hours') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'reason', 'checkin_already_used',
            'message', 'Você já realizou um check-in neste estabelecimento nas últimas 24 horas.'
        );
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 1));

    SELECT NOT EXISTS (
        SELECT 1 FROM public.loyalty_transactions
         WHERE profile_id = v_user_id
           AND transaction_type = 'checkin'
    ) INTO v_is_first_checkin;

    INSERT INTO public.loyalty_transactions (profile_id, restaurant_id, points, transaction_type, description, expires_at)
    VALUES (v_user_id, p_restaurant_id, v_points_awarded, 'checkin', 'Check-in presencial no estabelecimento', v_expires_at);

    IF v_is_first_checkin THEN
        SELECT id, referrer_profile_id
          INTO v_referral_record
          FROM public.referrals
         WHERE referred_profile_id = v_user_id
           AND status = 'pendente'
         FOR UPDATE;

        IF FOUND THEN
            INSERT INTO public.loyalty_transactions (profile_id, restaurant_id, points, transaction_type, description, expires_at)
            VALUES (
                v_referral_record.referrer_profile_id,
                p_restaurant_id,
                15,
                'referral_bonus',
                'Bônus por indicação de amigo (1º check-in concluído)',
                v_expires_at
            );

            UPDATE public.referrals
               SET status = 'recompensado',
                   rewarded_at = pg_catalog.now()
             WHERE id = v_referral_record.id;

            v_bonus_awarded := true;
        END IF;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'points_awarded', v_points_awarded,
        'expires_at', v_expires_at,
        'bonus_awarded_to_referrer', v_bonus_awarded,
        'message', 'Check-in realizado com sucesso! Você ganhou 5 pontos de fidelidade.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.register_restaurant_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_restaurant_checkin(uuid) TO authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 5. PRÊMIOS DE FIDELIDADE (public.loyalty_rewards)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    points_cost integer NOT NULL CHECK (points_cost > 0),
    stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'esgotado')),
    image_url text,
    max_redemptions_per_user integer DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_rewards_restaurant_idx ON public.loyalty_rewards(restaurant_id);

GRANT SELECT ON public.loyalty_rewards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.loyalty_rewards TO authenticated;

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_rewards_select_public" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_select_public"
ON public.loyalty_rewards FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "loyalty_rewards_insert_owner" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_insert_owner"
ON public.loyalty_rewards FOR INSERT TO authenticated
WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.is_admin());

DROP POLICY IF EXISTS "loyalty_rewards_update_owner" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_update_owner"
ON public.loyalty_rewards FOR UPDATE TO authenticated
USING (public.is_restaurant_owner(restaurant_id) OR public.is_admin())
WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.is_admin());

DROP POLICY IF EXISTS "loyalty_rewards_delete_owner" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_delete_owner"
ON public.loyalty_rewards FOR DELETE TO authenticated
USING (public.is_restaurant_owner(restaurant_id) OR public.is_admin());


-- ------------------------------------------------------------------------------
-- 6. TABELA DE RESGATES (public.loyalty_redemptions) - CRIADA ANTES DE LOYALTY_CONSUMPTION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_code text NOT NULL UNIQUE,
    reward_id uuid NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE RESTRICT,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    debit_transaction_id uuid REFERENCES public.loyalty_transactions(id) ON DELETE RESTRICT,
    points_debited integer NOT NULL,
    status text NOT NULL DEFAULT 'emitido' CHECK (status IN ('emitido', 'utilizado', 'cancelado')),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_redemptions ADD COLUMN IF NOT EXISTS debit_transaction_id uuid REFERENCES public.loyalty_transactions(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS loyalty_redemptions_profile_idx ON public.loyalty_redemptions(profile_id);
CREATE INDEX IF NOT EXISTS loyalty_redemptions_restaurant_idx ON public.loyalty_redemptions(restaurant_id);
CREATE INDEX IF NOT EXISTS loyalty_redemptions_debit_idx ON public.loyalty_redemptions(debit_transaction_id);

GRANT SELECT ON public.loyalty_redemptions TO authenticated;

ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_redemptions_select_owner_or_merchant" ON public.loyalty_redemptions;
CREATE POLICY "loyalty_redemptions_select_owner_or_merchant"
ON public.loyalty_redemptions FOR SELECT TO authenticated
USING (
    auth.uid() = profile_id
    OR public.is_restaurant_owner(restaurant_id)
    OR public.is_admin()
);


-- ------------------------------------------------------------------------------
-- 7. TABELA DE CONSUMO FIFO (public.loyalty_consumption) E POLÍTICAS RLS REVISADAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_consumption (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    debit_transaction_id uuid NOT NULL REFERENCES public.loyalty_transactions(id) ON DELETE CASCADE,
    credit_transaction_id uuid NOT NULL REFERENCES public.loyalty_transactions(id) ON DELETE CASCADE,
    points_consumed integer NOT NULL CHECK (points_consumed > 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_consumption ADD COLUMN IF NOT EXISTS debit_transaction_id uuid REFERENCES public.loyalty_transactions(id) ON DELETE CASCADE;
ALTER TABLE public.loyalty_consumption ADD COLUMN IF NOT EXISTS credit_transaction_id uuid REFERENCES public.loyalty_transactions(id) ON DELETE CASCADE;
ALTER TABLE public.loyalty_consumption ADD COLUMN IF NOT EXISTS points_consumed integer;
ALTER TABLE public.loyalty_consumption ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS loyalty_consumption_debit_idx ON public.loyalty_consumption(debit_transaction_id);
CREATE INDEX IF NOT EXISTS loyalty_consumption_credit_idx ON public.loyalty_consumption(credit_transaction_id);

REVOKE ALL ON public.loyalty_consumption FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.loyalty_consumption TO authenticated;

ALTER TABLE public.loyalty_consumption ENABLE ROW LEVEL SECURITY;

-- Política RLS estrita para loyalty_consumption:
-- Comerciante consulta apenas consumos vinculados a resgates da própria loja.
-- Cliente consulta seus próprios consumos. Administrador consulta tudo.
DROP POLICY IF EXISTS "loyalty_consumption_select_policy" ON public.loyalty_consumption;
CREATE POLICY "loyalty_consumption_select_policy"
ON public.loyalty_consumption FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.loyalty_transactions tx
         WHERE tx.id = credit_transaction_id AND tx.profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.loyalty_transactions tx
         WHERE tx.id = debit_transaction_id AND tx.profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.loyalty_redemptions r
         WHERE r.debit_transaction_id = loyalty_consumption.debit_transaction_id
           AND public.is_restaurant_owner(r.restaurant_id)
    )
);


-- ------------------------------------------------------------------------------
-- 8. RPC DE RESGATE COM GLOBAL FIFO E REGRA 70/30 (Ordem de Lock Consistente)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_role text;
    v_reward record;
    v_voucher text;
    v_user_redemptions int;

    v_points_cost int;
    v_min_store_points int;
    v_max_other_points int;

    v_store_points_available int;
    v_total_points_available int;

    v_credit record;
    v_take int;
    v_allocated_store int := 0;
    v_allocated_other int := 0;
    v_total_allocated int := 0;

    v_debit_tx_id uuid;
    v_allocations jsonb := '[]'::jsonb;
    v_elem jsonb;
BEGIN
    v_user_id := pg_catalog.auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
    IF v_role IS DISTINCT FROM 'cliente' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Apenas clientes podem resgatar prêmios.');
    END IF;

    -- Concorrência: Bloqueio consultivo transacional unificado do usuário
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 2));

    SELECT * INTO v_reward
      FROM public.loyalty_rewards
     WHERE id = p_reward_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Prêmio não encontrado.');
    END IF;

    IF v_reward.status <> 'ativo' OR v_reward.stock <= 0 THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Este prêmio está esgotado ou indisponível.');
    END IF;

    IF v_reward.max_redemptions_per_user IS NOT NULL AND v_reward.max_redemptions_per_user > 0 THEN
        SELECT count(*) INTO v_user_redemptions
          FROM public.loyalty_redemptions
         WHERE reward_id = p_reward_id
           AND profile_id = v_user_id
           AND status <> 'cancelado';

        IF v_user_redemptions >= v_reward.max_redemptions_per_user THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Você já atingiu o limite de resgates para este prêmio.');
        END IF;
    END IF;

    v_points_cost := v_reward.points_cost;

    v_min_store_points := pg_catalog.ceil(v_points_cost * 0.70)::int;
    v_max_other_points := v_points_cost - v_min_store_points;

    -- Saldo disponível por créditos elegíveis (não expirados menos consumos ativos)
    SELECT COALESCE(sum(t.points - COALESCE(c.consumed_sum, 0)), 0) INTO v_store_points_available
      FROM public.loyalty_transactions t
      LEFT JOIN LATERAL (
          SELECT sum(points_consumed) as consumed_sum
            FROM public.loyalty_consumption
           WHERE credit_transaction_id = t.id AND is_active = true
      ) c ON true
     WHERE t.profile_id = v_user_id
       AND t.restaurant_id = v_reward.restaurant_id
       AND t.points > 0
       AND (t.expires_at IS NULL OR t.expires_at > pg_catalog.now());

    SELECT COALESCE(sum(t.points - COALESCE(c.consumed_sum, 0)), 0) INTO v_total_points_available
      FROM public.loyalty_transactions t
      LEFT JOIN LATERAL (
          SELECT sum(points_consumed) as consumed_sum
            FROM public.loyalty_consumption
           WHERE credit_transaction_id = t.id AND is_active = true
      ) c ON true
     WHERE t.profile_id = v_user_id
       AND t.points > 0
       AND (t.expires_at IS NULL OR t.expires_at > pg_catalog.now());

    IF v_store_points_available < v_min_store_points THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'message', pg_catalog.format('Pontos insuficientes nesta loja. A regra 70/30 exige pelo menos %s pontos acumulados neste estabelecimento (você tem %s).', v_min_store_points, v_store_points_available)
        );
    END IF;

    IF v_total_points_available < v_points_cost THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'message', pg_catalog.format('Saldo total insuficiente. O prêmio custa %s pontos (seu saldo disponível é de %s pontos).', v_points_cost, v_total_points_available)
        );
    END IF;

    -- ALOCAÇÃO GLOBAL FIFO (vencimento e criação) respeitando 70/30 estritamente
    FOR v_credit IN
        SELECT t.id, t.restaurant_id, t.points, t.expires_at,
               (t.points - COALESCE((SELECT sum(points_consumed) FROM public.loyalty_consumption WHERE credit_transaction_id = t.id AND is_active = true), 0)) as available
          FROM public.loyalty_transactions t
         WHERE t.profile_id = v_user_id
           AND t.points > 0
           AND (t.expires_at IS NULL OR t.expires_at > pg_catalog.now())
         ORDER BY t.expires_at ASC NULLS LAST, t.created_at ASC
    LOOP
        EXIT WHEN v_total_allocated >= v_points_cost;

        IF v_credit.available > 0 THEN
            IF v_credit.restaurant_id = v_reward.restaurant_id THEN
                v_take := LEAST(v_credit.available, v_points_cost - v_total_allocated);
                v_allocated_store := v_allocated_store + v_take;
                v_total_allocated := v_total_allocated + v_take;

                v_allocations := v_allocations || pg_catalog.jsonb_build_object(
                    'credit_id', v_credit.id,
                    'points', v_take,
                    'expires_at', v_credit.expires_at
                );
            ELSE
                IF v_allocated_other < v_max_other_points THEN
                    v_take := LEAST(v_credit.available, v_points_cost - v_total_allocated, v_max_other_points - v_allocated_other);
                    v_allocated_other := v_allocated_other + v_take;
                    v_total_allocated := v_total_allocated + v_take;

                    v_allocations := v_allocations || pg_catalog.jsonb_build_object(
                        'credit_id', v_credit.id,
                        'points', v_take,
                        'expires_at', v_credit.expires_at
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;

    IF v_total_allocated < v_points_cost OR v_allocated_store < v_min_store_points THEN
        RAISE EXCEPTION 'Falha na alocação FIFO ou violação da regra 70/30.';
    END IF;

    UPDATE public.loyalty_rewards
       SET stock = stock - 1,
           status = CASE WHEN stock - 1 = 0 THEN 'esgotado' ELSE status END,
           updated_at = pg_catalog.now()
     WHERE id = p_reward_id;

    -- Registro de débito com expires_at = NULL (validade controlada individualmente via loyalty_consumption)
    INSERT INTO public.loyalty_transactions (profile_id, restaurant_id, points, transaction_type, description, expires_at)
    VALUES (
        v_user_id,
        v_reward.restaurant_id,
        -v_points_cost,
        'reward_redemption',
        pg_catalog.format('Resgate do prêmio: %s', v_reward.title),
        NULL
    )
    RETURNING id INTO v_debit_tx_id;

    FOR v_elem IN SELECT * FROM pg_catalog.jsonb_array_elements(v_allocations)
    LOOP
        INSERT INTO public.loyalty_consumption (debit_transaction_id, credit_transaction_id, points_consumed, is_active)
        VALUES (
            v_debit_tx_id,
            (v_elem->>'credit_id')::uuid,
            (v_elem->>'points')::int,
            true
        );
    END LOOP;

    v_voucher := 'ZAP-' || pg_catalog.upper(pg_catalog.substring(pg_catalog.replace(gen_random_uuid()::text, '-', '') from 1 for 8));

    INSERT INTO public.loyalty_redemptions (voucher_code, reward_id, restaurant_id, profile_id, debit_transaction_id, points_debited, status)
    VALUES (v_voucher, p_reward_id, v_reward.restaurant_id, v_user_id, v_debit_tx_id, v_points_cost, 'emitido');

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'voucher_code', v_voucher,
        'reward_title', v_reward.title,
        'points_debited', v_points_cost,
        'message', 'Prêmio resgatado com sucesso! Apresente o código do voucher no balcão da loja.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid) TO authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 9. RPC DE CANCELAMENTO E ESTORNO SEGURO (Deadlock-free & Histórico Protegido)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_loyalty_redemption(p_redemption_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_redemption_preview record;
    v_redemption record;
    v_consumption record;
    v_credit record;
    v_is_authorized boolean := false;
BEGIN
    v_user_id := pg_catalog.auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
    END IF;

    -- Pré-busca para obter o profile_id e garantir ordem consistente de lock (evitando deadlocks com redeem)
    SELECT profile_id, restaurant_id, reward_id, status, debit_transaction_id, voucher_code INTO v_redemption_preview
      FROM public.loyalty_redemptions
     WHERE id = p_redemption_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Resgate não encontrado.');
    END IF;

    -- Idempotência
    IF v_redemption_preview.status = 'cancelado' THEN
        RETURN pg_catalog.jsonb_build_object('success', true, 'message', 'Este resgate já se encontra cancelado.');
    END IF;

    IF v_redemption_preview.status = 'utilizado' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Não é possível cancelar um prêmio que já foi utilizado.');
    END IF;

    -- Validação de Permissão (Admin ou Comerciante Autorizado da Loja)
    IF public.is_admin() OR public.is_restaurant_owner(v_redemption_preview.restaurant_id) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'message', 'Apenas administradores ou comerciantes da loja responsável podem cancelar resgates.');
    END IF;

    -- Trava o usuário PRÉ-VIRE (mesma ordem de redeem_loyalty_reward)
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_redemption_preview.profile_id::text, 2));

    -- Trava a linha do resgate com FOR UPDATE
    SELECT * INTO v_redemption
      FROM public.loyalty_redemptions
     WHERE id = p_redemption_id
     FOR UPDATE;

    -- Validação de histórico sem débito vinculado (resgate legado incorreto)
    IF v_redemption.debit_transaction_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'message', 'Erro administrativo: Este resgate histórico não possui vínculo estrutural de débito (debit_transaction_id NULO). O estorno automático não pode ser processado sem rastreamento FIFO.'
        );
    END IF;

    -- Atualiza status para cancelado
    UPDATE public.loyalty_redemptions
       SET status = 'cancelado'
     WHERE id = p_redemption_id;

    -- Restaura o estoque do prêmio
    UPDATE public.loyalty_rewards
       SET stock = stock + 1,
           status = CASE WHEN status = 'esgotado' THEN 'ativo' ELSE status END,
           updated_at = pg_catalog.now()
     WHERE id = v_redemption.reward_id;

    -- ESTORNO SEGURO SEM DUPLICAÇÃO:
    -- Desativa consumos de créditos ainda válidos. Créditos expirados mantêm consumo ativo.
    FOR v_consumption IN
        SELECT c.id, c.credit_transaction_id, c.points_consumed
          FROM public.loyalty_consumption c
         WHERE c.debit_transaction_id = v_redemption.debit_transaction_id
           AND c.is_active = true
    LOOP
        SELECT expires_at INTO v_credit
          FROM public.loyalty_transactions
         WHERE id = v_consumption.credit_transaction_id;

        IF FOUND AND (v_credit.expires_at IS NULL OR v_credit.expires_at > pg_catalog.now()) THEN
            UPDATE public.loyalty_consumption
               SET is_active = false
             WHERE id = v_consumption.id;
        ELSE
            -- Crédito expirado: pontos não retornam ao saldo
            NULL;
        END IF;
    END LOOP;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'message', 'Resgate cancelado e pontos válidos estornados com sucesso.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_loyalty_redemption(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_loyalty_redemption(uuid) TO authenticated, service_role;

COMMIT;
