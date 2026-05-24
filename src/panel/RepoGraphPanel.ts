import * as vscode from "vscode";
import { createProvider, AIProvider } from "../providers";
import { scanWorkspace, WorkspaceInfo } from "../analyzer/WorkspaceScanner";
import { buildDependencyGraph, DependencyGraph } from "../analyzer/GraphBuilder";
import { summarizeRepo, summarizeFiles, QAAgent, RepoSummary, FileSummary } from "../agents";
import { getWebviewContent } from "./webviewContent";

interface ProviderSettings {
  name: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AnalysisRecord {
  id: string;
  label: string;          // e.g. "my-project — 2 Jun 14:32"
  timestamp: number;
  repoName: string;
  graph: DependencyGraph;
  summary: RepoSummary;
  fileSummaries: FileSummary[];
  // We do not persist full file contents — workspace can be re-read
}

export class RepoGraphPanel implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private provider?: AIProvider;
  private qaAgent?: QAAgent;
  private workspaceInfo?: WorkspaceInfo;
  private currentGraph?: DependencyGraph;
  private currentSummary?: RepoSummary;
  private readonly output: vscode.OutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.output = vscode.window.createOutputChannel("RepoGraph AI Debug");
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _ctx: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    const cspSource = webviewView.webview.cspSource;
    
    // Build icon URIs for webview
    const iconUris: Record<string, string> = {};
    const iconNames = [
      'local-workspace.svg', 'analyze-workspace.svg', 'graph-empty.svg', 
      'summary-empty.svg', 'qa-empty.svg', 'open-file.svg', 
      'imports.svg', 'used-by.svg', 'language.svg', 'user.svg', 'ai.svg'
    ];
    for (const name of iconNames) {
      iconUris[name] = webviewView.webview.asWebviewUri(
        vscode.Uri.joinPath(this.context.extensionUri, 'public', name)
      ).toString();
    }
    
    webviewView.webview.html = getWebviewContent({ cspSource, iconUris });

