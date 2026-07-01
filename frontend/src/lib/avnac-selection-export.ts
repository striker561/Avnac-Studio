/**
 * Export the currently selected canvas elements as PNG or SVG.
 *
 * PNG: rendered via the same canvas2D backend used for full-scene export,
 *      with only the selected nodes (and their group descendants) drawn on a
 *      transparent canvas cropped to the selection bounding box.
 *
 * SVG: generated directly from node data.  Most features (fills, gradients,
 *      shadows, blur, opacity, transforms) are faithfully reproduced.  Complex
 *      clip-paths are omitted for brevity; images are embedded with their
 *      original src URL (remote images may not display in all SVG viewers).
 */

import {
  downloadSvgViaBrowser,
  exportPngNativeOrBrowser,
  exportTextFileNativeOrBrowser,
} from "./avnac-export-io";
import {
  type SaraswatiNode,
  type SaraswatiRenderableNode,
  type SaraswatiScene,
  SARASWATI_SCENE_VERSION,
  listSaraswatiNodesInRenderOrder,
} from "./saraswati/scene";
import type {
  SaraswatiEllipseNode,
  SaraswatiImageNode,
  SaraswatiLineNode,
  SaraswatiPolygonNode,
  SaraswatiRectNode,
  SaraswatiShadow,
  SaraswatiTextNode,
} from "./saraswati/types";
import { getNodeBounds } from "./saraswati/spatial";
import { renderSceneToPngDataUrl } from "./renderer/offscreen-render";
import { resolveSelectionPngMultiplier } from "./image-pixel-utils";
import type { BgValue, GradientStop } from "./editor-paint";
import { anchorToCenter } from "./saraswati/transform/anchor";

// ─── Shared utilities ────────────────────────────────────────────────────────

/** Collect the IDs of the selected nodes and every one of their descendants. */
function collectDescendantIds(
  scene: SaraswatiScene,
  selectedIds: string[],
): Set<string> {
  const result = new Set<string>();
  function visit(id: string) {
    result.add(id);
    const node = scene.nodes[id];
    if (node?.type === "group") {
      for (const childId of node.children) visit(childId);
    }
  }
  for (const id of selectedIds) visit(id);
  return result;
}

type SelectionResult = {
  /** Flat scene containing only the selected leaf nodes, origin-shifted to (0,0). */
  virtualScene: SaraswatiScene;
  /** Same leaf nodes in render order, already offset. */
  leafNodes: SaraswatiRenderableNode[];
  width: number;
  height: number;
};

/**
 * Build a minimal scene that contains only the selected nodes (and group
 * descendants), translated so that the bounding box starts at (0, 0).
 */
function buildSelectionScene(
  scene: SaraswatiScene,
  selectedIds: string[],
): SelectionResult | null {
  const descendantIds = collectDescendantIds(scene, selectedIds);
  const allLeafs = listSaraswatiNodesInRenderOrder(scene);
  // listSaraswatiNodesInRenderOrder already composes group opacity into leaves.
  const selectionLeafs = allLeafs.filter((n) => descendantIds.has(n.id));

  if (selectionLeafs.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const node of selectionLeafs) {
    const b = getNodeBounds(node);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 1 || h < 1) return null;

  const rootId = "__sel_root__";
  const nodes: Record<string, SaraswatiNode> = {
    [rootId]: {
      id: rootId,
      type: "group",
      parentId: null,
      visible: true,
      opacity: 1,
      children: selectionLeafs.map((n) => n.id),
    },
  };

  const offsetLeafs: SaraswatiRenderableNode[] = [];
  for (const node of selectionLeafs) {
    const shifted = shiftNode(node, -minX, -minY, rootId);
    nodes[node.id] = shifted;
    offsetLeafs.push(shifted as SaraswatiRenderableNode);
  }

  const virtualScene: SaraswatiScene = {
    version: SARASWATI_SCENE_VERSION,
    root: rootId,
    nodes,
    artboard: {
      width: w,
      height: h,
      bg: { type: "solid", color: "rgba(0,0,0,0)" },
    },
  };

  return { virtualScene, leafNodes: offsetLeafs, width: w, height: h };
}

