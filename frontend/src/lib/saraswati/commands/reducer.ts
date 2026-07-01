import type { SaraswatiColor, SaraswatiShadow } from "../types";
import {
  cloneSaraswatiScene,
  isSaraswatiRenderableNode,
  type SaraswatiNode,
  type SaraswatiScene,
} from "../scene";
import type {
  SaraswatiClipPath,
  SaraswatiNodeOriginX,
  SaraswatiNodeOriginY,
} from "../types";
import { getNodeBounds, getTextNodeVisualHeight, type SaraswatiBounds } from "../spatial";
import type { SaraswatiCommand } from "./types";

export function applyCommand(
  scene: SaraswatiScene,
  command: SaraswatiCommand,
): SaraswatiScene {
  switch (command.type) {
    case "MOVE_NODE":
      return moveNode(scene, command.id, command.dx, command.dy);
    case "ROTATE_NODE":
      return rotateNode(scene, command.id, command.rotation);
    case "RESIZE_NODE":
      return resizeNode(
        scene,
        command.id,
        command.x,
        command.y,
        command.width,
        command.height,
      );
    case "ADD_NODE":
      return addNode(scene, command.node);
    case "DELETE_NODE":
      return deleteNode(scene, command.id);
    case "REPLACE_NODE":
      return replaceNode(scene, command.node);
    case "SET_GROUP_CHILDREN":
      return setGroupChildren(scene, command.id, command.children);
    case "GROUP_NODES":
      return groupNodes(scene, command.id, command.parentId, command.children);
    case "UNGROUP_NODE":
      return ungroupNode(scene, command.id);
    case "SET_NODE_VISIBLE":
      return setNodeVisible(scene, command.id, command.visible);
    case "SET_NODE_NAME":
      return setNodeName(scene, command.id, command.name);
    case "SET_NODE_CLIP_PATH":
      return setNodeClipPath(scene, command.id, command.clipPath);
    case "SET_NODE_CLIP_STACK":
      return setNodeClipStack(scene, command.id, command.clipPathStack);
    case "SET_ARTBOARD":
      return setArtboard(scene, command.width, command.height, command.bg);
    case "SET_NODE_FILL":
      return setNodeFill(scene, command.id, command.fill);
    case "SET_NODE_STROKE":
      return setNodeStroke(
        scene,
        command.id,
        command.stroke,
        command.strokeWidth,
      );
    case "SET_NODE_CORNER_RADIUS":
      return setNodeCornerRadius(
        scene,
        command.id,
        command.radiusX,
        command.radiusY,
      );
    case "SET_TEXT_FORMAT":
      return setTextFormat(scene, command.id, command);
    case "SET_TEXT_CONTENT":
      return setTextContent(scene, command.id, command.text);
    case "SET_NODE_OPACITY":
      return setNodeOpacity(scene, command.id, command.opacity);
    case "SET_NODE_SHADOW":
      return setNodeShadow(scene, command.id, command.shadow);
    case "SET_NODE_BLUR":
      return setNodeBlur(scene, command.id, command.blur);
    case "SET_IMAGE_CROP":
      return setImageCrop(
        scene,
        command.id,
        command.cropX,
        command.cropY,
        command.cropWidth,
        command.cropHeight,
      );
    case "SET_IMAGE_BORDER_RADIUS":
      return setImageBorderRadius(scene, command.id, command.radius);
    case "SET_POLYGON_SIDES":
      return setPolygonSides(scene, command.id, command.sides, command.star);
    default:
      return scene;
  }
}

function moveNode(
  scene: SaraswatiScene,
  nodeId: string,
  dx: number,
  dy: number,
): SaraswatiScene {
  if ((dx === 0 && dy === 0) || nodeId === scene.root || !scene.nodes[nodeId]) {
    return scene;
  }
  const next = cloneSaraswatiScene(scene);
  moveNodeRecursive(next.nodes, nodeId, dx, dy);
  return next;
}

function safeAbsScale(value: number): number {
  return Math.max(1e-6, Math.abs(value));
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360 || 0;
}

