BEGIN;

-- ==============================================================================
-- ZAP LANCHE - MIGRATION INDEPENDENTE: TRIGGER-BASED REFERRAL REWARD
-- Arquivo: 20261031000001_referrals_and_first_checkin_reward.sql
-- Escopo Exclusivo:
--   1. Estrutura em public.profiles (referral_code, referred_by)
--   2. Gerador robusto de código de indicação (com anti-colisão simultânea)
--   3. Tabela public.referrals (vínculos pendentes/concluídos)
--   4. RPC register_referral_code (para vincular códigos antes do 1º check-in, com validação anti-check-in prévio e advisory lock de serialização)
--   5. TRIGGER process_referral_bonus (dispara bônus atômico no 1º check-in via loyalty_transactions)
--   * NOTA: A RPC register_restaurant_checkin NÃO é modificada nem substituída.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ESTRUTURA EM PROFILES E GERADOR DE CÓDIGO
-- ------------------------------------------------------------------------------
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
    v_attempts integer := 0;
BEGIN
    LOOP
        v_attempts := v_attempts + 1;
        IF v_attempts > 200 THEN
            RAISE EXCEPTION 'Falha ao gerar código único de indicação.';
        END IF;

        v_code := 'ZAP-';
        FOR v_i IN 1..6 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
        END LOOP;

        PERFORM pg_advisory_xact_lock(hashtextextended(v_code, 42));

        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE referral_code = v_code
        ) INTO v_exists;

        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_unique_referral_code() FROM PUBLIC, anon, authenticated;

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

REVOKE ALL ON FUNCTION public.set_profile_referral_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_referral_code_on_profile_created ON public.profiles;
CREATE TRIGGER set_referral_code_on_profile_created
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_profile_referral_code();

-- Backfill seguro para perfis legados sem código
DO $$
DECLARE
    r RECORD;
    v_new_code text;
BEGIN
    FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL FOR UPDATE LOOP
        v_new_code := public.generate_unique_referral_code();
        UPDATE public.profiles
        SET referral_code = v_new_code
        WHERE id = r.id;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABELA DE INDICAÇÕES (public.referrals) E RPC DE VINCULAÇÃO
-- ------------------------------------------------------------------------------
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

REVOKE ALL ON TABLE public.referrals FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.referrals TO authenticated;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_participants_or_admin" ON public.referrals;
CREATE POLICY "referrals_select_participants_or_admin"
ON public.referrals FOR SELECT TO authenticated
USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_id
    OR (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
);

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
    v_caller_role text;
    v_referrer_id uuid;
    v_existing_referred_by uuid;
    v_normalized_code text;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNAUTHENTICATED',
            'message', 'Sessão inválida. Conecte-se para vincular o código.'
        );
    END IF;

    -- Serializa com o trigger de check-in para evitar corrida entre vinculação e primeiro check-in
    PERFORM pg_advisory_xact_lock(hashtextextended(v_caller_id::text, 101));

    -- BLOQUEIO CONCORRENTE: Trava a linha do perfil convidado com FOR UPDATE
    SELECT role, referred_by
    INTO v_caller_role, v_existing_referred_by
    FROM public.profiles
    WHERE id = v_caller_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PROFILE_NOT_FOUND',
            'message', 'Perfil de usuário não encontrado.'
        );
    END IF;

    -- Validar se já existe algum check-in positivo (o código só pode ser vinculado antes do primeiro check-in)
    IF EXISTS (
        SELECT 1 FROM public.loyalty_transactions
        WHERE profile_id = v_caller_id
          AND transaction_type = 'checkin'
          AND points > 0
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CHECKED_IN',
            'message', 'O código de indicação só pode ser vinculado antes do seu primeiro check-in.'
        );
    END IF;

    IF v_caller_role IS DISTINCT FROM 'cliente' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'FORBIDDEN_ROLE',
            'message', 'Apenas contas de clientes podem vincular códigos de indicação.'
        );
    END IF;

    IF v_existing_referred_by IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_REFERRED',
            'message', 'Você já possui um código de indicação vinculado à sua conta.'
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.referrals
        WHERE referred_id = v_caller_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_REFERRED',
            'message', 'Você já foi indicado por outro participante.'
        );
    END IF;

    v_normalized_code := upper(trim(p_referral_code));
    IF v_normalized_code IS NULL OR length(v_normalized_code) < 4 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_CODE',
            'message', 'Código de indicação inválido.'
        );
    END IF;

    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_normalized_code;

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CODE_NOT_FOUND',
            'message', 'Código de indicação não encontrado.'
        );
    END IF;

    IF v_referrer_id = v_caller_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SELF_REFERRAL',
            'message', 'Você não pode utilizar seu próprio código de indicação.'
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
        'message', 'Código vinculado com sucesso! O bônus será creditado no seu primeiro check-in.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.register_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_referral_code(text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER TRANSACIONAL: BÔNUS DE INDICAÇÃO NO 1º CHECK-IN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_referrer_id uuid;
    v_referral_row public.referrals%ROWTYPE;
    v_positive_checkin_count integer;
BEGIN
    -- 1. Disparar somente para transações positivas do tipo checkin
    IF NEW.transaction_type IS DISTINCT FROM 'checkin' OR NEW.points <= 0 THEN
        RETURN NULL;
    END IF;

    -- 2. Serializar o processamento por perfil do convidado usando o mesmo advisory lock da RPC
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.profile_id::text, 101));

    -- 3. Verificar rigorosamente se já existe outro check-in positivo antes deste
    SELECT count(*)
    INTO v_positive_checkin_count
    FROM public.loyalty_transactions
    WHERE profile_id = NEW.profile_id
      AND transaction_type = 'checkin'
      AND points > 0;

    -- Se houver mais de 1 check-in positivo, este não é o primeiro. Retorna sem bonificar.
    IF v_positive_checkin_count > 1 THEN
        RETURN NULL;
    END IF;

    -- 4. Buscar o indicador a partir de profiles.referred_by
    SELECT referred_by INTO v_referrer_id
    FROM public.profiles
    WHERE id = NEW.profile_id;

    IF v_referrer_id IS NULL OR v_referrer_id = NEW.profile_id THEN
        RETURN NULL;
    END IF;

    -- 5. Localizar a indicação pendente com lock FOR UPDATE para evitar duplicidade
    SELECT * INTO v_referral_row
    FROM public.referrals
    WHERE referrer_id = v_referrer_id
      AND referred_id = NEW.profile_id
      AND status = 'pending'
    FOR UPDATE;

    IF FOUND THEN
        -- 6. Marcar indicação como completed na mesma transação
        UPDATE public.referrals
        SET status = 'completed',
            completed_at = now()
        WHERE id = v_referral_row.id
          AND status = 'pending';

        IF FOUND THEN
            -- 7. Conceder 15 pontos globais ao indicador com restaurant_id = NULL e validade 180 dias
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
                'Bônus global por indicação: primeiro check-in validado do amigo',
                now() + interval '180 days'
            );
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.process_referral_bonus() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_process_referral_bonus ON public.loyalty_transactions;
CREATE TRIGGER trg_process_referral_bonus
    AFTER INSERT ON public.loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.process_referral_bonus();

COMMIT;