function shiftNode(
  node: SaraswatiRenderableNode,
  dx: number,
  dy: number,
  newParentId: string,
): SaraswatiNode {
  if (node.type === "line") {
    return {
      ...node,
      parentId: newParentId,
      x1: node.x1 + dx,
      y1: node.y1 + dy,
      x2: node.x2 + dx,
      y2: node.y2 + dy,
    };
  }
  // All non-line renderable nodes extend SaraswatiNodeBase which has x and y.
  const positioned = node as SaraswatiRenderableNode & { x: number; y: number };
  return {
    ...positioned,
    parentId: newParentId,
    x: positioned.x + dx,
    y: positioned.y + dy,
  } as SaraswatiNode;
}

// ─── PNG Export ──────────────────────────────────────────────────────────────

export async function exportSelectionAsPng(
  filename: string,
  scene: SaraswatiScene,
  selectedIds: string[],
  options: { multiplier?: number; useSourceResolution?: boolean } = {},
): Promise<void> {
  const result = buildSelectionScene(scene, selectedIds);
  if (!result) {
    throw new Error("Nothing to export — check your selection.");
  }

  let multiplier = Math.max(1, options.multiplier ?? 2);
  if (options.useSourceResolution) {
    multiplier = await resolveSelectionPngMultiplier(
      scene,
      selectedIds,
      multiplier,
    );
  }

  let dataUrl: string;
  try {
    dataUrl = await renderSceneToPngDataUrl(result.virtualScene, {
      multiplier,
      skipArtboardBackgroundCommand: true,
    });
  } catch (err) {
    throw new Error(
      "PNG export failed because a remote image tainted the canvas " +
        "(cross-origin restriction).",
      { cause: err },
    );
  }

  await exportPngNativeOrBrowser(filename, dataUrl, {
    logLabel: "native selection PNG export",
  });
}

// ─── SVG Export ──────────────────────────────────────────────────────────────

type SvgCtx = {
  defs: string[];
  counter: number;
};

function uid(ctx: SvgCtx, prefix: string): string {
  return `${prefix}${++ctx.counter}`;
}

/** Round to 2 decimal places and stringify. */
function r2(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/**
 * Build the SVG `transform` string that matches the canvas2d renderer's
 * translate→rotate→scale stack.
 */
function svgTransform(
  x: number,
  y: number,
  originX: string,
  originY: string,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  rotation: number,
): string {
  const cx = anchorToCenter(x, originX, width * Math.abs(scaleX), true);
  const cy = anchorToCenter(y, originY, height * Math.abs(scaleY), false);
  const parts: string[] = [`translate(${r2(cx)},${r2(cy)})`];
  if (rotation) parts.push(`rotate(${r2(rotation)})`);
  if (scaleX !== 1 || scaleY !== 1)
    parts.push(`scale(${r2(scaleX)},${r2(scaleY)})`);
  return parts.join(" ");
}

/** Build a `<linearGradient>` def and return `url(#id)`. */
function gradientRef(
  stops: GradientStop[],
  angleDeg: number,
  box: { x: number; y: number; width: number; height: number },
  svgCtx: SvgCtx,
): string {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const tx = dx !== 0 ? box.width / 2 / Math.abs(dx) : 1e9;
  const ty = dy !== 0 ? box.height / 2 / Math.abs(dy) : 1e9;
  const half = Math.min(tx, ty);
  const x1 = cx - dx * half;
  const y1 = cy - dy * half;
  const x2 = cx + dx * half;
  const y2 = cy + dy * half;
  const id = uid(svgCtx, "g");
  const stopsMarkup = stops
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`)
    .join("");
  svgCtx.defs.push(
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse"` +
      ` x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}">${stopsMarkup}</linearGradient>`,
  );
  return `url(#${id})`;
}

