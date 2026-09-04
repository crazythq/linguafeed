"use client";

import { useEffect, useState } from "react";
import {
  loadDigestOverlay,
  subscribeDigestOverlay,
} from "@/lib/digest-overlay";
import type { Digest } from "@/lib/types";

export function useDigestOverlay(): Digest | null {
  const [overlay, setOverlay] = useState<Digest | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOverlay(loadDigestOverlay());
    }, 0);
    const unsubscribe = subscribeDigestOverlay(() => {
      setOverlay(loadDigestOverlay());
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return overlay;
}
