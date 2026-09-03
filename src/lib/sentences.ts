const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "st",
  "vs",
  "etc",
  "al",
  "fig",
  "vol",
  "inc",
  "ltd",
  "co",
  "u.s",
  "u.k",
  "e.g",
  "i.e",
  "a.m",
  "p.m",
]);

export function splitSentences(text: string, maxSentences = 12): string[] {
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
  if (!normalized) {
    return [];
  }

  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char !== "." && char !== "!" && char !== "?") {
      continue;
    }

    const prev = normalized.slice(start, i).trim();
    const lastWord = prev.split(/\s+/).pop()?.replace(/["')\]]+$/g, "").toLowerCase() ?? "";
    if (ABBREVIATIONS.has(lastWord.replace(/\.$/, ""))) {
      continue;
    }

    const next = normalized[i + 1];
    const next2 = normalized[i + 2];
    const isEnd =
      next === undefined ||
      next === " " ||
      next === "\"" ||
      next === "'" ||
      (next === "\"" && next2 === " ") ||
      next === ")";

    if (!isEnd) {
      continue;
    }

    let end = i + 1;
    while (end < normalized.length && /["')\]]/.test(normalized[end])) {
      end += 1;
    }
    const sentence = normalized.slice(start, end).trim();
    if (sentence.length > 1) {
      sentences.push(sentence);
    }
    start = end;
    while (start < normalized.length && normalized[start] === " ") {
      start += 1;
    }
    i = start - 1;
    if (sentences.length >= maxSentences) {
      return sentences;
    }
  }

  const tail = normalized.slice(start).trim();
  if (tail && sentences.length < maxSentences) {
    sentences.push(tail);
  }
  return sentences;
}

export type TextToken = {
  text: string;
  isWord: boolean;
};

export function tokenize(sentence: string): TextToken[] {
  return sentence.split(/(\b[A-Za-z][A-Za-z0-9'-]*\b)/).filter(Boolean).map((text) => ({
    text,
    isWord: /^[A-Za-z][A-Za-z0-9'-]*$/.test(text),
  }));
}

export function normalizeTerm(term: string): string {
  return term.replace(/\s+/g, " ").trim();
}

export function isPhrase(term: string): boolean {
  return normalizeTerm(term).split(" ").filter(Boolean).length >= 2;
}
