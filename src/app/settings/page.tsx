import { SettingsView } from "@/components/settings-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const progress = await readProgress();
  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {ok ? <p className="rounded-lg border bg-secondary px-3 py-2 text-sm">{ok}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>阅读偏好</CardTitle>
          <CardDescription>
            中文译文默认用灰色斜体弱化。开启遮挡后，译文被盖住，鼠标移上去才显示。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/settings/prefs" method="post" className="space-y-3">
            <label className="flex items-start gap-3 rounded-lg border px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="maskTranslation"
                value="on"
                defaultChecked={progress.maskTranslation}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">遮挡中文译文</span>
                <span className="text-xs text-muted-foreground">对照阅读时先藏起译文，悬停再看，方便先猜再对照。</span>
              </span>
            </label>
            <button type="submit" className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground">
              保存偏好
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自定义官方 RSS</CardTitle>
          <CardDescription>
            必须是白名单里的出版方域名。非官方聚合站会被拒绝。结果保存在本机 Cookie，不写入共享简报。
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

      <SettingsView />
    </div>
  );
}
