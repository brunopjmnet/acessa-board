import { createClient } from "@supabase/supabase-js";

export const isPasswordRecoveryRedirect = window.location.hash.includes("type=recovery")
  || new URLSearchParams(window.location.search).get("type") === "recovery";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const workspaceSlug = import.meta.env.VITE_ACESSA_BOARD_WORKSPACE || "acessa";

export const cloudConfigured = Boolean(url && key);
export const supabase = cloudConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export async function signIn(email, password) {
  if (!supabase) throw new Error("A conexão corporativa ainda não foi configurada.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email) {
  if (!supabase) throw new Error("A conexão corporativa ainda não foi configurada.");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
  if (error) throw error;
}

export async function updatePassword(password) {
  if (!supabase) throw new Error("A conexão corporativa ainda não foi configurada.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export function onAuthEvent(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function getCloudSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function loadCloudContext() {
  const session = await getCloudSession();
  if (!session) return { session: null, profile: null, workspace: null };
  const [{ data: profile, error: profileError }, { data: workspace, error: workspaceError }] = await Promise.all([
    supabase.from("board_profiles").select("user_id, display_name, role, directorate, active").eq("user_id", session.user.id).single(),
    supabase.from("board_workspaces").select("id, slug, name, state, version, updated_at, updated_by").eq("slug", workspaceSlug).single(),
  ]);
  if (profileError) throw profileError;
  if (workspaceError) throw workspaceError;
  return { session, profile, workspace };
}

export async function listBoardProfiles() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("board_profiles")
    .select("user_id, display_name, role, directorate, active, created_at, updated_at")
    .order("display_name");
  if (error) throw error;
  return data || [];
}

export async function updateBoardProfile(userId, changes) {
  if (!supabase) throw new Error("A conexão corporativa ainda não foi configurada.");
  const allowed = {};
  if (Object.hasOwn(changes, "role")) allowed.role = changes.role;
  if (Object.hasOwn(changes, "directorate")) allowed.directorate = changes.directorate || null;
  if (Object.hasOwn(changes, "active")) allowed.active = Boolean(changes.active);
  allowed.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("board_profiles")
    .update(allowed)
    .eq("user_id", userId)
    .select("user_id, display_name, role, directorate, active, created_at, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function saveCloudState(workspaceId, state, expectedVersion) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("board_workspaces")
    .update({ state, version: expectedVersion + 1, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .eq("version", expectedVersion)
    .select("version, updated_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("CONFLICT: os dados foram alterados por outro usuário. Recarregue antes de salvar novamente.");
  return data;
}

export function subscribeToWorkspace(workspaceId, onChange) {
  if (!supabase || !workspaceId) return () => {};
  const channel = supabase
    .channel(`board-workspace-${workspaceId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "board_workspaces", filter: `id=eq.${workspaceId}` }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
