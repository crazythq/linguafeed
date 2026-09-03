import type { LlmConfig } from "./types";

const TRANSLATE_TIMEOUT_MS = 12_000;

async function fetchJson(url: string, init: RequestInit, timeoutMs = TRANSLATE_TIMEOUT_MS): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function chatJson(llm: LlmConfig, system: string, user: string): Promise<string> {
  const base = llm.baseUrl.replace(/\/$/, "");
  const data = (await fetchJson(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llm.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: llm.model,
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  })) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  return content.replace(/```json\s*|```/g, "").trim();
}

export async function translateWithLlm(texts: string[], llm: LlmConfig): Promise<(string | null)[]> {
  if (texts.length === 0) {
    return [];
  }
  const base = llm.baseUrl.replace(/\/$/, "");
  const payload = {
    model: llm.model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You translate English news sentences into Simplified Chinese. Return a JSON array of strings in the same order. No commentary.",
      },
      {
        role: "user",
        content: JSON.stringify(texts),
      },
    ],
  };
  const data = (await fetchJson(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llm.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })) as { choices?: { message?: { content?: string } }[] };

  const content = data.choices?.[0]?.message?.content ?? "[]";
  const jsonText = content.replace(/```json\s*|```/g, "").trim();
  const parsed = JSON.parse(jsonText) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("LLM 未返回数组");
  }
  return texts.map((_, index) => {
    const value = parsed[index];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  });
}

async function translateWithMyMemory(text: string): Promise<string | null> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 500));
  url.searchParams.set("langpair", "en|zh-CN");
  const data = (await fetchJson(url.toString(), { method: "GET" })) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  const translated = data.responseData?.translatedText?.trim();
  if (!translated || data.responseStatus !== 200) {
    return null;
  }
  if (translated.toLowerCase() === text.slice(0, 500).toLowerCase()) {
    return null;
  }
  return translated;
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function translateSentences(
  sentences: string[],
  llm: LlmConfig | null,
): Promise<(string | null)[]> {
  if (sentences.length === 0) {
    return [];
  }
  if (llm) {
    try {
      return await translateWithLlm(sentences, llm);
    } catch {
      // fall through to free endpoint
    }
  }
  return mapPool(sentences, 3, async (sentence) => {
    try {
      return await translateWithMyMemory(sentence);
    } catch {
      return null;
    }
  });
}

export async function translateOne(text: string, llm: LlmConfig | null): Promise<string | null> {
  const [result] = await translateSentences([text], llm);
  return result ?? null;
}

export function llmFromHeaders(headers: Headers): LlmConfig | null {
  const apiKey = headers.get("x-llm-key")?.trim();
  if (!apiKey) {
    return null;
  }
  return {
    apiKey,
    baseUrl: headers.get("x-llm-base-url")?.trim() || "https://api.openai.com/v1",
    model: headers.get("x-llm-model")?.trim() || "gpt-4o-mini",
  };
}