function shortestAngularDelta(from: number, to: number): number {
  const forward = normalizeDegrees(to) - normalizeDegrees(from);
  if (forward > 180) return forward - 360;
  if (forward < -180) return forward + 360;
  return forward;
}

function rotatePointAround(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rad: number,
): { x: number; y: number } {
  const dx = x - cx;
  const dy = y - cy;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function rotateNode(
  scene: SaraswatiScene,
  nodeId: string,
  rotation: number,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || nodeId === scene.root) return scene;
  if (node.type === "group") {
    return rotateGroupNode(scene, nodeId, rotation);
  }
  // Skip clone when rotation is already the same value.
  if ("rotation" in node && (node as { rotation?: number }).rotation === rotation) {
    return scene;
  }
  const next = cloneSaraswatiScene(scene);
  if (node.type === "line") {
    const centerX = (node.x1 + node.x2) / 2;
    const centerY = (node.y1 + node.y2) / 2;
    const halfDx = (node.x2 - node.x1) / 2;
    const halfDy = (node.y2 - node.y1) / 2;
    const length = Math.hypot(halfDx * 2, halfDy * 2);
    const halfLength = Math.max(0.5, length / 2);
    const rad = (rotation * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    next.nodes[nodeId] = {
      ...node,
      rotation,
      x1: centerX - ux * halfLength,
      y1: centerY - uy * halfLength,
      x2: centerX + ux * halfLength,
      y2: centerY + uy * halfLength,
    };
    return next;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next.nodes[nodeId] = { ...(node as any), rotation } as SaraswatiNode;
  return next;
}

function rotateGroupNode(
  scene: SaraswatiScene,
  groupId: string,
  targetRotation: number,
): SaraswatiScene {
  const group = scene.nodes[groupId];
  if (!group || group.type !== "group") return scene;

  const sourceBounds = getGroupBounds(scene, groupId, new Set<string>());
  if (!sourceBounds || sourceBounds.width <= 0 || sourceBounds.height <= 0) {
    return scene;
  }

  const currentRotation = normalizeDegrees(group.rotation ?? 0);
  const nextRotation = normalizeDegrees(targetRotation);
  const delta = shortestAngularDelta(currentRotation, nextRotation);
  if (delta === 0) return scene;

  const centerX = sourceBounds.x + sourceBounds.width / 2;
  const centerY = sourceBounds.y + sourceBounds.height / 2;
  const rad = (delta * Math.PI) / 180;

  const next = cloneSaraswatiScene(scene);

  const descendantIds = collectGroupDescendantIds(scene, groupId, new Set());
  for (const id of descendantIds) {
    const current = next.nodes[id];
    if (!current) continue;

    if (current.type === "group") {
      next.nodes[id] = {
        ...current,
        rotation: normalizeDegrees((current.rotation ?? 0) + delta),
      };
      continue;
    }

    if (current.type === "line") {
      const p1 = rotatePointAround(current.x1, current.y1, centerX, centerY, rad);
      const p2 = rotatePointAround(current.x2, current.y2, centerX, centerY, rad);
      next.nodes[id] = {
        ...current,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        rotation: normalizeDegrees(current.rotation + delta),
      };
      continue;
    }

    const anchor = rotatePointAround(current.x, current.y, centerX, centerY, rad);
    next.nodes[id] = {
      ...current,
      x: anchor.x,
      y: anchor.y,
      rotation: normalizeDegrees(current.rotation + delta),
    } as SaraswatiNode;
  }

  next.nodes[groupId] = {
    ...group,
    rotation: nextRotation,
  };

  return next;
}

function addNode(scene: SaraswatiScene, node: SaraswatiNode): SaraswatiScene {
  if (scene.nodes[node.id]) return scene;
  const next = cloneSaraswatiScene(scene);
  const parentId = resolveParentId(next, node.parentId);
  const normalized =
    node.type === "group" ? { ...node, parentId } : { ...node, parentId };
  next.nodes[normalized.id] = normalized;
  const parent = next.nodes[parentId];
  if (!parent || parent.type !== "group") return scene;
  next.nodes[parentId] = {
    ...parent,
    children: [...parent.children, normalized.id],
  };
  return next;
}

function deleteNode(scene: SaraswatiScene, nodeId: string): SaraswatiScene {
  if (nodeId === scene.root || !scene.nodes[nodeId]) return scene;
  const next = cloneSaraswatiScene(scene);
  const idsToDelete = collectSubtreeIds(next.nodes, nodeId);
  const parentId = next.nodes[nodeId]?.parentId ?? null;
  if (parentId) {
    const parent = next.nodes[parentId];
    if (parent && parent.type === "group") {
      next.nodes[parentId] = {
        ...parent,
        children: parent.children.filter((childId) => childId !== nodeId),
      };
    }
  }
  for (const id of idsToDelete) {
    delete next.nodes[id];
  }
  return next;
}

function replaceNode(
  scene: SaraswatiScene,
  node: SaraswatiNode,
): SaraswatiScene {
  const existing = scene.nodes[node.id];
  if (!existing) return scene;
  const next = cloneSaraswatiScene(scene);
  if (existing.type === "group" && node.type === "group") {
    next.nodes[node.id] = {
      ...node,
      children: [...existing.children],
    };
    return next;
  }
  next.nodes[node.id] = {
    ...node,
    parentId: existing.parentId,
  };
  return next;
}

function setGroupChildren(
  scene: SaraswatiScene,
  groupId: string,
  children: string[],
): SaraswatiScene {
  const group = scene.nodes[groupId];
  if (!group || group.type !== "group") return scene;
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const childId of children) {
    if (seen.has(childId) || !scene.nodes[childId] || childId === scene.root)
      continue;
    seen.add(childId);
    deduped.push(childId);
  }
  if (
    deduped.length === group.children.length &&
    deduped.every((childId, index) => childId === group.children[index])
  ) {
    return scene;
  }
  const next = cloneSaraswatiScene(scene);
  next.nodes[groupId] = {
    ...group,
    children: deduped,
  };
  for (const childId of deduped) {
    const child = next.nodes[childId];
    if (!child || child.parentId === groupId) continue;
    next.nodes[childId] = { ...child, parentId: groupId };
  }
  return next;
}

function groupNodes(
  scene: SaraswatiScene,
  groupId: string,
  parentId: string,
  children: string[],
): SaraswatiScene {
  if (scene.nodes[groupId]) return scene;
  const parent = scene.nodes[parentId];
  if (!parent || parent.type !== "group") return scene;

  const selected = new Set<string>();
  const orderedChildren: string[] = [];
  for (const childId of parent.children) {
    if (!children.includes(childId) || selected.has(childId)) continue;
    const child = scene.nodes[childId];
    if (!child || child.parentId !== parentId) continue;
    selected.add(childId);
    orderedChildren.push(childId);
  }
  if (orderedChildren.length < 2) return scene;

  const firstIndex = parent.children.findIndex((childId) =>
    selected.has(childId),
  );
  if (firstIndex < 0) return scene;

  const next = cloneSaraswatiScene(scene);
  next.nodes[groupId] = {
    id: groupId,
    type: "group",
    parentId,
    rotation: 0,
    visible: true,
    opacity: 1,
    children: orderedChildren,
  };

  next.nodes[parentId] = {
    ...parent,
    children: [
      ...parent.children
        .slice(0, firstIndex)
        .filter((childId) => !selected.has(childId)),
      groupId,
      ...parent.children
        .slice(firstIndex)
        .filter((childId) => !selected.has(childId)),
    ],
  };

  for (const childId of orderedChildren) {
    const child = next.nodes[childId];
    if (!child) continue;
    next.nodes[childId] = { ...child, parentId: groupId };
  }

  return next;
}

function ungroupNode(scene: SaraswatiScene, groupId: string): SaraswatiScene {
  const group = scene.nodes[groupId];
  if (!group || group.type !== "group" || groupId === scene.root) return scene;
  const parentId = group.parentId;
  if (!parentId) return scene;
  const parent = scene.nodes[parentId];
  if (!parent || parent.type !== "group") return scene;

  const groupIndex = parent.children.indexOf(groupId);
  if (groupIndex < 0) return scene;

  const next = cloneSaraswatiScene(scene);
  next.nodes[parentId] = {
    ...parent,
    children: [
      ...parent.children.slice(0, groupIndex),
      ...group.children,
      ...parent.children.slice(groupIndex + 1),
    ],
  };

  for (const childId of group.children) {
    const child = next.nodes[childId];
    if (!child) continue;
    next.nodes[childId] = { ...child, parentId };
  }

  delete next.nodes[groupId];
  return next;
}

function resizeNode(
  scene: SaraswatiScene,
  nodeId: string,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node) return scene;
  if (node.type === "group") {
    return resizeGroupNode(scene, nodeId, bx, by, bw, bh);
  }
  const clamped = { bx, by, bw: Math.max(1, bw), bh: Math.max(1, bh) };
  const next = cloneSaraswatiScene(scene);
  if (node.type === "line") {
    const dx = node.x2 - node.x1;
    const dy = node.y2 - node.y1;
    const length = Math.hypot(dx, dy);
    const ux = length > 0 ? dx / length : 1;
    const uy = length > 0 ? dy / length : 0;
    const oldCenterX = (node.x1 + node.x2) / 2;
    const oldCenterY = (node.y1 + node.y2) / 2;
    const requestedCenterX = clamped.bx + clamped.bw / 2;
    const requestedCenterY = clamped.by + clamped.bh / 2;
    const centerShiftAlongLine =
      (requestedCenterX - oldCenterX) * ux +
      (requestedCenterY - oldCenterY) * uy;
    const centerX = oldCenterX + centerShiftAlongLine * ux;
    const centerY = oldCenterY + centerShiftAlongLine * uy;
    const halfLength = Math.max(
      0.5,
      Math.abs(ux) * (clamped.bw / 2) + Math.abs(uy) * (clamped.bh / 2),
    );
    next.nodes[nodeId] = {
      ...node,
      x1: centerX - ux * halfLength,
      y1: centerY - uy * halfLength,
      x2: centerX + ux * halfLength,
      y2: centerY + uy * halfLength,
    };
    return next;
  }
  const nx = boundsToAnchorX(clamped.bx, node.originX, clamped.bw);
  const ny = boundsToAnchorY(clamped.by, node.originY, clamped.bh);
  if (node.type === "text") {
    const sx = safeAbsScale(node.scaleX);
    const sy = safeAbsScale(node.scaleY);
    const prevHeight =
      getTextNodeVisualHeight(node.text, node.fontSize, node.lineHeight) * sy;
    const prevWidth = Math.max(1, node.width) * sx;
    let nextFontSize = node.fontSize;
    let nextWidth = clamped.bw / sx;

    if (Math.abs(clamped.bh - prevHeight) > 0.5) {
      const heightScale = clamped.bh / prevHeight;
      nextFontSize = Math.max(1, node.fontSize * heightScale);
    }
    if (Math.abs(clamped.bw - prevWidth) > 0.5) {
      nextWidth = Math.max(1, clamped.bw / sx);
    }

    next.nodes[nodeId] = {
      ...node,
      x: nx,
      y: ny,
      width: nextWidth,
      fontSize: nextFontSize,
    };
    return next;
  }
  if (node.type === "polygon") {
    const prevW = Math.max(1, node.width);
    const prevH = Math.max(1, node.height);
    const nextW = clamped.bw / safeAbsScale(node.scaleX);
    const nextH = clamped.bh / safeAbsScale(node.scaleY);
    const sx = nextW / prevW;
    const sy = nextH / prevH;
    next.nodes[nodeId] = {
      ...node,
      x: nx,
      y: ny,
      width: nextW,
      height: nextH,
      points: node.points.map((point) => ({
        x: point.x * sx,
        y: point.y * sy,
      })),
    };
    return next;
  }
  next.nodes[nodeId] = {
    ...node,
    x: nx,
    y: ny,
    width: clamped.bw / safeAbsScale(node.scaleX),
    height: clamped.bh / safeAbsScale(node.scaleY),
  } as SaraswatiNode;
  return next;
}

