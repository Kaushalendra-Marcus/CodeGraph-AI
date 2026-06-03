import { AIProvider } from "../providers/types";
import { WorkspaceInfo } from "../analyzer/WorkspaceScanner";
import { DependencyGraph } from "../analyzer/GraphBuilder";

export interface RepoSummary {
  overview: string;
  purpose: string;
  architecture: string;
  techStack: string[];
  entryPoints: string[];
  keyModules: { name: string; description: string }[];
}

export async function summarizeRepo(
  provider: AIProvider,
  info: WorkspaceInfo,
  graph: DependencyGraph
): Promise<RepoSummary> {
  const topFiles = graph.nodes
    .slice(0, 15)
    .map((n) => `- ${n.path} (${n.language}, imports: ${n.imports.slice(0, 5).join(", ")})`)
    .join("\n");

  const fileTree = info.files.slice(0, 30).map((f) => f.path).join("\n");

  const sampleContent = info.files
    .slice(0, 3)
    .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 400)}`)
    .join("\n\n");

  const prompt = `You are analyzing a workspace/codebase. Based on the structure and code below, provide a comprehensive JSON summary.

Workspace: ${info.name}
Root: ${info.rootPath}
Primary Language: ${info.files[0]?.language || "Mixed"}

File Tree (sample):
${fileTree}

Key Files with imports:
${topFiles}

Sample File Content:
${sampleContent}

Respond ONLY with valid JSON (no markdown) matching this exact schema:
{
  "overview": "2-3 sentence overview of what this repo does",
  "purpose": "What problem does this solve?",
  "architecture": "How is the codebase organized? (patterns, layers, structure)",
  "techStack": ["tech1", "tech2"],
  "entryPoints": ["path/to/entry1"],
  "keyModules": [{ "name": "module name", "description": "what it does" }]
}`;

  const response = await provider.chat([{ role: "user", content: prompt }]);

  try {
    const clean = response.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as RepoSummary;
  } catch {
    const langs = [...new Set(info.files.map((f) => f.language))].slice(0, 5);
    return {
      overview: response.slice(0, 200),
      purpose: "Could not parse full summary",
      architecture: "",
      techStack: langs.length > 0 ? langs : ["Mixed"],
      entryPoints: [],
      keyModules: [],
    };
  }
}
