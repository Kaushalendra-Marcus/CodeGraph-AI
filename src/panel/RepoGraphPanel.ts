import * as vscode from "vscode";
import { getWebviewContent } from "./webviewContent";
import { PanelState } from "./handlers/PanelState";
import { SettingsHandler } from "./handlers/SettingsHandler";
import { HistoryHandler } from "./handlers/HistoryHandler";
import { AnalysisHandler } from "./handlers/AnalysisHandler";
import { AIToolsHandler } from "./handlers/AIToolsHandler";
import { FileHandler } from "./handlers/FileHandler";

export class RepoGraphPanel implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private readonly output: vscode.OutputChannel;

  // ── shared state ──────────────────────────────────────────────────────
  private readonly state: PanelState;

  // ── handlers ──────────────────────────────────────────────────────────
  private readonly settings: SettingsHandler;
  private readonly history: HistoryHandler;
  private readonly analysis: AnalysisHandler;
  private readonly aiTools: AIToolsHandler;
  private readonly files: FileHandler;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.output = vscode.window.createOutputChannel("RepoGraph AI Debug");
    this.state   = new PanelState();

    const post = this.post.bind(this);
    this.settings = new SettingsHandler(context, this.state, post);
    this.history  = new HistoryHandler(context, this.state, post);
    this.analysis = new AnalysisHandler(context, this.state, this.history, post);
    this.aiTools  = new AIToolsHandler(context, this.state, post);
    this.files    = new FileHandler(this.state, post);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _ctx: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    const cspSource = webviewView.webview.cspSource;

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

    void this.settings.loadSavedSettings();
    void this.history.restore();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      try {
        this.logDebug("<- webview", msg?.type ?? "unknown", msg?.payload);
        switch (msg.type) {
          case "debug":              this.logDebug("webview-debug", "event", msg.payload); break;
          case "saveProvider":       await this.settings.saveProvider(msg.payload); break;
          case "getSettings":        await this.settings.loadSavedSettings(); break;
          case "analyzeLocal":       await this.analysis.analyzeLocal(); break;
          case "saveLayout":         await this.analysis.saveLayout(msg.payload); break;
          case "loadAnalysis":       await this.history.load(msg.payload); break;
          case "deleteAnalysis":     await this.history.delete(msg.payload); break;
          case "generateDoc":        await this.aiTools.generateDoc(msg.payload); break;
          case "analyzeRefactor":    await this.aiTools.analyzeRefactor(); break;
          case "reviewPR":           await this.aiTools.reviewPR(msg.payload); break;
          case "saveDoc":            await this.aiTools.saveDoc(msg.payload); break;
          case "generateCustomFlow": await this.aiTools.generateCustomFlow(msg.payload); break;
          case "openFile":           await this.files.openFile(msg.payload); break;
          case "askQuestion":        await this.files.askQuestion(msg.payload); break;
          case "clearChat":          this.state.qaAgent?.clearHistory(); break;
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

  private post(message: object) {
    const msg = message as { type?: string; payload?: unknown };
    this.logDebug("-> webview", msg.type ?? "unknown", msg.payload);
    this.view?.webview.postMessage(message);
  }
}