function resizeGroupNode(
  scene: SaraswatiScene,
  groupId: string,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): SaraswatiScene {
  const group = scene.nodes[groupId];
  if (!group || group.type !== "group") return scene;
  const sourceBounds = getGroupBounds(scene, groupId, new Set<string>());
  if (!sourceBounds || sourceBounds.width <= 0 || sourceBounds.height <= 0) {
    return scene;
  }

  const target = {
    x: bx,
    y: by,
    width: Math.max(1, bw),
    height: Math.max(1, bh),
  };
  const sx = target.width / sourceBounds.width;
  const sy = target.height / sourceBounds.height;
  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return scene;

  // Keep child geometry proportional at very small group sizes. A hard 1px
  // floor per child causes overlap/collapse when a group is shrunk near its
  // minimum size.
  const minChildSize = 0.0001;

  const next = cloneSaraswatiScene(scene);
  const descendants = collectRenderableDescendants(scene, groupId, new Set());

  for (const id of descendants) {
    const node = next.nodes[id];
    if (!node || !isSaraswatiRenderableNode(node)) continue;
    if (node.type === "line") {
      next.nodes[id] = {
        ...node,
        x1: target.x + (node.x1 - sourceBounds.x) * sx,
        y1: target.y + (node.y1 - sourceBounds.y) * sy,
        x2: target.x + (node.x2 - sourceBounds.x) * sx,
        y2: target.y + (node.y2 - sourceBounds.y) * sy,
      };
      continue;
    }

    const nodeBounds = getNodeBounds(node);
    const mappedBounds = {
      x: target.x + (nodeBounds.x - sourceBounds.x) * sx,
      y: target.y + (nodeBounds.y - sourceBounds.y) * sy,
      width: Math.max(minChildSize, nodeBounds.width * sx),
      height: Math.max(minChildSize, nodeBounds.height * sy),
    };

    const nx = boundsToAnchorX(
      mappedBounds.x,
      node.originX,
      mappedBounds.width,
    );
    const ny = boundsToAnchorY(
      mappedBounds.y,
      node.originY,
      mappedBounds.height,
    );

    if (node.type === "text") {
      const sxAbs = safeAbsScale(node.scaleX);
      const heightRatio =
        mappedBounds.height / Math.max(minChildSize, nodeBounds.height);
      next.nodes[id] = {
        ...node,
        x: nx,
        y: ny,
        width: mappedBounds.width / sxAbs,
        fontSize: Math.max(1, node.fontSize * heightRatio),
      };
      continue;
    }

    if (node.type === "polygon") {
      const prevW = Math.max(1e-6, node.width);
      const prevH = Math.max(1e-6, node.height);
      const newW = mappedBounds.width / safeAbsScale(node.scaleX);
      const newH = mappedBounds.height / safeAbsScale(node.scaleY);
      const ptSx = newW / prevW;
      const ptSy = newH / prevH;
      next.nodes[id] = {
        ...node,
        x: nx,
        y: ny,
        width: newW,
        height: newH,
        points: node.points.map((point) => ({
          x: point.x * ptSx,
          y: point.y * ptSy,
        })),
      } as SaraswatiNode;
      continue;
    }

    next.nodes[id] = {
      ...node,
      x: nx,
      y: ny,
      width: mappedBounds.width / safeAbsScale(node.scaleX),
      height: mappedBounds.height / safeAbsScale(node.scaleY),
    } as SaraswatiNode;
  }

  return next;
}

