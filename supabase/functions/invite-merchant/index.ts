import { createClient } from "jsr:@supabase/supabase-js@2";

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Cabeçalho de autorização ausente ou malformado." }),
      { status: 401, headers: corsHeaders }
    );
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);

  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ error: "Sessão inválida ou expirada." }),
      { status: 401, headers: corsHeaders }
    );
  }

  // Confirmação de Admin
  const { data: profile, error: profError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profError || !profile || profile.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Acesso restrito a administradores confirmados." }),
      { status: 403, headers: corsHeaders }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo da requisição deve ser um JSON válido." }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { restaurant_id, email, mode } = body || {};
  const invitationMode = mode || (typeof email === "string" ? "email" : null);

  if (
    !restaurant_id ||
    typeof restaurant_id !== "string" ||
    (invitationMode !== "email" && invitationMode !== "manual") ||
    (invitationMode === "email" && (typeof email !== "string" || !email.trim())) ||
    (invitationMode === "manual" && email !== null)
  ) {
    return new Response(
      JSON.stringify({ error: "Informe restaurant_id e um e-mail válido ou selecione o modo manual." }),
      { status: 400, headers: corsHeaders }
    );
  }

  const normalizedEmail = invitationMode === "email" ? email.trim().toLowerCase() : null;

  // Validação do Restaurante
  const { data: rest, error: restErr } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, status, owner_profile_id")
    .eq("id", restaurant_id)
    .maybeSingle();

  if (restErr || !rest) {
    return new Response(
      JSON.stringify({ error: "Restaurante não encontrado." }),
      { status: 404, headers: corsHeaders }
    );
  }

  if (rest.status !== "ativo") {
    return new Response(
      JSON.stringify({ error: "Restaurante inativo não pode receber novos comerciantes." }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (rest.owner_profile_id) {
    return new Response(
      JSON.stringify({ error: "Este restaurante já possui um comerciante responsável." }),
      { status: 409, headers: corsHeaders }
    );
  }

  // Trata convites anteriores
  let existingInvitationQuery = supabaseAdmin
    .from("pending_invitations")
    .select("id, expires_at, status")
    .eq("restaurant_id", restaurant_id)
    .eq("status", "pending");

  existingInvitationQuery = normalizedEmail === null
    ? existingInvitationQuery.is("email", null)
    : existingInvitationQuery.eq("email", normalizedEmail);

  const { data: existingInv, error: existingInvError } = await existingInvitationQuery.maybeSingle();

  if (existingInvError) {
    return new Response(
      JSON.stringify({ error: "Erro ao consultar convites pendentes." }),
      { status: 500, headers: corsHeaders }
    );
  }

  if (existingInv) {
    if (new Date(existingInv.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({
          error: normalizedEmail === null
            ? "Já existe um convite manual pendente válido para este restaurante."
            : "Já existe um convite pendente válido para este restaurante e e-mail.",
        }),
        { status: 409, headers: corsHeaders }
      );
    }
    const { error: revokeError } = await supabaseAdmin
      .from("pending_invitations")
      .update({ status: "revoked" })
      .eq("id", existingInv.id);

    if (revokeError) {
      return new Response(
        JSON.stringify({ error: "Erro ao revogar o convite expirado." }),
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // Gera token seguro de 32 bytes
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const rawToken = Array.from(randomBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const tokenHash = await computeSha256(rawToken);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  const { error: insErr } = await supabaseAdmin.from("pending_invitations").insert({
    restaurant_id,
    email: normalizedEmail,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    status: "pending",
  });

  if (insErr) {
    if (insErr.code === "23505" && normalizedEmail === null) {
      return new Response(
        JSON.stringify({ error: "Já existe um convite manual pendente válido para este restaurante." }),
        { status: 409, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({ error: "Erro ao registrar convite no banco de dados." }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Disparo do convite no Supabase Auth
  let userStatus = "manual_code";
  if (normalizedEmail !== null) {
    userStatus = "invited_new_user";
    const { error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { invited_restaurant_id: restaurant_id },
    });

    if (authErr) {
      const msg = (authErr.message || "").toLowerCase();
      if (msg.includes("already") || (authErr as any).code === "email_exists") {
        userStatus = "existing_user";
      }
    }
  }

  const appUrl = Deno.env.get("APP_URL") || "https://zap-lanche.ai.studio";
  const inviteUrl = `${appUrl}/?convite=${rawToken}`;

  return new Response(
    JSON.stringify({
      success: true,
      message: "Convite registrado com sucesso.",
      user_status: userStatus,
      invite_url: inviteUrl,
      invitation_code: normalizedEmail === null ? rawToken : null,
      invitation_token: rawToken,
      expires_at: expiresAt.toISOString(),
    }),
    { status: 201, headers: corsHeaders }
  );
});
