import { collectCustomAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  await collectCustomAction(formData);
  return new Response(null, { status: 302, headers: { Location: "/settings" } });
}
