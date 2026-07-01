/**
 * Dedicated canvas area for the /scene editor page.
 * Reads scene + selectedIds directly from the global SceneEditorStore — no
 * props needed. Pointer interactions are handled by useSceneEditorInteractions.
 */
import CanvasSelectionToolbar from "@/components/editor/canvas/canvas-selection-toolbar";
import ImageRembgOverlay from "@/components/editor/canvas/image-rembg-overlay";
import SceneWorkspaceStage from "@/components/scene-workspace/stage";
import { AVNAC_VECTOR_BOARD_DRAG_MIME } from "@/lib/avnac-vector-board-document";
import { findTopHitNodeId } from "@/lib/saraswati";
import { readSceneDropIntent } from "./scene-drop-intent";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SceneInlineTextEditor from "./scene-inline-text-editor";
import {
  isChromeTarget,
  isTextEntryTarget,
  readNavigatorClipboardImageFiles,
  reorderChildrenForSelection,
  shouldStartViewportPan,
} from "./scene-editor-input-utils";
import {
  computeFitZoomPercent,
  toClampedScenePoint,
} from "./scene-editor-viewport-utils";
import { useSceneEditorStore } from "./store";
import { useRembgProcessingStore } from "./store/rembg-processing-store";
import SceneCanvasContextMenu from "./tools/scene-canvas-context-menu";
import SceneShortcutsModal from "./tools/scene-shortcuts-modal";
import { useSceneEditorContextMenu } from "./use-scene-editor-context-menu";
import { useSceneEditorDropActions } from "./use-scene-editor-drop-actions";
import { useSceneEditorInteractions } from "./use-scene-editor-interactions";
import { useSceneEditorShortcuts } from "./use-scene-editor-shortcuts";
import { useSceneSelectionActions } from "./use-scene-selection-actions";
import { ensureRembgBridge } from "@/lib/rembg-bridge";

type InlineTextEditState = {
  nodeId: string;
  value: string;
};

type Props = {
  shortcutsOpen: boolean;
  onCloseShortcuts: () => void;
  onOpenShortcuts: () => void;
  developerMode?: boolean;
};

