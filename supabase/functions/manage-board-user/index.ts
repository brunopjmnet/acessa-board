import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);

  try {
    const url = requiredSecret("SUPABASE_URL");
    const anonKey = requiredSecret("SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredSecret("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");
    if (!authorization) return respond({ error: "Sessão obrigatória." }, 401);

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return respond({ error: "Sessão inválida ou expirada." }, 401);

    const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const { data: caller, error: callerError } = await adminClient.from("board_profiles")
      .select("display_name, role, active").eq("user_id", user.id).single();
    if (callerError || !caller?.active || !["admin", "socio"].includes(caller.role)) {
      return respond({ error: "Somente administradores e sócios podem excluir usuários." }, 403);
    }

    const body = await request.json();
    const action = String(body.action || "");
    const targetUserId = String(body.userId || "").trim();
    if (action !== "delete" || !/^[0-9a-f-]{36}$/i.test(targetUserId)) return respond({ error: "Operação inválida." }, 400);
    if (targetUserId === user.id) return respond({ error: "Você não pode excluir a própria conta." }, 409);

    const { data: target, error: targetError } = await adminClient.from("board_profiles")
      .select("display_name, role, active").eq("user_id", targetUserId).single();
    if (targetError || !target) return respond({ error: "Usuário não encontrado." }, 404);

    if (target.active && ["admin", "socio"].includes(target.role)) {
      const { count, error: countError } = await adminClient.from("board_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("active", true).in("role", ["admin", "socio"]).neq("user_id", targetUserId);
      if (countError) throw countError;
      if (!count) return respond({ error: "Não é permitido excluir o último administrador ou sócio ativo." }, 409);
    }

    await clearUserReferences(adminClient, targetUserId);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId, false);
    if (deleteError) throw deleteError;

    const { error: auditError } = await adminClient.from("board_audit_events").insert({
      workspace_id: await workspaceId(adminClient),
      actor_id: user.id,
      action: "board_user_deleted",
      metadata: { deleted_user_id: targetUserId, deleted_display_name: target.display_name, deleted_role: target.role },
    });
    if (auditError) console.error("board_user_delete_audit", auditError.message);

    return respond({ deleted: true, userId: targetUserId });
  } catch (error) {
    console.error("manage-board-user", error);
    return respond({ error: error instanceof Error ? error.message : "Não foi possível excluir o usuário." }, 400);
  }
});

async function clearUserReferences(adminClient: ReturnType<typeof createClient>, userId: string) {
  const operations = [
    adminClient.from("board_workspaces").update({ updated_by: null }).eq("updated_by", userId),
    adminClient.from("board_audit_events").update({ actor_id: null }).eq("actor_id", userId),
    adminClient.from("board_documents").update({ owner_id: null }).eq("owner_id", userId),
    adminClient.from("board_documents").update({ created_by: null }).eq("created_by", userId),
    adminClient.from("board_documents").update({ updated_by: null }).eq("updated_by", userId),
    adminClient.from("board_employee_compensation").update({ created_by: null }).eq("created_by", userId),
    adminClient.from("board_employee_compensation").update({ updated_by: null }).eq("updated_by", userId),
    adminClient.from("board_supplier_contracts").update({ created_by: null }).eq("created_by", userId),
    adminClient.from("board_supplier_contracts").update({ updated_by: null }).eq("updated_by", userId),
    adminClient.from("board_shared_expenses").update({ created_by: null }).eq("created_by", userId),
    adminClient.from("board_shared_expenses").update({ updated_by: null }).eq("updated_by", userId),
    adminClient.from("board_integration_connections").update({ created_by: null }).eq("created_by", userId),
    adminClient.from("board_integration_connections").update({ updated_by: null }).eq("updated_by", userId),
  ];
  const results = await Promise.all(operations);
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
}

async function workspaceId(adminClient: ReturnType<typeof createClient>) {
  const { data, error } = await adminClient.from("board_workspaces").select("id").eq("slug", "acessa").single();
  if (error || !data) throw error || new Error("Workspace Acessa não encontrado.");
  return data.id;
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Configuração ausente: ${name}.`);
  return value;
}

function respond(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
