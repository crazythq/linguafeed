import { loadBestDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";

export async function GET() {
  const { digest, requestedDate, usedFallback } = await loadBestDigest();
  return Response.json({ digest, requestedDate, usedFallback });
}
