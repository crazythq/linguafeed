"use client";

import { useState } from "react";
import Link from "next/link";
import { buildArticleQuiz, gradeQuiz, type QuizGrade } from "@/lib/quiz";
import type { DigestItem } from "@/lib/types";

export function ArticleQuiz({
  item,
  savedTerms,
}: {
  item: DigestItem;
  savedTerms: string[];
}) {
  const quiz = buildArticleQuiz(item, { vocabTerms: savedTerms });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const grade = submitted ? gradeQuiz(quiz, answers) : null;
  const resultById = new Map(grade?.results.map((result) => [result.id, result]));

  function reset(): void {
    setAnswers({});
    setSubmitted(false);
  }

  if (quiz.questions.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border bg-secondary/50 px-3 py-4 text-sm text-muted-foreground">
        <p>这篇文章太短，暂时无法出题。可以先对照阅读，或换一篇更长的要闻。</p>
        <Link href={`/read/${item.id}?mode=bilingual`} className="inline-flex text-primary hover:underline">
          回到对照阅读
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
        根据本文英文原句出题，检查有没有读懂。不需要 API Key。
      </p>

      <QuizActions
        articleId={item.id}
        grade={grade}
        submitId="quiz-submit"
        onReset={reset}
        onSubmit={() => setSubmitted(true)}
      />

      {quiz.questions.map((question, index) => {
        const result = resultById.get(question.id);
        return (
          <fieldset key={question.id} className="space-y-2 rounded-xl border bg-card p-4">
            <legend className="px-1 text-xs text-muted-foreground">
              {question.kind === "cloze" ? "选词填空" : "中英对应"} · {index + 1} / {quiz.questions.length}
            </legend>
            <p className="font-serif text-[1.05rem] leading-8 text-foreground">{question.prompt}</p>
            <p className="text-xs text-muted-foreground">
              {question.kind === "cloze" ? "选出最合适的单词填入空格。" : "选出与这句中文对应的英文原句。"}
            </p>
            <div className="grid gap-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option;
                const isAnswer = option === question.answer;
                const markWrong = Boolean(submitted && selected && !isAnswer);
                const markRight = Boolean(submitted && isAnswer);
                return (
                  <label
                    key={option}
                    className={`rounded-lg border px-3 py-2 text-sm leading-6 ${
                      markRight
                        ? "border-primary bg-primary/10 text-foreground"
                        : markWrong
                          ? "border-destructive/40 bg-destructive/10 text-foreground"
                          : selected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-foreground"
                    } ${submitted ? "" : "cursor-pointer hover:bg-secondary/40"}`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={selected}
                      disabled={submitted}
                      onChange={() => {
                        setAnswers((current) => ({ ...current, [question.id]: option }));
                      }}
                      className="sr-only"
                    />
                    <span className={question.kind === "meaning" ? "font-serif" : undefined}>{option}</span>
                  </label>
                );
              })}
            </div>
            {submitted ? (
              <div className="space-y-1 text-sm">
                <p className={result?.correct ? "text-primary" : "text-destructive"}>
                  {result?.correct ? "正确" : `正确答案：${question.answer}`}
                </p>
                {question.kind === "cloze" ? (
                  <p className="font-serif text-sm leading-7 text-muted-foreground">{question.sentenceEn}</p>
                ) : null}
                {question.sentenceZh ? (
                  <p className="text-sm leading-7 text-muted-foreground/55 italic">{question.sentenceZh}</p>
                ) : null}
              </div>
            ) : null}
          </fieldset>
        );
      })}

      <QuizActions articleId={item.id} grade={grade} onReset={reset} onSubmit={() => setSubmitted(true)} />
    </div>
  );
}

function QuizActions({
  articleId,
  grade,
  submitId,
  onReset,
  onSubmit,
}: {
  articleId: string;
  grade: QuizGrade | null;
  submitId?: string;
  onReset: () => void;
  onSubmit: () => void;
}) {
  if (grade) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium" aria-live="polite">
          答对 {grade.correct} / {grade.total}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-secondary/40"
        >
          再测一次
        </button>
        <Link href={`/read/${articleId}?mode=bilingual`} className="text-sm text-primary hover:underline">
          回对照阅读
        </Link>
      </div>
    );
  }

  return (
    <button
      type="button"
      id={submitId}
      onClick={onSubmit}
      className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/80"
    >
      提交答案
    </button>
  );
}
