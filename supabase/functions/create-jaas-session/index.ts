import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jwt from "npm:jsonwebtoken@9.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const moderatorRoles = new Set(["admin", "socio", "diretor", "gestor"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = requiredSecret("SUPABASE_URL");
    const anonKey = requiredSecret("SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredSecret("SUPABASE_SERVICE_ROLE_KEY");
    const appId = requiredSecret("JAAS_APP_ID");
    const configuredKeyId = requiredSecret("JAAS_API_KEY_ID");
    const privateKey = requiredSecret("JAAS_PRIVATE_KEY").replaceAll("\\n", "\n");
    const authorization = request.headers.get("Authorization");
    if (!authorization) return respond({ error: "Sessão obrigatória." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return respond({ error: "Sessão inválida ou expirada." }, 401);

    const body = await request.json();
    const meetingId = String(body.meetingId || "").trim();
    const workspaceSlug = String(body.workspaceSlug || "acessa").trim();
    if (!meetingId || meetingId.length > 160) return respond({ error: "Reunião inválida." }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const [{ data: profile, error: profileError }, { data: workspace, error: workspaceError }] = await Promise.all([
      adminClient.from("board_profiles").select("display_name, role, active").eq("user_id", user.id).single(),
      adminClient.from("board_workspaces").select("id, state").eq("slug", workspaceSlug).single(),
    ]);
    if (profileError || !profile?.active) return respond({ error: "Usuário sem acesso ativo ao Acessa Board." }, 403);
    if (workspaceError || !workspace) return respond({ error: "Ambiente de trabalho não encontrado." }, 404);

    const meetings = Array.isArray(workspace.state?.meetings) ? workspace.state.meetings : [];
    const meeting = meetings.find((item: Record<string, unknown>) => String(item.id) === meetingId && !item.archivedAt);
    if (!meeting) return respond({ error: "Reunião não encontrada ou arquivada." }, 404);
    if (String(meeting.status || "") === "Cancelada") return respond({ error: "Esta reunião foi cancelada." }, 409);

    const room = roomSlug(meetingId);
    const now = Math.floor(Date.now() / 1000);
    const durationMinutes = Math.max(15, Math.min(Number(meeting.duration || 60), 420));
    const expiresAt = now + Math.max(2 * 60 * 60, (durationMinutes + 60) * 60);
    const moderator = moderatorRoles.has(profile.role);
    const recording = moderator && Deno.env.get("JAAS_ENABLE_RECORDING") === "true";
    const transcription = moderator && Deno.env.get("JAAS_ENABLE_TRANSCRIPTION") === "true";
    const keyId = configuredKeyId.includes("/") ? configuredKeyId : `${appId}/${configuredKeyId}`;

    const token = jwt.sign({
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room,
      nbf: now - 10,
      exp: expiresAt,
      context: {
        user: {
          id: user.id,
          name: profile.display_name || user.user_metadata?.full_name || user.email || "Participante Acessa",
          email: user.email || "",
          avatar: user.user_metadata?.avatar_url || "",
          moderator: String(moderator),
          "hidden-from-recorder": false,
        },
        features: {
          livestreaming: false,
          recording,
          transcription,
          "outbound-call": false,
          "sip-outbound-call": false,
          "file-upload": false,
        },
        room: { regex: false },
      },
    }, privateKey, { algorithm: "RS256", keyid: keyId, header: { typ: "JWT" } });

    const { error: auditError } = await adminClient.from("board_audit_events").insert({
      workspace_id: workspace.id,
      actor_id: user.id,
      action: "jaas_session_created",
      metadata: { meeting_id: meetingId, room, moderator, expires_at: new Date(expiresAt * 1000).toISOString() },
    });
    if (auditError) console.error("jaas_session_audit", auditError.message);

    return respond({
      appId,
      room,
      roomName: `${appId}/${room}`,
      token,
      moderator,
      recording,
      transcription,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });
  } catch (error) {
    console.error("create-jaas-session", error);
    const message = error instanceof Error ? error.message : "Não foi possível preparar a sala JaaS.";
    return respond({ error: message }, /não configurado/i.test(message) ? 503 : 400);
  }
});

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`JaaS não configurado: variável ${name} ausente.`);
  return value;
}

function roomSlug(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const safe = normalized.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 110);
  return `acessa-${safe || "reuniao"}`;
}

function respond(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
