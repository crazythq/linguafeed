"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserState } from "@/hooks/use-user-state";
import type { VocabType } from "@/lib/types";

export function VocabView() {
  const { state, update, hydrated } = useUserState();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<VocabType | "all">("all");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.vocab.filter((entry) => {
      const typeOk = tab === "all" || entry.type === tab;
      const text = `${entry.term} ${entry.definitionEn ?? ""} ${entry.definitionZh ?? ""}`.toLowerCase();
      return typeOk && (!q || text.includes(q));
    });
  }, [state.vocab, query, tab]);

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">正在读取本机生词本…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold">生词本</h1>
        <p className="mt-1 text-sm text-muted-foreground">保存在这台浏览器里，可到设置页导出备份。</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索单词、短语或释义"
          className="sm:max-w-sm"
        />
        <Tabs value={tab} onValueChange={(value) => setTab(value as VocabType | "all")}>
          <TabsList>
            <TabsTrigger value="all">全部 {state.vocab.length}</TabsTrigger>
            <TabsTrigger value="word">单词</TabsTrigger>
            <TabsTrigger value="phrase">短语</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} />
        </Tabs>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card px-5 py-10 text-center">
          <h2 className="font-medium">{state.vocab.length === 0 ? "生词本还是空的" : "没有匹配的条目"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.vocab.length === 0 ? "去今日晨报里点一个单词，或划选短语。" : "换个关键词试试。"}
          </p>
          {state.vocab.length === 0 ? (
            <Button className="mt-4" render={<Link href="/" />}>
              去今日
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((entry) => (
            <Card key={entry.id} size="sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{entry.term}</CardTitle>
                      <Badge variant="outline">{entry.type === "phrase" ? "短语" : "单词"}</Badge>
                      {entry.phonetic ? <span className="text-xs text-muted-foreground">{entry.phonetic}</span> : null}
                    </div>
                    <p className="mt-1 text-sm">{entry.definitionEn ?? "未保存英文释义"}</p>
                    <p className="text-sm text-muted-foreground">{entry.definitionZh ?? "未保存中文释义"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      update((current) => ({
                        ...current,
                        vocab: current.vocab.filter((item) => item.id !== entry.id),
                      }));
                      toast.success("已删除");
                    }}
                  >
                    删除
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                {entry.sentence ? <p>例句：{entry.sentence}</p> : null}
                <Link href={`/read/${entry.articleId}`} className="text-primary hover:underline">
                  来源：{entry.articleTitle}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
