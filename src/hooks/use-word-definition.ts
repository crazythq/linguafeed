"use client";

import { useEffect, useState } from "react";
import { useUserState } from "@/hooks/use-user-state";
import { llmHeaders } from "@/lib/llm-headers";
import type { WordDefinition } from "@/lib/types";

const definitionCache = new Map<string, WordDefinition>();

export function useWordDefinition(word: string, sentence: string): {
  definition: WordDefinition | null;
  loading: boolean;
} {
  const { state } = useUserState();
  const cacheKey = word.toLowerCase();
  const [definition, setDefinition] = useState<WordDefinition | null>(
    () => definitionCache.get(cacheKey) ?? null,
  );
  const [loading, setLoading] = useState(() => !definitionCache.has(cacheKey));

  useEffect(() => {
    const cached = definitionCache.get(cacheKey);
    if (cached) {
      setDefinition(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setDefinition(null);
    setLoading(true);

    void (async () => {
      try {
        const response = await fetch("/api/define", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...llmHeaders(state.llm) },
          body: JSON.stringify({ word, sentence }),
          signal: AbortSignal.timeout(8_000),
        });
        const data = (await response.json()) as { definition?: WordDefinition; error?: string };
        if (!response.ok || !data.definition) {
          throw new Error(data.error ?? "查词失败");
        }
        definitionCache.set(cacheKey, data.definition);
        if (!cancelled) {
          setDefinition(data.definition);
        }
      } catch {
        if (cancelled) {
          return;
        }
        setDefinition({
          word,
          phonetic: null,
          definitionEn: null,
          definitionZh: null,
          example: sentence,
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, sentence, state.llm.apiKey, state.llm.baseUrl, state.llm.model, word]);

  return { definition, loading };
}
