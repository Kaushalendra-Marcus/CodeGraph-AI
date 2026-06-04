import { AIProvider } from "../providers/types";
import { WorkspaceInfo } from "../analyzer/WorkspaceScanner";
import { RepoSummary } from "./RepoSummaryAgent";
import { FileSummary } from "./FileSummaryAgent";
import { FlowContext } from "../analyzer/FlowAnalyzer";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FlowSubDiagram {
  id: string;
  title: string;
  description: string;
  mermaidCode: string;
  category: FlowCategory;
  relatedFiles: string[];
}

export type FlowCategory =
  | "auth"
  | "api"
  | "data"
  | "component"
  | "service"
  | "background"
  | "custom";

interface ArchitectureProfile {
  kind: "frontend" | "backend" | "event-driven" | "data-heavy" | "cli" | "library" | "mixed";
  hasRoutes: boolean;
  hasDb: boolean;
  hasEvents: boolean;
  hasMiddleware: boolean;
  hasComponents: boolean;
  hasJobs: boolean;
  hasCli: boolean;
}

export interface FullFlowMap {
  subDiagrams: FlowSubDiagram[];
  overviewMermaid: string;
}

// ── Auto-detect flows ──────────────────────────────────────────────────────

export async function autoDetectFlows(
  provider: AIProvider,
  info: WorkspaceInfo,
  summary: RepoSummary,
  fileSummaries: FileSummary[],
  flowCtx: FlowContext
): Promise<FullFlowMap> {
  const ctx = flowCtx.summary;
  const profile = inferArchitectureProfile(summary, fileSummaries, flowCtx);
  const adaptive = buildAdaptiveFlowMap(info.name, summary, fileSummaries, flowCtx);

  // Feed the AI the actual extracted facts — not file names alone.
  // The output must mirror the repo's own architecture, not a fixed set of flow templates.
  const prompt = `You are a senior software architect. Analyze the REAL extracted data below from the codebase "${info.name}" and generate accurate Mermaid flow diagrams.

=== PROJECT ===
Overview: ${summary.overview}
Architecture: ${summary.architecture}
Tech stack: ${summary.techStack.join(", ")}

=== INFERRED ARCHITECTURE SIGNALS ===
Kind: ${profile.kind}
Routes: ${profile.hasRoutes ? "yes" : "no"}
Database: ${profile.hasDb ? "yes" : "no"}
Events: ${profile.hasEvents ? "yes" : "no"}
Middleware: ${profile.hasMiddleware ? "yes" : "no"}
Components/UI: ${profile.hasComponents ? "yes" : "no"}
Background jobs: ${profile.hasJobs ? "yes" : "no"}
CLI/library shape: ${profile.hasCli ? "yes" : "no"}

=== ACTUAL HTTP ROUTES (${ctx.routeCount} total, showing up to 30) ===
${ctx.routes.length ? ctx.routes.join("\n") : "No routes detected"}

=== ACTUAL CALL CHAINS (import → export relationships) ===
${ctx.callChainLines.length ? ctx.callChainLines.join("\n") : "No chains detected"}

=== ACTUAL DATABASE ACCESS ===
${ctx.dbLines.length ? ctx.dbLines.join("\n") : "No DB access detected"}

=== ACTUAL EVENT FLOWS ===
${ctx.eventLines.length ? ctx.eventLines.join("\n") : "No events detected"}

=== ACTUAL MIDDLEWARE STACK ===
${ctx.middlewareLines.length ? ctx.middlewareLines.join("\n") : "None detected"}

=== ACTUAL EXPORTED FUNCTIONS PER FILE ===
${ctx.exportedFunctions.length ? ctx.exportedFunctions.join("\n") : "None detected"}

=== KEY FILE PURPOSES ===
${fileSummaries.slice(0, 20).map((f) => `${f.path}: ${f.purpose}`).join("\n")}

---

YOUR TASK:
Based on the REAL data above, identify 3–6 distinct flows. Each flow must use REAL file names, REAL function names, REAL route paths, and REAL class names from the data above — not invented ones.

For each flow, write a Mermaid flowchart that shows what actually happens step by step.

Pick flows that match the repo's actual architecture. If the repo is a frontend app, show component/page/store flows. If it is an API backend, show request→handler→service→data flows. If it is event-driven, show emit→listener flows. If it is a library or CLI, show module/command flows.

MERMAID RULES (strict):
- Start with: flowchart TD
- Node IDs: only [A-Za-z0-9_] — no spaces, no dots, no slashes
- Node labels: use quotes for anything with spaces or special chars: A["POST /api/login"]
- Arrows: --> or -- label -->
- Decision nodes: {Is valid?}
- Max 10 nodes per diagram
- NO subgraph
- NO classDef
- Use real names: UserController not "Controller", saveProvider not "save"

VALID example:
flowchart TD
  A["Entry file"] --> B["Real processing step"]
  B --> C["Output or next layer"]

Respond ONLY with valid JSON (no markdown fences, no trailing commas):
{
  "subDiagrams": [
    {
      "id": "snake_case_id",
      "title": "Short descriptive title",
      "description": "One sentence using real names from the code",
      "category": "auth|api|data|component|service|background",
      "relatedFiles": ["actual/file/paths/from/data/above.ts"],
      "mermaidCode": "flowchart TD\\n  A[...] --> B[...]\\n  ..."
    }
  ],
  "overviewMermaid": "flowchart TD\\n  flow1[Auth Flow] --> flow2[API Routes]\\n  flow2 --> flow3[DB Layer]"
}`;

  const response = await provider.chat([{ role: "user", content: prompt }]);

  try {
    const parsed = parseJsonResponse<FullFlowMap>(response);
    parsed.subDiagrams = parsed.subDiagrams.map((d) => ({
      ...d,
      mermaidCode: normalizeMermaid(d.mermaidCode),
    }));
    parsed.overviewMermaid = normalizeMermaid(parsed.overviewMermaid);
    // Validate each diagram has real content
    parsed.subDiagrams = parsed.subDiagrams.filter(
      (d) => d.mermaidCode.includes("-->") && d.title?.trim()
    );
    if (parsed.subDiagrams.length === 0) throw new Error("no valid diagrams");
    if (!matchesArchitectureProfile(parsed, profile)) return adaptive;
    return parsed;
  } catch {
    return adaptive;
  }
}

