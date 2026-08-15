import type { SaraswatiRenderCommand } from "@/lib/saraswati";
import { anchorToCenter } from "@/lib/saraswati/transform/anchor";
import {
  getSharedTextMeasure,
  layoutTextLines,
} from "@/lib/renderer/backends/canvas2d/text-layout";

export type DirtyRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PartialRepaintPlan = {
  mode: "full" | "partial";
  dirtyRects: DirtyRect[];
  dirtyCoveragePct: number;
};

const DEFAULT_DIRTY_PAD = 8;
const DEFAULT_MAX_COVERAGE_PCT = 55;
const DEFAULT_MAX_DIRTY_RECTS = 16;

export function collectDirtyRenderCommandRects(
  previous: readonly SaraswatiRenderCommand[],
  next: readonly SaraswatiRenderCommand[],
  pad = DEFAULT_DIRTY_PAD,
): DirtyRect[] {
  const dirty: DirtyRect[] = [];
  const maxLen = Math.max(previous.length, next.length);
  for (let index = 0; index < maxLen; index += 1) {
    const before = previous[index];
    const after = next[index];
    if (before && !after) {
      const rect = renderCommandBounds(before);
      if (rect) dirty.push(expandRect(rect, pad));
      continue;
    }
    if (!before && after) {
      const rect = renderCommandBounds(after);
      if (rect) dirty.push(expandRect(rect, pad));
      continue;
    }
    if (!before || !after) continue;
    if (commandSignature(before) === commandSignature(after)) continue;
    const beforeRect = renderCommandBounds(before);
    const afterRect = renderCommandBounds(after);
    if (beforeRect) dirty.push(expandRect(beforeRect, pad));
    if (afterRect) dirty.push(expandRect(afterRect, pad));
  }
  return dirty;
}

export function planPartialRepaint(input: {
  previous: readonly SaraswatiRenderCommand[];
  next: readonly SaraswatiRenderCommand[];
  artboardWidth: number;
  artboardHeight: number;
  maxCoveragePct?: number;
  maxDirtyRects?: number;
  dirtyPad?: number;
  /** Partial repaint is a canvas2d-only strategy; other backends should pass false. */
  allowPartial?: boolean;
}): PartialRepaintPlan {
  const maxCoveragePct = input.maxCoveragePct ?? DEFAULT_MAX_COVERAGE_PCT;
  const maxDirtyRects = input.maxDirtyRects ?? DEFAULT_MAX_DIRTY_RECTS;
  const dirtyPad = input.dirtyPad ?? DEFAULT_DIRTY_PAD;

  if (input.previous.length === 0) {
    return { mode: "full", dirtyRects: [], dirtyCoveragePct: 100 };
  }

  const rawDirty = collectDirtyRenderCommandRects(
    input.previous,
    input.next,
    dirtyPad,
  );
  if (rawDirty.length === 0) {
    return { mode: "full", dirtyRects: [], dirtyCoveragePct: 0 };
  }

  const dirtyRects = mergeDirtyRects(rawDirty);
  const dirtyCoveragePct = dirtyRectsCoverageRatio(
    dirtyRects,
    input.artboardWidth,
    input.artboardHeight,
  );

  if (dirtyCoveragePct >= maxCoveragePct || dirtyRects.length > maxDirtyRects) {
    return { mode: "full", dirtyRects, dirtyCoveragePct };
  }

  if (input.allowPartial === false) {
    return { mode: "full", dirtyRects, dirtyCoveragePct };
  }

  return { mode: "partial", dirtyRects, dirtyCoveragePct };
}

