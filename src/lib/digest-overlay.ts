import type { Digest } from "./types";

export const DIGEST_OVERLAY_KEY = "chendu-digest-overlay-v1";

const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedDigest: Digest | null = null;

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

function readOverlay(raw: string | null): Digest | null {
  if (raw === cachedRaw) {
    return cachedDigest;
  }
  cachedRaw = raw;
  cachedDigest = parseOverlay(raw);
  return cachedDigest;
}

export function saveDigestOverlay(digest: Digest): void {
  if (typeof window === "undefined") {
    return;
  }
  const raw = JSON.stringify(digest);
  window.localStorage.setItem(DIGEST_OVERLAY_KEY, raw);
  cachedRaw = raw;
  cachedDigest = digest;
  emit();
}

export function loadDigestOverlay(): Digest | null {
  if (typeof window === "undefined") {
    return null;
  }
  return readOverlay(window.localStorage.getItem(DIGEST_OVERLAY_KEY));
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
