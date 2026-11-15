import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addLayer,
  clearLayer,
  deleteLayer,
  emptyVectorBoardDocument,
  moveLayer,
  setActiveLayer,
  setLayerVisible,
  vectorBoardDocumentToSvg,
  vectorDocHasRenderableStrokes,
  type VectorBoardDocument,
  type VectorBounds,
  type VectorSelection,
} from "@/lib/avnac-vector";
import VectorBoardCanvas from "./vector-board-canvas";
import VectorBoardLayersPanel from "./vector-board-layers-panel";
import VectorBoardToolbar from "./vector-board-toolbar";
import { useVectorBoardDocument } from "./hooks/use-vector-board-document";
import { useVectorBoardEditor } from "./hooks/use-vector-board-editor";
import {
  useVectorBoardPainter,
  type VectorBoardPaintStats,
} from "./hooks/use-vector-board-painter";
import { useVectorBoardView } from "./hooks/use-vector-board-view";
import type {
  EditorDraft,
  PaintStyle,
  PenEditVisual,
  VectorBoardEditorRefs,
  VectorBoardPaintState,
} from "./hooks/vector-board-paint-state";

type VectorBoardDebugApi = {
  getDoc: () => VectorBoardDocument;
  getView: () => { scale: number; tx: number; ty: number };
  getSelection: () => VectorSelection[];
  getPenEdit: () => PenEditVisual | null;
  getDraft: () => EditorDraft | null;
  getSvg: () => string;
  getHistoryStats: () => {
    entries: number;
    bytes: number;
    index: number;
    maxEntries: number;
    maxBytes: number;
  };
  getPaintStats: () => VectorBoardPaintStats | null;
  selectStrokes: (selections: VectorSelection[]) => void;
  setStrokeWidth: (width: number) => void;
  beginStyleInteraction: () => void;
  endStyleInteraction: () => void;
};

declare global {
  interface Window {
    __avnacVectorBoard?: VectorBoardDebugApi;
  }
}

type Props = {
  open: boolean;
  boardId: string;
  boardName: string;
  document: VectorBoardDocument;
  onDocumentChange: (doc: VectorBoardDocument) => void;
  onSave: (doc: VectorBoardDocument) => void;
  onSaveAndPlace: (doc: VectorBoardDocument) => void;
  onClose: () => void;
};

