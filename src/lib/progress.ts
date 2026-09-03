import { cookies } from "next/headers";
import type { CustomFeed, DigestItem, VocabEntry } from "./types";

const COOKIE_NAME = "chendu-progress";

export type ProgressCookie = {
  vocab: VocabEntry[];
  customItems: DigestItem[];
  customFeeds: CustomFeed[];
  maskTranslation: boolean;
};

export const emptyProgress = (): ProgressCookie => ({
  vocab: [],
  customItems: [],
  customFeeds: [],
  maskTranslation: false,
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

function parseProgress(raw: string): ProgressCookie {
  const parsed = JSON.parse(raw) as Partial<ProgressCookie>;
  return {
    vocab: Array.isArray(parsed.vocab) ? parsed.vocab : [],
    customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
    customFeeds: Array.isArray(parsed.customFeeds) ? parsed.customFeeds : [],
    maskTranslation: Boolean(parsed.maskTranslation),
  };
}

export async function writeProgress(progress: ProgressCookie): Promise<void> {
  const jar = await cookies();
  const trimmed: ProgressCookie = {
    vocab: progress.vocab.slice(0, 40),
    customItems: progress.customItems.slice(0, 8),
    customFeeds: progress.customFeeds.slice(0, 8),
    maskTranslation: Boolean(progress.maskTranslation),
  };
  jar.set(COOKIE_NAME, JSON.stringify(trimmed), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
