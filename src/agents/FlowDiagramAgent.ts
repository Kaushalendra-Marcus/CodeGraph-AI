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

  // Feed the AI the actual extracted facts — not file names alone
  const prompt = `You are a senior software architect. Analyze the REAL extracted data below from the codebase "${info.name}" and generate accurate Mermaid flow diagrams.

=== PROJECT ===
Overview: ${summary.overview}
Architecture: ${summary.architecture}
Tech stack: ${summary.techStack.join(", ")}

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

MERMAID RULES (strict):
- Start with: flowchart TD
- Node IDs: only [A-Za-z0-9_] — no spaces, no dots, no slashes
- Node labels: use quotes for anything with spaces or special chars: A["POST /api/login"]
- Arrows: --> or -- label -->
- Decision nodes: {Is valid?}
- Max 10 nodes per diagram
- NO subgraph
- NO classDef
- Use real names: AuthService not "Service", findUnique not "DB query"

VALID example:
flowchart TD
  A["POST /api/login"] --> B["authController.login()"]
  B --> C["AuthService.validateUser()"]
  C --> D{Found in DB?}
  D -- Yes --> E["UserRepository.findUnique()"]
  D -- No --> F["throw UnauthorizedException"]
  E --> G["JwtService.sign()"]
  G --> H["Return access_token"]

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
    return parsed;
  } catch {
    return buildFallbackFlowMap(info.name, summary, flowCtx);
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

function buildFallbackFlowMap(
  repoName: string,
  summary: RepoSummary,
  flowCtx: FlowContext
): FullFlowMap {
  const diagrams: FlowSubDiagram[] = [];

  // If we have real routes, build an API flow from them
  if (flowCtx.routes.length > 0) {
    const routeNodes = flowCtx.routes.slice(0, 5).map((r, i) => {
      const id = `R${i}`;
      const label = `${r.httpMethod} ${r.path}`;
      return { id, label, handler: r.handler };
    });
    const nodes = routeNodes.map((r) => `  ${r.id}["${r.label}"]`).join("\n");
    const edges = routeNodes.map((r) => `  ${r.id} --> H${r.id}["${r.handler}"]`).join("\n");
    diagrams.push({
      id: "api_routes",
      title: "API Routes",
      description: `${flowCtx.routes.length} routes detected`,
      category: "api",
      relatedFiles: [...new Set(flowCtx.routes.slice(0, 5).map((r) => r.file))],
      mermaidCode: normalizeMermaid(`flowchart TD\n${nodes}\n${edges}`),
    });
  }

  // If we have DB access, build a data layer flow
  if (flowCtx.dbAccess.length > 0) {
    const dbLines = flowCtx.dbAccess.slice(0, 4).map((d, i) => {
      const file = d.file.split("/").pop()!.replace(/\.\w+$/, "");
      const ops  = d.operations.slice(0, 2).join(", ");
      return `  DB${i}["${file}"] --> ORM${i}["${d.orm}: ${ops}"]`;
    }).join("\n");
    diagrams.push({
      id: "data_layer",
      title: "Data Layer",
      description: `${flowCtx.dbAccess.length} files access the database`,
      category: "data",
      relatedFiles: flowCtx.dbAccess.slice(0, 4).map((d) => d.file),
      mermaidCode: normalizeMermaid(`flowchart TD\n${dbLines}`),
    });
  }

  // Generic module flow from key modules
  if (summary.keyModules.length > 0) {
    const moduleNodes = summary.keyModules.slice(0, 5).map((m, i) => `  M${i}["${m.name}"]`).join("\n");
    const moduleEdges = summary.keyModules.slice(0, 4).map((_, i) => `  M${i} --> M${i + 1}`).join("\n");
    diagrams.push({
      id: "module_overview",
      title: `${repoName} Modules`,
      description: summary.overview.slice(0, 100),
      category: "service",
      relatedFiles: summary.entryPoints,
      mermaidCode: normalizeMermaid(`flowchart TD\n${moduleNodes}\n${moduleEdges}`),
    });
  }

  const overviewNodes = diagrams.map((d, i) => `  OV${i}["${d.title}"]`).join("\n");
  const overviewEdges = diagrams.slice(0, -1).map((_, i) => `  OV${i} --> OV${i + 1}`).join("\n");

  return {
    subDiagrams: diagrams,
    overviewMermaid: normalizeMermaid(`flowchart LR\n${overviewNodes}\n${overviewEdges}`),
  };
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