function collectRenderableDescendants(
  scene: SaraswatiScene,
  nodeId: string,
  visited: Set<string>,
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  const node = scene.nodes[nodeId];
  if (!node || node.visible === false) return [];
  if (isSaraswatiRenderableNode(node)) return [nodeId];
  if (node.type !== "group") return [];

  const result: string[] = [];
  for (const childId of node.children) {
    result.push(...collectRenderableDescendants(scene, childId, visited));
  }
  return result;
}

function collectGroupDescendantIds(
  scene: SaraswatiScene,
  nodeId: string,
  visited: Set<string>,
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  const node = scene.nodes[nodeId];
  if (!node || node.type !== "group") return [];

  const result: string[] = [];
  for (const childId of node.children) {
    const child = scene.nodes[childId];
    if (!child) continue;
    result.push(childId);
    if (child.type === "group") {
      result.push(...collectGroupDescendantIds(scene, childId, visited));
    }
  }
  return result;
}

function getGroupBounds(
  scene: SaraswatiScene,
  nodeId: string,
  visited: Set<string>,
): SaraswatiBounds | null {
  if (visited.has(nodeId)) return null;
  visited.add(nodeId);

  const node = scene.nodes[nodeId];
  if (!node || node.visible === false) return null;
  if (isSaraswatiRenderableNode(node)) return getNodeBounds(node);
  if (node.type !== "group") return null;

  let bounds: SaraswatiBounds | null = null;
  for (const childId of node.children) {
    const childBounds = getGroupBounds(scene, childId, visited);
    if (!childBounds) continue;
    if (!bounds) {
      bounds = childBounds;
      continue;
    }
    const x1 = Math.min(bounds.x, childBounds.x);
    const y1 = Math.min(bounds.y, childBounds.y);
    const x2 = Math.max(
      bounds.x + bounds.width,
      childBounds.x + childBounds.width,
    );
    const y2 = Math.max(
      bounds.y + bounds.height,
      childBounds.y + childBounds.height,
    );
    bounds = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }
  return bounds;
}

