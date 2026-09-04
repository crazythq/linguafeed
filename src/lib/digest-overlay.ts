import type { Digest } from "./types";

export const DIGEST_OVERLAY_KEY = "chendu-digest-overlay-v1";

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function parseOverlay(raw: string | null): Digest | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Digest;
    if (!parsed || typeof parsed.date !== "string" || !Array.isArray(parsed.items)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDigestOverlay(digest: Digest): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(DIGEST_OVERLAY_KEY, JSON.stringify(digest));
  emit();
}

export function loadDigestOverlay(): Digest | null {
  if (typeof window === "undefined") {
    return null;
  }
  return parseOverlay(window.localStorage.getItem(DIGEST_OVERLAY_KEY));
}

export function subscribeDigestOverlay(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export function getDigestOverlaySnapshot(): Digest | null {
  return loadDigestOverlay();
}

export function getDigestOverlayServerSnapshot(): Digest | null {
  return null;
}
