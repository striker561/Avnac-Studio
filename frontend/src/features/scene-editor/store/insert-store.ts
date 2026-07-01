import {
  SARASWATI_ROOT_ID,
  type SaraswatiCommand,
  type SaraswatiScene,
} from "@/lib/saraswati";
import type {
  SaraswatiEllipseNode,
  SaraswatiGroupNode,
  SaraswatiImageNode,
  SaraswatiLineNode,
  SaraswatiPolygonNode,
  SaraswatiRectNode,
  SaraswatiTextNode,
} from "@/lib/saraswati/types";

export type SceneEditorInsertContext = {
  scene: SaraswatiScene | null;
  selectedIds: string[];
  applyCommands: (commands: SaraswatiCommand[]) => void;
  setSelectedIds: (ids: string[]) => void;
};

const INSERT_IMAGE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='960' height='640' viewBox='0 0 960 640'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23dbeafe'/%3E%3Cstop offset='100%25' stop-color='%23bfdbfe'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='960' height='640' fill='url(%23g)'/%3E%3Ccircle cx='178' cy='168' r='58' fill='%2393c5fd'/%3E%3Cpath d='M106 538l206-220 154 166 122-114 266 168H106z' fill='%2360a5fa'/%3E%3Ctext x='480' y='596' fill='%231e3a8a' font-size='44' text-anchor='middle' font-family='ui-sans-serif,sans-serif'%3EImage%3C/text%3E%3C/svg%3E";

function resolveInsertParent(scene: SaraswatiScene, selectedIds: string[]) {
  const firstSelectedId = selectedIds[0];
  if (!firstSelectedId) return scene.root || SARASWATI_ROOT_ID;
  const selected = scene.nodes[firstSelectedId];
  if (!selected) return scene.root || SARASWATI_ROOT_ID;
  if (selected.type === "group") return selected.id;
  if (
    selected.parentId &&
    scene.nodes[selected.parentId] &&
    scene.nodes[selected.parentId]!.type === "group"
  ) {
    return selected.parentId;
  }
  return scene.root || SARASWATI_ROOT_ID;
}

function makeInsertPosition(scene: SaraswatiScene, indexSeed: number) {
  const step = 24;
  const offset = (indexSeed % 6) * step;
  return {
    x: Math.max(0, scene.artboard.width / 2 - 180 + offset),
    y: Math.max(0, scene.artboard.height / 2 - 120 + offset),
  };
}

function addSceneNode(
  context: SceneEditorInsertContext,
  node:
    | SaraswatiRectNode
    | SaraswatiEllipseNode
    | SaraswatiPolygonNode
    | SaraswatiLineNode
    | SaraswatiTextNode
    | SaraswatiImageNode,
) {
  context.applyCommands([{ type: "ADD_NODE", node }]);
  context.setSelectedIds([node.id]);
}

function regularPolygonPoints(sides: number, radius: number) {
  const n = Math.max(3, Math.min(32, Math.round(sides)));
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < n; index += 1) {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
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
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  return points;
}

function resolveInsertSeed(scene: SaraswatiScene, parentId: string) {
  const parent = scene.nodes[parentId];
  return parent && parent.type === "group" ? parent.children.length : 0;
}

export function insertRect(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed);
  addSceneNode(context, {
    id: crypto.randomUUID(),
    type: "rect",
    parentId,
    name: "Rectangle",
    visible: true,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: 320,
    height: 200,
    fill: { type: "solid", color: "#000000" },
    stroke: { type: "solid", color: "#000000" },
    strokeWidth: 2,
    radiusX: 18,
    radiusY: 18,
  });
}

export function insertEllipse(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed + 1);
  addSceneNode(context, {
    id: crypto.randomUUID(),
    type: "ellipse",
    parentId,
    name: "Ellipse",
    visible: true,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: 300,
    height: 180,
    fill: { type: "solid", color: "#000000" },
    stroke: { type: "solid", color: "#000000" },
    strokeWidth: 2,
  });
}

export function insertPolygon(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed + 2);
  const width = 220;
  const height = 220;
  addSceneNode(context, {
    id: crypto.randomUUID(),
    type: "polygon",
    parentId,
    name: "Polygon",
    visible: true,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width,
    height,
    fill: { type: "solid", color: "#000000" },
    stroke: { type: "solid", color: "#000000" },
    strokeWidth: 2,
    points: regularPolygonPoints(6, width / 2),
  });
}

