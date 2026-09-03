import { updateSubscriptionsAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  await updateSubscriptionsAction(await request.formData());
  return new Response(null, { status: 302, headers: { Location: "/settings" } });
}
