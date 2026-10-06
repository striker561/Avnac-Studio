/**
 * Pure MCP action → SaraswatiCommand builders, shaped like the engine's
 * applyCommand reducer (lib/saraswati/commands/reducer.ts): one named,
 * side-effect-free function per tool action that takes the current scene plus
 * the tool payload and returns the commands to apply.
 *
 * No store, DOM, or Wails access here — the orchestration layer
 * (features/scene-editor/use-mcp-actions.ts) owns scene access, responses,
 * and navigation, and applies whatever these builders return via
 * store.applyCommands in one batch.
 */

import {
  SARASWATI_ROOT_ID,
  type SaraswatiColor,
  type SaraswatiCommand,
  type SaraswatiNode,
  type SaraswatiScene,
  type SaraswatiShadow,
} from "@/lib/saraswati";
import {
  normalizeFontStyle,
  normalizeFontWeight,
  normalizeTextAlign,
  parseColor,
  parsePaint,
  regularPolygonPoints,
  resolveModifyPaint,
  starPolygonPoints,
} from "@/lib/mcp/payload";

type LooseRecord = Record<string, any>;

export interface CreatedElementInfo {
  id: string;
  name?: string;
  type: string;
  bounds: { left: number; top: number; width: number; height: number };
}

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── render_elements ──────────────────────────────────────────────────────────

/**
 * Convert render_elements element specs into ADD_NODE commands.
 * Element defaults: 100×100 near the artboard center, full opacity.
 */
export function buildRenderElementsCommands(
  scene: SaraswatiScene,
  elements: unknown[],
): { commands: SaraswatiCommand[]; created: CreatedElementInfo[] } {
  const rootId = scene.root || SARASWATI_ROOT_ID;
  const commands: SaraswatiCommand[] = [];
  const created: CreatedElementInfo[] = [];

  for (const raw of elements) {
    const el = (raw ?? {}) as LooseRecord;
    const id = el.id || crypto.randomUUID();
    const name = el.name || el.type;
    const x = el.x ?? el.left ?? scene.artboard.width / 2 - 50;
    const y = el.y ?? el.top ?? scene.artboard.height / 2 - 50;
    const width = el.width ?? 100;
    const height = el.height ?? 100;
    const rotation = el.rotation ?? el.angle ?? 0;
    const opacity = el.opacity ?? 1;
    const blur = el.blur ?? 0;
    const fill = parsePaint(el);

    let shadow: SaraswatiShadow | null = null;
    if (el.shadow) {
      shadow = {
        blur: el.shadow.blur ?? 0,
        offsetX: el.shadow.offsetX ?? 0,
        offsetY: el.shadow.offsetY ?? 0,
        colorHex: el.shadow.color ?? "#000000",
        opacityPct: el.shadow.opacity ?? 100,
      };
    }

    const node = buildElementNode(el, {
      id,
      rootId,
      name,
      x,
      y,
      width,
      height,
      rotation,
      opacity,
      blur,
      fill,
      shadow,
    });

    if (node) {
      const anyNode = node as LooseRecord;
      commands.push({ type: "ADD_NODE", node });
      created.push({
        id: node.id,
        name: node.name,
        type: node.type,
        bounds: {
          left: anyNode.x,
          top: anyNode.y,
          width: anyNode.width ?? 0,
          height: anyNode.height ?? 0,
        },
      });
    }
  }

  return { commands, created };
}

function baseNodeFields(input: {
  id: string;
  rootId: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  shadow: SaraswatiShadow | null;
  blur: number;
}) {
  return {
    id: input.id,
    parentId: input.rootId,
    name: input.name,
    visible: true,
    x: input.x,
    y: input.y,
    rotation: input.rotation,
    scaleX: 1,
    scaleY: 1,
    opacity: input.opacity,
    originX: "left" as const,
    originY: "top" as const,
    shadow: input.shadow,
    blur: input.blur,
  };
}

