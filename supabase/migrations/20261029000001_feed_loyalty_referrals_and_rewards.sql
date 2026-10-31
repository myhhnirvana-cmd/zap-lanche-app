BEGIN;

-- ==============================================================================
-- ZAP LANCHE - MIGRATION OFICIAL HOMOLOGADA
-- Arquivo: 20261029000001_feed_loyalty_referrals_and_rewards.sql
-- Escopo: Feed (post_likes), Indicações comunitárias, Carteiras de Fidelidade
--         (local e global), Prêmios, Resgates 70/30 (FIFO), Validação de Voucher
--         e Cálculo Atômico de Saldos.
--
-- Premissas confirmadas no Supabase:
--   - profiles.id e restaurants.id são UUID.
--   - public.posts já existe e usa UUID (id, restaurant_id, author_profile_id).
--   - loyalty_transactions aceita os tipos:
--     checkin, convite, avaliacao, foto, resgate, ajuste, bonus, campanha.
--   - loyalty_transactions.restaurant_id aceita NULL (pontos globais) e expires_at timestamptz.
--   - Esta migration NÃO recria nem altera public.posts.
--   - Regra 70/30: Mínimo de 70% de pontos da loja e máximo de 30% globais.
--   - Pontos de outras lojas nunca participam do resgate na loja X.
-- ==============================================================================

-- 0. SEGURANÇA BÁSICA: Reduz a superfície pública das funções de autorização
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_restaurant_owner(uuid) FROM anon;

