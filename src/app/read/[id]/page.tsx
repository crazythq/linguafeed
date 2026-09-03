import { ReaderView } from "@/components/reader-view";
import { loadBestDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { digest } = await loadBestDigest();
  const item = digest?.items.find((entry) => entry.id === id) ?? null;
  return <ReaderView id={id} initialItem={item} />;
}