function paintValue(
  paint: BgValue | null | undefined,
  box: { x: number; y: number; width: number; height: number },
  svgCtx: SvgCtx,
): string {
  if (!paint) return "none";
  if (paint.type === "solid") return paint.color;
  return gradientRef(paint.stops, paint.angle, box, svgCtx);
}

function filterAttr(
  shadow: SaraswatiShadow | null | undefined,
  blur: number | undefined,
  svgCtx: SvgCtx,
): string {
  const blurPx = (blur ?? 0) * 0.4;
  if (!shadow && blurPx <= 0) return "";
  const id = uid(svgCtx, "fx");
  const inner: string[] = [];
  if (blurPx > 0) {
    inner.push(
      `<feGaussianBlur in="SourceGraphic" stdDeviation="${r2(blurPx)}" result="b"/>`,
    );
    if (shadow) {
      const alpha = Math.max(0, Math.min(1, shadow.opacityPct / 100));
      inner.push(
        `<feDropShadow in="b" dx="${r2(shadow.offsetX)}" dy="${r2(shadow.offsetY)}"` +
          ` stdDeviation="${r2(shadow.blur / 2)}" flood-color="${shadow.colorHex}" flood-opacity="${r2(alpha)}"/>`,
      );
    }
  } else if (shadow) {
    const alpha = Math.max(0, Math.min(1, shadow.opacityPct / 100));
    inner.push(
      `<feDropShadow dx="${r2(shadow.offsetX)}" dy="${r2(shadow.offsetY)}"` +
        ` stdDeviation="${r2(shadow.blur / 2)}" flood-color="${shadow.colorHex}" flood-opacity="${r2(alpha)}"/>`,
    );
  }
  svgCtx.defs.push(
    `<filter id="${id}" x="-100%" y="-100%" width="300%" height="300%">${inner.join("")}</filter>`,
  );
  return ` filter="url(#${id})"`;
}

function wrapGroup(
  inner: string,
  transform: string,
  opacity: number,
  filterStr: string,
): string {
  const opacityAttr = opacity !== 1 ? ` opacity="${r2(opacity)}"` : "";
  return `<g transform="${transform}"${opacityAttr}${filterStr}>${inner}</g>`;
}

// ── Per-type SVG generators ──────────────────────────────────────────────────

function rectToSvg(node: SaraswatiRectNode, svgCtx: SvgCtx): string {
  const w = node.width;
  const h = node.height;
  const box = { x: -w / 2, y: -h / 2, width: w, height: h };
  const fill = paintValue(node.fill, box, svgCtx);
  const stroke = paintValue(node.stroke, box, svgCtx);
  const rx = Math.max(node.radiusX, node.radiusY);
  const rxAttr = rx > 0 ? ` rx="${r2(rx)}"` : "";
  const strokeAttrs =
    node.stroke && node.strokeWidth > 0
      ? ` stroke="${stroke}" stroke-width="${r2(node.strokeWidth)}"`
      : ' stroke="none"';
  const shape = `<rect x="${r2(-w / 2)}" y="${r2(-h / 2)}" width="${r2(w)}" height="${r2(h)}"${rxAttr} fill="${fill}"${strokeAttrs}/>`;
  return wrapGroup(
    shape,
    svgTransform(
      node.x,
      node.y,
      node.originX,
      node.originY,
      w,
      h,
      node.scaleX,
      node.scaleY,
      node.rotation,
    ),
    node.opacity,
    filterAttr(node.shadow, node.blur, svgCtx),
  );
}

function ellipseToSvg(node: SaraswatiEllipseNode, svgCtx: SvgCtx): string {
  const w = node.width;
  const h = node.height;
  const box = { x: -w / 2, y: -h / 2, width: w, height: h };
  const fill = paintValue(node.fill, box, svgCtx);
  const stroke = paintValue(node.stroke, box, svgCtx);
  const strokeAttrs =
    node.stroke && node.strokeWidth > 0
      ? ` stroke="${stroke}" stroke-width="${r2(node.strokeWidth)}"`
      : ' stroke="none"';
  const shape = `<ellipse cx="0" cy="0" rx="${r2(w / 2)}" ry="${r2(h / 2)}" fill="${fill}"${strokeAttrs}/>`;
  return wrapGroup(
    shape,
    svgTransform(
      node.x,
      node.y,
      node.originX,
      node.originY,
      w,
      h,
      node.scaleX,
      node.scaleY,
      node.rotation,
    ),
    node.opacity,
    filterAttr(node.shadow, node.blur, svgCtx),
  );
}

