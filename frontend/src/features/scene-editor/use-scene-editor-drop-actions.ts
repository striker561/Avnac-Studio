import type { SceneDropIntent } from "./scene-drop-intent";
import type { SaraswatiImageNode } from "@/lib/saraswati";
import { vectorDocHasRenderableStrokes } from "@/lib/avnac-vector-board-document";
import { loadVectorBoardDocs } from "@/lib/avnac-vector-boards-storage";
import { renderVectorBoardDocumentTransparent } from "@/components/editor/vector-boards/vector-board-workspace";
import { useCallback } from "react";
import { useSceneEditorStore } from "./store";

type ScenePoint = { x: number; y: number };

const MAX_DROPPED_IMAGE_EDGE = 720;
const FALLBACK_IMAGE_WIDTH = 640;
const FALLBACK_IMAGE_HEIGHT = 360;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read dropped file"));
    reader.readAsDataURL(file);
  });
}

function getImageSize(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (width > 0 && height > 0) {
        resolve({ width, height });
      } else {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function fitImageSize(
  width: number,
  height: number,
  maxEdge = MAX_DROPPED_IMAGE_EDGE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: FALLBACK_IMAGE_WIDTH, height: FALLBACK_IMAGE_HEIGHT };
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function useSceneEditorDropActions() {
  const applyCommands = useSceneEditorStore((s) => s.applyCommands);
  const setSelectedIds = useSceneEditorStore((s) => s.setSelectedIds);

  const addImageAtPoint = useCallback(
    async (src: string, point: ScenePoint) => {
      const scene = useSceneEditorStore.getState().scene;
      if (!scene || !src) return;
      const size = (await getImageSize(src)) ?? {
        width: FALLBACK_IMAGE_WIDTH,
        height: FALLBACK_IMAGE_HEIGHT,
      };
      const fitted = fitImageSize(size.width, size.height);
      const x = clamp(
        point.x - fitted.width / 2,
        0,
        Math.max(0, scene.artboard.width - fitted.width),
      );
      const y = clamp(
        point.y - fitted.height / 2,
        0,
        Math.max(0, scene.artboard.height - fitted.height),
      );
      const nodeId = crypto.randomUUID();
      const node: SaraswatiImageNode = {
        id: nodeId,
        type: "image",
        parentId: scene.root,
        visible: true,
        x,
        y,
        width: fitted.width,
        height: fitted.height,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        originX: "left",
        originY: "top",
        src,
        cropX: 0,
        cropY: 0,
        clipPath: null,
      };
      applyCommands([{ type: "ADD_NODE", node }]);
      setSelectedIds([nodeId]);
    },
    [applyCommands, setSelectedIds],
  );

  const handleDropIntent = useCallback(
    async (intent: SceneDropIntent, point: ScenePoint) => {
      switch (intent.kind) {
        case "image-url": {
          await addImageAtPoint(intent.url, point);
          return;
        }
        case "image-files": {
          for (let index = 0; index < intent.files.length; index += 1) {
            const file = intent.files[index]!;
            if (!file.type.startsWith("image/")) continue;
            const dataUrl = await fileToDataUrl(file);
            await addImageAtPoint(dataUrl, {
              x: point.x + index * 24,
              y: point.y + index * 24,
            });
          }
          return;
        }
        case "vector-board": {
          const { documentId } = useSceneEditorStore.getState();
          if (!documentId) return;
          try {
            const docs = await loadVectorBoardDocs(documentId);
            const doc = docs[intent.boardId];
            if (!doc || !vectorDocHasRenderableStrokes(doc)) return;

            const RENDER_W = 640;
            const RENDER_H = 480;
            const offscreen = document.createElement("canvas");
            offscreen.width = RENDER_W;
            offscreen.height = RENDER_H;
            const ctx = offscreen.getContext("2d");
            if (!ctx) return;
            renderVectorBoardDocumentTransparent(ctx, doc, RENDER_W, RENDER_H);
            const dataUrl = offscreen.toDataURL("image/png");
            await addImageAtPoint(dataUrl, point);
          } catch {
            // Silently drop on load/render errors.
          }
          return;
        }
      }
    },
    [addImageAtPoint],
  );

  return { handleDropIntent };
}