-- ---------------------------------------------------------------------------
-- 1. FEED: Preservar posts e criar tabela public.post_likes com integridade
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT post_likes_post_profile_unique UNIQUE (post_id, profile_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS post_likes_profile_id_idx ON public.post_likes (profile_id);

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

DROP POLICY IF EXISTS "post_likes_delete_owner_admin" ON public.post_likes;
CREATE POLICY "post_likes_delete_owner_admin"
ON public.post_likes FOR DELETE TO authenticated
USING (auth.uid() = profile_id OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. INDICAÇÕES E RECOMPENSAS: Schema, unicidade e integridade
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_unique
    ON public.profiles (referral_code)
    WHERE referral_code IS NOT NULL;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx
    ON public.profiles (referred_by)
    WHERE referred_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    CONSTRAINT referrals_not_self CHECK (referrer_id <> referred_id),
    CONSTRAINT referrals_unique_pair UNIQUE (referrer_id, referred_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_unique_referred
    ON public.referrals (referred_id);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
    ON public.referrals (referrer_id);

CREATE INDEX IF NOT EXISTS referrals_status_idx
    ON public.referrals (status);

GRANT SELECT ON public.referrals TO authenticated;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_participants_or_admin" ON public.referrals;
CREATE POLICY "referrals_select_participants_or_admin"
ON public.referrals FOR SELECT TO authenticated
USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_id
    OR public.is_admin()
);

-- ---------------------------------------------------------------------------
-- 3. FUNÇÕES E TRIGGERS DE INDICAÇÕES
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_code text;
    v_exists boolean;
    v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_i integer;
BEGIN
    LOOP
        v_code := 'ZAP-';
        FOR v_i IN 1..6 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
        END LOOP;

        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE referral_code = v_code
        ) INTO v_exists;

        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_unique_referral_code() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_unique_referral_code();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_referral_code_on_profile_created ON public.profiles;
CREATE TRIGGER set_referral_code_on_profile_created
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_profile_referral_code();

-- Popula perfis pré-existentes sem código de indicação
UPDATE public.profiles
SET referral_code = public.generate_unique_referral_code()
WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.register_referral_code(
    p_referral_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_referrer_id uuid;
    v_existing_referred_by uuid;
    v_normalized_code text;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuario nao autenticado.'
            USING ERRCODE = '42501';
    END IF;

    v_normalized_code := upper(trim(p_referral_code));
    IF v_normalized_code IS NULL OR length(v_normalized_code) < 4 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_CODE',
            'message', 'Codigo de indicacao invalido.'
        );
    END IF;

    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_normalized_code;

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CODE_NOT_FOUND',
            'message', 'Codigo de indicacao nao encontrado.'
        );
    END IF;

    IF v_referrer_id = v_caller_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SELF_REFERRAL',
            'message', 'Voce nao pode utilizar seu proprio codigo de indicacao.'
        );
    END IF;

    SELECT referred_by INTO v_existing_referred_by
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_existing_referred_by IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_REFERRED',
            'message', 'Voce ja possui um codigo de indicacao vinculado a sua conta.'
        );
    END IF;

    IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_caller_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_REFERRED',
            'message', 'Voce ja foi indicado por outro participante.'
        );
    END IF;

    UPDATE public.profiles
    SET referred_by = v_referrer_id
    WHERE id = v_caller_id;

    INSERT INTO public.referrals (referrer_id, referred_id, status)
    VALUES (v_referrer_id, v_caller_id, 'pending')
    ON CONFLICT (referred_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'REFERRAL_LINKED',
        'message', 'Codigo vinculado com sucesso! O bonus sera creditado no seu primeiro check-in.'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_referral_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_referral_code(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. PRÊMIOS DE FIDELIDADE (public.loyalty_rewards)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    image_url text,
    points_cost integer NOT NULL CHECK (points_cost > 0),
    stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    max_redemptions_per_user integer DEFAULT NULL,
    is_active boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'esgotado')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_rewards_restaurant_id_idx
    ON public.loyalty_rewards (restaurant_id);

CREATE INDEX IF NOT EXISTS loyalty_rewards_status_idx
    ON public.loyalty_rewards (status)
    WHERE is_active = true;

GRANT SELECT ON public.loyalty_rewards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.loyalty_rewards TO authenticated;

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_rewards_select_active_or_manager" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_select_active_or_manager"
ON public.loyalty_rewards FOR SELECT TO public
USING (
    status = 'ativo'
    OR auth.uid() IS NOT NULL AND (
        public.is_admin()
        OR public.is_restaurant_owner(restaurant_id)
    )
);

DROP POLICY IF EXISTS "loyalty_rewards_insert_owner_admin" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_insert_owner_admin"
ON public.loyalty_rewards FOR INSERT TO authenticated
WITH CHECK (
    public.is_admin()
    OR public.is_restaurant_owner(restaurant_id)
);

DROP POLICY IF EXISTS "loyalty_rewards_update_owner_admin" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_update_owner_admin"
ON public.loyalty_rewards FOR UPDATE TO authenticated
USING (
    public.is_admin()
    OR public.is_restaurant_owner(restaurant_id)
)
WITH CHECK (
    public.is_admin()
    OR public.is_restaurant_owner(restaurant_id)
);

DROP POLICY IF EXISTS "loyalty_rewards_delete_owner_admin" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_delete_owner_admin"
ON public.loyalty_rewards FOR DELETE TO authenticated
USING (
    public.is_admin()
    OR public.is_restaurant_owner(restaurant_id)
);

-- ---------------------------------------------------------------------------
-- 5. RESGATES E CONSUMO: Tabelas, integridade, índices e políticas RLS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id uuid NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE RESTRICT,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    points_cost integer NOT NULL CHECK (points_cost > 0),
    store_points_used integer NOT NULL DEFAULT 0 CHECK (store_points_used >= 0),
    global_points_used integer NOT NULL DEFAULT 0 CHECK (global_points_used >= 0),
    voucher_code text NOT NULL,
    status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'utilizado', 'cancelado', 'expirado')),
    debit_transaction_id uuid REFERENCES public.loyalty_transactions(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    used_at timestamptz,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    CONSTRAINT loyalty_redemptions_points_sum_chk
        CHECK (store_points_used + global_points_used = points_cost)
);

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_redemptions_voucher_code_unique
    ON public.loyalty_redemptions (voucher_code);

CREATE INDEX IF NOT EXISTS loyalty_redemptions_profile_id_idx
    ON public.loyalty_redemptions (profile_id);

CREATE INDEX IF NOT EXISTS loyalty_redemptions_restaurant_id_idx
    ON public.loyalty_redemptions (restaurant_id);

CREATE INDEX IF NOT EXISTS loyalty_redemptions_voucher_code_idx
    ON public.loyalty_redemptions (voucher_code);

CREATE INDEX IF NOT EXISTS loyalty_redemptions_reward_id_idx
    ON public.loyalty_redemptions (reward_id);

CREATE INDEX IF NOT EXISTS loyalty_redemptions_status_idx
    ON public.loyalty_redemptions (status);

