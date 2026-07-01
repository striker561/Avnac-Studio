import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import type { BgValue } from "@/lib/editor-paint";
import {
  createEmptySaraswatiScene,
  type SaraswatiAdapterIssue,
  type SaraswatiAdapterResult,
  type SaraswatiClipPath,
  type SaraswatiEllipseNode,
  type SaraswatiGroupNode,
  type SaraswatiImageNode,
  type SaraswatiLineNode,
  type SaraswatiLinePathType,
  type SaraswatiLineStyle,
  type SaraswatiNode,
  type SaraswatiNodeOriginX,
  type SaraswatiNodeOriginY,
  type SaraswatiPolygonNode,
  type SaraswatiRectNode,
  type SaraswatiTextNode,
} from "../scene";
import { anchorToCenter } from "../transform/anchor";

export type AvnacAdapterPipeline = "direct-avnac";

export type AvnacAdapterDiagnostics = {
  pipeline: AvnacAdapterPipeline;
  schemaVersion: number;
  usedLegacyFabricCompat: boolean;
};

const DEBUG_FLAG = "__AVNAC_DEBUG_ADAPTER__";
let hasLoggedAdapterPath = false;

type RawPoint = { x: number; y: number };

type RawObject = Record<string, unknown> & {
  type?: string;
  visible?: boolean;
  left?: number;
  top?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;
  originX?: "left" | "center" | "right";
  originY?: "top" | "center" | "bottom";
  width?: number;
  height?: number;
  rx?: number;
  ry?: number;
  r?: number;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  underline?: boolean;
  fill?: unknown;
  stroke?: unknown;
  clipPath?: unknown;
  avnacFill?: BgValue;
  avnacStroke?: BgValue;
  avnacShape?: unknown;
  avnacVectorBoardId?: string;
  avnacLayerId?: string;
  src?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  points?: RawPoint[];
  objects?: unknown[];
};

type RawClipPath = Record<string, unknown> & {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  originX?: "left" | "center" | "right";
  originY?: "top" | "center" | "bottom";
  rx?: number;
  ry?: number;
  r?: number;
};

type NormalizedObjectType =
  | "rect"
  | "ellipse"
  | "polygon"
  | "line"
  | "text"
  | "textbox"
  | "i-text"
  | "image"
  | "group"
  | "unknown";

/**
 * Task 3 entrypoint: Avnac -> Saraswati adapter boundary.
 */
export function fromAvnacDocument(
  doc: AvnacDocumentV1,
): SaraswatiAdapterResult {
  const { result, diagnostics } = fromAvnacDocumentWithDiagnostics(doc);
  maybeLogAdapterPath(diagnostics);
  return result;
}

export function fromAvnacDocumentWithDiagnostics(doc: AvnacDocumentV1): {
  result: SaraswatiAdapterResult;
  diagnostics: AvnacAdapterDiagnostics;
} {
  const result = fromSerializedAvnacPayload({
    artboard: {
      width: doc.artboard.width,
      height: doc.artboard.height,
      bg: doc.bg,
    },
    objectsRoot: doc.fabric,
  });
  return {
    result,
    diagnostics: {
      pipeline: "direct-avnac",
      schemaVersion: doc.v,
      usedLegacyFabricCompat: false,
    },
  };
}

function fromSerializedAvnacPayload(input: {
  artboard: { width: number; height: number; bg: BgValue };
  objectsRoot: Record<string, unknown>;
}): SaraswatiAdapterResult {
  const scene = createEmptySaraswatiScene(input.artboard);
  const root = scene.nodes[scene.root];
  if (!root || root.type !== "group") {
    return {
      scene,
      fullySupported: false,
      issues: [{ reason: "missing-root", sourceType: "scene" }],
    };
  }

  const issues: SaraswatiAdapterIssue[] = [];
  const objects = readObjects(input.objectsRoot);
  const nodes: Record<string, SaraswatiNode> = { ...scene.nodes };
  const children: string[] = [];

  const adaptedChildren = adaptRawObjects({
    rawObjects: objects,
    parentId: scene.root,
    indexPrefix: "",
    nodes,
    issues,
  });
  children.push(...adaptedChildren);

  nodes[scene.root] = { ...root, children };
  return {
    scene: {
      ...scene,
      nodes,
    },
    fullySupported: issues.length === 0,
    issues,
  };
}

