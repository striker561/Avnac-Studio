/**
 * Pure scene → read-only response builders for MCP query tools
 * (get_canvas_summary, list_objects, get_selection). No store or Wails
 * access — the orchestration layer submits these via SubmitResponse.
 */

import {
  getNodeBounds,
  type SaraswatiNode,
  type SaraswatiScene,
} from "@/lib/saraswati";
import { getRenderableNodeBounds } from "@/lib/editor/overlays";

type LooseRecord = Record<string, any>;

/** One photographer credit, with every node that uses the photo. */
export type CanvasCredit = {
  photoId: string;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  text: string;
  nodeIds: string[];
};

type BoundsReport = { x: number; y: number; width: number; height: number };

const NO_BOUNDS: BoundsReport = { x: 0, y: 0, width: 0, height: 0 };

/**
 * Optional real text measurement, supplied by the orchestration layer.
 *
 * Text nodes carry no height: getNodeBounds estimates it from a 0.5em average
 * glyph width. That estimate is wider than most UI faces' real advance, so text
 * whose box is its own measured natural width (exactly what MCP's
 * render_elements stores) was reported as two lines. When a measurer is supplied,
 * the summary uses the same layout the renderer draws, and the number agrees with
 * the bounds render_elements returned.
 */
export type TextBoxMeasurer = (
  node: Extract<SaraswatiNode, { type: "text" }>,
) => { width: number; height: number } | null;

/**
 * Bounds for a read-only response, from the engine rather than raw fields.
 *
 * Text nodes have no height field at all — height is derived from the wrapped
 * text — so reading node.width / node.height reported `height: 0` for every
 * text element, which made the canvas unreadable to an agent trying to lay
 * out around it. Groups report the union of their descendants (null for an
 * invisible node, which still carries `visible` in the response).
 */
function boundsOf(
  scene: SaraswatiScene,
  node: SaraswatiNode,
  measureText?: TextBoxMeasurer,
): BoundsReport {
  if (node.type === "text" && measureText && !node.rotation) {
    const box = measureText(node);
    if (box) {
      const width = Math.abs(box.width * node.scaleX);
      const height = Math.abs(box.height * node.scaleY);
      const x =
        node.originX === "center"
          ? node.x - width / 2
          : node.originX === "right"
            ? node.x - width
            : node.x;
      const y =
        node.originY === "center"
          ? node.y - height / 2
          : node.originY === "bottom"
            ? node.y - height
            : node.y;
      return { x, y, width, height };
    }
  }
  const bounds =
    node.type === "group"
      ? getRenderableNodeBounds(scene, node.id)
      : getNodeBounds(node);
  return bounds ?? NO_BOUNDS;
}

/** Credit line for an image node, or undefined when it is not a stock photo. */
function creditTextOf(node: SaraswatiNode): string | undefined {
  const credit = (node as LooseRecord).credit;
  return typeof credit?.text === "string" && credit.text.trim()
    ? credit.text.trim()
    : undefined;
}

/**
 * Every distinct stock-photo credit in the scene.
 *
 * Unsplash requires the photographer and Unsplash to be credited wherever a
 * photo is used, so the summary names them explicitly instead of leaving the
 * agent to dig through node metadata.
 */
export function collectCredits(scene: SaraswatiScene): CanvasCredit[] {
  const byPhoto = new Map<string, CanvasCredit>();
  for (const node of Object.values(scene.nodes)) {
    if (node.id === scene.root) continue;
    const credit = (node as LooseRecord).credit;
    if (!credit || typeof credit.text !== "string" || !credit.text.trim()) {
      continue;
    }
    const key =
      typeof credit.photoId === "string" && credit.photoId
        ? credit.photoId
        : credit.text;
    const existing = byPhoto.get(key);
    if (existing) {
      existing.nodeIds.push(node.id);
      continue;
    }
    byPhoto.set(key, {
      photoId: typeof credit.photoId === "string" ? credit.photoId : "",
      photographer:
        typeof credit.photographer === "string" ? credit.photographer : "",
      photographerUrl:
        typeof credit.photographerUrl === "string"
          ? credit.photographerUrl
          : "",
      photoUrl: typeof credit.photoUrl === "string" ? credit.photoUrl : "",
      text: credit.text.trim(),
      nodeIds: [node.id],
    });
  }
  return [...byPhoto.values()];
}

/** Summarized artboard + node list for get_canvas_summary. */
export function buildCanvasSummary(
  scene: SaraswatiScene,
  measureText?: TextBoxMeasurer,
): {
  artboard: SaraswatiScene["artboard"];
  nodes: LooseRecord[];
  credits: CanvasCredit[];
} {
  const nodes = Object.values(scene.nodes)
    .filter((n) => n.id !== scene.root)
    .map((n) => {
      const anyNode = n as LooseRecord;
      const bounds = boundsOf(scene, n, measureText);
      return {
        id: n.id,
        name: n.name,
        type: n.type,
        visible: n.visible,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: "rotation" in n ? anyNode.rotation : 0,
        opacity: n.opacity,
        fill: "fill" in n ? anyNode.fill : undefined,
        stroke: "stroke" in n ? anyNode.stroke : undefined,
        text: "text" in n ? anyNode.text : undefined,
        credit: creditTextOf(n),
      };
    });
  return { artboard: scene.artboard, nodes, credits: collectCredits(scene) };
}

/** Flat object list for list_objects. */
export function buildObjectList(scene: SaraswatiScene): LooseRecord[] {
  return Object.values(scene.nodes)
    .filter((n) => n.id !== scene.root)
    .map((n) => {
      const anyNode = n as LooseRecord;
      const bounds = boundsOf(scene, n);
      return {
        id: n.id,
        name: anyNode.name,
        type: n.type,
        visible: n.visible,
        parentId: anyNode.parentId ?? null,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: "rotation" in n ? anyNode.rotation : undefined,
        opacity: anyNode.opacity,
        text: "text" in n ? anyNode.text : undefined,
        credit: creditTextOf(n),
      };
    });
}

/** Selection detail for get_selection. */
export function buildSelectionSummary(
  scene: SaraswatiScene,
  selectedIds: string[],
): { selectedIds: string[]; objects: LooseRecord[] } {
  const objects = selectedIds
    .map((id) => scene.nodes[id])
    .filter(Boolean)
    .map((n) => {
      const node = n as SaraswatiNode;
      const bounds = boundsOf(scene, node);
      return {
        id: node.id,
        name: (node as LooseRecord).name,
        type: node.type,
        visible: node.visible,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    });
  return { selectedIds, objects };
}
