import type { Digest } from "./types";

export type DigestPayload = {
  digest: Digest | null;
  requestedDate: string;
  usedFallback: boolean;
};

export function mergeDigestPayload(server: DigestPayload, overlay: Digest | null): DigestPayload {
  if (!overlay || overlay.items.length === 0) {
    return server;
  }
  if (overlay.date === server.requestedDate) {
    return {
      digest: overlay,
      requestedDate: server.requestedDate,
      usedFallback: false,
    };
  }
  if (!server.digest || server.digest.items.length === 0) {
    return {
      digest: overlay,
      requestedDate: server.requestedDate,
      usedFallback: overlay.date !== server.requestedDate,
    };
  }
  if (overlay.date > server.digest.date) {
    return {
      digest: overlay,
      requestedDate: server.requestedDate,
      usedFallback: overlay.date !== server.requestedDate,
    };
  }
  return server;
}
