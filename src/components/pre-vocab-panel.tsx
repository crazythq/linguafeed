"use client";

import Link from "next/link";
import { useWordDefinition } from "@/hooks/use-word-definition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreVocabTerm } from "@/lib/pre-vocab";

export function PreVocabPanel({
  articleId,
  articleTitle,
  terms,
  savedTerms,
}: {
  articleId: string;
  articleTitle: string;
  terms: PreVocabTerm[];
  savedTerms: string[];
}) {
  const saved = new Set(savedTerms);
  const readHref = `/read/${articleId}?mode=pre-vocab&stage=read`;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          先看这篇里的关键词，再对照阅读。不必学完，随时可以开始。
        </p>
        <Link
          href={readHref}
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground"
        >
          开始阅读
        </Link>
      </div>

      {terms.length === 0 ? (
        <p className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
          这篇没有可先学的关键词，可以直接开始阅读。
        </p>
      ) : (
        <div className="grid gap-3">
          {terms.map((entry) => (
            <PreVocabCard
              key={entry.term.toLowerCase()}
              articleId={articleId}
              articleTitle={articleTitle}
              term={entry}
              alreadySaved={saved.has(entry.term.toLowerCase())}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PreVocabCard({
  articleId,
  articleTitle,
  term,
  alreadySaved,
}: {
  articleId: string;
  articleTitle: string;
  term: PreVocabTerm;
  alreadySaved: boolean;
}) {
  const { definition, loading } = useWordDefinition(term.term, term.sentence);
  const shown = definition ?? {
    word: term.term,
    phonetic: null,
    definitionEn: null,
    definitionZh: null,
    example: term.sentence,
  };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">
          {shown.word}
          {shown.phonetic ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">{shown.phonetic}</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">正在查询释义…</p>
        ) : (
          <>
            <p className="text-sm">{shown.definitionEn ?? "暂无英文释义，仍可收藏。"}</p>
            <p className="text-sm text-muted-foreground">{shown.definitionZh ?? "暂无中文释义"}</p>
            {shown.example ? (
              <p className="text-xs leading-5 text-muted-foreground">例句：{shown.example}</p>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">例句：{term.sentence}</p>
            )}
          </>
        )}
        {alreadySaved ? (
          <p className="text-xs text-primary">已在生词本</p>
        ) : (
          <form action="/vocab/add" method="post">
            <input type="hidden" name="term" value={shown.word} />
            <input type="hidden" name="type" value="word" />
            <input type="hidden" name="phonetic" value={shown.phonetic ?? ""} />
            <input type="hidden" name="definitionEn" value={shown.definitionEn ?? ""} />
            <input type="hidden" name="definitionZh" value={shown.definitionZh ?? ""} />
            <input type="hidden" name="sentence" value={term.sentence} />
            <input type="hidden" name="articleId" value={articleId} />
            <input type="hidden" name="articleTitle" value={articleTitle} />
            <input type="hidden" name="returnTo" value={`/read/${articleId}?mode=pre-vocab`} />
            <button type="submit" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm">
              加入生词本
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
