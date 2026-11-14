/**
 * Natural pixel size of remote images, cached for the MCP surface.
 *
 * Image fit needs the true source dimensions, which only the browser knows.
 * Loading is best-effort: a failure or timeout returns null and the caller falls
 * back to the previous behaviour (full-source stretch), so a slow CDN can never
 * block a render forever.
 */

export type ImageSize = { width: number; height: number };

const cache = new Map<string, ImageSize | null>();
const pending = new Map<string, Promise<ImageSize | null>>();

const DEFAULT_TIMEOUT_MS = 2500;

/** Return the cached size (or null for known failures) without loading. */
export function getCachedImageSize(url: string): ImageSize | null | undefined {
  return cache.get(url);
}

/** Load an image's natural size, deduping concurrent requests. */
export function loadImageSize(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ImageSize | null> {
  const cached = cache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);
  const inflight = pending.get(url);
  if (inflight) return inflight;

  const load = new Promise<ImageSize | null>((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    let settled = false;
    const finish = (size: ImageSize | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cache.set(url, size);
      pending.delete(url);
      resolve(size);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    img.onload = () => {
      const width = img.naturalWidth || 0;
      const height = img.naturalHeight || 0;
      finish(width > 0 && height > 0 ? { width, height } : null);
    };
    img.onerror = () => finish(null);
    try {
      img.decoding = "async";
      img.src = url;
    } catch {
      finish(null);
    }
  });

  pending.set(url, load);
  return load;
}

/** Load several sizes at once; unknown/failed URLs map to null. */
export async function loadImageSizes(
  urls: Iterable<string>,
): Promise<Map<string, ImageSize | null>> {
  const unique = [...new Set([...urls].filter((url) => typeof url === "string" && url))];
  const entries = await Promise.all(
    unique.map(async (url) => [url, await loadImageSize(url)] as const),
  );
  return new Map(entries);
}
