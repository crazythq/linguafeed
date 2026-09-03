"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserState } from "@/hooks/use-user-state";
import { CATEGORIES, sourceById } from "@/lib/feeds";
import { filterVisibleItems } from "@/lib/storage";
import type { Digest } from "@/lib/types";

type DigestResponse = {
  digest: Digest | null;
  requestedDate: string;
  usedFallback: boolean;
};

export function HomeFeed() {
  const { state, update } = useUserState();
  const [payload, setPayload] = useState<DigestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/digest")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("无法加载今日简报");
        }
        return response.json() as Promise<DigestResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => {
    const serverItems = payload?.digest?.items ?? [];
    const merged = [...serverItems, ...state.customItems];
    const visible = filterVisibleItems(merged, state.enabledSourceIds, state.enabledCategories);
    if (category === "all") {
      return visible;
    }
    return visible.filter((item) => item.category === category);
  }, [payload, state.customItems, state.enabledSourceIds, state.enabledCategories, category]);

  if (error) {
    return (
      <Empty title="简报加载失败" detail={error}>
        <Button onClick={() => window.location.reload()}>重试</Button>
      </Empty>
    );
  }

  if (!payload) {
    return <p className="text-sm text-muted-foreground">正在整理昨天的官方要闻…</p>;
  }

  if (!payload.digest || payload.digest.items.length === 0) {
    return (
      <Empty
        title="还没有昨天的简报"
        detail={`按 Asia/Shanghai 计算，昨天是 ${payload.requestedDate}。可到设置页立即采集，或等待每天 06:00 的定时任务。`}
      >
        <Button render={<Link href="/settings" />}>去设置采集</Button>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {payload.usedFallback
            ? `昨天（${payload.requestedDate}）还没有条目，正在显示 ${payload.digest.date} 的官方简报。`
            : `${payload.digest.date} · 前一日官方要闻`}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">今日晨读</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          点进一篇对照阅读：英文分句、中文可开关，点词即可查义和收藏。正文只来自出版方 RSS/Atom。
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
          全部
        </FilterChip>
        {CATEGORIES.filter((item) => state.enabledCategories.includes(item.id)).map((item) => (
          <FilterChip key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>
            {item.label}
          </FilterChip>
        ))}
      </div>

      {items.length === 0 ? (
        <Empty title="这个分类没有内容" detail="试试打开更多分类，或到设置里启用对应的官方源。">
          <Button render={<Link href="/settings" />} variant="outline">
            调整订阅
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const source = sourceById(item.sourceId);
            const read = state.readIds.includes(item.id);
            return (
              <Link key={item.id} href={`/read/${item.id}`} onClick={() => {
                update((current) =>
                  current.readIds.includes(item.id)
                    ? current
                    : { ...current, readIds: [...current.readIds, item.id] },
                );
              }}>
                <Card size="sm" className="transition-colors hover:bg-secondary/40">
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{source?.name ?? item.sourceId}</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                      {item.custom ? <Badge variant="outline">自定义源</Badge> : null}
                      {read ? <span className="text-xs text-muted-foreground">已读</span> : null}
                    </div>
                    <CardTitle className="text-base leading-6">{item.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {item.sentences[1]?.en || item.sentences[0]?.en}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {new Date(item.publishedAt).toLocaleString("zh-CN", { hour12: false })}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Empty({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-10 text-center">
      <h2 className="font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>
      {children ? <div className="mt-4 flex justify-center">{children}</div> : null}
    </div>
  );
}
