import Link from "next/link";
import { ArticleReader } from "@/components/article-reader";
import { defineWord } from "@/lib/define";
import { loadBestDigest } from "@/lib/digest";
import { readProgress } from "@/lib/progress";
import type { LearningMode } from "@/lib/types";

export const dynamic = "force-dynamic";

function asMode(value: string | undefined): LearningMode {
  if (value === "immersive" || value === "pre-vocab" || value === "quiz" || value === "bilingual") {
    return value;
  }
  return "bilingual";
}

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ w?: string; s?: string; mode?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [{ digest }, progress] = await Promise.all([loadBestDigest(), readProgress()]);
  const item = digest?.items.find((entry) => entry.id === id) ?? progress.customItems.find((entry) => entry.id === id) ?? null;
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

  const word = query.w?.trim() || null;
  const sentenceIndex = Number(query.s ?? "0") || 0;
  const sentence = item.sentences[sentenceIndex]?.en ?? item.title;
  const definition = word ? await defineWord(word, sentence, null) : null;
  const savedTerms = new Set(progress.vocab.filter((entry) => entry.articleId === id).map((entry) => entry.term.toLowerCase()));

  return (
    <ArticleReader
      item={item}
      mode={asMode(query.mode)}
      sentenceIndex={sentenceIndex}
      activeWord={word}
      definition={definition}
      savedTerms={savedTerms}
      maskTranslation={progress.maskTranslation}
    />
  );
}
