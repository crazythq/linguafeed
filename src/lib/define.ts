import { chatJson, translateOne } from "./translate";
import type { LlmConfig, WordDefinition } from "./types";

type DictionaryMeaning = {
  definitions?: { definition?: string; example?: string }[];
};

type DictionaryEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: DictionaryMeaning[];
};

export async function defineWord(
  word: string,
  sentence: string,
  llm: LlmConfig | null,
): Promise<WordDefinition> {
  const cleaned = word.trim().replace(/^[^\w]+|[^\w]+$/g, "");
  const fallback: WordDefinition = {
    word: cleaned,
    phonetic: null,
    definitionEn: null,
    definitionZh: null,
    example: sentence || null,
  };

  if (llm) {
    try {
      const result = await chatJson(
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
      // dictionary fallback
    }
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleaned.toLowerCase())}`,
      { signal: AbortSignal.timeout(4_000) },
    );
    if (response.ok) {
      const data = (await response.json()) as DictionaryEntry[];
      const entry = data[0];
      const definitionEn = entry?.meanings?.[0]?.definitions?.[0]?.definition ?? null;
      const example = entry?.meanings?.[0]?.definitions?.[0]?.example ?? sentence ?? null;
      const phonetic = entry?.phonetic || entry?.phonetics?.find((item) => item.text)?.text || null;
      const definitionZh = definitionEn ? await translateOne(definitionEn, llm) : null;
      return {
        word: cleaned,
        phonetic,
        definitionEn,
        definitionZh,
        example,
      };
    }
  } catch {
    // ignore
  }

  const definitionZh = await translateOne(`the word "${cleaned}" in: ${sentence.slice(0, 160)}`, llm);
  return { ...fallback, definitionZh };
}