export default function VectorBoardWorkspace({
  open,
  boardId,
  boardName,
  document,
  onDocumentChange,
  onSave,
  onSaveAndPlace,
  onClose,
}: Props) {
  const [saveSplitOpen, setSaveSplitOpen] = useState(false);
  const saveSplitRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintRequestRef = useRef<() => void>(() => {});

  const stableRequestPaint = useCallback(() => {
    paintRequestRef.current();
  }, []);

  const docState = useVectorBoardDocument({
    open,
    document,
    onDocumentChange,
  });

  const viewState = useVectorBoardView({
    open,
    canvasRef,
    docRef: docState.docRef,
    requestPaint: stableRequestPaint,
  });

  const selectionRef = useRef<VectorSelection[]>([]);
  const marqueeRef = useRef<VectorBounds | null>(null);
  const draftRef = useRef<EditorDraft | null>(null);
  const penEditRef = useRef<PenEditVisual | null>(null);
  const snapGuidesRef = useRef<NonNullable<VectorBoardPaintState["snapGuidesRef"]["current"]>>([]);
  const snapHighlightRef = useRef<NonNullable<VectorBoardPaintState["snapHighlightRef"]["current"]>>(null);
  const styleRef = useRef<PaintStyle>({
    strokeColor: "#1a1a1a",
    strokeWidth: 2,
    fillColor: "#94a3b8",
    fillEnabled: true,
    strokeEnabled: true,
  });

  const editorRefs = useMemo<VectorBoardEditorRefs>(
    () => ({
      selectionRef,
      marqueeRef,
      draftRef,
      penEditRef,
      snapGuidesRef,
      snapHighlightRef,
      styleRef,
    }),
    // Every entry is a stable ref.
    [],
  );

  const paintStateRef = useRef<VectorBoardPaintState>({
    docRef: docState.docRef,
    liveEditRef: docState.liveEditRef,
    viewRef: viewState.viewRef,
    selectionRef,
    marqueeRef,
    draftRef,
    penEditRef,
    snapGuidesRef,
    styleRef,
    snapHighlightRef,
  });

  const lastPaintStatsRef = useRef<VectorBoardPaintStats | null>(null);
  const painter = useVectorBoardPainter({
    open,
    canvasRef,
    paintStateRef,
    onStats: (stats) => {
      lastPaintStatsRef.current = stats;
    },
  });

  useEffect(() => {
    paintRequestRef.current = painter.requestPaint;
  }, [painter.requestPaint]);

  const editorFlushRef = useRef<() => void>(() => {});
  const handleRequestClose = useCallback(() => {
    editorFlushRef.current();
    onClose();
  }, [onClose]);

  const editor = useVectorBoardEditor({
    open,
    canvasRef,
    docState,
    viewState,
    refs: editorRefs,
    requestPaint: painter.requestPaint,
    onRequestClose: handleRequestClose,
  });

  useEffect(() => {
    editorFlushRef.current = editor.flushStyleEdit;
  }, [editor.flushStyleEdit]);

  // Any document action (clear, layer change, save) first commits a pending
  // paint-control edit so it is not discarded or split across two undo steps.
  const runDocAction = useCallback(
    (makeNext: (current: VectorBoardDocument) => VectorBoardDocument) => {
      editor.flushStyleEdit();
      docState.commit(makeNext(docState.docRef.current));
    },
    [docState, editor],
  );

  // Clearing discards the objects being edited, so there is no reason to pay
  // for a style commit or a stale draft; cancel them first.
  const runClearAction = useCallback(
    (makeNext: (current: VectorBoardDocument) => VectorBoardDocument) => {
      editor.cancelStyleEdit();
      editor.cancelDraft();
      editor.selectStrokes([]);
      docState.commit(makeNext(docState.docRef.current));
    },
    [docState, editor],
  );

  useEffect(() => {
    if (!open) setSaveSplitOpen(false);
  }, [open]);

  useEffect(() => {
    if (!saveSplitOpen) return;
    const onDown = (event: MouseEvent) => {
      if (saveSplitRef.current?.contains(event.target as Node)) return;
      setSaveSplitOpen(false);
    };
    window.document.addEventListener("mousedown", onDown);
    return () => window.document.removeEventListener("mousedown", onDown);
  }, [saveSplitOpen]);

  // Development-only inspection hook for Playwright and manual debugging. It
  // is compiled out of production builds by the Vite DEV flag.
  useEffect(() => {
    if (!import.meta.env.DEV || !open) return;
    const api: VectorBoardDebugApi = {
      getDoc: () => docState.docRef.current,
      getView: () => viewState.viewRef.current,
      getSelection: () => editorRefs.selectionRef.current,
      getPenEdit: () => editorRefs.penEditRef.current,
      getDraft: () => editorRefs.draftRef.current,
      getSvg: () => vectorBoardDocumentToSvg(docState.docRef.current),
      getHistoryStats: () => docState.getHistoryStats(),
      getPaintStats: () => lastPaintStatsRef.current,
      selectStrokes: editor.selectStrokes,
      setStrokeWidth: editor.setStrokeWidth,
      beginStyleInteraction: editor.beginStyleInteraction,
      endStyleInteraction: editor.endStyleInteraction,
    };
    window.__avnacVectorBoard = api;
    return () => {
      if (window.__avnacVectorBoard === api) delete window.__avnacVectorBoard;
    };
  }, [
    open,
    docState.docRef,
    viewState.viewRef,
    editorRefs,
    editor.selectStrokes,
    editor.setStrokeWidth,
    editor.beginStyleInteraction,
    editor.endStyleInteraction,
  ]);

  if (!open) return null;

  const doc = docState.doc;
  const activeLayer = doc.layers.find((layer) => layer.id === doc.activeLayerId) ?? doc.layers[0]!;
  const canPlace = vectorDocHasRenderableStrokes(doc);

  return (
    <div
      data-avnac-chrome
      data-testid="vector-board-workspace"
      data-avnac-modal-keyboard="true"
      data-board-id={boardId}
      data-vector-strokes={docState.stats.strokes}
      data-vector-anchors={docState.stats.anchors}
      className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={boardName}
      onClick={handleRequestClose}
    >
      <div
        className="flex h-[min(92vh,960px)] w-[min(97vw,1480px)] overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <VectorBoardLayersPanel
          doc={doc}
          onSetActive={(layerId) => runDocAction((current) => setActiveLayer(current, layerId))}
          onAdd={() => runDocAction((current) => addLayer(current))}
          onDelete={(layerId) => runDocAction((current) => deleteLayer(current, layerId))}
          onMove={(layerId, direction) =>
            runDocAction((current) => moveLayer(current, layerId, direction))
          }
          onToggleVisible={(layerId, visible) =>
            runDocAction((current) => setLayerVisible(current, layerId, visible))
          }
          onClearLayer={(layerId) =>
            runClearAction((current) => clearLayer(current, layerId))
          }
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="m-0 min-w-0 truncate text-base font-semibold text-neutral-900">
                {boardName}
              </h2>
              <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Vector
              </span>
              <span className="hidden text-[11px] text-neutral-400 sm:inline">
                {doc.size.width} × {doc.size.height} · {activeLayer.name}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-black/[0.05] disabled:opacity-40"
                onClick={() =>
                  runClearAction((current) => clearLayer(current, activeLayer.id))
                }
                disabled={activeLayer.strokes.length === 0}
              >
                Clear layer
              </button>
              <button
                type="button"
                className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-black/[0.05] disabled:opacity-40"
                onClick={() =>
                  runClearAction((current) => emptyVectorBoardDocument(current.size))
                }
                disabled={docState.stats.strokes === 0}
              >
                Clear all
              </button>
              <div className="mx-1 h-5 w-px bg-black/10" />
              <div ref={saveSplitRef} className="relative">
                <div className="flex h-8 overflow-hidden rounded-lg">
                  <button
                    type="button"
                    className="flex items-center justify-center bg-neutral-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-neutral-800"
                    onClick={() => {
                      editor.flushStyleEdit();
                      setSaveSplitOpen(false);
                      onSave(docState.docRef.current);
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="flex w-8 items-center justify-center border-l border-white/20 bg-neutral-900 text-white transition-colors hover:bg-neutral-800"
                    aria-expanded={saveSplitOpen}
                    aria-haspopup="menu"
                    title="More save options"
                    aria-label="More save options"
                    onClick={() => setSaveSplitOpen((value) => !value)}
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.75} />
                  </button>
                </div>
                {saveSplitOpen ? (
                  <div
                    className="absolute right-0 top-full z-[80] mt-1 min-w-[15rem] rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!canPlace}
                      className={[
                        "flex w-full px-3 py-2 text-left text-[13px] font-medium transition-colors",
                        canPlace
                          ? "text-neutral-800 hover:bg-black/[0.05]"
                          : "cursor-not-allowed text-neutral-400",
                      ].join(" ")}
                      onClick={() => {
                        if (!canPlace) return;
                        editor.flushStyleEdit();
                        setSaveSplitOpen(false);
                        onSaveAndPlace(docState.docRef.current);
                      }}
                    >
                      Save and place on canvas
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-black/[0.05]"
                onClick={handleRequestClose}
                aria-label="Close vector workspace"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.75} />
              </button>
            </div>
          </header>

          <div className="flex shrink-0 flex-col gap-2 border-b border-black/[0.06] bg-[linear-gradient(180deg,rgba(250,250,249,0.9)_0%,rgba(255,255,255,0.5)_100%)] px-4 py-2.5">
            <VectorBoardToolbar editor={editor} />
          </div>

          <VectorBoardCanvas
            canvasRef={canvasRef}
            editor={editor}
            boardSize={doc.size}
            zoomPercent={viewState.zoomPercent}
            onZoomIn={() => viewState.zoomAtCenter(1.2)}
            onZoomOut={() => viewState.zoomAtCenter(1 / 1.2)}
            onResetView={viewState.resetView}
            onFitView={viewState.fitView}
          />
        </div>
      </div>
    </div>
  );
}

export type { VectorBoardDocument };