function boundsToAnchorX(
  left: number,
  originX: SaraswatiNodeOriginX,
  width: number,
): number {
  if (originX === "center") return left + width / 2;
  if (originX === "right") return left + width;
  return left;
}

function boundsToAnchorY(
  top: number,
  originY: SaraswatiNodeOriginY,
  height: number,
): number {
  if (originY === "center") return top + height / 2;
  if (originY === "bottom") return top + height;
  return top;
}

function setNodeVisible(
  scene: SaraswatiScene,
  nodeId: string,
  visible: boolean,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || node.visible === visible) return scene;
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, visible };
  return next;
}

function setNodeName(
  scene: SaraswatiScene,
  nodeId: string,
  name: string,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node) return scene;
  const next = cloneSaraswatiScene(scene);
  // Store name as a generic meta property; nodes that have a `name` field get it set directly.
  // All node types share SaraswatiNodeBase which doesn't define `name`, so we widen with a cast.
  next.nodes[nodeId] = { ...node, name };
  return next;
}

function setNodeClipPath(
  scene: SaraswatiScene,
  nodeId: string,
  clipPath: SaraswatiClipPath | null,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || !isSaraswatiRenderableNode(node) || node.type === "line") {
    return scene;
  }
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, clipPath };
  return next;
}

