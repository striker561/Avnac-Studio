import {
  isTransparentCssColor,
  type BgValue,
  type GradientStop,
} from "../../../editor-paint";
import type {
  SaraswatiClipPath,
  SaraswatiNodeOriginX,
  SaraswatiNodeOriginY,
  SaraswatiShadow,
} from "../../../saraswati/scene";
import { anchorToCenter } from "../../../saraswati/transform/anchor";

export type Canvas2DPreviewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Canvas2DTransformCommand = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  originX: SaraswatiNodeOriginX;
  originY: SaraswatiNodeOriginY;
  shadow: SaraswatiShadow | null;
  blur: number;
};

const imageCache = new Map<string, Promise<CanvasImageSource>>();
const textWidthCache = new Map<string, number>();
const textLayoutCache = new Map<string, string[]>();

function textWidthCacheKey(font: string, text: string) {
  return `${font}\0${text}`;
}

function textLayoutCacheKey(font: string, lines: string[], maxWidth: number) {
  return `${font}\0${maxWidth}\0${lines.join("\n")}`;
}

export function measureCanvas2DTextLineWidth(
  ctx: CanvasRenderingContext2D,
  font: string,
  text: string,
): number {
  const key = textWidthCacheKey(font, text);
  const hit = textWidthCache.get(key);
  if (hit !== undefined) return hit;
  ctx.font = font;
  const width = ctx.measureText(text).width;
  textWidthCache.set(key, width);
  return width;
}

export function layoutCanvas2DTextLines(
  ctx: CanvasRenderingContext2D,
  font: string,
  lines: string[],
  maxWidth: number,
): string[] {
  const key = textLayoutCacheKey(font, lines, maxWidth);
  const hit = textLayoutCache.get(key);
  if (hit) return hit;
  ctx.font = font;
  const wrapped = wrapCanvas2DTextLines(ctx, lines, maxWidth, font);
  textLayoutCache.set(key, wrapped);
  return wrapped;
}

export function withCanvas2DTransform(
  ctx: CanvasRenderingContext2D,
  command: Canvas2DTransformCommand,
  width: number,
  height: number,
  draw: () => void,
) {
  const centerX = anchorToCenter(
    command.x,
    command.originX,
    width * Math.abs(command.scaleX),
    true,
  );
  const centerY = anchorToCenter(
    command.y,
    command.originY,
    height * Math.abs(command.scaleY),
    false,
  );
  ctx.save();
  ctx.globalAlpha *= clampCanvas2DOpacity(command.opacity);
  applyCanvas2DEffects(ctx, command);
  ctx.translate(centerX, centerY);
  if (command.rotation) ctx.rotate((command.rotation * Math.PI) / 180);
  ctx.scale(command.scaleX, command.scaleY);
  draw();
  ctx.restore();
}

export function applyCanvas2DEffects(
  ctx: CanvasRenderingContext2D,
  command: Pick<Canvas2DTransformCommand, "shadow" | "blur">,
) {
  const blurPx = Math.max(0, Math.min(100, command.blur ?? 0)) * 0.4;
  // `filter` is the canvas-level primitive for post-process blur.
  ctx.filter = blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : "none";
  if (command.shadow) {
    const alpha = Math.max(0, Math.min(1, command.shadow.opacityPct / 100));
    ctx.shadowColor = shadowHexToRgba(command.shadow.colorHex, alpha);
    ctx.shadowBlur = Math.max(0, command.shadow.blur);
    ctx.shadowOffsetX = command.shadow.offsetX;
    ctx.shadowOffsetY = command.shadow.offsetY;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

export function fillAndStrokeCanvas2DPath(
  ctx: CanvasRenderingContext2D,
  fill: BgValue,
  stroke: BgValue | null,
  strokeWidth: number,
  box: Canvas2DPreviewBox,
) {
  const fillStyle = paintCanvas2DStyle(ctx, fill, box);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  const strokeStyle = paintCanvas2DStyle(ctx, stroke, box);
  if (strokeStyle && strokeWidth > 0) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

export function centeredCanvas2DBox(
  width: number,
  height: number,
): Canvas2DPreviewBox {
  return { x: -width / 2, y: -height / 2, width, height };
}

export function wrapCanvas2DTextLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxWidth: number,
  font = ctx.font,
) {
  if (maxWidth <= 1) return lines;
  const wrapped: string[] = [];
  for (const rawLine of lines) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      wrapped.push("");
      continue;
    }
    let current = words[0]!;
    for (let index = 1; index < words.length; index += 1) {
      const next = `${current} ${words[index]}`;
      if (measureCanvas2DTextLineWidth(ctx, font, next) <= maxWidth)
        current = next;
      else {
        wrapped.push(current);
        current = words[index]!;
      }
    }
    wrapped.push(current);
  }
  return wrapped;
}