export function renderCommandBounds(
  command: SaraswatiRenderCommand,
): DirtyRect | null {
  const shadowPad = command.shadow
    ? Math.max(
        command.shadow.blur,
        Math.abs(command.shadow.offsetX),
        Math.abs(command.shadow.offsetY),
      )
    : 0;
  const blurPad = Math.max(0, command.blur ?? 0) * 0.4;
  const strokeWidth = "strokeWidth" in command ? command.strokeWidth : 0;
  const pad = Math.max(2, strokeWidth + shadowPad + blurPad);

  if (command.type === "line") {
    const x = Math.min(command.x1, command.x2);
    const y = Math.min(command.y1, command.y2);
    return {
      x: x - pad,
      y: y - pad,
      width: Math.max(1, Math.abs(command.x2 - command.x1)) + pad * 2,
      height: Math.max(1, Math.abs(command.y2 - command.y1)) + pad * 2,
    };
  }

  // Text uses the shared wrap/measure layout so the dirty region covers the
  // full painted box (wrapped lines + measured width). A raw-line estimate is
  // smaller than what the renderer draws, which left trails when moving text.
  let boxWidth: number;
  let boxHeight: number;
  if (command.type === "text") {
    const layout = layoutTextLines(
      {
        text: command.text,
        fontSize: command.fontSize,
        lineHeight: command.lineHeight,
        fontFamily: command.fontFamily,
        fontWeight: command.fontWeight,
        fontStyle: command.fontStyle,
        width: command.width,
      },
      getSharedTextMeasure(),
    );
    boxWidth = Math.max(1, layout.boxWidth);
    boxHeight = Math.max(1, layout.boxHeight);
  } else {
    boxWidth = command.width;
    boxHeight = command.height;
  }

  const bounds = axisBoundsFromTransform(command, boxWidth, boxHeight);
  return {
    x: bounds.x - pad,
    y: bounds.y - pad,
    width: bounds.width + pad * 2,
    height: bounds.height + pad * 2,
  };
}

export function rectsIntersect(a: DirtyRect, b: DirtyRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function mergeDirtyRects(rects: readonly DirtyRect[]): DirtyRect[] {
  if (rects.length <= 1) return rects.map((rect) => ({ ...rect }));
  let merged = rects.map((rect) => ({ ...rect }));
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        if (rectsIntersect(merged[i]!, merged[j]!)) {
          merged[i] = unionRect(merged[i]!, merged[j]!);
          merged.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
  return merged;
}

export function dirtyRectsCoverageRatio(
  rects: readonly DirtyRect[],
  width: number,
  height: number,
): number {
  const canvasArea = Math.max(1, width * height);
  const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
  return Math.min(100, (area / canvasArea) * 100);
}

function commandSignature(command: SaraswatiRenderCommand): string {
  return JSON.stringify(command);
}

function expandRect(rect: DirtyRect, pad: number): DirtyRect {
  return {
    x: rect.x - pad,
    y: rect.y - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function unionRect(a: DirtyRect, b: DirtyRect): DirtyRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

type TransformCommandLike = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  originX: string;
  originY: string;
};

function anchorToStart(
  anchor: number,
  origin: string | undefined,
  size: number,
  isX: boolean,
): number {
  return anchorToCenter(anchor, origin, size, isX) - size / 2;
}

function axisBoundsFromTransform(
  command: TransformCommandLike,
  width: number,
  height: number,
): DirtyRect {
  const scaledWidth = Math.max(1, width * Math.abs(command.scaleX));
  const scaledHeight = Math.max(1, height * Math.abs(command.scaleY));

  if (!command.rotation) {
    return {
      x: anchorToStart(command.x, command.originX, scaledWidth, true),
      y: anchorToStart(command.y, command.originY, scaledHeight, false),
      width: scaledWidth,
      height: scaledHeight,
    };
  }

  const centerX = anchorToCenter(command.x, command.originX, scaledWidth, true);
  const centerY = anchorToCenter(
    command.y,
    command.originY,
    scaledHeight,
    false,
  );
  const halfW = scaledWidth / 2;
  const halfH = scaledHeight / 2;
  const rad = (command.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    rotatePoint(-halfW, -halfH, cos, sin, centerX, centerY),
    rotatePoint(halfW, -halfH, cos, sin, centerX, centerY),
    rotatePoint(halfW, halfH, cos, sin, centerX, centerY),
    rotatePoint(-halfW, halfH, cos, sin, centerX, centerY),
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function rotatePoint(
  x: number,
  y: number,
  cos: number,
  sin: number,
  centerX: number,
  centerY: number,
) {
  return {
    x: centerX + x * cos - y * sin,
    y: centerY + x * sin + y * cos,
  };
}
