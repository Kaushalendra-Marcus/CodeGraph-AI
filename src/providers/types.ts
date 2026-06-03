export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AIProvider {
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
}
