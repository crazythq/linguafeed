import type { LlmSettings } from "./types";

export function llmHeaders(llm: LlmSettings): HeadersInit {
  if (!llm.apiKey.trim()) {
    return {};
  }
  return {
    "x-llm-key": llm.apiKey.trim(),
    "x-llm-base-url": llm.baseUrl.trim() || "https://api.openai.com/v1",
    "x-llm-model": llm.model.trim() || "gpt-4o-mini",
  };
}
