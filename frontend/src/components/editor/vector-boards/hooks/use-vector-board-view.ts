import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampViewScale,
  fitBoardView,
  fitBoundsView,
  panView,
  zoomViewAt,
  type VectorBoardDocument,
  type VectorBounds,
  type VectorViewport,
} from "@/lib/avnac-vector";

type Args = {
  open: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  docRef: React.MutableRefObject<VectorBoardDocument>;
  requestPaint: () => void;
};

export type VectorBoardViewState = {
  view: VectorViewport;
  viewRef: React.MutableRefObject<VectorViewport>;
  setView: (next: VectorViewport, userAction?: boolean) => void;
  fitView: () => void;
  resetView: () => void;
  zoomAt: (clientX: number, clientY: number, factor: number) => void;
  zoomAtCenter: (factor: number) => void;
  fitBounds: (bounds: VectorBounds) => void;
  panTo: (tx: number, ty: number) => void;
  zoomPercent: number;
};

export function useVectorBoardView({
  open,
  canvasRef,
  docRef,
  requestPaint,
}: Args): VectorBoardViewState {
  const [view, setViewState] = useState<VectorViewport>({ scale: 1, tx: 0, ty: 0 });
  const viewRef = useRef<VectorViewport>(view);
  viewRef.current = view;
  const userAdjustedRef = useRef(false);

  const apply = useCallback(
    (next: VectorViewport, userAction = false) => {
      if (userAction) userAdjustedRef.current = true;
      viewRef.current = next;
      setViewState(next);
      requestPaint();
    },
    [requestPaint],
  );

  const fitView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    userAdjustedRef.current = false;
    apply(fitBoardView(docRef.current.size, rect.width, rect.height, 28));
  }, [apply, canvasRef, docRef]);

  const resetView = useCallback(() => {
    apply({ scale: 1, tx: 0, ty: 0 }, true);
  }, [apply]);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      apply(zoomViewAt(viewRef.current, localX, localY, factor), true);
    },
    [apply, canvasRef],
  );

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },
    [canvasRef, zoomAt],
  );

  const fitBounds = useCallback(
    (bounds: VectorBounds) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      apply(fitBoundsView(bounds, rect.width, rect.height, 32, 8), true);
    },
    [apply, canvasRef],
  );

  const panTo = useCallback(
    (tx: number, ty: number) => {
      apply(panView(viewRef.current, tx - viewRef.current.tx, ty - viewRef.current.ty), true);
    },
    [apply],
  );

  // Fit on open, after layout has settled.
  useEffect(() => {
    if (!open) return;
    userAdjustedRef.current = false;
    const raf = requestAnimationFrame(() => {
      fitView();
      requestPaint();
    });
    return () => cancelAnimationFrame(raf);
  }, [open, fitView, requestPaint]);

  // Keep the board fitted on resize until the user zooms/pans. Geometry is
  // never touched: only the view transform changes (R2).
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      if (!userAdjustedRef.current) fitView();
      else requestPaint();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [open, canvasRef, fitView, requestPaint]);

  // Wheel: ctrl/cmd zooms, plain wheel pans.
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * 0.01);
        zoomAt(event.clientX, event.clientY, factor);
      } else {
        apply(
          panView(viewRef.current, -event.deltaX, -event.deltaY),
          true,
        );
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [open, canvasRef, zoomAt, apply]);

  // Keep the zoom in range if the board changes.
  useEffect(() => {
    if (view.scale === clampViewScale(view.scale)) return;
    apply({ ...view, scale: clampViewScale(view.scale) });
  }, [view, apply]);

  return {
    view,
    viewRef,
    setView: apply,
    fitView,
    resetView,
    zoomAt,
    zoomAtCenter,
    fitBounds,
    panTo,
    zoomPercent: Math.round(view.scale * 100),
  };
}