function setNodeClipStack(
  scene: SaraswatiScene,
  nodeId: string,
  clipPathStack: SaraswatiClipPath[],
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || !isSaraswatiRenderableNode(node) || node.type === "line") {
    return scene;
  }
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = {
    ...node,
    clipPathStack: clipPathStack.map((clipPath) => ({ ...clipPath })),
  };
  return next;
}

function setArtboard(
  scene: SaraswatiScene,
  width?: number,
  height?: number,
  bg?: SaraswatiColor,
): SaraswatiScene {
  const nextW = width != null && width > 0 ? width : scene.artboard.width;
  const nextH = height != null && height > 0 ? height : scene.artboard.height;
  const nextBg = bg ?? scene.artboard.bg;
  if (
    nextW === scene.artboard.width &&
    nextH === scene.artboard.height &&
    nextBg === scene.artboard.bg
  ) {
    return scene;
  }
  return {
    ...scene,
    artboard: { ...scene.artboard, width: nextW, height: nextH, bg: nextBg },
  };
}

function moveNodeRecursive(
  nodes: Record<string, SaraswatiNode>,
  nodeId: string,
  dx: number,
  dy: number,
) {
  const node = nodes[nodeId];
  if (!node) return;
  if (node.type === "group") {
    nodes[nodeId] = { ...node };
    for (const childId of node.children) {
      moveNodeRecursive(nodes, childId, dx, dy);
    }
    return;
  }
  if (node.type === "line") {
    nodes[nodeId] = {
      ...node,
      x: node.x + dx,
      y: node.y + dy,
      x1: node.x1 + dx,
      y1: node.y1 + dy,
      x2: node.x2 + dx,
      y2: node.y2 + dy,
    };
    return;
  }
  nodes[nodeId] = {
    ...node,
    x: node.x + dx,
    y: node.y + dy,
  };
}

