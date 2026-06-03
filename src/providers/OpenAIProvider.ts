import { AIProvider, Message, ProviderConfig } from "./types";

export class OpenAIProvider implements AIProvider {
  constructor(private config: ProviderConfig) {}

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    const msgs = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || "gpt-4o-mini",
        messages: msgs,
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
    const data = await res.json() as any;
    return data.choices[0].message.content;
  }
}
