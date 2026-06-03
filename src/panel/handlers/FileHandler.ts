import * as vscode from "vscode";
import { PanelState } from "./PanelState";

export class FileHandler {
  constructor(
    private state: PanelState,
    private post: (msg: object) => void
  ) {}

  // ── Open file in editor ─────────────────────────────────────────────────

  async openFile(payload: { path: string }) {
    const node = this.state.currentGraph?.nodes.find((n) => n.path === payload.path);

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

  // ── Q&A ────────────────────────────────────────────────────────────────

  async askQuestion(payload: { question: string }) {
    if (!this.state.qaAgent) {
      this.post({
        type: "answer",
        payload: { answer: "Please analyze the workspace first before asking questions." },
      });
      return;
    }

    try {
      const answer = await this.state.qaAgent.ask(payload.question);
      this.post({ type: "answer", payload: { answer } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.post({ type: "answer", payload: { answer: `Error: ${message}` } });
    }
  }
}