function resolveParentId(
  scene: SaraswatiScene,
  parentId: string | null,
): string {
  if (!parentId) return scene.root;
  const parent = scene.nodes[parentId];
  return parent && parent.type === "group" ? parentId : scene.root;
}

function collectSubtreeIds(
  nodes: Record<string, SaraswatiNode>,
  nodeId: string,
): string[] {
  const node = nodes[nodeId];
  if (!node) return [];
  if (node.type !== "group") return [nodeId];
  return [
    nodeId,
    ...node.children.flatMap((childId) => collectSubtreeIds(nodes, childId)),
  ];
}

function setNodeFill(
  scene: SaraswatiScene,
  nodeId: string,
  fill: SaraswatiColor,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node) return scene;
  if (node.type === "image" || node.type === "group" || node.type === "line") {
    return scene;
  }
  const next = cloneSaraswatiScene(scene);
  // Safe: we've already excluded image, group, and line above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next.nodes[nodeId] = { ...(node as any), fill } as SaraswatiNode;
  return next;
}

function setNodeStroke(
  scene: SaraswatiScene,
  nodeId: string,
  stroke: SaraswatiColor | null,
  strokeWidth?: number,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || node.type === "image" || node.type === "group") return scene;
  const next = cloneSaraswatiScene(scene);
  if (node.type === "line") {
    const nextStroke = stroke ?? node.stroke;
    next.nodes[nodeId] = {
      ...node,
      stroke: nextStroke,
      strokeWidth: strokeWidth ?? node.strokeWidth,
    };
  } else {
    next.nodes[nodeId] = {
      ...node,
      stroke: stroke,
      strokeWidth: strokeWidth ?? node.strokeWidth,
    };
  }
  return next;
}

function setNodeCornerRadius(
  scene: SaraswatiScene,
  nodeId: string,
  radiusX: number,
  radiusY: number,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || node.type !== "rect") return scene;
  const clampedX = Math.max(0, radiusX);
  const clampedY = Math.max(0, radiusY);
  if (node.radiusX === clampedX && node.radiusY === clampedY) return scene;
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, radiusX: clampedX, radiusY: clampedY };
  return next;
}

function setTextFormat(
  scene: SaraswatiScene,
  nodeId: string,
  patch: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: "normal" | "italic";
    textAlign?: "left" | "center" | "right";
    underline?: boolean;
    color?: SaraswatiColor;
    lineHeight?: number;
  },
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || node.type !== "text") return scene;
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = {
    ...node,
    ...(patch.fontFamily !== undefined && { fontFamily: patch.fontFamily }),
    ...(patch.fontSize !== undefined && { fontSize: patch.fontSize }),
    ...(patch.fontWeight !== undefined && { fontWeight: patch.fontWeight }),
    ...(patch.fontStyle !== undefined && { fontStyle: patch.fontStyle }),
    ...(patch.textAlign !== undefined && { textAlign: patch.textAlign }),
    ...(patch.underline !== undefined && { underline: patch.underline }),
    ...(patch.color !== undefined && { color: patch.color }),
    ...(patch.lineHeight !== undefined && { lineHeight: patch.lineHeight }),
  };
  return next;
}

