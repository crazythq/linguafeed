"use server";

import { redirect } from "next/navigation";
import { collectCustomFeed } from "@/lib/collect";
import { isOfficialFeedUrl } from "@/lib/feeds";
import { readProgress, writeProgress } from "@/lib/progress";
import { vocabId } from "@/lib/storage";
import type { VocabEntry } from "@/lib/types";

export async function addVocabAction(formData: FormData): Promise<void> {
  const term = String(formData.get("term") ?? "").trim();
  const type = String(formData.get("type") ?? "word") === "phrase" ? "phrase" : "word";
  const articleId = String(formData.get("articleId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/vocab");
  if (!term || !articleId) {
    redirect(returnTo);
  }
  const entry: VocabEntry = {
    id: vocabId(term, type, articleId),
    term,
    type,
    phonetic: String(formData.get("phonetic") ?? "") || null,
    definitionEn: String(formData.get("definitionEn") ?? "") || null,
    definitionZh: String(formData.get("definitionZh") ?? "") || null,
    sentence: String(formData.get("sentence") ?? ""),
    articleId,
    articleTitle: String(formData.get("articleTitle") ?? ""),
    createdAt: new Date().toISOString(),
  };
  const progress = await readProgress();
  if (!progress.vocab.some((item) => item.id === entry.id)) {
    progress.vocab = [entry, ...progress.vocab];
    await writeProgress(progress);
  }
  redirect(returnTo);
}

export async function removeVocabAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const progress = await readProgress();
  progress.vocab = progress.vocab.filter((item) => item.id !== id);
  await writeProgress(progress);
  redirect("/vocab");
}

export async function collectCustomAction(formData: FormData): Promise<void> {
  const feedUrl = String(formData.get("feedUrl") ?? "").trim();
  const check = isOfficialFeedUrl(feedUrl);
  if (!check.ok) {
    redirect(`/settings?error=${encodeURIComponent(check.error)}`);
  }
  try {
    const result = await collectCustomFeed(feedUrl, null);
    const progress = await readProgress();
    const ids = new Set(progress.customItems.map((item) => item.id));
    progress.customItems = [...result.items.filter((item) => !ids.has(item.id)), ...progress.customItems];
    if (!progress.customFeeds.some((feed) => feed.url === feedUrl)) {
      progress.customFeeds = [
        ...progress.customFeeds,
        { id: feedUrl, url: feedUrl, name: result.sourceName, enabled: true },
      ];
    }
    await writeProgress(progress);
    redirect(`/settings?ok=${encodeURIComponent(`已加入 ${result.items.length} 条，来自 ${result.sourceName}`)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "采集失败";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
}
