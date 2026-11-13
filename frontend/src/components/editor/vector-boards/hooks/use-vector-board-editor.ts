import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  VECTOR_DEFAULT_SHAPE_SIZE,
  VECTOR_DEFAULT_STROKE_COLOR,
  VECTOR_DEFAULT_FILL_COLOR,
  VECTOR_DEFAULT_STROKE_WIDTH,
  VECTOR_DELETE_REFIT_TOLERANCE_PX,
  VECTOR_MIN_DRAG_PX,
  VECTOR_PATH_HIT_RADIUS_PX,
  VECTOR_PENCIL_DEFAULT_TOLERANCE_PX,
  VECTOR_PENCIL_MAX_TOLERANCE_PX,
  VECTOR_PENCIL_MIN_TOLERANCE_PX,
  applyNodeTypeAt,
  applyAngleLock,
  applyAxisLock,
  applyScaleStrokesInDoc,
  applyTranslateStrokesInDoc,
  applyZOrderInDoc,
  appendClonedStrokesToActiveLayer,
  anchorOut,
  clampToBoard,
  collectSnapCandidates,
  deleteAnchorWithRefit,
  dragNodeHandle,
  duplicateSelectionsInPlace,
  findSnap,
  findStrokesIntersectingRect,
  findStrokeInDoc,
  findTopStrokeAt,
  fitFreehandCubics,
  getActiveLayer,
  getStrokesForSelections,
  insertAnchorAtSegment,
  insertStrokeIntoActiveLayer,
  moveAnchor,
  parseVectorStrokeClipboardText,
  removeStrokesFromDoc,
  resolvePlacementPoint,
  screenPxToDoc,
  selectionBounds,
  serializeVectorStrokesForClipboard,
  setSymmetricHandles,
  updateSelectionPaint,
  updateStrokeInDocFull,
  type VectorPaintPatch,
  allStrokeSelections,
  filterSelectionsForDoc,
  clearHandles,
  type SnapCandidate,
  type SnapGuide,
  type VectorBoardStroke,
  type VectorBounds,
  type VectorPoint,
  type VectorResizeHandleId,
  type VectorSelection,
  type VectorTool,
  type VectorPenAnchor,
  type VectorNodeType,
  type VectorFillRule,
  type VectorLineJoin,
} from "@/lib/avnac-vector";
import {
  buildStroke,
  hitPenAnchors,
  hitResizeHandle,
  metricDistance,
  primarySelection,
  selectionKey,
} from "./vector-board-editor-utils";
import {
  VECTOR_CURSOR_CLOSE,
  VECTOR_CURSOR_CROSSHAIR,
  VECTOR_CURSOR_MOVE,
  VECTOR_CURSOR_PEN_ADD,
  VECTOR_CURSOR_PEN_REMOVE,
  VECTOR_RESIZE_CURSORS,
} from "../vector-board-cursors";
import type { VectorBoardDocumentState } from "./use-vector-board-document";
import type { VectorBoardViewState } from "./use-vector-board-view";
import type {
  EditorDraft,
  VectorBoardEditorRefs,
} from "./vector-board-paint-state";

type DragState =
  | {
      kind: "pan";
      pointerId: number;
      startX: number;
      startY: number;
      startTx: number;
      startTy: number;
    }
  | {
      kind: "move";
      pointerId: number;
      selections: VectorSelection[];
      last: VectorPoint;
      moved: boolean;
    }
  | {
      kind: "resize";
      pointerId: number;
      handle: VectorResizeHandleId;
      bounds: VectorBounds;
      anchor: VectorPoint;
      startPoint: VectorPoint;
      moved: boolean;
    }
  | {
      kind: "marquee";
      pointerId: number;
      start: VectorPoint;
      base: VectorSelection[];
      additive: boolean;
    }
  | {
      kind: "pen-edit";
      pointerId: number;
      mode: "anchor" | "handle-in" | "handle-out";
      index: number;
      last: VectorPoint;
    }
  | {
      kind: "pen-place";
      pointerId: number;
      index: number;
      start: VectorPoint;
    }
  | {
      kind: "pen-handle";
      pointerId: number;
      index: number;
      which: "in" | "out";
    };

export type VectorBoardEditorArgs = {
  open: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  docState: VectorBoardDocumentState;
  viewState: VectorBoardViewState;
  refs: VectorBoardEditorRefs;
  requestPaint: () => void;
  onRequestClose: () => void;
};

