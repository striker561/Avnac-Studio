import type { RefObject } from "react";
import type { VectorBoardSize } from "@/lib/avnac-vector";
import type { VectorBoardEditorState } from "./hooks/use-vector-board-editor";

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  editor: VectorBoardEditorState;
  boardSize: VectorBoardSize;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitView: () => void;
};

export default function VectorBoardCanvas({
  canvasRef,
  editor,
  boardSize,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitView,
}: Props) {
  const { stats, lastFit } = editor;
  return (
    <div className="relative min-h-0 flex-1 bg-neutral-200/40">
      <canvas
        ref={canvasRef}
        data-testid="vector-board-canvas"
        data-vector-strokes={stats.strokes}
        data-vector-anchors={stats.anchors}
        data-vector-selection={stats.selected}
        data-vector-node-edit={editor.nodeEditActive ? "true" : "false"}
        data-vector-last-fit-nodes={lastFit?.nodes ?? ""}
        data-vector-last-fit-samples={lastFit?.samples ?? ""}
        data-vector-zoom={zoomPercent}
        className="block h-full w-full max-w-none touch-none outline-none"
        aria-label="Vector drawing canvas"
        tabIndex={0}
        style={{ touchAction: "none" }}
        onPointerDown={editor.handlers.onPointerDown}
        onPointerMove={editor.handlers.onPointerMove}
        onPointerUp={editor.handlers.onPointerUp}
        onPointerCancel={editor.handlers.onPointerCancel}
        onDoubleClick={editor.handlers.onDoubleClick}
        onPointerLeave={editor.handlers.onPointerLeave}
        onContextMenu={editor.handlers.onContextMenu}
      />

      <div
        data-testid="vector-board-status"
        className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-black/[0.08] bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 shadow-sm backdrop-blur-sm"
      >
        <span>
          {stats.strokes} {stats.strokes === 1 ? "stroke" : "strokes"}
        </span>
        <span aria-hidden>·</span>
        <span>
          {stats.anchors} {stats.anchors === 1 ? "node" : "nodes"}
        </span>
        <span aria-hidden>·</span>
        <span>
          {stats.selected} selected
        </span>
        {lastFit ? (
          <>
            <span aria-hidden>·</span>
            <span data-testid="vector-board-fit-stat">
              fitted {lastFit.nodes} nodes / {lastFit.samples} samples
            </span>
          </>
        ) : null}
        {editor.nodeEditActive ? (
          <>
            <span aria-hidden>·</span>
            <span className="text-[var(--accent)]">node edit</span>
          </>
        ) : null}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-black/[0.08] bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-600 shadow-sm backdrop-blur-sm">
        {boardSize.width} × {boardSize.height}
      </div>

      <div className="pointer-events-auto absolute bottom-3 left-3 flex items-center gap-1 rounded-md border border-black/[0.08] bg-white/90 px-1 py-1 text-[11px] text-neutral-600 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          className="rounded px-1.5 py-0.5 hover:bg-black/[0.06]"
          title="Zoom out"
          aria-label="Zoom out"
          onClick={onZoomOut}
        >
          −
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 tabular-nums hover:bg-black/[0.06]"
          title="Reset zoom to 100%"
          aria-label="Reset zoom to 100%"
          onClick={onResetView}
        >
          1:1
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 hover:bg-black/[0.06]"
          title="Fit board to viewport"
          aria-label="Fit board to viewport"
          onClick={onFitView}
        >
          Fit
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 hover:bg-black/[0.06]"
          title="Zoom in"
          aria-label="Zoom in"
          onClick={onZoomIn}
        >
          +
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-black/[0.08] bg-white/90 px-2 py-1 text-[11px] font-medium tabular-nums text-neutral-600 shadow-sm backdrop-blur-sm">
        {zoomPercent}%
      </div>

      {editor.nodeEditActive ? (
        <div className="pointer-events-none absolute bottom-12 left-3 rounded-md border border-black/[0.08] bg-white/90 px-2 py-1 text-[11px] text-neutral-500 shadow-sm backdrop-blur-sm">
          Drag nodes and handles · Alt-click a node to delete with refit · Esc to exit
        </div>
      ) : null}
    </div>
  );
}
