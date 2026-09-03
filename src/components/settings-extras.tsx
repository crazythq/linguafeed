"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useUserState } from "@/hooks/use-user-state";
import { exportUserState, importUserState } from "@/lib/storage";

export function SettingsExtras() {
  const { state, update } = useUserState();
  const [includeKey, setIncludeKey] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      <Card>
        <CardHeader>
          <CardTitle>可选大模型</CardTitle>
          <CardDescription>
            OpenAI 兼容接口。Key 只存在本机浏览器，请求时带到本站 API。留空则用免费翻译/词典。
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
          <CardDescription>备份本机 LLM 设置等。订阅与生词本已保存在 Cookie。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeKey}
              onChange={(event) => setIncludeKey(event.target.checked)}
              className="size-4 accent-primary"
            />
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
