"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArticleReader } from "@/components/article-reader";
import {
  getDigestOverlayServerSnapshot,
  getDigestOverlaySnapshot,
  subscribeDigestOverlay,
} from "@/lib/digest-overlay";
import { llmHeaders } from "@/lib/llm-headers";
import { useUserState } from "@/hooks/use-user-state";
import type { LearningMode, WordDefinition } from "@/lib/types";

export function OverlayArticleReader({
  id,
  mode,
  sentenceIndex,
  activeWord,
  savedTerms,
  maskTranslation,
}: {
  id: string;
  mode: LearningMode;
  sentenceIndex: number;
  activeWord: string | null;
  savedTerms: string[];
  maskTranslation: boolean;
}) {
  const { state, hydrated } = useUserState();
  const overlay = useSyncExternalStore(
    subscribeDigestOverlay,
    getDigestOverlaySnapshot,
    getDigestOverlayServerSnapshot,
  );
  const item = overlay?.items.find((entry) => entry.id === id) ?? null;
  const [fetched, setFetched] = useState<{ word: string; definition: WordDefinition } | null>(null);

  useEffect(() => {
    if (!activeWord || !item) {
      return;
    }
    const sentence = item.sentences[sentenceIndex]?.en ?? item.title;
    const word = activeWord;
    let cancelled = false;
    void fetch("/api/define", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...llmHeaders(state.llm),
      },
      body: JSON.stringify({ word, sentence }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { definition?: WordDefinition };
        if (!cancelled && payload.definition) {
          setFetched({ word, definition: payload.definition });
        }
      })
      .catch(() => {
        /* keep previous definition */
      });
    return () => {
      cancelled = true;
    };
  }, [activeWord, item, sentenceIndex, state.llm]);

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">正在读取本机简报…</p>;
  }
  if (!item) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">找不到这篇文章</h1>
        <p className="text-sm text-muted-foreground">它可能尚未采集，或来自已清除的自定义源。</p>
        <Link href="/" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm">
          返回今日
        </Link>
      </div>
    );
  }

  const definition = activeWord && fetched?.word === activeWord ? fetched.definition : null;

  return (
    <ArticleReader
      item={item}
      mode={mode}
      sentenceIndex={sentenceIndex}
      activeWord={activeWord}
      definition={definition}
      savedTerms={new Set(savedTerms)}
      maskTranslation={maskTranslation}
    />
  );
}
