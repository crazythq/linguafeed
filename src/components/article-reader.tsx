import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sourceById } from "@/lib/feeds";
import { tokenize } from "@/lib/sentences";
import type { DigestItem, LearningMode, WordDefinition } from "@/lib/types";

export function ArticleReader({
  item,
  mode,
  sentenceIndex,
  definition,
  savedTerms,
}: {
  item: DigestItem;
  mode: LearningMode;
  sentenceIndex: number;
  definition: WordDefinition | null;
  savedTerms: Set<string>;
}) {
  const source = sourceById(item.sourceId);
  const showTranslation = mode !== "immersive";
  const upcoming = mode === "pre-vocab" || mode === "quiz";
  const sentence = item.sentences[sentenceIndex]?.en ?? item.sentences[0]?.en ?? item.title;

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

      <div className="space-y-5">
        {item.sentences.map((entry, index) => (
          <section key={`${item.id}-${index}`} className="space-y-1.5">
            <p className="font-serif text-[1.05rem] leading-8 text-foreground">
              {tokenize(entry.en).map((token, tokenIndex) =>
                token.isWord ? (
                  <Link
                    key={`${index}-${tokenIndex}`}
                    href={`/read/${item.id}?mode=${mode}&w=${encodeURIComponent(token.text)}&s=${index}#dictionary`}
                    className={`rounded-sm px-0.5 underline decoration-dotted decoration-primary/40 hover:bg-primary/10 ${
                      savedTerms.has(token.text.toLowerCase()) ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    {token.text}
                  </Link>
                ) : (
                  <span key={`${index}-${tokenIndex}`}>{token.text}</span>
                ),
              )}
            </p>
            {showTranslation ? (
              <p className="text-sm leading-7 text-muted-foreground">{entry.zh ?? "暂无译文"}</p>
            ) : null}
          </section>
        ))}
      </div>

      <Card id="dictionary">
        <CardHeader>
          <CardTitle className="text-sm">词典</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {definition ? (
            <>
              <p className="text-lg font-medium">
                {definition.word}{" "}
                {definition.phonetic ? (
                  <span className="text-sm font-normal text-muted-foreground">{definition.phonetic}</span>
                ) : null}
              </p>
              <p>{definition.definitionEn ?? "暂无英文释义，仍可收藏。"}</p>
              <p className="text-muted-foreground">{definition.definitionZh ?? "暂无中文释义"}</p>
              {definition.example ? (
                <p className="text-xs leading-5 text-muted-foreground">例句：{definition.example}</p>
              ) : null}
              <form action="/vocab/add" method="post">
                <input type="hidden" name="term" value={definition.word} />
                <input type="hidden" name="type" value="word" />
                <input type="hidden" name="phonetic" value={definition.phonetic ?? ""} />
                <input type="hidden" name="definitionEn" value={definition.definitionEn ?? ""} />
                <input type="hidden" name="definitionZh" value={definition.definitionZh ?? ""} />
                <input type="hidden" name="sentence" value={definition.example ?? sentence} />
                <input type="hidden" name="articleId" value={item.id} />
                <input type="hidden" name="articleTitle" value={item.title} />
                <input
                  type="hidden"
                  name="returnTo"
                  value={`/read/${item.id}?mode=${mode}&w=${encodeURIComponent(definition.word)}&s=${sentenceIndex}#dictionary`}
                />
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground"
                >
                  加入生词本
                </button>
              </form>
            </>
          ) : (
            <p className="text-muted-foreground">点击英文单词查看释义，再加入生词本。</p>
          )}
        </CardContent>
      </Card>
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
