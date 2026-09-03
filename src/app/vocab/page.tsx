import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function VocabPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type = "all" } = await searchParams;
  const progress = await readProgress();
  const query = q.trim().toLowerCase();
  const items = progress.vocab.filter((entry) => {
    const typeOk = type === "all" || entry.type === type;
    const text = `${entry.term} ${entry.definitionEn ?? ""} ${entry.definitionZh ?? ""}`.toLowerCase();
    return typeOk && (!query || text.includes(query));
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold">生词本</h1>
        <p className="mt-1 text-sm text-muted-foreground">保存在这台浏览器的 Cookie 里，可到设置页继续导出本机备份。</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" action="/vocab">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索单词、短语或释义"
          className="h-8 w-full rounded-lg border border-input px-2.5 text-sm sm:max-w-sm"
        />
        <input type="hidden" name="type" value={type} />
        <button type="submit" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm">
          搜索
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <TypeLink href="/vocab" active={type === "all"}>
          全部 {progress.vocab.length}
        </TypeLink>
        <TypeLink href="/vocab?type=word" active={type === "word"}>
          单词
        </TypeLink>
        <TypeLink href="/vocab?type=phrase" active={type === "phrase"}>
          短语
        </TypeLink>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card px-5 py-10 text-center">
          <h2 className="font-medium">{progress.vocab.length === 0 ? "生词本还是空的" : "没有匹配的条目"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {progress.vocab.length === 0 ? "去今日晨报里点一个单词，再加入生词本。" : "换个关键词试试。"}
          </p>
          {progress.vocab.length === 0 ? (
            <Link href="/" className="mt-4 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground">
              去今日
            </Link>
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
                  <form action="/vocab/remove" method="post">
                    <input type="hidden" name="id" value={entry.id} />
                    <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                      删除
                    </button>
                  </form>
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

function TypeLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