function polygonToSvg(node: SaraswatiPolygonNode, svgCtx: SvgCtx): string {
  if (node.points.length < 2) return "";
  const w = node.width;
  const h = node.height;
  const box = { x: -w / 2, y: -h / 2, width: w, height: h };
  const fill = paintValue(node.fill, box, svgCtx);
  const stroke = paintValue(node.stroke, box, svgCtx);
  const strokeAttrs =
    node.stroke && node.strokeWidth > 0
      ? ` stroke="${stroke}" stroke-width="${r2(node.strokeWidth)}"`
      : ' stroke="none"';
  // Polygon points are in local space centered at (0,0)
  const pts = node.points.map((p) => `${r2(p.x)},${r2(p.y)}`).join(" ");
  const shape = `<polygon points="${pts}" fill="${fill}"${strokeAttrs}/>`;
  return wrapGroup(
    shape,
    svgTransform(
      node.x,
      node.y,
      node.originX,
      node.originY,
      w,
      h,
      node.scaleX,
      node.scaleY,
      node.rotation,
    ),
    node.opacity,
    filterAttr(node.shadow, node.blur, svgCtx),
  );
}

const ARROWHEAD_ANGLE_RAD = Math.PI / 7;

function arrowheadLength(strokeWidth: number): number {
  const raw = Math.max(1, strokeWidth) * 2.25;
  return Math.max(5, Math.min(72, raw));
}

function arrowheadPolygon(
  tipX: number,
  tipY: number,
  fromX: number,
  fromY: number,
  strokeWidth: number,
  color: string,
): string {
  const angle = Math.atan2(tipY - fromY, tipX - fromX);
  const len = arrowheadLength(strokeWidth);
  const ax = tipX - len * Math.cos(angle - ARROWHEAD_ANGLE_RAD);
  const ay = tipY - len * Math.sin(angle - ARROWHEAD_ANGLE_RAD);
  const bx = tipX - len * Math.cos(angle + ARROWHEAD_ANGLE_RAD);
  const by = tipY - len * Math.sin(angle + ARROWHEAD_ANGLE_RAD);
  return `<polygon points="${r2(tipX)},${r2(tipY)} ${r2(ax)},${r2(ay)} ${r2(bx)},${r2(by)}" fill="${color}" stroke="none"/>`;
}

