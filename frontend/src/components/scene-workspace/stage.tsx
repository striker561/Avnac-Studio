import type { RendererBackend } from "@/lib/renderer";
import { canvas2DRendererBackend } from "@/lib/renderer";
import {
  createContentPaintScheduler,
  EMPTY_RENDER_PAINT_STATS,
  type RenderPaintStats,
} from "@/lib/renderer/paint-scheduler";
import {
  buildArtboardRenderCommand,
  buildRenderCommands,
  type SaraswatiScene,
} from "@/lib/saraswati";
import type {
  SaraswatiGuideLine,
  SaraswatiMeasurement,
} from "@/lib/editor/overlays";
import { getRenderableNodeBounds } from "@/lib/editor/overlays";
import type { SaraswatiResizeHandle } from "@/lib/saraswati/commands/types";
import type { SaraswatiBounds } from "@/lib/saraswati/spatial";
import { useEffect, useMemo, useRef } from "react";

export type SceneWorkspaceRenderStats = RenderPaintStats;

export const EMPTY_SCENE_WORKSPACE_RENDER_STATS = EMPTY_RENDER_PAINT_STATS;

type Props = {
  scene: SaraswatiScene;
  backend?: RendererBackend<CanvasRenderingContext2D>;
  className?: string;
  viewScale?: number;
  interactive?: boolean;
  selectedIds?: readonly string[];
  hiddenNodeIds?: readonly string[];
  lockedIds?: readonly string[];
  onScenePointerDown?: (
    pointerId: number,
    x: number,
    y: number,
    options?: { additive?: boolean },
  ) => void;
  onScenePointerMove?: (
    pointerId: number,
    x: number,
    y: number,
    options?: { shiftKey?: boolean },
  ) => void;
  onScenePointerUp?: (pointerId: number) => void;
  onScenePointerLeave?: () => void;
  onSceneDoubleClick?: (x: number, y: number) => void;
  onHandlePointerDown?: (
    pointerId: number,
    nodeId: string,
    handle: SaraswatiResizeHandle,
    startBounds: SaraswatiBounds,
    x: number,
    y: number,
  ) => void;
  onRotateHandlePointerDown?: (
    pointerId: number,
    nodeId: string,
    bounds: SaraswatiBounds,
    x: number,
    y: number,
  ) => void;
  onCurveHandlePointerDown?: (
    pointerId: number,
    nodeId: string,
    startBulge: number,
    startT: number,
    length: number,
    x: number,
    y: number,
  ) => void;
  onRenderStats?: (stats: SceneWorkspaceRenderStats) => void;
  hoveredId?: string | null;
  guides?: readonly SaraswatiGuideLine[];
  measurement?: SaraswatiMeasurement | null;
  marqueeBounds?: SaraswatiBounds | null;
  interactionCursor?: string | null;
};

// Handle positions: {id, cx, cy} as fractions of the bounding box (0=left/top, 1=right/bottom)
const HANDLES: {
  id: SaraswatiResizeHandle;
  cx: number;
  cy: number;
  cursor: string;
}[] = [
  { id: "nw", cx: 0, cy: 0, cursor: "nwse-resize" },
  { id: "n", cx: 0.5, cy: 0, cursor: "ns-resize" },
  { id: "ne", cx: 1, cy: 0, cursor: "nesw-resize" },
  { id: "e", cx: 1, cy: 0.5, cursor: "ew-resize" },
  { id: "se", cx: 1, cy: 1, cursor: "nwse-resize" },
  { id: "s", cx: 0.5, cy: 1, cursor: "ns-resize" },
  { id: "sw", cx: 0, cy: 1, cursor: "nesw-resize" },
  { id: "w", cx: 0, cy: 0.5, cursor: "ew-resize" },
];

