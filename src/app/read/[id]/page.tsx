import { ReaderView } from "@/components/reader-view";

export default function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  return <ReaderView params={params} />;
}