export default function SceneEditorCanvas({
  shortcutsOpen,
  onCloseShortcuts,
  onOpenShortcuts,
  developerMode = false,
}: Props) {
  const scene = useSceneEditorStore((s) => s.scene);
  const selectedIds = useSceneEditorStore((s) => s.selectedIds);
  const setSelectedIds = useSceneEditorStore((s) => s.setSelectedIds);
  const lockedIds = useSceneEditorStore((s) => s.lockedIds);
  const setTextContent = useSceneEditorStore((s) => s.setTextContent);
  const zoomPercent = useSceneEditorStore((s) => s.zoomPercent);
  const setZoomPercent = useSceneEditorStore((s) => s.setZoomPercent);
  const canUndo = useSceneEditorStore((s) => s.canUndo);
  const canRedo = useSceneEditorStore((s) => s.canRedo);
  const undo = useSceneEditorStore((s) => s.undo);
  const redo = useSceneEditorStore((s) => s.redo);
  const toggleLockedSelection = useSceneEditorStore(
    (s) => s.toggleLockedSelection,
  );
  const applyCommands = useSceneEditorStore((s) => s.applyCommands);
  const setCanvasViewport = useSceneEditorStore((s) => s.setCanvasViewport);
  const setCanvasPan = useSceneEditorStore((s) => s.setCanvasPan);
  const setRenderStats = useSceneEditorStore((s) => s.setRenderStats);
  const onRenderStats = useMemo(
    () =>
      developerMode
        ? setRenderStats
        : () => {
            /* skip per-frame store updates when dev footer is hidden */
          },
    [developerMode, setRenderStats],
  );

  useEffect(() => {
    ensureRembgBridge();
  }, []);
  const dropActions = useSceneEditorDropActions();
  const actions = useSceneSelectionActions();
  const rembgProcessingNodes = useRembgProcessingStore(
    (s) => s.processingNodes,
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const lastScenePointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const spaceDownRef = useRef(false);
  const viewportPanDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [inlineTextEdit, setInlineTextEdit] =
    useState<InlineTextEditState | null>(null);
  const [viewportPanCursor, setViewportPanCursor] = useState<
    "grab" | "grabbing" | null
  >(null);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setContainerSize({ w: rect.width, h: rect.height });
        setCanvasViewport(rect.width, rect.height);
      }
    });
    observer.observe(element);

    const onScroll = () => {
      setCanvasPan(element.scrollLeft, element.scrollTop);
    };
    element.addEventListener("scroll", onScroll);

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", onScroll);
      setCanvasViewport(0, 0);
      setCanvasPan(0, 0);
    };
  }, [setCanvasPan, setCanvasViewport]);

  const syncViewportPanCursor = useCallback(() => {
    setViewportPanCursor(
      viewportPanDragRef.current
        ? "grabbing"
        : spaceDownRef.current
          ? "grab"
          : null,
    );
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (inlineTextEdit) return;
      if (event.key !== " " && event.code !== "Space") return;
      if (isTextEntryTarget(event.target) || isChromeTarget(event.target)) {
        return;
      }
      if (!spaceDownRef.current) {
        spaceDownRef.current = true;
        syncViewportPanCursor();
      }
      event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== " " && event.code !== "Space") return;
      spaceDownRef.current = false;
      syncViewportPanCursor();
    };

    const onBlur = () => {
      spaceDownRef.current = false;
      viewportPanDragRef.current = null;
      syncViewportPanCursor();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [inlineTextEdit, syncViewportPanCursor]);

  useEffect(() => {
    const viewport = scrollContainerRef.current;
    if (!viewport) return;

    const stopPan = (event?: PointerEvent) => {
      const pan = viewportPanDragRef.current;
      if (!pan) return;
      if (event && event.pointerId !== pan.pointerId) return;
      viewportPanDragRef.current = null;
      if (event) {
        viewport.releasePointerCapture?.(event.pointerId);
      }
      syncViewportPanCursor();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (
        !shouldStartViewportPan({
          target: event.target,
          button: event.button,
          pointerType: event.pointerType,
          spaceHeld: spaceDownRef.current,
          hasInlineTextEdit: Boolean(inlineTextEdit),
        })
      ) {
        return;
      }

      viewportPanDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
      viewport.setPointerCapture?.(event.pointerId);
      syncViewportPanCursor();
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerMove = (event: PointerEvent) => {
      const pan = viewportPanDragRef.current;
      if (!pan || event.pointerId !== pan.pointerId) return;
      viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
      viewport.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
      event.preventDefault();
    };

    viewport.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", stopPan, true);
    window.addEventListener("pointercancel", stopPan, true);

    return () => {
      stopPan();
      viewport.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", stopPan, true);
      window.removeEventListener("pointercancel", stopPan, true);
    };
  }, [inlineTextEdit, syncViewportPanCursor]);

  // Prevent browser/page zoom on ctrl/cmd + wheel; zoom the canvas instead.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 16;
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        dy *= el.clientHeight * 0.85;
      }
      const current = useSceneEditorStore.getState().zoomPercent;
      setZoomPercent(current + -dy * 0.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoomPercent]);

  const artboardWidth = scene?.artboard.width ?? 1;
  const artboardHeight = scene?.artboard.height ?? 1;
  const pad = 64;
  const fitScale =
    containerSize.w > 0 && containerSize.h > 0
      ? Math.min(
          1,
          (containerSize.w - pad) / artboardWidth,
          (containerSize.h - pad) / artboardHeight,
        )
      : 1;
  const scale = fitScale * (zoomPercent / 100);
  const scaledWidth = Math.round(artboardWidth * scale);
  const scaledHeight = Math.round(artboardHeight * scale);

  // Convert screen-space clientX/clientY to scene coordinates.
  // Used by the global window pointermove handler in useSceneEditorInteractions
  // to continue drag operations when the pointer exits the canvas element.
  const getScenePoint = useCallback(
    (clientX: number, clientY: number) => {
      const surface = surfaceRef.current;
      if (!surface || scale <= 0) return null;
      const rect = surface.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  const interactions = useSceneEditorInteractions({ getScenePoint });

  const rotateHandleClearance = 36;
  const toolbarPlacement: "above" | "below" =
    actions.selectionBounds &&
    actions.selectionBounds.y * scale < 50 + rotateHandleClearance
      ? "below"
      : "above";
  const toolbarStyle = actions.selectionBounds
    ? {
        left:
          (actions.selectionBounds.x + actions.selectionBounds.width / 2) *
          scale,
        top:
          toolbarPlacement === "above"
            ? actions.selectionBounds.y * scale - rotateHandleClearance
            : (actions.selectionBounds.y + actions.selectionBounds.height) *
              scale,
      }
    : undefined;

  useEffect(() => {
    if (!scene || !inlineTextEdit) return;
    const node = scene.nodes[inlineTextEdit.nodeId];
    if (!node || node.type !== "text") {
      setInlineTextEdit(null);
    }
  }, [inlineTextEdit, scene]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    // During dragover, dataTransfer.getData() always returns "" for custom
    // MIME types and dataTransfer.files is always empty due to browser
    // security restrictions — check dataTransfer.types instead.
    const types = Array.from(event.dataTransfer.types);
    if (
      types.includes("Files") ||
      types.includes(AVNAC_VECTOR_BOARD_DRAG_MIME)
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    const intent = readSceneDropIntent(
      event.dataTransfer,
      AVNAC_VECTOR_BOARD_DRAG_MIME,
    );
    if (!intent) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (!scene) return;
    const intent = readSceneDropIntent(
      event.dataTransfer,
      AVNAC_VECTOR_BOARD_DRAG_MIME,
    );
    if (!intent) return;
    event.preventDefault();
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toClampedScenePoint({
      clientX: event.clientX,
      clientY: event.clientY,
      rect,
      scale,
      artboardWidth: scene.artboard.width,
      artboardHeight: scene.artboard.height,
    });
    if (!point) return;
    await dropActions.handleDropIntent(intent, point);
  };

  const onSceneDoubleClick = (x: number, y: number) => {
    if (!scene) return;
    const hitId = findTopHitNodeId(scene, { x, y });
    if (!hitId) return;
    const hitNode = scene.nodes[hitId];
    if (!hitNode || hitNode.type !== "text") return;
    setSelectedIds([hitId]);
    setInlineTextEdit({ nodeId: hitId, value: hitNode.text });
  };

  const commitInlineText = () => {
    if (!inlineTextEdit) return;
    setTextContent(inlineTextEdit.nodeId, inlineTextEdit.value);
    setInlineTextEdit(null);
  };

  const fitToViewport = useCallback(() => {
    if (!scene) return;
    setZoomPercent(
      computeFitZoomPercent({
        artboardWidth: scene.artboard.width,
        artboardHeight: scene.artboard.height,
        viewportWidth: containerSize.w,
        viewportHeight: containerSize.h,
      }),
    );
  }, [containerSize.h, containerSize.w, scene, setZoomPercent]);

  const reorderPrimarySelection = useCallback(
    (mode: "forward" | "backward" | "front" | "back") => {
      if (!scene || selectedIds.length === 0) return;
      const root = scene.nodes[scene.root];
      if (!root || root.type !== "group") return;
      const id = selectedIds[0]!;
      const nextChildren = reorderChildrenForSelection({
        children: root.children,
        selectedId: id,
        mode,
      });
      if (!nextChildren) return;
      applyCommands([
        {
          type: "SET_GROUP_CHILDREN",
          id: scene.root,
          children: nextChildren,
        },
      ]);
    },
    [applyCommands, scene, selectedIds],
  );

  const pasteClipboardAtPoint = useCallback(
    async (point: { x: number; y: number }) => {
      const imageFiles = await readNavigatorClipboardImageFiles();
      if (imageFiles.length > 0) {
        await dropActions.handleDropIntent(
          { kind: "image-files", files: imageFiles },
          point,
        );
        return;
      }

      actions.onPasteAt(point);
    },
    [actions, dropActions],
  );

  useSceneEditorShortcuts({
    scene,
    inlineTextEditing: Boolean(inlineTextEdit),
    lockedIds,
    zoomPercent,
    canUndo,
    canRedo,
    undo,
    redo,
    setZoomPercent,
    setSelectedIds,
    toggleLockedSelection,
    fitToViewport,
    reorderPrimarySelection,
    onCopy: actions.onCopy,
    onPaste: () => actions.onPasteAt(lastScenePointRef.current),
    onDelete: actions.onDelete,
    onDuplicate: actions.onDuplicate,
    canGroup: actions.canGroup,
    canUngroup: actions.canUngroup,
    onGroup: actions.onGroup,
    onUngroup: actions.onUngroup,
    selectedIds,
    onNudge: actions.onNudge,
    onImageFilesPaste: (files) => {
      if (!scene) return;
      void dropActions.handleDropIntent(
        { kind: "image-files", files },
        lastScenePointRef.current,
      );
    },
    onShowShortcuts: onOpenShortcuts,
  });

  const { contextMenu, setContextMenu, onCanvasContextMenu } =
    useSceneEditorContextMenu({
      scene,
      scale,
      hasSelection: selectedIds.length > 0,
      locked: actions.isLocked,
      isInlineTextEditing: Boolean(inlineTextEdit),
      surfaceRef,
    });

  if (!scene) return null;

  return (
    <div
      ref={scrollContainerRef}
      className={`flex flex-1 bg-neutral-100/80 p-8 ${interactions.activeCursor ? "overflow-hidden" : "overflow-auto"}`}
      style={viewportPanCursor ? { cursor: viewportPanCursor } : undefined}
      onPointerMove={(event) => {
        if (viewportPanDragRef.current) return;
        const rect = surfaceRef.current?.getBoundingClientRect();
        if (!rect || !scene) return;
        const x = (event.clientX - rect.left) / scale;
        const y = (event.clientY - rect.top) / scale;
        lastScenePointRef.current = {
          x: Math.max(0, Math.min(scene.artboard.width, x)),
          y: Math.max(0, Math.min(scene.artboard.height, y)),
        };
      }}
      onDragOver={onDragOver}
      onContextMenu={onCanvasContextMenu}
      onDrop={(event) => {
        void onDrop(event);
      }}
    >
      <div className="flex min-h-full min-w-full items-center justify-center">
        <div
          ref={surfaceRef}
          className="relative"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: scene.artboard.width,
            height: scene.artboard.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <SceneWorkspaceStage
            scene={scene}
            viewScale={scale}
            interactive={!inlineTextEdit}
            selectedIds={selectedIds}
            hiddenNodeIds={inlineTextEdit ? [inlineTextEdit.nodeId] : undefined}
            lockedIds={lockedIds}
            hoveredId={interactions.hoveredId}
            guides={interactions.guides}
            measurement={interactions.measurement}
            interactionCursor={viewportPanCursor ?? interactions.activeCursor}
            onScenePointerDown={interactions.onPointerDown}
            onScenePointerMove={interactions.onPointerMove}
            onScenePointerUp={interactions.onPointerUp}
            onScenePointerLeave={interactions.onPointerLeave}
            onHandlePointerDown={interactions.onHandlePointerDown}
            onRotateHandlePointerDown={interactions.onRotateHandlePointerDown}
            onCurveHandlePointerDown={interactions.onCurveHandlePointerDown}
            onSceneDoubleClick={onSceneDoubleClick}
            marqueeBounds={interactions.marqueeBounds}
            onRenderStats={onRenderStats}
          />
        </div>

        {(() => {
          const m = interactions.measurement;
          if (!m) return null;
          // Convert scene coords → CSS px (these are inside surfaceRef which is scaledWidth×scaledHeight)
          const cx = (m.x + m.width / 2) * scale;
          const topEdgePx = m.y * scale;
          const bottomEdgePx = (m.y + m.height) * scale;
          // Show above when there's at least 32px gap from the artboard top, otherwise below
          const showAbove = topEdgePx > 32;
          const labelTop = showAbove ? topEdgePx - 6 : bottomEdgePx + 6;
          const labelTransform = showAbove
            ? "translate(-50%, -100%)"
            : "translate(-50%, 0%)";
          // Clamp horizontal center so the label doesn't overflow the artboard
          const clampedCx = Math.max(60, Math.min(scaledWidth - 60, cx));
          const label =
            m.kind === "move"
              ? `X • ${m.x} · Y • ${m.y}`
              : `W • ${m.width} · H • ${m.height}`;
          const labelClass =
            m.kind === "move"
              ? "pointer-events-none absolute z-20 rounded-md border border-fuchsia-300/40 bg-fuchsia-600/90 px-2 py-1 text-[11px] font-semibold tracking-wide text-white shadow-lg whitespace-nowrap"
              : "pointer-events-none absolute z-20 rounded-md border border-black/10 bg-black/80 px-2 py-1 text-[11px] font-semibold tracking-wide text-white shadow-lg whitespace-nowrap";
          return (
            <div
              key={m.kind}
              className={labelClass}
              style={{
                left: clampedCx,
                top: labelTop,
                transform: labelTransform,
              }}
            >
              {label}
            </div>
          );
        })()}

        {interactions.rotationIndicator ? (
          <div
            className={`pointer-events-none absolute z-20 rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide text-white shadow-lg whitespace-nowrap ${interactions.rotationIndicator.snapped ? "border border-emerald-300/50 bg-emerald-600/90" : "border border-sky-300/40 bg-sky-600/85"}`}
            style={{
              left: Math.max(68, Math.min(scaledWidth - 68, scaledWidth / 2)),
              top: 12,
              transform: "translateX(-50%)",
            }}
          >
            {interactions.rotationIndicator.snapped &&
            interactions.rotationIndicator.snapTarget != null
              ? `Angle ${Math.round(interactions.rotationIndicator.angle)}° · Snapped ${interactions.rotationIndicator.snapTarget}°`
              : `Angle ${Math.round(interactions.rotationIndicator.angle)}°`}
          </div>
        ) : null}

        {inlineTextEdit ? (
          <SceneInlineTextEditor
            scene={scene}
            edit={inlineTextEdit}
            scale={scale}
            onChange={(value) =>
              setInlineTextEdit((current) =>
                current ? { ...current, value } : current,
              )
            }
            onCommit={commitInlineText}
            onCancel={() => setInlineTextEdit(null)}
          />
        ) : null}

        {/* Background-removal processing overlay */}
        {actions.selectionBounds &&
          selectedIds.length === 1 &&
          rembgProcessingNodes[selectedIds[0]!] ? (
            <ImageRembgOverlay
              style={{
                left: actions.selectionBounds.x * scale,
                top: actions.selectionBounds.y * scale,
                width: actions.selectionBounds.width * scale,
                height: actions.selectionBounds.height * scale,
              }}
            />
          ) : null}

        {actions.selectionBounds && toolbarStyle && (
          <CanvasSelectionToolbar
            style={toolbarStyle}
            placement={toolbarPlacement}
            viewportRef={scrollContainerRef}
            locked={actions.isLocked}
            onDuplicate={actions.onDuplicate}
            onToggleLock={actions.onToggleLock}
            onDelete={actions.onDelete}
            onCopy={actions.onCopy}
            onPaste={actions.onPaste}
            onAlign={actions.onAlign}
            alignAlreadySatisfied={actions.alignAlreadySatisfied}
            canGroup={actions.canGroup}
            canAlignElements={actions.canAlignElements}
            canUngroup={actions.canUngroup}
            onGroup={actions.onGroup}
            onAlignElements={actions.onAlignElements}
            onUngroup={actions.onUngroup}
            onFlipH={actions.onFlipH}
            onFlipV={actions.onFlipV}
            onDownloadPng={actions.onDownloadPng}
            onDownloadSvg={actions.onDownloadSvg}
          />
        )}
        </div>
      </div>

      {contextMenu ? (
        <SceneCanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hasSelection={contextMenu.hasSelection}
          locked={contextMenu.locked}
          canDownloadPng={
            selectedIds.length === 1 &&
            scene?.nodes[selectedIds[0]!]?.type === "image"
          }
          onCopy={() => {
            actions.onCopy();
            setContextMenu(null);
          }}
          onDuplicate={() => {
            actions.onDuplicate();
            setContextMenu(null);
          }}
          onToggleLock={() => {
            actions.onToggleLock();
            setContextMenu(null);
          }}
          onPaste={() => {
            setContextMenu(null);
            void pasteClipboardAtPoint({
              x: contextMenu.sceneX,
              y: contextMenu.sceneY,
            });
          }}
          onDelete={() => {
            actions.onDelete();
            setContextMenu(null);
          }}
          onDownloadPng={() => {
            actions.onDownloadPng();
            setContextMenu(null);
          }}
        />
      ) : null}

      <SceneShortcutsModal open={shortcutsOpen} onClose={onCloseShortcuts} />
    </div>
  );
}
