import { useMemo } from "react";
import type { CanvasAlignKind } from "@/components/editor/canvas/canvas-selection-toolbar";
import {
  isSaraswatiRenderableNode,
  type SaraswatiCommand,
  type SaraswatiNode,
  type SaraswatiRenderableNode,
} from "@/lib/saraswati";
import { getRenderableNodeBounds } from "@/lib/editor/overlays";
import { getNodeBounds } from "@/lib/saraswati/spatial";
import { buildGroupSelectionCommands } from "./scene-group-commands";
import { resolveTopmostSelectedIds } from "./scene-editor-input-utils";
import { useSceneEditorStore } from "./store";
import {
  exportSelectionAsPng,
  exportSelectionAsSvg,
} from "@/lib/avnac-selection-export";

// Clipboard is a snapshot of the selected subtrees (groups + their
// descendants) taken at copy time, so pasting a group keeps its children and
// later edits to the source never leak into a paste.
const sceneClipboard: Record<string, SaraswatiNode> = {};

const PASTE_OFFSET = 16;

export function collectSubtreeNodes(
  nodes: Record<string, SaraswatiNode>,
  nodeId: string,
  out: Record<string, SaraswatiNode>,
): void {
  const node = nodes[nodeId];
  if (!node) return;
  out[nodeId] = node;
  if (node.type === "group") {
    for (const childId of node.children) {
      collectSubtreeNodes(nodes, childId, out);
    }
  }
}

export function topmostClipboardIds(
  clipboard: Record<string, SaraswatiNode>,
): string[] {
  return Object.keys(clipboard).filter((id) => {
    const parentId = clipboard[id]?.parentId ?? null;
    return parentId === null || !clipboard[parentId];
  });
}

/** Union of the clipboard's top-level subtree bounds (handles groups). */
function clipboardSelectionBounds(
  clipboard: Record<string, SaraswatiNode>,
  topIds: string[],
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const visited = new Set<string>();
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = clipboard[nodeId];
    if (!node) return;
    if (node.type === "group") {
      for (const childId of node.children) visit(childId);
      return;
    }
    if (!isSaraswatiRenderableNode(node)) return;
    const b = getNodeBounds(node);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  };
  for (const id of topIds) visit(id);
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Deep-clone the clipboard subtree with fresh ids, groups before children. */
export function buildClipboardPasteCommands(
  clipboard: Record<string, SaraswatiNode>,
  dx: number,
  dy: number,
): {
  commands: { type: "ADD_NODE"; node: SaraswatiNode }[];
  topNewIds: string[];
} {
  const topIds = topmostClipboardIds(clipboard);
  const idMap = new Map<string, string>();
  for (const id of Object.keys(clipboard)) idMap.set(id, crypto.randomUUID());
  const commands: { type: "ADD_NODE"; node: SaraswatiNode }[] = [];
  for (const topId of topIds) {
    commands.push(
      ...buildDeepDuplicateCommands(clipboard, topId, idMap, dx, dy),
    );
  }
  return { commands, topNewIds: topIds.map((id) => idMap.get(id)!) };
}

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
    for (const key of Object.keys(sceneClipboard)) delete sceneClipboard[key];
    // Snapshot the selected subtrees (including group children) at copy time.
    const topIds = resolveTopmostSelectedIds(scene, selectedIds);
    for (const id of topIds)
      collectSubtreeNodes(scene.nodes, id, sceneClipboard);
  };

  const onPasteAt = (target?: { x: number; y: number }) => {
    const topClipIds = topmostClipboardIds(sceneClipboard);
    if (topClipIds.length === 0) return;

    const { commands, topNewIds } = buildClipboardPasteCommands(
      sceneClipboard,
      PASTE_OFFSET,
      PASTE_OFFSET,
    );

    let finalCommands: SaraswatiCommand[] = commands;
    if (target) {
      const bounds = clipboardSelectionBounds(sceneClipboard, topClipIds);
      if (bounds) {
        const pastedCenterX = bounds.x + PASTE_OFFSET + bounds.width / 2;
        const pastedCenterY = bounds.y + PASTE_OFFSET + bounds.height / 2;
        const dx = target.x - pastedCenterX;
        const dy = target.y - pastedCenterY;
        finalCommands = [
          ...commands,
          ...topNewIds.map((id) => ({
            type: "MOVE_NODE" as const,
            id,
            dx,
            dy,
          })),
        ];
      }
    }

    applyCommands(finalCommands);
    setSelectedIds(topNewIds);
  };

  const onPaste = () => {
    onPasteAt();
  };

  // Paste in place (Cmd+Shift+V): pastes at the exact source coordinates —
  // useful when copying a whole page into another page.
  const onPasteInPlace = () => {
    const topClipIds = topmostClipboardIds(sceneClipboard);
    if (topClipIds.length === 0) return;
    const { commands, topNewIds } = buildClipboardPasteCommands(
      sceneClipboard,
      0,
      0,
    );
    applyCommands(commands);
    setSelectedIds(topNewIds);
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
    // Only move the top-most selected nodes (a group move covers its children)
    // and never move locked nodes.
    const movable = resolveTopmostSelectedIds(scene, selectedIds).filter(
      (id) => !lockedSet.has(id),
    );
    if (movable.length === 0) return;
    applyCommands(
      movable.map((id) => ({ type: "MOVE_NODE" as const, id, dx, dy })),
    );
  };

  const onNudge = (dx: number, dy: number) => {
    if (!scene || selectedIds.length === 0 || (dx === 0 && dy === 0)) return;
    const movable = resolveTopmostSelectedIds(scene, selectedIds).filter(
      (id) => !lockedSet.has(id),
    );
    if (movable.length === 0) return;
    applyCommands(
      movable.map((id) => ({ type: "MOVE_NODE" as const, id, dx, dy })),
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
    const movable = resolveTopmostSelectedIds(scene, selectedIds).filter(
      (id) => !lockedSet.has(id),
    );
    const boundsById = movable.flatMap((id) => {
      const bounds = getRenderableNodeBounds(scene, id);
      if (!bounds) return [];
      return [{ id, bounds }];
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
    // Locked nodes can't be deleted.
    const deletable = selectedIds.filter((id) => !lockedSet.has(id));
    if (deletable.length === 0) return;
    applyCommands(
      deletable.map((id) => ({ type: "DELETE_NODE" as const, id })),
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
    void exportSelectionAsPng("selection.png", scene, selectedIds, {
      useSourceResolution: true,
    })
      .then(() => {
        useSceneEditorStore.getState().setExportNotice(null);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "PNG export failed.";
        useSceneEditorStore.getState().setExportNotice(message);
      });
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
    onPasteInPlace,
    onAlign,
    onNudge,
    onGroup,
    onAlignElements,
    onUngroup,
    onFlipH,
    onFlipV,
    onDownloadPng,
    onDownloadSvg,
  };
}