export function insertStar(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed + 3);
  const width = 220;
  const height = 220;
  addSceneNode(context, {
    id: crypto.randomUUID(),
    type: "polygon",
    parentId,
    name: "Star",
    visible: true,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width,
    height,
    fill: { type: "solid", color: "#000000" },
    stroke: { type: "solid", color: "#000000" },
    strokeWidth: 2,
    points: starPolygonPoints(5, width / 2),
  });
}

export function insertLine(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed + 4);
  addSceneNode(context, {
    id: crypto.randomUUID(),
    type: "line",
    parentId,
    name: "Line",
    visible: true,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    x1: pos.x,
    y1: pos.y,
    x2: pos.x + 260,
    y2: pos.y,
    stroke: { type: "solid", color: "#000000" },
    strokeWidth: 6,
    arrowStart: false,
    arrowEnd: false,
    lineStyle: "solid",
    pathType: "straight",
    curveBulge: 0,
    curveT: 0.5,
  });
}

export function insertArrow(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed + 5);
  addSceneNode(context, {
    id: crypto.randomUUID(),
    type: "line",
    parentId,
    name: "Arrow",
    visible: true,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    x1: pos.x,
    y1: pos.y,
    x2: pos.x + 260,
    y2: pos.y,
    stroke: { type: "solid", color: "#000000" },
    strokeWidth: 6,
    arrowStart: false,
    arrowEnd: true,
    lineStyle: "solid",
    pathType: "straight",
    curveBulge: 0,
    curveT: 0.5,
  });
}

export function insertText(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed + 2);
  addSceneNode(context, {
    id: crypto.randomUUID(),
    type: "text",
    parentId,
    name: "Text",
    visible: true,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    text: "Edit this text",
    width: 360,
    fontSize: 54,
    fontFamily: "Inter",
    fontWeight: "600",
    fontStyle: "normal",
    textAlign: "left",
    lineHeight: 1.2,
    underline: false,
    color: { type: "solid", color: "#000000" },
    stroke: null,
    strokeWidth: 0,
  });
}

export function insertImage(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed + 3);
  addSceneNode(context, {
    id: crypto.randomUUID(),
    type: "image",
    parentId,
    name: "Image",
    visible: true,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: 360,
    height: 240,
    src: INSERT_IMAGE_SRC,
    cropX: 0,
    cropY: 0,
    clipPath: null,
  });
}

export function insertVectorBoard(context: SceneEditorInsertContext) {
  if (!context.scene) return;
  const parentId = resolveInsertParent(context.scene, context.selectedIds);
  const seed = resolveInsertSeed(context.scene, parentId);
  const pos = makeInsertPosition(context.scene, seed + 4);

  const groupId = crypto.randomUUID();
  const frameId = crypto.randomUUID();
  const labelId = crypto.randomUUID();

  const groupNode: SaraswatiGroupNode = {
    id: groupId,
    type: "group",
    parentId,
    name: "Vector board",
    visible: true,
    opacity: 1,
    children: [],
  };

  const frameNode: SaraswatiRectNode = {
    id: frameId,
    type: "rect",
    parentId: groupId,
    name: "Board frame",
    visible: true,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: 460,
    height: 320,
    fill: { type: "solid", color: "#000000" },
    stroke: { type: "solid", color: "#000000" },
    strokeWidth: 2,
    radiusX: 16,
    radiusY: 16,
  };

  const labelNode: SaraswatiTextNode = {
    id: labelId,
    type: "text",
    parentId: groupId,
    name: "Board label",
    visible: true,
    x: pos.x + 20,
    y: pos.y + 20,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    text: "Vector board",
    width: 260,
    fontSize: 30,
    fontFamily: "Inter",
    fontWeight: "600",
    fontStyle: "normal",
    textAlign: "left",
    lineHeight: 1.2,
    underline: false,
    color: { type: "solid", color: "#000000" },
    stroke: null,
    strokeWidth: 0,
  };

  context.applyCommands([
    { type: "ADD_NODE", node: groupNode },
    { type: "ADD_NODE", node: frameNode },
    { type: "ADD_NODE", node: labelNode },
  ]);
  context.setSelectedIds([groupId]);
}
