import type { SaraswatiShadow } from "../scene";

/** Shared parsing for effect fields that both document loaders persist. */

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function readBlur(value: unknown): number {
  return Math.max(0, Math.min(100, num(value, 0)));
}

/**
 * Validate a persisted shadow. A shadow with no blur and no offset draws
 * nothing, so it is normalized back to null instead of lingering as a no-op.
 */
export function readShadow(value: unknown): SaraswatiShadow | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const blur = Math.max(0, num(raw.blur, 0));
  const offsetX = num(raw.offsetX, 0);
  const offsetY = num(raw.offsetY, 0);
  if (blur === 0 && offsetX === 0 && offsetY === 0) return null;
  return {
    blur,
    offsetX,
    offsetY,
    colorHex:
      typeof raw.colorHex === "string" && raw.colorHex
        ? raw.colorHex
        : "#000000",
    opacityPct: Math.max(0, Math.min(100, num(raw.opacityPct, 100))),
  };
}
