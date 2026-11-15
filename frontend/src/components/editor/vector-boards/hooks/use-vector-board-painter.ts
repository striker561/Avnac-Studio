import { useCallback, useEffect, useRef } from "react";
import {
  chooseCachePixelRatio,
  createLayerCache,
  drawLayerCaches,
  paintBoardSurface,
  paintFreehandDraft,
  paintMarquee,
  paintPenDraft,
  paintPenEditOverlay,
  paintShapeDraft,
  paintSelectionHandles,
  paintSnapGuides,
  paintVectorStroke,
  selectionBounds,
  type VectorBoardDocument,
} from "@/lib/avnac-vector";
import type { VectorBoardPaintState } from "./vector-board-paint-state";

export type VectorBoardPaintStats = {
  ms: number;
  layers: number;
  cacheRepaints: number;
  cachePixels: number;
};

type Args = {
  open: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  paintStateRef: React.MutableRefObject<VectorBoardPaintState>;
  onStats?: (stats: VectorBoardPaintStats) => void;
};

export type VectorBoardPainterState = {
  requestPaint: () => void;
  invalidateCache: () => void;
  paintNow: () => void;
};

/**
 * rAF-coalesced painter with per-layer board-space caches.
 *
 * - The backing store is only resized when CSS size or DPR actually changes.
 * - During a drag the base document (with the dragged strokes removed) is
 *   cached; only the dragged strokes are re-stroked on top of it.
 */
export function useVectorBoardPainter({
  open,
  canvasRef,
  paintStateRef,
  onStats,
}: Args): VectorBoardPainterState {
  const rafRef = useRef<number | null>(null);
  const cacheRef = useRef(createLayerCache());
  const surfaceRef = useRef<{
    canvas: HTMLCanvasElement;
    key: string;
  } | null>(null);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const targetWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const targetHeight = Math.max(1, Math.floor(cssHeight * dpr));
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const start = performance.now();
    const state = paintStateRef.current;
    const view = state.viewRef.current;
    const live = state.liveEditRef.current;
    const doc = live ? live.liveDoc : state.docRef.current;
    const cache = cacheRef.current;
    const pixelRatio = chooseCachePixelRatio({
      boardWidth: doc.size.width,
      boardHeight: doc.size.height,
      viewScale: view.scale,
      devicePixelRatio: dpr,
    });

    // The board surface (backdrop + grid + border) only changes when the
    // viewport or view changes, not on every pointermove. Cache it separately.
    const surfaceKey =
      `${cssWidth}x${cssHeight}@${dpr}|${doc.size.width}x${doc.size.height}|` +
      `${view.scale.toFixed(6)}|${view.tx.toFixed(2)}|${view.ty.toFixed(2)}`;
    if (!surfaceRef.current || surfaceRef.current.key !== surfaceKey) {
      const surface = surfaceRef.current?.canvas ?? document.createElement("canvas");
      surface.width = targetWidth;
      surface.height = targetHeight;
      const surfaceCtx = surface.getContext("2d");
      if (surfaceCtx) {
        surfaceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintBoardSurface(surfaceCtx, doc.size, view, cssWidth, cssHeight);
        surfaceCtx.setTransform(1, 0, 0, 1, 0, 0);
      }
      surfaceRef.current = { canvas: surface, key: surfaceKey };
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (surfaceRef.current) ctx.drawImage(surfaceRef.current.canvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (live) {
      cache.sync(live.baseDoc, pixelRatio);
      const w = doc.size.width * view.scale;
      const h = doc.size.height * view.scale;
      for (const layer of live.baseDoc.layers) {
        if (!layer.visible) continue;
        const entry = cache.get(layer.id);
        if (!entry) continue;
        ctx.drawImage(entry.canvas, view.tx, view.ty, w, h);
        const liveLayer = live.liveDoc.layers.find((l) => l.id === layer.id);
        if (!liveLayer) continue;
        const selected = new Set(
          live.selections
            .filter((s) => s.layerId === layer.id)
            .map((s) => s.strokeId),
        );
        if (selected.size === 0) continue;
        ctx.save();
        ctx.translate(view.tx, view.ty);
        ctx.scale(view.scale, view.scale);
        for (const stroke of liveLayer.strokes) {
          if (selected.has(stroke.id)) paintVectorStroke(ctx, stroke);
        }
        ctx.restore();
      }
    } else {
      cache.sync(doc, pixelRatio);
      drawLayerCaches(ctx, cache, doc, view);
    }

    const selection = state.selectionRef.current;
    const draft = state.draftRef.current;
    const penEdit = state.penEditRef.current;
    if (!draft && !penEdit) {
      const bounds = selectionBounds(doc, selection);
      if (bounds) paintSelectionHandles(ctx, bounds, view);
    }
    const marquee = state.marqueeRef.current;
    if (marquee) paintMarquee(ctx, marquee, view);

    const style = state.styleRef.current;
    if (draft) {
      if (draft.kind === "freehand") {
        paintFreehandDraft(
          ctx,
          draft.points,
          view,
          style.strokeColor,
          style.strokeWidth,
        );
      } else if (draft.kind === "shape") {
        paintShapeDraft(ctx, draft, view, style.fillEnabled ? style.fillColor : "");
      } else {
        paintPenDraft(ctx, draft, view, {
          strokeColor: style.strokeEnabled ? style.strokeColor : "",
          strokeWidth: style.strokeWidth,
          fillColor: style.fillEnabled ? style.fillColor : "",
          closeHover: draft.closeHover,
          removeHintIndex: draft.removeHintIndex,
          selectedAnchor: draft.selectedAnchor,
        });
      }
    }

    if (penEdit) {
      paintPenEditOverlay(
        ctx,
        {
          anchors: penEdit.anchors,
          closed: penEdit.closed,
          selectedAnchor: penEdit.selectedAnchor,
          addHint: penEdit.addHint,
        },
        view,
      );
    }

    paintSnapGuides(ctx, state.snapGuidesRef.current, view);

    const stats = cache.stats();
    onStatsRef.current?.({
      ms: performance.now() - start,
      layers: stats.layers,
      cacheRepaints: stats.repaints,
      cachePixels: stats.pixels,
    });
  }, [canvasRef, paintStateRef]);

  const requestPaint = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      paint();
    });
  }, [paint]);

  const paintNow = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    paint();
  }, [paint]);

  useEffect(() => {
    if (!open) return;
    requestPaint();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => requestPaint());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [open, canvasRef, requestPaint]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    requestPaint,
    paintNow,
    invalidateCache: () => {
      cacheRef.current.clear();
      requestPaint();
    },
  };
}

/** Exposed for tests and the status bar; not used by the paint loop. */
export function documentNodeCount(doc: VectorBoardDocument): number {
  let total = 0;
  for (const layer of doc.layers) {
    for (const stroke of layer.strokes) {
      total += stroke.penAnchors?.length ?? stroke.points.length;
    }
  }
  return total;
}
