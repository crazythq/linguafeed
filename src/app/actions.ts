"use server";

import { redirect } from "next/navigation";
import { collectCustomFeed } from "@/lib/collect";
import { collectAndSave } from "@/lib/digest";
import { parseFeedUrl } from "@/lib/feeds";
import { readProgress, writeProgress } from "@/lib/progress";
import { vocabId } from "@/lib/storage";
import type { CategoryId, VocabEntry } from "@/lib/types";

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
  const check = parseFeedUrl(feedUrl);
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

export async function updateReadingPrefsAction(formData: FormData): Promise<void> {
  const progress = await readProgress();
  progress.maskTranslation = formData.get("maskTranslation") === "on";
  await writeProgress(progress);
  redirect("/settings");
}

export async function updateSubscriptionsAction(formData: FormData): Promise<void> {
  const progress = await readProgress();
  const sources = formData.getAll("source").map(String).filter(Boolean);
  const categories = formData.getAll("category").map(String).filter(Boolean) as CategoryId[];
  if (sources.length === 0) {
    redirect(`/settings?error=${encodeURIComponent("请至少保留一个官方源")}`);
  }
  if (categories.length === 0) {
    redirect(`/settings?error=${encodeURIComponent("请至少保留一个关注分类")}`);
  }
  progress.enabledSourceIds = sources;
  progress.enabledCategories = categories;
  await writeProgress(progress);
  redirect("/settings?ok=" + encodeURIComponent("订阅设置已保存"));
}

export async function toggleSubscriptionAction(formData: FormData): Promise<void> {
  const progress = await readProgress();
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const enable = String(formData.get("enable") ?? "") === "1";

  if (kind === "source") {
    const set = new Set(progress.enabledSourceIds);
    if (enable) {
      set.add(id);
    } else {
      set.delete(id);
    }
    if (set.size === 0) {
      redirect(`/settings?error=${encodeURIComponent("请至少保留一个官方源")}`);
    }
    progress.enabledSourceIds = [...set];
  } else if (kind === "category") {
    const set = new Set(progress.enabledCategories);
    if (enable) {
      set.add(id as CategoryId);
    } else {
      set.delete(id as CategoryId);
    }
    if (set.size === 0) {
      redirect(`/settings?error=${encodeURIComponent("请至少保留一个关注分类")}`);
    }
    progress.enabledCategories = [...set];
  } else {
    redirect(`/settings?error=${encodeURIComponent("未知的订阅项")}`);
  }

  await writeProgress(progress);
  redirect("/settings");
}

export async function collectPresetAction(): Promise<void> {
  try {
    const digest = await collectAndSave(null);
    const failNote =
      digest.failures.length > 0 ? `，${digest.failures.length} 个源失败` : "";
    redirect(
      `/settings?ok=${encodeURIComponent(`采集完成：${digest.items.length} 条昨日要闻${failNote}`)}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "采集失败";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
}
