
BEGIN;

-- =============================================================================
-- ZAP LANCHE
-- INDICAÇÕES + BÔNUS NO PRIMEIRO CHECK-IN
-- Migration independente
--
-- Não modifica register_restaurant_checkin.
-- Não altera as regras dos pontos locais.
-- =============================================================================


-- 1. CAMPOS DE INDICAÇÃO EM PROFILES
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS referred_by uuid
    REFERENCES public.profiles(id);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_unique
    ON public.profiles (referral_code)
    WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx
    ON public.profiles (referred_by)
    WHERE referred_by IS NOT NULL;


-- 2. PROTEÇÃO DAS PERMISSÕES DE PROFILES
-- -----------------------------------------------------------------------------

REVOKE UPDATE ON public.profiles
FROM PUBLIC, anon, authenticated;

GRANT UPDATE (full_name, username, role)
ON public.profiles
TO authenticated;


-- 3. GERADOR DE CÓDIGOS ÚNICOS
-- -----------------------------------------------------------------------------

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
            RAISE EXCEPTION 'Não foi possível gerar um código único de indicação.';
        END IF;

        v_code := 'ZAP-';

        FOR v_i IN 1..6 LOOP
            v_code := v_code ||
                pg_catalog.substr(
                    v_chars,
                    pg_catalog.floor(
                        pg_catalog.random() *
                        pg_catalog.length(v_chars) + 1
                    )::integer,
                    1
                );
        END LOOP;

        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(v_code, 42)
        );

        SELECT EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE referral_code = v_code
        )
        INTO v_exists;

        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_unique_referral_code()
FROM PUBLIC, anon, authenticated;


-- 4. GERAÇÃO AUTOMÁTICA PARA NOVOS PERFIS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.referral_code :=
        public.generate_unique_referral_code();

    NEW.referred_by := NULL;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_referral_code()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_referral_code_on_profile_created
ON public.profiles;

CREATE TRIGGER set_referral_code_on_profile_created
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_referral_code();


-- 5. BACKFILL DOS PERFIS ANTIGOS
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT id
        FROM public.profiles
        WHERE referral_code IS NULL
        FOR UPDATE
    LOOP
        UPDATE public.profiles
        SET referral_code = public.generate_unique_referral_code()
        WHERE id = r.id;
    END LOOP;
END;
$$;


-- 6. TABELA DE INDICAÇÕES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    referrer_id uuid NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,

    referred_id uuid NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,

    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'cancelled')),

    created_at timestamptz NOT NULL DEFAULT now(),

    completed_at timestamptz,

    CONSTRAINT referrals_not_self
        CHECK (referrer_id <> referred_id),

    CONSTRAINT referrals_unique_pair
        UNIQUE (referrer_id, referred_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_unique_referred
    ON public.referrals (referred_id);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
    ON public.referrals (referrer_id);

CREATE INDEX IF NOT EXISTS referrals_status_idx
    ON public.referrals (status);


-- 7. PERMISSÕES E RLS DE REFERRALS
-- -----------------------------------------------------------------------------

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.referrals
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.referrals
TO authenticated;

DROP POLICY IF EXISTS referrals_select_participants_or_admin
ON public.referrals;

CREATE POLICY referrals_select_participants_or_admin
ON public.referrals
FOR SELECT
TO authenticated
USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_id
    OR public.is_admin()
);


-- 8. RPC PARA VINCULAR CÓDIGO DE INDICAÇÃO
-- -----------------------------------------------------------------------------

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
    v_role text;
    v_existing_referred_by uuid;
    v_referrer_id uuid;
    v_normalized_code text;
    v_referral_id uuid;
    v_updated_profile_id uuid;
