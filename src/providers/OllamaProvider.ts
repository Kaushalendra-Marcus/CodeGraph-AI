import { AIProvider, Message, ProviderConfig } from "./types";

export class OllamaProvider implements AIProvider {
  constructor(private config: ProviderConfig) {}

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    const baseUrl = this.config.baseUrl || "http://localhost:11434";
    const msgs = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model || "llama3.2",
        messages: msgs,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Ollama error: ${await res.text()}`);
    const data = await res.json() as any;
    return data.message.content;
  }
}
