import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  countDocumentAnchors,
  countDocumentStrokes,
  createVectorBoardHistory,
  filterSelectionsForDoc,
  removeStrokesFromDoc,
  type VectorBoardDocument,
  type VectorSelection,
} from "@/lib/avnac-vector";
import type { VectorBoardLiveEdit } from "./vector-board-paint-state";

type Args = {
  open: boolean;
  document: VectorBoardDocument;
  onDocumentChange: (doc: VectorBoardDocument) => void;
};

export type VectorBoardDocumentState = {
  doc: VectorBoardDocument;
  docRef: React.MutableRefObject<VectorBoardDocument>;
  liveEditRef: React.MutableRefObject<VectorBoardLiveEdit | null>;
  stats: { strokes: number; anchors: number };
  historyVersion: number;
  canUndo: boolean;
  canRedo: boolean;
  getHistoryStats: () => {
    entries: number;
    bytes: number;
    index: number;
    maxEntries: number;
    maxBytes: number;
  };
  commit: (next: VectorBoardDocument) => void;
  undo: () => VectorBoardDocument | null;
  redo: () => VectorBoardDocument | null;
  beginLiveEdit: (selections: VectorSelection[]) => VectorBoardLiveEdit | null;
  updateLive: (next: VectorBoardDocument) => void;
  endLiveEdit: () => VectorBoardDocument | null;
  cancelLiveEdit: () => void;
  adoptExternalDocument: (next: VectorBoardDocument) => void;
};

export function useVectorBoardDocument({
  open,
  document,
  onDocumentChange,
}: Args): VectorBoardDocumentState {
  const [doc, setDoc] = useState(document);
  const docRef = useRef(document);
  const liveEditRef = useRef<VectorBoardLiveEdit | null>(null);
  const historyRef = useRef(createVectorBoardHistory(document));
  const [historyVersion, setHistoryVersion] = useState(0);
  const lastSeenPropRef = useRef(document);

  const stats = useMemo(
    () => ({
      strokes: countDocumentStrokes(doc),
      anchors: countDocumentAnchors(doc),
    }),
    [doc],
  );

  const emit = useCallback(
    (next: VectorBoardDocument) => {
      docRef.current = next;
      setDoc(next);
      onDocumentChange(next);
    },
    [onDocumentChange],
  );

  const commit = useCallback(
    (next: VectorBoardDocument) => {
      liveEditRef.current = null;
      historyRef.current.commit(next);
      emit(next);
      setHistoryVersion((v) => v + 1);
    },
    [emit],
  );

  const undo = useCallback(() => {
    const next = historyRef.current.undo();
    if (!next) return null;
    liveEditRef.current = null;
    emit(next);
    setHistoryVersion((v) => v + 1);
    return next;
  }, [emit]);

  const redo = useCallback(() => {
    const next = historyRef.current.redo();
    if (!next) return null;
    liveEditRef.current = null;
    emit(next);
    setHistoryVersion((v) => v + 1);
    return next;
  }, [emit]);

  const beginLiveEdit = useCallback(
    (selections: VectorSelection[]): VectorBoardLiveEdit | null => {
      if (selections.length === 0) return null;
      const originalDoc = docRef.current;
      const baseDoc = removeStrokesFromDoc(originalDoc, selections);
      const liveEdit: VectorBoardLiveEdit = {
        originalDoc,
        baseDoc,
        liveDoc: originalDoc,
        selections,
      };
      liveEditRef.current = liveEdit;
      return liveEdit;
    },
    [],
  );

  const updateLive = useCallback((next: VectorBoardDocument) => {
    const live = liveEditRef.current;
    if (!live) return;
    live.liveDoc = next;
    docRef.current = next;
  }, []);

  const endLiveEdit = useCallback(() => {
    const live = liveEditRef.current;
    if (!live) return null;
    liveEditRef.current = null;
    const next = live.liveDoc;
    if (next === live.originalDoc) {
      docRef.current = live.originalDoc;
      return null;
    }
    commit(next);
    return next;
  }, [commit]);

  const cancelLiveEdit = useCallback(() => {
    const live = liveEditRef.current;
    if (!live) return;
    liveEditRef.current = null;
    docRef.current = live.originalDoc;
    setDoc(live.originalDoc);
  }, []);

  const adoptExternalDocument = useCallback(
    (next: VectorBoardDocument) => {
      liveEditRef.current = null;
      docRef.current = next;
      lastSeenPropRef.current = next;
      historyRef.current.reset(next);
      setDoc(next);
      setHistoryVersion((v) => v + 1);
    },
    [],
  );

  // Adopt a document from the parent when it is not one we emitted (board
  // switch, load, external restore). Our own commits set docRef first, so the
  // matching prop is ignored.
  useEffect(() => {
    if (!open) {
      lastSeenPropRef.current = document;
      return;
    }
    if (document === lastSeenPropRef.current) return;
    lastSeenPropRef.current = document;
    if (document === docRef.current) return;
    adoptExternalDocument(document);
  }, [open, document, adoptExternalDocument]);

  // Opening a board always starts a fresh history and adopts its doc.
  useEffect(() => {
    if (!open) return;
    lastSeenPropRef.current = document;
    adoptExternalDocument(document);
    // Only on the open edge; prop updates are handled by the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canUndo = historyRef.current.canUndo();
  const canRedo = historyRef.current.canRedo();

  return {
    doc,
    docRef,
    liveEditRef,
    stats,
    historyVersion,
    canUndo,
    canRedo,
    getHistoryStats: () => historyRef.current.stats(),
    commit,
    undo,
    redo,
    beginLiveEdit,
    updateLive,
    endLiveEdit,
    cancelLiveEdit,
    adoptExternalDocument,
  };
}

/** Filter a selection list against a document after undo/redo. */
export function pruneSelections(
  doc: VectorBoardDocument,
  selections: VectorSelection[],
): VectorSelection[] {
  return filterSelectionsForDoc(doc, selections);
}
