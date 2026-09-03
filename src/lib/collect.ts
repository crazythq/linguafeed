import { XMLParser } from "fast-xml-parser";
import { categorize, isOfficialFeedUrl, OFFICIAL_SOURCES, sourceById } from "./feeds";
import { shortId } from "./hash";
import { stripHtml } from "./html";
import { splitSentences } from "./sentences";
import { isOnShanghaiDate, yesterdayShanghai } from "./timezone";
import { translateSentences } from "./translate";
import type { Digest, DigestFailure, DigestItem, LlmConfig, OfficialSource } from "./types";

const FETCH_HEADERS = {
  "User-Agent": "ChenDu/1.0 (educational English reader; official RSS only)",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
});

type RawEntry = {
  title?: string;
  link?: unknown;
  guid?: unknown;
  id?: unknown;
  pubDate?: string;
  published?: string;
  updated?: string;
  description?: unknown;
  summary?: unknown;
  content?: unknown;
  "content:encoded"?: unknown;
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record["#text"] === "string") {
      return record["#text"];
    }
    if (typeof record._ === "string") {
      return record._;
    }
  }
  return "";
}

function linkOf(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const alternate = value.find((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const rel = (item as Record<string, string>)["@_rel"];
      return rel === "alternate" || !rel;
    });
    return linkOf(alternate ?? value[0]);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["@_href"] === "string") {
      return record["@_href"];
    }
    if (typeof record.href === "string") {
      return record.href;
    }
    if (typeof record["#text"] === "string") {
      return record["#text"];
    }
  }
  return "";
}

function bodyOf(entry: RawEntry): string {
  const encoded = textOf(entry["content:encoded"]);
  const content = textOf(entry.content);
  const description = textOf(entry.description);
  const summary = textOf(entry.summary);
  return encoded || content || description || summary;
}

function publishedOf(entry: RawEntry): string {
  const raw = entry.pubDate || entry.published || entry.updated || "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export function parseFeedEntries(xml: string): RawEntry[] {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const rss = parsed.rss as { channel?: { item?: RawEntry | RawEntry[] } } | undefined;
  if (rss?.channel?.item) {
    return asArray(rss.channel.item);
  }
  const feed = parsed.feed as { entry?: RawEntry | RawEntry[] } | undefined;
  if (feed?.entry) {
    return asArray(feed.entry);
  }
  throw new Error("未识别为 RSS 或 Atom");
}

async function fetchFeedXml(feedUrl: string): Promise<string> {
  const response = await fetch(feedUrl, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  const xml = await response.text();
  if (!xml.includes("<") || (contentType.includes("html") && !xml.includes("<rss") && !xml.includes("<feed"))) {
    throw new Error("响应不是 XML feed");
  }
  return xml;
}

async function entriesToItems(
  entries: RawEntry[],
  source: Pick<OfficialSource, "id" | "defaultCategory">,
  targetDate: string,
  llm: LlmConfig | null,
  options?: { skipDateFilter?: boolean; custom?: boolean; limit?: number },
): Promise<DigestItem[]> {
  const limit = options?.limit ?? 8;
  const filtered = entries
    .map((entry) => {
      const title = stripHtml(textOf(entry.title));
      const url = linkOf(entry.link) || linkOf(entry.guid) || textOf(entry.id);
      const publishedAt = publishedOf(entry);
      const body = stripHtml(bodyOf(entry));
      return { title, url, publishedAt, body };
    })
    .filter((item) => item.title && item.url)
    .filter((item) => options?.skipDateFilter || isOnShanghaiDate(item.publishedAt, targetDate))
    .slice(0, limit);

  const items: DigestItem[] = [];
  for (const item of filtered) {
    const sentencesEn = splitSentences(`${item.title}. ${item.body}`.replace(/\.\./g, "."));
    const zh = await translateSentences(sentencesEn, llm);
    items.push({
      id: shortId(item.url),
      sourceId: source.id,
      category: categorize(item.title, source.defaultCategory),
      title: item.title,
      url: item.url,
      publishedAt: item.publishedAt,
      custom: options?.custom,
      sentences: sentencesEn.map((en, index) => ({ en, zh: zh[index] ?? null })),
    });
  }
  return items;
}

export async function collectOfficialSources(
  llm: LlmConfig | null,
  now: Date = new Date(),
): Promise<Digest> {
  const date = yesterdayShanghai(now);
  const collectedAt = now.toISOString();
  const items: DigestItem[] = [];
  const failures: DigestFailure[] = [];

  const fetched = await Promise.all(
    OFFICIAL_SOURCES.map(async (source) => {
      try {
        const xml = await fetchFeedXml(source.feedUrl);
        return { source, entries: parseFeedEntries(xml), error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        return { source, entries: [] as ReturnType<typeof parseFeedEntries>, error: message };
      }
    }),
  );

  for (const result of fetched) {
    if (result.error) {
      failures.push({ sourceId: result.source.id, error: result.error });
      continue;
    }
    try {
      const sourceItems = await entriesToItems(result.entries, result.source, date, llm);
      items.push(...sourceItems);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      failures.push({ sourceId: result.source.id, error: message });
    }
  }

  items.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  return { date, collectedAt, items, failures };
}

export async function collectCustomFeed(
  feedUrl: string,
  llm: LlmConfig | null,
): Promise<{ items: DigestItem[]; sourceName: string }> {
  const check = isOfficialFeedUrl(feedUrl);
  if (!check.ok) {
    throw new Error(check.error);
  }
  const matched = OFFICIAL_SOURCES.find((source) => source.feedUrl === check.url.toString())
    ?? OFFICIAL_SOURCES.find((source) => source.hosts.includes(check.url.hostname));
  const source: Pick<OfficialSource, "id" | "defaultCategory"> = matched
    ?? { id: `custom-${check.url.hostname}`, defaultCategory: "world" };
  const xml = await fetchFeedXml(check.url.toString());
  const entries = parseFeedEntries(xml);
  const date = yesterdayShanghai();
  const items = await entriesToItems(entries, source, date, llm, {
    skipDateFilter: true,
    custom: true,
    limit: 6,
  });
  return { items, sourceName: matched?.name ?? check.url.hostname };
}

export function sourceName(sourceId: string): string {
  return sourceById(sourceId)?.name ?? sourceId;
}
