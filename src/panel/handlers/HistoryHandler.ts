import * as vscode from "vscode";
import { DependencyGraph } from "../../analyzer/GraphBuilder";
import { RepoSummary } from "../../agents/RepoSummaryAgent";
import { FileSummary } from "../../agents/FileSummaryAgent";
import { FullFlowMap } from "../../agents/FlowDiagramAgent";
import { QAAgent } from "../../agents/QAAgent";
import { PanelState } from "./PanelState";

export interface AnalysisRecord {
  id: string;
  label: string;
  timestamp: number;
  repoName: string;
  graph: DependencyGraph;
  summary: RepoSummary;
  fileSummaries: FileSummary[];
  flowMap?: FullFlowMap;
}

type RecordMeta = Pick<AnalysisRecord, "id" | "label" | "timestamp" | "repoName">;

export class HistoryHandler {
  constructor(
    private context: vscode.ExtensionContext,
    private state: PanelState,
    private post: (msg: object) => void
  ) {}

  getAll(): AnalysisRecord[] {
    return this.context.workspaceState.get<AnalysisRecord[]>("repograph.history", []);
  }

  async saveRecord(record: AnalysisRecord) {
    const existing = this.getAll();
    const trimmed = [record, ...existing].slice(0, 20);
    await this.context.workspaceState.update("repograph.history", trimmed);
  }

  listMeta(): RecordMeta[] {
    return this.getAll().map(({ id, label, timestamp, repoName }) => ({ id, label, timestamp, repoName }));
  }

  async restore() {
    const records = this.getAll();
    if (!records.length) return;

    this.post({ type: "historyLoaded", payload: { records: this.listMeta() } });

    const latest = records[0];
    this.state.currentGraph = latest.graph;
    this.state.currentSummary = latest.summary;
    this.state.currentFileSummaries = latest.fileSummaries;
    this.state.currentFlowMap = latest.flowMap;

    if (this.state.provider) {
      const stub = { name: latest.repoName, rootPath: "", files: [], isLocal: true as const };
      this.state.qaAgent = new QAAgent(this.state.provider, stub, latest.graph, latest.summary);
    }
  }

  async load(payload: { id: string }) {
    const record = this.getAll().find((r) => r.id === payload.id);
    if (!record) {
      this.post({ type: "error", payload: { message: "Analysis record not found." } });
      return;
    }

    this.state.currentGraph = record.graph;
    this.state.currentSummary = record.summary;
    this.state.currentFileSummaries = record.fileSummaries;
    this.state.currentFlowMap = record.flowMap;

    if (this.state.provider && this.state.workspaceInfo) {
      this.state.qaAgent = new QAAgent(
        this.state.provider, this.state.workspaceInfo, record.graph, record.summary
      );
    }

    this.post({
      type: "analysisRestored",
      payload: {
        repoName: record.repoName,
        graph: record.graph,
        summary: record.summary,
        fileSummaries: record.fileSummaries,
        flowMap: record.flowMap,
        hasQA: !!this.state.qaAgent,
      },
    });

    // Restore saved node positions
    const positions = this.context.workspaceState.get<{ id: string; x: number; y: number }[]>("repograph.graphLayout");
    if (positions?.length) {
      this.post({ type: "layoutLoaded", payload: { positions } });
    }
  }

  async delete(payload: { id: string }) {
    const records = this.getAll().filter((r) => r.id !== payload.id);
    await this.context.workspaceState.update("repograph.history", records);
    this.post({ type: "historyLoaded", payload: { records: this.listMeta() } });
  }
}
