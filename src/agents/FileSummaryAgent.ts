import { AIProvider } from "../providers/types";
import { WorkspaceFile } from "../analyzer/WorkspaceScanner";
import { GraphNode } from "../analyzer/GraphBuilder";

export interface FileSummary {
  path: string;
  purpose: string;
  exports: string;
  dependencies: string;
}

export async function summarizeFiles(
  provider: AIProvider,
  nodes: GraphNode[],
  files: WorkspaceFile[],
  onProgress?: (done: number, total: number) => void
): Promise<FileSummary[]> {
  const summaries: FileSummary[] = [];
  const nodeByPath = new Map(nodes.map((n) => [n.path, n]));
  const codeFiles = files.filter((f) => f.content.trim().length > 0);

  for (let i = 0; i < codeFiles.length; i++) {
    const file = codeFiles[i];
    const node = nodeByPath.get(file.path);
    const imports = node?.imports ?? inferImports(file.content);

    const shouldUseHeuristic =
      ["JSON", "YAML", "TOML", "Markdown"].includes(file.language) ||
      file.content.length > 12000;

    if (shouldUseHeuristic) {
      summaries.push(buildHeuristicSummary(file.path, file.content, imports));
      onProgress?.(i + 1, codeFiles.length);
      continue;
    }

    try {
      const summary = await summarizeSingleFile(provider, file.path, file.content, imports);
      summaries.push(mergeWithFallback(summary, file.path, file.content, imports));
    } catch {
      summaries.push(buildHeuristicSummary(file.path, file.content, imports));
    }
    onProgress?.(i + 1, codeFiles.length);
  }

  return summaries;
}

async function summarizeSingleFile(
  provider: AIProvider,
  path: string,
  content: string,
  imports: string[]
): Promise<FileSummary> {
  const prompt = `Analyze this source file and respond ONLY with valid JSON (no markdown).

File: ${path}
Imports: ${imports.slice(0, 8).join(", ")}

Content (first 1600 chars):
${content.slice(0, 1600)}

JSON schema:
{
  "path": "${path}",
  "purpose": "What does this file do? (1-2 sentences)",
  "exports": "What does it export or expose?",
  "dependencies": "Key dependencies or modules it uses"
}`;

  const res = await provider.chat([{ role: "user", content: prompt }]);
  const clean = res.replace(/```json|```/g, "").trim();
  const jsonText = extractFirstJsonObject(clean) || clean;
  try {
    return JSON.parse(jsonText) as FileSummary;
  } catch {
    return buildHeuristicSummary(path, content, imports);
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; }
      else if (ch === "\\") { escaped = true; }
      else if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function inferImports(content: string): string[] {
  const out = new Set<string>();
  const patterns = [
    /import\s+[^"']*?from\s+["']([^"']+)["']/g,
    /import\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) if (m[1]) out.add(m[1]);
  }
  return [...out].slice(0, 10);
}

function detectExports(content: string): string {
  const exportMatches =
    content.match(/\bexport\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+[A-Za-z0-9_]+/g) || [];
  const moduleMatches = content.match(/module\.exports\s*=\s*[A-Za-z0-9_]+/g) || [];
  const names = [...exportMatches, ...moduleMatches]
    .map((m) => {
      const parts = m.split(/\s+/).filter(Boolean);
      return parts[parts.length - 1].replace(/[^A-Za-z0-9_]/g, "");
    })
    .filter(Boolean);
  return names.slice(0, 8).join(", ");
}

function buildHeuristicSummary(path: string, content: string, imports: string[]): FileSummary {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstCodeLike =
    lines.find((l) => !l.startsWith("//") && !l.startsWith("#") && !l.startsWith("/*")) || "";
  const folder = path.includes("/") ? path.split("/").slice(0, -1).join("/") : "root";
  const roleHint =
    path.endsWith(".test.ts") || path.endsWith(".spec.ts") || path.includes("/test")
      ? "test logic"
      : path.endsWith(".md")
        ? "documentation"
        : path.endsWith(".json") || path.endsWith(".yaml") || path.endsWith(".yml") || path.endsWith(".toml")
          ? "configuration/data"
          : "source logic";

  const purpose = firstCodeLike
    ? `Provides ${roleHint} in ${folder}. Main clue: ${firstCodeLike.slice(0, 110)}${firstCodeLike.length > 110 ? "..." : ""}`
    : `Provides ${roleHint} in ${folder}.`;

  return { path, purpose, exports: detectExports(content), dependencies: imports.join(", ") };
}

function mergeWithFallback(summary: FileSummary, path: string, content: string, imports: string[]): FileSummary {
  const fallback = buildHeuristicSummary(path, content, imports);
  return {
    path,
    purpose: summary.purpose?.trim() || fallback.purpose,
    exports: summary.exports?.trim() || fallback.exports,
    dependencies: summary.dependencies?.trim() || fallback.dependencies,
  };
}
