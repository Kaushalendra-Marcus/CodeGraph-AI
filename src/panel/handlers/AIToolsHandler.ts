import * as vscode from "vscode";
import { DocGenerator } from "../../generators/DocGenerator";
import { generateCustomFlow } from "../../agents/FlowDiagramAgent";
import { PanelState } from "./PanelState";

export class AIToolsHandler {
  constructor(
    private context: vscode.ExtensionContext,
    private state: PanelState,
    private post: (msg: object) => void
  ) {}

  // ── Guards ──────────────────────────────────────────────────────────────

  private requiresAnalysis(featureName: string): boolean {
    if (!this.state.provider) {
      this.post({ type: "aiToolError", payload: { message: "Configure an AI provider in Settings first." } });
      return false;
    }
    if (!this.state.currentSummary || !this.state.currentGraph) {
      this.post({ type: "aiToolError", payload: { message: `Analyze a workspace first before using ${featureName}.` } });
      return false;
    }
    return true;
  }

  private addTokens(n: number) {
    this.state.totalTokensUsed += n;
    this.post({ type: "tokenUsage", payload: { total: this.state.totalTokensUsed } });
  }

  // ── Doc generation ──────────────────────────────────────────────────────

  async generateDoc(payload: { docType: string }) {
    if (!this.requiresAnalysis("document generation")) return;

    const gen = new DocGenerator(this.state.provider!);
    const repoName =
      this.state.workspaceInfo?.name ??
      this.state.currentGraph!.nodes[0]?.path.split("/")[0] ??
      "Project";
    const fileSummaries = this.state.currentFileSummaries ?? [];

    this.post({ type: "aiToolBusy", payload: { docType: payload.docType, busy: true } });
    try {
      let result: { content: string; tokensUsed: number };
      let filename: string;
      switch (payload.docType) {
        case "readme":
          result = await gen.generateReadme(this.state.currentSummary!, fileSummaries, repoName);
          filename = "README-REPOGRAPH.md";
          break;
        case "architecture":
          result = await gen.generateArchitecture(
            this.state.currentSummary!, this.state.currentGraph!, fileSummaries, repoName
          );
          filename = "ARCHITECTURE-REPOGRAPH.md";
          break;
        case "onboarding":
          result = await gen.generateOnboarding(this.state.currentSummary!, fileSummaries, repoName);
          filename = "ONBOARDING-REPOGRAPH.md";
          break;
        default:
          throw new Error(`Unknown docType: ${payload.docType}`);
      }
      await DocGenerator.saveToWorkspace(filename, result.content);
      this.addTokens(result.tokensUsed);
      this.post({ type: "docSaved", payload: { docType: payload.docType, filename } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "aiToolError", payload: { message } });
    } finally {
      this.post({ type: "aiToolBusy", payload: { docType: payload.docType, busy: false } });
    }
  }

  // ── Refactor analysis ───────────────────────────────────────────────────

  async analyzeRefactor() {
    if (!this.requiresAnalysis("refactor analysis")) return;
    const gen = new DocGenerator(this.state.provider!);
    this.post({ type: "aiToolBusy", payload: { docType: "refactor", busy: true } });
    try {
      const result = await gen.analyzeRefactor(
        this.state.currentSummary!,
        this.state.currentGraph!,
        this.state.currentFileSummaries ?? []
      );
      this.addTokens(result.tokensUsed);
      this.post({ type: "refactorResult", payload: { content: result.content } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "aiToolError", payload: { message } });
    } finally {
      this.post({ type: "aiToolBusy", payload: { docType: "refactor", busy: false } });
    }
  }

  // ── PR review ───────────────────────────────────────────────────────────

  async reviewPR(payload: { diff: string }) {
    if (!this.requiresAnalysis("PR review")) return;
    if (!payload.diff?.trim()) {
      this.post({ type: "aiToolError", payload: { message: "Paste a git diff first." } });
      return;
    }
    const gen = new DocGenerator(this.state.provider!);
    const repoName = this.state.workspaceInfo?.name ?? "Project";
    this.post({ type: "aiToolBusy", payload: { docType: "pr", busy: true } });
    try {
      const result = await gen.reviewPR(payload.diff, this.state.currentSummary!, repoName);
      this.addTokens(result.tokensUsed);
      this.post({ type: "prReviewResult", payload: { content: result.content } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "aiToolError", payload: { message } });
    } finally {
      this.post({ type: "aiToolBusy", payload: { docType: "pr", busy: false } });
    }
  }

  // ── Save doc ────────────────────────────────────────────────────────────

  async saveDoc(payload: { filename: string; content: string }) {
    try {
      await DocGenerator.saveToWorkspace(payload.filename, payload.content);
      this.post({ type: "docSaved", payload: { filename: payload.filename } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "aiToolError", payload: { message } });
    }
  }

  // ── Custom flow diagram ─────────────────────────────────────────────────

  async generateCustomFlow(payload: { question: string }) {
    if (!this.requiresAnalysis("custom flow generation")) return;
    if (!payload.question?.trim()) {
      this.post({ type: "aiToolError", payload: { message: "Enter a flow question first." } });
      return;
    }

    this.post({ type: "customFlowBusy", payload: { busy: true } });
    try {
      const diagram = await generateCustomFlow(
        this.state.provider!,
        payload.question,
        this.state.workspaceInfo ?? { name: "project", rootPath: "", files: [], isLocal: true },
        this.state.currentSummary!,
        this.state.currentFileSummaries ?? [],
        this.state.currentFlowContext ?? { callChains: [], routes: [], eventEmitters: [], dbAccess: [] }
      );
      this.post({ type: "customFlowReady", payload: { diagram } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "aiToolError", payload: { message } });
    } finally {
      this.post({ type: "customFlowBusy", payload: { busy: false } });
    }
  }
}
