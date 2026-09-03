import type { Digest } from "./types";

export type DigestPayload = {
  digest: Digest | null;
  requestedDate: string;
  usedFallback: boolean;
};
