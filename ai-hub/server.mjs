import http from "node:http";
import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";

const PORT = Number(process.env.AI_HUB_PORT ?? 8787);
const HOST = process.env.AI_HUB_HOST ?? "127.0.0.1";
const execAsync = promisify(exec);

loadLocalEnv(process.env.AI_HUB_ENV_FILE ?? ".env.local");

const tasks = new Map();
const executions = new Map();
const benchmarkRuns = new Map();
const agentProfiles = new Map();
const WORKSPACE_ROOT = process.cwd();
const WORKSPACE_NAME = process.env.AI_HUB_WORKSPACE ?? "acessa-board";
const ALLOW_APPLY = process.env.AI_HUB_ALLOW_APPLY === "true";
const TEAM_RULE = {
  planner: "anthropic",
  fastExecutor: "openai",
  reviewer: "gemini",
  applier: "ai-hub",
  supervisor: "codex",
};

const DEFAULT_BENCHMARK_TASKS = [
  {
    id: "reasoning",
    title: "Benchmark - raciocinio",
    type: "reasoning",
    prompt: "Analise em ate 8 linhas os riscos de permitir que varias IAs editem o mesmo repositorio ao mesmo tempo. Inclua uma recomendacao objetiva.",
    context: "Projeto local com GitHub, Codex como executor e AI Hub como orquestrador.",
  },
  {
    id: "implementation",
    title: "Benchmark - implementacao",
    type: "implementation",
    prompt: "Proponha um plano tecnico curto para adicionar historico persistente ao AI Hub. Inclua arquivos provaveis e criterios de aceite.",
    context: "AI Hub em Node puro, sem framework backend, rodando localmente.",
  },
  {
    id: "review",
    title: "Benchmark - revisao",
    type: "review",
    prompt: "Revise esta decisao: guardar chaves de API no repositorio para facilitar testes locais. Liste problemas e alternativa segura.",
    context: "As chaves sao de OpenAI, Anthropic e Gemini. O projeto usa .env.local.",
  },
];

const PRICING_PER_MILLION_TOKENS = {
  openai: { input: 0.4, output: 1.6 },
  anthropic: { input: 3, output: 15 },
  gemini: { input: 0.3, output: 2.5 },
};

const agentRegistry = {
  openai: {
    id: "openai",
    name: "OpenAI",
    enabled: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL ?? "gpt-5",
    run: runOpenAI,
  },
  anthropic: {
    id: "anthropic",
    name: "Claude",
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
    run: runAnthropic,
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    enabled: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
    run: runGemini,
  },
};

