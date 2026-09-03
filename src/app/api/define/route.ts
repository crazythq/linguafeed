import { defineWord } from "@/lib/define";
import { llmFromHeaders } from "@/lib/translate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const llm = llmFromHeaders(request.headers);
  const body = (await request.json()) as { word?: string; sentence?: string };
  const word = body.word?.trim() ?? "";
  if (!word) {
    return Response.json({ error: "缺少单词" }, { status: 400 });
  }
  const definition = await defineWord(word, body.sentence ?? "", llm);
  return Response.json({ definition });
}