// ── Custom diagram from user question ─────────────────────────────────────

export async function generateCustomFlow(
  provider: AIProvider,
  question: string,
  info: WorkspaceInfo,
  summary: RepoSummary,
  fileSummaries: FileSummary[],
  flowCtx: FlowContext
): Promise<FlowSubDiagram> {
  const ctx = flowCtx.summary;
  const q = question.toLowerCase();

  // Find files most relevant to the question using keyword matching
  const keywords = q.split(/\s+/).filter((w) => w.length > 3);
  const relevantFiles = fileSummaries
    .filter((f) => keywords.some(
      (w) => f.path.toLowerCase().includes(w) ||
             f.purpose.toLowerCase().includes(w) ||
             f.keyFunctions?.some((fn) => fn.toLowerCase().includes(w))
    ))
    .slice(0, 10);

  // Filter call chains relevant to these files
  const relevantChains = flowCtx.callChains
    .filter((c) => relevantFiles.some((f) => c.from === f.path || c.to === f.path))
    .slice(0, 15)
    .map((c) => `  ${c.from.split("/").slice(-2).join("/")} → ${c.to.split("/").slice(-2).join("/")} (${c.method})`);

  // Filter routes relevant to question
  const relevantRoutes = ctx.routes.filter((r) =>
    keywords.some((w) => r.toLowerCase().includes(w))
  ).slice(0, 8);

  // Filter DB access relevant to question
  const relevantDb = ctx.dbLines.filter((d) =>
    keywords.some((w) => d.toLowerCase().includes(w))
  ).slice(0, 5);

  const prompt = `You are analyzing the codebase "${info.name}".

User wants to understand: "${question}"

=== RELEVANT ROUTES ===
${relevantRoutes.length ? relevantRoutes.join("\n") : "None matched"}

=== RELEVANT CALL CHAINS ===
${relevantChains.length ? relevantChains.join("\n") : "None matched"}

=== RELEVANT DATABASE ACCESS ===
${relevantDb.length ? relevantDb.join("\n") : "None matched"}

=== RELEVANT FILES & THEIR PURPOSE ===
${relevantFiles.map((f) => `${f.path}:\n  Purpose: ${f.purpose}\n  Exports: ${f.exports}\n  Key functions: ${f.keyFunctions?.join(", ") || "none"}`).join("\n")}

=== ALL EXPORTED FUNCTIONS ===
${ctx.exportedFunctions.slice(0, 15).join("\n")}

---

Generate a Mermaid flowchart that DIRECTLY answers the user's question using REAL names from the data above.

RULES:
- flowchart TD direction
- Node IDs: alphanumeric + underscores only
- Node labels in quotes if they contain spaces/special chars
- Use real function names, real route paths, real class names from data above
- Max 12 nodes
- Show actual data flow: input → processing → output
- Include error/edge cases if routes show them

Respond ONLY with valid JSON:
{
  "id": "custom_<snake_case>",
  "title": "Title using real names",
  "description": "One accurate sentence based on real code",
  "category": "custom",
  "relatedFiles": ["real/file/paths/from/above.ts"],
  "mermaidCode": "flowchart TD\\n  A[...] --> B[...]\\n  ..."
}`;

  const response = await provider.chat([{ role: "user", content: prompt }]);

  try {
    const parsed = parseJsonResponse<FlowSubDiagram>(response);
    parsed.mermaidCode = normalizeMermaid(parsed.mermaidCode);
    if (!parsed.mermaidCode.includes("-->")) throw new Error("no edges");
    return parsed;
  } catch {
    // Build a minimal but honest fallback from the extracted data
    return buildCustomFallback(question, relevantFiles, relevantRoutes, relevantChains);
  }
}

