/**
 * Builds an AiDesignController that drives the Saraswati scene engine
 * via useSceneEditorStore. Passed to image / apps / AI panels so they
 * can place content on the scene without knowing about the engine.
 */
import { useMemo } from "react";
import type { AiDesignController, AiObjectKind } from "@/lib/avnac-ai-controller";
import { SARASWATI_ROOT_ID } from "@/lib/saraswati/scene";
import type {
  SaraswatiEllipseNode,
  SaraswatiImageNode,
  SaraswatiLineNode,
  SaraswatiRectNode,
  SaraswatiTextNode,
} from "@/lib/saraswati";
import { useSceneEditorStore } from "./store";

function placeTopLeft(
  spec: { x?: number; y?: number; origin?: "center" | "top-left" },
  width: number,
  height: number,
  artboardW: number,
  artboardH: number,
): { x: number; y: number } {
  const isCenter = spec.origin === "center";
  const rawX = spec.x ?? artboardW / 2;
  const rawY = spec.y ?? artboardH / 2;
  return {
    x: isCenter ? rawX - width / 2 : rawX,
    y: isCenter ? rawY - height / 2 : rawY,
  };
}

export function useSceneEditorAiController(): AiDesignController {
  const getState = useSceneEditorStore.getState;

  return useMemo<AiDesignController>(
    () => ({
      getCanvas() {
        const { scene } = getState();
        if (!scene) return null;
        const { artboard, nodes, root } = scene;
        const background = artboard.bg.type === "solid" ? artboard.bg.color : null;
        const objects = Object.values(nodes)
          .filter((node) => node.id !== root && node.type !== "group")
          .map((node) => {
            const anyNode = node as Record<string, unknown>;
            return {
              id: node.id,
              kind: node.type as AiObjectKind,
              label:
                typeof anyNode["name"] === "string" && anyNode["name"]
                  ? (anyNode["name"] as string)
                  : node.type,
              left: typeof anyNode["x"] === "number" ? (anyNode["x"] as number) : 0,
              top: typeof anyNode["y"] === "number" ? (anyNode["y"] as number) : 0,
              width:
                typeof anyNode["width"] === "number" ? (anyNode["width"] as number) : 0,
              height:
                typeof anyNode["height"] === "number" ? (anyNode["height"] as number) : 0,
              angle:
                typeof anyNode["rotation"] === "number"
                  ? (anyNode["rotation"] as number)
                  : 0,
              fill: null,
              stroke: null,
              text: node.type === "text" ? ((anyNode["text"] as string) ?? null) : null,
            };
          });
        return {
          width: artboard.width,
          height: artboard.height,
          background,
          objectCount: objects.length,
          objects,
        };
      },

      addRectangle(spec) {
        const { scene, applyCommands, setSelectedIds } = getState();
        if (!scene) return null;
        const id = crypto.randomUUID();
        const { x, y } = placeTopLeft(
          spec,
          spec.width,
          spec.height,
          scene.artboard.width,
          scene.artboard.height,
        );
        const node: SaraswatiRectNode = {
          id,
          type: "rect",
          parentId: scene.root ?? SARASWATI_ROOT_ID,
          visible: true,
          x,
          y,
          width: spec.width,
          height: spec.height,
          rotation: spec.rotation ?? 0,
          scaleX: 1,
          scaleY: 1,
          opacity: spec.opacity ?? 1,
          originX: "left",
          originY: "top",
          fill: { type: "solid", color: spec.fill ?? "#262626" },
          stroke: null,
          strokeWidth: 0,
          radiusX: spec.cornerRadius ?? 0,
          radiusY: spec.cornerRadius ?? 0,
          clipPath: null,
        };
        applyCommands([{ type: "ADD_NODE", node }]);
        setSelectedIds([id]);
        return { id };
      },

      addEllipse(spec) {
        const { scene, applyCommands, setSelectedIds } = getState();
        if (!scene) return null;
        const id = crypto.randomUUID();
        const { x, y } = placeTopLeft(
          spec,
          spec.width,
          spec.height,
          scene.artboard.width,
          scene.artboard.height,
        );
        const node: SaraswatiEllipseNode = {
          id,
          type: "ellipse",
          parentId: scene.root ?? SARASWATI_ROOT_ID,
          visible: true,
          x,
          y,
          width: spec.width,
          height: spec.height,
          rotation: spec.rotation ?? 0,
          scaleX: 1,
          scaleY: 1,
          opacity: spec.opacity ?? 1,
          originX: "left",
          originY: "top",
          fill: { type: "solid", color: spec.fill ?? "#262626" },
          stroke: null,
          strokeWidth: 0,
          clipPath: null,
        };
        applyCommands([{ type: "ADD_NODE", node }]);
        setSelectedIds([id]);
        return { id };
      },

      addText(spec) {
        const { scene, applyCommands, setSelectedIds } = getState();
        if (!scene) return null;
        const id = crypto.randomUUID();
        const fontSize = spec.fontSize ?? 48;
        const estimatedWidth =
          spec.width ?? Math.max(60, spec.text.length * fontSize * 0.6);
        const estimatedHeight = fontSize * 1.3;
        const { x, y } = placeTopLeft(
          spec,
          estimatedWidth,
          estimatedHeight,
          scene.artboard.width,
          scene.artboard.height,
        );
        const fontWeight =
          typeof spec.fontWeight === "number"
            ? String(spec.fontWeight)
            : spec.fontWeight === "bold"
              ? "700"
              : "400";
        const node: SaraswatiTextNode = {
          id,
          type: "text",
          parentId: scene.root ?? SARASWATI_ROOT_ID,
          visible: true,
          x,
          y,
          width: estimatedWidth,
          rotation: spec.rotation ?? 0,
          scaleX: 1,
          scaleY: 1,
          opacity: spec.opacity ?? 1,
          originX: "left",
          originY: "top",
          text: spec.text,
          fontSize,
          fontFamily: spec.fontFamily ?? "Inter",
          fontWeight,
          fontStyle: spec.fontStyle ?? "normal",
          textAlign:
            spec.textAlign === "justify" || !spec.textAlign
              ? "left"
              : spec.textAlign,
          lineHeight: 1.2,
          underline: false,
          color: { type: "solid", color: spec.fill ?? "#111111" },
          stroke: null,
          strokeWidth: 0,
        };
        applyCommands([{ type: "ADD_NODE", node }]);
        setSelectedIds([id]);
        return { id };
      },

      addLine(spec) {
        const { scene, applyCommands, setSelectedIds } = getState();
        if (!scene) return null;
        const id = crypto.randomUUID();
        const node: SaraswatiLineNode = {
          id,
          type: "line",
          parentId: scene.root ?? SARASWATI_ROOT_ID,
          visible: true,
          x: Math.min(spec.x1, spec.x2),
          y: Math.min(spec.y1, spec.y2),
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: spec.opacity ?? 1,
          originX: "left",
          originY: "top",
          x1: spec.x1,
          y1: spec.y1,
          x2: spec.x2,
          y2: spec.y2,
          stroke: { type: "solid", color: spec.stroke ?? "#111111" },
          strokeWidth: spec.strokeWidth ?? 2,
          arrowStart: false,
          arrowEnd: false,
          lineStyle: "solid",
          pathType: "straight",
          curveBulge: 0,
          curveT: 0.5,
        };
        applyCommands([{ type: "ADD_NODE", node }]);
        setSelectedIds([id]);
        return { id };
      },

      async addImageFromUrl(spec) {
        const { scene, applyCommands, setSelectedIds } = getState();
        if (!scene) return null;
        const id = crypto.randomUUID();
        const width = spec.width ?? Math.round(scene.artboard.width * 0.4);
        const height = spec.height ?? Math.round(scene.artboard.height * 0.4);
        const { x, y } = placeTopLeft(
          spec,
          width,
          height,
          scene.artboard.width,
          scene.artboard.height,
        );
        const node: SaraswatiImageNode = {
          id,
          type: "image",
          parentId: scene.root ?? SARASWATI_ROOT_ID,
          visible: true,
          x,
          y,
          width,
          height,
          rotation: spec.rotation ?? 0,
          scaleX: 1,
          scaleY: 1,
          opacity: spec.opacity ?? 1,
          originX: "left",
          originY: "top",
          src: spec.url,
          cropX: 0,
          cropY: 0,
          clipPath: null,
          credit: spec.credit ?? null,
        };
        applyCommands([{ type: "ADD_NODE", node }]);
        setSelectedIds([id]);
        return { id };
      },

      updateObject(id, patch) {
        const { scene, applyCommands } = getState();
        if (!scene) return false;
        const node = scene.nodes[id];
        if (!node) return false;
        const commands: Parameters<typeof applyCommands>[0] = [];
        if (patch.left !== undefined || patch.top !== undefined) {
          const anyNode = node as Record<string, unknown>;
          const currentX = typeof anyNode["x"] === "number" ? (anyNode["x"] as number) : 0;
          const currentY = typeof anyNode["y"] === "number" ? (anyNode["y"] as number) : 0;
          const dx = (patch.left ?? currentX) - currentX;
          const dy = (patch.top ?? currentY) - currentY;
          if (dx !== 0 || dy !== 0) {
            commands.push({ type: "MOVE_NODE", id, dx, dy });
          }
        }
        if (patch.width !== undefined || patch.height !== undefined) {
          const anyNode = node as Record<string, unknown>;
          const currentX = typeof anyNode["x"] === "number" ? (anyNode["x"] as number) : 0;
          const currentY = typeof anyNode["y"] === "number" ? (anyNode["y"] as number) : 0;
          const currentWidth = typeof anyNode["width"] === "number" ? (anyNode["width"] as number) : 0;
          const currentHeight = typeof anyNode["height"] === "number" ? (anyNode["height"] as number) : 0;
          commands.push({
            type: "RESIZE_NODE",
            id,
            x: currentX,
            y: currentY,
            width: patch.width ?? currentWidth,
            height: patch.height ?? currentHeight,
          });
        }
        if (patch.fill !== undefined && node.type !== "line" && node.type !== "group") {
          commands.push({
            type: "SET_NODE_FILL",
            id,
            fill: { type: "solid", color: patch.fill },
          });
        }
        if (patch.stroke !== undefined && node.type !== "group") {
          commands.push({
            type: "SET_NODE_STROKE",
            id,
            stroke: patch.stroke ? { type: "solid", color: patch.stroke } : null,
            strokeWidth: patch.strokeWidth,
          });
        }
        if (commands.length === 0) return false;
        applyCommands(commands);
        return true;
      },

      deleteObject(id) {
        const { scene, applyCommands } = getState();
        if (!scene || !scene.nodes[id]) return false;
        applyCommands([{ type: "DELETE_NODE", id }]);
        return true;
      },

      selectObjects(ids) {
        const { scene, setSelectedIds } = getState();
        if (!scene) return 0;
        const valid = ids.filter((id) => Boolean(scene.nodes[id]));
        setSelectedIds(valid);
        return valid.length;
      },

      setBackgroundColor(color) {
        const { applyCommands } = getState();
        applyCommands([{ type: "SET_ARTBOARD", bg: { type: "solid", color } }]);
      },

      clearCanvas() {
        const { scene, applyCommands, setSelectedIds } = getState();
        if (!scene) return 0;
        const root = scene.nodes[scene.root];
        if (!root || root.type !== "group") return 0;
        const ids = [...root.children];
        if (ids.length === 0) return 0;
        applyCommands(ids.map((id) => ({ type: "DELETE_NODE" as const, id })));
        setSelectedIds([]);
        return ids.length;
      },
    }),
    [getState],
  );
}
