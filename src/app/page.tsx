import { HomeFeed } from "@/components/home-feed";
import { loadBestDigest } from "@/lib/digest";
import { readProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category = "all" } = await searchParams;
  const [initial, progress] = await Promise.all([loadBestDigest(), readProgress()]);
  return <HomeFeed initial={initial} category={category} extraItems={progress.customItems} />;
}
