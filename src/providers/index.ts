export type { Message, ProviderConfig, AIProvider } from "./types";
export { GroqProvider }      from "./GroqProvider";
export { OllamaProvider }    from "./OllamaProvider";
export { GeminiProvider }    from "./GeminiProvider";
export { AnthropicProvider } from "./AnthropicProvider";
export { OpenAIProvider }    from "./OpenAIProvider";

import { ProviderConfig, AIProvider } from "./types";
import { GroqProvider }      from "./GroqProvider";
import { OllamaProvider }    from "./OllamaProvider";
import { GeminiProvider }    from "./GeminiProvider";
import { AnthropicProvider } from "./AnthropicProvider";
import { OpenAIProvider }    from "./OpenAIProvider";

export function createProvider(name: string, config: ProviderConfig): AIProvider {
  switch (name) {
    case "groq":      return new GroqProvider(config);
    case "ollama":    return new OllamaProvider(config);
    case "gemini":    return new GeminiProvider(config);
    case "anthropic": return new AnthropicProvider(config);
    case "openai":    return new OpenAIProvider(config);
    default:          throw new Error(`Unknown provider: ${name}`);
  }
}
