import { collectCustomFeed } from "@/lib/collect";
import { collectAndSave } from "@/lib/digest";
import { parseFeedUrl } from "@/lib/feeds";
import { llmFromHeaders } from "@/lib/translate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const llm = llmFromHeaders(request.headers);
  let body: { kind?: string; feedUrl?: string } = {};
  try {
    body = (await request.json()) as { kind?: string; feedUrl?: string };
  } catch {
    body = {};
  }

  if (body.kind === "custom") {
    const feedUrl = body.feedUrl?.trim() ?? "";
    const check = parseFeedUrl(feedUrl);
    if (!check.ok) {
      return Response.json({ error: check.error }, { status: 400 });
    }
    try {
      const result = await collectCustomFeed(feedUrl, llm);
      return Response.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "采集失败";
      return Response.json({ error: message }, { status: 502 });
    }
  }

  const digest = await collectAndSave(llm);
  return Response.json({ digest });
}
