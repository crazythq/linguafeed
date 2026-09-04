"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArticleReader } from "@/components/article-reader";
import { useDigestOverlay } from "@/hooks/use-digest-overlay";
import type { LearningMode } from "@/lib/types";

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
  const overlay = useDigestOverlay();
  const item = overlay?.items.find((entry) => entry.id === id) ?? null;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) {
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

  return (
    <ArticleReader
      item={item}
      mode={mode}
      sentenceIndex={sentenceIndex}
      activeWord={activeWord}
      savedTerms={savedTerms}
      maskTranslation={maskTranslation}
    />
  );
}
