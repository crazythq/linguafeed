import { tokenize } from "./sentences";
import type { DigestItem } from "./types";

export type QuizKind = "cloze" | "meaning";

export type QuizQuestion = {
  id: string;
  kind: QuizKind;
  prompt: string;
  options: string[];
  answer: string;
  sentenceEn: string;
  sentenceZh: string | null;
};

export type ArticleQuiz = {
  articleId: string;
  questions: QuizQuestion[];
};

export type QuizGrade = {
  correct: number;
  total: number;
  results: { id: string; selected: string | null; correct: boolean }[];
};

const MIN_ANSWER_LENGTH = 5;
const BLANK = "_____";

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "onto",
  "off",
  "to",
  "with",
  "without",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "has",
  "have",
  "had",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "might",
  "must",
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
  "us",
  "our",
  "you",
  "your",
  "he",
  "she",
  "his",
  "her",
  "not",
  "no",
  "nor",
  "so",
  "than",
  "then",
  "there",
  "here",
  "when",
  "what",
  "which",
  "who",
  "whom",
  "also",
  "just",
  "only",
  "very",
  "more",
  "most",
  "such",
  "about",
  "over",
  "after",
  "before",
  "any",
  "all",
  "each",
  "few",
  "own",
  "same",
  "other",
  "some",
  "too",
  "say",
  "says",
  "said",
]);

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const arr = [...items];
  let state = hashString(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const current = arr[i];
    const swap = arr[j];
    if (current === undefined || swap === undefined) {
      continue;
    }
    arr[i] = swap;
    arr[j] = current;
  }
  return arr;
}

function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const id = key(item);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(item);
  }
  return result;
}

function isContentWord(text: string): boolean {
  return text.length >= MIN_ANSWER_LENGTH && !STOPWORDS.has(text.toLowerCase());
}

function contentWords(sentence: string): string[] {
  return tokenize(sentence)
    .filter((token) => token.isWord && isContentWord(token.text))
    .map((token) => token.text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blankFirst(sentence: string, word: string): string {
  return sentence.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`), BLANK);
}

function pickClozeAnswer(
  words: string[],
  vocabTerms: Set<string>,
  usedAnswers: Set<string>,
): string | null {
  const unused = words.filter((word) => !usedAnswers.has(word.toLowerCase()));
  if (unused.length === 0) {
    return null;
  }
  const vocabHits = unused.filter((word) => vocabTerms.has(word.toLowerCase()));
  const pool = vocabHits.length > 0 ? vocabHits : unused;
  const ranked = [...pool].sort((left, right) => {
    if (right.length !== left.length) {
      return right.length - left.length;
    }
    return left.toLowerCase().localeCompare(right.toLowerCase());
  });
  return ranked[0] ?? null;
}

function clozeOptions(answer: string, pool: string[], seed: string): string[] | null {
  const distractors = uniqueBy(
    pool.filter((word) => word.toLowerCase() !== answer.toLowerCase()),
    (word) => word.toLowerCase(),
  );
  if (distractors.length === 0) {
    return null;
  }
  const picked = seededShuffle(distractors, seed).slice(0, 3);
  return seededShuffle([answer, ...picked], `${seed}:opts`);
}

function mixQuestions(
  clozeQuestions: QuizQuestion[],
  meaningQuestions: QuizQuestion[],
  vocabTerms: Set<string>,
  maxQuestions: number,
): QuizQuestion[] {
  const vocabCloze = clozeQuestions.filter((question) => vocabTerms.has(question.answer.toLowerCase()));
  const otherCloze = clozeQuestions.filter((question) => !vocabTerms.has(question.answer.toLowerCase()));
  const orderedCloze = [...vocabCloze, ...otherCloze];
  const mixed: QuizQuestion[] = [];
  let clozeIndex = 0;
  let meaningIndex = 0;

  const firstVocab = orderedCloze[0];
  if (vocabCloze.length > 0 && firstVocab) {
    mixed.push(firstVocab);
    clozeIndex += 1;
  }

  while (mixed.length < maxQuestions && (clozeIndex < orderedCloze.length || meaningIndex < meaningQuestions.length)) {
    const meaning = meaningQuestions[meaningIndex];
    if (meaning) {
      mixed.push(meaning);
      meaningIndex += 1;
    }
    if (mixed.length >= maxQuestions) {
      break;
    }
    const cloze = orderedCloze[clozeIndex];
    if (cloze) {
      mixed.push(cloze);
      clozeIndex += 1;
    }
  }

  return mixed.slice(0, maxQuestions);
}

export function buildArticleQuiz(
  item: Pick<DigestItem, "id" | "sentences">,
  options?: { vocabTerms?: string[]; maxQuestions?: number },
): ArticleQuiz {
  const maxQuestions = options?.maxQuestions ?? 5;
  const vocabTerms = new Set((options?.vocabTerms ?? []).map((term) => term.toLowerCase()));
  const allContent = uniqueBy(
    item.sentences.flatMap((sentence) => contentWords(sentence.en)),
    (word) => word.toLowerCase(),
  );
  const englishSentences = uniqueBy(
    item.sentences.map((sentence) => sentence.en).filter(Boolean),
    (sentence) => sentence.toLowerCase(),
  );

  const clozeQuestions: QuizQuestion[] = [];
  const meaningQuestions: QuizQuestion[] = [];
  const usedAnswers = new Set<string>();

  item.sentences.forEach((sentence, index) => {
    const answer = pickClozeAnswer(contentWords(sentence.en), vocabTerms, usedAnswers);
    if (answer) {
      const optionList = clozeOptions(answer, allContent, `${item.id}:cloze:${index}:${answer}`);
      if (optionList) {
        usedAnswers.add(answer.toLowerCase());
        clozeQuestions.push({
          id: `${item.id}:cloze:${index}`,
          kind: "cloze",
          prompt: blankFirst(sentence.en, answer),
          options: optionList,
          answer,
          sentenceEn: sentence.en,
          sentenceZh: sentence.zh,
        });
      }
    }

    if (!sentence.zh || englishSentences.length < 2) {
      return;
    }
    const distractors = englishSentences.filter(
      (english) => english.toLowerCase() !== sentence.en.toLowerCase(),
    );
    if (distractors.length === 0) {
      return;
    }
    const picked = seededShuffle(distractors, `${item.id}:meaning:${index}`).slice(0, 3);
    meaningQuestions.push({
      id: `${item.id}:meaning:${index}`,
      kind: "meaning",
      prompt: sentence.zh,
      options: seededShuffle([sentence.en, ...picked], `${item.id}:meaning:${index}:opts`),
      answer: sentence.en,
      sentenceEn: sentence.en,
      sentenceZh: sentence.zh,
    });
  });

  return {
    articleId: item.id,
    questions: mixQuestions(clozeQuestions, meaningQuestions, vocabTerms, maxQuestions),
  };
}

export function gradeQuiz(quiz: ArticleQuiz, answers: Record<string, string>): QuizGrade {
  const results = quiz.questions.map((question) => {
    const selected = answers[question.id] ?? null;
    return {
      id: question.id,
      selected,
      correct: selected === question.answer,
    };
  });
  return {
    correct: results.filter((result) => result.correct).length,
    total: quiz.questions.length,
    results,
  };
}
