import { AIProvider, Message } from "../providers/types";
import { WorkspaceInfo } from "../analyzer/WorkspaceScanner";
import { DependencyGraph } from "../analyzer/GraphBuilder";
import { RepoSummary } from "./RepoSummaryAgent";

export class QAAgent {
  private history: Message[] = [];

  constructor(
    private provider: AIProvider,
    private info: WorkspaceInfo,
    private graph: DependencyGraph,
    private summary: RepoSummary
  ) {}

  async ask(question: string): Promise<string> {
    const context = this.buildContext(question);

    const systemPrompt = `You are RepoGraph AI, an expert code analyst helping developers understand the workspace "${this.info.name}".

Repository Summary:
${this.summary.overview}

Architecture: ${this.summary.architecture}

Tech Stack: ${this.summary.techStack.join(", ")}

Key Modules:
${this.summary.keyModules.map((m) => `- ${m.name}: ${m.description}`).join("\n")}

${context}

Answer questions clearly and concisely. Reference specific file paths when relevant. If you're unsure, say so.`;

    this.history.push({ role: "user", content: question });
    const response = await this.provider.chat([...this.history], systemPrompt);
    this.history.push({ role: "assistant", content: response });

    // Keep history manageable — trim oldest pairs first
    if (this.history.length > 20) this.history = this.history.slice(-16);

    return response;
  }

  private buildContext(question: string): string {
    const q = question.toLowerCase();
    const relevantFiles: string[] = [];

    for (const file of this.info.files) {
      const pathLower = file.path.toLowerCase();
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      if (words.some((w) => pathLower.includes(w))) relevantFiles.push(file.path);
    }

    if (relevantFiles.length === 0) return "";

    const snippets = relevantFiles
      .slice(0, 3)
      .map((path) => {
        const file = this.info.files.find((f) => f.path === path);
        if (!file) return "";
        return `--- ${path} ---\n${file.content.slice(0, 500)}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return snippets ? `\nRelevant File Snippets:\n${snippets}` : "";
  }

  clearHistory() {
    this.history = [];
  }
}