BEGIN

    -- Autenticação
    IF v_caller_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'UNAUTHENTICATED',
            'message', 'É necessário entrar na sua conta.'
        );
    END IF;


    -- Mesmo lock utilizado pelo trigger de check-in
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_caller_id::text, 101)
    );


    -- Bloqueia alterações concorrentes no perfil
    SELECT role, referred_by
    INTO v_role, v_existing_referred_by
    FROM public.profiles
    WHERE id = v_caller_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'PROFILE_NOT_FOUND',
            'message', 'Perfil não encontrado.'
        );
    END IF;


    -- Somente clientes podem participar
    IF v_role IS DISTINCT FROM 'cliente' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'FORBIDDEN_ROLE',
            'message', 'Somente clientes podem utilizar indicações.'
        );
    END IF;


    -- Não permite segunda indicação
    IF v_existing_referred_by IS NOT NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'ALREADY_REFERRED',
            'message', 'Você já possui um indicador.'
        );
    END IF;


    IF EXISTS (
        SELECT 1
        FROM public.referrals
        WHERE referred_id = v_caller_id
    ) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'ALREADY_REFERRED',
            'message', 'Você já foi indicado.'
        );
    END IF;


    -- Não permite vincular depois do primeiro check-in positivo
    IF EXISTS (
        SELECT 1
        FROM public.loyalty_transactions
        WHERE profile_id = v_caller_id
          AND transaction_type = 'checkin'
          AND points > 0
    ) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CHECKED_IN',
            'message', 'O código só pode ser vinculado antes do primeiro check-in.'
        );
    END IF;


    -- Normalização e validação
    IF p_referral_code IS NULL
       OR pg_catalog.btrim(p_referral_code) = '' THEN

        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_CODE',
            'message', 'Informe um código de indicação.'
        );
    END IF;

    v_normalized_code :=
        pg_catalog.upper(pg_catalog.btrim(p_referral_code));

    IF pg_catalog.length(v_normalized_code) < 4 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_CODE',
            'message', 'Código de indicação inválido.'
        );
    END IF;


    -- Localiza o indicador
    SELECT id
    INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_normalized_code;

    IF v_referrer_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'CODE_NOT_FOUND',
            'message', 'Código de indicação não encontrado.'
        );
    END IF;


    -- Impede autoindicação
    IF v_referrer_id = v_caller_id THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'SELF_REFERRAL',
            'message', 'Você não pode utilizar seu próprio código.'
        );
    END IF;


    -- Insere primeiro a indicação.
    -- O índice único impede duplicidade por usuário indicado.
    INSERT INTO public.referrals (
        referrer_id,
        referred_id,
        status
    )
    VALUES (
        v_referrer_id,
        v_caller_id,
        'pending'
    )
    ON CONFLICT (referred_id) DO NOTHING
    RETURNING id INTO v_referral_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'ALREADY_REFERRED',
            'message', 'Este usuário já possui uma indicação.'
        );
    END IF;


    -- Atualiza o perfil somente depois de inserir a indicação.
    UPDATE public.profiles
    SET referred_by = v_referrer_id
    WHERE id = v_caller_id
      AND referred_by IS NULL
    RETURNING id INTO v_updated_profile_id;

    IF NOT FOUND THEN

        -- Remove somente a indicação criada por esta execução.
        DELETE FROM public.referrals
        WHERE id = v_referral_id;

        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'PROFILE_UPDATE_FAILED',
            'message', 'Não foi possível vincular o código.'
        );
    END IF;


    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'code', 'REFERRAL_LINKED',
        'message', 'Código vinculado com sucesso! O bônus será concedido no primeiro check-in.'
    );

END;
$$;

REVOKE ALL ON FUNCTION public.register_referral_code(text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.register_referral_code(text)
TO authenticated;


-- 9. LOCK ANTES DA INSERÇÃO DO CHECK-IN
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lock_first_checkin_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN

    IF NEW.transaction_type = 'checkin'
       AND NEW.points > 0 THEN

        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(NEW.profile_id::text, 101)
        );

    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_first_checkin_referral()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lock_first_checkin_referral
ON public.loyalty_transactions;

CREATE TRIGGER trg_lock_first_checkin_referral
BEFORE INSERT ON public.loyalty_transactions
FOR EACH ROW
EXECUTE FUNCTION public.lock_first_checkin_referral();


-- 10. PROCESSAMENTO DO BÔNUS NO PRIMEIRO CHECK-IN
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_referrer_id uuid;
BEGIN

    -- Somente check-ins positivos
    IF NEW.transaction_type IS DISTINCT FROM 'checkin'
       OR NEW.points <= 0 THEN
        RETURN NULL;
    END IF;


    -- O próprio INSERT já está visível neste AFTER INSERT.
    -- Mais de um check-in positivo significa que não é o primeiro.
    IF (
        SELECT pg_catalog.count(*)
        FROM public.loyalty_transactions
        WHERE profile_id = NEW.profile_id
          AND transaction_type = 'checkin'
          AND points > 0
    ) > 1 THEN
        RETURN NULL;
    END IF;


    -- Busca o indicador vinculado
    SELECT referred_by
    INTO v_referrer_id
    FROM public.profiles
    WHERE id = NEW.profile_id;

    IF v_referrer_id IS NULL
       OR v_referrer_id = NEW.profile_id THEN
        RETURN NULL;
    END IF;


    -- Conclui somente a indicação pendente correspondente.
    -- RETURNING garante que o bônus só será criado se a atualização ocorrer.
    UPDATE public.referrals
    SET status = 'completed',
        completed_at = pg_catalog.now()
    WHERE referred_id = NEW.profile_id
      AND referrer_id = v_referrer_id
      AND status = 'pending'
    RETURNING referrer_id INTO v_referrer_id;


    IF FOUND THEN

        INSERT INTO public.loyalty_transactions (
            profile_id,
            restaurant_id,
            points,
            transaction_type,
            description,
            expires_at
        )
        VALUES (
            v_referrer_id,
            NULL,
            15,
            'convite',
            'Bônus global por indicação: primeiro check-in validado do amigo',
            pg_catalog.now() + INTERVAL '180 days'
        );

    END IF;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.process_referral_bonus()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_process_referral_bonus
ON public.loyalty_transactions;

CREATE TRIGGER trg_process_referral_bonus
AFTER INSERT ON public.loyalty_transactions
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_bonus();


-- 11. FINALIZAÇÃO
-- -----------------------------------------------------------------------------

COMMIT;
