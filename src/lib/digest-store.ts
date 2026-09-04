import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Digest } from "./types";

export type DigestStorePaths = {
  bundled: string;
  writable: string;
};

export function isReadOnlyFsError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "EROFS" || code === "EACCES") {
    return true;
  }
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return /read-only file system/i.test(message);
}

export function resolveDigestStorePaths(input?: {
  cwd?: string;
  tmpdir?: string;
  env?: NodeJS.Dict<string>;
}): DigestStorePaths {
  const cwd = input?.cwd ?? process.cwd();
  const tmpdir = input?.tmpdir ?? os.tmpdir();
  const env = input?.env ?? process.env;
  const bundled = path.join(cwd, "data", "digests");
  const override = env.DIGEST_DIR?.trim();
  if (override && override !== "tmp") {
    return { bundled, writable: override };
  }
  const serverless =
    env.VERCEL === "1" || Boolean(env.AWS_LAMBDA_FUNCTION_NAME) || override === "tmp";
  return {
    bundled,
    writable: serverless ? path.join(tmpdir, "chendu-digests") : bundled,
  };
}

export function digestCandidateDirs(paths: DigestStorePaths, tmpdir = os.tmpdir()): string[] {
  const tmpOverlay = path.join(tmpdir, "chendu-digests");
  return [...new Set([paths.writable, tmpOverlay, paths.bundled])];
}

export async function writeDigestJson(digest: Digest, dirs: string[]): Promise<string> {
  const body = `${JSON.stringify(digest, null, 2)}\n`;
  for (const dir of dirs) {
    try {
      await mkdir(dir, { recursive: true });
      const filePath = path.join(dir, `${digest.date}.json`);
      await writeFile(filePath, body, "utf8");
      return filePath;
    } catch (error) {
      if (isReadOnlyFsError(error)) {
        continue;
      }
      throw error;
    }
  }
  return `memory:${digest.date}`;
}
