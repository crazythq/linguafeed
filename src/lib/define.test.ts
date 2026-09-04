import assert from "node:assert/strict";
import test from "node:test";
import { defineWord, parseWiktionaryDefinition } from "./define";
import type { WordDefinition } from "./types";

const WIKTIONARY_HELLO = {
  en: [
    {
      partOfSpeech: "Interjection",
      definitions: [
        {
          definition: "A <a href=\"/wiki/greeting\">greeting</a> said when meeting someone.",
          examples: ["<b>Hello</b>, everyone!"],
        },
      ],
    },
  ],
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function hangingFetch(signal: AbortSignal | undefined): Promise<Response> {
  return new Promise((_resolve, reject) => {
    if (!signal) {
      return;
    }
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal.addEventListener("abort", () => {
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

test("parseWiktionaryDefinition strips HTML and takes the first English sense", () => {
  const parsed = parseWiktionaryDefinition(WIKTIONARY_HELLO);
  assert.equal(parsed?.definitionEn, "A greeting said when meeting someone.");
  assert.equal(parsed?.example, "Hello, everyone!");
});

test("parseWiktionaryDefinition ignores non-English entries", () => {
  const parsed = parseWiktionaryDefinition({
    fr: [{ definitions: [{ definition: "bonjour" }] }],
  });
  assert.equal(parsed, null);
});

test("parseWiktionaryDefinition skips empty first senses", () => {
  const parsed = parseWiktionaryDefinition({
    en: [
      {
        partOfSpeech: "Noun",
        definitions: [
          { definition: "<span class=\"usage-label-sense\"></span>" },
          { definition: "A visible mass of water droplets suspended in the air." },
        ],
      },
    ],
  });
  assert.equal(parsed?.definitionEn, "A visible mass of water droplets suspended in the air.");
});

test("parseWiktionaryDefinition skips language-code symbol entries", () => {
  const parsed = parseWiktionaryDefinition({
    en: [
      {
        partOfSpeech: "Symbol",
        definitions: [{ definition: "ISO 639-3 language code for Chitwania Tharu." }],
      },
      {
        partOfSpeech: "Article",
        definitions: [{ definition: "Used before a noun phrase, including a simple noun." }],
      },
    ],
  });
  assert.equal(parsed?.definitionEn, "Used before a noun phrase, including a simple noun.");
});

test("defineWord uses Wiktionary and does not wait for a hanging dictionaryapi.dev", async () => {
  const started = Date.now();
  const seen: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    seen.push(url);
    if (url.includes("dictionaryapi.dev")) {
      return hangingFetch(init?.signal ?? undefined);
    }
    if (url.includes("wiktionary.org")) {
      return jsonResponse(WIKTIONARY_HELLO);
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const result = await defineWord("hello", "Hello, everyone.", null, {
    fetchImpl,
    translate: async () => "问候语",
  });

  assert.ok(Date.now() - started < 800, `lookup took too long: ${Date.now() - started}ms`);
  assert.equal(result.definitionEn, "A greeting said when meeting someone.");
  assert.equal(result.definitionZh, "问候语");
  assert.equal(result.word, "hello");
  assert.ok(seen.some((url) => url.includes("wiktionary.org")));
});

test("defineWord still returns English when Chinese translation fails", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("wiktionary.org")) {
      return jsonResponse(WIKTIONARY_HELLO);
    }
    if (url.includes("dictionaryapi.dev")) {
      return jsonResponse({ title: "No Definitions Found" }, 404);
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const result: WordDefinition = await defineWord("Hello!", "Hello, everyone.", null, {
    fetchImpl,
    translate: async () => null,
  });

  assert.equal(result.word, "Hello");
  assert.equal(result.definitionEn, "A greeting said when meeting someone.");
  assert.equal(result.definitionZh, null);
});
