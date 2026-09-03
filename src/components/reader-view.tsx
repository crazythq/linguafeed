"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserState } from "@/hooks/use-user-state";
import { sourceById } from "@/lib/feeds";
import { llmHeaders } from "@/lib/llm-headers";
import { isPhrase, normalizeTerm, tokenize } from "@/lib/sentences";
import { vocabId } from "@/lib/storage";
import type { Digest, DigestItem, LearningMode, VocabEntry, WordDefinition } from "@/lib/types";

type DigestResponse = { digest: Digest | null };

export function ReaderView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, update } = useUserState();
  const [item, setItem] = useState<DigestItem | null | undefined>(undefined);
  const [lookup, setLookup] = useState<WordDefinition | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [phraseDraft, setPhraseDraft] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/digest")
      .then((response) => response.json() as Promise<DigestResponse>)
      .then((data) => {
        if (cancelled) {
          return;
        }
        const found =
          data.digest?.items.find((entry) => entry.id === id) ??
          loadUserStateCustom(id);
        setItem(found ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setItem(loadUserStateCustom(id));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const savedTerms = useMemo(
    () => new Set(state.vocab.filter((entry) => entry.articleId === id).map((entry) => entry.term.toLowerCase())),
    [state.vocab, id],
  );

  const showTranslation = state.learningMode === "immersive" ? false : state.showTranslation;
  const upcoming = state.learningMode === "pre-vocab" || state.learningMode === "quiz";

  async function onWordClick(word: string, sentence: string) {
    setLookupLoading(true);
    setLookup(null);
    try {
      const response = await fetch("/api/define", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...llmHeaders(state.llm) },
        body: JSON.stringify({ word, sentence }),
      });
      const data = (await response.json()) as { definition?: WordDefinition; error?: string };
      if (!response.ok || !data.definition) {
        throw new Error(data.error ?? "查词失败");
      }
      setLookup(data.definition);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "查词失败");
      setLookup({
        word,
        phonetic: null,
        definitionEn: null,
        definitionZh: null,
        example: sentence,
      });
    } finally {
      setLookupLoading(false);
    }
  }

  function saveVocab(entry: Omit<VocabEntry, "id" | "createdAt">) {
    const idValue = vocabId(entry.term, entry.type, entry.articleId);
    update((current) => {
      if (current.vocab.some((item) => item.id === idValue)) {
        return current;
      }
      return {
        ...current,
        vocab: [
          {
            ...entry,
            id: idValue,
            createdAt: new Date().toISOString(),
          },
          ...current.vocab,
        ],
      };
    });
    toast.success(entry.type === "phrase" ? "短语已加入生词本" : "单词已加入生词本");
  }

  function onSelectEnd() {
    const selection = window.getSelection()?.toString() ?? "";
    const term = normalizeTerm(selection);
    if (isPhrase(term) && term.length < 80) {
      setPhraseDraft(term);
    } else {
      setPhraseDraft("");
    }
  }

  if (item === undefined) {
    return <p className="text-sm text-muted-foreground">正在打开对照阅读…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">找不到这篇文章</h1>
        <p className="text-sm text-muted-foreground">它可能尚未采集，或来自已清除的自定义源。</p>
        <Button render={<Link href="/" />} variant="outline">
          返回今日
        </Button>
      </div>
    );
  }

  const source = sourceById(item.sourceId);

  return (
    <article className="space-y-6" onMouseUp={onSelectEnd} onTouchEnd={onSelectEnd}>
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

      <ModeBar
        mode={state.learningMode}
        showTranslation={state.showTranslation}
        onMode={(learningMode) =>
          update((current) => ({
            ...current,
            learningMode,
            showTranslation: learningMode === "immersive" ? false : learningMode === "bilingual" ? true : current.showTranslation,
          }))
        }
        onToggleTranslation={(showTranslation) => update((current) => ({ ...current, showTranslation }))}
      />

      {upcoming ? (
        <p className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
          该模式即将推出。当前仍可使用对照阅读：点词查义、划选短语。
        </p>
      ) : null}

      <div className="space-y-5">
        {item.sentences.map((sentence, index) => (
          <section key={`${item.id}-${index}`} className="space-y-1.5">
            <p className="font-serif text-[1.05rem] leading-8 text-foreground">
              {tokenize(sentence.en).map((token, tokenIndex) =>
                token.isWord ? (
                  <button
                    key={`${index}-${tokenIndex}`}
                    type="button"
                    className={`rounded-sm px-0.5 hover:bg-primary/10 ${
                      savedTerms.has(token.text.toLowerCase()) ? "bg-primary/10 text-primary underline decoration-dotted" : ""
                    }`}
                    onClick={() => onWordClick(token.text, sentence.en)}
                  >
                    {token.text}
                  </button>
                ) : (
                  <span key={`${index}-${tokenIndex}`}>{token.text}</span>
                ),
              )}
            </p>
            {showTranslation ? (
              <p className="text-sm leading-7 text-muted-foreground">{sentence.zh ?? "暂无译文"}</p>
            ) : null}
          </section>
        ))}
      </div>

      {phraseDraft ? (
        <div className="sticky bottom-20 z-20 flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm sm:bottom-6">
          <p className="truncate text-sm">
            短语：<span className="font-medium">{phraseDraft}</span>
          </p>
          <Button
            size="sm"
            onClick={() => {
              saveVocab({
                term: phraseDraft,
                type: "phrase",
                phonetic: null,
                definitionEn: null,
                definitionZh: null,
                sentence: item.sentences.find((sentence) => sentence.en.includes(phraseDraft))?.en ?? item.title,
                articleId: item.id,
                articleTitle: item.title,
              });
              setPhraseDraft("");
            }}
          >
            加入短语
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{lookupLoading ? "正在查词…" : "词典"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {lookup ? (
            <>
              <p className="text-lg font-medium">
                {lookup.word}{" "}
                {lookup.phonetic ? <span className="text-sm font-normal text-muted-foreground">{lookup.phonetic}</span> : null}
              </p>
              <p>{lookup.definitionEn ?? "暂无英文释义，仍可收藏。"}</p>
              <p className="text-muted-foreground">{lookup.definitionZh ?? "暂无中文释义"}</p>
              {lookup.example ? <p className="text-xs leading-5 text-muted-foreground">例句：{lookup.example}</p> : null}
              <Button
                size="sm"
                onClick={() =>
                  saveVocab({
                    term: lookup.word,
                    type: "word",
                    phonetic: lookup.phonetic,
                    definitionEn: lookup.definitionEn,
                    definitionZh: lookup.definitionZh,
                    sentence: lookup.example ?? "",
                    articleId: item.id,
                    articleTitle: item.title,
                  })
                }
              >
                加入生词本
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">点击英文单词查看释义；划选两个以上单词可收藏短语。</p>
          )}
        </CardContent>
      </Card>
    </article>
  );
}

function loadUserStateCustom(id: string): DigestItem | null {
  try {
    const raw = window.localStorage.getItem("chendu-user-state-v1");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { customItems?: DigestItem[] };
    return parsed.customItems?.find((item) => item.id === id) ?? null;
  } catch {
    return null;
  }
}

function ModeBar({
  mode,
  showTranslation,
  onMode,
  onToggleTranslation,
}: {
  mode: LearningMode;
  showTranslation: boolean;
  onMode: (mode: LearningMode) => void;
  onToggleTranslation: (value: boolean) => void;
}) {
  const options: { id: LearningMode; label: string; ready: boolean }[] = [
    { id: "bilingual", label: "对照阅读", ready: true },
    { id: "immersive", label: "沉浸阅读", ready: true },
    { id: "pre-vocab", label: "先学后读", ready: false },
    { id: "quiz", label: "读后测验", ready: false },
  ];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onMode(option.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              mode === option.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {option.label}
            {option.ready ? "" : " · 即将推出"}
          </button>
        ))}
      </div>
      {mode !== "immersive" ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showTranslation}
            onChange={(event) => onToggleTranslation(event.target.checked)}
          />
          显示中文译文
        </label>
      ) : null}
    </div>
  );
}