export type VectorBoardEditorState = {
  tool: VectorTool;
  setTool: (tool: VectorTool) => void;
  selection: VectorSelection[];
  stats: { strokes: number; anchors: number; selected: number };
  nodeEditActive: boolean;
  selectedNodeType: VectorNodeType | null;
  selectedNodeIndex: number | null;
  canUndo: boolean;
  canRedo: boolean;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeEnabled: boolean;
  fillEnabled: boolean;
  lineJoin: VectorLineJoin;
  fillRule: VectorFillRule;
  pencilTolerancePx: number;
  snapEnabled: boolean;
  scaleStrokesWithObject: boolean;
  lastFit: { nodes: number; samples: number; tolerancePx: number } | null;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeEnabled: (enabled: boolean) => void;
  setFillEnabled: (enabled: boolean) => void;
  setLineJoin: (join: VectorLineJoin) => void;
  setFillRule: (rule: VectorFillRule) => void;
  setPencilTolerancePx: (px: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setScaleStrokesWithObject: (enabled: boolean) => void;
  beginStyleInteraction: () => void;
  endStyleInteraction: () => void;
  flushStyleEdit: () => void;
  cancelStyleEdit: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  selectAll: () => void;
  selectStrokes: (selections: VectorSelection[]) => void;
  setSelectedNodeType: (type: VectorNodeType) => void;
  deleteSelectedNode: () => void;
  finishPenDraft: (closed?: boolean) => void;
  cancelDraft: () => void;
  handlers: {
    onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    onDoubleClick: (event: React.MouseEvent<HTMLCanvasElement>) => void;
    onPointerLeave: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    onContextMenu: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  };
};

function pointerAlt(event: { altKey: boolean }): boolean {
  return event.altKey;
}

function cursorForTool(tool: VectorTool): string {
  if (tool === "move") return VECTOR_CURSOR_MOVE;
  if (tool === "pen") return VECTOR_CURSOR_PEN_ADD;
  return VECTOR_CURSOR_CROSSHAIR;
}

export function useVectorBoardEditor({
  open,
  canvasRef,
  docState,
  viewState,
  refs,
  requestPaint,
  onRequestClose,
}: VectorBoardEditorArgs): VectorBoardEditorState {
  const { docRef, commit, beginLiveEdit, updateLive, endLiveEdit, cancelLiveEdit } = docState;
  const { viewRef, fitView, resetView, zoomAtCenter } = viewState;

  const [tool, setToolState] = useState<VectorTool>("pencil");
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const [selection, setSelectionState] = useState<VectorSelection[]>([]);
  const [strokeColor, setStrokeColorState] = useState(VECTOR_DEFAULT_STROKE_COLOR);
  const [fillColor, setFillColorState] = useState(VECTOR_DEFAULT_FILL_COLOR);
  const [strokeWidth, setStrokeWidthState] = useState(VECTOR_DEFAULT_STROKE_WIDTH);
  const [strokeEnabled, setStrokeEnabledState] = useState(true);
  const [fillEnabled, setFillEnabledState] = useState(true);
  const [lineJoin, setLineJoinState] = useState<VectorLineJoin>("round");
  const [fillRule, setFillRuleState] = useState<VectorFillRule>("nonzero");
  const [pencilTolerancePx, setPencilTolerancePxState] = useState(
    VECTOR_PENCIL_DEFAULT_TOLERANCE_PX,
  );
  const [snapEnabled, setSnapEnabledState] = useState(true);
  const [scaleStrokesWithObject, setScaleStrokesWithObjectState] = useState(true);
  const [nodeEditActive, setNodeEditActive] = useState(false);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);
  const [selectedNodeType, setSelectedNodeTypeState] = useState<VectorNodeType | null>(null);
  const [lastFit, setLastFit] = useState<{
    nodes: number;
    samples: number;
    tolerancePx: number;
  } | null>(null);

  const snapEnabledRef = useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;
  const pencilToleranceRef = useRef(pencilTolerancePx);
  pencilToleranceRef.current = pencilTolerancePx;
  const scaleStrokesRef = useRef(scaleStrokesWithObject);
  scaleStrokesRef.current = scaleStrokesWithObject;
  const lineJoinRef = useRef(lineJoin);
  lineJoinRef.current = lineJoin;
  const fillRuleRef = useRef(fillRule);
  fillRuleRef.current = fillRule;

  refs.styleRef.current = {
    strokeColor,
    strokeWidth,
    fillColor,
    fillEnabled,
    strokeEnabled,
  };

  const dragRef = useRef<DragState | null>(null);
  const styleEditRef = useRef<{
    selections: VectorSelection[];
    interaction: boolean;
    timer: number | null;
  } | null>(null);
  const snapCandidatesRef = useRef<SnapCandidate[]>([]);
  const spaceDownRef = useRef(false);
  const altRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastFitRef = useRef(lastFit);
  lastFitRef.current = lastFit;

  const applySelection = useCallback(
    (next: VectorSelection[]) => {
      if (selectionKey(refs.selectionRef.current) === selectionKey(next)) return;
      refs.selectionRef.current = next;
      setSelectionState(next);
      requestPaint();
    },
    [refs, requestPaint],
  );


  /**
   * Paint controls (width, colour, fill, join, fill rule) are a single edit
   * transaction. Each tick updates the live document and repaints only the
   * selected strokes; history gets one snapshot when the drag ends.
   */
  const flushStyleEdit = useCallback(() => {
    const edit = styleEditRef.current;
    if (!edit) return;
    if (edit.timer != null) {
      window.clearTimeout(edit.timer);
      edit.timer = null;
    }
    styleEditRef.current = null;
    endLiveEdit();
    requestPaint();
  }, [endLiveEdit, requestPaint]);

  const beginStyleEdit = useCallback(() => {
    if (styleEditRef.current) return styleEditRef.current;
    const selections = refs.selectionRef.current;
    if (selections.length === 0) return null;
    if (!beginLiveEdit(selections)) return null;
    const edit = {
      selections: [...selections],
      interaction: false,
      timer: null as number | null,
    };
    styleEditRef.current = edit;
    return edit;
  }, [beginLiveEdit, refs]);

  const applyStylePatch = useCallback(
    (patch: VectorPaintPatch) => {
      let edit = styleEditRef.current;
      if (edit && !docState.liveEditRef.current) {
        // A geometry action committed underneath the paint edit.
        styleEditRef.current = null;
        edit = null;
      }
      if (!edit) edit = beginStyleEdit();
      if (!edit) return;
      const live = docState.liveEditRef.current;
      const base = live ? live.liveDoc : docRef.current;
      updateLive(updateSelectionPaint(base, edit.selections, patch));
      if (!edit.interaction) {
        if (edit.timer != null) window.clearTimeout(edit.timer);
        edit.timer = window.setTimeout(() => {
          if (styleEditRef.current === edit) {
            edit.timer = null;
            flushStyleEdit();
          }
        }, 300);
      }
      requestPaint();
    },
    [beginStyleEdit, docState.liveEditRef, docRef, flushStyleEdit, requestPaint, updateLive],
  );

  const beginStyleInteraction = useCallback(() => {
    const edit = beginStyleEdit();
    if (!edit) return;
    edit.interaction = true;
    if (edit.timer != null) {
      window.clearTimeout(edit.timer);
      edit.timer = null;
    }
  }, [beginStyleEdit]);

  const endStyleInteraction = useCallback(() => {
    flushStyleEdit();
  }, [flushStyleEdit]);

  const cancelStyleEdit = useCallback(() => {
    const edit = styleEditRef.current;
    if (!edit) return;
    if (edit.timer != null) window.clearTimeout(edit.timer);
    styleEditRef.current = null;
    cancelLiveEdit();
    requestPaint();
  }, [cancelLiveEdit, requestPaint]);

  const setCanvasCursor = useCallback((cursor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  }, []);

  const currentView = useCallback(() => viewRef.current, [viewRef]);

  const boardPoint = useCallback(
    (clientX: number, clientY: number, clamp = true): VectorPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const view = viewRef.current;
      const x = (clientX - rect.left - view.tx) / view.scale;
      const y = (clientY - rect.top - view.ty) / view.scale;
      return clamp ? clampToBoard([x, y], docRef.current.size) : [x, y];
    },
    [docRef, viewRef],
  );

  const clearSnap = useCallback(() => {
    if (refs.snapGuidesRef.current.length === 0 && refs.snapHighlightRef.current == null) return;
    refs.snapGuidesRef.current = [];
    refs.snapHighlightRef.current = null;
    requestPaint();
  }, [refs, requestPaint]);

  const applySnap = useCallback(
    (
      raw: VectorPoint,
      options: {
        base?: VectorPoint | null;
        shiftKey?: boolean;
        altKey?: boolean;
        extraCandidates?: SnapCandidate[];
        exclude?: ReadonlySet<string>;
      } = {},
    ): SnapResultLike => {
      const doc = docRef.current;
      const candidates = [
        ...collectSnapCandidates(doc, options.exclude),
        ...(options.extraCandidates ?? []),
      ];
      const result = resolvePlacementPoint({
        point: raw,
        base: options.base ?? null,
        shiftKey: options.shiftKey,
        altKey: options.altKey,
        candidates,
        options: {
          tolerance: screenPxToDoc(8, viewRef.current),
          board: doc.size,
          enabled: snapEnabledRef.current,
          boardGuides: true,
        },
      });
      refs.snapGuidesRef.current = result.guides;
      refs.snapHighlightRef.current = result.snappedX || result.snappedY ? result.point : null;
      requestPaint();
      return result;
    },
    [docRef, refs, requestPaint, viewRef],
  );

  const clearDraft = useCallback(() => {
    refs.draftRef.current = null;
    dragRef.current = null;
    clearSnap();
    requestPaint();
  }, [clearSnap, refs, requestPaint]);

  const syncPenEditFromDoc = useCallback(() => {
    const penEdit = refs.penEditRef.current;
    if (!penEdit) return;
    const stroke = findStrokeInDoc(docRef.current, {
      layerId: penEdit.layerId,
      strokeId: penEdit.strokeId,
    });
    if (!stroke || stroke.kind !== "pen" || !stroke.penAnchors) {
      refs.penEditRef.current = null;
      setNodeEditActive(false);
      setSelectedNodeIndex(null);
      setSelectedNodeTypeState(null);
      requestPaint();
      return;
    }
    if (!penEdit.drag) {
      penEdit.anchors = stroke.penAnchors.map((a) => ({ ...a }));
    }
    penEdit.closed = stroke.penClosed === true;
    const index = penEdit.selectedAnchor;
    setSelectedNodeIndex(index);
    setSelectedNodeTypeState(index != null ? penEdit.anchors[index]?.type ?? null : null);
    requestPaint();
  }, [docRef, refs, requestPaint]);

  const enterPenEdit = useCallback(
    (selectionToEdit: VectorSelection) => {
      const stroke = findStrokeInDoc(docRef.current, selectionToEdit);
      if (!stroke || stroke.kind !== "pen" || !stroke.penAnchors || stroke.penAnchors.length === 0) {
        return;
      }
      refs.penEditRef.current = {
        layerId: selectionToEdit.layerId,
        strokeId: selectionToEdit.strokeId,
        anchors: stroke.penAnchors.map((a) => ({ ...a })),
        closed: stroke.penClosed === true,
        selectedAnchor: null,
        drag: null,
        addHint: null,
        hoverDelete: null,
      };
      setNodeEditActive(true);
      setSelectedNodeIndex(null);
      setSelectedNodeTypeState(null);
      applySelection([selectionToEdit]);
      requestPaint();
    },
    [applySelection, docRef, refs, requestPaint],
  );

  const exitPenEdit = useCallback(() => {
    if (!refs.penEditRef.current) return;
    refs.penEditRef.current = null;
    setNodeEditActive(false);
    setSelectedNodeIndex(null);
    setSelectedNodeTypeState(null);
    requestPaint();
  }, [refs, requestPaint]);

  const selectPenAnchor = useCallback(
    (index: number | null) => {
      const penEdit = refs.penEditRef.current;
      if (!penEdit) return;
      penEdit.selectedAnchor = index;
      setSelectedNodeIndex(index);
      setSelectedNodeTypeState(index != null ? penEdit.anchors[index]?.type ?? null : null);
      requestPaint();
    },
    [refs, requestPaint],
  );

  const commitStroke = useCallback(
    (stroke: VectorBoardStroke) => {
      flushStyleEdit();
      const active = getActiveLayer(docRef.current);
      if (!active || !active.visible) return false;
      const next = insertStrokeIntoActiveLayer(docRef.current, stroke);
      commit(next);
      applySelection([{ layerId: active.id, strokeId: stroke.id }]);
      setNodeEditActive(false);
      refs.penEditRef.current = null;
      return true;
    },
    [applySelection, commit, docRef, flushStyleEdit, refs],
  );

  const finishPenDraft = useCallback(
    (closed = false) => {
      const draft = refs.draftRef.current;
      if (!draft || draft.kind !== "pen" || draft.anchors.length < 2) {
        clearDraft();
        return;
      }
      if (closed && draft.anchors.length < 3) {
        clearDraft();
        return;
      }
      const stroke = buildStroke({
        kind: "pen",
        points: [],
        penAnchors: draft.anchors,
        penClosed: closed,
        style: refs.styleRef.current,
        fillRule: fillRuleRef.current,
        lineJoin: lineJoinRef.current,
        allowFill: closed,
      });
      commitStroke(stroke);
      clearDraft();
      clearSnap();
    },
    [clearDraft, clearSnap, commitStroke, refs],
  );

  const makeFallbackAnchors = useCallback((points: VectorPoint[]): VectorPenAnchor[] => {
    const first = points[0]!;
    const last = points[points.length - 1]!;
    return [
      { x: first[0], y: first[1], type: "corner" },
      { x: last[0], y: last[1], type: "corner" },
    ];
  }, []);

  const commitFreehandDraft = useCallback(() => {
    const draft = refs.draftRef.current;
    if (!draft || draft.kind !== "freehand") return;
    const points = draft.points;
    if (points.length < 2) {
      clearDraft();
      return;
    }
    const view = viewRef.current;
    const tolerancePx = pencilToleranceRef.current;
    const toleranceDoc = screenPxToDoc(tolerancePx, view);
    const fit = fitFreehandCubics(points, { tolerance: toleranceDoc });
    const anchors = fit.anchors.length >= 2 ? fit.anchors : makeFallbackAnchors(points);
    setLastFit({ nodes: anchors.length, samples: points.length, tolerancePx });
    const stroke = buildStroke({
      kind: "pen",
      points: [],
      penAnchors: anchors,
      penClosed: false,
      style: refs.styleRef.current,
      fillRule: fillRuleRef.current,
      lineJoin: lineJoinRef.current,
      allowFill: false,
    });
    commitStroke(stroke);
    clearDraft();
    clearSnap();
  }, [clearDraft, clearSnap, commitStroke, makeFallbackAnchors, refs, viewRef]);

  const commitShapeDraft = useCallback(() => {
    const draft = refs.draftRef.current;
    if (!draft || draft.kind !== "shape") return;
    const view = viewRef.current;
    const start = draft.a;
    const end = draft.b ?? draft.a;
    const movedPx =
      Math.hypot(end[0] - start[0], end[1] - start[1]) * view.scale;
    let a = start;
    let b = end;
    if (movedPx < VECTOR_MIN_DRAG_PX) {
      const half = VECTOR_DEFAULT_SHAPE_SIZE / 2;
      a = [start[0] - half, start[1] - half];
      b = [start[0] + half, start[1] + half];
    }
    const minX = Math.min(a[0], b[0]);
    const minY = Math.min(a[1], b[1]);
    const maxX = Math.max(a[0], b[0]);
    const maxY = Math.max(a[1], b[1]);
    if (maxX - minX < 0.001 || maxY - minY < 0.001) {
      clearDraft();
      return;
    }
    const stroke = buildStroke({
      kind: draft.tool,
      points: [
        [minX, minY],
        [maxX, maxY],
      ],
      style: refs.styleRef.current,
      fillRule: fillRuleRef.current,
      lineJoin: lineJoinRef.current,
      allowFill: true,
    });
    commitStroke(stroke);
    clearDraft();
    clearSnap();
  }, [clearDraft, clearSnap, commitStroke, refs, viewRef]);

  const deleteSelectedNode = useCallback(() => {
    const penEdit = refs.penEditRef.current;
    if (!penEdit || penEdit.selectedAnchor == null) return;
    const index = penEdit.selectedAnchor;
    const tolerance = screenPxToDoc(VECTOR_DELETE_REFIT_TOLERANCE_PX, viewRef.current);
    const result = deleteAnchorWithRefit(penEdit.anchors, index, penEdit.closed, tolerance);
    if (result.anchors.length < 2) {
      const removed = removeStrokesFromDoc(docRef.current, [
        { layerId: penEdit.layerId, strokeId: penEdit.strokeId },
      ]);
      commit(removed);
      applySelection([]);
      exitPenEdit();
      return;
    }
    const next = updateStrokeInDocFull(
      docRef.current,
      penEdit.layerId,
      penEdit.strokeId,
      { penAnchors: result.anchors },
    );
    commit(next);
    penEdit.anchors = result.anchors;
    penEdit.selectedAnchor = null;
    setSelectedNodeIndex(null);
    setSelectedNodeTypeState(null);
    requestPaint();
  }, [applySelection, commit, docRef, exitPenEdit, refs, requestPaint, viewRef]);

  const deleteSelection = useCallback(() => {
    cancelStyleEdit();
    const current = refs.selectionRef.current;
    if (current.length === 0) return;
    const next = removeStrokesFromDoc(docRef.current, current);
    commit(next);
    applySelection([]);
    exitPenEdit();
  }, [applySelection, cancelStyleEdit, commit, docRef, exitPenEdit, refs]);

  const setSelectedNodeType = useCallback(
    (type: VectorNodeType) => {
      flushStyleEdit();
      const penEdit = refs.penEditRef.current;
      if (!penEdit || penEdit.selectedAnchor == null) return;
      const anchors = applyNodeTypeAt(penEdit.anchors, penEdit.selectedAnchor, type);
      const next = updateStrokeInDocFull(
        docRef.current,
        penEdit.layerId,
        penEdit.strokeId,
        { penAnchors: anchors },
      );
      commit(next);
      penEdit.anchors = anchors;
      setSelectedNodeTypeState(type);
      requestPaint();
    },
    [commit, docRef, flushStyleEdit, refs, requestPaint],
  );

  const undo = useCallback(() => {
    flushStyleEdit();
    const next = docState.undo();
    if (!next) return;
    applySelection(filterSelectionsForDoc(next, refs.selectionRef.current));
    syncPenEditFromDoc();
    requestPaint();
  }, [applySelection, docState, flushStyleEdit, refs, requestPaint, syncPenEditFromDoc]);

  const redo = useCallback(() => {
    flushStyleEdit();
    const next = docState.redo();
    if (!next) return;
    applySelection(filterSelectionsForDoc(next, refs.selectionRef.current));
    syncPenEditFromDoc();
    requestPaint();
  }, [applySelection, docState, flushStyleEdit, refs, requestPaint, syncPenEditFromDoc]);

  const selectAll = useCallback(() => {
    flushStyleEdit();
    applySelection(allStrokeSelections(docRef.current));
    exitPenEdit();
  }, [applySelection, docRef, exitPenEdit, flushStyleEdit]);

  const selectStrokes = useCallback(
    (selections: VectorSelection[]) => {
      flushStyleEdit();
      applySelection(selections);
      exitPenEdit();
    },
    [applySelection, exitPenEdit, flushStyleEdit],
  );

  const setTool = useCallback(
    (nextTool: VectorTool) => {
      if (dragRef.current && dragRef.current.kind !== "pan") return;
      flushStyleEdit();
      setToolState(nextTool);
      clearDraft();
      clearSnap();
      if (nextTool !== "move") exitPenEdit();
      setCanvasCursor(
        nextTool === "move"
          ? VECTOR_CURSOR_MOVE
          : nextTool === "pen"
            ? VECTOR_CURSOR_PEN_ADD
            : VECTOR_CURSOR_CROSSHAIR,
      );
      requestPaint();
    },
    [clearDraft, clearSnap, exitPenEdit, flushStyleEdit, requestPaint, setCanvasCursor],
  );

  const setStrokeColor = useCallback(
    (color: string) => {
      setStrokeColorState(color);
      setStrokeEnabledState(Boolean(color && color !== "transparent"));
      applyStylePatch({ stroke: color === "transparent" ? "" : color });
    },
    [applyStylePatch],
  );

  const setFillColor = useCallback(
    (color: string) => {
      setFillColorState(color);
      setFillEnabledState(Boolean(color && color !== "transparent"));
      applyStylePatch({ fill: color === "transparent" ? "" : color });
    },
    [applyStylePatch],
  );

  const setStrokeWidth = useCallback(
    (width: number) => {
      setStrokeWidthState(width);
      setStrokeEnabledState(width > 0);
      applyStylePatch({ strokeWidth: width });
    },
    [applyStylePatch],
  );

  const setStrokeEnabled = useCallback(
    (enabled: boolean) => {
      setStrokeEnabledState(enabled);
      applyStylePatch({
        stroke: enabled ? strokeColor : "",
        strokeWidth: enabled ? Math.max(0.5, strokeWidth) : 0,
      });
    },
    [applyStylePatch, strokeColor, strokeWidth],
  );

  const setFillEnabled = useCallback(
    (enabled: boolean) => {
      setFillEnabledState(enabled);
      applyStylePatch({ fill: enabled ? fillColor : "" });
    },
    [applyStylePatch, fillColor],
  );

  const setLineJoin = useCallback(
    (join: VectorLineJoin) => {
      setLineJoinState(join);
      applyStylePatch({ lineJoin: join });
    },
    [applyStylePatch],
  );

  const setFillRule = useCallback(
    (rule: VectorFillRule) => {
      setFillRuleState(rule);
      applyStylePatch({ fillRule: rule });
    },
    [applyStylePatch],
  );

  const setPencilTolerancePx = useCallback((px: number) => {
    setPencilTolerancePxState(
      Math.max(VECTOR_PENCIL_MIN_TOLERANCE_PX, Math.min(VECTOR_PENCIL_MAX_TOLERANCE_PX, px)),
    );
  }, []);

  const setSnapEnabled = useCallback((enabled: boolean) => setSnapEnabledState(enabled), []);
  const setScaleStrokesWithObject = useCallback(
    (enabled: boolean) => setScaleStrokesWithObjectState(enabled),
    [],
  );

  // Keep style controls in sync with the primary selected stroke.
  const primaryKey = useMemo(() => {
    const primary = primarySelection(selection);
    return primary ? `${primary.layerId}:${primary.strokeId}` : "";
  }, [selection]);

  useEffect(() => {
    if (!primaryKey) return;
    const primary = primarySelection(refs.selectionRef.current);
    if (!primary) return;
    const stroke = findStrokeInDoc(docState.doc, primary);
    if (!stroke) return;
    if (stroke.stroke) setStrokeColorState(stroke.stroke);
    if (stroke.fill) setFillColorState(stroke.fill);
    setStrokeWidthState(stroke.strokeWidth);
    // Do not mirror the enable flags from the selection: they are the
    // drawing defaults for the next shape, and selecting a fill-only object
    // must not silently turn off the outline (or vice versa).
    setLineJoinState(stroke.lineJoin);
    setFillRuleState(stroke.fillRule);
  }, [docState.doc, primaryKey, refs]);

  // Prune selection and refresh node editing after document changes.
  useEffect(() => {
    const pruned = filterSelectionsForDoc(docState.doc, refs.selectionRef.current);
    if (selectionKey(pruned) !== selectionKey(refs.selectionRef.current)) {
      refs.selectionRef.current = pruned;
      setSelectionState(pruned);
    }
    syncPenEditFromDoc();
  }, [docState.doc, docState.historyVersion, refs, syncPenEditFromDoc]);

  useEffect(() => {
    if (!open) return;
    refs.selectionRef.current = [];
    setSelectionState([]);
    refs.draftRef.current = null;
    refs.marqueeRef.current = null;
    refs.penEditRef.current = null;
    refs.snapGuidesRef.current = [];
    setNodeEditActive(false);
    setSelectedNodeIndex(null);
    setSelectedNodeTypeState(null);
    setLastFit(null);
    requestPaint();
  }, [open, refs, requestPaint]);

  const updateHover = useCallback(
    (clientX: number, clientY: number, altHeld: boolean) => {
      lastPointerRef.current = { x: clientX, y: clientY };
      altRef.current = altHeld;
      const point = boardPoint(clientX, clientY, false);
      if (!point) return;
      const view = currentView();

      if (toolRef.current === "move") {
        const penEdit = refs.penEditRef.current;
        if (penEdit) {
          const hit = hitPenAnchors(penEdit.anchors, point, view, {
            includeCurve: true,
            closed: penEdit.closed,
          });
          if (altHeld && hit?.kind === "anchor") {
            penEdit.hoverDelete = hit.index;
            penEdit.addHint = null;
            setCanvasCursor(VECTOR_CURSOR_PEN_REMOVE);
          } else if (hit && hit.kind !== "curve") {
            penEdit.hoverDelete = null;
            penEdit.addHint = null;
            setCanvasCursor(VECTOR_CURSOR_MOVE);
          } else if (hit?.kind === "curve") {
            penEdit.hoverDelete = null;
            penEdit.addHint = {
              x: hit.point[0],
              y: hit.point[1],
              segmentIndex: hit.segmentIndex,
              t: hit.t,
            };
            setCanvasCursor(VECTOR_CURSOR_PEN_ADD);
          } else {
            penEdit.hoverDelete = null;
            penEdit.addHint = null;
            setCanvasCursor(VECTOR_CURSOR_MOVE);
          }
          requestPaint();
          return;
        }
        const currentSelection = refs.selectionRef.current;
        if (currentSelection.length > 0) {
          const bounds = selectionBounds(docRef.current, currentSelection);
          if (bounds) {
            const handle = hitResizeHandle(bounds, point, view);
            if (handle) {
              setCanvasCursor(VECTOR_RESIZE_CURSORS[handle]);
              return;
            }
          }
        }
        setCanvasCursor(VECTOR_CURSOR_MOVE);
        return;
      }

      if (toolRef.current === "pen") {
        const draft = refs.draftRef.current;
        if (draft && draft.kind === "pen") {
          const hit = hitPenAnchors(draft.anchors, point, view, {
            includeCurve: false,
          });
          const overFirst =
            hit?.kind === "anchor" && hit.index === 0 && draft.anchors.length >= 2;
          draft.closeHover = overFirst && !altHeld;
          draft.removeHintIndex =
            altHeld && hit?.kind === "anchor" ? hit.index : null;
          if (draft.removeHintIndex != null) setCanvasCursor(VECTOR_CURSOR_PEN_REMOVE);
          else if (overFirst) setCanvasCursor(VECTOR_CURSOR_CLOSE);
          else setCanvasCursor(VECTOR_CURSOR_PEN_ADD);
          requestPaint();
          return;
        }
        setCanvasCursor(VECTOR_CURSOR_PEN_ADD);
        return;
      }

      setCanvasCursor(VECTOR_CURSOR_CROSSHAIR);
    },
    [boardPoint, currentView, docRef, refs, requestPaint, setCanvasCursor],
  );

  const startPan = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const view = currentView();
      dragRef.current = {
        kind: "pan",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTx: view.tx,
        startTy: view.ty,
      };
      canvas.setPointerCapture(event.pointerId);
      setCanvasCursor("grabbing");
      event.preventDefault();
    },
    [currentView, setCanvasCursor],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (event.button === 1 || (event.button === 0 && spaceDownRef.current)) {
      startPan(event);
      return;
    }
    if (event.button !== 0) return;
    flushStyleEdit();
    canvas.focus({ preventScroll: true });
    if (dragRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const view = currentView();
    const raw: VectorPoint = [
      (event.clientX - rect.left - view.tx) / view.scale,
      (event.clientY - rect.top - view.ty) / view.scale,
    ];
    const point = clampToBoard(raw, docRef.current.size);
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    altRef.current = pointerAlt(event);
    const doc = docRef.current;

    // Node editing takes priority in the move tool.
    if (toolRef.current === "move" && refs.penEditRef.current) {
      const penEdit = refs.penEditRef.current;
      const hit = hitPenAnchors(penEdit.anchors, raw, view, {
        includeCurve: true,
        closed: penEdit.closed,
      });
      if (hit) {
        canvas.setPointerCapture(event.pointerId);
        if (hit.kind === "anchor") {
          if (pointerAlt(event)) {
            const tolerance = screenPxToDoc(VECTOR_DELETE_REFIT_TOLERANCE_PX, view);
            const result = deleteAnchorWithRefit(
              penEdit.anchors,
              hit.index,
              penEdit.closed,
              tolerance,
            );
            if (result.anchors.length < 2) {
              const removed = removeStrokesFromDoc(doc, [
                { layerId: penEdit.layerId, strokeId: penEdit.strokeId },
              ]);
              commit(removed);
              applySelection([]);
              exitPenEdit();
            } else {
              commit(
                updateStrokeInDocFull(doc, penEdit.layerId, penEdit.strokeId, {
                  penAnchors: result.anchors,
                }),
              );
              penEdit.anchors = result.anchors;
              selectPenAnchor(null);
            }
            event.preventDefault();
            return;
          }
          selectPenAnchor(hit.index);
          beginLiveEdit([{ layerId: penEdit.layerId, strokeId: penEdit.strokeId }]);
          penEdit.drag = "anchor";
          snapCandidatesRef.current = collectSnapCandidates(
            doc,
            new Set([penEdit.strokeId]),
          );
          dragRef.current = {
            kind: "pen-edit",
            pointerId: event.pointerId,
            mode: "anchor",
            index: hit.index,
            last: [penEdit.anchors[hit.index]!.x, penEdit.anchors[hit.index]!.y],
          };
        } else if (hit.kind === "handle-in" || hit.kind === "handle-out") {
          selectPenAnchor(hit.index);
          beginLiveEdit([{ layerId: penEdit.layerId, strokeId: penEdit.strokeId }]);
          penEdit.drag = hit.kind === "handle-in" ? "handle-in" : "handle-out";
          dragRef.current = {
            kind: "pen-edit",
            pointerId: event.pointerId,
            mode: hit.kind,
            index: hit.index,
            last: point,
          };
        } else {
          const split = insertAnchorAtSegment(
            penEdit.anchors,
            hit.segmentIndex,
            hit.t,
            penEdit.closed,
          );
          if (split) {
            commit(
              updateStrokeInDocFull(doc, penEdit.layerId, penEdit.strokeId, {
                penAnchors: split.anchors,
              }),
            );
            penEdit.anchors = split.anchors;
            selectPenAnchor(split.insertedIndex);
          } else {
            canvas.releasePointerCapture(event.pointerId);
          }
        }
        event.preventDefault();
        return;
      }
      exitPenEdit();
    }

    if (toolRef.current === "move") {
      const currentSelection = refs.selectionRef.current;
      if (currentSelection.length > 0) {
        const bounds = selectionBounds(doc, currentSelection);
        if (bounds) {
          const handle = hitResizeHandle(bounds, raw, view);
          if (handle) {
            canvas.setPointerCapture(event.pointerId);
            beginLiveEdit(currentSelection);
            dragRef.current = {
              kind: "resize",
              pointerId: event.pointerId,
              handle,
              bounds,
              anchor: oppositeResizeAnchor(bounds, handle),
              startPoint: point,
              moved: false,
            };
            event.preventDefault();
            return;
          }
        }
      }

      const hitTolerance = screenPxToDoc(VECTOR_PATH_HIT_RADIUS_PX, view);
      const hit = findTopStrokeAt(doc, raw, hitTolerance);
      if (!hit) {
        refs.marqueeRef.current = {
          minX: raw[0],
          minY: raw[1],
          maxX: raw[0],
          maxY: raw[1],
        };
        dragRef.current = {
          kind: "marquee",
          pointerId: event.pointerId,
          start: raw,
          base: event.shiftKey ? currentSelection : [],
          additive: event.shiftKey,
        };
        if (!event.shiftKey) applySelection([]);
        canvas.setPointerCapture(event.pointerId);
        requestPaint();
        event.preventDefault();
        return;
      }

      const hitSelection: VectorSelection = {
        layerId: hit.layerId,
        strokeId: hit.stroke.id,
      };
      const alreadySelected = currentSelection.some(
        (s) => s.layerId === hitSelection.layerId && s.strokeId === hitSelection.strokeId,
      );
      let nextSelection: VectorSelection[];
      if (event.shiftKey) {
        nextSelection = alreadySelected
          ? currentSelection.filter(
              (s) =>
                !(s.layerId === hitSelection.layerId && s.strokeId === hitSelection.strokeId),
            )
          : [...currentSelection, hitSelection];
      } else {
        nextSelection = alreadySelected ? currentSelection : [hitSelection];
      }

      if (pointerAlt(event)) {
        const dup = duplicateSelectionsInPlace(doc, nextSelection);
        if (dup) {
          commit(dup.doc);
          nextSelection = dup.newSelections;
        }
      }

      applySelection(nextSelection);
      if (nextSelection.length === 0) {
        event.preventDefault();
        return;
      }
      canvas.setPointerCapture(event.pointerId);
      beginLiveEdit(nextSelection);
      dragRef.current = {
        kind: "move",
        pointerId: event.pointerId,
        selections: nextSelection,
        last: point,
        moved: false,
      };
      setCanvasCursor("grabbing");
      event.preventDefault();
      return;
    }

    const active = getActiveLayer(doc);
    if (!active || !active.visible) return;

    if (toolRef.current === "pen") {
      const draft = refs.draftRef.current;
      if (draft && draft.kind === "pen") {
        const hit = hitPenAnchors(draft.anchors, raw, view, {
          includeCurve: false,
        });
        canvas.setPointerCapture(event.pointerId);
        if (hit?.kind === "anchor" && pointerAlt(event)) {
          const result = deleteAnchorWithRefit(
            draft.anchors,
            hit.index,
            false,
            screenPxToDoc(VECTOR_DELETE_REFIT_TOLERANCE_PX, view),
          );
          if (result.anchors.length === 0) clearDraft();
          else {
            draft.anchors = result.anchors;
            draft.selectedAnchor = null;
            requestPaint();
          }
          event.preventDefault();
          return;
        }
        if (hit?.kind === "anchor" && hit.index === 0 && draft.anchors.length >= 2) {
          finishPenDraft(true);
          event.preventDefault();
          return;
        }
        if (hit?.kind === "anchor") {
          selectDraftAnchor(draft, hit.index);
          dragRef.current = null;
          event.preventDefault();
          return;
        }
        if (hit?.kind === "handle-in" || hit?.kind === "handle-out") {
          selectDraftAnchor(draft, hit.index);
          dragRef.current = {
            kind: "pen-handle",
            pointerId: event.pointerId,
            index: hit.index,
            which: hit.kind === "handle-in" ? "in" : "out",
          };
          event.preventDefault();
          return;
        }
        const placed = placePenAnchor(draft, point, event);
        if (placed) {
          dragRef.current = {
            kind: "pen-place",
            pointerId: event.pointerId,
            index: draft.anchors.length - 1,
            start: placed,
          };
          event.preventDefault();
          return;
        }
      } else {
        const placed = applySnap(point);
        const anchors: VectorPenAnchor[] = [
          {
            x: placed.point[0],
            y: placed.point[1],
            type: "corner",
          },
        ];
        const nextDraft: EditorDraft = {
          kind: "pen",
          anchors,
          closed: false,
          placingAnchor: 0,
          placingType: "corner",
          closeHover: false,
          removeHintIndex: null,
          selectedAnchor: 0,
        };
        refs.draftRef.current = nextDraft;
        canvas.setPointerCapture(event.pointerId);
        dragRef.current = {
          kind: "pen-place",
          pointerId: event.pointerId,
          index: 0,
          start: placed.point,
        };
        requestPaint();
        event.preventDefault();
        return;
      }
    }

    if (toolRef.current === "pencil") {
      const snap = applySnap(point);
      refs.draftRef.current = { kind: "freehand", points: [snap.point] };
      canvas.setPointerCapture(event.pointerId);
      dragRef.current = {
        kind: "pen-place",
        pointerId: event.pointerId,
        index: -1,
        start: snap.point,
      };
      requestPaint();
      event.preventDefault();
      return;
    }

    if (toolRef.current === "rect" || toolRef.current === "ellipse") {
      const snap = applySnap(point);
      refs.draftRef.current = {
        kind: "shape",
        tool: toolRef.current,
        a: snap.point,
        b: snap.point,
      };
      canvas.setPointerCapture(event.pointerId);
      dragRef.current = {
        kind: "pen-place",
        pointerId: event.pointerId,
        index: -2,
        start: snap.point,
      };
      requestPaint();
      event.preventDefault();
    }
  };
  // The draw-tool drags share the same capture lifecycle; the draft kind
  // decides what pointerup means.

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    altRef.current = pointerAlt(event);
    const drag = dragRef.current;
    if (!drag) {
      updateHover(event.clientX, event.clientY, pointerAlt(event));
      return;
    }

    if (drag.kind === "pan") {
      viewState.setView(
        {
          scale: currentView().scale,
          tx: drag.startTx + (event.clientX - drag.startX),
          ty: drag.startTy + (event.clientY - drag.startY),
        },
        true,
      );
      return;
    }

    const raw = boardPoint(event.clientX, event.clientY, false);
    if (!raw) return;

    if (drag.kind === "pen-edit") {
      const penEdit = refs.penEditRef.current;
      const live = docState.liveEditRef.current;
      if (!penEdit || !live) return;
      const anchors = penEdit.anchors.map((a) => ({ ...a }));
      if (drag.mode === "anchor") {
        const anchor = anchors[drag.index];
        if (!anchor) return;
        const snapped = snapEnabledRef.current
          ? findSnap(raw, snapCandidatesRef.current, {
              tolerance: screenPxToDoc(8, currentView()),
              board: docRef.current.size,
              boardGuides: true,
            })
          : { point: raw, guides: [] as SnapGuide[] };
        const dx = snapped.point[0] - drag.last[0];
        const dy = snapped.point[1] - drag.last[1];
        const moved = moveAnchor(anchors, drag.index, dx, dy);
        penEdit.anchors = moved;
        drag.last = snapped.point;
        refs.snapGuidesRef.current = snapped.guides;
        updateLive(
          updateStrokeInDocFull(live.liveDoc, penEdit.layerId, penEdit.strokeId, {
            penAnchors: moved,
          }),
        );
      } else {
        const anchor = anchors[drag.index];
        if (!anchor) return;
        dragNodeHandle(anchor, drag.mode === "handle-in" ? "in" : "out", raw);
        penEdit.anchors = anchors;
        updateLive(
          updateStrokeInDocFull(live.liveDoc, penEdit.layerId, penEdit.strokeId, {
            penAnchors: anchors,
          }),
        );
      }
      requestPaint();
      return;
    }

    if (drag.kind === "resize") {
      const live = docState.liveEditRef.current;
      if (!live) return;
      const origin = event.altKey
        ? [
            (drag.bounds.minX + drag.bounds.maxX) / 2,
            (drag.bounds.minY + drag.bounds.maxY) / 2,
          ]
        : drag.anchor;
      const affectsX = drag.handle.includes("e") || drag.handle.includes("w");
      const affectsY = drag.handle.includes("n") || drag.handle.includes("s");
      const handlePos = resizeHandlePoint(drag.bounds, drag.handle);
      let sx = 1;
      let sy = 1;
      if (affectsX && Math.abs(handlePos[0] - origin[0]) > 1e-9) {
        sx = (raw[0] - origin[0]) / (handlePos[0] - origin[0]);
      }
      if (affectsY && Math.abs(handlePos[1] - origin[1]) > 1e-9) {
        sy = (raw[1] - origin[1]) / (handlePos[1] - origin[1]);
      }
      if (event.shiftKey) {
        if (affectsX && affectsY) {
          const factor = Math.max(Math.abs(sx), Math.abs(sy));
          sx = (sx < 0 ? -1 : 1) * factor;
          sy = (sy < 0 ? -1 : 1) * factor;
        } else if (affectsX) {
          sy = Math.abs(sx) * (sy < 0 ? -1 : 1);
        } else if (affectsY) {
          sx = Math.abs(sy) * (sx < 0 ? -1 : 1);
        }
      }
      if (affectsX && !affectsY) sy = 1;
      if (affectsY && !affectsX) sx = 1;
      drag.moved = true;
      updateLive(
        applyScaleStrokesInDoc(
          live.originalDoc,
          live.selections,
          origin[0],
          origin[1],
          sx,
          sy,
          scaleStrokesRef.current,
        ),
      );
      requestPaint();
      return;
    }

    if (drag.kind === "move") {
      const live = docState.liveEditRef.current;
      if (!live) return;
      const point = clampToBoard(raw, docRef.current.size);
      const dx = point[0] - drag.last[0];
      const dy = point[1] - drag.last[1];
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
      drag.last = point;
      drag.moved = true;
      updateLive(applyTranslateStrokesInDoc(live.liveDoc, drag.selections, dx, dy));
      requestPaint();
      return;
    }

    if (drag.kind === "marquee") {
      const start = drag.start;
      const rect: VectorBounds = {
        minX: Math.min(start[0], raw[0]),
        minY: Math.min(start[1], raw[1]),
        maxX: Math.max(start[0], raw[0]),
        maxY: Math.max(start[1], raw[1]),
      };
      refs.marqueeRef.current = rect;
      const hits = findStrokesIntersectingRect(docRef.current, rect);
      if (drag.additive) {
        const seen = new Set<string>();
        const merged: VectorSelection[] = [];
        for (const item of [...drag.base, ...hits]) {
          const key = `${item.layerId}:${item.strokeId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(item);
        }
        applySelection(merged);
      } else {
        applySelection(hits);
      }
      requestPaint();
      return;
    }

    if (drag.kind === "pen-place") {
      const draft = refs.draftRef.current;
      if (!draft) return;
      if (draft.kind === "freehand") {
        const events = coalescedPointerEvents(event);
        for (const sample of events) {
          const p = boardPoint(sample.clientX, sample.clientY, true);
          if (!p) continue;
          const last = draft.points[draft.points.length - 1];
          if (
            last &&
            metricDistance(last, p) < screenPxToDoc(1.1, currentView())
          ) {
            continue;
          }
          draft.points.push(p);
        }
        requestPaint();
        return;
      }
      if (draft.kind === "shape") {
        let end = clampToBoard(raw, docRef.current.size);
        if (event.shiftKey) {
          const dx = end[0] - draft.a[0];
          const dy = end[1] - draft.a[1];
          const size = Math.max(Math.abs(dx), Math.abs(dy));
          end = [draft.a[0] + (dx < 0 ? -size : size), draft.a[1] + (dy < 0 ? -size : size)];
          clearSnap();
        } else {
          end = applySnap(end).point;
        }
        draft.b = end;
        requestPaint();
        return;
      }
      if (draft.kind === "pen") {
        const index = drag.index;
        const anchor = draft.anchors[index];
        if (!anchor) return;
        // The press point is the node; the drag vector is the handle. Moving
        // the node itself here would collapse the handle onto the anchor.
        anchor.x = drag.start[0];
        anchor.y = drag.start[1];
        let handlePoint = clampToBoard(raw, docRef.current.size);
        const anchorPoint: VectorPoint = [anchor.x, anchor.y];
        if (event.shiftKey) {
          handlePoint = applyAxisLock(anchorPoint, handlePoint);
        } else if (event.altKey) {
          handlePoint = applyAngleLock(anchorPoint, handlePoint);
        }
        clearSnap();
        const movedPx =
          metricDistance(handlePoint, anchorPoint) * currentView().scale;
        if (movedPx < VECTOR_MIN_DRAG_PX) {
          clearHandles(anchor);
          anchor.type = "corner";
        } else {
          setSymmetricHandles(anchor, handlePoint);
        }
        requestPaint();
        return;
      }
    }

    if (drag.kind === "pen-handle") {
      const draft = refs.draftRef.current;
      if (!draft || draft.kind !== "pen") return;
      const anchor = draft.anchors[drag.index];
      if (!anchor) return;
      dragNodeHandle(anchor, drag.which, clampToBoard(raw, docRef.current.size));
      requestPaint();
    }
  };

  const releaseCapture = (pointerId: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    releaseCapture(event.pointerId);
    clearSnap();
    if (!drag) {
      updateHover(event.clientX, event.clientY, pointerAlt(event));
      return;
    }

    if (drag.kind === "pan") {
      setCanvasCursor(spaceDownRef.current ? "grab" : cursorForTool(toolRef.current));
      return;
    }

    if (drag.kind === "move" || drag.kind === "resize") {
      if (drag.moved) endLiveEdit();
      else cancelLiveEdit();
      setCanvasCursor(VECTOR_CURSOR_MOVE);
      requestPaint();
      return;
    }

    if (drag.kind === "marquee") {
      refs.marqueeRef.current = null;
      requestPaint();
      return;
    }

    if (drag.kind === "pen-edit") {
      const penEdit = refs.penEditRef.current;
      if (penEdit) penEdit.drag = null;
      endLiveEdit();
      syncPenEditFromDoc();
      requestPaint();
      return;
    }

    if (drag.kind === "pen-place") {
      const draft = refs.draftRef.current;
      if (draft?.kind === "pen") {
        const anchor = draft.anchors[drag.index];
        if (anchor) {
          const out = anchorOut(anchor);
          const movedPx = out
            ? metricDistance(out, [anchor.x, anchor.y]) * currentView().scale
            : 0;
          if (movedPx < VECTOR_MIN_DRAG_PX) {
            clearHandles(anchor);
            anchor.type = "corner";
          }
        }
        draft.placingAnchor = null;
        draft.placingType = anchor?.type ?? "corner";
      }
      if (draft?.kind === "freehand" && drag.index === -1) {
        commitFreehandDraft();
        return;
      }
      if (draft?.kind === "shape" && drag.index === -2) {
        commitShapeDraft();
        return;
      }
      requestPaint();
      updateHover(event.clientX, event.clientY, pointerAlt(event));
      return;
    }

    if (drag.kind === "pen-handle") {
      requestPaint();
      updateHover(event.clientX, event.clientY, pointerAlt(event));
    }
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    releaseCapture(event.pointerId);
    cancelLiveEdit();
    clearDraft();
    refs.marqueeRef.current = null;
    requestPaint();
    if (drag) setCanvasCursor(cursorForTool(toolRef.current));
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolRef.current === "pen") {
      const draft = refs.draftRef.current;
      if (draft?.kind === "pen") {
        finishPenDraft(false);
        event.preventDefault();
      }
      return;
    }
    if (toolRef.current !== "move") return;
    const point = boardPoint(event.clientX, event.clientY, false);
    if (!point) return;
    const hit = findTopStrokeAt(
      docRef.current,
      point,
      screenPxToDoc(VECTOR_PATH_HIT_RADIUS_PX, currentView()),
    );
    if (hit && hit.stroke.kind === "pen" && hit.stroke.penAnchors?.length) {
      enterPenEdit({ layerId: hit.layerId, strokeId: hit.stroke.id });
      event.preventDefault();
    }
  };

  const onPointerLeave = () => {
    const penEdit = refs.penEditRef.current;
    if (penEdit) {
      penEdit.hoverDelete = null;
      penEdit.addHint = null;
    }
    const draft = refs.draftRef.current;
    if (draft?.kind === "pen") {
      draft.closeHover = false;
      draft.removeHintIndex = null;
    }
    setCanvasCursor(cursorForTool(toolRef.current));
    requestPaint();
  };

  const placePenAnchor = (
    draft: Extract<EditorDraft, { kind: "pen" }>,
    point: VectorPoint,
    event: React.PointerEvent<HTMLCanvasElement>,
  ): VectorPoint | null => {
    const base =
      draft.anchors.length > 0
        ? ([
            draft.anchors[draft.anchors.length - 1]!.x,
            draft.anchors[draft.anchors.length - 1]!.y,
          ] as VectorPoint)
        : null;
    const extraCandidates: SnapCandidate[] = draft.anchors.map((a, index) => ({
      point: [a.x, a.y],
      kind: "node",
      anchorIndex: index,
    }));
    const result = applySnap(point, {
      base,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      extraCandidates,
      exclude: new Set(),
    });
    draft.anchors.push({
      x: result.point[0],
      y: result.point[1],
      type: "corner",
    });
    draft.placingAnchor = draft.anchors.length - 1;
    draft.selectedAnchor = draft.anchors.length - 1;
    requestPaint();
    return result.point;
  };

  const selectDraftAnchor = (
    draft: Extract<EditorDraft, { kind: "pen" }>,
    index: number,
  ) => {
    draft.selectedAnchor = index;
    requestPaint();
  };

  // Keyboard shortcuts.
  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    // Do not steal Space/Enter from focused buttons or links: keyboard users
    // must still be able to activate the toolbar.
    if (
      target?.closest('button, [role="button"], a[href]') &&
      (event.key === " " || event.key === "Enter")
    ) {
      return;
    }

    flushStyleEdit();

    if (event.key === " " || event.code === "Space") {
      if (!spaceDownRef.current) {
        spaceDownRef.current = true;
        if (!refs.draftRef.current) setCanvasCursor("grab");
      }
      if (!refs.draftRef.current) event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      if (refs.draftRef.current) {
        event.preventDefault();
        clearDraft();
        return;
      }
      if (refs.penEditRef.current) {
        event.preventDefault();
        exitPenEdit();
        return;
      }
      if (refs.selectionRef.current.length > 0) {
        event.preventDefault();
        applySelection([]);
        return;
      }
      event.preventDefault();
      onRequestClose();
      return;
    }

    if (event.key === "Enter" && toolRef.current === "pen") {
      const draft = refs.draftRef.current;
      if (draft?.kind === "pen" && draft.anchors.length >= 2) {
        event.preventDefault();
        finishPenDraft(event.shiftKey);
        return;
      }
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      const draft = refs.draftRef.current;
      if (draft?.kind === "pen" && draft.anchors.length > 0) {
        event.preventDefault();
        const index =
          draft.removeHintIndex ?? draft.anchors.length - 1;
        const result = deleteAnchorWithRefit(
          draft.anchors,
          index,
          false,
          screenPxToDoc(VECTOR_DELETE_REFIT_TOLERANCE_PX, currentView()),
        );
        if (result.anchors.length === 0) clearDraft();
        else {
          draft.anchors = result.anchors;
          draft.selectedAnchor = null;
          draft.removeHintIndex = null;
          requestPaint();
        }
        return;
      }
      if (refs.penEditRef.current?.selectedAnchor != null) {
        event.preventDefault();
        deleteSelectedNode();
        return;
      }
      if (refs.selectionRef.current.length > 0) {
        event.preventDefault();
        deleteSelection();
      }
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "a") {
        event.preventDefault();
        selectAll();
        return;
      }
      if (key === "d") {
        event.preventDefault();
        const dup = duplicateSelectionsInPlace(
          docRef.current,
          refs.selectionRef.current,
        );
        if (dup) {
          commit(dup.doc);
          applySelection(dup.newSelections);
        }
        return;
      }
      if (key === "c") {
        const strokes = getStrokesForSelections(docRef.current, refs.selectionRef.current);
        if (strokes.length > 0) {
          event.preventDefault();
          void navigator.clipboard
            .writeText(serializeVectorStrokesForClipboard(strokes))
            .catch(() => {});
        }
        return;
      }
      if (key === "v") {
        event.preventDefault();
        void (async () => {
          try {
            const text = await navigator.clipboard.readText();
            const strokes = parseVectorStrokeClipboardText(text);
            if (!strokes) return;
            const appended = appendClonedStrokesToActiveLayer(
              docRef.current,
              strokes,
              20,
              20,
            );
            if (!appended) return;
            commit(appended.doc);
            const active = getActiveLayer(appended.doc);
            if (active) {
              applySelection(
                appended.newStrokeIds.map((strokeId) => ({
                  layerId: active.id,
                  strokeId,
                })),
              );
            }
          } catch {
            /* clipboard unavailable */
          }
        })();
        return;
      }
      if (key === "]") {
        event.preventDefault();
        event.stopPropagation();
        commit(
          applyZOrderInDoc(
            docRef.current,
            refs.selectionRef.current,
            event.shiftKey ? "front" : "forward",
          ),
        );
        return;
      }
      if (key === "[") {
        event.preventDefault();
        event.stopPropagation();
        commit(
          applyZOrderInDoc(
            docRef.current,
            refs.selectionRef.current,
            event.shiftKey ? "back" : "backward",
          ),
        );
        return;
      }
      if (key === "=" || key === "+") {
        event.preventDefault();
        zoomAtCenter(1.2);
        return;
      }
      if (key === "-" || key === "_") {
        event.preventDefault();
        zoomAtCenter(1 / 1.2);
        return;
      }
      if (key === "0") {
        event.preventDefault();
        resetView();
        return;
      }
      if (key === "1") {
        event.preventDefault();
        fitView();
        return;
      }
    }

    if (refs.penEditRef.current?.selectedAnchor != null) {
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.length === 1) {
        const key = event.key.toLowerCase();
        const type =
          key === "c"
            ? "cusp"
            : key === "s"
              ? "smooth"
              : key === "y"
                ? "symmetric"
                : key === "k"
                  ? "corner"
                  : null;
        if (type) {
          event.preventDefault();
          setSelectedNodeType(type);
          return;
        }
      }
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.length === 1) {
      const key = event.key.toLowerCase();
      if (key === "v") setTool("move");
      else if (key === "p" && event.shiftKey) setTool("pencil");
      else if (key === "p") setTool("pen");
      else if (key === "r") setTool("rect");
      else if (key === "o") setTool("ellipse");
      else return;
      event.preventDefault();
      return;
    }

    if (
      (event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight") &&
      refs.selectionRef.current.length > 0
    ) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const view = currentView();
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step / view.scale;
      if (event.key === "ArrowRight") dx = step / view.scale;
      if (event.key === "ArrowUp") dy = -step / view.scale;
      if (event.key === "ArrowDown") dy = step / view.scale;
      commit(
        applyTranslateStrokesInDoc(
          docRef.current,
          refs.selectionRef.current,
          dx,
          dy,
        ),
      );
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => keyHandlerRef.current(event);
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " || event.code === "Space") {
        spaceDownRef.current = false;
        setCanvasCursor(cursorForTool(toolRef.current));
      }
      if (event.key === "Alt") altRef.current = false;
    };
    const onBlur = () => {
      spaceDownRef.current = false;
      altRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [open, setCanvasCursor]);

  useEffect(() => {
    // A range drag can end outside the input; still commit exactly once.
    const onPointerUp = () => {
      if (styleEditRef.current?.interaction) flushStyleEdit();
    };
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
    return () => {
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      const edit = styleEditRef.current;
      if (edit?.timer != null) window.clearTimeout(edit.timer);
      styleEditRef.current = null;
    };
  }, [flushStyleEdit]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCanvasCursor(cursorForTool(toolRef.current));
    // The dialog owns the keyboard: move focus off the panel button that
    // opened it so Enter/Space go to the drawing surface, not that button.
    const raf = requestAnimationFrame(() => {
      canvas.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, setCanvasCursor, tool]);

  // The canvas element is owned by the view component; the editor receives it
  // through a ref callback exposed below.
  return {
    tool,
    setTool,
    selection,
    stats: {
      strokes: docState.stats.strokes,
      anchors: docState.stats.anchors,
      selected: selection.length,
    },
    nodeEditActive,
    selectedNodeType,
    selectedNodeIndex,
    canUndo: docState.canUndo,
    canRedo: docState.canRedo,
    strokeColor,
    fillColor,
    strokeWidth,
    strokeEnabled,
    fillEnabled,
    lineJoin,
    fillRule,
    pencilTolerancePx,
    snapEnabled,
    scaleStrokesWithObject,
    lastFit,
    setStrokeColor,
    setFillColor,
    setStrokeWidth,
    setStrokeEnabled,
    setFillEnabled,
    setLineJoin,
    setFillRule,
    setPencilTolerancePx,
    setSnapEnabled,
    setScaleStrokesWithObject,
    beginStyleInteraction,
    endStyleInteraction,
    flushStyleEdit,
    cancelStyleEdit,
    undo,
    redo,
    deleteSelection,
    selectAll,
    selectStrokes,
    setSelectedNodeType,
    deleteSelectedNode,
    finishPenDraft,
    cancelDraft: clearDraft,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onDoubleClick,
      onPointerLeave,
      onContextMenu: (event) => event.preventDefault(),
    },
  };
}

type SnapResultLike = {
  point: VectorPoint;
  guides: SnapGuide[];
  snappedX: boolean;
  snappedY: boolean;
};

function coalescedPointerEvents(event: React.PointerEvent): PointerEvent[] {
  const native = event.nativeEvent as PointerEvent & {
    getCoalescedEvents?: () => PointerEvent[];
  };
  const coalesced = native.getCoalescedEvents?.() ?? [];
  return coalesced.length > 0 ? coalesced : [native];
}

function resizeHandlePoint(bounds: VectorBounds, handle: VectorResizeHandleId): VectorPoint {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  switch (handle) {
    case "nw":
      return [bounds.minX, bounds.minY];
    case "n":
      return [cx, bounds.minY];
    case "ne":
      return [bounds.maxX, bounds.minY];
    case "e":
      return [bounds.maxX, cy];
    case "se":
      return [bounds.maxX, bounds.maxY];
    case "s":
      return [cx, bounds.maxY];
    case "sw":
      return [bounds.minX, bounds.maxY];
    case "w":
      return [bounds.minX, cy];
  }
}

function oppositeResizeAnchor(bounds: VectorBounds, handle: VectorResizeHandleId): VectorPoint {
  const opposite: Record<VectorResizeHandleId, VectorResizeHandleId> = {
    nw: "se",
    n: "s",
    ne: "sw",
    e: "w",
    se: "nw",
    s: "n",
    sw: "ne",
    w: "e",
  };
  return resizeHandlePoint(bounds, opposite[handle]);
}
