"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useUserState } from "@/hooks/use-user-state";
import { saveDigestOverlay } from "@/lib/digest-overlay";
import { llmHeaders } from "@/lib/llm-headers";
import type { Digest } from "@/lib/types";

export function CollectOfficialButton() {
  const router = useRouter();
  const { state } = useUserState();
  const [busy, setBusy] = useState(false);

  async function collect(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    toast.message("正在采集昨日官方要闻，可能需要一分钟…");
    try {
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...llmHeaders(state.llm),
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { digest?: Digest; error?: string };
      if (!response.ok || !payload.digest) {
        throw new Error(payload.error || "采集失败");
      }
      saveDigestOverlay(payload.digest);
      const failNote =
        payload.digest.failures.length > 0 ? `，${payload.digest.failures.length} 个源失败` : "";
      toast.success(`采集完成：${payload.digest.items.length} 条昨日要闻${failNote}`);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "采集失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        void collect();
      }}
      className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground disabled:opacity-60"
    >
      {busy ? "采集中…" : "采集昨日官方要闻"}
    </button>
  );
}
