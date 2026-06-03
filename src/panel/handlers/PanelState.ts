// Shared state bag passed between all handlers and the main panel.
// Using a class so handlers can mutate state and the panel sees the change.
import { AIProvider } from "../../providers/types";
import { WorkspaceInfo } from "../../analyzer/WorkspaceScanner";
import { DependencyGraph } from "../../analyzer/GraphBuilder";
import { FlowContext } from "../../analyzer/FlowAnalyzer";
import { RepoSummary } from "../../agents/RepoSummaryAgent";
import { FileSummary } from "../../agents/FileSummaryAgent";
import { QAAgent } from "../../agents/QAAgent";
import { FullFlowMap } from "../../agents/FlowDiagramAgent";

export class PanelState {
  provider?: AIProvider;
  qaAgent?: QAAgent;
  workspaceInfo?: WorkspaceInfo;
  currentGraph?: DependencyGraph;
  currentSummary?: RepoSummary;
  currentFileSummaries?: FileSummary[];
  currentFlowMap?: FullFlowMap;
  currentFlowContext?: FlowContext;
  totalTokensUsed = 0;
}
