import type { SaraswatiImageCredit } from "./types";

/** utm_source the Unsplash API guidelines require on links back to Unsplash. */
export const UNSPLASH_UTM_SOURCE = "avnac";

/**
 * Tags an Unsplash link with the referral parameters their API guidelines
 * require. Anything that is not an absolute URL is returned untouched.
 */
export function unsplashReferralLink(absoluteUrl: string): string {
  const trimmed = absoluteUrl.trim();
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed);
    url.searchParams.set("utm_source", UNSPLASH_UTM_SOURCE);
    url.searchParams.set("utm_medium", "referral");
    return url.toString();
  } catch {
    return trimmed;
  }
}

/**
 * Normalizes a stored credit record. Returns null unless it carries both a
 * photographer and a credit line — a partial credit cannot satisfy the
 * attribution requirement, so it is better dropped than half-restored.
 *
 * Used on every trust boundary: MCP payloads and documents loaded from disk.
 */
export function normalizeImageCredit(
  raw: unknown,
): SaraswatiImageCredit | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const photographer = readString(record.photographer);
  const text = readString(record.text);
  if (!photographer || !text) return null;
  return {
    source: readString(record.source) || "unsplash",
    photoId: readString(record.photoId),
    photographer,
    photographerUrl: readString(record.photographerUrl),
    photoUrl: readString(record.photoUrl),
    text,
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
