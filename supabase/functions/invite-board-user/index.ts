import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const allowedRoles = new Set(["admin", "socio", "diretor", "gestor", "rh", "auditor", "colaborador"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceRoleKey) throw new Error("Configuração do Supabase indisponível.");
    const authorization = request.headers.get("Authorization");
    if (!authorization) return respond({ error: "Sessão obrigatória." }, 401);

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return respond({ error: "Sessão inválida ou expirada." }, 401);

    const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const { data: caller } = await adminClient.from("board_profiles").select("role, active").eq("user_id", user.id).single();
    if (!caller?.active || !["admin", "socio", "rh"].includes(caller.role)) return respond({ error: "Você não possui permissão para convidar usuários." }, 403);

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "colaborador");
    const directorate = String(body.directorate || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return respond({ error: "Informe um e-mail válido." }, 400);
    if (!allowedRoles.has(role)) return respond({ error: "Papel inválido." }, 400);

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: String(body.redirectTo || ""), data: { full_name: email.split("@")[0] },
    });
    if (inviteError) throw inviteError;
    const { error: profileError } = await adminClient.from("board_profiles")
      .update({ role, directorate: directorate || null, active: true, updated_at: new Date().toISOString() })
      .eq("user_id", invited.user.id);
    if (profileError) throw profileError;
    return respond({ userId: invited.user.id, email });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Não foi possível enviar o convite." }, 400);
  }
});

function respond(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