const server = http.createServer(async (req, res) => {
  try {
    configureCors(req, res);
    await routeRequest(req, res);
  } catch (error) {
    sendJson(res, 500, {
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AI Hub local rodando em http://${HOST}:${PORT}`);
});

async function routeRequest(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "ai-hub", workspace: WORKSPACE_NAME, applyEnabled: ALLOW_APPLY, agents: listAgents() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/agents") {
    sendJson(res, 200, { agents: listAgents() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/providers/gemini/models") {
    const models = await listGeminiModels();
    sendJson(res, models.error ? 502 : 200, models);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/benchmarks/profiles") {
    sendJson(res, 200, { profiles: listProfiles() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/benchmarks/run") {
    const body = await readJson(req);
    const benchmark = await runBenchmark(body);
    sendJson(res, 202, benchmark);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/delegate/recommend") {
    const body = await readJson(req);
    sendJson(res, 200, recommendAgent(body));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/executions/plan") {
    const body = await readJson(req);
    const execution = await createExecutionPlan(body);
    sendJson(res, execution.error ? 400 : 202, execution);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/executions/team-plan") {
    const body = await readJson(req);
    const execution = await createTeamExecutionPlan(body);
    sendJson(res, execution.error ? 400 : 202, execution);
    return;
  }

  const executionApplyMatch = url.pathname.match(/^\/api\/executions\/([^/]+)\/apply$/);
  if (req.method === "POST" && executionApplyMatch) {
    if (!ALLOW_APPLY) {
      sendJson(res, 403, { error: "apply_disabled", message: "A aplicação automática está desabilitada. O Codex deve revisar e aplicar as mudanças." });
      return;
    }
    const body = await readJson(req);
    const execution = await applyExecutionPlan(executionApplyMatch[1], body);
    sendJson(res, execution.error ? 400 : 202, execution);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/tasks") {
    const body = await readJson(req);
    const task = await createTask(body);
    sendJson(res, 202, task);
    return;
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (req.method === "GET" && taskMatch) {
    const task = tasks.get(taskMatch[1]);
    if (!task) {
      sendJson(res, 404, { error: "not_found", message: "Tarefa nao encontrada." });
      return;
    }

    sendJson(res, 200, task);
    return;
  }

  sendJson(res, 404, { error: "not_found", message: "Rota nao encontrada." });
}

async function createExecutionPlan(body) {
  const title = String(body.title ?? "Execucao sem titulo").trim();
  const prompt = String(body.prompt ?? "").trim();
  const context = String(body.context ?? "").trim();

  if (!prompt) {
    return { error: "invalid_request", message: "Informe o campo prompt." };
  }

  const agentId = String(body.agent ?? recommendAgent({ prompt }).recommended?.agent ?? "openai");
  const agent = agentRegistry[agentId];
  if (!agent) {
    return { error: "invalid_agent", message: "Agente invalido." };
  }

  const id = randomUUID();
  const execution = {
    id,
    title,
    prompt,
    context,
    agent: { id: agent.id, name: agent.name, enabled: agent.enabled, model: agent.model },
    status: "planning",
    createdAt: new Date().toISOString(),
    plan: null,
    rawOutput: null,
    applyLog: [],
  };

  executions.set(id, execution);

  const response = await runAgent(agent, {
    title,
    prompt: buildExecutionPlannerPrompt(prompt),
    context,
  });

  execution.response = response;
  execution.rawOutput = response.output ?? response.message ?? "";
  execution.plan = response.status === "completed" ? parseExecutionPlan(execution.rawOutput) : null;
  execution.status = execution.plan ? "planned" : "plan_failed";
  execution.completedAt = new Date().toISOString();

  return execution;
}

async function createTeamExecutionPlan(body) {
  const title = String(body.title ?? "Execucao em equipe").trim();
  const prompt = String(body.prompt ?? "").trim();
  const context = String(body.context ?? "").trim();

  if (!prompt) {
    return { error: "invalid_request", message: "Informe o campo prompt." };
  }

  const selectedAgent = chooseTeamPlanner(prompt);
  if (!selectedAgent) {
    return { error: "no_agent_available", message: "Nenhum agente executor esta habilitado." };
  }

  const reviewer = agentRegistry[TEAM_RULE.reviewer];
  const id = randomUUID();
  const execution = {
    id,
    title,
    prompt,
    context,
    agent: {
      id: selectedAgent.id,
      name: selectedAgent.name,
      enabled: selectedAgent.enabled,
      model: selectedAgent.model,
    },
    workflow: {
      rule: TEAM_RULE,
      selectedPlanner: selectedAgent.id,
      reason: selectedAgent.id === TEAM_RULE.fastExecutor
        ? "Tarefa simples: OpenAI escolhido como executor rapido/barato."
        : "Tarefa com contexto/risco: Claude escolhido como planejador principal.",
      reviewer: reviewer?.enabled ? TEAM_RULE.reviewer : null,
      applier: TEAM_RULE.applier,
      supervisor: TEAM_RULE.supervisor,
    },
    status: "planning",
    createdAt: new Date().toISOString(),
    plan: null,
    rawOutput: null,
    reviewerResponse: null,
    applyLog: [],
  };

  executions.set(id, execution);

  const response = await runAgent(selectedAgent, {
    title,
    prompt: buildExecutionPlannerPrompt(prompt),
    context,
  });

  execution.response = response;
  execution.rawOutput = response.output ?? response.message ?? "";
  execution.plan = response.status === "completed" ? parseExecutionPlan(execution.rawOutput) : null;

  if (execution.plan && reviewer?.enabled) {
    execution.reviewerResponse = await runAgent(reviewer, {
      title: `Revisao do plano: ${title}`,
      prompt: buildPlanReviewPrompt(prompt, execution.plan),
      context,
    });
  }

  execution.status = execution.plan ? "planned" : "plan_failed";
  execution.completedAt = new Date().toISOString();

  return execution;
}

async function applyExecutionPlan(id, body) {
  const execution = executions.get(id);
  if (!execution) {
    return { error: "not_found", message: "Execucao nao encontrada." };
  }
  if (!execution.plan) {
    return { error: "invalid_state", message: "A execucao nao possui plano aplicavel." };
  }
  if (body.confirm !== true) {
    return { error: "confirmation_required", message: "Envie confirm=true para aplicar o plano." };
  }

  execution.status = "applying";
  execution.applyLog = [];

  for (const file of execution.plan.files ?? []) {
    const result = applyFileAction(file);
    execution.applyLog.push(result);
    if (result.status === "failed") {
      execution.status = "apply_failed";
      return execution;
    }
  }

  for (const command of execution.plan.commands ?? []) {
    const result = await runAllowedCommand(command);
    execution.applyLog.push(result);
    if (result.status === "failed") {
      execution.status = "apply_failed";
      return execution;
    }
  }

  execution.status = "applied";
  execution.appliedAt = new Date().toISOString();
  return execution;
}

function chooseTeamPlanner(prompt) {
  const simple = isSimpleExecutionTask(prompt);
  const preferred = simple ? TEAM_RULE.fastExecutor : TEAM_RULE.planner;
  const fallback = simple ? TEAM_RULE.planner : TEAM_RULE.fastExecutor;

  if (agentRegistry[preferred]?.enabled) return agentRegistry[preferred];
  if (agentRegistry[fallback]?.enabled) return agentRegistry[fallback];
  return Object.values(agentRegistry).find((agent) => agent.enabled) ?? null;
}

function isSimpleExecutionTask(prompt) {
  const text = prompt.toLowerCase();
  const simpleSignals = ["texto", "label", "botao", "cor", "titulo", "placeholder", "copy", "pequeno", "simples"];
  const complexSignals = ["arquitet", "banco", "supabase", "permiss", "migracao", "segur", "refator", "fluxo", "integracao"];
  if (complexSignals.some((signal) => text.includes(signal))) return false;
  if (text.length < 280 && simpleSignals.some((signal) => text.includes(signal))) return true;
  return text.length < 180;
}

function buildPlanReviewPrompt(userPrompt, plan) {
  return [
    "Voce e o revisor/comparador Gemini dentro de uma equipe de IAs.",
    "Revise o plano abaixo antes do AI Hub aplicar no projeto.",
    "Responda de forma curta com: aprovado, riscos e ajustes recomendados.",
    "Nao gere patch novo. Nao reescreva arquivos completos.",
    "",
    "Pedido original:",
    userPrompt,
    "",
    "Plano JSON:",
    JSON.stringify(plan, null, 2),
  ].join("\n");
}

function buildExecutionPlannerPrompt(userPrompt) {
  return [
    "Transforme o pedido abaixo em um plano executavel para alterar este repositorio local.",
    "Responda SOMENTE JSON valido, sem markdown.",
    "Formato:",
    '{"summary":"...","files":[{"path":"caminho/relativo.ext","action":"create_or_update","content":"conteudo completo do arquivo"}],"commands":[{"cmd":"npm.cmd","args":["run","build"],"purpose":"validar build"}],"notes":["..."]}',
    "Regras:",
    "- Use apenas caminhos relativos dentro do projeto.",
    "- Nao inclua segredos, tokens ou chaves.",
    "- Nao use comandos destrutivos.",
    "- Se precisar editar arquivo existente e nao tiver o conteudo completo no contexto, coloque uma nota em vez de inventar.",
    "",
    "Pedido do usuario:",
    userPrompt,
  ].join("\n");
}

function parseExecutionPlan(output) {
  const text = String(output ?? "").trim();
  const jsonText = text.startsWith("{") ? text : text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) return null;

  try {
    const plan = JSON.parse(jsonText);
    return {
      summary: String(plan.summary ?? "Plano sem resumo."),
      files: Array.isArray(plan.files) ? plan.files.map(normalizeFileAction).filter(Boolean) : [],
      commands: Array.isArray(plan.commands) ? plan.commands.map(normalizeCommand).filter(Boolean) : [],
      notes: Array.isArray(plan.notes) ? plan.notes.map(String) : [],
    };
  } catch {
    return null;
  }
}

function normalizeFileAction(file) {
  const path = String(file.path ?? "").trim();
  const content = typeof file.content === "string" ? file.content : null;
  if (!path || content === null) return null;
  return { path, action: "create_or_update", content };
}

function normalizeCommand(command) {
  const cmd = String(command.cmd ?? "").trim();
  const args = Array.isArray(command.args) ? command.args.map(String) : [];
  if (!cmd) return null;
  return {
    cmd,
    args,
    purpose: String(command.purpose ?? "Executar comando permitido."),
  };
}

function applyFileAction(file) {
  const resolved = resolveSafeWorkspacePath(file.path);
  if (!resolved.ok) {
    return { type: "file", path: file.path, status: "failed", message: resolved.message };
  }

  mkdirSync(dirname(resolved.path), { recursive: true });
  writeFileSync(resolved.path, file.content, "utf8");
  return {
    type: "file",
    path: file.path,
    status: "completed",
    message: "Arquivo criado ou atualizado.",
  };
}

async function runAllowedCommand(command) {
  const allowed = [
    { cmd: "npm.cmd", args: ["run", "build"] },
    { cmd: "npm.cmd", args: ["run", "lint"] },
    { cmd: "npx.cmd", args: ["tsc", "--noEmit"] },
  ];
  const isAllowed = allowed.some((item) =>
    item.cmd === command.cmd &&
    item.args.length === command.args.length &&
    item.args.every((arg, index) => arg === command.args[index]),
  );

  if (!isAllowed) {
    return {
      type: "command",
      command,
      status: "skipped",
      message: "Comando nao permitido pelo executor seguro.",
    };
  }

  try {
    const result = await execAsync(formatAllowedCommand(command), {
      cwd: WORKSPACE_ROOT,
      timeout: 120000,
      windowsHide: true,
    });
    return {
      type: "command",
      command,
      status: "completed",
      stdout: result.stdout?.slice(-4000) ?? "",
      stderr: result.stderr?.slice(-4000) ?? "",
    };
  } catch (error) {
    return {
      type: "command",
      command,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
      stdout: error.stdout?.slice?.(-4000) ?? "",
      stderr: error.stderr?.slice?.(-4000) ?? "",
    };
  }
}

function formatAllowedCommand(command) {
  return [command.cmd, ...command.args].map(quoteCommandPart).join(" ");
}

function quoteCommandPart(part) {
  return /[\s"]/u.test(part) ? `"${part.replaceAll('"', '\\"')}"` : part;
}

function resolveSafeWorkspacePath(path) {
  if (isAbsolute(path)) {
    return { ok: false, message: "Caminho absoluto nao permitido." };
  }

  const resolved = resolve(WORKSPACE_ROOT, path);
  const rel = relative(WORKSPACE_ROOT, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return { ok: false, message: "Caminho fora do projeto nao permitido." };
  }

  return { ok: true, path: resolved };
}

async function createTask(body) {
  const title = String(body.title ?? "Tarefa sem titulo").trim();
  const prompt = String(body.prompt ?? "").trim();
  const context = String(body.context ?? "").trim();

  if (!prompt) {
    return {
      error: "invalid_request",
      message: "Informe o campo prompt.",
    };
  }

  const requestedAgents = Array.isArray(body.agents)
    ? body.agents.map(String)
    : Object.keys(agentRegistry);

  const selectedAgents = requestedAgents
    .map((id) => agentRegistry[id])
    .filter(Boolean);

  const id = randomUUID();
  const task = {
    id,
    title,
    prompt,
    context,
    status: "running",
    createdAt: new Date().toISOString(),
    agents: selectedAgents.map(({ id, name, enabled, model }) => ({ id, name, enabled, model })),
    responses: [],
  };

  tasks.set(id, task);

  task.responses = await Promise.all(
    selectedAgents.map(async (agent) => runAgent(agent, { title, prompt, context })),
  );
  task.status = "completed";
  task.completedAt = new Date().toISOString();

  return task;
}

async function runAgent(agent, input) {
  const startedAt = Date.now();
  const promptForEstimate = buildAgentPrompt(input);
  const estimatedInputTokens = estimateTokens(promptForEstimate);

  if (!agent.enabled) {
    return {
      agent: agent.id,
      status: "skipped",
      durationMs: Date.now() - startedAt,
      message: `Configure a chave de API para ${agent.name}.`,
    };
  }

  try {
    const output = await agent.run(input, agent.model);
    agent.lastStatus = "available";
    agent.lastError = null;
    const durationMs = Date.now() - startedAt;
    const estimatedOutputTokens = estimateTokens(output);
    return {
      agent: agent.id,
      model: agent.model,
      status: "completed",
      durationMs,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostUsd: estimateCost(agent.id, estimatedInputTokens, estimatedOutputTokens),
      output,
    };
  } catch (error) {
    agent.lastStatus = "error";
    agent.lastError = summarizeProviderError(error);
    return {
      agent: agent.id,
      model: agent.model,
      status: "failed",
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeProviderError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/incorrect api key|invalid.*api key|invalid_api_key/i.test(message)) return "Chave de API inválida";
  if (/quota|rate.?limit|resource_exhausted/i.test(message)) return "Cota ou limite excedido";
  if (/model.*not.*found|model.*no longer available|unsupported model/i.test(message)) return "Modelo indisponível";
  if (/fetch failed|network|connect/i.test(message)) return "Falha de rede";
  return "Falha ao consultar o provedor";
}

async function runBenchmark(body) {
  const requestedAgents = Array.isArray(body.agents)
    ? body.agents.map(String)
    : Object.keys(agentRegistry);
  const selectedAgents = requestedAgents.map((id) => agentRegistry[id]).filter(Boolean);
  const benchmarkTasks = Array.isArray(body.tasks) && body.tasks.length > 0
    ? body.tasks.map(normalizeBenchmarkTask)
    : DEFAULT_BENCHMARK_TASKS;

  const run = {
    id: randomUUID(),
    status: "running",
    createdAt: new Date().toISOString(),
    agents: selectedAgents.map(({ id, name, enabled, model }) => ({ id, name, enabled, model })),
    tasks: benchmarkTasks,
    results: [],
    profiles: [],
  };

  benchmarkRuns.set(run.id, run);

  for (const benchmarkTask of benchmarkTasks) {
    const responses = await Promise.all(
      selectedAgents.map(async (agent) => {
        const response = await runAgent(agent, benchmarkTask);
        return {
          ...response,
          taskId: benchmarkTask.id,
          taskType: benchmarkTask.type,
          qualityScore: scoreResponse(response, benchmarkTask),
        };
      }),
    );
    run.results.push(...responses);
  }

  run.status = "completed";
  run.completedAt = new Date().toISOString();
  run.profiles = updateProfilesFromBenchmark(run);
  return run;
}

function normalizeBenchmarkTask(task, index) {
  return {
    id: String(task.id ?? `custom-${index + 1}`),
    title: String(task.title ?? `Benchmark ${index + 1}`),
    type: String(task.type ?? "general"),
    prompt: String(task.prompt ?? "").trim(),
    context: String(task.context ?? "").trim(),
  };
}

function scoreResponse(response, benchmarkTask) {
  if (response.status !== "completed" || !response.output) return 0;

  const output = response.output.toLowerCase();
  const length = response.output.length;
  let score = 45;

  if (length >= 250) score += 15;
  if (length >= 600) score += 10;
  if (length > 3500) score -= 8;

  const signals = ["risco", "plano", "recomend", "criterio", "teste", "arquivo", "segur"];
  score += signals.filter((signal) => output.includes(signal)).length * 4;

  if (benchmarkTask.type === "review" && (output.includes("alternativa") || output.includes("nao"))) score += 8;
  if (benchmarkTask.type === "implementation" && output.includes("arquivo")) score += 6;
  if (benchmarkTask.type === "reasoning" && output.includes("porque")) score += 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function updateProfilesFromBenchmark(run) {
  const grouped = new Map();

  for (const result of run.results) {
    if (!grouped.has(result.agent)) grouped.set(result.agent, []);
    grouped.get(result.agent).push(result);
  }

  const profiles = [];
  for (const [agentId, results] of grouped.entries()) {
    const completed = results.filter((result) => result.status === "completed");
    const previous = agentProfiles.get(agentId);
    const profile = buildProfile(agentId, results, completed, previous);
    agentProfiles.set(agentId, profile);
    profiles.push(profile);
  }

  return profiles.sort((a, b) => b.overallScore - a.overallScore);
}

function buildProfile(agentId, results, completed, previous) {
  const successRate = results.length ? completed.length / results.length : 0;
  const avgQuality = average(completed.map((result) => result.qualityScore));
  const avgDurationMs = average(completed.map((result) => result.durationMs));
  const avgCostUsd = average(completed.map((result) => result.estimatedCostUsd ?? 0));
  const speedScore = avgDurationMs ? Math.max(0, Math.min(100, 100 - avgDurationMs / 250)) : 0;
  const costScore = avgCostUsd ? Math.max(0, Math.min(100, 100 - avgCostUsd * 100000)) : 80;
  const overallScore = Math.round(avgQuality * 0.5 + speedScore * 0.25 + costScore * 0.15 + successRate * 100 * 0.1);

  const byType = {};
  for (const result of completed) {
    const current = byType[result.taskType] ?? { count: 0, quality: 0, durationMs: 0, costUsd: 0 };
    current.count += 1;
    current.quality += result.qualityScore;
    current.durationMs += result.durationMs;
    current.costUsd += result.estimatedCostUsd ?? 0;
    byType[result.taskType] = current;
  }

  for (const value of Object.values(byType)) {
    value.quality = Math.round(value.quality / value.count);
    value.durationMs = Math.round(value.durationMs / value.count);
    value.costUsd = Number((value.costUsd / value.count).toFixed(6));
  }

  const strengths = Object.entries(byType)
    .sort(([, a], [, b]) => b.quality - a.quality)
    .slice(0, 2)
    .map(([type]) => type);

  return {
    agent: agentId,
    name: agentRegistry[agentId]?.name ?? agentId,
    model: agentRegistry[agentId]?.model,
    benchmarkRuns: (previous?.benchmarkRuns ?? 0) + 1,
    lastRunAt: new Date().toISOString(),
    successRate: Number(successRate.toFixed(2)),
    avgQuality: Math.round(avgQuality),
    avgDurationMs: Math.round(avgDurationMs),
    avgCostUsd: Number(avgCostUsd.toFixed(6)),
    overallScore,
    strengths,
    byType,
  };
}

function recommendAgent(body) {
  const prompt = String(body.prompt ?? "");
  const taskType = String(body.taskType ?? inferTaskType(prompt));
  const profiles = listProfiles();

  const ranking = profiles.map((profile) => {
    const typeScore = profile.byType?.[taskType]?.quality ?? profile.avgQuality ?? 50;
    const score = Math.round(profile.overallScore * 0.55 + typeScore * 0.35 + profile.successRate * 100 * 0.1);
    return {
      agent: profile.agent,
      name: profile.name,
      model: profile.model,
      score,
      reason: profile.strengths.includes(taskType)
        ? `Melhor historico para ${taskType}.`
        : `Perfil geral ${profile.overallScore}/100; qualidade media ${profile.avgQuality}/100.`,
    };
  }).sort((a, b) => b.score - a.score);

  if (ranking.length === 0) {
    const fallback = listAgents().filter((agent) => agent.enabled).map((agent) => ({
      agent: agent.id,
      name: agent.name,
      model: agent.model,
      score: 50,
      reason: "Sem benchmark ainda; agente ativo.",
    }));
    return {
      taskType,
      recommended: fallback[0] ?? null,
      ranking: fallback,
      message: "Rode o benchmark inicial para melhorar a recomendacao.",
    };
  }

  return {
    taskType,
    recommended: ranking[0],
    ranking,
  };
}

function inferTaskType(prompt) {
  const text = prompt.toLowerCase();
  if (text.includes("review") || text.includes("revis") || text.includes("risco") || text.includes("bug")) return "review";
  if (text.includes("crie") || text.includes("implemente") || text.includes("codigo") || text.includes("patch")) return "implementation";
  if (text.includes("analise") || text.includes("decis") || text.includes("arquitet")) return "reasoning";
  return "general";
}

function listProfiles() {
  return Array.from(agentProfiles.values()).sort((a, b) => b.overallScore - a.overallScore);
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text ?? "").length / 4));
}

function estimateCost(agentId, inputTokens, outputTokens) {
  const pricing = PRICING_PER_MILLION_TOKENS[agentId] ?? { input: 0, output: 0 };
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  return Number(cost.toFixed(6));
}

function average(values) {
  const nums = values.filter((value) => Number.isFinite(value));
  if (nums.length === 0) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

async function runOpenAI(input, model) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: buildAgentPrompt(input),
    }),
  });

  const json = await parseProviderResponse(response);
  return extractOpenAIText(json) ?? JSON.stringify(json);
}

async function runAnthropic(input, model) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1600,
      messages: [{ role: "user", content: buildAgentPrompt(input) }],
    }),
  });

  const json = await parseProviderResponse(response);
  return json.content?.map((part) => part.text).filter(Boolean).join("\n") ?? JSON.stringify(json);
}

