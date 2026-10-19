import { createClient } from "jsr:@supabase/supabase-js@2";

// Configuração de CORS restrita com preflight OPTIONS
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin);
  const allowOrigin = isAllowed && origin ? origin : (ALLOWED_ORIGINS[0] || "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
}

async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  // Trata pré-voo CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método HTTP não permitido. Utilize POST." }),
      { status: 405, headers: corsHeaders }
    );
  }

  // Inicializa o cliente com service_role para operações seguras de banco
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Configuração do servidor incompleta (chaves ausentes)." }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo da requisição deve ser um JSON válido." }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { token, action = "accept" } = body || {};

  if (!token || typeof token !== "string" || token.trim() === "") {
    return new Response(
      JSON.stringify({ error: "Token de convite não informado." }),
      { status: 400, headers: corsHeaders }
    );
  }

  const rawToken = token.trim();
  const tokenHash = await computeSha256(rawToken);

  // =========================================================================
  // AÇÃO: PREVIEW (Consulta detalhes para confirmação explícita na tela)
  // =========================================================================
  if (action === "preview") {
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("pending_invitations")
      .select("id, restaurant_id, email, expires_at, status")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (invErr) {
      return new Response(
        JSON.stringify({ error: "Erro ao consultar dados do convite." }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!inv) {
      return new Response(
        JSON.stringify({ error: "Convite inválido ou token inexistente." }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (inv.status !== "pending") {
      const msg =
        inv.status === "used"
          ? "Este convite já foi utilizado anteriormente."
          : "Este convite foi revogado pela administração.";
      return new Response(
        JSON.stringify({ error: msg, status: inv.status }),
        { status: 410, headers: corsHeaders }
      );
    }

    if (new Date(inv.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Este convite expirou.", status: "expired" }),
        { status: 410, headers: corsHeaders }
      );
    }

    // Consulta os detalhes da lanchonete associada
    const { data: rest, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, neighborhood, status, owner_profile_id")
      .eq("id", inv.restaurant_id)
      .maybeSingle();

    if (restErr || !rest) {
      return new Response(
        JSON.stringify({ error: "Lanchonete vinculada ao convite não foi encontrada." }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (rest.status !== "ativo") {
      return new Response(
        JSON.stringify({ error: "Esta lanchonete está inativa no sistema." }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (rest.owner_profile_id) {
      return new Response(
        JSON.stringify({ error: "Esta lanchonete já possui um comerciante responsável." }),
        { status: 409, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        restaurant_id: rest.id,
        restaurant_name: rest.name,
        neighborhood: rest.neighborhood,
        invited_email: inv.email,
        expires_at: inv.expires_at,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // =========================================================================
  // AÇÃO: ACCEPT (Validação de sessão e execução da RPC accept_invitation_proc)
  // =========================================================================
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Cabeçalho de autorização (Bearer token) ausente ou inválido." }),
      { status: 401, headers: corsHeaders }
    );
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Validação real do usuário autenticado pelo Supabase Auth
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);

  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ error: "Sessão inválida ou expirada. Faça login novamente para aceitar o convite." }),
      { status: 401, headers: corsHeaders }
    );
  }

  const authenticatedUser = userData.user;

  if (!authenticatedUser.email) {
    return new Response(
      JSON.stringify({ error: "A conta conectada não possui um endereço de e-mail válido." }),
      { status: 400, headers: corsHeaders }
    );
  }

  const normalizedUserEmail = authenticatedUser.email.toLowerCase().trim();

  // Executa a procedure RPC com search_path seguro e bloqueios FOR UPDATE
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
    "accept_invitation_proc",
    {
      p_token_hash: tokenHash,
      p_user_id: authenticatedUser.id,
      p_email: normalizedUserEmail,
    }
  );

  if (rpcError) {
    return new Response(
      JSON.stringify({ error: rpcError.message || "Falha na execução da procedure de aceitação." }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (!rpcResult || rpcResult.success !== true) {
    const errorMsg = rpcResult?.error || "Não foi possível aceitar o convite.";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 400, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      restaurant_id: rpcResult.restaurant_id,
      message: "Convite aceito com sucesso! Seu perfil foi atualizado para comerciante.",
    }),
    { status: 200, headers: corsHeaders }
  );
});
