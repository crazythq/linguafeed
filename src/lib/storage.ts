import type { CategoryId, DigestItem, LearningMode, UserState, VocabEntry } from "./types";
import { DEFAULT_ENABLED_CATEGORIES, DEFAULT_ENABLED_SOURCE_IDS } from "./feeds";

export const STORAGE_KEY = "chendu-user-state-v1";

export const defaultUserState = (): UserState => ({
  version: 1,
  enabledSourceIds: [...DEFAULT_ENABLED_SOURCE_IDS],
  enabledCategories: [...DEFAULT_ENABLED_CATEGORIES],
  customFeeds: [],
  customItems: [],
  vocab: [],
  readIds: [],
  learningMode: "bilingual",
  showTranslation: true,
  llm: {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
});

export const SERVER_USER_STATE: UserState = defaultUserState();

let cachedRaw: string | null | undefined;
let cachedState: UserState = SERVER_USER_STATE;

function parseState(raw: string | null): UserState {
  if (!raw) {
    return SERVER_USER_STATE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<UserState>;
    return { ...defaultUserState(), ...parsed, version: 1 };
  } catch {
    return SERVER_USER_STATE;
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getUserStateSnapshot(): UserState {
  if (!isBrowser()) {
    return SERVER_USER_STATE;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedState;
  }
  cachedRaw = raw;
  cachedState = parseState(raw);
  return cachedState;
}

export function loadUserState(): UserState {
  return getUserStateSnapshot();
}

export function saveUserState(state: UserState): void {
  if (!isBrowser()) {
    return;
  }
  const raw = JSON.stringify(state);
  cachedRaw = raw;
  cachedState = state;
  window.localStorage.setItem(STORAGE_KEY, raw);
}

export function exportUserState(state: UserState, includeKey: boolean): string {
  const payload = {
    ...state,
    llm: {
      ...state.llm,
      apiKey: includeKey ? state.llm.apiKey : "",
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function importUserState(raw: string): UserState {
  const parsed = JSON.parse(raw) as Partial<UserState>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSON 格式不正确");
  }
  return { ...defaultUserState(), ...parsed, version: 1 };
}

export function vocabId(term: string, type: VocabEntry["type"], articleId: string): string {
  return `${type}:${term.toLowerCase()}:${articleId}`;
}

export function filterVisibleItems(
  items: DigestItem[],
  enabledSourceIds: string[],
  enabledCategories: CategoryId[],
): DigestItem[] {
  return items.filter((item) => {
    const sourceOk = item.custom || enabledSourceIds.includes(item.sourceId);
    const categoryOk = enabledCategories.includes(item.category);
    return sourceOk && categoryOk;
  });
}

export function modeLabel(mode: LearningMode): string {
  switch (mode) {
    case "bilingual":
      return "对照阅读";
    case "immersive":
      return "沉浸阅读";
    case "pre-vocab":
      return "先学后读";
    case "quiz":
      return "读后测验";
  }
}