function buildElementNode(
  el: LooseRecord,
  input: {
    id: string;
    rootId: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    blur: number;
    fill: SaraswatiColor;
    shadow: SaraswatiShadow | null;
  },
): SaraswatiNode | null {
  const stroke = el.stroke ? parseColor(el.stroke) : null;
  const strokeWidth = el.strokeWidth ?? 0;

  if (el.type === "rect") {
    return {
      ...baseNodeFields(input),
      type: "rect",
      width: input.width,
      height: input.height,
      radiusX: el.cornerRadius ?? el.radius ?? 0,
      radiusY: el.cornerRadius ?? el.radius ?? 0,
      fill: input.fill,
      stroke,
      strokeWidth,
    };
  }
  if (el.type === "circle" || el.type === "ellipse") {
    return {
      ...baseNodeFields(input),
      type: "ellipse",
      width: input.width,
      height: input.height,
      fill: input.fill,
      stroke,
      strokeWidth,
    };
  }
  if (el.type === "polygon") {
    return {
      ...baseNodeFields(input),
      type: "polygon",
      width: input.width,
      height: input.height,
      points: regularPolygonPoints(el.sides || 5, input.width / 2),
      fill: input.fill,
      stroke,
      strokeWidth,
    };
  }
  if (el.type === "star") {
    return {
      ...baseNodeFields(input),
      type: "polygon",
      width: input.width,
      height: input.height,
      points: starPolygonPoints(el.sides || 5, input.width / 2),
      fill: input.fill,
      stroke,
      strokeWidth,
    };
  }
  if (el.type === "line") {
    const lineStroke = el.stroke ?? el.fill ?? el.color ?? "#000000";
    return {
      ...baseNodeFields(input),
      type: "line",
      x: 0,
      y: 0,
      rotation: 0,
      x1: el.x1 ?? input.x,
      y1: el.y1 ?? input.y,
      x2: el.x2 ?? input.x + input.width,
      y2: el.y2 ?? input.y,
      stroke: parsePaint({
        fill: lineStroke,
        gradientStops: el.gradientStops,
        gradientAngle: el.gradientAngle,
      }),
      strokeWidth: el.strokeWidth ?? 2,
      arrowStart: false,
      arrowEnd: false,
      lineStyle: "solid",
      pathType: "straight",
      curveBulge: 0,
      curveT: 0.5,
    };
  }
  if (el.type === "text") {
    return {
      ...baseNodeFields(input),
      type: "text",
      text: el.text || "Text",
      width: input.width,
      fontSize: el.fontSize ?? 40,
      fontFamily: el.fontFamily ?? "Inter",
      fontWeight: normalizeFontWeight(el.fontWeight),
      fontStyle: normalizeFontStyle(el.fontStyle),
      textAlign: normalizeTextAlign(el.textAlign),
      lineHeight: el.lineHeight ?? 1.2,
      underline: Boolean(el.underline ?? false),
      color: input.fill,
      stroke,
      strokeWidth,
    };
  }
  if (el.type === "image" && el.url) {
    return {
      ...baseNodeFields(input),
      type: "image",
      width: input.width,
      height: input.height,
      src: el.url,
      cropX: 0,
      cropY: 0,
      clipPath: null,
      borderRadius: el.cornerRadius ?? el.radius ?? 0,
    };
  }
  if (el.type === "sticker" && el.stickerName) {
    return {
      ...baseNodeFields(input),
      type: "image",
      name: `Sticker: ${el.stickerName}`,
      width: input.width || 160,
      height: input.height || 160,
      src: `/stickers/${el.stickerName}.webp`,
      cropX: 0,
      cropY: 0,
      clipPath: null,
    };
  }
  return null;
}

// ─── modify_elements ──────────────────────────────────────────────────────────

/**
 * Convert modify_elements modification specs into engine commands.
 * Returns the commands plus the count of specs whose objectId existed.
 */
