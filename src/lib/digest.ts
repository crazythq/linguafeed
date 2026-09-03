import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectOfficialSources } from "./collect";
import { yesterdayShanghai } from "./timezone";
import type { Digest, LlmConfig } from "./types";

function digestDir(): string {
  return path.join(process.cwd(), "data", "digests");
}

function digestPath(date: string): string {
  return path.join(digestDir(), `${date}.json`);
}

export async function saveDigest(digest: Digest): Promise<string> {
  await mkdir(digestDir(), { recursive: true });
  const filePath = digestPath(digest.date);
  await writeFile(filePath, `${JSON.stringify(digest, null, 2)}\n`, "utf8");
  return filePath;
}

export async function readDigestFile(date: string): Promise<Digest | null> {
  try {
    const raw = await readFile(digestPath(date), "utf8");
    return JSON.parse(raw) as Digest;
  } catch {
    return null;
  }
}

export async function listDigestDates(): Promise<string[]> {
  try {
    const files = await readdir(digestDir());
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function loadBestDigest(now: Date = new Date()): Promise<{
  digest: Digest | null;
  requestedDate: string;
  usedFallback: boolean;
}> {
  const requestedDate = yesterdayShanghai(now);
  const exact = await readDigestFile(requestedDate);
  if (exact && exact.items.length > 0) {
    return { digest: exact, requestedDate, usedFallback: false };
  }
  const dates = await listDigestDates();
  for (const date of dates) {
    const digest = await readDigestFile(date);
    if (digest && digest.items.length > 0) {
      return { digest, requestedDate, usedFallback: date !== requestedDate };
    }
  }
  return { digest: exact, requestedDate, usedFallback: Boolean(exact) };
}

export async function collectAndSave(llm: LlmConfig | null, now: Date = new Date()): Promise<Digest> {
  const digest = await collectOfficialSources(llm, now);
  if (digest.items.length > 0) {
    await saveDigest(digest);
    return digest;
  }
  const existing = await readDigestFile(digest.date);
  if (existing && existing.items.length > 0) {
    return {
      ...existing,
      failures: [...existing.failures, ...digest.failures, { sourceId: "collect", error: "本次采集无昨日条目，保留已有简报。" }],
    };
  }
  await saveDigest(digest);
  return digest;
}
