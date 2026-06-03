import { AIProvider } from "../providers/types";
import { WorkspaceInfo } from "../analyzer/WorkspaceScanner";
import { RepoSummary } from "./RepoSummaryAgent";
import { FileSummary } from "./FileSummaryAgent";
import { FlowContext } from "../analyzer/FlowAnalyzer";

// ── Types ──────────────────────────────────────────────────────────────────

/** One sub-diagram tile shown in the overview grid */
export interface FlowSubDiagram {
  id: string;
  title: string;
  description: string;     // one-liner shown on the tile
  mermaidCode: string;     // full Mermaid flowchart for detail panel
  category: FlowCategory;
  relatedFiles: string[];  // file paths this diagram covers
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
  /** Mermaid code showing how the sub-diagrams connect to each other */
  overviewMermaid: string;
}

// ── Auto-detect agent ──────────────────────────────────────────────────────

/**
 * Runs once after analysis. Asks the AI to detect all meaningful flows
 * in the codebase and generate a Mermaid diagram for each.
 */
export async function autoDetectFlows(
  provider: AIProvider,
  info: WorkspaceInfo,
  summary: RepoSummary,
  fileSummaries: FileSummary[],
  flowContext: FlowContext
): Promise<FullFlowMap> {
  // Build a compact view of the codebase for the prompt
  const fileList = fileSummaries
    .slice(0, 40)
    .map((f) => `- ${f.path}: ${f.purpose}`)
    .join("\n");

  const callChains = flowContext.callChains
    .slice(0, 20)
    .map((c) => `  ${c.from} → ${c.to} (${c.method})`)
    .join("\n");

  const prompt = `You are a senior software architect analyzing the codebase "${info.name}".

Project overview: ${summary.overview}
Architecture: ${summary.architecture}
Tech stack: ${summary.techStack.join(", ")}

Key files and their purpose:
${fileList}

Detected call chains:
${callChains}

Your task:
1. Identify 3-6 meaningful data/control flows in this codebase (e.g. auth flow, API request lifecycle, order processing, email queue, DB operations, component render cycle).
2. For each flow, write a valid Mermaid flowchart (TD direction).
3. Also write a top-level Mermaid flowchart showing how these flows connect to each other.

Rules for Mermaid code:
- Use TD (top-down) direction
- Max 8 nodes per sub-diagram
- Node IDs must be alphanumeric with no spaces (use underscores)
- Use --> for arrows, -- label --> for labeled arrows
- Use |Yes| and |No| for decision branches  
- Wrap node labels in quotes if they contain special chars
- Do NOT use subgraph in sub-diagrams
- Keep node labels short (max 4 words)

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "subDiagrams": [
    {
      "id": "auth_flow",
      "title": "Authentication Flow",
      "description": "Login → JWT → guard protection",
      "category": "auth",
      "relatedFiles": ["src/auth/auth.service.ts"],
      "mermaidCode": "flowchart TD\\n  A[POST /login] --> B[AuthService]\\n  B --> C{Valid?}\\n  C -- Yes --> D[Sign JWT]\\n  C -- No --> E[401 Error]\\n  D --> F[Return token]"
    }
  ],
  "overviewMermaid": "flowchart TD\\n  auth[Auth Flow] --> api[API Routes]\\n  api --> data[DB Layer]"
}`;

  const response = await provider.chat([{ role: "user", content: prompt }]);

  try {
    const clean = response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as FullFlowMap;
    // Sanitize — ensure mermaid code is usable
    parsed.subDiagrams = parsed.subDiagrams.map((d) => ({
      ...d,
      mermaidCode: sanitizeMermaid(d.mermaidCode),
    }));
    parsed.overviewMermaid = sanitizeMermaid(parsed.overviewMermaid);
    return parsed;
  } catch {
    // Fallback: return a minimal placeholder
    return buildFallbackFlowMap(info.name, summary);
  }
}

// ── Custom diagram agent ───────────────────────────────────────────────────

