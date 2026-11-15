import {
  VECTOR_ANCHOR_HIT_RADIUS_PX,
  VECTOR_HANDLE_HIT_RADIUS_PX,
  VECTOR_PATH_HIT_RADIUS_PX,
  VECTOR_RESIZE_HANDLE_SIZE_PX,
  buildStrokePath,
  nearestPointOnPath,
  screenPxToDoc,
  type VectorBoardStroke,
  type VectorBounds,
  type VectorPenAnchor,
  type VectorPoint,
  type VectorResizeHandleId,
  type VectorSelection,
  type VectorViewport,
} from "@/lib/avnac-vector";
import { resizeHandlePositions } from "@/lib/avnac-vector";
import type { PaintStyle } from "./vector-board-paint-state";

export function metricDistance(a: VectorPoint, b: VectorPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export type PenHit =
  | { kind: "anchor"; index: number }
  | { kind: "handle-in"; index: number }
  | { kind: "handle-out"; index: number }
  | {
      kind: "curve";
      index: number;
      segmentIndex: number;
      t: number;
      point: VectorPoint;
    };

export function hitPenAnchors(
  anchors: readonly VectorPenAnchor[],
  point: VectorPoint,
  view: VectorViewport,
  options: { includeCurve?: boolean; closed?: boolean } = {},
): PenHit | null {
  const anchorRadius = screenPxToDoc(VECTOR_ANCHOR_HIT_RADIUS_PX, view);
  const handleRadius = screenPxToDoc(VECTOR_HANDLE_HIT_RADIUS_PX, view);
  for (let i = anchors.length - 1; i >= 0; i -= 1) {
    const a = anchors[i]!;
    if (a.outX != null && a.outY != null) {
      if (metricDistance(point, [a.outX, a.outY]) <= handleRadius) {
        return { kind: "handle-out", index: i };
      }
    }
    if (a.inX != null && a.inY != null) {
      if (metricDistance(point, [a.inX, a.inY]) <= handleRadius) {
        return { kind: "handle-in", index: i };
      }
    }
  }
  for (let i = anchors.length - 1; i >= 0; i -= 1) {
    const a = anchors[i]!;
    if (metricDistance(point, [a.x, a.y]) <= anchorRadius) {
      return { kind: "anchor", index: i };
    }
  }
  if (options.includeCurve && anchors.length >= 2) {
    const path = buildStrokePath({
      id: "hit",
      kind: "pen",
      points: [],
      penAnchors: anchors as VectorPenAnchor[],
      penClosed: options.closed,
      stroke: "",
      strokeWidth: 0,
      strokeOpacity: 1,
      fill: "",
      fillOpacity: 1,
      fillRule: "nonzero",
      lineCap: "round",
      lineJoin: "round",
    });
    const hit = nearestPointOnPath(path, point);
    if (hit && hit.distance <= screenPxToDoc(VECTOR_PATH_HIT_RADIUS_PX, view)) {
      return {
        kind: "curve",
        index: -1,
        segmentIndex: hit.segmentIndex,
        t: hit.t,
        point: hit.point,
      };
    }
  }
  return null;
}

export function hitResizeHandle(
  bounds: VectorBounds,
  point: VectorPoint,
  view: VectorViewport,
): VectorResizeHandleId | null {
  const positions = resizeHandlePositions(bounds);
  const threshold = VECTOR_RESIZE_HANDLE_SIZE_PX * 0.85 + 2;
  let best: VectorResizeHandleId | null = null;
  let bestDistance = Infinity;
  for (const id of Object.keys(positions) as VectorResizeHandleId[]) {
    const handleScreen: VectorPoint = [
      (positions[id][0] - point[0]) * view.scale,
      (positions[id][1] - point[1]) * view.scale,
    ];
    const d = Math.hypot(handleScreen[0], handleScreen[1]);
    if (d <= threshold && d < bestDistance) {
      bestDistance = d;
      best = id;
    }
  }
  return best;
}

export function primarySelection(selection: readonly VectorSelection[]): VectorSelection | null {
  return selection.length > 0 ? selection[selection.length - 1]! : null;
}

export function selectionKey(selection: readonly VectorSelection[]): string {
  return selection
    .map((s) => `${s.layerId}:${s.strokeId}`)
    .sort()
    .join(",");
}

export function defaultStrokeWidth(style: PaintStyle): number {
  return style.strokeEnabled ? Math.max(0, style.strokeWidth) : 0;
}

export function buildStroke(input: {
  kind: VectorBoardStroke["kind"];
  points: VectorPoint[];
  penAnchors?: VectorPenAnchor[];
  penClosed?: boolean;
  style: PaintStyle;
  fillRule: VectorBoardStroke["fillRule"];
  lineJoin: VectorBoardStroke["lineJoin"];
  lineCap?: VectorBoardStroke["lineCap"];
  allowFill: boolean;
}): VectorBoardStroke {
  const { style } = input;
  const strokeVisible = style.strokeEnabled && style.strokeColor !== "transparent";
  const fillVisible =
    input.allowFill && style.fillEnabled && style.fillColor !== "transparent";
  // A selected fill-only object can leave the shared width at 0; new shapes
  // still get a usable hairline unless the user explicitly disabled stroke.
  const strokeWidth = strokeVisible ? Math.max(0.5, style.strokeWidth) : 0;
  const stroke: VectorBoardStroke = {
    id: crypto.randomUUID(),
    kind: input.kind,
    points: input.points.map((p) => [p[0], p[1]] as VectorPoint),
    stroke: strokeVisible ? style.strokeColor : "",
    strokeWidth,
    strokeOpacity: 1,
    fill: fillVisible ? style.fillColor : "",
    fillOpacity: 1,
    fillRule: input.fillRule,
    lineCap: input.lineCap ?? "round",
    lineJoin: input.lineJoin,
  };
  if (input.penAnchors && input.penAnchors.length >= 2) {
    stroke.penAnchors = input.penAnchors.map((a) => ({ ...a }));
  }
  if (input.penClosed) stroke.penClosed = true;
  return stroke;
}