export function buildModifyElementsCommands(
  scene: SaraswatiScene,
  modifications: unknown[],
): { commands: SaraswatiCommand[]; modifiedCount: number } {
  const commands: SaraswatiCommand[] = [];
  let modifiedCount = 0;

  for (const raw of modifications) {
    const mod = (raw ?? {}) as LooseRecord;
    const node = scene.nodes[mod.objectId];
    if (!node) continue;
    modifiedCount++;
    const anyNode = node as LooseRecord;

    const newX = mod.x ?? mod.left;
    const newY = mod.y ?? mod.top;
    if (newX !== undefined || newY !== undefined || mod.width !== undefined || mod.height !== undefined) {
      commands.push({
        type: "RESIZE_NODE",
        id: mod.objectId,
        x: newX ?? ("x" in node ? anyNode.x : 0),
        y: newY ?? ("y" in node ? anyNode.y : 0),
        width: mod.width ?? ("width" in node ? anyNode.width : 100),
        height: mod.height ?? ("height" in node ? anyNode.height : 100),
      });
    }

    const rot = mod.rotation ?? mod.angle;
    if (rot !== undefined) {
      commands.push({ type: "ROTATE_NODE", id: mod.objectId, rotation: rot });
    }

    if (mod.opacity !== undefined) {
      commands.push({ type: "SET_NODE_OPACITY", id: mod.objectId, opacity: mod.opacity });
    }

    const hasPaintFields =
      mod.fill !== undefined ||
      mod.color !== undefined ||
      mod.gradientStops !== undefined ||
      mod.gradientAngle !== undefined;
    let pendingPaint: SaraswatiColor | null = null;
    let lineStrokeDone = false;
    if (hasPaintFields) {
      const currentPaint =
        node.type === "text"
          ? anyNode.color
          : node.type === "line"
            ? anyNode.stroke
            : anyNode.fill;
      pendingPaint = resolveModifyPaint(mod, currentPaint);
      if (pendingPaint) {
        if (node.type === "text") {
          // Applied via SET_TEXT_FORMAT below.
        } else if (node.type === "line") {
          commands.push({
            type: "SET_NODE_STROKE",
            id: mod.objectId,
            stroke: pendingPaint,
            strokeWidth: mod.strokeWidth ?? anyNode.strokeWidth ?? 2,
          });
          pendingPaint = null;
          lineStrokeDone = true;
        } else if (node.type !== "image" && node.type !== "group") {
          commands.push({ type: "SET_NODE_FILL", id: mod.objectId, fill: pendingPaint });
          pendingPaint = null;
        } else {
          pendingPaint = null;
        }
      }
    }

    const rad = mod.cornerRadius ?? mod.radius;
    if (rad !== undefined) {
      if (node.type === "rect") {
        commands.push({
          type: "SET_NODE_CORNER_RADIUS",
          id: mod.objectId,
          radiusX: rad,
          radiusY: rad,
        });
      } else if (node.type === "image") {
        commands.push({
          type: "SET_IMAGE_BORDER_RADIUS",
          id: mod.objectId,
          radius: rad,
        });
      }
    }

    if (mod.shadow) {
      commands.push({
        type: "SET_NODE_SHADOW",
        id: mod.objectId,
        shadow: {
          blur: mod.shadow.blur ?? 0,
          offsetX: mod.shadow.offsetX ?? 0,
          offsetY: mod.shadow.offsetY ?? 0,
          colorHex: mod.shadow.color ?? "#000000",
          opacityPct: mod.shadow.opacity ?? 100,
        },
      });
    }

    if (mod.blur !== undefined) {
      commands.push({ type: "SET_NODE_BLUR", id: mod.objectId, blur: mod.blur });
    }

    if (mod.text !== undefined && node.type === "text") {
      commands.push({ type: "SET_TEXT_CONTENT", id: mod.objectId, text: mod.text });
    }

    if (node.type === "text") {
      const formatPatch: LooseRecord = {};
      if (mod.fontSize !== undefined) formatPatch.fontSize = mod.fontSize;
      if (mod.fontFamily !== undefined) formatPatch.fontFamily = mod.fontFamily;
      if (mod.fontWeight !== undefined) formatPatch.fontWeight = normalizeFontWeight(mod.fontWeight);
      if (mod.fontStyle !== undefined) formatPatch.fontStyle = normalizeFontStyle(mod.fontStyle);
      if (mod.textAlign !== undefined) formatPatch.textAlign = normalizeTextAlign(mod.textAlign);
      if (mod.lineHeight !== undefined) formatPatch.lineHeight = mod.lineHeight;
      if (mod.underline !== undefined) formatPatch.underline = Boolean(mod.underline);
      if (pendingPaint) {
        formatPatch.color = pendingPaint;
        pendingPaint = null;
      } else if (mod.color !== undefined || mod.fill !== undefined) {
        formatPatch.color = parseColor(mod.color ?? mod.fill);
      }
      if (Object.keys(formatPatch).length > 0) {
        commands.push({
          type: "SET_TEXT_FORMAT",
          id: mod.objectId,
          ...formatPatch,
        } as SaraswatiCommand);
      }
      if (mod.stroke !== undefined || mod.strokeWidth !== undefined) {
        commands.push({
          type: "SET_NODE_STROKE",
          id: mod.objectId,
          stroke: mod.stroke ? parseColor(mod.stroke) : anyNode.stroke ?? null,
          strokeWidth: mod.strokeWidth ?? anyNode.strokeWidth ?? 0,
        });
      }
    } else if (mod.stroke !== undefined || mod.strokeWidth !== undefined) {
      if (lineStrokeDone) {
        // Gradient stroke already applied above (includes strokeWidth fallback) — skip duplicate.
      } else if (node.type !== "group" && node.type !== "image") {
        commands.push({
          type: "SET_NODE_STROKE",
          id: mod.objectId,
          stroke: mod.stroke ? parseColor(mod.stroke) : anyNode.stroke ?? null,
          strokeWidth: mod.strokeWidth ?? anyNode.strokeWidth ?? 0,
        });
      }
    }

    if (mod.name !== undefined) {
      commands.push({ type: "SET_NODE_NAME", id: mod.objectId, name: mod.name });
    }
  }

  return { commands, modifiedCount };
}

