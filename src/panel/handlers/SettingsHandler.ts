import * as vscode from "vscode";
import { createProvider } from "../../providers";
import { QAAgent } from "../../agents/QAAgent";
import { PanelState } from "./PanelState";

export interface ProviderSettings {
  name: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class SettingsHandler {
  constructor(
    private context: vscode.ExtensionContext,
    private state: PanelState,
    private post: (msg: object) => void
  ) {}

  async saveProvider(payload: ProviderSettings) {
    const { name, apiKey, model, baseUrl } = payload;
    if (apiKey) await this.context.secrets.store(`repograph.${name}.apiKey`, apiKey);
    await this.context.globalState.update("repograph.activeProvider", name);
    await this.context.globalState.update(`repograph.${name}.model`, model);
    if (baseUrl) await this.context.globalState.update(`repograph.${name}.baseUrl`, baseUrl);

    const key = apiKey || (await this.context.secrets.get(`repograph.${name}.apiKey`));
    this.state.provider = createProvider(name, { name, apiKey: key, model, baseUrl });

    // Re-init QA agent with new provider if analysis already exists
    if (this.state.workspaceInfo && this.state.currentGraph && this.state.currentSummary) {
      this.state.qaAgent = new QAAgent(
        this.state.provider,
        this.state.workspaceInfo,
        this.state.currentGraph,
        this.state.currentSummary
      );
    }

    this.post({ type: "providerSaved", payload: { name, success: true } });
  }

  async loadSavedSettings() {
    const name = this.context.globalState.get<string>("repograph.activeProvider");
    const hasWorkspace = !!(vscode.workspace.workspaceFolders?.length);
    const wsName = vscode.workspace.workspaceFolders?.[0]?.name;

    this.post({ type: "workspaceStatus", payload: { hasWorkspace, name: wsName } });

    if (!name) return;

    const apiKey = await this.context.secrets.get(`repograph.${name}.apiKey`);
    const model = this.context.globalState.get<string>(`repograph.${name}.model`);
    const baseUrl = this.context.globalState.get<string>(`repograph.${name}.baseUrl`);

    try {
      this.state.provider = createProvider(name, { name, apiKey, model, baseUrl });
    } catch {
      // Provider creation may fail if key is missing — fine at startup
    }

    this.post({ type: "settingsLoaded", payload: { providerName: name, model, baseUrl, hasKey: !!apiKey } });
  }
}