function adaptRawObjects(input: {
  rawObjects: RawObject[];
  parentId: string;
  indexPrefix: string;
  nodes: Record<string, SaraswatiNode>;
  issues: SaraswatiAdapterIssue[];
  offsetX?: number;
  offsetY?: number;
}): string[] {
  const {
    rawObjects,
    parentId,
    indexPrefix,
    nodes,
    issues,
    offsetX = 0,
    offsetY = 0,
  } = input;
  const children: string[] = [];

  rawObjects.forEach((raw, index) => {
    const indexKey = indexPrefix ? `${indexPrefix}-${index}` : `${index}`;
    const groupChildren = readRawGroupObjects(raw);
    const normalizedType = normalizeObjectType(raw.type);
    const shapeKind = readShapeKind(raw.avnacShape);
    const isStructuralGroup =
      normalizedType === "group" &&
      shapeKind !== "line" &&
      shapeKind !== "arrow" &&
      groupChildren.length > 0;

    if (isStructuralGroup) {
      const groupId = readSourceId(raw, indexKey);
      const groupNode: SaraswatiGroupNode = {
        id: groupId,
        type: "group",
        parentId,
        rotation: 0,
        visible: raw.visible !== false,
        opacity: clampOpacity(readNumber(raw.opacity, 1)),
        children: [],
      };
      nodes[groupId] = groupNode;

      const { cx, cy } = resolveGroupCenter(raw);
      const nestedChildren = adaptRawObjects({
        rawObjects: groupChildren,
        parentId: groupId,
        indexPrefix: indexKey,
        nodes,
        issues,
        offsetX: offsetX + cx,
        offsetY: offsetY + cy,
      });

      nodes[groupId] = {
        ...groupNode,
        children: nestedChildren,
      };
      children.push(groupId);
      return;
    }

    const adapted = adaptRawObject(raw, parentId, indexKey, {
      offsetX,
      offsetY,
    });
    if (!adapted.node) {
      issues.push(adapted.issue);
      return;
    }
    nodes[adapted.node.id] = adapted.node;
    children.push(adapted.node.id);
  });

  return children;
}