async function runGemini(input, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildAgentPrompt(input) }] }],
      }),
    },
  );

  const json = await parseProviderResponse(response);
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ?? JSON.stringify(json);
}

async function listGeminiModels() {
  if (!process.env.GEMINI_API_KEY) {
    return {
      error: "missing_api_key",
      message: "Configure GEMINI_API_KEY antes de listar modelos.",
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
  );
  const json = await parseProviderResponse(response);
  const models = (json.models ?? [])
    .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
    .map((model) => ({
      name: model.name?.replace(/^models\//, ""),
      displayName: model.displayName,
      description: model.description,
      inputTokenLimit: model.inputTokenLimit,
      outputTokenLimit: model.outputTokenLimit,
    }));

  return { models };
}

function extractOpenAIText(json) {
  if (typeof json.output_text === "string" && json.output_text.trim()) {
    return json.output_text;
  }

  const textParts = [];
  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        textParts.push(content.text);
      }
    }
  }

  return textParts.length ? textParts.join("\n") : null;
}

function buildAgentPrompt({ title, prompt, context }) {
  return [
    `Tarefa: ${title}`,
    "",
    "Voce faz parte de uma equipe de IAs colaborando em um projeto de software.",
    "Responda com analise objetiva, riscos, plano de execucao e qualquer patch sugerido.",
    "Nao assuma acesso direto ao repositorio; trate o contexto recebido como sua fonte.",
    "",
    "Pedido:",
    prompt,
    "",
    "Contexto:",
    context || "Nenhum contexto adicional enviado.",
  ].join("\n");
}

async function parseProviderResponse(response) {
  const text = await response.text();
  let json;

  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(json.error?.message ?? json.message ?? text);
  }

  return json;
}

function listAgents() {
  return Object.values(agentRegistry).map(({ id, name, enabled, model, lastStatus, lastError }) => ({
    id,
    name,
    enabled,
    model,
    status: enabled ? (lastStatus ?? "configured") : "missing",
    error: lastError ?? null,
  }));
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(statusCode === 204 ? "" : JSON.stringify(payload, null, 2));
}

function configureCors(req, res) {
  const origin = String(req.headers.origin ?? "");
  if (!origin) return;

  try {
    const parsed = new URL(origin);
    const isLocal = parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname);
    const allowedPublishedOrigin = process.env.AI_HUB_ALLOWED_ORIGIN ?? "https://acessa-board.pages.dev";
    if (isLocal || origin === allowedPublishedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
  } catch {
    // Origem inválida: não envia cabeçalho CORS.
  }
}

function loadLocalEnv(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
