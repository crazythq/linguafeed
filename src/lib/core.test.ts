import { splitSentences } from "./sentences";
import { yesterdayShanghai, shanghaiDate, isOnShanghaiDate } from "./timezone";
import { parseFeedUrl } from "./feeds";
import assert from "node:assert/strict";
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