// ─── bounds helpers ───────────────────────────────────────────────────────────

function plainBounds(node: SaraswatiNode): RectBounds {
  const anyNode = node as LooseRecord;
  return {
    x: "x" in node ? anyNode.x : 0,
    y: "y" in node ? anyNode.y : 0,
    width: "width" in node ? anyNode.width : 0,
    height: "height" in node ? anyNode.height : 0,
  };
}

/**
 * Visual bounds for alignment: recurses into groups and measures top-level
 * lines by their endpoint extent. Children inside groups are measured by
 * their plain x/y/width/height fields, matching the original listener
 * behavior. Returns null when a group has no measurable descendants.
 */
function alignBounds(scene: SaraswatiScene, id: string): RectBounds | null {
  const node = scene.nodes[id];
  if (!node) return null;
  if (node.type === "group") {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const stack = [...(node as LooseRecord).children as string[]];
    while (stack.length > 0) {
      const child = scene.nodes[stack.pop()!];
      if (!child) continue;
      if (child.type === "group") {
        stack.push(...((child as LooseRecord).children as string[]));
        continue;
      }
      const b = plainBounds(child);
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
    }
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  if (node.type === "line") return lineBounds(node);
  return plainBounds(node);
}

function lineBounds(node: SaraswatiNode): RectBounds {
  const anyNode = node as LooseRecord;
  return {
    x: Math.min(anyNode.x1, anyNode.x2),
    y: Math.min(anyNode.y1, anyNode.y2),
    width: Math.abs(anyNode.x2 - anyNode.x1),
    height: Math.abs(anyNode.y2 - anyNode.y1),
  };
}

// ─── align_objects ────────────────────────────────────────────────────────────

/**
 * Compute MOVE_NODE commands that align the given objects by `kind`
 * (left/centerH/right/top/centerV/bottom). A single object aligns to the
 * artboard; multiple objects align to each other's union bounds.
 */
export function buildAlignCommands(
  scene: SaraswatiScene,
  selectedIds: string[],
  kind: string,
): { commands: SaraswatiCommand[]; alignedCount: number } {
  const entries = selectedIds
    .map((id) => ({ id, bounds: alignBounds(scene, id) }))
    .filter((e): e is { id: string; bounds: RectBounds } => e.bounds != null);
  if (entries.length === 0) {
    return { commands: [], alignedCount: 0 };
  }

  const commands: SaraswatiCommand[] = [];
  if (entries.length === 1) {
    const b = entries[0]!.bounds;
    let dx = 0, dy = 0;
    if (kind === "left") dx = -b.x;
    if (kind === "centerH") dx = scene.artboard.width / 2 - (b.x + b.width / 2);
    if (kind === "right") dx = scene.artboard.width - (b.x + b.width);
    if (kind === "top") dy = -b.y;
    if (kind === "centerV") dy = scene.artboard.height / 2 - (b.y + b.height / 2);
    if (kind === "bottom") dy = scene.artboard.height - (b.y + b.height);
    if (dx !== 0 || dy !== 0) commands.push({ type: "MOVE_NODE", id: entries[0]!.id, dx, dy });
  } else {
    const xs = entries.map((e) => e.bounds.x);
    const ys = entries.map((e) => e.bounds.y);
    const x2s = entries.map((e) => e.bounds.x + e.bounds.width);
    const y2s = entries.map((e) => e.bounds.y + e.bounds.height);
    const ux = Math.min(...xs), uy = Math.min(...ys);
    const ux2 = Math.max(...x2s), uy2 = Math.max(...y2s);
    for (const e of entries) {
      let dx = 0, dy = 0;
      if (kind === "left") dx = ux - e.bounds.x;
      if (kind === "centerH") dx = ux + (ux2 - ux) / 2 - (e.bounds.x + e.bounds.width / 2);
      if (kind === "right") dx = ux2 - (e.bounds.x + e.bounds.width);
      if (kind === "top") dy = uy - e.bounds.y;
      if (kind === "centerV") dy = uy + (uy2 - uy) / 2 - (e.bounds.y + e.bounds.height / 2);
      if (kind === "bottom") dy = uy2 - (e.bounds.y + e.bounds.height);
      if (dx !== 0 || dy !== 0) commands.push({ type: "MOVE_NODE", id: e.id, dx, dy });
    }
  }

  return { commands, alignedCount: entries.length };
}

// ─── distribute_objects ───────────────────────────────────────────────────────

/**
 * Compute MOVE_NODE commands that distribute the given objects evenly
 * (by center) between the outermost two along the given direction. The
 * first and last objects in the direction's order stay put.
 */
export function buildDistributeCommands(
  scene: SaraswatiScene,
  selectedIds: string[],
  direction: "horizontal" | "vertical",
): { commands: SaraswatiCommand[] } {
  const entries = selectedIds
    .map((id) => ({ id, bounds: plainBounds(scene.nodes[id]!) }))
    .filter((e) => e.bounds != null);
  const sorted = [...entries].sort((a, b) => direction === "horizontal"
    ? a.bounds.x + a.bounds.width / 2 - (b.bounds.x + b.bounds.width / 2)
    : a.bounds.y + a.bounds.height / 2 - (b.bounds.y + b.bounds.height / 2));
  const first = sorted[0]!.bounds;
  const last = sorted[sorted.length - 1]!.bounds;
  const startCenter = direction === "horizontal" ? first.x + first.width / 2 : first.y + first.height / 2;
  const endCenter = direction === "horizontal" ? last.x + last.width / 2 : last.y + last.height / 2;
  const step = (endCenter - startCenter) / (sorted.length - 1);
  const commands: SaraswatiCommand[] = [];
  sorted.forEach((entry, index) => {
    if (index === 0 || index === sorted.length - 1) return;
    const targetCenter = startCenter + step * index;
    if (direction === "horizontal") {
      const currentCenter = entry.bounds.x + entry.bounds.width / 2;
      const dx = targetCenter - currentCenter;
      if (dx !== 0) commands.push({ type: "MOVE_NODE", id: entry.id, dx, dy: 0 });
    } else {
      const currentCenter = entry.bounds.y + entry.bounds.height / 2;
      const dy = targetCenter - currentCenter;
      if (dy !== 0) commands.push({ type: "MOVE_NODE", id: entry.id, dx: 0, dy });
    }
  });
  return { commands };
}

// ─── fit_to_artboard ──────────────────────────────────────────────────────────

/**
 * Compute RESIZE_NODE commands that fit the given objects inside the
 * artboard with `padding` on every side, preserving relative layout.
 * Group and line nodes are skipped (they are not directly resizable here).
 */
export function buildFitToArtboardCommands(
  scene: SaraswatiScene,
  selectedIds: string[],
  padding: number,
): { commands: SaraswatiCommand[] } {
  const targetW = Math.max(1, scene.artboard.width - padding * 2);
  const targetH = Math.max(1, scene.artboard.height - padding * 2);
  const targetX = padding;
  const targetY = padding;
  const commands: SaraswatiCommand[] = [];

  if (selectedIds.length === 1) {
    const id = selectedIds[0]!;
    commands.push({ type: "RESIZE_NODE", id, x: targetX, y: targetY, width: targetW, height: targetH });
    return { commands };
  }

  const boxes = selectedIds.map((id) => {
    const b = plainBounds(scene.nodes[id]!);
    return { id, box: { x: b.x, y: b.y, width: Math.max(1, b.width), height: Math.max(1, b.height) } };
  });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.box.x); minY = Math.min(minY, b.box.y);
    maxX = Math.max(maxX, b.box.x + b.box.width); maxY = Math.max(maxY, b.box.y + b.box.height);
  }
  const srcW = Math.max(1, maxX - minX), srcH = Math.max(1, maxY - minY);
  const s = Math.min(targetW / srcW, targetH / srcH);
  const offsetX = targetX + (targetW - srcW * s) / 2 - minX * s;
  const offsetY = targetY + (targetH - srcH * s) / 2 - minY * s;
  for (const b of boxes) {
    const node = scene.nodes[b.id]!;
    if (node.type === "group" || node.type === "line") continue;
    commands.push({
      type: "RESIZE_NODE",
      id: b.id,
      x: b.box.x * s + offsetX,
      y: b.box.y * s + offsetY,
      width: Math.max(1, b.box.width * s),
      height: Math.max(1, b.box.height * s),
    });
  }
  return { commands };
}

// ─── clear_canvas ─────────────────────────────────────────────────────────────

/** DELETE_NODE commands for every non-root node in the scene. */
export function buildClearCanvasCommands(scene: SaraswatiScene): SaraswatiCommand[] {
  return Object.values(scene.nodes)
    .filter((n) => n.id !== scene.root)
    .map((n) => ({ type: "DELETE_NODE" as const, id: n.id }));
}
