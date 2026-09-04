import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { extractPreVocab } from "./pre-vocab";
import type { Digest, DigestItem } from "./types";

function seedItem(id: string): DigestItem {
  const file = path.join(process.cwd(), "data/digests/2026-09-02.json");
  const digest = JSON.parse(readFileSync(file, "utf8")) as Digest;
  const item = digest.items.find((entry) => entry.id === id);
  assert.ok(item, `missing seed item ${id}`);
  return item;
}

test("extractPreVocab picks content words from the climate seed", () => {
  const terms = extractPreVocab(seedItem("seed-bbc-climate"));
  const words = terms.map((entry) => entry.term.toLowerCase());
  assert.ok(words.includes("atlantic"), words.join(", "));
  assert.ok(words.includes("currents"), words.join(", "));
  assert.ok(words.includes("circulation"), words.join(", "));
  assert.equal(terms.some((entry) => entry.term === "Atlantic"), true);
});

test("extractPreVocab drops stopwords and keeps first-occurrence casing", () => {
  const terms = extractPreVocab(seedItem("seed-bbc-climate"));
  const words = new Set(terms.map((entry) => entry.term.toLowerCase()));
  assert.equal(words.has("the"), false);
  assert.equal(words.has("of"), false);
  assert.equal(words.has("is"), false);
  assert.equal(words.has("a"), false);
  for (const entry of terms) {
    assert.ok(entry.sentence.length > 0);
    assert.ok(entry.count >= 1);
    assert.ok(entry.sentenceIndex >= 0);
  }
});

test("extractPreVocab respects the default limit of 8", () => {
  const terms = extractPreVocab(seedItem("seed-bbc-climate"));
  assert.ok(terms.length <= 8);
  assert.ok(terms.length >= 3);
});

test("extractPreVocab keeps short all-caps acronyms like AWS", () => {
  const item: DigestItem = {
    id: "acronym",
    sourceId: "aws-news",
    category: "cloud",
    title: "AWS Lambda now supports a new runtime",
    url: "https://example.com",
    publishedAt: "2026-09-02T00:00:00.000Z",
    sentences: [
      {
        en: "AWS Lambda now supports a new runtime for container images.",
        zh: null,
      },
    ],
  };
  const words = extractPreVocab(item).map((entry) => entry.term);
  assert.ok(words.includes("AWS"), words.join(", "));
  assert.equal(words.includes("a"), false);
  assert.equal(words.includes("for"), false);
});

test("extractPreVocab returns an empty list when nothing qualifies", () => {
  const item: DigestItem = {
    id: "empty",
    sourceId: "bbc-world",
    category: "world",
    title: "The and of it",
    url: "https://example.com",
    publishedAt: "2026-09-02T00:00:00.000Z",
    sentences: [{ en: "The and of it is to be.", zh: null }],
  };
  assert.deepEqual(extractPreVocab(item), []);
});
