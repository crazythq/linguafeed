import { collectPresetAction } from "@/app/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(): Promise<Response> {
  await collectPresetAction();
  return new Response(null, { status: 302, headers: { Location: "/settings" } });
}
