import { SettingsExtras } from "@/components/settings-extras";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES, OFFICIAL_SOURCES } from "@/lib/feeds";
import { readProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

function ToggleButton({
  kind,
  id,
  enabled,
  title,
  hint,
}: {
  kind: "source" | "category";
  id: string;
  enabled: boolean;
  title: string;
  hint: string;
}) {
  return (
    <form action="/settings/toggle" method="post" className="rounded-lg border px-3 py-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="enable" value={enabled ? "0" : "1"} />
      <button type="submit" className="flex w-full items-start gap-3 text-left">
        <span
          aria-hidden
          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${
            enabled
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background text-transparent"
          }`}
        >
          <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{hint}</span>
        </span>
        <span className={`mt-0.5 shrink-0 text-xs ${enabled ? "text-primary" : "text-muted-foreground"}`}>
          {enabled ? "已开" : "已关"}
        </span>
      </button>
    </form>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const progress = await readProgress();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          订阅只影响你看到哪些条目。每天 06:00（北京时间）采集的是站点级官方源。点一下即可开关。
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {ok ? <p className="rounded-lg border bg-secondary px-3 py-2 text-sm">{ok}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>立即采集</CardTitle>
          <CardDescription>
            拉取官方 RSS 中「昨天」（Asia/Shanghai）的条目。无 API Key 时用免费翻译，失败则只保留英文。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/settings/collect" method="post">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground"
            >
              采集昨日官方要闻
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>阅读偏好</CardTitle>
          <CardDescription>
            中文译文默认用灰色斜体弱化。开启遮挡后，译文被盖住，鼠标移上去才显示。点一下即可开关。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/settings/prefs" method="post" className="rounded-lg border px-3 py-2">
            <input
              type="hidden"
              name="maskTranslation"
              value={progress.maskTranslation ? "" : "on"}
            />
            <button type="submit" className="flex w-full items-start gap-3 text-left">
              <span
                aria-hidden
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${
                  progress.maskTranslation
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-transparent"
                }`}
              >
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">遮挡中文译文</span>
                <span className="block text-xs text-muted-foreground">
                  对照阅读时先藏起译文，悬停再看，方便先猜再对照。
                </span>
              </span>
              <span
                className={`mt-0.5 shrink-0 text-xs ${
                  progress.maskTranslation ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {progress.maskTranslation ? "已开" : "已关"}
              </span>
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>官方源</CardTitle>
          <CardDescription>点一下即可开关。关闭后，对应条目不会出现在今日列表。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {(["world", "tech"] as const).map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group === "world" ? "全球要闻" : "科技博客"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {OFFICIAL_SOURCES.filter((source) => source.group === group).map((source) => {
                  const enabled = progress.enabledSourceIds.includes(source.id);
                  return (
                    <ToggleButton
                      key={source.id}
                      kind="source"
                      id={source.id}
                      enabled={enabled}
                      title={source.name}
                      hint={source.feedUrl}
                    />
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
          <CardDescription>点一下即可开关。关掉的分类不会出现在今日筛选和列表里。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((category) => {
            const enabled = progress.enabledCategories.includes(category.id);
            return (
              <ToggleButton
                key={category.id}
                kind="category"
                id={category.id}
                enabled={enabled}
                title={category.label}
                hint={category.hint}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自定义 RSS</CardTitle>
          <CardDescription>
            粘贴任意公开的 RSS/Atom 链接即可拉取。结果保存在本机 Cookie，不写入共享简报。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action="/settings/custom" method="post" className="flex flex-col gap-2 sm:flex-row">
            <input
              name="feedUrl"
              placeholder="https://github.blog/feed/"
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm"
            />
            <button type="submit" className="inline-flex h-8 shrink-0 items-center rounded-lg border px-3 text-sm">
              拉取并加入
            </button>
          </form>
          {progress.customFeeds.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {progress.customFeeds.map((feed) => (
                <li key={feed.id}>{feed.name}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <SettingsExtras />
    </div>
  );
}