function lineToSvg(node: SaraswatiLineNode, svgCtx: SvgCtx): string {
  const { x1, y1, x2, y2 } = node;
  const bx = Math.min(x1, x2);
  const by = Math.min(y1, y2);
  const box = {
    x: bx,
    y: by,
    width: Math.max(1, Math.abs(x2 - x1)),
    height: Math.max(1, Math.abs(y2 - y1)),
  };
  // SaraswatiColor is structurally identical to BgValue
  const strokeColor = paintValue(
    node.stroke as unknown as BgValue,
    box,
    svgCtx,
  );
  if (strokeColor === "none" || node.strokeWidth <= 0) return "";

  const isCurved = node.pathType === "curved" && node.curveBulge !== 0;
  let cpX = (x1 + x2) / 2;
  let cpY = (y1 + y2) / 2;
  if (isCurved) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L > 0) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const perpX = -dy / L;
      const perpY = dx / L;
      cpX = x1 + node.curveT * dx + node.curveBulge * perpX;
      cpY = y1 + node.curveT * dy + node.curveBulge * perpY;
    }
  }

  const arrowLen = arrowheadLength(node.strokeWidth);
  const shaftInset = arrowLen * 0.65;
  const lineAngle = Math.atan2(y2 - y1, x2 - x1);
  let dx1 = x1,
    dy1 = y1,
    dx2 = x2,
    dy2 = y2;
  if (node.arrowEnd) {
    const tipAngle = isCurved ? Math.atan2(y2 - cpY, x2 - cpX) : lineAngle;
    dx2 = x2 - shaftInset * Math.cos(tipAngle);
    dy2 = y2 - shaftInset * Math.sin(tipAngle);
  }
  if (node.arrowStart) {
    const tailAngle = isCurved
      ? Math.atan2(y1 - cpY, x1 - cpX)
      : lineAngle + Math.PI;
    dx1 = x1 - shaftInset * Math.cos(tailAngle);
    dy1 = y1 - shaftInset * Math.sin(tailAngle);
  }

  const dashArray =
    node.lineStyle === "dashed"
      ? ` stroke-dasharray="${r2(node.strokeWidth * 4)},${r2(node.strokeWidth * 2)}"`
      : node.lineStyle === "dotted"
        ? ` stroke-dasharray="${r2(node.strokeWidth)},${r2(node.strokeWidth * 2)}"`
        : "";

  const pathD = isCurved
    ? `M${r2(dx1)},${r2(dy1)} Q${r2(cpX)},${r2(cpY)} ${r2(dx2)},${r2(dy2)}`
    : `M${r2(dx1)},${r2(dy1)} L${r2(dx2)},${r2(dy2)}`;

  const fxAttr = filterAttr(node.shadow, node.blur, svgCtx);
  const opAttr = node.opacity !== 1 ? ` opacity="${r2(node.opacity)}"` : "";
  const shaftEl =
    `<path d="${pathD}" stroke="${strokeColor}" stroke-width="${r2(node.strokeWidth)}"` +
    ` stroke-linecap="round" stroke-linejoin="round"${dashArray} fill="none"/>`;

  const arrows: string[] = [];
  if (node.arrowEnd) {
    const fromX = isCurved ? cpX : x1;
    const fromY = isCurved ? cpY : y1;
    arrows.push(
      arrowheadPolygon(x2, y2, fromX, fromY, node.strokeWidth, strokeColor),
    );
  }
  if (node.arrowStart) {
    const fromX = isCurved ? cpX : x2;
    const fromY = isCurved ? cpY : y2;
    arrows.push(
      arrowheadPolygon(x1, y1, fromX, fromY, node.strokeWidth, strokeColor),
    );
  }

  return `<g${opAttr}${fxAttr}>${shaftEl}${arrows.join("")}</g>`;
}

function textToSvg(node: SaraswatiTextNode, svgCtx: SvgCtx): string {
  const text = node.text.trim();
  if (!text) return "";

  const rawLines = node.text.split(/\r?\n/);
  const w = Math.max(1, node.width);
  const lineHeightPx =
    Math.max(1, node.fontSize) * Math.max(1, node.lineHeight);
  const h = Math.max(lineHeightPx, rawLines.length * lineHeightPx);
  const box = { x: -w / 2, y: -h / 2, width: w, height: h };

  const fillColor = paintValue(node.color as unknown as BgValue, box, svgCtx);
  const strokeColor = node.stroke
    ? paintValue(node.stroke as unknown as BgValue, box, svgCtx)
    : "none";

  const textAnchor =
    node.textAlign === "center"
      ? "middle"
      : node.textAlign === "right"
        ? "end"
        : "start";
  const anchorX =
    node.textAlign === "center"
      ? 0
      : node.textAlign === "right"
        ? w / 2
        : -w / 2;

  const fontAttr =
    `font-size="${r2(node.fontSize)}" font-family="${node.fontFamily}"` +
    ` font-weight="${node.fontWeight}"` +
    (node.fontStyle === "italic" ? ' font-style="italic"' : "");
  const underline = node.underline ? ' text-decoration="underline"' : "";
  const strokeAttrStr =
    node.stroke && node.strokeWidth > 0
      ? ` stroke="${strokeColor}" stroke-width="${r2(node.strokeWidth)}" paint-order="stroke"`
      : "";

  const tspans = rawLines
    .map(
      (line, i) =>
        `<tspan x="${r2(anchorX)}" dy="${i === 0 ? "0" : r2(lineHeightPx)}">${escSvg(line || "\u00A0")}</tspan>`,
    )
    .join("");

  // Start y at top of box (-h/2) using dominant-baseline="text-before-edge"
  const shape =
    `<text x="${r2(anchorX)}" y="${r2(-h / 2)}"` +
    ` dominant-baseline="text-before-edge" text-anchor="${textAnchor}"` +
    ` fill="${fillColor}"${strokeAttrStr} ${fontAttr}${underline}>${tspans}</text>`;

  return wrapGroup(
    shape,
    svgTransform(
      node.x,
      node.y,
      node.originX,
      node.originY,
      w,
      h,
      node.scaleX,
      node.scaleY,
      node.rotation,
    ),
    node.opacity,
    filterAttr(node.shadow, node.blur, svgCtx),
  );
}

