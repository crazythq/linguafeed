import { stripHtml } from "./html";
import { chatJson, translateOne } from "./translate";
import type { LlmConfig, WordDefinition } from "./types";

export type DefineDeps = {
  fetchImpl?: typeof fetch;
  translate?: (text: string, llm: LlmConfig | null) => Promise<string | null>;
  chat?: typeof chatJson;
};

type WiktionarySense = {
  definition?: string;
  examples?: string[];
};

type WiktionaryEntry = {
  partOfSpeech?: string;
  definitions?: WiktionarySense[];
};

const SKIP_POS = new Set(["symbol", "character", "punctuation", "letter"]);
const WIKTIONARY_UA =
  "LinguaFeed/0.1 (https://github.com/crazythq/linguafeed; educational dictionary lookup)";

function isJunkDefinition(text: string): boolean {
  return /^ISO 639-\d language code/i.test(text);
}

function plainText(html: string): string {
  return stripHtml(html)
    .replace(/ +([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseWiktionaryDefinition(
  data: unknown,
): { definitionEn: string; example: string | null } | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const en = (data as { en?: WiktionaryEntry[] }).en;
  if (!Array.isArray(en)) {
    return null;
  }

  for (const entry of en) {
    const pos = (entry.partOfSpeech ?? "").toLowerCase();
    if (SKIP_POS.has(pos)) {
      continue;
    }
    for (const sense of entry.definitions ?? []) {
      const definitionEn = sense.definition ? plainText(sense.definition) : "";
      if (!definitionEn || isJunkDefinition(definitionEn)) {
        continue;
      }
      const example = sense.examples?.[0] ? plainText(sense.examples[0]) : null;
      return { definitionEn, example };
    }
  }
  return null;
}

async function lookupWiktionary(
  word: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ definitionEn: string; example: string | null } | null> {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word.toLowerCase())}`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": WIKTIONARY_UA,
    },
    signal,
    cache: "force-cache",
  });
  if (!response.ok) {
    return null;
  }
  return parseWiktionaryDefinition(await response.json());
}

export async function defineWord(
  word: string,
  sentence: string,
  llm: LlmConfig | null,
  deps: DefineDeps = {},
): Promise<WordDefinition> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const translate = deps.translate ?? translateOne;
  const chat = deps.chat ?? chatJson;
  const cleaned = word.trim().replace(/^[^\w]+|[^\w]+$/g, "");
  const fallback: WordDefinition = {
    word: cleaned,
    phonetic: null,
    definitionEn: null,
    definitionZh: null,
    example: sentence || null,
  };

  if (!cleaned) {
    return fallback;
  }

  try {
    const english = await lookupWiktionary(cleaned, fetchImpl, AbortSignal.timeout(3_000));
    if (english) {
      const definitionZh = await translate(english.definitionEn, llm);
      return {
        word: cleaned,
        phonetic: null,
        definitionEn: english.definitionEn,
        definitionZh,
        example: english.example ?? sentence ?? null,
      };
    }
  } catch {
    // LLM / sentence-context fallback
  }

  if (llm) {
    try {
      const result = await chat(
        llm,
        "You help Chinese programmers learn English news vocabulary. Return JSON only.",
        `Define the word "${cleaned}" as used in: ${sentence}\nReturn {"phonetic": string|null, "definitionEn": string, "definitionZh": string}`,
      );
      const parsed = JSON.parse(result) as Partial<WordDefinition>;
      return {
        word: cleaned,
        phonetic: parsed.phonetic ?? null,
        definitionEn: parsed.definitionEn ?? null,
        definitionZh: parsed.definitionZh ?? null,
        example: sentence || null,
      };
    } catch {
      // ignore
    }
  }

  const definitionZh = await translate(
    `the word "${cleaned}" in: ${sentence.slice(0, 160)}`,
    llm,
  );
  return { ...fallback, definitionZh };
}
