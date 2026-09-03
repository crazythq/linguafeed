import { HomeFeed } from "@/components/home-feed";
import { loadBestDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initial = await loadBestDigest();
  return <HomeFeed initial={initial} />;
}
