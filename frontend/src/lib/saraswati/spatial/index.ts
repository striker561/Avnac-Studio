import {
  listSaraswatiNodesInRenderOrder,
  type SaraswatiRenderableNode,
  type SaraswatiScene,
} from "../scene";
import { anchorToCenter } from "../transform/anchor";

export type SaraswatiPoint = { x: number; y: number };
export type SaraswatiBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** @deprecated Use the `hitScale` option on findTopHitNodeId instead. */
export function setSaraswatiInteractionScale(_value: number): void {
  // No-op. The scale is now passed explicitly to findTopHitNodeId via options.
}

export function buildSpatialIndex(
  scene: SaraswatiScene,
  cellSize = 128,
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const node of listSaraswatiNodesInRenderOrder(scene)) {
    const bounds = getNodeBounds(node);
    const x1 = Math.floor(bounds.x / cellSize);
    const y1 = Math.floor(bounds.y / cellSize);
    const x2 = Math.floor((bounds.x + bounds.width) / cellSize);
    const y2 = Math.floor((bounds.y + bounds.height) / cellSize);
    for (let gx = x1; gx <= x2; gx += 1) {
      for (let gy = y1; gy <= y2; gy += 1) {
        const key = `${gx}:${gy}`;
        const bucket = index.get(key);
        if (bucket) bucket.push(node.id);
        else index.set(key, [node.id]);
      }
    }
  }
  return index;
}

export function findTopHitNodeId(
  scene: SaraswatiScene,
  point: SaraswatiPoint,
  options?: { excludeIds?: ReadonlySet<string>; hitScale?: number },
): string | null {
  const ordered = listSaraswatiNodesInRenderOrder(scene);
  const hitScale = options?.hitScale ?? 1;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const node = ordered[index]!;
    if (options?.excludeIds?.has(node.id)) continue;
    if (pointHitsNode(point, node, hitScale)) return node.id;
  }
  return null;
}

export function snapDeltaToGrid(
  dx: number,
  dy: number,
  gridSize = 1,
): { dx: number; dy: number } {
  if (gridSize <= 1) return { dx, dy };
  return {
    dx: Math.round(dx / gridSize) * gridSize,
    dy: Math.round(dy / gridSize) * gridSize,
  };
}

export function getTextNodeVisualHeight(text: string, fontSize: number, lineHeight: number): number {
  const lineCount = Math.max(1, text.split(/\r?\n/).length);
  return Math.max(1, fontSize * Math.max(1, lineHeight) * lineCount);
}

