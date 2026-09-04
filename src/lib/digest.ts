import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectOfficialSources } from "./collect";
import {
  digestCandidateDirs,
  resolveDigestStorePaths,
  writeDigestJson,
} from "./digest-store";
import { yesterdayShanghai } from "./timezone";
import type { Digest, LlmConfig } from "./types";

const memoryDigests = new Map<string, Digest>();

function candidateDirs(): string[] {
  return digestCandidateDirs(resolveDigestStorePaths());
}

export async function saveDigest(digest: Digest): Promise<string> {
  memoryDigests.set(digest.date, digest);
  const { writable } = resolveDigestStorePaths();
  const tmpOverlay = path.join(os.tmpdir(), "chendu-digests");
  const dirs = writable === tmpOverlay ? [writable] : [writable, tmpOverlay];
  return writeDigestJson(digest, dirs);
}

export async function readDigestFile(date: string): Promise<Digest | null> {
  const cached = memoryDigests.get(date);
  if (cached) {
    return cached;
  }
  for (const dir of candidateDirs()) {
    try {
      const raw = await readFile(path.join(dir, `${date}.json`), "utf8");
      const digest = JSON.parse(raw) as Digest;
      memoryDigests.set(date, digest);
      return digest;
    } catch {
      continue;
    }
  }
  return null;
}

export async function listDigestDates(): Promise<string[]> {
  const dates = new Set<string>(memoryDigests.keys());
  for (const dir of candidateDirs()) {
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          dates.add(file.replace(/\.json$/, ""));
        }
      }
    } catch {
      continue;
    }
  }
  return [...dates].sort().reverse();
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
      failures: [
        ...existing.failures,
        ...digest.failures,
        { sourceId: "collect", error: "本次采集无昨日条目，保留已有简报。" },
      ],
    };
  }
  await saveDigest(digest);
  return digest;
}
