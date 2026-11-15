/**
 * Adapter: Avnac web schema v2 → SaraswatiScene.
 *
 * V2 format is the schema used by avnac.design (the web app). It is a clean
 * flat schema that is structurally close to the Saraswati node model —
 * objects have id/type/x/y/width/height/rotation/opacity/visible/fill/stroke,
 * with type-specific extras. It is NOT the Fabric-shaped V1 format that the
 * desktop stores internally.
 *
 * The resulting SaraswatiScene can be passed to `toAvnacDocument` to produce
 * a desktop V1 document for storage.
 */
import {
  createEmptySaraswatiScene,
  type SaraswatiEllipseNode,
  type SaraswatiImageNode,
  type SaraswatiLineNode,
  type SaraswatiLinePathType,
  type SaraswatiLineStyle,
  type SaraswatiNode,
  type SaraswatiPolygonNode,
  type SaraswatiRectNode,
  type SaraswatiScene,
  type SaraswatiTextNode,
  type SaraswatiColor,
} from "../scene";
import {
  regularPolygonPoints,
  starPolygonPoints,
} from "../../avnac-shape-geometry";
import { readBlur, readShadow } from "./effects";

// ---------------------------------------------------------------------------
// V2 raw types (parsed from JSON)
// ---------------------------------------------------------------------------

type V2Paint =
  | { type: "solid"; color: string }
  | { type: "gradient"; css: string; stops: unknown[]; angle?: number };

type V2Object = {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked?: boolean;
  blurPct?: number;
  shadow?: unknown;
  fill?: V2Paint;
  stroke?: V2Paint;
  strokeWidth?: number;
  // rect
  cornerRadius?: number;
  // polygon
  sides?: number;
  // star
  points?: number;
  // text
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  textAlign?: string;
  // image
  src?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  // line / arrow
  lineStyle?: string;
  roundedEnds?: boolean;
  pathType?: string;
  headSize?: number;
  curveBulge?: number;
  curveT?: number;
  // vector-board (skipped for now)
  boardId?: string;
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Attempt to parse `raw` as a V2 document and convert it to a SaraswatiScene.
 * Returns `null` if the input is not a valid V2 document.
 */
export function fromAvnacV2Document(raw: unknown): SaraswatiScene | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as Record<string, unknown>;
  if (doc.v !== 2) return null;

  if (!doc.artboard || typeof doc.artboard !== "object") return null;
  if (!Array.isArray(doc.objects)) return null;

  const artboard = doc.artboard as Record<string, unknown>;
  const w = readNumber(artboard.width, 4000, { min: 1, max: 50000 });
  const h = readNumber(artboard.height, 4000, { min: 1, max: 50000 });

  const scene = createEmptySaraswatiScene({
    width: w,
    height: h,
    bg: readPaint(doc.bg as V2Paint, { type: "solid", color: "#ffffff" }),
  });

  const rootId = scene.root;

  for (const raw of doc.objects as unknown[]) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as V2Object;
    if (!obj.id || !obj.type) continue;

    const node = convertObject(obj, rootId);
    if (!node) continue;

    scene.nodes[node.id] = node;
    const root = scene.nodes[rootId];
    if (root && root.type === "group") {
      root.children.push(node.id);
    }
  }

  return scene;
}

// ---------------------------------------------------------------------------
// Per-object converter
// ---------------------------------------------------------------------------

