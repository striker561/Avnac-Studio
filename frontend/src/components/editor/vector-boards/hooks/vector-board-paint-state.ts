import type { MutableRefObject } from "react";
import type {
  VectorBoardDocument,
  VectorBounds,
  VectorDraft,
  VectorPenAnchor,
  VectorPoint,
  VectorSelection,
  VectorViewport,
} from "@/lib/avnac-vector";
import type { SnapGuide } from "@/lib/avnac-vector";

export type VectorBoardLiveEdit = {
  originalDoc: VectorBoardDocument;
  /** Original document with the selected strokes removed (cache input). */
  baseDoc: VectorBoardDocument;
  liveDoc: VectorBoardDocument;
  selections: VectorSelection[];
};

export type PenEditVisual = {
  layerId: string;
  strokeId: string;
  anchors: VectorPenAnchor[];
  closed: boolean;
  selectedAnchor: number | null;
  drag: "anchor" | "handle-in" | "handle-out" | null;
  addHint: { x: number; y: number; segmentIndex: number; t: number } | null;
  hoverDelete: number | null;
};

export type PenDraft = Extract<VectorDraft, { kind: "pen" }> & {
  closeHover: boolean;
  removeHintIndex: number | null;
  selectedAnchor: number | null;
};

export type EditorDraft =
  | Extract<VectorDraft, { kind: "freehand" }>
  | Extract<VectorDraft, { kind: "shape" }>
  | PenDraft;

export type PaintStyle = {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  fillEnabled: boolean;
  strokeEnabled: boolean;
};

export type VectorBoardEditorRefs = {
  selectionRef: MutableRefObject<VectorSelection[]>;
  marqueeRef: MutableRefObject<VectorBounds | null>;
  draftRef: MutableRefObject<EditorDraft | null>;
  penEditRef: MutableRefObject<PenEditVisual | null>;
  snapGuidesRef: MutableRefObject<SnapGuide[]>;
  styleRef: MutableRefObject<PaintStyle>;
  snapHighlightRef: MutableRefObject<VectorPoint | null>;
};

export type VectorBoardPaintState = {
  docRef: MutableRefObject<VectorBoardDocument>;
  liveEditRef: MutableRefObject<VectorBoardLiveEdit | null>;
  viewRef: MutableRefObject<VectorViewport>;
  selectionRef: MutableRefObject<VectorSelection[]>;
  marqueeRef: MutableRefObject<VectorBounds | null>;
  draftRef: MutableRefObject<EditorDraft | null>;
  penEditRef: MutableRefObject<PenEditVisual | null>;
  snapGuidesRef: MutableRefObject<SnapGuide[]>;
  styleRef: MutableRefObject<PaintStyle>;
  snapHighlightRef: MutableRefObject<VectorPoint | null>;
};