// ── Mermaid normalizer ────────────────────────────────────────────────────

export function normalizeMermaid(raw: string): string {
  if (!raw) return "flowchart TD\n  A[No data] --> B[Run analysis first]";

  // Unescape JSON-encoded newlines
  let code = raw.replace(/\\n/g, "\n").replace(/\\t/g, "  ").trim();

  // Strip any %%{init...}%% directives — we apply theme from JS side
  code = code.replace(/^%%\{[\s\S]*?\}%%\s*/m, "").trim();

  // Ensure it starts with flowchart directive
  if (!code.match(/^flowchart\s+(TD|LR|BT|RL)/i) && !code.match(/^graph\s+(TD|LR|BT|RL)/i)) {
    code = "flowchart TD\n" + code;
  }

  // Fix common AI mistakes:
  // 1. Node IDs with dots or slashes (e.g. src/auth/auth.service) → replace with underscore
  code = code.replace(/([A-Za-z_]\w*)[./](\w)/g, "$1_$2");

  // 2. Unquoted labels with special chars — wrap in quotes
  // Match: ID[label with spaces] or ID(label) — ensure label is quoted if not already
  code = code.replace(/(\w+)\[([^\]"]+)\]/g, (_, id, label) => {
    // Already safe if no special chars
    if (!/[/:()\-@]/.test(label)) return `${id}[${label}]`;
    return `${id}["${label.replace(/"/g, "'")}"]`;
  });

  // 3. Remove duplicate blank lines
  code = code.replace(/\n{3,}/g, "\n\n");

  return code;
}

// ── JSON parser ───────────────────────────────────────────────────────────

function parseJsonResponse<T>(response: string): T {
  // Strip markdown code fences
  let clean = response
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/im, "")
    .trim();

  // Find first { to last } to extract the JSON object
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start >= 0 && end > start) clean = clean.slice(start, end + 1);

  // Remove trailing commas before } or ]
  clean = clean.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(clean) as T;
}

