import { useMemo } from "react";
import type { CanvasAlignKind } from "@/components/editor/canvas/canvas-selection-toolbar";
import {
  isSaraswatiRenderableNode,
  type SaraswatiNode,
  type SaraswatiRenderableNode,
} from "@/lib/saraswati";
import { getRenderableNodeBounds } from "@/lib/editor/overlays";
import { getNodeBounds } from "@/lib/saraswati/spatial";
import { buildGroupSelectionCommands } from "@/scene/workspace";
import { useSceneEditorStore } from "./store";
import {
  exportSelectionAsPng,
  exportSelectionAsSvg,
} from "@/lib/avnac-selection-export";

const sceneClipboard: SaraswatiNode[] = [];
const PASTE_OFFSET = 16;

// ─── Group helpers ────────────────────────────────────────────────────────────

/**
 * Recursively builds a map of old-id → new-id for every node in a subtree.
 * Each call to this function produces fresh UUIDs.
 */
function buildSubtreeIdMap(
  nodes: Record<string, SaraswatiNode>,
  nodeId: string,
  map: Map<string, string> = new Map(),
): Map<string, string> {
  const node = nodes[nodeId];
  if (!node) return map;
  map.set(nodeId, crypto.randomUUID());
  if (node.type === "group") {
    for (const childId of node.children) buildSubtreeIdMap(nodes, childId, map);
  }
  return map;
}

/**
 * Build ADD_NODE commands to deep-clone an entire subtree with new IDs.
 * Groups appear before their children so the reducer can parent them correctly.
 */
function buildDeepDuplicateCommands(
  nodes: Record<string, SaraswatiNode>,
  nodeId: string,
  idMap: Map<string, string>,
  dx: number,
  dy: number,
): { type: "ADD_NODE"; node: SaraswatiNode }[] {
  const node = nodes[nodeId];
  if (!node) return [];
  const newId = idMap.get(nodeId)!;
  // Use the mapped parent ID so children land inside the new group, not the old one.
  const newParentId =
    node.parentId && idMap.has(node.parentId)
      ? idMap.get(node.parentId)!
      : node.parentId;
  const commands: { type: "ADD_NODE"; node: SaraswatiNode }[] = [];
  if (node.type === "group") {
    // Add the group shell first (empty children array — addNode fills it as children are added).
    commands.push({
      type: "ADD_NODE",
      node: { ...node, id: newId, parentId: newParentId, children: [] },
    });
    for (const childId of node.children) {
      commands.push(
        ...buildDeepDuplicateCommands(nodes, childId, idMap, dx, dy),
      );
    }
  } else {
    const moved = cloneNode(node, newId, dx, dy);
    commands.push({
      type: "ADD_NODE",
      node: { ...moved, parentId: newParentId },
    });
  }
  return commands;
}

/** Collect all renderable leaf nodes under a group, recursively. */
function collectGroupDescendants(
  nodes: Record<string, SaraswatiNode>,
  nodeId: string,
  result: SaraswatiRenderableNode[] = [],
): SaraswatiRenderableNode[] {
  const node = nodes[nodeId];
  if (!node) return result;
  if (node.type === "group") {
    for (const childId of node.children)
      collectGroupDescendants(nodes, childId, result);
  } else if (isSaraswatiRenderableNode(node)) {
    result.push(node);
  }
  return result;
}

/**
 * Flip a single renderable node around a pivot axis, mirroring its anchor
 * position and negating its scale so the visual is also reflected.
 */
function flipRenderableAroundPivot(
  node: SaraswatiRenderableNode,
  axis: "x" | "y",
  pivotX: number,
  pivotY: number,
): SaraswatiNode {
  if (node.type === "line") {
    if (axis === "x")
      return { ...node, x1: 2 * pivotX - node.x1, x2: 2 * pivotX - node.x2 };
    return { ...node, y1: 2 * pivotY - node.y1, y2: 2 * pivotY - node.y2 };
  }
  const scaledHalfW = Math.abs(node.width * node.scaleX) / 2;
  const rawH =
    node.type === "text"
      ? node.fontSize * Math.max(1, node.lineHeight)
      : (node as { height: number }).height;
  const scaledHalfH = Math.abs(rawH * node.scaleY) / 2;
  if (axis === "x") {
    const cx =
      node.originX === "center"
        ? node.x
        : node.originX === "right"
          ? node.x - scaledHalfW
          : node.x + scaledHalfW;
    const newCx = 2 * pivotX - cx;
    const newX =
      node.originX === "center"
        ? newCx
        : node.originX === "right"
          ? newCx + scaledHalfW
          : newCx - scaledHalfW;
    return { ...node, x: newX, scaleX: -node.scaleX } as SaraswatiNode;
  }
  const cy =
    node.originY === "center"
      ? node.y
      : node.originY === "bottom"
        ? node.y - scaledHalfH
        : node.y + scaledHalfH;
  const newCy = 2 * pivotY - cy;
  const newY =
    node.originY === "center"
      ? newCy
      : node.originY === "bottom"
        ? newCy + scaledHalfH
        : newCy - scaledHalfH;
  return { ...node, y: newY, scaleY: -node.scaleY } as SaraswatiNode;
}

type SelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function cloneNode(
  node: SaraswatiNode,
  newId: string,
  dx: number,
  dy: number,
): SaraswatiNode {
  if (node.type === "line") {
    return {
      ...node,
      id: newId,
      x1: node.x1 + dx,
      y1: node.y1 + dy,
      x2: node.x2 + dx,
      y2: node.y2 + dy,
    };
  }
  if (node.type === "group") {
    return { ...node, id: newId, children: [] };
  }
  return {
    ...(node as Extract<SaraswatiNode, { x: number }>),
    id: newId,
    x: node.x + dx,
    y: node.y + dy,
  } as SaraswatiNode;
}

function moveNode(node: SaraswatiNode, dx: number, dy: number): SaraswatiNode {
  if (node.type === "line") {
    return {
      ...node,
      x1: node.x1 + dx,
      y1: node.y1 + dy,
      x2: node.x2 + dx,
      y2: node.y2 + dy,
    };
  }
  if (node.type === "group") return node;
  return {
    ...(node as Extract<SaraswatiNode, { x: number }>),
    x: node.x + dx,
    y: node.y + dy,
  } as SaraswatiNode;
}

function flipNode(node: SaraswatiNode, axis: "x" | "y"): SaraswatiNode {
  if (node.type === "group") return node;
  if (node.type === "line") {
    const centerX = (node.x1 + node.x2) / 2;
    const centerY = (node.y1 + node.y2) / 2;
    if (axis === "x") {
      return {
        ...node,
        x1: centerX - (node.x1 - centerX),
        x2: centerX - (node.x2 - centerX),
      };
    }
    return {
      ...node,
      y1: centerY - (node.y1 - centerY),
      y2: centerY - (node.y2 - centerY),
    };
  }
  if (axis === "x") {
    return { ...node, scaleX: -node.scaleX } as SaraswatiNode;
  }
  return { ...node, scaleY: -node.scaleY } as SaraswatiNode;
}

