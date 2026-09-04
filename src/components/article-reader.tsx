"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DictionaryFloat } from "@/components/dictionary-float";
import { sourceById } from "@/lib/feeds";
import { tokenize } from "@/lib/sentences";
import type { DigestItem, LearningMode } from "@/lib/types";

type ActiveWord = {
  text: string;
  sentenceIndex: number;
  tokenIndex: number;
};

export function ArticleReader({
  item,
  mode,
  sentenceIndex,
  activeWord,
  savedTerms,
  maskTranslation,
}: {
  item: DigestItem;
  mode: LearningMode;
  sentenceIndex: number;
  activeWord: string | null;
  savedTerms: string[];
  maskTranslation: boolean;
}) {
  const source = sourceById(item.sourceId);
  const showTranslation = mode !== "immersive";
  const upcoming = mode === "pre-vocab" || mode === "quiz";
  const saved = new Set(savedTerms);
  const [active, setActive] = useState<ActiveWord | null>(() =>
    activeWord
      ? { text: activeWord, sentenceIndex, tokenIndex: -1 }
      : null,
  );

  return (
    <article className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{source?.name ?? item.sourceId}</Badge>
          <Badge variant="outline">{item.category}</Badge>
        </div>
        <h1 className="font-heading text-2xl leading-snug font-semibold">{item.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{new Date(item.publishedAt).toLocaleString("zh-CN", { hour12: false })}</span>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            阅读原文 <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      <ModeBar id={item.id} mode={mode} />

      {upcoming ? (
        <p className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
          该模式即将推出。当前仍可对照阅读：点单词查看释义并加入生词本。
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">点击英文单词，释义会在词旁浮动显示。</p>

      <div className="space-y-5">
        {item.sentences.map((entry, index) => (
          <section key={`${item.id}-${index}`} className="space-y-1.5">
            <p className="font-serif text-[1.05rem] leading-8 text-foreground">
              {(() => {
                const tokens = tokenize(entry.en);
                let shownActive = false;
                return tokens.map((token, tokenIndex) => {
                  if (!token.isWord) {
                    return <span key={`${index}-${tokenIndex}`}>{token.text}</span>;
                  }
                  const matchesActive =
                    Boolean(active) &&
                    index === active!.sentenceIndex &&
                    token.text.toLowerCase() === active!.text.toLowerCase() &&
                    (active!.tokenIndex === -1 || tokenIndex === active!.tokenIndex);
                  const isActive = matchesActive && !shownActive;
                  if (isActive) {
                    shownActive = true;
                  }
                  return (
                    <span key={`${index}-${tokenIndex}`} className="relative inline">
                      <button
                        type="button"
                        id={`word-${index}-${tokenIndex}`}
                        onClick={() => {
                          setActive({ text: token.text, sentenceIndex: index, tokenIndex });
                        }}
                        className={`rounded-sm px-0.5 underline decoration-dotted decoration-primary/40 hover:bg-primary/10 ${
                          saved.has(token.text.toLowerCase()) ? "bg-primary/10 text-primary" : ""
                        } ${isActive ? "bg-primary/15 text-primary ring-1 ring-primary/30" : ""}`}
                      >
                        {token.text}
                      </button>
                      {isActive ? (
                        <DictionaryFloat
                          anchorId={`word-${index}-${tokenIndex}`}
                          word={token.text}
                          sentence={entry.en}
                          articleId={item.id}
                          articleTitle={item.title}
                          mode={mode}
                          sentenceIndex={index}
                          onClose={() => setActive(null)}
                        />
                      ) : null}
                    </span>
                  );
                });
              })()}
            </p>
            {showTranslation ? (
              <p
                tabIndex={maskTranslation ? 0 : undefined}
                title={maskTranslation ? "移入或点按查看译文" : undefined}
                className={
                  maskTranslation
                    ? "cursor-help rounded-md bg-muted/90 px-1 text-sm leading-7 text-transparent italic outline-none transition-colors hover:bg-transparent hover:text-muted-foreground/55 focus:bg-transparent focus:text-muted-foreground/55 active:bg-transparent active:text-muted-foreground/55"
                    : "text-sm leading-7 text-muted-foreground/55 italic"
                }
              >
                {entry.zh ?? "暂无译文"}
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}

function ModeBar({ id, mode }: { id: string; mode: LearningMode }) {
  const options: { id: LearningMode; label: string; ready: boolean }[] = [
    { id: "bilingual", label: "对照阅读", ready: true },
    { id: "immersive", label: "沉浸阅读", ready: true },
    { id: "pre-vocab", label: "先学后读", ready: false },
    { id: "quiz", label: "读后测验", ready: false },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <Link
          key={option.id}
          href={`/read/${id}?mode=${option.id}`}
          className={`rounded-full border px-3 py-1 text-xs ${
            mode === option.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
          }`}
        >
          {option.label}
          {option.ready ? "" : " · 即将推出"}
        </Link>
      ))}
    </div>
  );
}