// ── Fallbacks ─────────────────────────────────────────────────────────────

function inferArchitectureProfile(
  summary: RepoSummary,
  fileSummaries: FileSummary[],
  flowCtx: FlowContext
): ArchitectureProfile {
  const corpus = [
    summary.overview,
    summary.architecture,
    summary.purpose,
    summary.techStack.join(" "),
    summary.keyModules.map((m) => `${m.name} ${m.description}`).join(" "),
    fileSummaries.map((f) => `${f.path} ${f.purpose} ${f.exports} ${f.keyFunctions?.join(" ") || ""}`).join(" "),
    flowCtx.summary.routes.join(" "),
    flowCtx.summary.callChainLines.join(" "),
    flowCtx.summary.dbLines.join(" "),
    flowCtx.summary.eventLines.join(" "),
    flowCtx.summary.middlewareLines.join(" "),
  ].join(" ").toLowerCase();

  const hasRoutes = /\b(route|routes|controller|endpoint|api)\b/.test(corpus);
  const hasDb = /\b(db|database|sql|prisma|mongoose|sequelize|typeorm|knex|orm|repository|model)\b/.test(corpus);
  const hasEvents = /\b(event|events|emit|listener|subscribe|pubsub|queue|topic)\b/.test(corpus) || flowCtx.eventFlows.length > 0;
  const hasMiddleware = /\b(middleware|guard|interceptor|pipe|auth)\b/.test(corpus);
  const hasComponents = /\b(component|page|layout|hook|widget|view|store|state|ui)\b/.test(corpus);
  const hasJobs = /\b(worker|background|job|cron|scheduler|queue|task)\b/.test(corpus);
  const hasCli = /\b(cli|command|argv|commander|yargs|bin\b|script)\b/.test(corpus);

  let kind: ArchitectureProfile["kind"] = "mixed";
  if (hasComponents && !hasRoutes) kind = "frontend";
  else if (hasJobs && !hasRoutes) kind = "background" as ArchitectureProfile["kind"];
  else if (hasEvents && !hasRoutes && !hasComponents) kind = "event-driven";
  else if (hasCli) kind = "cli";
  else if (hasRoutes || hasMiddleware) kind = "backend";
  else if (hasDb && !hasRoutes) kind = "data-heavy";

  return { kind, hasRoutes, hasDb, hasEvents, hasMiddleware, hasComponents, hasJobs, hasCli };
}

function matchesArchitectureProfile(parsed: FullFlowMap, profile: ArchitectureProfile): boolean {
  const text = [
    parsed.overviewMermaid,
    ...parsed.subDiagrams.map((d) => `${d.title} ${d.description} ${d.category} ${d.mermaidCode}`),
  ].join(" ").toLowerCase();

  const hasComponentTerms = /\b(component|page|hook|layout|widget|view|store|ui)\b/.test(text);
  const hasBackendTerms = /\b(route|request|handler|service|middleware|controller|api|database|db|model)\b/.test(text);
  const hasEventTerms = /\b(event|listener|emit|queue|worker|subscribe|pubsub)\b/.test(text);
  const hasCliTerms = /\b(cli|command|argv|script|bin)\b/.test(text);
  const hasDataTerms = /\b(db|database|orm|prisma|mongoose|sql|repository|model)\b/.test(text);

  switch (profile.kind) {
    case "frontend": return hasComponentTerms;
    case "backend": return hasBackendTerms || hasDataTerms;
    case "event-driven": return hasEventTerms;
    case "data-heavy": return hasDataTerms;
    case "cli": return hasCliTerms;
    case "library": return true;
    default: return true;
  }
}

