BEGIN;

ALTER TABLE public.pending_invitations
    ALTER COLUMN email DROP NOT NULL;

CREATE UNIQUE INDEX pending_invitations_one_manual_pending_per_restaurant_idx
    ON public.pending_invitations (restaurant_id)
    WHERE status = 'pending'
      AND email IS NULL;

CREATE OR REPLACE FUNCTION public.accept_invitation_proc(
    p_token_hash text,
    p_user_id uuid,
    p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
    v_invitation_id UUID;
    v_restaurant_id UUID;
    v_invitation_email TEXT;
    v_authenticated_user_id UUID;
    v_authenticated_email TEXT;
    v_profile_role TEXT;
    v_owner_id UUID;
    v_restaurant_status TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Sessão inválida para aceitar o convite.';
    END IF;

    v_authenticated_user_id := p_user_id;

    IF p_token_hash IS NULL
       OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Dados do convite inválidos.';
    END IF;

    -- Bloqueia o convite para impedir uso simultâneo do mesmo token.
    SELECT i.id, i.restaurant_id, i.email
      INTO v_invitation_id, v_restaurant_id, v_invitation_email
      FROM public.pending_invitations AS i
     WHERE i.token_hash = p_token_hash
       AND i.status = 'pending'
       AND i.expires_at > pg_catalog.now()
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Convite inválido, utilizado ou expirado.';
    END IF;

    -- Convites por e-mail continuam vinculados ao endereço confiável do Auth.
    -- Convites manuais (email NULL) não exigem correspondência de e-mail.
    IF v_invitation_email IS NOT NULL THEN
        SELECT pg_catalog.lower(pg_catalog.btrim(u.email))
          INTO v_authenticated_email
          FROM auth.users AS u
         WHERE u.id = v_authenticated_user_id;

        IF NOT FOUND
           OR v_authenticated_email IS NULL
           OR p_email IS NULL
           OR pg_catalog.btrim(p_email) = ''
           OR pg_catalog.lower(pg_catalog.btrim(p_email))
                IS DISTINCT FROM v_authenticated_email
           OR pg_catalog.lower(pg_catalog.btrim(v_invitation_email))
                IS DISTINCT FROM v_authenticated_email THEN
            RAISE EXCEPTION 'Convite inválido, utilizado ou expirado.';
        END IF;
    END IF;

    -- Bloqueia o perfil que está aceitando o convite.
    SELECT p.role
      INTO v_profile_role
      FROM public.profiles AS p
     WHERE p.id = v_authenticated_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil do usuário não encontrado.';
    END IF;

    IF v_profile_role IS DISTINCT FROM 'cliente' THEN
        RAISE EXCEPTION 'Esta conta não pode aceitar o convite.';
    END IF;

    -- Bloqueia o restaurante e verifica seu estado atual.
    SELECT r.owner_profile_id, r.status
      INTO v_owner_id, v_restaurant_status
      FROM public.restaurants AS r
     WHERE r.id = v_restaurant_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Restaurante não encontrado.';
    END IF;

    IF v_restaurant_status IS DISTINCT FROM 'ativo'
       OR v_owner_id IS NOT NULL THEN
        RAISE EXCEPTION 'Restaurante indisponível para vinculação.';
    END IF;

    -- O bloqueio do perfil serializa tentativas simultâneas da mesma conta.
    IF EXISTS (
        SELECT 1
          FROM public.restaurants AS r
         WHERE r.owner_profile_id = v_authenticated_user_id
    ) THEN
        RAISE EXCEPTION 'Esta conta já administra um restaurante.';
    END IF;

    UPDATE public.profiles
       SET role = 'comerciante'
     WHERE id = v_authenticated_user_id
       AND role = 'cliente';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não foi possível atualizar o perfil.';
    END IF;

    UPDATE public.restaurants
       SET owner_profile_id = v_authenticated_user_id
     WHERE id = v_restaurant_id
       AND owner_profile_id IS NULL
       AND status = 'ativo';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não foi possível vincular o restaurante.';
    END IF;

    UPDATE public.pending_invitations
       SET status = 'used'
     WHERE id = v_invitation_id
       AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não foi possível concluir o convite.';
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'restaurant_id', v_restaurant_id
    );
END;
$function$;

REVOKE ALL
    ON FUNCTION public.accept_invitation_proc(text, uuid, text)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
    ON FUNCTION public.accept_invitation_proc(text, uuid, text)
    TO service_role;

COMMIT;
