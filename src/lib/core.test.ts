import { splitSentences } from "./sentences";
import { yesterdayShanghai, shanghaiDate, isOnShanghaiDate } from "./timezone";
import { parseFeedUrl } from "./feeds";
import { mergeDigestPayload } from "./digest-payload";
import { isReadOnlyFsError, resolveDigestStorePaths, writeDigestJson } from "./digest-store";
import type { Digest } from "./types";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("splitSentences keeps abbreviations together", () => {
  const sentences = splitSentences("Dr. Smith arrived in the U.S. today. The meeting starts at 9 a.m. in London.");
  assert.ok(sentences.length >= 1);
  assert.ok(sentences[0].includes("Dr. Smith"));
});

test("splitSentences caps length", () => {
  const text = Array.from({ length: 20 }, (_, i) => `Sentence number ${i + 1}.`).join(" ");
  assert.equal(splitSentences(text, 5).length, 5);
});

test("yesterdayShanghai is previous calendar day", () => {
  const now = new Date("2026-09-03T01:00:00.000Z"); // 09:00 in Shanghai
  assert.equal(shanghaiDate(now), "2026-09-03");
  assert.equal(yesterdayShanghai(now), "2026-09-02");
});

test("isOnShanghaiDate respects timezone", () => {
  const utcEvening = "2026-09-02T16:30:00.000Z"; // Sep 3 00:30 Shanghai
  assert.equal(isOnShanghaiDate(utcEvening, "2026-09-03"), true);
  assert.equal(isOnShanghaiDate(utcEvening, "2026-09-02"), false);
});

test("parseFeedUrl accepts any http(s) feed", () => {
  const aggregator = parseFeedUrl("https://news.google.com/rss");
  assert.equal(aggregator.ok, true);
  const official = parseFeedUrl("https://github.blog/feed/");
  assert.equal(official.ok, true);
  const bad = parseFeedUrl("ftp://example.com/feed");
  assert.equal(bad.ok, false);
  const nonsense = parseFeedUrl("not a url");
  assert.equal(nonsense.ok, false);
});

test("isReadOnlyFsError detects EROFS", () => {
  const error = Object.assign(new Error("EROFS: read-only file system, open '/var/task/data/digests/x.json'"), {
    code: "EROFS",
  });
  assert.equal(isReadOnlyFsError(error), true);
  assert.equal(isReadOnlyFsError(new Error("ENOENT")), false);
  assert.equal(isReadOnlyFsError({ code: "EACCES" }), true);
});

test("resolveDigestStorePaths uses tmp on Vercel", () => {
  const paths = resolveDigestStorePaths({
    cwd: "/var/task",
    tmpdir: "/tmp",
    env: { VERCEL: "1" },
  });
  assert.equal(paths.bundled, "/var/task/data/digests");
  assert.equal(paths.writable, "/tmp/chendu-digests");
});

test("resolveDigestStorePaths keeps repo dir locally", () => {
  const paths = resolveDigestStorePaths({
    cwd: "/workspace",
    tmpdir: "/tmp",
    env: {},
  });
  assert.equal(paths.writable, "/workspace/data/digests");
  assert.equal(paths.bundled, "/workspace/data/digests");
});

function sampleDigest(date: string, title: string): Digest {
  return {
    date,
    collectedAt: `${date}T00:00:00.000Z`,
    items: [
      {
        id: `item-${date}`,
        sourceId: "bbc-world",
        category: "world",
        title,
        url: `https://example.com/${date}`,
        publishedAt: `${date}T12:00:00.000Z`,
        sentences: [{ en: title, zh: null }],
      },
    ],
    failures: [],
  };
}

test("mergeDigestPayload prefers overlay for the requested date", () => {
  const requestedDate = "2026-09-03";
  const server = {
    digest: sampleDigest("2026-09-02", "seed"),
    requestedDate,
    usedFallback: true,
  };
  const overlay = sampleDigest(requestedDate, "fresh");
  const merged = mergeDigestPayload(server, overlay);
  assert.equal(merged.digest?.date, requestedDate);
  assert.equal(merged.digest?.items[0]?.title, "fresh");
  assert.equal(merged.usedFallback, false);
});

test("mergeDigestPayload keeps server digest when overlay is older", () => {
  const server = {
    digest: sampleDigest("2026-09-03", "server"),
    requestedDate: "2026-09-03",
    usedFallback: false,
  };
  const overlay = sampleDigest("2026-09-01", "old");
  const merged = mergeDigestPayload(server, overlay);
  assert.equal(merged.digest?.items[0]?.title, "server");
});

test("writeDigestJson skips read-only dir and writes fallback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chendu-digest-"));
  const locked = path.join(root, "locked");
  const fallback = path.join(root, "writable");
  await mkdir(locked);
  await chmod(locked, 0o555);
  try {
    const digest = sampleDigest("2026-09-03", "saved");
    const filePath = await writeDigestJson(digest, [locked, fallback]);
    assert.equal(filePath, path.join(fallback, "2026-09-03.json"));
    const raw = await readFile(filePath, "utf8");
    assert.equal((JSON.parse(raw) as Digest).items[0]?.title, "saved");
  } finally {
    await chmod(locked, 0o755);
    await rm(root, { recursive: true, force: true });
  }
});
