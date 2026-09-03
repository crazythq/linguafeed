import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DigestPayload } from "@/lib/digest-payload";
import { CATEGORIES, sourceById } from "@/lib/feeds";
import type { CategoryId, DigestItem } from "@/lib/types";

export function HomeFeed({
  initial,
  category,
  extraItems,
  enabledSourceIds,
  enabledCategories,
}: {
  initial: DigestPayload;
  category: string;
  extraItems: DigestItem[];
  enabledSourceIds: string[];
  enabledCategories: CategoryId[];
}) {
  const payload = initial;
  const serverItems = payload.digest?.items ?? [];
  const merged = [...extraItems, ...serverItems].filter((item) => {
    const sourceOk = item.custom || enabledSourceIds.includes(item.sourceId);
    const categoryOk = enabledCategories.includes(item.category);
    return sourceOk && categoryOk;
  });
  const items = category === "all" ? merged : merged.filter((item) => item.category === category);
  const visibleCategories = CATEGORIES.filter((item) => enabledCategories.includes(item.id));

  if (!payload.digest || payload.digest.items.length === 0) {
    return (
      <Empty
        title="还没有昨天的简报"
        detail={`按 Asia/Shanghai 计算，昨天是 ${payload.requestedDate}。可到设置页立即采集，或等待每天 06:00 的定时任务。`}
      >
        <Link href="/settings" className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground">
          去设置采集
        </Link>
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
        <FilterChip href="/" active={category === "all"}>
          全部
        </FilterChip>
        {visibleCategories.map((item) => (
          <FilterChip key={item.id} href={`/?category=${item.id}`} active={category === item.id}>
            {item.label}
          </FilterChip>
        ))}
      </div>

      {items.length === 0 ? (
        <Empty title="这个分类没有内容" detail="试试打开更多分类，或到设置里启用对应的官方源。">
          <Link href="/settings" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm">
            调整订阅
          </Link>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const source = sourceById(item.sourceId);
            return (
              <Link key={item.id} href={`/read/${item.id}`}>
                <Card size="sm" className="transition-colors hover:bg-secondary/40">
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{source?.name ?? item.sourceId}</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                      {item.custom ? <Badge variant="outline">自定义源</Badge> : null}
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
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
      }`}
    >
      {children}
    </Link>
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