function buildAdaptiveFlowMap(
  repoName: string,
  summary: RepoSummary,
  fileSummaries: FileSummary[],
  flowCtx: FlowContext
): FullFlowMap {
  const diagrams: FlowSubDiagram[] = [];
  const profile = inferArchitectureProfile(summary, fileSummaries, flowCtx);

  const add = (diagram?: FlowSubDiagram) => {
    if (diagram && diagrams.length < 6) diagrams.push(diagram);
  };

  const componentLikeFiles = fileSummaries.filter((f) => /\b(component|page|layout|hook|widget|view|store|ui)\b/i.test(`${f.path} ${f.purpose} ${f.exports} ${f.keyFunctions?.join(" ") || ""}`));
  const jobLikeFiles = fileSummaries.filter((f) => /\b(worker|job|cron|scheduler|queue|task|background)\b/i.test(`${f.path} ${f.purpose} ${f.exports} ${f.keyFunctions?.join(" ") || ""}`));

  if (profile.kind === "frontend") {
    add(buildComponentFlowDiagram(repoName, componentLikeFiles, flowCtx));
    add(buildDependencyFlowDiagram(repoName, summary, flowCtx));
    if (profile.hasDb) add(buildDataFlowDiagram(repoName, flowCtx));
    if (profile.hasEvents) add(buildEventFlowDiagram(repoName, flowCtx));
    if (summary.keyModules.length > 0) add(buildModuleFlowDiagram(repoName, summary));
  } else if (profile.kind === "backend") {
    add(buildRequestFlowDiagram(repoName, summary, flowCtx));
    if (profile.hasMiddleware) add(buildMiddlewareFlowDiagram(repoName, flowCtx));
    add(buildDependencyFlowDiagram(repoName, summary, flowCtx));
    if (profile.hasDb) add(buildDataFlowDiagram(repoName, flowCtx));
    if (profile.hasEvents) add(buildEventFlowDiagram(repoName, flowCtx));
    if (summary.keyModules.length > 0) add(buildModuleFlowDiagram(repoName, summary));
  } else if (profile.kind === "event-driven") {
    add(buildEventFlowDiagram(repoName, flowCtx));
    add(buildDependencyFlowDiagram(repoName, summary, flowCtx));
    if (profile.hasDb) add(buildDataFlowDiagram(repoName, flowCtx));
    if (profile.hasRoutes) add(buildRequestFlowDiagram(repoName, summary, flowCtx));
    if (summary.keyModules.length > 0) add(buildModuleFlowDiagram(repoName, summary));
  } else if (profile.kind === "data-heavy") {
    add(buildDataFlowDiagram(repoName, flowCtx));
    add(buildDependencyFlowDiagram(repoName, summary, flowCtx));
    if (profile.hasEvents) add(buildEventFlowDiagram(repoName, flowCtx));
    if (summary.keyModules.length > 0) add(buildModuleFlowDiagram(repoName, summary));
  } else if (profile.kind === "cli") {
    add(buildModuleFlowDiagram(repoName, summary));
    add(buildDependencyFlowDiagram(repoName, summary, flowCtx));
    if (profile.hasDb) add(buildDataFlowDiagram(repoName, flowCtx));
  } else {
    add(buildModuleFlowDiagram(repoName, summary));
    if (profile.hasRoutes) add(buildRequestFlowDiagram(repoName, summary, flowCtx));
    if (profile.hasComponents) add(buildComponentFlowDiagram(repoName, componentLikeFiles, flowCtx));
    if (profile.hasEvents) add(buildEventFlowDiagram(repoName, flowCtx));
    if (profile.hasDb) add(buildDataFlowDiagram(repoName, flowCtx));
    if (jobLikeFiles.length > 0) add(buildBackgroundFlowDiagram(repoName, jobLikeFiles, flowCtx));
  }

  if (diagrams.length === 0 && summary.keyModules.length > 0) {
    add(buildModuleFlowDiagram(repoName, summary));
  }

  const overviewNodes = diagrams.map((d, i) => `  OV${i}["${d.title}"]`).join("\n");
  const overviewEdges = diagrams.slice(0, -1).map((_, i) => `  OV${i} --> OV${i + 1}`).join("\n");

  return {
    subDiagrams: diagrams,
    overviewMermaid: normalizeMermaid(`flowchart TD\n${overviewNodes}\n${overviewEdges}`),
  };
}

