import * as vscode from "vscode";
import { scanWorkspace } from "../../analyzer/WorkspaceScanner";
import { buildDependencyGraph } from "../../analyzer/GraphBuilder";
import { analyzeFlows } from "../../analyzer/FlowAnalyzer";
import { summarizeRepo } from "../../agents/RepoSummaryAgent";
import { summarizeFiles } from "../../agents/FileSummaryAgent";
import { autoDetectFlows } from "../../agents/FlowDiagramAgent";
import { QAAgent } from "../../agents/QAAgent";
import { PanelState } from "./PanelState";
import { HistoryHandler, AnalysisRecord } from "./HistoryHandler";

export class AnalysisHandler {
  constructor(
    private context: vscode.ExtensionContext,
    private state: PanelState,
    private history: HistoryHandler,
    private post: (msg: object) => void
  ) {}

  async analyzeLocal() {
    if (!this.state.provider) {
      this.post({ type: "error", payload: { message: "Configure an AI provider in Settings first." } });
      return;
    }

    // ── Step 1: Scan ──────────────────────────────────────────────────────
    this.post({ type: "progress", payload: { step: 1, message: "Scanning workspace files..." } });
    const wsInfo = await scanWorkspace((msg) =>
      this.post({ type: "progress", payload: { step: 1, message: msg } })
    );
    if (!wsInfo) throw new Error("No workspace folder found.");
    this.state.workspaceInfo = wsInfo;

    // ── Step 2: Dependency graph ──────────────────────────────────────────
    this.post({ type: "progress", payload: { step: 2, message: "Building dependency graph..." } });
    const graph = buildDependencyGraph(wsInfo.files);
    this.state.currentGraph = graph;
    this.post({ type: "graphReady", payload: { nodes: graph.nodes, edges: graph.edges } });
    await this.sendSavedLayout();

    // ── Step 3: AI repo summary ───────────────────────────────────────────
    this.post({ type: "progress", payload: { step: 3, message: "Generating AI summary..." } });
    const summary = await summarizeRepo(this.state.provider, wsInfo, graph);
    this.state.currentSummary = summary;
    this.post({ type: "summaryReady", payload: summary });

    // ── Step 4: File summaries (important files only) ─────────────────────
    this.post({ type: "progress", payload: { step: 4, message: "Summarizing key files..." } });
    const fileSummaries = await summarizeFiles(
      this.state.provider,
      graph.nodes,
      wsInfo.files,
      (done, total) =>
        this.post({ type: "progress", payload: { step: 4, message: `Summarizing files ${done}/${total}...` } })
    );
    this.state.currentFileSummaries = fileSummaries;
    this.post({ type: "fileSummariesReady", payload: fileSummaries });

    // ── Step 5: Static flow analysis + AI flow diagrams ───────────────────
    this.post({ type: "progress", payload: { step: 5, message: "Analyzing code flows..." } });
    const flowCtx = analyzeFlows(wsInfo.files);
    this.state.currentFlowContext = flowCtx;
    this.post({
      type: "progress",
      payload: {
        step: 5,
        message: `Detected ${flowCtx.routes.length} routes, ${flowCtx.callChains.length} call chains — generating diagrams...`,
      },
    });

    const flowMap = await autoDetectFlows(
      this.state.provider,
      wsInfo,
      summary,
      fileSummaries,
      flowCtx
    );
    this.state.currentFlowMap = flowMap;
    this.post({ type: "flowMapReady", payload: flowMap });

    // ── Q&A agent ─────────────────────────────────────────────────────────
    this.state.qaAgent = new QAAgent(this.state.provider, wsInfo, graph, summary);

    // ── Persist ───────────────────────────────────────────────────────────
    const now   = Date.now();
    const label = `${wsInfo.name} — ${new Date(now).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    })}`;

    const record: AnalysisRecord = {
      id: `${now}`,
      label,
      timestamp: now,
      repoName: wsInfo.name,
      // Slim the graph for storage — keep first 500 edges
      graph: { nodes: graph.nodes, edges: graph.edges.slice(0, 500) },
      summary,
      fileSummaries,
      flowMap,
    };

    await this.history.saveRecord(record);
    this.post({ type: "historyLoaded", payload: { records: this.history.listMeta() } });
    this.post({ type: "analysisComplete", payload: { repoName: wsInfo.name } });
  }

  async sendSavedLayout() {
    const positions = this.context.workspaceState.get<{ id: string; x: number; y: number }[]>(
      "repograph.graphLayout"
    );
    if (positions?.length) {
      this.post({ type: "layoutLoaded", payload: { positions } });
    }
  }

  async saveLayout(payload: { positions: { id: string; x: number; y: number }[] }) {
    await this.context.workspaceState.update("repograph.graphLayout", payload.positions);
  }
}
