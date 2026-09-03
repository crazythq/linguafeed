import { cookies } from "next/headers";
import {
  DEFAULT_ENABLED_CATEGORIES,
  DEFAULT_ENABLED_SOURCE_IDS,
} from "./feeds";
import type { CategoryId, CustomFeed, DigestItem, VocabEntry } from "./types";

const COOKIE_NAME = "chendu-progress";

export type ProgressCookie = {
  vocab: VocabEntry[];
  customItems: DigestItem[];
  customFeeds: CustomFeed[];
  maskTranslation: boolean;
  enabledSourceIds: string[];
  enabledCategories: CategoryId[];
};

export const emptyProgress = (): ProgressCookie => ({
  vocab: [],
  customItems: [],
  customFeeds: [],
  maskTranslation: false,
  enabledSourceIds: [...DEFAULT_ENABLED_SOURCE_IDS],
  enabledCategories: [...DEFAULT_ENABLED_CATEGORIES],
});

export async function readProgress(): Promise<ProgressCookie> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) {
    return emptyProgress();
  }
  try {
    return parseProgress(raw);
  } catch {
    try {
      return parseProgress(decodeURIComponent(raw));
    } catch {
      return emptyProgress();
    }
  }
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : [...fallback];
}

function parseProgress(raw: string): ProgressCookie {
  const parsed = JSON.parse(raw) as Partial<ProgressCookie>;
  return {
    vocab: Array.isArray(parsed.vocab) ? parsed.vocab : [],
    customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
    customFeeds: Array.isArray(parsed.customFeeds) ? parsed.customFeeds : [],
    maskTranslation: Boolean(parsed.maskTranslation),
    enabledSourceIds: asStringArray(parsed.enabledSourceIds, DEFAULT_ENABLED_SOURCE_IDS),
    enabledCategories: asStringArray(
      parsed.enabledCategories,
      DEFAULT_ENABLED_CATEGORIES,
    ) as CategoryId[],
  };
}

export async function writeProgress(progress: ProgressCookie): Promise<void> {
  const jar = await cookies();
  const trimmed: ProgressCookie = {
    vocab: progress.vocab.slice(0, 40),
    customItems: progress.customItems.slice(0, 8),
    customFeeds: progress.customFeeds.slice(0, 8),
    maskTranslation: Boolean(progress.maskTranslation),
    enabledSourceIds:
      progress.enabledSourceIds.length > 0
        ? progress.enabledSourceIds
        : [...DEFAULT_ENABLED_SOURCE_IDS],
    enabledCategories:
      progress.enabledCategories.length > 0
        ? progress.enabledCategories
        : [...DEFAULT_ENABLED_CATEGORIES],
  };
  jar.set(COOKIE_NAME, JSON.stringify(trimmed), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
