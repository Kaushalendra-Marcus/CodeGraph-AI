import { AIProvider, Message, ProviderConfig } from "./types";

export class AnthropicProvider implements AIProvider {
  constructor(private config: ProviderConfig) {}

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    const body: any = {
      model: this.config.model || "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: messages.filter((m) => m.role !== "system"),
    };
    if (systemPrompt) body.system = systemPrompt;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
    const data = await res.json() as any;
    return data.content[0].text;
  }
}