function setNodeOpacity(
  scene: SaraswatiScene,
  nodeId: string,
  opacity: number,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node) return scene;
  const clamped = Math.max(0, Math.min(1, opacity));
  if (node.opacity === clamped) return scene;
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, opacity: clamped };
  return next;
}

function setNodeShadow(
  scene: SaraswatiScene,
  nodeId: string,
  shadow: SaraswatiShadow | null,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node) return scene;
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, shadow: shadow ?? null } as SaraswatiNode;
  return next;
}

function setNodeBlur(
  scene: SaraswatiScene,
  nodeId: string,
  blur: number,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node) return scene;
  const clamped = Math.max(0, Math.min(100, blur));
  const existing = (node as { blur?: number }).blur ?? 0;
  if (existing === clamped) return scene;
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, blur: clamped } as SaraswatiNode;
  return next;
}

function setTextContent(
  scene: SaraswatiScene,
  nodeId: string,
  text: string,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || node.type !== "text") return scene;
  if (node.text === text) return scene;
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, text };
  return next;
}

function setImageCrop(
  scene: SaraswatiScene,
  nodeId: string,
  cropX: number,
  cropY: number,
  cropWidth?: number,
  cropHeight?: number,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || node.type !== "image") return scene;
  const nextCropX = Math.max(0, Math.round(cropX));
  const nextCropY = Math.max(0, Math.round(cropY));
  const nextCropWidth =
    cropWidth == null ? undefined : Math.max(1, Math.round(cropWidth));
  const nextCropHeight =
    cropHeight == null ? undefined : Math.max(1, Math.round(cropHeight));
  if (
    node.cropX === nextCropX &&
    node.cropY === nextCropY &&
    node.cropWidth === nextCropWidth &&
    node.cropHeight === nextCropHeight
  ) {
    return scene;
  }
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = {
    ...node,
    cropX: nextCropX,
    cropY: nextCropY,
    cropWidth: nextCropWidth,
    cropHeight: nextCropHeight,
  };
  return next;
}

function setImageBorderRadius(
  scene: SaraswatiScene,
  nodeId: string,
  radius: number,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || node.type !== "image") return scene;
  const clamped = Math.max(
    0,
    Math.min(radius, node.width / 2, node.height / 2),
  );
  if ((node.borderRadius ?? 0) === clamped) return scene;
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, borderRadius: clamped };
  return next;
}

function setPolygonSides(
  scene: SaraswatiScene,
  nodeId: string,
  sides: number,
  star?: boolean,
): SaraswatiScene {
  const node = scene.nodes[nodeId];
  if (!node || node.type !== "polygon") return scene;
  const isStar = star ?? /star/i.test(node.name ?? "");
  const points = isStar
    ? starPolygonPoints(sides, node.width / 2)
    : regularPolygonPoints(sides, node.width / 2);
  if (
    points.length === node.points.length &&
    points.every(
      (point, index) =>
        point.x === node.points[index]?.x && point.y === node.points[index]?.y,
    )
  ) {
    return scene;
  }
  const next = cloneSaraswatiScene(scene);
  next.nodes[nodeId] = { ...node, points };
  return next;
}

function regularPolygonPoints(sides: number, radius: number) {
  const n = Math.max(3, Math.min(32, Math.round(sides)));
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < n; index += 1) {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
}

function starPolygonPoints(pointsCount: number, outerRadius: number) {
  const n = Math.max(3, Math.min(24, Math.round(pointsCount)));
  const innerRadius = outerRadius * 0.45;
  const points: Array<{ x: number; y: number }> = [];
  const step = Math.PI / n;
  for (let index = 0; index < n * 2; index += 1) {
    const angle = -Math.PI / 2 + index * step;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
}