export function getNodeBounds(node: SaraswatiRenderableNode): SaraswatiBounds {
  if (node.type === "line") {
    const metrics = lineGeometryMetrics(node);
    const hitPadding = metrics.halfStroke + metrics.arrowPad;
    return {
      x: metrics.minX - hitPadding,
      y: metrics.minY - hitPadding,
      width: Math.max(1, metrics.maxX - metrics.minX + hitPadding * 2),
      height: Math.max(1, metrics.maxY - metrics.minY + hitPadding * 2),
    };
  }
  const width = node.type === "text" ? Math.max(1, node.width) : node.width;
  const height =
    node.type === "text"
      ? getTextNodeVisualHeight(node.text, node.fontSize, node.lineHeight)
      : node.height;
  const scaledWidth = Math.abs(width * node.scaleX);
  const scaledHeight = Math.abs(height * node.scaleY);
  const startX = anchorToStart(node.x, node.originX, scaledWidth);
  const startY = anchorToStart(node.y, node.originY, scaledHeight);
  if (!node.rotation) {
    return {
      x: startX,
      y: startY,
      width: scaledWidth,
      height: scaledHeight,
    };
  }

  const centerX = anchorToCenter(node.x, node.originX, scaledWidth, true);
  const centerY = anchorToCenter(node.y, node.originY, scaledHeight, false);
  const halfW = scaledWidth / 2;
  const halfH = scaledHeight / 2;
  const rad = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    rotatePoint(-halfW, -halfH, cos, sin, centerX, centerY),
    rotatePoint(halfW, -halfH, cos, sin, centerX, centerY),
    rotatePoint(halfW, halfH, cos, sin, centerX, centerY),
    rotatePoint(-halfW, halfH, cos, sin, centerX, centerY),
  ];
  const minX = Math.min(...corners.map((p) => p.x));
  const maxX = Math.max(...corners.map((p) => p.x));
  const minY = Math.min(...corners.map((p) => p.y));
  const maxY = Math.max(...corners.map((p) => p.y));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function pointHitsNode(
  point: SaraswatiPoint,
  node: SaraswatiRenderableNode,
  hitScale = 1,
): boolean {
  if (node.type !== "line") {
    const width = node.type === "text" ? Math.max(1, node.width) : node.width;
    const height =
      node.type === "text"
        ? getTextNodeVisualHeight(node.text, node.fontSize, node.lineHeight)
        : node.height;
    const scaledWidth = Math.abs(width * node.scaleX);
    const scaledHeight = Math.abs(height * node.scaleY);
    const centerX = anchorToCenter(node.x, node.originX, scaledWidth, true);
    const centerY = anchorToCenter(node.y, node.originY, scaledHeight, false);
    const local = unrotatePoint(
      point.x,
      point.y,
      centerX,
      centerY,
      node.rotation,
    );
    return pointInBounds(local, {
      x: centerX - scaledWidth / 2,
      y: centerY - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
    });
  }
  const metrics = lineGeometryMetrics(node);
  const tolerance = Math.max(12, metrics.halfStroke * 1.5 + 4) * hitScale;
  const hitDistance =
    node.pathType === "curved" && node.curveBulge !== 0
      ? pointToPolylineDistance(point.x, point.y, metrics.samples)
      : pointToSegmentDistance(
          point.x,
          point.y,
          node.x1,
          node.y1,
          node.x2,
          node.y2,
        );
  if (hitDistance <= tolerance) return true;

  // Arrowheads should also be easy to pick.
  if (node.arrowStart || node.arrowEnd) {
    const arrowLen = lineArrowheadLength(node.strokeWidth);
    const spread = Math.PI / 7 + 0.35;
    if (node.arrowEnd) {
      const from = metrics.curved
        ? { x: metrics.cpX, y: metrics.cpY }
        : { x: node.x1, y: node.y1 };
      if (
        pointHitsArrowWedge(
          point.x,
          point.y,
          node.x2,
          node.y2,
          from.x,
          from.y,
          arrowLen + tolerance,
          spread,
        )
      ) {
        return true;
      }
    }
    if (node.arrowStart) {
      const from = metrics.curved
        ? { x: metrics.cpX, y: metrics.cpY }
        : { x: node.x2, y: node.y2 };
      if (
        pointHitsArrowWedge(
          point.x,
          point.y,
          node.x1,
          node.y1,
          from.x,
          from.y,
          arrowLen + tolerance,
          spread,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function lineArrowheadLength(strokeWidth: number) {
  const raw = Math.max(1, strokeWidth) * 2.25;
  return Math.max(5, Math.min(72, raw));
}

function lineGeometryMetrics(
  node: Extract<SaraswatiRenderableNode, { type: "line" }>,
) {
  const curved = node.pathType === "curved" && node.curveBulge !== 0;
  const dx = node.x2 - node.x1;
  const dy = node.y2 - node.y1;
  let cpX = (node.x1 + node.x2) / 2;
  let cpY = (node.y1 + node.y2) / 2;
  const samples: Array<{ x: number; y: number }> = [];
  if (curved) {
    const L = Math.hypot(dx, dy);
    if (L > 0) {
      const perpX = -dy / L;
      const perpY = dx / L;
      cpX = node.x1 + node.curveT * dx + node.curveBulge * perpX;
      cpY = node.y1 + node.curveT * dy + node.curveBulge * perpY;
    }
  }

  if (curved) {
    const steps = 24;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const omt = 1 - t;
      samples.push({
        x: omt * omt * node.x1 + 2 * omt * t * cpX + t * t * node.x2,
        y: omt * omt * node.y1 + 2 * omt * t * cpY + t * t * node.y2,
      });
    }
  } else {
    samples.push({ x: node.x1, y: node.y1 }, { x: node.x2, y: node.y2 });
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of samples) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    curved,
    cpX,
    cpY,
    samples,
    minX,
    minY,
    maxX,
    maxY,
    halfStroke:
      Math.max(1, node.strokeWidth * Math.max(node.scaleX, node.scaleY)) / 2,
    arrowPad:
      node.arrowStart || node.arrowEnd
        ? lineArrowheadLength(node.strokeWidth)
        : 0,
  };
}

function pointToPolylineDistance(
  px: number,
  py: number,
  points: Array<{ x: number; y: number }>,
): number {
  if (points.length < 2) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const distance = pointToSegmentDistance(px, py, a.x, a.y, b.x, b.y);
    if (distance < best) best = distance;
  }
  return best;
}

function pointHitsArrowWedge(
  px: number,
  py: number,
  tipX: number,
  tipY: number,
  fromX: number,
  fromY: number,
  maxDistance: number,
  spread: number,
) {
  const vx = px - tipX;
  const vy = py - tipY;
  const distance = Math.hypot(vx, vy);
  if (distance > maxDistance) return false;
  if (distance < 0.0001) return true;
  const tipHeading = Math.atan2(tipY - fromY, tipX - fromX);
  const backHeading = normalizeAngle(tipHeading + Math.PI);
  const pointHeading = normalizeAngle(Math.atan2(vy, vx));
  return Math.abs(normalizeAngle(pointHeading - backHeading)) <= spread;
}

function normalizeAngle(angle: number) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const sx = x1 + clampedT * dx;
  const sy = y1 + clampedT * dy;
  return Math.hypot(px - sx, py - sy);
}

function pointInBounds(
  point: SaraswatiPoint,
  bounds: SaraswatiBounds,
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function anchorToStart(
  anchor: number,
  origin: "left" | "center" | "right" | "top" | "bottom",
  size: number,
) {
  if (origin === "center") return anchor - size / 2;
  if (origin === "right" || origin === "bottom") return anchor - size;
  return anchor;
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

function unrotatePoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  rotation: number,
) {
  if (!rotation) return { x, y };
  const rad = (-rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - centerX;
  const dy = y - centerY;
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  };
}
