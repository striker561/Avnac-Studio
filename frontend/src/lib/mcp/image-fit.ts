/**
 * Source-crop math for MCP-placed images.
 *
 * The canvas renderer draws an image's source rectangle into the element box.
 * MCP used to pass no source rectangle, so every photo was stretched to the box
 * aspect — the most common way a layout looked wrong. This module turns
 * `fit` / `focalPoint` / explicit crop into the pixel crop the engine already
 * understands (`cropX`, `cropY`, `cropWidth`, `cropHeight`).
 */

export type ImageSize = { width: number; height: number };

export type ImageFit = "fill" | "cover";

export type NormalizedCrop = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type FocalPoint = { x?: number; y?: number };

export type CropPixels = {
  cropX: number;
  cropY: number;
  cropWidth?: number;
  cropHeight?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Normalize a fit string, defaulting to fill (the pre-existing behaviour). */
export function normalizeImageFit(value: unknown): ImageFit {
  const v = String(value ?? "fill").trim().toLowerCase();
  return v === "cover" ? "cover" : "fill";
}

/**
 * True only when placing an image needs its natural pixel size: a cover crop
 * needs the source aspect, and an explicit crop needs the source rectangle.
 * A plain image stretches to its box, so fetching dimensions would only add
 * network latency.
 */
export function imageNeedsNaturalSize(el: {
  fit?: unknown;
  crop?: unknown;
}): boolean {
  return normalizeImageFit(el.fit) === "cover" || el.crop != null;
}

/**
 * Compute the source rectangle for an image placed into a target box.
 *
 * - no fit / `fill`: full source, stretched (backward compatible).
 * - `cover`: crop the source to the target aspect, anchored on the focal point.
 * - explicit normalized `crop` wins over both; the caller is art-directing.
 */
export function computeImageCrop(params: {
  natural: ImageSize | null | undefined;
  target: { width: number; height: number };
  fit?: unknown;
  focalPoint?: FocalPoint | null;
  crop?: NormalizedCrop | null;
}): CropPixels {
  const full: CropPixels = { cropX: 0, cropY: 0 };
  const natural = params.natural;
  if (!natural || !(natural.width > 0) || !(natural.height > 0)) return full;

  const explicit = params.crop;
  if (
    explicit &&
    typeof explicit.width === "number" &&
    typeof explicit.height === "number" &&
    explicit.width > 0 &&
    explicit.height > 0
  ) {
    const x = clamp(explicit.x ?? 0, 0, 0.999);
    const y = clamp(explicit.y ?? 0, 0, 0.999);
    const w = clamp(explicit.width, 0.001, 1 - x);
    const h = clamp(explicit.height, 0.001, 1 - y);
    return {
      cropX: Math.round(x * natural.width),
      cropY: Math.round(y * natural.height),
      cropWidth: Math.max(1, Math.round(w * natural.width)),
      cropHeight: Math.max(1, Math.round(h * natural.height)),
    };
  }

  if (normalizeImageFit(params.fit) !== "cover") return full;

  const targetW = params.target.width;
  const targetH = params.target.height;
  if (!(targetW > 0) || !(targetH > 0)) return full;

  const sourceRatio = natural.width / natural.height;
  const targetRatio = targetW / targetH;
  const focalX = clamp(params.focalPoint?.x ?? 0.5, 0, 1);
  const focalY = clamp(params.focalPoint?.y ?? 0.5, 0, 1);

  if (sourceRatio > targetRatio) {
    // Source is wider: keep full height, crop horizontally.
    const cropWidth = Math.max(1, Math.round(natural.height * targetRatio));
    const x = clamp(
      Math.round(focalX * natural.width - cropWidth / 2),
      0,
      Math.max(0, natural.width - cropWidth),
    );
    return { cropX: x, cropY: 0, cropWidth, cropHeight: natural.height };
  }

  // Source is taller (or equal): keep full width, crop vertically.
  const cropHeight = Math.max(1, Math.round(natural.width / targetRatio));
  const y = clamp(
    Math.round(focalY * natural.height - cropHeight / 2),
    0,
    Math.max(0, natural.height - cropHeight),
  );
  return { cropX: 0, cropY: y, cropWidth: natural.width, cropHeight };
}
