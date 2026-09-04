import assert from "node:assert/strict";
import test from "node:test";
import { buildArticleQuiz, gradeQuiz } from "./quiz";
import type { DigestItem } from "./types";

function sampleItem(overrides?: Partial<DigestItem>): DigestItem {
  return {
    id: "seed-bbc-climate",
    sourceId: "bbc-world",
    category: "science",
    title: "Scientists warn Atlantic currents may slow faster than expected",
    url: "https://www.bbc.com/news/science-environment",
    publishedAt: "2026-09-02T08:20:00.000Z",
    sentences: [
      {
        en: "Scientists warn Atlantic currents may slow faster than expected.",
        zh: "科学家警告，大西洋洋流可能比预期更快减缓。",
      },
      {
        en: "A new assessment of the Atlantic Meridional Overturning Circulation suggests the system that helps keep Europe's winters mild is losing stability.",
        zh: "对大西洋经向翻转环流的最新评估显示，这套帮助欧洲冬季保持温和的系统正在失去稳定。",
      },
      {
        en: "Researchers say the finding is not a prediction of collapse this decade, but it raises the cost of delay on emissions cuts.",
        zh: "研究人员表示，这并非预言本十年就会崩溃，但会提高推迟减排的代价。",
      },
    ],
    ...overrides,
  };
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "for",
  "on",
  "and",
  "or",
  "may",
  "not",
  "but",
  "it",
  "is",
  "that",
  "this",
  "with",
]);

test("buildArticleQuiz returns a mix of cloze and meaning questions", () => {
  const quiz = buildArticleQuiz(sampleItem());
  assert.equal(quiz.articleId, "seed-bbc-climate");
  assert.ok(quiz.questions.length >= 3);
  assert.ok(quiz.questions.length <= 5);
  const kinds = new Set(quiz.questions.map((question) => question.kind));
  assert.ok(kinds.has("cloze"));
  assert.ok(kinds.has("meaning"));
});

test("cloze questions blank a content word and keep unique options", () => {
  const quiz = buildArticleQuiz(sampleItem());
  const cloze = quiz.questions.find((question) => question.kind === "cloze");
  assert.ok(cloze);
  assert.ok(cloze.prompt.includes("_____"));
  assert.ok(cloze.options.includes(cloze.answer));
  assert.equal(new Set(cloze.options).size, cloze.options.length);
  assert.ok(cloze.options.length >= 2 && cloze.options.length <= 4);
  assert.ok(cloze.sentenceEn.includes(cloze.answer));
});

test("cloze answers are content words, not stopwords", () => {
  const quiz = buildArticleQuiz(sampleItem());
  for (const question of quiz.questions) {
    if (question.kind !== "cloze") {
      continue;
    }
    assert.equal(STOPWORDS.has(question.answer.toLowerCase()), false);
    assert.ok(question.answer.length >= 5);
  }
});

test("meaning questions use Chinese prompts and English options", () => {
  const quiz = buildArticleQuiz(sampleItem());
  const meaning = quiz.questions.find((question) => question.kind === "meaning");
  assert.ok(meaning);
  assert.ok(/[\u4e00-\u9fff]/.test(meaning.prompt));
  assert.ok(meaning.options.includes(meaning.answer));
  assert.ok(/[A-Za-z]/.test(meaning.answer));
  assert.equal(meaning.sentenceZh, meaning.prompt);
});

test("same article produces a deterministic quiz", () => {
  const item = sampleItem();
  assert.deepEqual(buildArticleQuiz(item), buildArticleQuiz(item));
});

test("vocab terms are preferred as cloze answers", () => {
  const quiz = buildArticleQuiz(sampleItem(), { vocabTerms: ["circulation"] });
  const clozeAnswers = quiz.questions
    .filter((question) => question.kind === "cloze")
    .map((question) => question.answer.toLowerCase());
  assert.ok(clozeAnswers.includes("circulation"));
});

test("article without translations still gets cloze questions", () => {
  const quiz = buildArticleQuiz(
    sampleItem({
      sentences: [{ en: "Kubernetes maintainers released a security patch yesterday.", zh: null }],
    }),
  );
  assert.ok(quiz.questions.some((question) => question.kind === "cloze"));
  assert.equal(
    quiz.questions.some((question) => question.kind === "meaning"),
    false,
  );
});

test("too-short article yields no questions", () => {
  const quiz = buildArticleQuiz(
    sampleItem({
      sentences: [{ en: "OK.", zh: "好。" }],
    }),
  );
  assert.equal(quiz.questions.length, 0);
});

test("cloze options come from the article", () => {
  const item = sampleItem();
  const words = new Set(
    item.sentences
      .flatMap((sentence) => sentence.en.match(/[A-Za-z][A-Za-z'-]*/g) ?? [])
      .map((word) => word.toLowerCase()),
  );
  const quiz = buildArticleQuiz(item);
  for (const question of quiz.questions) {
    if (question.kind !== "cloze") {
      continue;
    }
    for (const option of question.options) {
      assert.ok(words.has(option.toLowerCase()), `option ${option} not in article`);
    }
  }
});

test("gradeQuiz scores selected answers", () => {
  const quiz = buildArticleQuiz(sampleItem());
  const allCorrect = Object.fromEntries(quiz.questions.map((question) => [question.id, question.answer]));
  const perfect = gradeQuiz(quiz, allCorrect);
  assert.equal(perfect.correct, quiz.questions.length);
  assert.equal(perfect.total, quiz.questions.length);
  assert.ok(perfect.results.every((result) => result.correct));

  const unanswered = gradeQuiz(quiz, {});
  assert.equal(unanswered.correct, 0);
  assert.equal(unanswered.total, quiz.questions.length);

  const wrong = Object.fromEntries(quiz.questions.map((question) => [question.id, "__nope__"]));
  assert.equal(gradeQuiz(quiz, wrong).correct, 0);
});