export function paintCanvas2DStyle(
  ctx: CanvasRenderingContext2D,
  paint: BgValue | null,
  box: Canvas2DPreviewBox,
): string | CanvasGradient | null {
  if (!paint) return null;
  if (paint.type === "solid") {
    return isTransparentCssColor(paint.color) ? null : paint.color;
  }
  return linearGradientForCanvas2DBox(ctx, paint.stops, paint.angle, box);
}

export function loadCanvas2DImage(src: string): Promise<CanvasImageSource> {
  const existing = imageCache.get(src);
  if (existing) return existing;
  const pending = new Promise<CanvasImageSource>((resolve, reject) => {
    const image = new Image();
    // Required for canvas export with remote assets (e.g. Unsplash).
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      if (typeof createImageBitmap === "function") {
        createImageBitmap(image)
          .then((bitmap) => resolve(bitmap))
          .catch(() => resolve(image));
        return;
      }
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
  // Remove from cache on failure so the next render can retry
  pending.catch(() => imageCache.delete(src));
  imageCache.set(src, pending);
  return pending;
}

export function normalizeCanvas2DTextAlign(
  value: "left" | "center" | "right",
): CanvasTextAlign {
  return value;
}

export function roundedCanvas2DRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function applyCanvas2DClipPath(
  ctx: CanvasRenderingContext2D,
  clipPath: SaraswatiClipPath | null | undefined,
) {
  if (!clipPath) return;
  ctx.beginPath();
  if (clipPath.type === "ellipse") {
    ctx.ellipse(
      clipPath.x,
      clipPath.y,
      clipPath.width / 2,
      clipPath.height / 2,
      0,
      0,
      Math.PI * 2,
    );
  } else {
    const x = clipPath.x - clipPath.width / 2;
    const y = clipPath.y - clipPath.height / 2;
    roundedCanvas2DRectPath(
      ctx,
      x,
      y,
      clipPath.width,
      clipPath.height,
      Math.max(clipPath.radiusX, clipPath.radiusY),
    );
  }
  ctx.clip();
}

export function applyCanvas2DClipPaths(
  ctx: CanvasRenderingContext2D,
  clipPathStack: readonly SaraswatiClipPath[] | null | undefined,
  clipPath: SaraswatiClipPath | null | undefined,
) {
  if (Array.isArray(clipPathStack)) {
    for (const entry of clipPathStack) {
      applyCanvas2DClipPath(ctx, entry);
    }
  }
  applyCanvas2DClipPath(ctx, clipPath);
}

export function clampCanvas2DOpacity(value: number) {
  return Math.max(0, Math.min(1, value));
}

function shadowHexToRgba(input: string, alpha: number): string {
  const hex = input.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[1]! + hex[1]!, 16);
    const g = parseInt(hex[2]! + hex[2]!, 16);
    const b = parseInt(hex[3]! + hex[3]!, 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(0, 0, 0, ${alpha})`;
}

function linearGradientForCanvas2DBox(
  ctx: CanvasRenderingContext2D,
  stops: GradientStop[],
  angleDeg: number,
  box: Canvas2DPreviewBox,
) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const tx = dx !== 0 ? box.width / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const ty =
    dy !== 0 ? box.height / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const halfLen = Math.min(tx, ty);
  const gradient = ctx.createLinearGradient(
    cx - dx * halfLen,
    cy - dy * halfLen,
    cx + dx * halfLen,
    cy + dy * halfLen,
  );
  for (const stop of stops) {
    gradient.addColorStop(stop.offset, stop.color);
  }
  return gradient;
}
