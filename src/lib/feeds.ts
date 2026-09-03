import type { CategoryId, OfficialSource } from "./types";

export const CATEGORIES: { id: CategoryId; label: string; hint: string }[] = [
  { id: "world", label: "World", hint: "全球要闻" },
  { id: "business", label: "Business", hint: "商业与市场" },
  { id: "science", label: "Science", hint: "科学" },
  { id: "ai", label: "AI", hint: "人工智能" },
  { id: "cloud", label: "Cloud", hint: "云与基础设施" },
  { id: "open-source", label: "Open Source", hint: "开源" },
  { id: "security", label: "Security", hint: "安全" },
  { id: "release-notes", label: "Release Notes", hint: "产品与版本更新" },
];

export const OFFICIAL_SOURCES: OfficialSource[] = [
  {
    id: "bbc-world",
    name: "BBC World",
    group: "world",
    defaultCategory: "world",
    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
    siteUrl: "https://www.bbc.com/news/world",
    hosts: ["feeds.bbci.co.uk", "www.bbc.com", "www.bbc.co.uk"],
  },
  {
    id: "npr-news",
    name: "NPR News",
    group: "world",
    defaultCategory: "world",
    feedUrl: "https://feeds.npr.org/1001/rss.xml",
    siteUrl: "https://www.npr.org",
    hosts: ["feeds.npr.org", "www.npr.org"],
  },
  {
    id: "guardian-world",
    name: "The Guardian World",
    group: "world",
    defaultCategory: "world",
    feedUrl: "https://www.theguardian.com/world/rss",
    siteUrl: "https://www.theguardian.com/world",
    hosts: ["www.theguardian.com"],
  },
  {
    id: "un-news",
    name: "UN News",
    group: "world",
    defaultCategory: "world",
    feedUrl: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    siteUrl: "https://news.un.org",
    hosts: ["news.un.org"],
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera",
    group: "world",
    defaultCategory: "world",
    feedUrl: "https://www.aljazeera.com/xml/rss/all.xml",
    siteUrl: "https://www.aljazeera.com",
    hosts: ["www.aljazeera.com"],
  },
  {
    id: "github-blog",
    name: "GitHub Blog",
    group: "tech",
    defaultCategory: "open-source",
    feedUrl: "https://github.blog/feed/",
    siteUrl: "https://github.blog",
    hosts: ["github.blog"],
  },
  {
    id: "aws-news",
    name: "AWS News Blog",
    group: "tech",
    defaultCategory: "cloud",
    feedUrl: "https://aws.amazon.com/blogs/aws/feed/",
    siteUrl: "https://aws.amazon.com/blogs/aws/",
    hosts: ["aws.amazon.com"],
  },
  {
    id: "google-blog",
    name: "The Keyword (Google)",
    group: "tech",
    defaultCategory: "ai",
    feedUrl: "https://blog.google/rss/",
    siteUrl: "https://blog.google",
    hosts: ["blog.google"],
  },
  {
    id: "ms-devblogs",
    name: "Microsoft DevBlogs",
    group: "tech",
    defaultCategory: "release-notes",
    feedUrl: "https://devblogs.microsoft.com/feed/",
    siteUrl: "https://devblogs.microsoft.com",
    hosts: ["devblogs.microsoft.com"],
  },
  {
    id: "cloudflare-blog",
    name: "Cloudflare Blog",
    group: "tech",
    defaultCategory: "security",
    feedUrl: "https://blog.cloudflare.com/rss/",
    siteUrl: "https://blog.cloudflare.com",
    hosts: ["blog.cloudflare.com"],
  },
  {
    id: "k8s-blog",
    name: "Kubernetes Blog",
    group: "tech",
    defaultCategory: "cloud",
    feedUrl: "https://kubernetes.io/feed.xml",
    siteUrl: "https://kubernetes.io/blog/",
    hosts: ["kubernetes.io"],
  },
];

const EXTRA_OFFICIAL_HOSTS = [
  "developers.googleblog.com",
  "developer.android.com",
  "cloud.google.com",
  "openai.com",
  "blogs.nvidia.com",
  "www.cncf.io",
  "blog.rust-lang.org",
  "nodejs.org",
  "blog.python.org",
  "www.ietf.org",
  "security.googleblog.com",
  "aws.amazon.com",
];

export function officialHostSet(): Set<string> {
  const hosts = new Set<string>(EXTRA_OFFICIAL_HOSTS);
  for (const source of OFFICIAL_SOURCES) {
    for (const host of source.hosts) {
      hosts.add(host);
    }
  }
  return hosts;
}

export function isOfficialFeedUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "链接不是合法 URL。" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "只接受 http(s) 的官方 RSS/Atom。" };
  }
  const host = url.hostname.toLowerCase();
  const allowed = officialHostSet();
  const matched = [...allowed].some((item) => host === item || host.endsWith(`.${item}`));
  if (!matched) {
    return {
      ok: false,
      error: "该域名不在官方源白名单。晨读只接受出版方自己的 RSS/Atom，不接受聚合站。",
    };
  }
  return { ok: true, url };
}

export function sourceById(id: string): OfficialSource | undefined {
  return OFFICIAL_SOURCES.find((source) => source.id === id);
}

const KEYWORD_CATEGORY: [RegExp, CategoryId][] = [
  [/\b(ai|openai|llm|gpt|gemini|anthropic|machine learning)\b/i, "ai"],
  [/\b(kubernetes|k8s|aws|azure|gcp|cloudflare|cloud)\b/i, "cloud"],
  [/\b(security|cve|vulnerability|phishing|ransomware)\b/i, "security"],
  [/\b(open[- ]source|github|linux|rust|python|javascript)\b/i, "open-source"],
  [/\b(release|ga |generally available|changelog|version)\b/i, "release-notes"],
  [/\b(market|economy|bank|trade|inflation|stock)\b/i, "business"],
  [/\b(nasa|climate|quantum|biology|physics|research)\b/i, "science"],
];

export function categorize(title: string, fallback: CategoryId): CategoryId {
  for (const [pattern, category] of KEYWORD_CATEGORY) {
    if (pattern.test(title)) {
      return category;
    }
  }
  return fallback;
}

export const DEFAULT_ENABLED_SOURCE_IDS = OFFICIAL_SOURCES.map((source) => source.id);
export const DEFAULT_ENABLED_CATEGORIES = CATEGORIES.map((category) => category.id);
