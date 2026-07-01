export type ImagePixelBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function readImageNaturalSize(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve({
        width: Math.max(1, image.naturalWidth),
        height: Math.max(1, image.naturalHeight),
      });
    };
    image.onerror = () => reject(new Error("Failed to read image dimensions"));
    image.src = src;
  });
}

export async function readImageAlphaBounds(
  src: string,
  alphaThreshold = 8,
): Promise<ImagePixelBounds | null> {
  const { width, height } = await readImageNaturalSize(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      ctx.drawImage(image, 0, 0);
      resolve();
    };
    image.onerror = () => reject(new Error("Failed to load image for trim"));
    image.src = src;
  });

  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]!;
      if (alpha <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function fitDisplaySizeToNatural(input: {
  displayWidth: number;
  displayHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}) {
  const currentMax = Math.max(input.displayWidth, input.displayHeight);
  const naturalMax = Math.max(input.naturalWidth, input.naturalHeight);
  const scale = currentMax / Math.max(1, naturalMax);
  return {
    width: Math.max(1, Math.round(input.naturalWidth * scale)),
    height: Math.max(1, Math.round(input.naturalHeight * scale)),
  };
}

export async function resolveSelectionPngMultiplier(
  scene: { nodes: Record<string, { type: string; width?: number; src?: string; cropWidth?: number }> },
  selectedIds: string[],
  fallback = 2,
): Promise<number> {
  if (selectedIds.length !== 1) return fallback;
  const node = scene.nodes[selectedIds[0]!];
  if (!node || node.type !== "image" || !node.src || (node.width ?? 0) <= 0) {
    return fallback;
  }
  try {
    const natural = await readImageNaturalSize(node.src);
    const sourceWidth = node.cropWidth ?? natural.width;
    return Math.max(1, Math.round(sourceWidth / node.width!));
  } catch {
    return fallback;
  }
}
