"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUserState } from "@/hooks/use-user-state";
import { CATEGORIES, isOfficialFeedUrl, OFFICIAL_SOURCES } from "@/lib/feeds";
import { llmHeaders } from "@/lib/llm-headers";
import { exportUserState, importUserState } from "@/lib/storage";
import type { CategoryId, Digest, DigestItem } from "@/lib/types";

export function SettingsView() {
  const { state, update } = useUserState();
  const [collecting, setCollecting] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [includeKey, setIncludeKey] = useState(false);
  const [failures, setFailures] = useState<{ sourceId: string; error: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function collectPreset() {
    setCollecting(true);
    try {
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...llmHeaders(state.llm) },
        body: JSON.stringify({ kind: "preset" }),
      });
      const data = (await response.json()) as { digest?: Digest; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "采集失败");
      }
      setFailures(data.digest?.failures ?? []);
      toast.success(`采集完成：${data.digest?.items.length ?? 0} 条昨日要闻`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "采集失败");
    } finally {
      setCollecting(false);
    }
  }

  async function collectCustom() {
    const check = isOfficialFeedUrl(customUrl.trim());
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    setCollecting(true);
    try {
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...llmHeaders(state.llm) },
        body: JSON.stringify({ kind: "custom", feedUrl: customUrl.trim() }),
      });
      const data = (await response.json()) as { items?: DigestItem[]; sourceName?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "采集失败");
      }
      const items = data.items ?? [];
      update((current) => {
        const ids = new Set(current.customItems.map((item) => item.id));
        const merged = [...items.filter((item) => !ids.has(item.id)), ...current.customItems];
        const feedId = customUrl.trim();
        const feeds = current.customFeeds.some((feed) => feed.url === feedId)
          ? current.customFeeds
          : [
              ...current.customFeeds,
              { id: feedId, url: feedId, name: data.sourceName ?? check.url.hostname, enabled: true },
            ];
        return { ...current, customItems: merged, customFeeds: feeds };
      });
      toast.success(`已加入 ${items.length} 条，来自 ${data.sourceName}`);
      setCustomUrl("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "采集失败");
    } finally {
      setCollecting(false);
    }
  }

  function downloadExport() {
    const blob = new Blob([exportUserState(state, includeKey)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chendu-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          订阅只影响你看到哪些条目。每天 06:00（北京时间）采集的是站点级官方源。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>立即采集</CardTitle>
          <CardDescription>
            拉取官方 RSS 中「昨天」（Asia/Shanghai）的条目。无 API Key 时用免费翻译，失败则只保留英文。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={collectPreset} disabled={collecting}>
            {collecting ? "正在采集，可能需要一两分钟…" : "采集昨日官方要闻"}
          </Button>
          {failures.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {failures.map((failure) => (
                <li key={failure.sourceId}>
                  {failure.sourceId}：{failure.error}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>官方源</CardTitle>
          <CardDescription>关闭后，对应条目不会出现在今日列表。采集任务仍会拉取预置源。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {(["world", "tech"] as const).map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group === "world" ? "全球要闻" : "科技博客"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {OFFICIAL_SOURCES.filter((source) => source.group === group).map((source) => {
                  const enabled = state.enabledSourceIds.includes(source.id);
                  return (
                    <label key={source.id} className="flex items-start gap-3 rounded-lg border px-3 py-2">
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={(checked) => {
                          update((current) => ({
                            ...current,
                            enabledSourceIds: checked
                              ? [...new Set([...current.enabledSourceIds, source.id])]
                              : current.enabledSourceIds.filter((id) => id !== source.id),
                          }));
                        }}
                      />
                      <span>
                        <span className="block text-sm font-medium">{source.name}</span>
                        <a href={source.siteUrl} className="text-xs text-muted-foreground hover:underline" target="_blank" rel="noreferrer">
                          {source.feedUrl}
                        </a>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关注分类</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((category) => {
            const enabled = state.enabledCategories.includes(category.id);
            return (
              <label key={category.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span>
                  <span className="block text-sm font-medium">{category.label}</span>
                  <span className="text-xs text-muted-foreground">{category.hint}</span>
                </span>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    update((current) => ({
                      ...current,
                      enabledCategories: checked
                        ? [...current.enabledCategories, category.id as CategoryId]
                        : current.enabledCategories.filter((id) => id !== category.id),
                    }));
                  }}
                />
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自定义官方 RSS</CardTitle>
          <CardDescription>必须是白名单里的出版方域名。结果只存在本机，不会写入共享简报。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder="https://github.blog/feed/"
            />
            <Button variant="outline" onClick={collectCustom} disabled={collecting}>
              拉取并加入
            </Button>
          </div>
          {state.customFeeds.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {state.customFeeds.map((feed) => (
                <li key={feed.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{feed.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      update((current) => ({
                        ...current,
                        customFeeds: current.customFeeds.filter((item) => item.id !== feed.id),
                        customItems: current.customItems.filter((item) => item.sourceId !== `custom-${new URL(feed.url).hostname}` && !feed.url.includes(item.url)),
                      }))
                    }
                  >
                    移除
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>可选大模型</CardTitle>
          <CardDescription>
            OpenAI 兼容接口。Key 只存在本机，请求时带到本站 API，不会写入 digest 文件。留空则用免费翻译/词典。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={state.llm.apiKey}
              onChange={(event) =>
                update((current) => ({ ...current, llm: { ...current.llm, apiKey: event.target.value } }))
              }
              placeholder="sk-..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={state.llm.baseUrl}
              onChange={(event) =>
                update((current) => ({ ...current, llm: { ...current.llm, baseUrl: event.target.value } }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={state.llm.model}
              onChange={(event) =>
                update((current) => ({ ...current, llm: { ...current.llm, model: event.target.value } }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>导出 / 导入</CardTitle>
          <CardDescription>备份生词本、已读记录和订阅偏好。默认不导出 API Key。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeKey} onCheckedChange={(checked) => setIncludeKey(Boolean(checked))} />
            导出时包含 API Key
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadExport}>导出 JSON</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              导入 JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                try {
                  const text = await file.text();
                  const next = importUserState(text);
                  update(() => next);
                  toast.success("已导入本机进度");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "导入失败");
                }
              }}
            />
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">也可以复制下面的 JSON。</p>
          <Textarea readOnly value={exportUserState(state, includeKey)} className="min-h-32 font-mono text-xs" />
        </CardContent>
      </Card>
    </div>
  );
}