function adaptRawObject(
  raw: RawObject,
  parentId: string,
  index: string,
  options?: { offsetX?: number; offsetY?: number },
): { node: SaraswatiNode | null; issue: SaraswatiAdapterIssue } {
  const sourceId = readSourceId(raw, index);
  const offsetX = options?.offsetX ?? 0;
  const offsetY = options?.offsetY ?? 0;

  if (typeof raw.avnacVectorBoardId === "string" && raw.avnacVectorBoardId) {
    return {
      node: null,
      issue: {
        reason: "vector-board",
        sourceType: readSourceType(raw),
        sourceId,
      },
    };
  }

  const shapeKind = readShapeKind(raw.avnacShape);
  const normalizedType = normalizeObjectType(raw.type);
  if (
    shapeKind === "arrow" ||
    shapeKind === "line" ||
    normalizedType === "line"
  ) {
    const eps =
      readArrowEndpoints(raw.avnacShape) ??
      readLineEndpoints(raw, options?.offsetX ?? 0, options?.offsetY ?? 0);
    if (!eps) {
      return {
        node: null,
        issue: {
          reason: "shape-meta",
          sourceType: readSourceType(raw),
          sourceId,
        },
      };
    }
    const node: SaraswatiLineNode = {
      id: sourceId,
      type: "line",
      parentId,
      visible: raw.visible !== false,
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: clampOpacity(readNumber(raw.opacity, 1)),
      originX: "left",
      originY: "top",
      x1: eps.x1,
      y1: eps.y1,
      x2: eps.x2,
      y2: eps.y2,
      stroke: readPaint(
        raw.avnacStroke ?? raw.avnacFill,
        raw.stroke ?? raw.fill,
        { type: "solid", color: "#262626" },
      ),
      strokeWidth: readArrowStrokeWidth(raw.avnacShape),
      arrowStart: false,
      arrowEnd: shapeKind === "arrow",
      lineStyle: readArrowLineStyle(raw.avnacShape),
      pathType: readArrowPathType(raw.avnacShape),
      curveBulge: readArrowCurveBulge(raw.avnacShape),
      curveT: readArrowCurveT(raw.avnacShape),
    };
    return {
      node,
      issue: supportedIssue(sourceId, shapeKind ?? normalizedType),
    };
  }
  switch (normalizedType) {
    case "rect": {
      if (!isPositiveNumber(raw.width) || !isPositiveNumber(raw.height)) {
        return {
          node: null,
          issue: { reason: "missing-rect-size", sourceType: "rect", sourceId },
        };
      }
      const node: SaraswatiRectNode = {
        id: sourceId,
        type: "rect",
        parentId,
        visible: raw.visible !== false,
        x: readNumber(raw.left, 0) + offsetX,
        y: readNumber(raw.top, 0) + offsetY,
        rotation: readNumber(raw.angle, 0),
        scaleX: readNumber(raw.scaleX, 1),
        scaleY: readNumber(raw.scaleY, 1),
        opacity: clampOpacity(readNumber(raw.opacity, 1)),
        originX: normalizeOriginX(raw.originX),
        originY: normalizeOriginY(raw.originY),
        width: raw.width,
        height: raw.height,
        fill: readPaint(raw.avnacFill, raw.fill, {
          type: "solid",
          color: "transparent",
        }),
        stroke: readOptionalPaint(raw.avnacStroke, raw.stroke),
        strokeWidth: readNumber(raw.strokeWidth, 0),
        radiusX: readNumber(raw.rx, 0),
        radiusY: readNumber(raw.ry, 0),
        clipPath: readClipPath(raw.clipPath),
      };
      return { node, issue: supportedIssue(sourceId, "rect") };
    }
    case "ellipse": {
      const radius = readNumber(raw.r, 0);
      const rx = readNumber(
        raw.rx,
        radius > 0 ? radius : readNumber(raw.width, 0) / 2,
      );
      const ry = readNumber(
        raw.ry,
        radius > 0 ? radius : readNumber(raw.height, 0) / 2,
      );
      const width = rx > 0 ? rx * 2 : 0;
      const height = ry > 0 ? ry * 2 : 0;
      if (!isPositiveNumber(width) || !isPositiveNumber(height)) {
        return {
          node: null,
          issue: {
            reason: "missing-ellipse-size",
            sourceType: normalizedType,
            sourceId,
          },
        };
      }
      const node: SaraswatiEllipseNode = {
        id: sourceId,
        type: "ellipse",
        parentId,
        visible: raw.visible !== false,
        x: readNumber(raw.left, 0) + offsetX,
        y: readNumber(raw.top, 0) + offsetY,
        rotation: readNumber(raw.angle, 0),
        scaleX: readNumber(raw.scaleX, 1),
        scaleY: readNumber(raw.scaleY, 1),
        opacity: clampOpacity(readNumber(raw.opacity, 1)),
        originX: normalizeOriginX(raw.originX),
        originY: normalizeOriginY(raw.originY),
        width,
        height,
        fill: readPaint(raw.avnacFill, raw.fill, {
          type: "solid",
          color: "transparent",
        }),
        stroke: readOptionalPaint(raw.avnacStroke, raw.stroke),
        strokeWidth: readNumber(raw.strokeWidth, 0),
        clipPath: readClipPath(raw.clipPath),
      };
      return { node, issue: supportedIssue(sourceId, normalizedType) };
    }
    case "polygon": {
      const points = normalizePolygonPoints(raw.points);
      if (!points) {
        return {
          node: null,
          issue: {
            reason: "missing-polygon-points",
            sourceType: "polygon",
            sourceId,
          },
        };
      }
      const bounds = polygonBounds(points);
      const node: SaraswatiPolygonNode = {
        id: sourceId,
        type: "polygon",
        parentId,
        visible: raw.visible !== false,
        x: readNumber(raw.left, 0) + offsetX,
        y: readNumber(raw.top, 0) + offsetY,
        rotation: readNumber(raw.angle, 0),
        scaleX: readNumber(raw.scaleX, 1),
        scaleY: readNumber(raw.scaleY, 1),
        opacity: clampOpacity(readNumber(raw.opacity, 1)),
        originX: normalizeOriginX(raw.originX),
        originY: normalizeOriginY(raw.originY),
        width: bounds.width,
        height: bounds.height,
        points,
        fill: readPaint(raw.avnacFill, raw.fill, {
          type: "solid",
          color: "transparent",
        }),
        stroke: readOptionalPaint(raw.avnacStroke, raw.stroke),
        strokeWidth: readNumber(raw.strokeWidth, 0),
        clipPath: readClipPath(raw.clipPath),
      };
      return {
        node,
        issue: supportedIssue(
          sourceId,
          shapeKind === "star" ? "star" : "polygon",
        ),
      };
    }
    case "textbox":
    case "i-text":
    case "text": {
      if (typeof raw.text !== "string") {
        return {
          node: null,
          issue: {
            reason: "missing-text",
            sourceType: readSourceType(raw),
            sourceId,
          },
        };
      }
      const node: SaraswatiTextNode = {
        id: sourceId,
        type: "text",
        parentId,
        visible: raw.visible !== false,
        x: readNumber(raw.left, 0) + offsetX,
        y: readNumber(raw.top, 0) + offsetY,
        rotation: readNumber(raw.angle, 0),
        scaleX: readNumber(raw.scaleX, 1),
        scaleY: readNumber(raw.scaleY, 1),
        opacity: clampOpacity(readNumber(raw.opacity, 1)),
        originX: normalizeOriginX(raw.originX),
        originY: normalizeOriginY(raw.originY),
        text: raw.text,
        width: readNumber(raw.width, 1),
        fontSize: readNumber(raw.fontSize, 16),
        fontFamily:
          typeof raw.fontFamily === "string" ? raw.fontFamily : "Inter",
        fontWeight: String(raw.fontWeight ?? "400"),
        fontStyle: raw.fontStyle === "italic" ? "italic" : "normal",
        textAlign: normalizeTextAlign(raw.textAlign),
        lineHeight: readNumber(raw.lineHeight, 1.16),
        underline: raw.underline === true,
        color: readPaint(raw.avnacFill, raw.fill, {
          type: "solid",
          color: "#262626",
        }),
        stroke: readOptionalPaint(raw.avnacStroke, raw.stroke),
        strokeWidth: readNumber(raw.strokeWidth, 0),
        clipPath: readClipPath(raw.clipPath),
      };
      return { node, issue: supportedIssue(sourceId, readSourceType(raw)) };
    }
    case "image": {
      if (
        !isPositiveNumber(raw.width) ||
        !isPositiveNumber(raw.height) ||
        typeof raw.src !== "string" ||
        raw.src.length === 0
      ) {
        return {
          node: null,
          issue: {
            reason: "missing-image-data",
            sourceType: "image",
            sourceId,
          },
        };
      }
      const node: SaraswatiImageNode = {
        id: sourceId,
        type: "image",
        parentId,
        visible: raw.visible !== false,
        x: readNumber(raw.left, 0) + offsetX,
        y: readNumber(raw.top, 0) + offsetY,
        rotation: readNumber(raw.angle, 0),
        scaleX: readNumber(raw.scaleX, 1),
        scaleY: readNumber(raw.scaleY, 1),
        opacity: clampOpacity(readNumber(raw.opacity, 1)),
        originX: normalizeOriginX(raw.originX),
        originY: normalizeOriginY(raw.originY),
        width: raw.width,
        height: raw.height,
        src: raw.src,
        cropX: readNumber(raw.cropX, 0),
        cropY: readNumber(raw.cropY, 0),
        cropWidth: isPositiveNumber(raw.cropWidth) ? raw.cropWidth : undefined,
        cropHeight: isPositiveNumber(raw.cropHeight)
          ? raw.cropHeight
          : undefined,
        clipPath: readClipPath(raw.clipPath),
      };
      return { node, issue: supportedIssue(sourceId, "image") };
    }
    default:
      return {
        node: null,
        issue: {
          reason: "unsupported-type",
          sourceType: normalizedType,
          sourceId,
        },
      };
  }
}