    void this.loadSavedSettings();
    void this.restoreHistory();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      try {
        this.logDebug("<- webview", msg?.type ?? "unknown", msg?.payload);
        switch (msg.type) {
          case "debug":           this.logDebug("webview-debug", "event", msg.payload); break;
          case "saveProvider":    await this.handleSaveProvider(msg.payload); break;
          case "analyzeLocal":    await this.handleAnalyzeLocal(); break;
          case "askQuestion":     await this.handleQuestion(msg.payload); break;
          case "openFile":        await this.handleOpenFile(msg.payload); break;
          case "clearChat":       this.qaAgent?.clearHistory(); break;
          case "getSettings":     await this.loadSavedSettings(); break;
          case "loadAnalysis":    await this.handleLoadAnalysis(msg.payload); break;
          case "deleteAnalysis":  await this.handleDeleteAnalysis(msg.payload); break;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.post({ type: "error", payload: { message } });
      }
    });
  }

  private logDebug(direction: string, type: string, payload?: unknown) {
    const stamp = new Date().toISOString();
    let payloadText = "";
    try {
      if (payload !== undefined) payloadText = ` ${JSON.stringify(payload)}`;
    } catch {
      payloadText = " [payload-unserializable]";
    }
    this.output.appendLine(`[${stamp}] ${direction} ${type}${payloadText}`);
  }

  // ── Settings ───────────────────────────────────────────────────────────

  private async handleSaveProvider(payload: ProviderSettings) {
    const { name, apiKey, model, baseUrl } = payload;
    if (apiKey) await this.context.secrets.store(`repograph.${name}.apiKey`, apiKey);
    await this.context.globalState.update("repograph.activeProvider", name);
    await this.context.globalState.update(`repograph.${name}.model`, model);
    if (baseUrl) await this.context.globalState.update(`repograph.${name}.baseUrl`, baseUrl);

    try {
      const key = apiKey || (await this.context.secrets.get(`repograph.${name}.apiKey`));
      this.provider = createProvider(name, { name, apiKey: key, model, baseUrl });
      // Re-init QA agent with new provider if analysis exists
      if (this.workspaceInfo && this.currentGraph && this.currentSummary) {
        this.qaAgent = new QAAgent(
          this.provider,
          this.workspaceInfo,
          this.currentGraph,
          this.currentSummary
        );
      }
      this.post({ type: "providerSaved", payload: { name, success: true } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "error", payload: { message } });
    }
  }

  private async loadSavedSettings() {
    const name = this.context.globalState.get<string>("repograph.activeProvider");
    const hasWorkspace = !!(vscode.workspace.workspaceFolders?.length);
    const wsName = vscode.workspace.workspaceFolders?.[0]?.name;

    this.post({ type: "workspaceStatus", payload: { hasWorkspace, name: wsName } });

    if (!name) return;

    const apiKey = await this.context.secrets.get(`repograph.${name}.apiKey`);
    const model = this.context.globalState.get<string>(`repograph.${name}.model`);
    const baseUrl = this.context.globalState.get<string>(`repograph.${name}.baseUrl`);

    try {
      this.provider = createProvider(name, { name, apiKey, model, baseUrl });
    } catch {
      // provider creation can fail if key missing — that is fine at startup
    }

    this.post({
      type: "settingsLoaded",
      payload: { providerName: name, model, baseUrl, hasKey: !!apiKey },
    });
  }

  // ── History management ─────────────────────────────────────────────────

  private getHistory(): AnalysisRecord[] {
    return this.context.workspaceState.get<AnalysisRecord[]>("repograph.history", []);
  }

  private async saveHistory(records: AnalysisRecord[]) {
    // Keep latest 20 analyses, sorted by timestamp descending
    const trimmed = records.slice(0, 20);
    await this.context.workspaceState.update("repograph.history", trimmed);
  }

  private async restoreHistory() {
    const records = this.getHistory();
    if (records.length === 0) return;

    // Send history list to UI
    this.post({
      type: "historyLoaded",
      payload: { records: records.map(this.recordMeta) },
    });

    // Auto-restore latest analysis into state (no need to re-render graph yet)
    const latest = records[0];
    this.currentGraph = latest.graph;
    this.currentSummary = latest.summary;

    // Initialize QA agent with summary context so Q&A works immediately after restart,
    // even before the user re-scans the workspace.
    if (this.provider) {
      const stubInfo = { name: latest.repoName, rootPath: "", files: [], isLocal: true as const };
      this.qaAgent = new QAAgent(this.provider, stubInfo, latest.graph, latest.summary);
    }
  }

  private recordMeta(r: AnalysisRecord) {
    return { id: r.id, label: r.label, timestamp: r.timestamp, repoName: r.repoName };
  }

  private async handleLoadAnalysis(payload: { id: string }) {
    const records = this.getHistory();
    const record = records.find((r) => r.id === payload.id);
    if (!record) {
      this.post({ type: "error", payload: { message: "Analysis record not found." } });
      return;
    }

    this.currentGraph = record.graph;
    this.currentSummary = record.summary;

    // Re-init QA if provider available — workspace info may not be loaded
    // so QA will work with summary context only
    if (this.provider && this.workspaceInfo) {
      this.qaAgent = new QAAgent(
        this.provider,
        this.workspaceInfo,
        record.graph,
        record.summary
      );
    }

    this.post({
      type: "analysisRestored",
      payload: {
        repoName: record.repoName,
        graph: record.graph,
        summary: record.summary,
        fileSummaries: record.fileSummaries,
        hasQA: !!this.qaAgent,
      },
    });
  }

  private async handleDeleteAnalysis(payload: { id: string }) {
    const records = this.getHistory().filter((r) => r.id !== payload.id);
    await this.saveHistory(records);
    this.post({
      type: "historyLoaded",
      payload: { records: records.map(this.recordMeta) },
    });
  }

  // ── Analyze local workspace ────────────────────────────────────────────

  private async handleAnalyzeLocal() {
    if (!this.provider) {
      this.post({
        type: "error",
        payload: { message: "Configure an AI provider in Settings first." },
      });
      return;
    }

    this.post({ type: "progress", payload: { step: 1, message: "Scanning workspace files..." } });

    const wsInfo = await scanWorkspace((msg) => {
      this.post({ type: "progress", payload: { step: 1, message: msg } });
    });

    if (!wsInfo) throw new Error("No workspace found.");
    this.workspaceInfo = wsInfo;

    // Step 2: dependency graph
    this.post({ type: "progress", payload: { step: 2, message: "Building dependency graph..." } });
    const graph = buildDependencyGraph(wsInfo.files);
    this.currentGraph = graph;
    this.post({ type: "graphReady", payload: { nodes: graph.nodes, edges: graph.edges } });

    // Step 3: repo summary
    this.post({ type: "progress", payload: { step: 3, message: "Generating AI summary..." } });
    const summary = await summarizeRepo(this.provider, wsInfo, graph);
    this.currentSummary = summary;
    this.post({ type: "summaryReady", payload: summary });

    // Step 4: file summaries
    this.post({ type: "progress", payload: { step: 4, message: "Summarizing key files..." } });
    const fileSummaries = await summarizeFiles(this.provider, graph.nodes, wsInfo, (done, total) => {
      this.post({ type: "progress", payload: { step: 4, message: `Summarizing files ${done}/${total}...` } });
    });
    this.post({ type: "fileSummariesReady", payload: fileSummaries });

    // QA agent
    this.qaAgent = new QAAgent(this.provider, wsInfo, graph, summary);

    // Persist to history (keep all runs; don't filter by repoName)
    const now = Date.now();
    const label = `${wsInfo.name} — ${new Date(now).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    })}`;

    // Slim the stored graph: edges can be very large and workspaceState has a ~2 MB soft limit.
    // We cap edges so history serialization stays well within budget.
    const slimGraph = { nodes: graph.nodes, edges: graph.edges.slice(0, 500) };

    const record: AnalysisRecord = {
      id: `${now}`,
      label,
      timestamp: now,
      repoName: wsInfo.name,
      graph: slimGraph,
      summary,
      fileSummaries,
    };

    const existing = this.getHistory();
    await this.saveHistory([record, ...existing]);

    this.post({
      type: "historyLoaded",
      payload: {
        records: this.getHistory().map(this.recordMeta),
      },
    });

    this.post({ type: "analysisComplete", payload: { repoName: wsInfo.name } });
  }

  // ── Open file ──────────────────────────────────────────────────────────

  private async handleOpenFile(payload: { path: string }) {
    const node = this.currentGraph?.nodes.find((n) => n.path === payload.path);

    let uri: vscode.Uri | undefined;

    if (node?.absPath) {
      uri = vscode.Uri.file(node.absPath);
    } else if (vscode.workspace.workspaceFolders?.length) {
      const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
      uri = vscode.Uri.file(`${root}/${payload.path}`);
    }

    if (!uri) return;

    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "error", payload: { message: `Cannot open: ${message}` } });
    }
  }

  // ── Q&A ───────────────────────────────────────────────────────────────

  private async handleQuestion(payload: { question: string }) {
    if (!this.qaAgent) {
      this.post({
        type: "answer",
        payload: { answer: "Please analyze the workspace first before asking questions." },
      });
      return;
    }

    try {
      const answer = await this.qaAgent.ask(payload.question);
      this.post({ type: "answer", payload: { answer } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "answer", payload: { answer: `Error: ${message}` } });
    }
  }

  private post(message: object) {
    const msg = message as { type?: string; payload?: unknown };
    this.logDebug("-> webview", msg.type ?? "unknown", msg.payload);
    this.view?.webview.postMessage(message);
  }
}