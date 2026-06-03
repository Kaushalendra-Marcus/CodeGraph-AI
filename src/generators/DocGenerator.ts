import * as vscode from "vscode";
import { AIProvider } from "../providers";
import { RepoSummary, FileSummary } from "../agents";
import { DependencyGraph } from "../analyzer/GraphBuilder";

export interface DocResult {
  content: string;
  tokensUsed: number;
}

export class DocGenerator {
  constructor(private provider: AIProvider) {}

  async generateReadme(
    summary: RepoSummary,
    fileSummaries: FileSummary[],
    repoName: string
  ): Promise<DocResult> {
    const topFiles = fileSummaries
      .slice(0, 10)
      .map((f) => `- **${f.path}**: ${f.purpose}`)
      .join("\n");

    const prompt = `Generate a professional README.md for the project "${repoName}".

Project Overview: ${summary.overview}
Purpose: ${summary.purpose}
Architecture: ${summary.architecture}
Tech Stack: ${summary.techStack.join(", ")}
Entry Points: ${summary.entryPoints.join(", ") || "Not detected"}

Key Modules:
${summary.keyModules.map((m) => `- ${m.name}: ${m.description}`).join("\n")}

Key Files:
${topFiles}

Write a complete, well-structured README.md with sections: Overview, Features, Tech Stack, Project Structure, Getting Started, Key Modules. Use proper Markdown formatting.`;

    const content = await this.provider.chat([{ role: "user", content: prompt }]);
    return { content, tokensUsed: Math.round((prompt.length + content.length) / 4) };
  }

  async generateArchitecture(
    summary: RepoSummary,
    graph: DependencyGraph,
    fileSummaries: FileSummary[],
    repoName: string
  ): Promise<DocResult> {
    const topNodes = [...graph.nodes]
      .sort((a, b) => b.inDegree + b.outDegree - (a.inDegree + a.outDegree))
      .slice(0, 15)
      .map((n) => `- ${n.path} (in: ${n.inDegree}, out: ${n.outDegree}, lang: ${n.language})`)
      .join("\n");

    const prompt = `Generate a detailed ARCHITECTURE.md document for "${repoName}".

Overview: ${summary.overview}
Architecture: ${summary.architecture}
Tech Stack: ${summary.techStack.join(", ")}

Key Modules:
${summary.keyModules.map((m) => `- ${m.name}: ${m.description}`).join("\n")}

Most connected files (by import degree):
${topNodes}

Write a comprehensive architecture document covering: System Overview, Directory Structure, Core Components, Data Flow, Dependencies, Design Patterns. Use proper Markdown.`;

    const content = await this.provider.chat([{ role: "user", content: prompt }]);
    return { content, tokensUsed: Math.round((prompt.length + content.length) / 4) };
  }

  async generateOnboarding(
    summary: RepoSummary,
    fileSummaries: FileSummary[],
    repoName: string
  ): Promise<DocResult> {
    const keyFiles = fileSummaries
      .slice(0, 12)
      .map((f) => `- ${f.path}: ${f.purpose}`)
      .join("\n");

    const prompt = `Generate a developer ONBOARDING.md guide for "${repoName}".

Project: ${summary.overview}
Purpose: ${summary.purpose}
Tech Stack: ${summary.techStack.join(", ")}
Entry Points: ${summary.entryPoints.join(", ") || "Not detected"}

Key Files to Know:
${keyFiles}

Write a friendly, detailed onboarding guide for a new developer covering: Project Introduction, Prerequisites, Setup Steps, Project Structure Tour, Key Files Walkthrough, Development Workflow, Common Tasks. Use clear Markdown formatting.`;

    const content = await this.provider.chat([{ role: "user", content: prompt }]);
    return { content, tokensUsed: Math.round((prompt.length + content.length) / 4) };
  }

  async analyzeRefactor(
    summary: RepoSummary,
    graph: DependencyGraph,
    fileSummaries: FileSummary[]
  ): Promise<DocResult> {
    // Find potential god files (high degree)
    const godFiles = [...graph.nodes]
      .sort((a, b) => b.inDegree + b.outDegree - (a.inDegree + a.outDegree))
      .slice(0, 8)
      .map((n) => `- ${n.path}: imported by ${n.inDegree} files, imports ${n.outDegree} files`);

    // Find isolated files
    const isolated = graph.nodes
      .filter((n) => n.inDegree === 0 && n.outDegree === 0)
      .slice(0, 5)
      .map((n) => `- ${n.path}`);

    const prompt = `Analyze the following codebase for refactoring opportunities and code quality issues.

Project: ${summary.overview}
Architecture: ${summary.architecture}
Tech Stack: ${summary.techStack.join(", ")}

Highly Connected Files (potential god files / bottlenecks):
${godFiles.join("\n")}

Isolated Files (potential dead code):
${isolated.length ? isolated.join("\n") : "None detected"}

Total files: ${graph.nodes.length}, Total edges: ${graph.edges.length}

Key Modules:
${summary.keyModules.map((m) => `- ${m.name}: ${m.description}`).join("\n")}

Provide a detailed refactoring analysis covering:
1. **God Files / High Coupling** — files that do too much
2. **Dead Code** — isolated or unused files
3. **Circular Dependencies** — likely problem areas
4. **Architecture Violations** — structural improvements
5. **Recommended Actions** — prioritized list of concrete steps

Be specific and actionable. Reference actual file paths where possible.`;

    const content = await this.provider.chat([{ role: "user", content: prompt }]);
    return { content, tokensUsed: Math.round((prompt.length + content.length) / 4) };
  }

  async reviewPR(
    diff: string,
    summary: RepoSummary,
    repoName: string
  ): Promise<DocResult> {
    const truncatedDiff = diff.slice(0, 4000);

    const prompt = `Review the following git diff for the project "${repoName}".

Project Context: ${summary.overview}
Architecture: ${summary.architecture}
Tech Stack: ${summary.techStack.join(", ")}

Git Diff:
\`\`\`diff
${truncatedDiff}
${diff.length > 4000 ? "\n[... diff truncated for length ...]" : ""}
\`\`\`

Provide a structured PR review covering:
1. **Summary** — what this PR does
2. **Correctness** — potential bugs, edge cases, logic errors
3. **Architecture Fit** — does it fit the existing patterns?
4. **Code Quality** — readability, naming, complexity
5. **Security Concerns** — any security issues
6. **Suggestions** — specific, actionable improvements
7. **Verdict** — Approve / Request Changes / Needs Discussion

Be constructive and specific.`;

    const content = await this.provider.chat([{ role: "user", content: prompt }]);
    return { content, tokensUsed: Math.round((prompt.length + content.length) / 4) };
  }

  static async saveToWorkspace(filename: string, content: string): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      throw new Error("No workspace folder open.");
    }

    const uri = vscode.Uri.joinPath(folders[0].uri, filename);
    const bytes = new TextEncoder().encode(content);
    await vscode.workspace.fs.writeFile(uri, bytes);

    // Open the file after saving
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  }
}