function resolveGroupCenter(raw: RawObject): { cx: number; cy: number } {
  const left = readNumber(raw.left, 0);
  const top = readNumber(raw.top, 0);
  const width = readNumber(raw.width, 0);
  const height = readNumber(raw.height, 0);
  const ox = raw.originX;
  const oy = raw.originY;
  const factorX = ox === "center" ? 0 : ox === "right" ? -0.5 : 0.5;
  const factorY = oy === "center" ? 0 : oy === "bottom" ? -0.5 : 0.5;
  return {
    cx: left + width * factorX,
    cy: top + height * factorY,
  };
}

function readObjects(objectsRoot: Record<string, unknown>): RawObject[] {
  const objects = (objectsRoot as { objects?: unknown[] }).objects;
  if (!Array.isArray(objects)) return [];
  return objects.filter(
    (object): object is RawObject => !!object && typeof object === "object",
  );
}

function readRawGroupObjects(raw: RawObject): RawObject[] {
  const objects = raw.objects;
  if (!Array.isArray(objects)) return [];
  return objects.filter(
    (object): object is RawObject => !!object && typeof object === "object",
  );
}

function readSourceId(raw: RawObject, index: string): string {
  if (typeof raw.avnacLayerId === "string" && raw.avnacLayerId.length > 0) {
    return raw.avnacLayerId;
  }
  return `avnac-node-${index}`;
}

