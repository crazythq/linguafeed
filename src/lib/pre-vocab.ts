import { tokenize } from "./sentences";
import type { DigestItem } from "./types";

export type PreVocabTerm = {
  term: string;
  sentenceIndex: number;
  sentence: string;
  count: number;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "nor",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "from",
  "by",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "they",
  "them",
  "their",
  "we",
  "our",
  "you",
  "your",
  "he",
  "she",
  "him",
  "her",
  "his",
  "i",
  "me",
  "my",
  "not",
  "no",
  "than",
  "then",
  "so",
  "if",
  "when",
  "while",
  "about",
  "into",
  "over",
  "after",
  "before",
  "also",
  "more",
  "most",
  "some",
  "any",
  "all",
  "each",
  "other",
  "such",
  "only",
  "own",
  "same",
  "both",
  "few",
  "many",
  "much",
  "very",
  "just",
  "still",
  "even",
  "too",
  "here",
  "there",
  "where",
  "what",
  "which",
  "who",
  "whom",
  "how",
  "why",
  "because",
  "until",
  "unless",
  "although",
  "though",
  "whether",
  "either",
  "neither",
  "yet",
  "once",
  "upon",
  "per",
  "via",
  "now",
  "out",
  "up",
  "down",
  "off",
  "among",
  "between",
  "during",
  "without",
  "within",
  "through",
  "across",
  "against",
  "under",
  "above",
]);

type Candidate = {
  term: string;
  sentenceIndex: number;
  sentence: string;
  count: number;
  titleBonus: number;
  lengthBonus: number;
  properBonus: number;
};

function isAcronym(text: string): boolean {
  return text.length >= 2 && text.length <= 4 && /^[A-Z]+$/.test(text);
}

function isEligible(text: string): boolean {
  if (STOPWORDS.has(text.toLowerCase())) {
    return false;
  }
  return text.length >= 4 || isAcronym(text);
}

function score(candidate: Candidate): number {
  return candidate.count + candidate.titleBonus + candidate.lengthBonus + candidate.properBonus;
}

export function extractPreVocab(item: DigestItem, limit = 8): PreVocabTerm[] {
  const titleKeys = new Set(
    tokenize(item.title)
      .filter((token) => token.isWord)
      .map((token) => token.text.toLowerCase()),
  );
  const byKey = new Map<string, Candidate>();

  item.sentences.forEach((entry, sentenceIndex) => {
    const tokens = tokenize(entry.en);
    let seenWord = false;
    for (const token of tokens) {
      if (!token.isWord) {
        continue;
      }
      const firstWord = !seenWord;
      seenWord = true;
      if (!isEligible(token.text)) {
        continue;
      }
      const key = token.text.toLowerCase();
      const properBonus = !firstWord && /^[A-Z]/.test(token.text) ? 1 : 0;
      const existing = byKey.get(key);
      if (existing) {
        existing.count += 1;
        existing.properBonus = Math.max(existing.properBonus, properBonus);
        continue;
      }
      byKey.set(key, {
        term: token.text,
        sentenceIndex,
        sentence: entry.en,
        count: 1,
        titleBonus: titleKeys.has(key) ? 3 : 0,
        lengthBonus: token.text.length >= 8 ? 1 : 0,
        properBonus,
      });
    }
  });

  return [...byKey.values()]
    .sort((left, right) => {
      const delta = score(right) - score(left);
      if (delta !== 0) {
        return delta;
      }
      if (left.sentenceIndex !== right.sentenceIndex) {
        return left.sentenceIndex - right.sentenceIndex;
      }
      return left.term.localeCompare(right.term);
    })
    .slice(0, limit)
    .map(({ term, sentenceIndex, sentence, count }) => ({
      term,
      sentenceIndex,
      sentence,
      count,
    }));
}
