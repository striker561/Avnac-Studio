import type { BgValue } from "../../editor-paint";
import {
  type SaraswatiClipPath,
  type SaraswatiEllipseNode,
  listSaraswatiNodesInRenderOrder,
  type SaraswatiImageNode,
  type SaraswatiLineNode,
  type SaraswatiLinePathType,
  type SaraswatiLineStyle,
  type SaraswatiNodeOriginX,
  type SaraswatiNodeOriginY,
  type SaraswatiPolygonNode,
  type SaraswatiRectNode,
  type SaraswatiRenderableNode,
  type SaraswatiScene,
  type SaraswatiTextNode,
} from "../scene";
import type { SaraswatiShadow } from "../types";

export const SARASWATI_RENDER_COMMAND_TYPES = [
  "rect",
  "ellipse",
  "polygon",
  "line",
  "text",
  "image",
] as const;

export type SaraswatiRenderCommandType =
  (typeof SARASWATI_RENDER_COMMAND_TYPES)[number];

type RenderTransform = {
  id: string;
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

export type SaraswatiRenderRectCommand = RenderTransform & {
  type: "rect";
  width: number;
  height: number;
  fill: BgValue;
  stroke: BgValue | null;
  strokeWidth: number;
  radiusX: number;
  radiusY: number;
  clipPath: SaraswatiClipPath | null;
  clipPathStack: SaraswatiClipPath[];
};

export type SaraswatiRenderEllipseCommand = RenderTransform & {
  type: "ellipse";
  width: number;
  height: number;
  fill: BgValue;
  stroke: BgValue | null;
  strokeWidth: number;
  clipPath: SaraswatiClipPath | null;
  clipPathStack: SaraswatiClipPath[];
};

export type SaraswatiRenderPolygonCommand = RenderTransform & {
  type: "polygon";
  width: number;
  height: number;
  fill: BgValue;
  stroke: BgValue | null;
  strokeWidth: number;
  points: Array<{ x: number; y: number }>;
  clipPath: SaraswatiClipPath | null;
  clipPathStack: SaraswatiClipPath[];
};

export type SaraswatiRenderLineCommand = RenderTransform & {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: BgValue;
  strokeWidth: number;
  arrowStart: boolean;
  arrowEnd: boolean;
  lineStyle: SaraswatiLineStyle;
  pathType: SaraswatiLinePathType;
  curveBulge: number;
  curveT: number;
};

export type SaraswatiRenderTextCommand = RenderTransform & {
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
  color: BgValue;
  stroke: BgValue | null;
  strokeWidth: number;
  clipPath: SaraswatiClipPath | null;
  clipPathStack: SaraswatiClipPath[];
};

export type SaraswatiRenderImageCommand = RenderTransform & {
  type: "image";
  width: number;
  height: number;
  borderRadius: number;
  src: string;
  cropX: number;
  cropY: number;
  cropWidth?: number;
  cropHeight?: number;
  clipPath: SaraswatiClipPath | null;
  clipPathStack: SaraswatiClipPath[];
};

export type SaraswatiRenderCommand =
  | SaraswatiRenderRectCommand
  | SaraswatiRenderEllipseCommand
  | SaraswatiRenderPolygonCommand
  | SaraswatiRenderLineCommand
  | SaraswatiRenderTextCommand
  | SaraswatiRenderImageCommand;

export function buildArtboardRenderCommand(
  scene: SaraswatiScene,
): SaraswatiRenderRectCommand {
  return {
    type: "rect",
    id: "__artboard__",
    x: 0,
    y: 0,
    width: scene.artboard.width,
    height: scene.artboard.height,
    fill: scene.artboard.bg,
    stroke: null,
    strokeWidth: 0,
    radiusX: 0,
    radiusY: 0,
    clipPath: null,
    clipPathStack: [],
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    shadow: null,
    blur: 0,
  };
}

export function buildRenderCommands(
  scene: SaraswatiScene,
): SaraswatiRenderCommand[] {
  const commands: SaraswatiRenderCommand[] = [
    buildArtboardRenderCommand(scene),
  ];

  for (const node of listSaraswatiNodesInRenderOrder(scene)) {
    commands.push(nodeToRenderCommand(node));
  }

  return commands;
}

function nodeToRenderCommand(
  node: SaraswatiRenderableNode,
): SaraswatiRenderCommand {
  switch (node.type) {
    case "rect":
      return rectNodeToCommand(node);
    case "ellipse":
      return ellipseNodeToCommand(node);
    case "polygon":
      return polygonNodeToCommand(node);
    case "line":
      return lineNodeToCommand(node);
    case "text":
      return textNodeToCommand(node);
    case "image":
      return imageNodeToCommand(node);
  }
}

function rectNodeToCommand(
  node: SaraswatiRectNode,
): SaraswatiRenderRectCommand {
  return {
    type: "rect",
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    fill: node.fill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    radiusX: node.radiusX,
    radiusY: node.radiusY,
    clipPath: node.clipPath ?? null,
    clipPathStack:
      node.clipPathStack?.map((clipPath) => ({ ...clipPath })) ?? [],
    rotation: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    originX: node.originX,
    originY: node.originY,
    shadow: node.shadow ?? null,
    blur: node.blur ?? 0,
  };
}

function ellipseNodeToCommand(
  node: SaraswatiEllipseNode,
): SaraswatiRenderEllipseCommand {
  return {
    type: "ellipse",
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    fill: node.fill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    clipPath: node.clipPath ?? null,
    clipPathStack:
      node.clipPathStack?.map((clipPath) => ({ ...clipPath })) ?? [],
    rotation: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    originX: node.originX,
    originY: node.originY,
    shadow: node.shadow ?? null,
    blur: node.blur ?? 0,
  };
}

function polygonNodeToCommand(
  node: SaraswatiPolygonNode,
): SaraswatiRenderPolygonCommand {
  return {
    type: "polygon",
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    fill: node.fill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    points: node.points.map((point) => ({ ...point })),
    clipPath: node.clipPath ?? null,
    clipPathStack:
      node.clipPathStack?.map((clipPath) => ({ ...clipPath })) ?? [],
    rotation: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    originX: node.originX,
    originY: node.originY,
    shadow: node.shadow ?? null,
    blur: node.blur ?? 0,
  };
}

function lineNodeToCommand(
  node: SaraswatiLineNode,
): SaraswatiRenderLineCommand {
  return {
    type: "line",
    id: node.id,
    x: node.x,
    y: node.y,
    x1: node.x1,
    y1: node.y1,
    x2: node.x2,
    y2: node.y2,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    arrowStart: node.arrowStart,
    arrowEnd: node.arrowEnd,
    lineStyle: node.lineStyle,
    pathType: node.pathType,
    curveBulge: node.curveBulge,
    curveT: node.curveT,
    rotation: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    originX: node.originX,
    originY: node.originY,
    shadow: node.shadow ?? null,
    blur: node.blur ?? 0,
  };
}

function textNodeToCommand(
  node: SaraswatiTextNode,
): SaraswatiRenderTextCommand {
  return {
    type: "text",
    id: node.id,
    x: node.x,
    y: node.y,
    text: node.text,
    width: node.width,
    fontSize: node.fontSize,
    fontFamily: node.fontFamily,
    fontWeight: node.fontWeight,
    fontStyle: node.fontStyle,
    textAlign: node.textAlign,
    lineHeight: node.lineHeight,
    underline: node.underline,
    color: node.color,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    clipPath: node.clipPath ?? null,
    clipPathStack:
      node.clipPathStack?.map((clipPath) => ({ ...clipPath })) ?? [],
    rotation: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    originX: node.originX,
    originY: node.originY,
    shadow: node.shadow ?? null,
    blur: node.blur ?? 0,
  };
}

function imageNodeToCommand(
  node: SaraswatiImageNode,
): SaraswatiRenderImageCommand {
  return {
    type: "image",
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    borderRadius: node.borderRadius ?? 0,
    src: node.src,
    cropX: node.cropX,
    cropY: node.cropY,
    cropWidth: node.cropWidth,
    cropHeight: node.cropHeight,
    clipPath: node.clipPath,
    clipPathStack:
      node.clipPathStack?.map((clipPath) => ({ ...clipPath })) ?? [],
    rotation: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    originX: node.originX,
    originY: node.originY,
    shadow: node.shadow ?? null,
    blur: node.blur ?? 0,
  };
}
