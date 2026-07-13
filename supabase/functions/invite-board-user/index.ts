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
    const password = String(body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return respond({ error: "Informe um e-mail válido." }, 400);
    if (!allowedRoles.has(role)) return respond({ error: "Papel inválido." }, 400);
    if (password && !["admin", "socio"].includes(caller.role)) {
      return respond({ error: "Somente administradores e sócios podem definir uma senha inicial." }, 403);
    }
    if (password) validatePassword(password);

    let createdUser;
    let mode: "password" | "invite";
    if (password) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: email.split("@")[0] },
      });
      if (error) throw error;
      createdUser = data.user;
      mode = "password";
    } else {
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: String(body.redirectTo || ""), data: { full_name: email.split("@")[0] },
      });
      if (error) throw error;
      createdUser = data.user;
      mode = "invite";
    }
    if (!createdUser) throw new Error("Não foi possível criar o usuário.");
    const { error: profileError } = await adminClient.from("board_profiles")
      .update({ role, directorate: directorate || null, active: true, updated_at: new Date().toISOString() })
      .eq("user_id", createdUser.id);
    if (profileError) throw profileError;
    return respond({ userId: createdUser.id, email, mode });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Não foi possível enviar o convite." }, 400);
  }
});

function validatePassword(password: string) {
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("A senha deve ter ao menos 10 caracteres, com letra maiúscula, minúscula, número e símbolo.");
  }
}

function respond(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