/**
 * Generates a single flow diagram from a user question.
 * E.g. "show me the payment flow" or "how does the email queue work?"
 */
export async function generateCustomFlow(
  provider: AIProvider,
  question: string,
  info: WorkspaceInfo,
  summary: RepoSummary,
  fileSummaries: FileSummary[],
  flowContext: FlowContext
): Promise<FlowSubDiagram> {
  // Find files relevant to the question
  const q = question.toLowerCase();
  const relevant = fileSummaries
    .filter((f) => {
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      return words.some(
        (w) => f.path.toLowerCase().includes(w) || f.purpose.toLowerCase().includes(w)
      );
    })
    .slice(0, 8);

  const relevantChains = flowContext.callChains
    .filter((c) => relevant.some((f) => c.from.includes(f.path) || c.to.includes(f.path)))
    .slice(0, 12)
    .map((c) => `  ${c.from} → ${c.to} (${c.method})`)
    .join("\n");

  const prompt = `You are analyzing the codebase "${info.name}".

User question: "${question}"

Project: ${summary.overview}
Architecture: ${summary.architecture}

Relevant files:
${relevant.map((f) => `- ${f.path}: ${f.purpose}`).join("\n")}

Relevant call chains:
${relevantChains || "  (none detected)"}

Generate a Mermaid flowchart answering the user's question about data/control flow.

Rules:
- Use TD direction
- Max 10 nodes
- Node IDs: alphanumeric + underscores only
- Short node labels (max 5 words)
- Use --> for arrows, include labels on key transitions
- Use {Decision?} syntax for decision nodes

Respond ONLY with valid JSON (no markdown):
{
  "id": "custom_flow_<short_id>",
  "title": "<descriptive title>",
  "description": "<one sentence>",
  "category": "custom",
  "relatedFiles": ["<path1>", "<path2>"],
  "mermaidCode": "flowchart TD\\n  ..."
}`;

  const response = await provider.chat([{ role: "user", content: prompt }]);

  try {
    const clean = response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as FlowSubDiagram;
    parsed.mermaidCode = sanitizeMermaid(parsed.mermaidCode);
    return parsed;
  } catch {
    return {
      id: `custom_${Date.now()}`,
      title: question.slice(0, 40),
      description: "Custom diagram generated from your question",
      category: "custom",
      relatedFiles: relevant.map((f) => f.path),
      mermaidCode: `flowchart TD\n  A["${question.slice(0, 30)}"] --> B[Could not parse]\n  B --> C[Try rephrasing]`,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Basic sanitizer — ensures the mermaid string starts with "flowchart"
 * and fixes escaped newlines from JSON parsing.
 */
function sanitizeMermaid(code: string): string {
  // Replace literal \n with real newlines
  let clean = code.replace(/\\n/g, "\n").trim();
  if (!clean.startsWith("flowchart") && !clean.startsWith("graph")) {
    clean = "flowchart TD\n" + clean;
  }
  // Prepend dark-theme init directive if not already present
  if (!clean.startsWith("%%")) {
    clean = "%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1e3a5f'}}}%%\n" + clean;
  }
  return clean;
}

function buildFallbackFlowMap(repoName: string, summary: RepoSummary): FullFlowMap {
  const modules = summary.keyModules.slice(0, 4);
  const nodes = modules
    .map((m, i) => `  M${i}["${m.name.slice(0, 20)}"]`)
    .join("\n");
  const edges = modules
    .slice(0, -1)
    .map((_, i) => `  M${i} --> M${i + 1}`)
    .join("\n");

  return {
    subDiagrams: [
      {
        id: "main_flow",
        title: `${repoName} — main flow`,
        description: summary.overview.slice(0, 80),
        category: "service",
        relatedFiles: summary.entryPoints,
        mermaidCode: `flowchart TD\n${nodes}\n${edges}`,
      },
    ],
    overviewMermaid: `flowchart TD\n  main["${repoName}"]`,
  };
}