CREATE INDEX IF NOT EXISTS loyalty_redemptions_created_at_idx
    ON public.loyalty_redemptions (created_at DESC);

CREATE TABLE IF NOT EXISTS public.loyalty_consumption (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    debit_transaction_id uuid NOT NULL REFERENCES public.loyalty_transactions(id) ON DELETE CASCADE,
    credit_transaction_id uuid NOT NULL REFERENCES public.loyalty_transactions(id) ON DELETE RESTRICT,
    points_consumed integer NOT NULL CHECK (points_consumed > 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_consumption_debit_tx_idx
    ON public.loyalty_consumption (debit_transaction_id);

CREATE INDEX IF NOT EXISTS loyalty_consumption_credit_tx_idx
    ON public.loyalty_consumption (credit_transaction_id);

CREATE INDEX IF NOT EXISTS loyalty_consumption_active_idx
    ON public.loyalty_consumption (is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS loyalty_consumption_active_credit_idx
    ON public.loyalty_consumption (credit_transaction_id)
    WHERE is_active = true;

GRANT SELECT ON public.loyalty_redemptions TO authenticated;
GRANT SELECT ON public.loyalty_consumption TO authenticated;

ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_consumption ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_redemptions_select_owner_merchant_admin" ON public.loyalty_redemptions;
CREATE POLICY "loyalty_redemptions_select_owner_merchant_admin"
ON public.loyalty_redemptions FOR SELECT TO authenticated
USING (
    auth.uid() = profile_id
    OR public.is_restaurant_owner(restaurant_id)
    OR public.is_admin()
);

DROP POLICY IF EXISTS "loyalty_consumption_select_owner_merchant_admin" ON public.loyalty_consumption;
CREATE POLICY "loyalty_consumption_select_owner_merchant_admin"
ON public.loyalty_consumption FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.loyalty_transactions t
        WHERE t.id = loyalty_consumption.debit_transaction_id
          AND t.profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.loyalty_redemptions r
        WHERE r.debit_transaction_id = loyalty_consumption.debit_transaction_id
          AND public.is_restaurant_owner(r.restaurant_id)
    )
);

-- ---------------------------------------------------------------------------
-- 6. RPC: REGISTRO DE CHECK-IN E DISPARO DE INDICAÇÃO
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_restaurant_checkin(
    p_restaurant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_restaurant_exists boolean;
    v_last_checkin timestamptz;
    v_checkin_interval interval := interval '2 hours';
    v_new_tx_id uuid;
    v_referrer_id uuid;
    v_is_first_checkin boolean := false;
    v_referral_row public.referrals%ROWTYPE;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuario nao autenticado.'
            USING ERRCODE = '42501';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id
    ) INTO v_restaurant_exists;

    IF NOT v_restaurant_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'RESTAURANT_NOT_FOUND',
            'message', 'Restaurante nao encontrado.'
        );
    END IF;

    SELECT max(created_at) INTO v_last_checkin
    FROM public.loyalty_transactions
    WHERE profile_id = v_caller_id
      AND restaurant_id = p_restaurant_id
      AND transaction_type = 'checkin';

    IF v_last_checkin IS NOT NULL AND (now() - v_last_checkin) < v_checkin_interval THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CHECKIN_COOLDOWN',
            'message', 'Check-in ja realizado recentemente neste restaurante. Aguarde o intervalo de seguranca.'
        );
    END IF;

    INSERT INTO public.loyalty_transactions (
        profile_id,
        restaurant_id,
        points,
        transaction_type,
        description,
        expires_at
    ) VALUES (
        v_caller_id,
        p_restaurant_id,
        5,
        'checkin',
        'Check-in presencial no restaurante',
        now() + interval '90 days'
    ) RETURNING id INTO v_new_tx_id;

    SELECT NOT EXISTS (
        SELECT 1
        FROM public.loyalty_transactions
        WHERE profile_id = v_caller_id
          AND transaction_type = 'checkin'
          AND id <> v_new_tx_id
    ) INTO v_is_first_checkin;

    IF v_is_first_checkin THEN
        SELECT referred_by INTO v_referrer_id
        FROM public.profiles
        WHERE id = v_caller_id;

        IF v_referrer_id IS NOT NULL AND v_referrer_id <> v_caller_id THEN
            SELECT * INTO v_referral_row
            FROM public.referrals
            WHERE referrer_id = v_referrer_id
              AND referred_id = v_caller_id
            FOR UPDATE;

            IF FOUND AND v_referral_row.status = 'pending' THEN
                UPDATE public.referrals
                SET status = 'completed',
                    completed_at = now()
                WHERE id = v_referral_row.id;

                INSERT INTO public.loyalty_transactions (
                    profile_id,
                    restaurant_id,
                    points,
                    transaction_type,
                    description,
                    expires_at
                ) VALUES (
                    v_referrer_id,
                    NULL,
                    15,
                    'convite',
                    'Bonus de indicacao de amigo (primeiro check-in)',
                    now() + interval '180 days'
                );
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'CHECKIN_REGISTERED',
        'points_awarded', 5,
        'message', 'Check-in realizado com sucesso! 5 pontos creditados.'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_restaurant_checkin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_restaurant_checkin(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. RPCs DE RESGATE E CANCELAMENTO: FIFO estrito, 70/30 e Estorno Atômico
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(
    p_reward_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_reward public.loyalty_rewards%ROWTYPE;
    v_now timestamptz := now();
    v_min_store_points integer;
    v_max_global_points integer;
    v_store_available integer := 0;
    v_global_available integer := 0;
    v_store_to_use integer := 0;
    v_global_to_use integer := 0;
    v_points_needed integer;
    v_user_redemptions_count integer;
    v_debit_tx_id uuid;
    v_voucher_code text;
    v_redemption_id uuid;
    v_credit record;
    v_available_in_credit integer;
    v_to_consume integer;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuario nao autenticado.'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_reward
    FROM public.loyalty_rewards
    WHERE id = p_reward_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'REWARD_NOT_FOUND',
            'message', 'Premio nao encontrado.'
        );
    END IF;

    IF v_reward.status <> 'ativo' OR NOT v_reward.is_active THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'REWARD_INACTIVE',
            'message', 'Este premio nao esta ativo no momento.'
        );
    END IF;

    IF v_reward.stock <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'OUT_OF_STOCK',
            'message', 'Premio esgotado.'
        );
    END IF;

    IF v_reward.max_redemptions_per_user IS NOT NULL THEN
        SELECT count(*) INTO v_user_redemptions_count
        FROM public.loyalty_redemptions
        WHERE profile_id = v_user_id
          AND reward_id = p_reward_id
          AND status IN ('pendente', 'utilizado');

        IF v_user_redemptions_count >= v_reward.max_redemptions_per_user THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'USER_LIMIT_REACHED',
                'message', 'Voce ja atingiu o limite de resgates para este premio.'
            );
        END IF;
    END IF;

    v_min_store_points := CEIL(v_reward.points_cost * 0.70)::integer;
    v_max_global_points := FLOOR(v_reward.points_cost * 0.30)::integer;

    PERFORM pg_advisory_xact_lock(
        hashtext('loyalty_balance_' || v_user_id::text)
    );

    SELECT COALESCE(SUM(
        t.points - COALESCE(c.consumed, 0)
    ), 0) INTO v_store_available
    FROM public.loyalty_transactions t
    LEFT JOIN (
        SELECT credit_transaction_id, SUM(points_consumed) AS consumed
        FROM public.loyalty_consumption
        WHERE is_active = true
        GROUP BY credit_transaction_id
    ) c ON c.credit_transaction_id = t.id
    WHERE t.profile_id = v_user_id
      AND t.restaurant_id = v_reward.restaurant_id
      AND t.points > 0
      AND (t.expires_at IS NULL OR t.expires_at > v_now);

    IF v_store_available < v_min_store_points THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INSUFFICIENT_STORE_POINTS',
            'message', format('Saldo insuficiente nesta loja. Necessario minimo de %s pontos desta lanchonete (Regra 70%%). Voce possui %s.',
                v_min_store_points, v_store_available),
            'min_store_points_required', v_min_store_points,
            'current_store_points', v_store_available
        );
    END IF;

    SELECT COALESCE(SUM(
        t.points - COALESCE(c.consumed, 0)
    ), 0) INTO v_global_available
    FROM public.loyalty_transactions t
    LEFT JOIN (
        SELECT credit_transaction_id, SUM(points_consumed) AS consumed
        FROM public.loyalty_consumption
        WHERE is_active = true
        GROUP BY credit_transaction_id
    ) c ON c.credit_transaction_id = t.id
    WHERE t.profile_id = v_user_id
      AND t.restaurant_id IS NULL
      AND t.points > 0
      AND (t.expires_at IS NULL OR t.expires_at > v_now);

    IF (v_store_available + v_global_available) < v_reward.points_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INSUFFICIENT_TOTAL_POINTS',
            'message', format('Saldo total elegivel insuficiente. O premio custa %s pontos, e voce possui %s validos (loja + indicacoes).',
                v_reward.points_cost, (v_store_available + v_global_available))
        );
    END IF;

    IF v_store_available >= v_reward.points_cost THEN
        v_store_to_use := v_reward.points_cost;
        v_global_to_use := 0;
    ELSE
        v_store_to_use := v_store_available;
        v_global_to_use := v_reward.points_cost - v_store_to_use;
        IF v_global_to_use > v_max_global_points THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'GLOBAL_POINTS_EXCEEDED',
                'message', format('O resgate permite no maximo 30%% de pontos globais (%s pts). Voce precisaria de %s pontos globais.',
                    v_max_global_points, v_global_to_use)
            );
        END IF;
    END IF;

    INSERT INTO public.loyalty_transactions (
        profile_id,
        restaurant_id,
        points,
        transaction_type,
        description,
        expires_at
    ) VALUES (
        v_user_id,
        v_reward.restaurant_id,
        -v_reward.points_cost,
        'resgate',
        format('Resgate de premio: %s (voucher gerado)', v_reward.title),
        NULL
    ) RETURNING id INTO v_debit_tx_id;

    v_points_needed := v_store_to_use;
    IF v_points_needed > 0 THEN
        FOR v_credit IN
            SELECT
                t.id,
                t.points - COALESCE(c.consumed, 0) AS available_points
            FROM public.loyalty_transactions t
            LEFT JOIN (
                SELECT credit_transaction_id, SUM(points_consumed) AS consumed
                FROM public.loyalty_consumption
                WHERE is_active = true
                GROUP BY credit_transaction_id
            ) c ON c.credit_transaction_id = t.id
            WHERE t.profile_id = v_user_id
              AND t.restaurant_id = v_reward.restaurant_id
              AND t.points > 0
              AND (t.expires_at IS NULL OR t.expires_at > v_now)
              AND (t.points - COALESCE(c.consumed, 0)) > 0
            ORDER BY t.expires_at ASC NULLS LAST, t.created_at ASC
            FOR UPDATE OF t
        LOOP
            v_available_in_credit := v_credit.available_points;
            IF v_available_in_credit <= 0 THEN
                CONTINUE;
            END IF;

            v_to_consume := LEAST(v_points_needed, v_available_in_credit);

            INSERT INTO public.loyalty_consumption (
                debit_transaction_id,
                credit_transaction_id,
                points_consumed,
                is_active
            ) VALUES (
                v_debit_tx_id,
                v_credit.id,
                v_to_consume,
                true
            );

            v_points_needed := v_points_needed - v_to_consume;
            EXIT WHEN v_points_needed = 0;
        END LOOP;

        IF v_points_needed > 0 THEN
            RAISE EXCEPTION 'Inconsistencia de concorrencia ao alocar pontos da loja.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    v_points_needed := v_global_to_use;
    IF v_points_needed > 0 THEN
        FOR v_credit IN
            SELECT
                t.id,
                t.points - COALESCE(c.consumed, 0) AS available_points
            FROM public.loyalty_transactions t
            LEFT JOIN (
                SELECT credit_transaction_id, SUM(points_consumed) AS consumed
                FROM public.loyalty_consumption
                WHERE is_active = true
                GROUP BY credit_transaction_id
            ) c ON c.credit_transaction_id = t.id
            WHERE t.profile_id = v_user_id
              AND t.restaurant_id IS NULL
              AND t.points > 0
              AND (t.expires_at IS NULL OR t.expires_at > v_now)
              AND (t.points - COALESCE(c.consumed, 0)) > 0
            ORDER BY t.expires_at ASC NULLS LAST, t.created_at ASC
            FOR UPDATE OF t
        LOOP
            v_available_in_credit := v_credit.available_points;
            IF v_available_in_credit <= 0 THEN
                CONTINUE;
            END IF;

            v_to_consume := LEAST(v_points_needed, v_available_in_credit);

            INSERT INTO public.loyalty_consumption (
                debit_transaction_id,
                credit_transaction_id,
                points_consumed,
                is_active
            ) VALUES (
                v_debit_tx_id,
                v_credit.id,
                v_to_consume,
                true
            );

            v_points_needed := v_points_needed - v_to_consume;
            EXIT WHEN v_points_needed = 0;
        END LOOP;

        IF v_points_needed > 0 THEN
            RAISE EXCEPTION 'Inconsistencia de concorrencia ao alocar pontos globais.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    v_voucher_code := 'ZAP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    INSERT INTO public.loyalty_redemptions (
        reward_id,
        profile_id,
        restaurant_id,
        points_cost,
        store_points_used,
        global_points_used,
        voucher_code,
        status,
        debit_transaction_id,
        expires_at
    ) VALUES (
        v_reward.id,
        v_user_id,
        v_reward.restaurant_id,
        v_reward.points_cost,
        v_store_to_use,
        v_global_to_use,
        v_voucher_code,
        'pendente',
        v_debit_tx_id,
        now() + interval '30 days'
    ) RETURNING id INTO v_redemption_id;

    UPDATE public.loyalty_rewards
    SET stock = stock - 1,
        status = CASE WHEN stock - 1 <= 0 THEN 'esgotado' ELSE status END,
        updated_at = now()
    WHERE id = v_reward.id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'REWARD_REDEEMED',
        'redemption_id', v_redemption_id,
        'voucher_code', v_voucher_code,
        'reward_title', v_reward.title,
        'points_deducted', v_reward.points_cost,
        'store_points_used', v_store_to_use,
        'global_points_used', v_global_to_use,
        'message', 'Premio resgatado com sucesso! Apresente o voucher no estabelecimento.'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_loyalty_redemption(
    p_redemption_id uuid,
    p_reason text DEFAULT 'Cancelamento solicitado'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_redemption public.loyalty_redemptions%ROWTYPE;
    v_debit_tx public.loyalty_transactions%ROWTYPE;
    v_consumption record;
    v_total_consumed integer := 0;
    v_points_refunded integer := 0;
    v_points_expired_lost integer := 0;
    v_now timestamptz := now();
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuario nao autenticado.'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_redemption
    FROM public.loyalty_redemptions
    WHERE id = p_redemption_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'REDEMPTION_NOT_FOUND',
            'message', 'Resgate nao encontrado.'
        );
    END IF;

    IF v_redemption.profile_id <> v_caller_id
       AND NOT public.is_restaurant_owner(v_redemption.restaurant_id)
       AND NOT public.is_admin() THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'FORBIDDEN',
            'message', 'Voce nao tem permissao para cancelar este resgate.'
        );
    END IF;

    IF v_redemption.status <> 'pendente' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS',
            'message', format('Nao e possivel cancelar um resgate com status "%s".', v_redemption.status)
        );
    END IF;

    IF v_redemption.debit_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Resgate sem transacao de debito associada.'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_debit_tx
    FROM public.loyalty_transactions
    WHERE id = v_redemption.debit_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transacao de debito % nao encontrada.', v_redemption.debit_transaction_id
            USING ERRCODE = 'P0001';
    END IF;

    IF v_debit_tx.profile_id <> v_redemption.profile_id THEN
        RAISE EXCEPTION 'Inconsistencia de integridade: profile_id do debito difere do resgate.'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_debit_tx.points <> (-v_redemption.points_cost) THEN
        RAISE EXCEPTION 'Inconsistencia de integridade: valor do debito difere do custo do resgate.'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(SUM(points_consumed), 0) INTO v_total_consumed
    FROM public.loyalty_consumption
    WHERE debit_transaction_id = v_redemption.debit_transaction_id
      AND is_active = true;

    IF v_total_consumed <> v_redemption.points_cost THEN
        RAISE EXCEPTION 'Inconsistencia de integridade: total consumido (%s) difere do custo (%s).',
            v_total_consumed, v_redemption.points_cost
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.loyalty_redemptions
    SET status = 'cancelado'
    WHERE id = v_redemption.id;

    UPDATE public.loyalty_rewards
    SET stock = stock + 1,
        status = CASE WHEN status = 'esgotado' THEN 'ativo' ELSE status END,
        updated_at = now()
    WHERE id = v_redemption.reward_id;

    FOR v_consumption IN
        SELECT
            c.id AS consumption_id,
            c.points_consumed,
            t.restaurant_id,
            t.expires_at,
            t.id AS original_tx_id
        FROM public.loyalty_consumption c
        JOIN public.loyalty_transactions t ON t.id = c.credit_transaction_id
        WHERE c.debit_transaction_id = v_redemption.debit_transaction_id
          AND c.is_active = true
        FOR UPDATE OF c, t
    LOOP
        IF v_consumption.expires_at IS NULL OR v_consumption.expires_at > v_now THEN
            INSERT INTO public.loyalty_transactions (
                profile_id,
                restaurant_id,
                points,
                transaction_type,
                description,
                expires_at
            ) VALUES (
                v_redemption.profile_id,
                v_consumption.restaurant_id,
                v_consumption.points_consumed,
                'ajuste',
                format('Estorno de resgate cancelado (voucher %s) - %s', v_redemption.voucher_code, p_reason),
                v_consumption.expires_at
            );
            v_points_refunded := v_points_refunded + v_consumption.points_consumed;
        ELSE
            v_points_expired_lost := v_points_expired_lost + v_consumption.points_consumed;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'REDEMPTION_CANCELLED',
        'points_refunded', v_points_refunded,
        'points_expired_lost', v_points_expired_lost,
        'message', format('Resgate cancelado com sucesso. %s pontos estornados ao saldo.', v_points_refunded)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_loyalty_redemption(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_loyalty_redemption(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. RPC: VALIDAÇÃO DE VOUCHER PELO COMERCIANTE OU ADMINISTRADOR
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_loyalty_redemption_used(
    p_voucher_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_normalized_voucher text;
    v_redemption public.loyalty_redemptions%ROWTYPE;
    v_reward_title text;
    v_customer_name text;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuario nao autenticado.'
            USING ERRCODE = '42501';
    END IF;

    v_normalized_voucher := upper(trim(p_voucher_code));
    IF v_normalized_voucher IS NULL OR length(v_normalized_voucher) < 4 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_VOUCHER_CODE',
            'message', 'Codigo de voucher invalido.'
        );
    END IF;

    SELECT * INTO v_redemption
    FROM public.loyalty_redemptions
    WHERE voucher_code = v_normalized_voucher
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VOUCHER_NOT_FOUND',
            'message', 'Voucher nao encontrado no sistema.'
        );
    END IF;

    IF NOT (public.is_restaurant_owner(v_redemption.restaurant_id) OR public.is_admin()) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'FORBIDDEN',
            'message', 'Acesso negado: voce nao e proprietario da lanchonete deste voucher nem administrador.'
        );
    END IF;

    IF v_redemption.status = 'utilizado' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_USED',
            'message', format('Este voucher ja foi utilizado em %s.',
                to_char(v_redemption.used_at, 'DD/MM/YYYY HH24:MI'))
        );
    END IF;

    IF v_redemption.status = 'cancelado' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CANCELLED',
            'message', 'Este voucher foi cancelado e os pontos foram estornados.'
        );
    END IF;

    IF v_redemption.status = 'expirado' OR v_redemption.expires_at <= now() THEN
        IF v_redemption.status <> 'expirado' THEN
            UPDATE public.loyalty_redemptions
            SET status = 'expirado'
            WHERE id = v_redemption.id;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'code', 'EXPIRED',
            'message', 'Este voucher esta expirado e nao pode ser utilizado.'
        );
    END IF;

    UPDATE public.loyalty_redemptions
    SET status = 'utilizado',
        used_at = now()
    WHERE id = v_redemption.id;

    SELECT title INTO v_reward_title
    FROM public.loyalty_rewards
    WHERE id = v_redemption.reward_id;

    SELECT COALESCE(full_name, username, 'Cliente') INTO v_customer_name
    FROM public.profiles
    WHERE id = v_redemption.profile_id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'VOUCHER_VALIDATED',
        'redemption_id', v_redemption.id,
        'voucher_code', v_redemption.voucher_code,
        'reward_title', v_reward_title,
        'customer_name', v_customer_name,
        'points_cost', v_redemption.points_cost,
        'used_at', now(),
        'message', 'Voucher validado com sucesso! Entregue o premio ao cliente.'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_loyalty_redemption_used(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_loyalty_redemption_used(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. RPC: CÁLCULO DEFINITIVO E ATÔMICO DE SALDOS (get_user_loyalty_balance)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_loyalty_balance(
    p_restaurant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_now timestamptz := now();
    v_store_available integer := 0;
    v_global_available integer := 0;
    v_other_stores_available integer := 0;
    v_total_available integer := 0;
    v_max_redeemable integer := 0;
    v_expired_points integer := 0;
    v_consumed_points integer := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuario nao autenticado.'
            USING ERRCODE = '42501';
    END IF;

    -- CTE que resume créditos positivos (points > 0) e subtrai consumos ativos
    -- Sem subtrair débitos negativos novamente (evita armadilha da contagem dupla)
    WITH credit_summary AS (
        SELECT
            t.id,
            t.restaurant_id,
            t.points,
            t.expires_at,
            COALESCE(c.consumed, 0) AS consumed_pts,
            GREATEST(t.points - COALESCE(c.consumed, 0), 0) AS remaining_pts,
            CASE 
                WHEN t.expires_at IS NOT NULL AND t.expires_at <= v_now THEN true 
                ELSE false 
            END AS is_expired
        FROM public.loyalty_transactions t
        LEFT JOIN (
            SELECT 
                credit_transaction_id,
                SUM(points_consumed) AS consumed
            FROM public.loyalty_consumption
            WHERE is_active = true
            GROUP BY credit_transaction_id
        ) c ON c.credit_transaction_id = t.id
        WHERE t.profile_id = v_user_id
          AND t.points > 0
    )
    SELECT
        -- Saldo disponível na loja especificada
        COALESCE(SUM(CASE 
            WHEN p_restaurant_id IS NOT NULL 
                 AND restaurant_id = p_restaurant_id 
                 AND NOT is_expired 
            THEN remaining_pts 
            ELSE 0 
        END), 0)::integer,

        -- Saldo global disponível (indicações/ajustes sem loja vinculada)
        COALESCE(SUM(CASE 
            WHEN restaurant_id IS NULL 
                 AND NOT is_expired 
            THEN remaining_pts 
            ELSE 0 
        END), 0)::integer,

        -- Saldo disponível em outras lojas
        COALESCE(SUM(CASE 
            WHEN p_restaurant_id IS NOT NULL 
                 AND restaurant_id IS NOT NULL 
                 AND restaurant_id <> p_restaurant_id 
                 AND NOT is_expired 
            THEN remaining_pts 
            ELSE 0 
        END), 0)::integer,

        -- Saldo total disponível e válido em toda a rede
        COALESCE(SUM(CASE 
            WHEN NOT is_expired 
            THEN remaining_pts 
            ELSE 0 
        END), 0)::integer,

        -- Total de pontos remanescentes já expirados
        COALESCE(SUM(CASE 
            WHEN is_expired 
            THEN remaining_pts 
            ELSE 0 
        END), 0)::integer,

        -- Total de pontos consumidos em resgates ativos
        COALESCE(SUM(consumed_pts), 0)::integer

    INTO 
        v_store_available,
        v_global_available,
        v_other_stores_available,
        v_total_available,
        v_expired_points,
        v_consumed_points
    FROM credit_summary;

    -- Teto resgatável na loja segundo a Regra 70/30:
    -- Exige pelo menos 70% de pontos locais e aceita até 30% globais.
    IF p_restaurant_id IS NOT NULL AND v_store_available > 0 THEN
        v_max_redeemable := LEAST(
            v_store_available + v_global_available,
            FLOOR(v_store_available / 0.70)::integer
        );
    ELSE
        v_max_redeemable := 0;
    END IF;

    RETURN jsonb_build_object(
        'store_available_points', v_store_available,
        'global_available_points', v_global_available,
        'other_stores_available_points', v_other_stores_available,
        'total_available_points', v_total_available,
        'max_redeemable_at_store', v_max_redeemable,
        'expired_points', v_expired_points,
        'consumed_points', v_consumed_points
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_loyalty_balance(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_loyalty_balance(uuid) TO authenticated;

COMMIT;