function buildRequestFlowDiagram(
  repoName: string,
  summary: RepoSummary,
  flowCtx: FlowContext
): FlowSubDiagram | undefined {
  if (!flowCtx.routes.length) return undefined;

  const routes = flowCtx.routes.slice(0, 4);
  const dbByFile = new Map(flowCtx.dbAccess.map((db) => [db.file, db]));
  const lines: string[] = ["flowchart TD"];
  const relatedFiles = new Set<string>();

  routes.forEach((route, index) => {
    const routeId = `R${index}`;
    const handlerId = `H${index}`;
    const fileId = `F${index}`;
    const routeLabel = `${route.httpMethod} ${route.path}`;
    const handlerLabel = route.controller ? `${route.controller}.${route.handler}()` : `${route.handler}()`;
    const fileLabel = shortFile(route.file);
    lines.push(`  ${routeId}["${routeLabel}"] --> ${handlerId}["${handlerLabel}"]`);
    lines.push(`  ${handlerId} --> ${fileId}["${fileLabel}"]`);
    relatedFiles.add(route.file);

    const db = dbByFile.get(route.file);
    if (db) {
      const dbId = `D${index}`;
      lines.push(`  ${fileId} --> ${dbId}["${db.orm}: ${db.operations.slice(0, 3).join(", ")}"]`);
    }
  });

  return {
    id: "request_flow",
    title: `${repoName} Request Flow`,
    description: summary.keyModules[0]
      ? `Shows how ${summary.keyModules[0].name} handles real HTTP entry points.`
      : `Shows how the codebase handles real HTTP entry points.`,
    category: "api",
    relatedFiles: [...relatedFiles],
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}

function buildDependencyFlowDiagram(
  repoName: string,
  summary: RepoSummary,
  flowCtx: FlowContext
): FlowSubDiagram | undefined {
  if (!flowCtx.callChains.length) return undefined;

  const chains = flowCtx.callChains.slice(0, 6);
  const lines: string[] = ["flowchart TD"];
  const nodeIds = new Map<string, string>();
  const relatedFiles = new Set<string>();

  const nodeIdFor = (file: string) => {
    const existing = nodeIds.get(file);
    if (existing) return existing;
    const id = `N${nodeIds.size}`;
    nodeIds.set(file, id);
    lines.push(`  ${id}["${shortFile(file)}"]`);
    return id;
  };

  chains.forEach((chain) => {
    const fromId = nodeIdFor(chain.from);
    const toId = nodeIdFor(chain.to);
    lines.push(`  ${fromId} -->|${chain.method}| ${toId}`);
    relatedFiles.add(chain.from);
    relatedFiles.add(chain.to);
  });

  return {
    id: "dependency_flow",
    title: `${repoName} Dependency Flow`,
    description: summary.architecture?.trim()
      ? summary.architecture.slice(0, 140)
      : "Shows the actual file-to-file call chain relationships.",
    category: "service",
    relatedFiles: [...relatedFiles].slice(0, 8),
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}

function buildDataFlowDiagram(repoName: string, flowCtx: FlowContext): FlowSubDiagram | undefined {
  if (!flowCtx.dbAccess.length) return undefined;

  const lines: string[] = ["flowchart TD"];
  const relatedFiles = new Set<string>();

  flowCtx.dbAccess.slice(0, 4).forEach((entry, index) => {
    const fileId = `F${index}`;
    const opId = `O${index}`;
    lines.push(`  ${fileId}["${shortFile(entry.file)}"] --> ${opId}["${entry.orm}: ${entry.operations.slice(0, 3).join(", ")}"]`);
    relatedFiles.add(entry.file);
  });

  return {
    id: "data_flow",
    title: `${repoName} Data Flow`,
    description: `Shows which files read and mutate persistent data in the repository.`,
    category: "data",
    relatedFiles: [...relatedFiles],
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}

function buildEventFlowDiagram(repoName: string, flowCtx: FlowContext): FlowSubDiagram | undefined {
  if (!flowCtx.eventFlows.length) return undefined;

  const lines: string[] = ["flowchart TD"];
  const relatedFiles = new Set<string>();

  flowCtx.eventFlows.slice(0, 4).forEach((eventFlow, index) => {
    const emitId = `E${index}`;
    const evtId = `V${index}`;
    lines.push(`  ${emitId}["${shortFile(eventFlow.emitFile)}"] --> ${evtId}["${eventFlow.event}"]`);
    relatedFiles.add(eventFlow.emitFile);
    eventFlow.listenerFiles.slice(0, 3).forEach((listener, listenerIndex) => {
      const lisId = `L${index}_${listenerIndex}`;
      lines.push(`  ${evtId} --> ${lisId}["${shortFile(listener)}"]`);
      relatedFiles.add(listener);
    });
  });

  return {
    id: "event_flow",
    title: `${repoName} Event Flow`,
    description: "Shows event emitters and their listeners using the real files and event names.",
    category: "background",
    relatedFiles: [...relatedFiles],
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}

function buildMiddlewareFlowDiagram(repoName: string, flowCtx: FlowContext): FlowSubDiagram | undefined {
  if (!flowCtx.middlewareStack.length) return undefined;

  const lines: string[] = ["flowchart TD"];
  const relatedFiles = new Set<string>();

  flowCtx.middlewareStack.slice(0, 4).forEach((entry, index) => {
    const fileId = `M${index}`;
    const middlewareId = `W${index}`;
    lines.push(`  ${fileId}["${shortFile(entry.file)}"] --> ${middlewareId}["${entry.names.slice(0, 3).join(", ")}"]`);
    relatedFiles.add(entry.file);
  });

  return {
    id: "middleware_flow",
    title: `${repoName} Middleware Flow`,
    description: "Shows the middleware, guards, interceptors, or pipes detected in the codebase.",
    category: "background",
    relatedFiles: [...relatedFiles],
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}

function buildComponentFlowDiagram(
  repoName: string,
  componentLikeFiles: FileSummary[],
  flowCtx: FlowContext
): FlowSubDiagram | undefined {
  if (!componentLikeFiles.length) return undefined;

  const lines: string[] = ["flowchart TD"];
  const relatedFiles = new Set<string>();
  const selected = componentLikeFiles.slice(0, 5);
  const selectedPaths = new Set(selected.map((f) => f.path));
  const chains = flowCtx.callChains.filter((chain) => selectedPaths.has(chain.from) || selectedPaths.has(chain.to)).slice(0, 6);

  if (chains.length > 0) {
    const nodeIds = new Map<string, string>();
    const nodeIdFor = (file: string) => {
      const existing = nodeIds.get(file);
      if (existing) return existing;
      const id = `C${nodeIds.size}`;
      nodeIds.set(file, id);
      lines.push(`  ${id}["${shortFile(file)}"]`);
      return id;
    };

    chains.forEach((chain) => {
      const fromId = nodeIdFor(chain.from);
      const toId = nodeIdFor(chain.to);
      lines.push(`  ${fromId} -->|${chain.method}| ${toId}`);
      relatedFiles.add(chain.from);
      relatedFiles.add(chain.to);
    });
  } else {
    selected.forEach((file, index) => {
      const id = `C${index}`;
      lines.push(`  ${id}["${shortFile(file.path)}"]`);
      relatedFiles.add(file.path);
      if (index > 0) lines.push(`  C${index - 1} --> ${id}`);
    });
  }

  return {
    id: "component_flow",
    title: `${repoName} Component Flow`,
    description: "Shows how UI or stateful files interact based on the actual file summaries and call chains.",
    category: "component",
    relatedFiles: [...relatedFiles],
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}

function buildBackgroundFlowDiagram(
  repoName: string,
  jobLikeFiles: FileSummary[],
  flowCtx: FlowContext
): FlowSubDiagram | undefined {
  if (!jobLikeFiles.length) return undefined;

  const lines: string[] = ["flowchart TD"];
  const relatedFiles = new Set<string>();

  jobLikeFiles.slice(0, 4).forEach((file, index) => {
    const id = `B${index}`;
    lines.push(`  ${id}["${shortFile(file.path)}"]`);
    relatedFiles.add(file.path);
    const matchingEvents = flowCtx.eventFlows.filter((evt) => evt.emitFile === file.path || evt.listenerFiles.includes(file.path)).slice(0, 2);
    matchingEvents.forEach((evt, evtIndex) => {
      lines.push(`  ${id} --> E${index}_${evtIndex}["${evt.event}"]`);
    });
  });

  return {
    id: "background_flow",
    title: `${repoName} Background Flow`,
    description: "Shows worker, scheduler, job, or queue files that were detected in the repository.",
    category: "background",
    relatedFiles: [...relatedFiles],
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}

function buildModuleFlowDiagram(repoName: string, summary: RepoSummary): FlowSubDiagram | undefined {
  if (!summary.keyModules.length) return undefined;

  const lines: string[] = ["flowchart TD"];
  const relatedFiles = [...summary.entryPoints];
  summary.keyModules.slice(0, 5).forEach((module, index) => {
    const id = `M${index}`;
    lines.push(`  ${id}["${module.name}"]`);
    if (index > 0) lines.push(`  M${index - 1} --> ${id}`);
  });

  return {
    id: "module_flow",
    title: `${repoName} Modules`,
    description: summary.overview.slice(0, 120),
    category: "service",
    relatedFiles,
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}

function shortFile(filePath: string): string {
  const parts = filePath.split("/").filter(Boolean);
  return parts.slice(-2).join("/") || filePath;
}

function buildCustomFallback(
  question: string,
  relevantFiles: FileSummary[],
  relevantRoutes: string[],
  relevantChains: string[]
): FlowSubDiagram {
  const lines: string[] = ["flowchart TD"];

  if (relevantRoutes.length > 0) {
    // Parse out route info
    relevantRoutes.slice(0, 3).forEach((r, i) => {
      const parts = r.split("→");
      const route   = parts[0]?.trim().slice(0, 30) || `Step${i}`;
      const handler = parts[1]?.trim().slice(0, 30) || `Handler${i}`;
      lines.push(`  R${i}["${route}"] --> H${i}["${handler}"]`);
    });
  } else if (relevantFiles.length > 0) {
    relevantFiles.slice(0, 4).forEach((f, i) => {
      const name = f.path.split("/").pop()!.replace(/\.\w+$/, "");
      lines.push(`  F${i}["${name}"]`);
      if (i > 0) lines.push(`  F${i - 1} --> F${i}`);
    });
  } else {
    lines.push(`  A["${question.slice(0, 40)}"] --> B[No matching code found]`);
    lines.push(`  B --> C[Try a different question]`);
  }

  return {
    id: `custom_${Date.now()}`,
    title: question.slice(0, 50),
    description: `Flow for: ${question.slice(0, 80)}`,
    category: "custom",
    relatedFiles: relevantFiles.map((f) => f.path),
    mermaidCode: normalizeMermaid(lines.join("\n")),
  };
}
