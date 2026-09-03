export type CategoryId =
  | "world"
  | "business"
  | "science"
  | "ai"
  | "cloud"
  | "open-source"
  | "security"
  | "release-notes";

export type Sentence = {
  en: string;
  zh: string | null;
};

export type DigestItem = {
  id: string;
  sourceId: string;
  category: CategoryId;
  title: string;
  url: string;
  publishedAt: string;
  sentences: Sentence[];
  custom?: boolean;
};

export type DigestFailure = {
  sourceId: string;
  error: string;
};

export type Digest = {
  date: string;
  collectedAt: string;
  items: DigestItem[];
  failures: DigestFailure[];
};

export type OfficialSource = {
  id: string;
  name: string;
  group: "world" | "tech";
  defaultCategory: CategoryId;
  feedUrl: string;
  siteUrl: string;
  hosts: string[];
};

export type VocabType = "word" | "phrase";

export type VocabEntry = {
  id: string;
  term: string;
  type: VocabType;
  phonetic: string | null;
  definitionEn: string | null;
  definitionZh: string | null;
  sentence: string;
  articleId: string;
  articleTitle: string;
  createdAt: string;
};

export type CustomFeed = {
  id: string;
  url: string;
  name: string;
  enabled: boolean;
};

export type LearningMode = "bilingual" | "immersive" | "pre-vocab" | "quiz";

export type LlmSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type UserState = {
  version: 1;
  enabledSourceIds: string[];
  enabledCategories: CategoryId[];
  customFeeds: CustomFeed[];
  customItems: DigestItem[];
  vocab: VocabEntry[];
  readIds: string[];
  learningMode: LearningMode;
  showTranslation: boolean;
  llm: LlmSettings;
};

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type WordDefinition = {
  word: string;
  phonetic: string | null;
  definitionEn: string | null;
  definitionZh: string | null;
  example: string | null;
};
