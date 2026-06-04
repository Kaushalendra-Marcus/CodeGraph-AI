import * as vscode from "vscode";
import { generateCustomFlow } from "../../agents/FlowDiagramAgent";
import { PanelState } from "./PanelState";

export class FlowHandler {
  constructor(
    private state: PanelState,
    private post: (msg: object) => void
  ) {}

  async handleGenerateCustomFlow(payload: { question: string }) {
    if (!this.state.provider) {
      this.post({ type: "error", payload: { message: "Configure an AI provider in Settings first." } });
      return;
    }
    if (!this.state.currentSummary || !this.state.currentFlowContext) {
      this.post({ type: "error", payload: { message: "Analyze a workspace first before generating flow diagrams." } });
      return;
    }
    if (!payload.question?.trim()) {
      this.post({ type: "error", payload: { message: "Please enter a question about the codebase flow." } });
      return;
    }

    try {
      const diagram = await generateCustomFlow(
        this.state.provider,
        payload.question,
        this.state.workspaceInfo!,
        this.state.currentSummary,
        this.state.currentFileSummaries ?? [],
        this.state.currentFlowContext
      );
      this.post({ type: "customFlowReady", payload: diagram });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "error", payload: { message: `Flow generation failed: ${message}` } });
    }
  }
}
