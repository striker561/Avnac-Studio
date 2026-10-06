/**
 * Pure scene → read-only response builders for MCP query tools
 * (get_canvas_summary, list_objects, get_selection). No store or Wails
 * access — the orchestration layer submits these via SubmitResponse.
 */

import type { SaraswatiScene } from "@/lib/saraswati";

type LooseRecord = Record<string, any>;

/** Summarized artboard + node list for get_canvas_summary. */
export function buildCanvasSummary(scene: SaraswatiScene): {
  artboard: SaraswatiScene["artboard"];
  nodes: LooseRecord[];
} {
  const nodes = Object.values(scene.nodes)
    .filter((n) => n.id !== scene.root)
    .map((n) => {
      const anyNode = n as LooseRecord;
      return {
        id: n.id,
        name: n.name,
        type: n.type,
        visible: n.visible,
        x: "x" in n ? anyNode.x : 0,
        y: "y" in n ? anyNode.y : 0,
        width: "width" in n ? anyNode.width : 0,
        height: "height" in n ? anyNode.height : 0,
        rotation: "rotation" in n ? anyNode.rotation : 0,
        opacity: n.opacity,
        fill: "fill" in n ? anyNode.fill : undefined,
        stroke: "stroke" in n ? anyNode.stroke : undefined,
        text: "text" in n ? anyNode.text : undefined,
      };
    });
  return { artboard: scene.artboard, nodes };
}

/** Flat object list for list_objects. */
export function buildObjectList(scene: SaraswatiScene): LooseRecord[] {
  return Object.values(scene.nodes)
    .filter((n) => n.id !== scene.root)
    .map((n) => {
      const anyNode = n as LooseRecord;
      return {
        id: n.id,
        name: anyNode.name,
        type: n.type,
        visible: n.visible,
        parentId: anyNode.parentId ?? null,
        x: "x" in n ? anyNode.x : undefined,
        y: "y" in n ? anyNode.y : undefined,
        width: "width" in n ? anyNode.width : undefined,
        height: "height" in n ? anyNode.height : undefined,
        rotation: "rotation" in n ? anyNode.rotation : undefined,
        opacity: anyNode.opacity,
        text: "text" in n ? anyNode.text : undefined,
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
      const node = n as LooseRecord;
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        visible: node.visible,
        x: "x" in node ? node.x : undefined,
        y: "y" in node ? node.y : undefined,
        width: "width" in node ? node.width : undefined,
        height: "height" in node ? node.height : undefined,
      };
    });
  return { selectedIds, objects };
}