export default function SceneWorkspaceStage({
  scene,
  backend = canvas2DRendererBackend,
  className,
  viewScale = 1,
  interactive = false,
  selectedIds = [],
  hiddenNodeIds = [],
  lockedIds = [],
  onScenePointerDown,
  onScenePointerMove,
  onScenePointerUp,
  onScenePointerLeave,
  onSceneDoubleClick,
  onHandlePointerDown,
  onRotateHandlePointerDown,
  onCurveHandlePointerDown,
  onRenderStats,
  hoveredId,
  guides = [],
  measurement,
  marqueeBounds,
  interactionCursor,
}: Props) {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentCanvasRef = useRef<HTMLCanvasElement>(null);
  const lockedIdSet = useMemo(() => new Set(lockedIds), [lockedIds]);
  const hiddenNodeIdSet = useMemo(
    () => new Set(hiddenNodeIds),
    [hiddenNodeIds],
  );
  const contentPaintSchedulerRef = useRef(createContentPaintScheduler());
  const handleSize = Math.max(8, Math.min(48, 10 / Math.max(0.2, viewScale)));
  const borderWidth = Math.max(1, Math.min(6, 2 / Math.max(0.25, viewScale)));
  const rotateHandleOffset = Math.max(
    16,
    Math.min(40, 20 / Math.max(0.25, viewScale)),
  );
  const overlayUiScale = Math.max(
    1,
    Math.min(3.25, 1 / Math.max(0.25, viewScale)),
  );
  const guideThickness = Math.max(
    1,
    Math.min(4, 1 / Math.max(0.25, viewScale)),
  );

  const lineCurveHandles = useMemo(() => {
    const items: Array<{
      nodeId: string;
      cpX: number;
      cpY: number;
      midX: number;
      midY: number;
      curveBulge: number;
      curveT: number;
      length: number;
    }> = [];
    for (const nodeId of selectedIds) {
      const node = scene.nodes[nodeId];
      if (!node || node.type !== "line" || lockedIdSet.has(nodeId)) continue;
      const dx = node.x2 - node.x1;
      const dy = node.y2 - node.y1;
      const length = Math.hypot(dx, dy);
      if (length <= 0) continue;
      const t = Number.isFinite(node.curveT) ? node.curveT : 0.5;
      const bulge = Number.isFinite(node.curveBulge) ? node.curveBulge : 0;
      const midX = node.x1 + t * dx;
      const midY = node.y1 + t * dy;
      const perpX = -dy / length;
      const perpY = dx / length;
      items.push({
        nodeId,
        cpX: midX + bulge * perpX,
        cpY: midY + bulge * perpY,
        midX,
        midY,
        curveBulge: bulge,
        curveT: t,
        length,
      });
    }
    return items;
  }, [lockedIdSet, scene, selectedIds]);

  const selectedBounds = useMemo(() => {
    const lineControlPadding = Math.max(
      10,
      Math.min(40, 18 / Math.max(0.25, viewScale)),
    );
    const result: Array<{
      id: string;
      bounds: SaraswatiBounds;
      controlBounds: SaraswatiBounds;
      isLine: boolean;
    }> = [];
    for (const id of selectedIds) {
      if (hiddenNodeIdSet.has(id)) continue;
      const bounds = getRenderableNodeBounds(scene, id);
      if (!bounds) continue;
      const node = scene.nodes[id];
      const isLine = node?.type === "line";
      const controlBounds = isLine
        ? {
            x: bounds.x - lineControlPadding,
            y: bounds.y - lineControlPadding,
            width: bounds.width + lineControlPadding * 2,
            height: bounds.height + lineControlPadding * 2,
          }
        : bounds;
      result.push({ id, bounds, controlBounds, isLine });
    }
    return result;
  }, [hiddenNodeIdSet, scene, selectedIds, viewScale]);

  const rotationAnchors = useMemo(() => {
    const anchors = new Map<
      string,
      {
        x: number;
        y: number;
        connectorTop: number;
        connectorHeight: number;
      }
    >();

    for (const { id, bounds, controlBounds } of selectedBounds) {
      const node = scene.nodes[id];
      if (!node) continue;
      const centerX = bounds.x + bounds.width / 2;
      const handleY = controlBounds.y - rotateHandleOffset;
      const connectorTop = Math.min(handleY, controlBounds.y);
      const connectorHeight = Math.max(1, controlBounds.y - handleY);

      anchors.set(id, {
        x: centerX,
        y: handleY,
        connectorTop,
        connectorHeight,
      });
    }

    return anchors;
  }, [rotateHandleOffset, scene.nodes, selectedBounds]);

  const hoveredBounds = useMemo(() => {
    if (!hoveredId || selectedIds.includes(hoveredId)) return null;
    if (hiddenNodeIdSet.has(hoveredId)) return null;
    // Use getRenderableNodeBounds so hover highlights work for group nodes too.
    return getRenderableNodeBounds(scene, hoveredId);
  }, [hiddenNodeIdSet, hoveredId, scene, selectedIds]);

  const toScenePoint = useMemo(() => {
    return (clientX: number, clientY: number) => {
      const canvas = contentCanvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * scene.artboard.width,
        y: ((clientY - rect.top) / rect.height) * scene.artboard.height,
      };
    };
  }, [scene.artboard.height, scene.artboard.width]);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const syncCanvas = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      canvas.width = Math.max(1, Math.round(scene.artboard.width * dpr));
      canvas.height = Math.max(1, Math.round(scene.artboard.height * dpr));
      canvas.style.width = `${scene.artboard.width}px`;
      canvas.style.height = `${scene.artboard.height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncCanvas(backgroundCanvasRef.current);
    syncCanvas(contentCanvasRef.current);
  }, [scene.artboard.height, scene.artboard.width]);

  useEffect(() => {
    let cancelled = false;
    let frameId = 0;

    const paintBackground = async () => {
      if (cancelled) return;
      const canvas = backgroundCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, scene.artboard.width, scene.artboard.height);
      const bgCommand = buildArtboardRenderCommand(scene);
      if (!bgCommand) return;
      await backend.render(ctx, [bgCommand]);
    };

    frameId = window.requestAnimationFrame(() => {
      void paintBackground();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [backend, scene.artboard.bg, scene.artboard.height, scene.artboard.width]);

  useEffect(() => {
    let cancelled = false;
    let frameId = 0;

    async function paint() {
      if (cancelled) return;
      const canvas = contentCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const commands = buildRenderCommands(scene)
        .slice(1)
        .filter((command) => !hiddenNodeIdSet.has(command.id));

      const presentationKey = `${scene.artboard.width}x${scene.artboard.height}|${[...hiddenNodeIdSet].sort().join(",")}`;
      const result = await contentPaintSchedulerRef.current.paintContent({
        target: ctx,
        commands,
        artboardWidth: scene.artboard.width,
        artboardHeight: scene.artboard.height,
        presentationKey,
        backend,
      });

      if (!cancelled) {
        onRenderStats?.(result.stats);
      }

      if (cancelled) return;
    }

    frameId = window.requestAnimationFrame(() => {
      void paint();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [backend, hiddenNodeIdSet, onRenderStats, scene]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const point = toScenePoint(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onScenePointerDown?.(event.pointerId, point.x, point.y, {
      additive: event.shiftKey || event.metaKey || event.ctrlKey,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const point = toScenePoint(event.clientX, event.clientY);
    if (!point) return;
    onScenePointerMove?.(event.pointerId, point.x, point.y, {
      shiftKey: event.shiftKey,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onScenePointerUp?.(event.pointerId);
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const point = toScenePoint(event.clientX, event.clientY);
    if (!point) return;
    onSceneDoubleClick?.(point.x, point.y);
  };

  return (
    <div
      className={[
        "relative inline-flex overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <canvas
        ref={backgroundCanvasRef}
        className="pointer-events-none absolute inset-0"
      />
      <canvas
        ref={contentCanvasRef}
        onPointerDown={interactive ? handlePointerDown : undefined}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerUp={interactive ? handlePointerUp : undefined}
        onPointerCancel={interactive ? handlePointerUp : undefined}
        onPointerLeave={interactive ? onScenePointerLeave : undefined}
        onDoubleClick={interactive ? handleDoubleClick : undefined}
        className={["relative z-[1]", interactive ? "cursor-default" : ""]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...(interactionCursor ? { cursor: interactionCursor } : {}),
          ...(interactive
            ? {
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "none",
              }
            : {}),
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-2"
        style={{ clipPath: "inset(0 round 1.25rem)" }}
      >
        {guides.map((guide, index) =>
          guide.axis === "x" ? (
            <div
              key={`x-${guide.position}-${index}`}
              className="absolute inset-y-0 bg-fuchsia-500/75"
              style={{
                left: `${guide.position}px`,
                width: `${guideThickness}px`,
              }}
            />
          ) : (
            <div
              key={`y-${guide.position}-${index}`}
              className="absolute inset-x-0 bg-fuchsia-500/75"
              style={{
                top: `${guide.position}px`,
                height: `${guideThickness}px`,
              }}
            />
          ),
        )}

        {guides.length > 0 ? (
          <div
            className="absolute rounded-md border border-sky-300/60 bg-sky-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
            style={{
              left: "12px",
              top: "12px",
              transform: `scale(${overlayUiScale})`,
              transformOrigin: "top left",
            }}
          >
            Snap
          </div>
        ) : null}

        {hoveredBounds ? (
          <div
            className="absolute rounded-md border border-emerald-400/70 bg-emerald-200/8"
            style={{
              left: `${hoveredBounds.x}px`,
              top: `${hoveredBounds.y}px`,
              width: `${Math.max(1, hoveredBounds.width)}px`,
              height: `${Math.max(1, hoveredBounds.height)}px`,
            }}
          />
        ) : null}

        {measurement ? (
          <>
            <div
              className="absolute rounded-full border border-fuchsia-700 bg-white"
              style={{
                left: `${measurement.centerX - 4}px`,
                top: `${measurement.centerY - 4}px`,
                width: "8px",
                height: "8px",
                transform: `scale(${overlayUiScale})`,
                transformOrigin: "center",
              }}
            />
          </>
        ) : null}

        {interactive
          ? lineCurveHandles.map((handle) => (
              <div key={`curve-${handle.nodeId}`}>
                <div
                  className="pointer-events-none absolute border-t border-dashed border-amber-500/80"
                  style={{
                    left: `${Math.min(handle.midX, handle.cpX)}px`,
                    top: `${Math.min(handle.midY, handle.cpY)}px`,
                    width: `${Math.max(1, Math.abs(handle.cpX - handle.midX))}px`,
                    height: `${Math.max(1, Math.abs(handle.cpY - handle.midY))}px`,
                    transformOrigin: "top left",
                    transform: `rotate(${(Math.atan2(handle.cpY - handle.midY, handle.cpX - handle.midX) * 180) / Math.PI}deg)`,
                  }}
                />
                <div
                  className="pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-600 bg-white shadow-sm"
                  style={{
                    left: `${handle.cpX}px`,
                    top: `${handle.cpY}px`,
                    width: `${Math.max(10, handleSize)}px`,
                    height: `${Math.max(10, handleSize)}px`,
                    cursor: "move",
                    touchAction: "none",
                  }}
                  title="Drag to adjust curve (left/right: T, up/down: bulge)"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const point = toScenePoint(e.clientX, e.clientY);
                    if (!point) return;
                    contentCanvasRef.current?.setPointerCapture(e.pointerId);
                    onCurveHandlePointerDown?.(
                      e.pointerId,
                      handle.nodeId,
                      handle.curveBulge,
                      handle.curveT,
                      handle.length,
                      point.x,
                      point.y,
                    );
                  }}
                />
              </div>
            ))
          : null}

        {marqueeBounds &&
        marqueeBounds.width > 1 &&
        marqueeBounds.height > 1 ? (
          <div
            className="absolute rounded border border-sky-500/85 bg-sky-200/20"
            style={{
              left: `${marqueeBounds.x}px`,
              top: `${marqueeBounds.y}px`,
              width: `${marqueeBounds.width}px`,
              height: `${marqueeBounds.height}px`,
              borderWidth: `${borderWidth}px`,
            }}
          />
        ) : null}
      </div>
      {selectedBounds.map(({ id: nodeId, bounds, controlBounds, isLine }) => {
        const rotateAnchor = rotationAnchors.get(nodeId);
        return (
          <div
            key={nodeId}
            className="pointer-events-none absolute z-3"
            style={{ left: 0, top: 0, width: "100%", height: "100%" }}
          >
            {/* Selection border */}
            <div
              className="pointer-events-none absolute rounded-md border-2 border-sky-500/90 shadow-[0_0_0_1px_rgba(255,255,255,0.85)]"
              style={{
                left: `${controlBounds.x}px`,
                top: `${controlBounds.y}px`,
                width: `${Math.max(1, controlBounds.width)}px`,
                height: `${Math.max(1, controlBounds.height)}px`,
                borderWidth: `${borderWidth}px`,
              }}
            >
              {interactive &&
                !lockedIdSet.has(nodeId) &&
                HANDLES.map(({ id: handle, cx, cy, cursor }) => (
                  <div
                    key={handle}
                    className="pointer-events-auto absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-sky-600 bg-white shadow-sm active:bg-sky-100"
                    style={{
                      left: `${cx * 100}%`,
                      top: `${cy * 100}%`,
                      width: `${Math.max(handleSize, isLine ? handleSize * 1.35 : handleSize)}px`,
                      height: `${Math.max(handleSize, isLine ? handleSize * 1.35 : handleSize)}px`,
                      cursor,
                      touchAction: "none",
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const point = toScenePoint(e.clientX, e.clientY);
                      if (!point) return;
                      contentCanvasRef.current?.setPointerCapture(e.pointerId);
                      onHandlePointerDown?.(
                        e.pointerId,
                        nodeId,
                        handle,
                        controlBounds,
                        point.x,
                        point.y,
                      );
                    }}
                  />
                ))}
            </div>

            {/* Rotation handle — circle above top-center of selection */}
            {interactive && !lockedIdSet.has(nodeId) && rotateAnchor && (
              <>
                {/* Connector line */}
                <div
                  className="pointer-events-none absolute w-px bg-sky-400/60"
                  style={{
                    left: `${rotateAnchor.x}px`,
                    top: `${rotateAnchor.connectorTop}px`,
                    height: `${rotateAnchor.connectorHeight}px`,
                  }}
                />
                {/* Handle circle */}
                <div
                  className="pointer-events-auto absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-sky-500/90 bg-white shadow-md active:cursor-grabbing"
                  style={{
                    left: `${rotateAnchor.x}px`,
                    top: `${rotateAnchor.y}px`,
                    width: `${Math.max(12, handleSize + 4)}px`,
                    height: `${Math.max(12, handleSize + 4)}px`,
                    touchAction: "none",
                  }}
                  title="Rotate"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const point = toScenePoint(e.clientX, e.clientY);
                    if (!point) return;
                    contentCanvasRef.current?.setPointerCapture(e.pointerId);
                    onRotateHandlePointerDown?.(
                      e.pointerId,
                      nodeId,
                      bounds,
                      point.x,
                      point.y,
                    );
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