function imageToSvg(node: SaraswatiImageNode, svgCtx: SvgCtx): string {
  const w = node.width;
  const h = node.height;
  const rx = node.borderRadius ?? 0;
  const rxAttr = rx > 0 ? ` rx="${r2(rx)}" ry="${r2(rx)}"` : "";

  let clipAttr = "";
  if (rx > 0) {
    const clipId = uid(svgCtx, "clip");
    svgCtx.defs.push(
      `<clipPath id="${clipId}"><rect x="${r2(-w / 2)}" y="${r2(-h / 2)}" width="${r2(w)}" height="${r2(h)}"${rxAttr}/></clipPath>`,
    );
    clipAttr = ` clip-path="url(#${clipId})"`;
  }

  const shape =
    `<image href="${escSvgAttr(node.src)}" x="${r2(-w / 2)}" y="${r2(-h / 2)}"` +
    ` width="${r2(w)}" height="${r2(h)}" preserveAspectRatio="xMidYMid slice"${clipAttr}/>`;

  return wrapGroup(
    shape,
    svgTransform(
      node.x,
      node.y,
      node.originX,
      node.originY,
      w,
      h,
      node.scaleX,
      node.scaleY,
      node.rotation,
    ),
    node.opacity,
    filterAttr(node.shadow, node.blur, svgCtx),
  );
}

function escSvg(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escSvgAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function nodeToSvg(node: SaraswatiRenderableNode, svgCtx: SvgCtx): string {
  switch (node.type) {
    case "rect":
      return rectToSvg(node, svgCtx);
    case "ellipse":
      return ellipseToSvg(node, svgCtx);
    case "polygon":
      return polygonToSvg(node, svgCtx);
    case "line":
      return lineToSvg(node, svgCtx);
    case "text":
      return textToSvg(node, svgCtx);
    case "image":
      return imageToSvg(node, svgCtx);
  }
}

function buildSvgString(
  leafNodes: SaraswatiRenderableNode[],
  width: number,
  height: number,
): string {
  const svgCtx: SvgCtx = { defs: [], counter: 0 };

  const shapes = leafNodes
    .map((n) => nodeToSvg(n, svgCtx))
    .filter(Boolean)
    .join("\n  ");

  const defsBlock =
    svgCtx.defs.length > 0
      ? `\n  <defs>\n    ${svgCtx.defs.join("\n    ")}\n  </defs>`
      : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
    ` width="${r2(width)}" height="${r2(height)}" viewBox="0 0 ${r2(width)} ${r2(height)}">${defsBlock}\n  ${shapes}\n</svg>`
  );
}

export async function exportSelectionAsSvg(
  filename: string,
  scene: SaraswatiScene,
  selectedIds: string[],
): Promise<void> {
  const result = buildSelectionScene(scene, selectedIds);
  if (!result) return;

  const svg = buildSvgString(result.leafNodes, result.width, result.height);

  await exportTextFileNativeOrBrowser(filename, svg, {
    logLabel: "native selection SVG export",
    fallback: () => downloadSvgViaBrowser(filename, svg),
  });
}
