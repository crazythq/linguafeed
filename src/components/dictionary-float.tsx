"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useWordDefinition } from "@/hooks/use-word-definition";
import type { LearningMode } from "@/lib/types";

type Side = "top" | "bottom";

type FloatPos = {
  top: number;
  left: number;
  side: Side;
  arrowLeft: number;
  ready: boolean;
};

const MARGIN = 12;
const GAP = 10;
const ARROW = 8;
const PANEL_WIDTH = 296;

const emptySubscribe = (): (() => void) => () => undefined;

export function DictionaryFloat({
  anchorId,
  word,
  sentence,
  articleId,
  articleTitle,
  mode,
  sentenceIndex,
  stage,
  onClose,
}: {
  anchorId: string;
  word: string;
  sentence: string;
  articleId: string;
  articleTitle: string;
  mode: LearningMode;
  sentenceIndex: number;
  stage?: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { definition, loading } = useWordDefinition(word, sentence);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [pos, setPos] = useState<FloatPos>({
    top: 0,
    left: 0,
    side: "bottom",
    arrowLeft: PANEL_WIDTH / 2,
    ready: false,
  });

  useLayoutEffect(() => {
    if (!mounted) {
      return;
    }

    function place(): void {
      const anchor = document.getElementById(anchorId);
      const panel = panelRef.current;
      if (!anchor || !panel) {
        return;
      }

      const a = anchor.getBoundingClientRect();
      const panelHeight = panel.offsetHeight || 220;
      const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - MARGIN * 2);
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const spaceBelow = vh - a.bottom - MARGIN;
      const spaceAbove = a.top - MARGIN;
      const need = panelHeight + GAP + ARROW;
      const side: Side =
        spaceBelow >= need || spaceBelow >= spaceAbove ? "bottom" : "top";

      let top =
        side === "bottom" ? a.bottom + GAP + ARROW : a.top - panelHeight - GAP - ARROW;
      top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - panelHeight - MARGIN));

      let left = a.left + a.width / 2 - panelWidth / 2;
      left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - panelWidth - MARGIN));

      const wordCenter = a.left + a.width / 2;
      const arrowLeft = Math.min(Math.max(18, wordCenter - left), panelWidth - 18);

      setPos({ top, left, side, arrowLeft, ready: true });
    }

    place();
    const frame = window.requestAnimationFrame(place);
    document.getElementById(anchorId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [mounted, anchorId, word, loading, definition?.definitionEn]);

  const shown = definition ?? {
    word,
    phonetic: null,
    definitionEn: null,
    definitionZh: null,
    example: sentence,
  };

  const content = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">词典</p>
          <p className="text-lg font-medium leading-tight">
            {shown.word}{" "}
            {shown.phonetic ? (
              <span className="text-sm font-normal text-muted-foreground">{shown.phonetic}</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="关闭词典"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {loading ? (
          <p className="text-muted-foreground">正在查询释义…</p>
        ) : (
          <>
            <p>{shown.definitionEn ?? "暂无英文释义，仍可收藏。"}</p>
            <p className="text-muted-foreground">{shown.definitionZh ?? "暂无中文释义"}</p>
            {shown.example ? (
              <p className="text-xs leading-5 text-muted-foreground">例句：{shown.example}</p>
            ) : null}
          </>
        )}
      </div>
      <form action="/vocab/add" method="post" className="mt-3">
        <input type="hidden" name="term" value={shown.word} />
        <input type="hidden" name="type" value="word" />
        <input type="hidden" name="phonetic" value={shown.phonetic ?? ""} />
        <input type="hidden" name="definitionEn" value={shown.definitionEn ?? ""} />
        <input type="hidden" name="definitionZh" value={shown.definitionZh ?? ""} />
        <input type="hidden" name="sentence" value={sentence} />
        <input type="hidden" name="articleId" value={articleId} />
        <input type="hidden" name="articleTitle" value={articleTitle} />
        <input
          type="hidden"
          name="returnTo"
          value={`/read/${articleId}?mode=${mode}${stage === "read" ? "&stage=read" : ""}&w=${encodeURIComponent(shown.word)}&s=${sentenceIndex}`}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
        >
          加入生词本
        </button>
      </form>
    </>
  );

  if (!mounted) {
    return (
      <div
        id="dictionary"
        role="dialog"
        aria-label="词典"
        className="absolute left-1/2 top-[calc(100%+0.65rem)] z-50 w-[min(18.5rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10"
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-0 size-0 -translate-x-1/2 -translate-y-full border-x-8 border-b-8 border-x-transparent border-b-popover"
        />
        {content}
      </div>
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      id="dictionary"
      role="dialog"
      aria-label="词典"
      aria-busy={loading}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: `min(${PANEL_WIDTH}px, calc(100vw - ${MARGIN * 2}px))`,
        opacity: pos.ready ? 1 : 0,
        pointerEvents: pos.ready ? "auto" : "none",
      }}
      className="z-50 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute size-0"
        style={
          pos.side === "bottom"
            ? {
                left: pos.arrowLeft,
                top: -ARROW,
                borderLeft: `${ARROW}px solid transparent`,
                borderRight: `${ARROW}px solid transparent`,
                borderBottom: `${ARROW}px solid var(--popover)`,
                transform: "translateX(-50%)",
                filter: "drop-shadow(0 -1px 0 color-mix(in oklab, var(--foreground) 10%, transparent))",
              }
            : {
                left: pos.arrowLeft,
                bottom: -ARROW,
                borderLeft: `${ARROW}px solid transparent`,
                borderRight: `${ARROW}px solid transparent`,
                borderTop: `${ARROW}px solid var(--popover)`,
                transform: "translateX(-50%)",
                filter: "drop-shadow(0 1px 0 color-mix(in oklab, var(--foreground) 10%, transparent))",
              }
        }
      />
      {content}
    </div>,
    document.body,
  );
}
