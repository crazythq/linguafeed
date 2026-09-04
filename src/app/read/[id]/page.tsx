import { ArticleReader } from "@/components/article-reader";
import { OverlayArticleReader } from "@/components/overlay-article-reader";
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
      <OverlayArticleReader
        id={id}
        mode={asMode(query.mode)}
        sentenceIndex={Number(query.s ?? "0") || 0}
        activeWord={query.w?.trim() || null}
        savedTerms={progress.vocab.filter((entry) => entry.articleId === id).map((entry) => entry.term.toLowerCase())}
        maskTranslation={progress.maskTranslation}
      />
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