export function useSceneSelectionActions() {
  const scene = useSceneEditorStore((s) => s.scene);
  const selectedIds = useSceneEditorStore((s) => s.selectedIds);
  const lockedIds = useSceneEditorStore((s) => s.lockedIds);
  const applyCommands = useSceneEditorStore((s) => s.applyCommands);
  const setSelectedIds = useSceneEditorStore((s) => s.setSelectedIds);
  const toggleLockedSelection = useSceneEditorStore(
    (s) => s.toggleLockedSelection,
  );

  const lockedSet = useMemo(() => new Set(lockedIds), [lockedIds]);

  const selectionBounds = useMemo<SelectionBounds | null>(() => {
    if (!scene || selectedIds.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of selectedIds) {
      const bounds = getRenderableNodeBounds(scene, id);
      if (!bounds) continue;
      if (bounds.x < minX) minX = bounds.x;
      if (bounds.y < minY) minY = bounds.y;
      if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
      if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
    }
    if (!isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [scene, selectedIds]);

  const groupCommands = useMemo(() => {
    if (!scene) return [];
    return buildGroupSelectionCommands(scene, selectedIds, "__preview__");
  }, [scene, selectedIds]);

  const canGroup = groupCommands.length > 0;
  const canUngroup =
    selectedIds.length === 1 &&
    !!scene?.nodes[selectedIds[0]!] &&
    scene.nodes[selectedIds[0]!]!.type === "group";
  const isLocked =
    selectedIds.length > 0 && selectedIds.every((id) => lockedSet.has(id));

  const alignAlreadySatisfied: Record<CanvasAlignKind, boolean> =
    selectionBounds && scene
      ? {
          left: selectionBounds.x < 0.5,
          centerH:
            Math.abs(
              selectionBounds.x +
                selectionBounds.width / 2 -
                scene.artboard.width / 2,
            ) < 0.5,
          right:
            Math.abs(
              selectionBounds.x + selectionBounds.width - scene.artboard.width,
            ) < 0.5,
          top: selectionBounds.y < 0.5,
          centerV:
            Math.abs(
              selectionBounds.y +
                selectionBounds.height / 2 -
                scene.artboard.height / 2,
            ) < 0.5,
          bottom:
            Math.abs(
              selectionBounds.y +
                selectionBounds.height -
                scene.artboard.height,
            ) < 0.5,
        }
      : {
          left: false,
          centerH: false,
          right: false,
          top: false,
          centerV: false,
          bottom: false,
        };

  const onDuplicate = () => {
    if (!scene || selectedIds.length === 0) return;
    const commands: { type: "ADD_NODE"; node: SaraswatiNode }[] = [];
    const newIds: string[] = [];
    for (const id of selectedIds) {
      const node = scene.nodes[id];
      if (!node) continue;
      if (node.type === "group") {
        const idMap = buildSubtreeIdMap(scene.nodes, id);
        const newGroupId = idMap.get(id)!;
        newIds.push(newGroupId);
        commands.push(
          ...buildDeepDuplicateCommands(
            scene.nodes,
            id,
            idMap,
            PASTE_OFFSET,
            PASTE_OFFSET,
          ),
        );
      } else {
        const nextId = crypto.randomUUID();
        newIds.push(nextId);
        commands.push({
          type: "ADD_NODE",
          node: cloneNode(node, nextId, PASTE_OFFSET, PASTE_OFFSET),
        });
      }
    }
    if (commands.length === 0) return;
    applyCommands(commands);
    setSelectedIds(newIds);
  };

  const onCopy = () => {
    if (!scene) return;
    sceneClipboard.length = 0;
    for (const id of selectedIds) {
      const node = scene.nodes[id];
      if (node) sceneClipboard.push(node);
    }
  };

  const onPasteAt = (target?: { x: number; y: number }) => {
    if (sceneClipboard.length === 0) return;

    const pastedNodes: SaraswatiNode[] = [];
    for (const node of sceneClipboard) {
      const nextId = crypto.randomUUID();
      pastedNodes.push(cloneNode(node, nextId, PASTE_OFFSET, PASTE_OFFSET));
    }

    let finalNodes = pastedNodes;
    if (target) {
      const renderableBounds = pastedNodes.flatMap((node) => {
        if (!isSaraswatiRenderableNode(node)) return [];
        return [getNodeBounds(node)];
      });

      if (renderableBounds.length > 0) {
        const minX = Math.min(...renderableBounds.map((b) => b.x));
        const minY = Math.min(...renderableBounds.map((b) => b.y));
        const maxX = Math.max(...renderableBounds.map((b) => b.x + b.width));
        const maxY = Math.max(...renderableBounds.map((b) => b.y + b.height));
        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;
        const dx = target.x - centerX;
        const dy = target.y - centerY;
        finalNodes = pastedNodes.map((node) => moveNode(node, dx, dy));
      }
    }

    const commands = finalNodes.map((node) => ({
      type: "ADD_NODE" as const,
      node,
    }));
    const newIds = finalNodes.map((node) => node.id);

    applyCommands(commands);
    setSelectedIds(newIds);
  };

  const onPaste = () => {
    onPasteAt();
  };

  const onFlipH = () => {
    if (!scene) return;
    applyCommands(
      selectedIds.flatMap((id) => {
        const node = scene.nodes[id];
        if (!node) return [];
        if (node.type === "group") {
          const groupBounds = getRenderableNodeBounds(scene, id);
          if (!groupBounds) return [];
          const pivotX = groupBounds.x + groupBounds.width / 2;
          return collectGroupDescendants(scene.nodes, id).map((desc) => ({
            type: "REPLACE_NODE" as const,
            node: flipRenderableAroundPivot(desc, "x", pivotX, 0),
          }));
        }
        return [{ type: "REPLACE_NODE" as const, node: flipNode(node, "x") }];
      }),
    );
  };

  const onFlipV = () => {
    if (!scene) return;
    applyCommands(
      selectedIds.flatMap((id) => {
        const node = scene.nodes[id];
        if (!node) return [];
        if (node.type === "group") {
          const groupBounds = getRenderableNodeBounds(scene, id);
          if (!groupBounds) return [];
          const pivotY = groupBounds.y + groupBounds.height / 2;
          return collectGroupDescendants(scene.nodes, id).map((desc) => ({
            type: "REPLACE_NODE" as const,
            node: flipRenderableAroundPivot(desc, "y", 0, pivotY),
          }));
        }
        return [{ type: "REPLACE_NODE" as const, node: flipNode(node, "y") }];
      }),
    );
  };

  const onAlign = (kind: CanvasAlignKind) => {
    if (!scene || !selectionBounds) return;
    const { width: artW, height: artH } = scene.artboard;
    let dx = 0;
    let dy = 0;
    if (kind === "left") dx = -selectionBounds.x;
    if (kind === "centerH") {
      dx = artW / 2 - (selectionBounds.x + selectionBounds.width / 2);
    }
    if (kind === "right") {
      dx = artW - (selectionBounds.x + selectionBounds.width);
    }
    if (kind === "top") dy = -selectionBounds.y;
    if (kind === "centerV") {
      dy = artH / 2 - (selectionBounds.y + selectionBounds.height / 2);
    }
    if (kind === "bottom") {
      dy = artH - (selectionBounds.y + selectionBounds.height);
    }
    if (dx === 0 && dy === 0) return;
    applyCommands(
      selectedIds.map((id) => ({ type: "MOVE_NODE" as const, id, dx, dy })),
    );
  };

  const onGroup = () => {
    if (!scene || !canGroup) return;
    const groupId = crypto.randomUUID();
    const commands = buildGroupSelectionCommands(scene, selectedIds, groupId);
    if (commands.length === 0) return;
    applyCommands(commands);
    setSelectedIds([groupId]);
  };

  const onAlignElements = (kind: CanvasAlignKind) => {
    if (!scene || selectedIds.length < 2) return;
    const boundsById = selectedIds.flatMap((id) => {
      const node = scene.nodes[id];
      if (!node || !isSaraswatiRenderableNode(node)) return [];
      return [{ id, bounds: getNodeBounds(node) }];
    });
    if (boundsById.length < 2) return;
    const unionX = Math.min(...boundsById.map((entry) => entry.bounds.x));
    const unionY = Math.min(...boundsById.map((entry) => entry.bounds.y));
    const unionX2 = Math.max(
      ...boundsById.map((entry) => entry.bounds.x + entry.bounds.width),
    );
    const unionY2 = Math.max(
      ...boundsById.map((entry) => entry.bounds.y + entry.bounds.height),
    );
    const unionW = unionX2 - unionX;
    const unionH = unionY2 - unionY;
    applyCommands(
      boundsById.flatMap(({ id, bounds }) => {
        let dx = 0;
        let dy = 0;
        if (kind === "left") dx = unionX - bounds.x;
        if (kind === "centerH") {
          dx = unionX + unionW / 2 - (bounds.x + bounds.width / 2);
        }
        if (kind === "right") dx = unionX + unionW - (bounds.x + bounds.width);
        if (kind === "top") dy = unionY - bounds.y;
        if (kind === "centerV") {
          dy = unionY + unionH / 2 - (bounds.y + bounds.height / 2);
        }
        if (kind === "bottom")
          dy = unionY + unionH - (bounds.y + bounds.height);
        if (dx === 0 && dy === 0) return [];
        return [{ type: "MOVE_NODE" as const, id, dx, dy }];
      }),
    );
  };

  const onDelete = () => {
    if (selectedIds.length === 0) return;
    applyCommands(
      selectedIds.map((id) => ({ type: "DELETE_NODE" as const, id })),
    );
    setSelectedIds([]);
  };

  const onUngroup = () => {
    if (selectedIds.length !== 1) return;
    const groupId = selectedIds[0]!;
    const group = scene?.nodes[groupId];
    if (!group || group.type !== "group") return;
    const childrenToSelect = [...group.children];
    applyCommands([{ type: "UNGROUP_NODE", id: groupId }]);
    setSelectedIds(childrenToSelect.length > 0 ? childrenToSelect : []);
  };

  const onDownloadPng = () => {
    if (!scene || selectedIds.length === 0) return;
    void exportSelectionAsPng("selection.png", scene, selectedIds);
  };

  const onDownloadSvg = () => {
    if (!scene || selectedIds.length === 0) return;
    void exportSelectionAsSvg("selection.svg", scene, selectedIds);
  };

  return {
    selectionBounds,
    canGroup,
    canUngroup,
    canAlignElements: selectedIds.length >= 2,
    isLocked,
    alignAlreadySatisfied,
    onDuplicate,
    onToggleLock: toggleLockedSelection,
    onDelete,
    onCopy,
    onPaste,
    onPasteAt,
    onAlign,
    onGroup,
    onAlignElements,
    onUngroup,
    onFlipH,
    onFlipV,
    onDownloadPng,
    onDownloadSvg,
  };
}