function convertObject(obj: V2Object, parentId: string): SaraswatiNode | null {
  const x = readNumber(obj.x, 0);
  const y = readNumber(obj.y, 0);
  const rotation = readNumber(obj.rotation, 0);
  const opacity = readNumber(obj.opacity, 1, { min: 0, max: 1 });
  const width = readNumber(obj.width, 1, { min: 0 });
  const height = readNumber(obj.height, 1, { min: 0 });

  const base = {
    id: obj.id,
    parentId,
    name: typeof obj.name === "string" ? obj.name : undefined,
    visible: obj.visible !== false,
    x,
    y,
    rotation,
    scaleX: 1,
    scaleY: 1,
    opacity,
    originX: "left" as const,
    originY: "top" as const,
    blur: readBlur(obj.blurPct),
    shadow: readShadow(obj.shadow),
  };

  const fill = readPaint(obj.fill, { type: "solid", color: "#262626" });
  const stroke = readPaintOrNull(obj.stroke);
  const strokeWidth = typeof obj.strokeWidth === "number" ? obj.strokeWidth : 0;

  switch (obj.type) {
    case "rect": {
      const r = typeof obj.cornerRadius === "number" ? obj.cornerRadius : 0;
      const node: SaraswatiRectNode = {
        ...base,
        type: "rect",
        width,
        height,
        radiusX: r,
        radiusY: r,
        fill,
        stroke,
        strokeWidth,
        clipPath: null,
      };
      return node;
    }

    case "ellipse": {
      const node: SaraswatiEllipseNode = {
        ...base,
        type: "ellipse",
        width,
        height,
        fill,
        stroke,
        strokeWidth,
        clipPath: null,
      };
      return node;
    }

    case "polygon": {
      const sides =
        typeof obj.sides === "number" ? Math.max(3, Math.round(obj.sides)) : 6;
      const radius = Math.min(width, height) / 2;
      const rawPts = regularPolygonPoints(sides, radius);
      // Normalize points to width/height bounding box (0..width, 0..height)
      const pts = rawPts.map((p) => ({
        x: p.x + radius,
        y: p.y + radius,
      }));
      const node: SaraswatiPolygonNode = {
        ...base,
        type: "polygon",
        width,
        height,
        points: pts,
        fill,
        stroke,
        strokeWidth,
        clipPath: null,
      };
      return node;
    }

    case "star": {
      const numPoints =
        typeof obj.points === "number"
          ? Math.max(3, Math.round(obj.points))
          : 5;
      const outerR = Math.min(width, height) / 2;
      const rawPts = starPolygonPoints(numPoints, outerR);
      const pts = rawPts.map((p) => ({
        x: p.x + outerR,
        y: p.y + outerR,
      }));
      const node: SaraswatiPolygonNode = {
        ...base,
        type: "polygon",
        width,
        height,
        points: pts,
        fill,
        stroke,
        strokeWidth,
        clipPath: null,
      };
      return node;
    }

    case "text": {
      const color = readPaint(obj.fill, { type: "solid", color: "#171717" });
      const node: SaraswatiTextNode = {
        ...base,
        type: "text",
        text: typeof obj.text === "string" ? obj.text : "",
        width,
        fontSize: typeof obj.fontSize === "number" ? obj.fontSize : 16,
        fontFamily:
          typeof obj.fontFamily === "string" ? obj.fontFamily : "Inter",
        fontWeight:
          typeof obj.fontWeight === "string" ? obj.fontWeight : "normal",
        fontStyle: obj.fontStyle === "italic" ? "italic" : "normal",
        textAlign:
          obj.textAlign === "center"
            ? "center"
            : obj.textAlign === "right"
              ? "right"
              : "left",
        lineHeight: typeof obj.lineHeight === "number" ? obj.lineHeight : 1.2,
        underline: obj.underline === true,
        color,
        stroke,
        strokeWidth,
        clipPath: null,
      };
      return node;
    }

    case "image": {
      if (!obj.src) return null;
      const node: SaraswatiImageNode = {
        ...base,
        type: "image",
        width,
        height,
        src: obj.src,
        cropX: typeof obj.cropX === "number" ? obj.cropX : 0,
        cropY: typeof obj.cropY === "number" ? obj.cropY : 0,
        cropWidth:
          typeof obj.cropWidth === "number" ? obj.cropWidth : undefined,
        cropHeight:
          typeof obj.cropHeight === "number" ? obj.cropHeight : undefined,
        borderRadius:
          typeof obj.cornerRadius === "number" ? obj.cornerRadius : 0,
        clipPath: null,
      };
      return node;
    }

    case "line":
    case "arrow": {
      const strokeColor = readPaint(obj.stroke ?? obj.fill, {
        type: "solid",
        color: "#262626",
      });
      const sw = typeof obj.strokeWidth === "number" ? obj.strokeWidth : 6;
      const isArrow = obj.type === "arrow";
      const { x1, y1, x2, y2 } = lineEndpoints(
        obj.x,
        obj.y,
        width,
        height,
        rotation,
      );
      const node: SaraswatiLineNode = {
        ...base,
        // line nodes use their own position via x1/y1/x2/y2; zero out base x/y
        x: 0,
        y: 0,
        type: "line",
        x1,
        y1,
        x2,
        y2,
        stroke: strokeColor,
        strokeWidth: sw,
        arrowStart: false,
        arrowEnd: isArrow && (obj.headSize ?? 1) > 0,
        lineStyle: readLineStyle(obj.lineStyle),
        pathType: readPathType(obj.pathType),
        curveBulge: typeof obj.curveBulge === "number" ? obj.curveBulge : 0,
        curveT: typeof obj.curveT === "number" ? obj.curveT : 0.5,
      };
      return node;
    }

    case "vector-board":
      // Vector boards have an embedded document; skip on import for now.
      return null;

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPaint(
  raw: V2Paint | unknown,
  fallback: SaraswatiColor,
): SaraswatiColor {
  if (!raw || typeof raw !== "object") return fallback;
  const p = raw as Record<string, unknown>;
  if (p.type === "solid" && typeof p.color === "string") {
    return { type: "solid", color: p.color };
  }
  if (p.type === "gradient" && typeof p.css === "string") {
    const stops = Array.isArray(p.stops)
      ? (p.stops as unknown[])
          .filter(
            (s): s is { color: string; offset: number } =>
              typeof s === "object" &&
              s !== null &&
              typeof (s as Record<string, unknown>).color === "string" &&
              typeof (s as Record<string, unknown>).offset === "number",
          )
          .map((s) => ({ color: s.color, offset: s.offset }))
      : [];
    return {
      type: "gradient",
      css: p.css,
      stops,
      angle: typeof p.angle === "number" ? p.angle : 0,
    };
  }
  return fallback;
}

function readPaintOrNull(raw: V2Paint | unknown): SaraswatiColor | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  // Transparent stroke = no stroke
  if (
    p.type === "solid" &&
    (p.color === "transparent" || p.color === "rgba(0,0,0,0)")
  ) {
    return null;
  }
  return readPaint(raw, { type: "solid", color: "#000000" }) ?? null;
}

function readLineStyle(v: unknown): SaraswatiLineStyle {
  if (v === "dashed") return "dashed";
  if (v === "dotted") return "dotted";
  return "solid";
}

function readPathType(v: unknown): SaraswatiLinePathType {
  if (v === "curved") return "curved";
  return "straight";
}

/**
 * Reconstruct line endpoints from bounding-box position + rotation.
 * V2 stores lines/arrows as center-anchored with `width` ≈ line length
 * (the dominant projected dimension) and the rotation applied around center.
 */
function lineEndpoints(
  x: number,
  y: number,
  w: number,
  h: number,
  rotDeg: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const cx = x + w / 2;
  const cy = y + h / 2;
  // Use the larger dimension as the line length approximation.
  // For near-horizontal lines, width ≫ height; for near-vertical, height ≫ width.
  const halfLen = Math.max(w, h) / 2;
  const rad = (rotDeg * Math.PI) / 180;
  return {
    x1: cx - halfLen * Math.cos(rad),
    y1: cy - halfLen * Math.sin(rad),
    x2: cx + halfLen * Math.cos(rad),
    y2: cy + halfLen * Math.sin(rad),
  };
}

function readNumber(
  value: unknown,
  fallback: number,
  options?: { min?: number; max?: number },
): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  if (typeof options?.min === "number" && n < options.min) return options.min;
  if (typeof options?.max === "number" && n > options.max) return options.max;
  return n;
}
