import * as vscode from "vscode";
import { getWebviewContent } from "./webview/index";
import { PanelState } from "./handlers/PanelState";
import { SettingsHandler } from "./handlers/SettingsHandler";
import { AnalysisHandler } from "./handlers/AnalysisHandler";
import { HistoryHandler } from "./handlers/HistoryHandler";
import { AIToolsHandler } from "./handlers/AIToolsHandler";
import { FileHandler } from "./handlers/FileHandler";
import { FlowHandler } from "./handlers/FlowHandler";

export class RepoGraphPanel implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private readonly state = new PanelState();
  private readonly output: vscode.OutputChannel;

  // Handlers
  private settings!: SettingsHandler;
  private analysis!: AnalysisHandler;
  private history!: HistoryHandler;
  private aiTools!: AIToolsHandler;
  private files!: FileHandler;
  private flow!: FlowHandler;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.output = vscode.window.createOutputChannel("RepoGraph AI");
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _ctx: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    // Build icon URI map for the webview
    const iconNames = [
      "local-workspace.svg", "analyze-workspace.svg", "graph-empty.svg",
      "summary-empty.svg", "qa-empty.svg", "open-file.svg",
      "imports.svg", "used-by.svg", "language.svg", "user.svg", "ai.svg",
    ];
    const iconUris: Record<string, string> = {};
    for (const name of iconNames) {
      iconUris[name] = webviewView.webview
        .asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "public", name))
        .toString();
    }

    webviewView.webview.html = getWebviewContent({
      cspSource: webviewView.webview.cspSource,
      iconUris,
    });

    // Init all handlers
    const post = this.post.bind(this);
    this.history  = new HistoryHandler(this.context, this.state, post);
    this.settings = new SettingsHandler(this.context, this.state, post);
    this.analysis = new AnalysisHandler(this.context, this.state, this.history, post);
    this.aiTools  = new AIToolsHandler(this.context, this.state, post);
    this.files    = new FileHandler(this.state, post);
    this.flow     = new FlowHandler(this.state, post);

    // Boot sequence
    void this.settings.loadSavedSettings();
    void this.history.restore();

    // Message router
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      this.log(`← ${msg?.type}`);
      try {
        switch (msg.type) {
          // Settings
          case "getSettings":     await this.settings.loadSavedSettings(); break;
          case "saveProvider":    await this.settings.saveProvider(msg.payload); break;
          // Analysis
          case "analyzeLocal":    await this.analysis.analyzeLocal(); break;
          case "saveLayout":      await this.analysis.saveLayout(msg.payload); break;
          // History
          case "loadAnalysis":    await this.history.load(msg.payload); break;
          case "deleteAnalysis":  await this.history.delete(msg.payload); break;
          // Q&A
          case "askQuestion":     await this.handleQuestion(msg.payload); break;
          case "clearChat":       this.state.qaAgent?.clearHistory(); break;
          // AI Tools
          case "generateDoc":     await this.aiTools.generateDoc(msg.payload); break;
          case "analyzeRefactor": await this.aiTools.analyzeRefactor(); break;
          case "reviewPR":        await this.aiTools.reviewPR(msg.payload); break;
          case "saveDoc":         await this.aiTools.saveDoc(msg.payload); break;
          // File
          case "openFile":        await this.files.openFile(msg.payload); break;
          // Flow
          case "generateCustomFlow": await this.flow.handleGenerateCustomFlow(msg.payload); break;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.log(`ERROR in ${msg?.type}: ${message}`);
        this.post({ type: "error", payload: { message } });
      }
    });
  }

  private async handleQuestion(payload: { question: string }) {
    if (!this.state.qaAgent) {
      this.post({ type: "answer", payload: { answer: "Please analyze the workspace first." } });
      return;
    }
    const answer = await this.state.qaAgent.ask(payload.question);
    this.post({ type: "answer", payload: { answer } });
  }

  private post(message: object) {
    this.view?.webview.postMessage(message);
  }

  private log(msg: string) {
    this.output.appendLine(`[${new Date().toISOString()}] ${msg}`);
  }
}
