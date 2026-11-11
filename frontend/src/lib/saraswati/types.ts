export const SARASWATI_SCENE_VERSION = 1 as const;

/**
 * Engine-owned color/paint type. Structurally identical to `BgValue` in the
 * UI layer — but the engine must not import from UI or renderer packages.
 * The UI casts `BgValue` to `SaraswatiColor` at dispatch boundaries.
 */
export type SaraswatiColorStop = { color: string; offset: number };
export type SaraswatiColor =
  | { type: "solid"; color: string }
  | {
      type: "gradient";
      css: string;
      stops: SaraswatiColorStop[];
      angle: number;
    };

export const SARASWATI_NODE_TYPES = [
  "rect",
  "ellipse",
  "polygon",
  "line",
  "text",
  "image",
  "group",
] as const;

export type SaraswatiNodeType = (typeof SARASWATI_NODE_TYPES)[number];

export type SaraswatiNodeId = string;
export type SaraswatiNodeOriginX = "left" | "center" | "right";
export type SaraswatiNodeOriginY = "top" | "center" | "bottom";

/** Drop-shadow descriptor owned by the engine. */
export type SaraswatiShadow = {
  blur: number;
  offsetX: number;
  offsetY: number;
  colorHex: string;
  opacityPct: number;
};

export type SaraswatiNodeBase = {
  id: SaraswatiNodeId;
  parentId: SaraswatiNodeId | null;
  name?: string;
  visible: boolean;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  originX: SaraswatiNodeOriginX;
  originY: SaraswatiNodeOriginY;
  /** Drop shadow. Null / undefined = no shadow. */
  shadow?: SaraswatiShadow | null;
  /** Gaussian blur amount as a percentage (0–100). 0 = no blur. */
  blur?: number;
};

export type SaraswatiPaintNodeBase = SaraswatiNodeBase & {
  fill: SaraswatiColor;
  stroke: SaraswatiColor | null;
  strokeWidth: number;
};

export type SaraswatiClipPath =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      radiusX: number;
      radiusY: number;
    }
  | {
      type: "ellipse";
      x: number;
      y: number;
      width: number;
      height: number;
    };

export type SaraswatiRectNode = SaraswatiPaintNodeBase & {
  type: "rect";
  width: number;
  height: number;
  radiusX: number;
  radiusY: number;
  clipPath?: SaraswatiClipPath | null;
  clipPathStack?: SaraswatiClipPath[];
};

export type SaraswatiEllipseNode = SaraswatiPaintNodeBase & {
  type: "ellipse";
  width: number;
  height: number;
  clipPath?: SaraswatiClipPath | null;
  clipPathStack?: SaraswatiClipPath[];
};

export type SaraswatiPolygonNode = SaraswatiPaintNodeBase & {
  type: "polygon";
  width: number;
  height: number;
  points: Array<{ x: number; y: number }>;
  clipPath?: SaraswatiClipPath | null;
  clipPathStack?: SaraswatiClipPath[];
};

export type SaraswatiLineStyle = "solid" | "dashed" | "dotted";
export type SaraswatiLinePathType = "straight" | "curved";

export type SaraswatiLineNode = SaraswatiNodeBase & {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: SaraswatiColor;
  strokeWidth: number;
  arrowStart: boolean;
  arrowEnd: boolean;
  lineStyle: SaraswatiLineStyle;
  pathType: SaraswatiLinePathType;
  /** Quadratic control-point perpendicular offset in scene px (positive = below the line). */
  curveBulge: number;
  /** Position of the control point along the shaft (0–1). Default 0.5. */
  curveT: number;
};

export type SaraswatiTextNode = SaraswatiNodeBase & {
  type: "text";
  text: string;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  underline: boolean;
  color: SaraswatiColor;
  stroke: SaraswatiColor | null;
  strokeWidth: number;
  clipPath?: SaraswatiClipPath | null;
  clipPathStack?: SaraswatiClipPath[];
};

/**
 * Attribution for a stock photo placed on the canvas.
 *
 * Unsplash requires the photographer and Unsplash to be credited wherever a
 * photo is used, so the credit is stored on the node and survives save/load
 * instead of disappearing with the search results that produced it. Links
 * carry utm parameters, as their API guidelines require.
 */
export type SaraswatiImageCredit = {
  source: string;
  photoId: string;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  /** Ready-to-place credit line, e.g. "Photo by Ada on Unsplash". */
  text: string;
};

export type SaraswatiImageNode = SaraswatiNodeBase & {
  type: "image";
  width: number;
  height: number;
  borderRadius?: number;
  src: string;
  cropX: number;
  cropY: number;
  cropWidth?: number;
  cropHeight?: number;
  clipPath: SaraswatiClipPath | null;
  clipPathStack?: SaraswatiClipPath[];
  /** Stock-photo attribution, present when the image came from Unsplash. */
  credit?: SaraswatiImageCredit | null;
};

export type SaraswatiGroupNode = {
  id: SaraswatiNodeId;
  type: "group";
  parentId: SaraswatiNodeId | null;
  /** Virtual editor rotation used to track group rotation gestures. */
  rotation?: number;
  name?: string;
  visible: boolean;
  opacity: number;
  children: SaraswatiNodeId[];
  shadow?: SaraswatiShadow | null;
  blur?: number;
};

export type SaraswatiNode =
  | SaraswatiRectNode
  | SaraswatiEllipseNode
  | SaraswatiPolygonNode
  | SaraswatiLineNode
  | SaraswatiTextNode
  | SaraswatiImageNode
  | SaraswatiGroupNode;

export type SaraswatiRenderableNode =
  | SaraswatiRectNode
  | SaraswatiEllipseNode
  | SaraswatiPolygonNode
  | SaraswatiLineNode
  | SaraswatiTextNode
  | SaraswatiImageNode;

export type SaraswatiSceneArtboard = {
  width: number;
  height: number;
  bg: SaraswatiColor;
};

export type SaraswatiScene = {
  version: typeof SARASWATI_SCENE_VERSION;
  root: SaraswatiNodeId;
  nodes: Record<SaraswatiNodeId, SaraswatiNode>;
  artboard: SaraswatiSceneArtboard;
};

export type SaraswatiSceneValidationIssue = {
  reason: string;
  nodeId?: SaraswatiNodeId;
};

export type SaraswatiAdapterIssue = {
  reason: string;
  sourceType: string;
  sourceId?: SaraswatiNodeId;
};

export type SaraswatiAdapterResult = {
  scene: SaraswatiScene;
  fullySupported: boolean;
  issues: SaraswatiAdapterIssue[];
};

export type Scene = SaraswatiScene;
export type Node = SaraswatiNode;