function readPaint(
  stored: BgValue | undefined,
  raw: unknown,
  fallback: BgValue,
): BgValue {
  if (stored) return cloneBgValue(stored);
  if (typeof raw === "string" && raw.length > 0) {
    return { type: "solid", color: raw };
  }
  return fallback;
}

function readOptionalPaint(
  stored: BgValue | undefined,
  raw: unknown,
): BgValue | null {
  if (stored) return cloneBgValue(stored);
  if (typeof raw === "string" && raw.length > 0) {
    return { type: "solid", color: raw };
  }
  return null;
}

function cloneBgValue(bg: BgValue): BgValue {
  if (bg.type === "solid") return { ...bg };
  return {
    type: "gradient",
    angle: bg.angle,
    css: bg.css,
    stops: bg.stops.map((stop) => ({ ...stop })),
  };
}

function normalizeOriginX(value: unknown): SaraswatiNodeOriginX {
  return value === "center" || value === "right" ? value : "left";
}

function normalizeOriginY(value: unknown): SaraswatiNodeOriginY {
  return value === "center" || value === "bottom" ? value : "top";
}

function normalizeTextAlign(value: unknown): "left" | "center" | "right" {
  return value === "center" || value === "right" ? value : "left";
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function clampOpacity(value: number) {
  return Math.max(0, Math.min(1, value));
}

function readSourceType(raw: RawObject): string {
  return typeof raw.type === "string" ? raw.type : "unknown";
}

function normalizeObjectType(rawType: unknown): NormalizedObjectType {
  if (typeof rawType !== "string") return "unknown";
  const value = rawType.trim().toLowerCase();
  if (value === "circle" || value === "ellipse") return "ellipse";
  if (
    value === "rect" ||
    value === "group" ||
    value === "polygon" ||
    value === "line" ||
    value === "image" ||
    value === "text" ||
    value === "textbox" ||
    value === "i-text"
  ) {
    return value;
  }
  return "unknown";
}

function readShapeKind(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const kind = (raw as { kind?: unknown }).kind;
  return typeof kind === "string" ? kind : null;
}

function readArrowEndpoints(
  raw: unknown,
): { x1: number; y1: number; x2: number; y2: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const ep = (raw as { arrowEndpoints?: unknown }).arrowEndpoints;
  if (!ep || typeof ep !== "object") return null;
  const { x1, y1, x2, y2 } = ep as Record<string, unknown>;
  if (
    typeof x1 !== "number" ||
    typeof y1 !== "number" ||
    typeof x2 !== "number" ||
    typeof y2 !== "number"
  )
    return null;
  return { x1, y1, x2, y2 };
}

function readLineEndpoints(
  raw: RawObject,
  offsetX: number,
  offsetY: number,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const x1 = raw.x1;
  const y1 = raw.y1;
  const x2 = raw.x2;
  const y2 = raw.y2;
  if (
    typeof x1 !== "number" ||
    typeof y1 !== "number" ||
    typeof x2 !== "number" ||
    typeof y2 !== "number"
  ) {
    return null;
  }
  return {
    x1: x1 + offsetX,
    y1: y1 + offsetY,
    x2: x2 + offsetX,
    y2: y2 + offsetY,
  };
}

function readArrowStrokeWidth(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 2;
  const w = (raw as { arrowStrokeWidth?: unknown }).arrowStrokeWidth;
  return typeof w === "number" && Number.isFinite(w) && w > 0 ? w : 2;
}

function readArrowLineStyle(raw: unknown): SaraswatiLineStyle {
  if (!raw || typeof raw !== "object") return "solid";
  const style = (raw as { arrowLineStyle?: unknown }).arrowLineStyle;
  if (style === "dashed" || style === "dotted") return style;
  return "solid";
}

function readArrowPathType(raw: unknown): SaraswatiLinePathType {
  if (!raw || typeof raw !== "object") return "straight";
  const pathType = (raw as { arrowPathType?: unknown }).arrowPathType;
  return pathType === "curved" ? "curved" : "straight";
}

function readArrowCurveBulge(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const v = (raw as { arrowCurveBulge?: unknown }).arrowCurveBulge;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function readArrowCurveT(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0.5;
  const v = (raw as { arrowCurveT?: unknown }).arrowCurveT;
  return typeof v === "number" && Number.isFinite(v) ? v : 0.5;
}

function readClipPath(raw: unknown): SaraswatiClipPath | null {
  if (!raw || typeof raw !== "object") return null;
  const clip = raw as RawClipPath;
  const rawType =
    typeof clip.type === "string" ? clip.type.trim().toLowerCase() : "";

  if (rawType !== "rect" && rawType !== "ellipse" && rawType !== "circle") {
    return null;
  }

  const circleR = readNumber(clip.r, 0);
  const rx = readNumber(
    clip.rx,
    circleR > 0 ? circleR : readNumber(clip.width, 0) / 2,
  );
  const ry = readNumber(
    clip.ry,
    circleR > 0 ? circleR : readNumber(clip.height, 0) / 2,
  );
  const width = rawType === "rect" ? readNumber(clip.width, 0) : rx * 2;
  const height = rawType === "rect" ? readNumber(clip.height, 0) : ry * 2;
  if (!isPositiveNumber(width) || !isPositiveNumber(height)) return null;

  const left = readNumber(clip.left, 0);
  const top = readNumber(clip.top, 0);
  const originX = normalizeOriginX(clip.originX);
  const originY = normalizeOriginY(clip.originY);
  const x = anchorToCenter(left, originX, width, true);
  const y = anchorToCenter(top, originY, height, false);

  if (rawType === "rect") {
    return {
      type: "rect",
      x,
      y,
      width,
      height,
      radiusX: Math.max(0, readNumber(clip.rx, 0)),
      radiusY: Math.max(0, readNumber(clip.ry, 0)),
    };
  }

  return {
    type: "ellipse",
    x,
    y,
    width,
    height,
  };
}

function normalizePolygonPoints(
  rawPoints: RawPoint[] | undefined,
): Array<{ x: number; y: number }> | null {
  if (!Array.isArray(rawPoints) || rawPoints.length < 3) return null;
  const points = rawPoints.filter(
    (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  if (points.length < 3) return null;
  const bounds = polygonBounds(points);
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;
  return points.map((point) => ({
    x: point.x - centerX,
    y: point.y - centerY,
  }));
}

function polygonBounds(points: Array<{ x: number; y: number }>) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function supportedIssue(
  sourceId: string,
  sourceType: string,
): SaraswatiAdapterIssue {
  return {
    reason: "supported",
    sourceType,
    sourceId,
  };
}

function maybeLogAdapterPath(diagnostics: AvnacAdapterDiagnostics) {
  if (hasLoggedAdapterPath) return;
  if (!isAdapterDebugEnabled()) return;
  hasLoggedAdapterPath = true;
  if (diagnostics.usedLegacyFabricCompat) {
    console.warn(
      "[saraswati/from-avnac] using legacy fabric compat path",
      diagnostics,
    );
    return;
  }
  console.info(
    "[saraswati/from-avnac] using direct Avnac adapter path",
    diagnostics,
  );
}

function isAdapterDebugEnabled(): boolean {
  if (typeof globalThis === "undefined") return false;
  const flagValue = (globalThis as Record<string, unknown>)[DEBUG_FLAG];
  if (flagValue === true) return true;
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem("avnac:debug:adapter") === "1";
  } catch {
    return false;
  }
}

export function setAvnacAdapterDebugEnabled(enabled: boolean) {
  if (typeof globalThis !== "undefined") {
    (globalThis as Record<string, unknown>)[DEBUG_FLAG] = enabled;
  }
  if (typeof localStorage !== "undefined") {
    try {
      if (enabled) localStorage.setItem("avnac:debug:adapter", "1");
      else localStorage.removeItem("avnac:debug:adapter");
    } catch {
      // Ignore localStorage write failures (private mode/security policy).
    }
  }
}
