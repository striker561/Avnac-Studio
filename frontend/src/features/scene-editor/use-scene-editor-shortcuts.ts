import { useEffect, useRef } from "react";
import type { SaraswatiScene } from "@/lib/saraswati";
import {
  collectSelectableNodeIds,
  extractClipboardImageFiles,
  readNavigatorClipboardImageFiles,
  shouldIgnoreEditorHotkeys,
} from "./scene-editor-input-utils";

type Params = {
  scene: SaraswatiScene | null;
  inlineTextEditing: boolean;
  lockedIds: string[];
  zoomPercent: number;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setZoomPercent: (value: number) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleLockedSelection: () => void;
  fitToViewport: () => void;
  reorderPrimarySelection: (
    mode: "forward" | "backward" | "front" | "back",
  ) => void;
  onCopy: () => void;
  onPaste: () => void;
  /** Cmd+Shift+V — paste at the exact source coordinates. */
  onPasteInPlace: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onImageFilesPaste: (files: File[]) => void;
  onShowShortcuts: () => void;
  canGroup: boolean;
  canUngroup: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  selectedIds: string[];
  onNudge: (dx: number, dy: number) => void;
  /** True while the shortcuts panel is open; it captures single-key shortcuts. */
  shortcutsOpen: boolean;
  onInsertText: () => void;
  onOpenImagePicker: () => void;
};

export function useSceneEditorShortcuts({
  scene,
  inlineTextEditing,
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
  onCopy,
  onPaste,
  onPasteInPlace,
  onDelete,
  onDuplicate,
  onImageFilesPaste,
  onShowShortcuts,
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
  selectedIds,
  onNudge,
  shortcutsOpen,
  onInsertText,
  onOpenImagePicker,
}: Params) {
  // Timestamp of the last Cmd+Shift+V handled in keydown, so the paste event
  // echo that some webviews fire afterwards doesn't paste a second copy.
  const lastPasteInPlaceRef = useRef(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!scene) return;
      // The shortcuts panel handles its own keys (Esc closes it); inserting an
      // element behind it would be surprising.
      if (shortcutsOpen) return;
      if (shouldIgnoreEditorHotkeys(event.target, inlineTextEditing)) return;

      const mod = event.metaKey || event.ctrlKey;
      if (mod) {
        if (event.key === "z" || event.key === "Z") {
          event.preventDefault();
          // The store owns both object-level and page-level history. The
          // canUndo/canRedo flags describe the object engine only, so gating
          // here made Cmd+Z a no-op after add-page/delete-page even though the
          // page history had a valid entry.
          if (event.shiftKey) redo();
          else undo();
          return;
        }
        if (event.key === "y" || event.key === "Y") {
          event.preventDefault();
          redo();
          return;
        }
        if (event.key === "d" || event.key === "D") {
          event.preventDefault();
          onDuplicate();
          return;
        }
        if (event.key === "l" || event.key === "L") {
          event.preventDefault();
          toggleLockedSelection();
          return;
        }
        if (event.key === "a" || event.key === "A") {
          event.preventDefault();
          setSelectedIds(collectSelectableNodeIds(scene, lockedIds));
          return;
        }
        if (event.key === "0") {
          event.preventDefault();
          setZoomPercent(100);
          return;
        }
        if (event.key === "1") {
          event.preventDefault();
          fitToViewport();
          return;
        }
        if (event.key === "=" || event.key === "+") {
          event.preventDefault();
          setZoomPercent(zoomPercent * 1.1);
          return;
        }
        if (event.key === "-") {
          event.preventDefault();
          setZoomPercent(zoomPercent / 1.1);
          return;
        }
        if (event.key === "c" || event.key === "C") {
          event.preventDefault();
          onCopy();
          return;
        }
        if (event.shiftKey && (event.key === "v" || event.key === "V")) {
          // Cmd+Shift+V = paste in place (exact source coordinates).
          event.preventDefault();
          lastPasteInPlaceRef.current = Date.now();
          onPasteInPlace();
          return;
        }
        if (event.key === "g" || event.key === "G") {
          event.preventDefault();
          if (event.shiftKey) {
            if (canUngroup) onUngroup();
          } else {
            if (canGroup) onGroup();
          }
          return;
        }
        if (event.key === "[") {
          event.preventDefault();
          reorderPrimarySelection(event.shiftKey ? "back" : "backward");
          return;
        }
        if (event.key === "]") {
          event.preventDefault();
          reorderPrimarySelection(event.shiftKey ? "front" : "forward");
          return;
        }
      }

      if (event.key === "?") {
        event.preventDefault();
        onShowShortcuts();
        return;
      }

      // Single-key insert shortcuts, matching the toolbar's tooltips.
      if (!mod && !event.altKey && !event.shiftKey) {
        if (event.key === "t" || event.key === "T") {
          event.preventDefault();
          onInsertText();
          return;
        }
        if (event.key === "i" || event.key === "I") {
          event.preventDefault();
          onOpenImagePicker();
          return;
        }
      }

      if (
        !mod &&
        !event.altKey &&
        (event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowRight")
      ) {
        if (selectedIds.length === 0) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (event.key === "ArrowLeft") dx = -step;
        if (event.key === "ArrowRight") dx = step;
        if (event.key === "ArrowUp") dy = -step;
        if (event.key === "ArrowDown") dy = step;
        onNudge(dx, dy);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canRedo,
    canUndo,
    fitToViewport,
    inlineTextEditing,
    lockedIds,
    canGroup,
    canUngroup,
    onCopy,
    onDelete,
    onDuplicate,
    onGroup,
    onShowShortcuts,
    onPasteInPlace,
    onUngroup,
    onNudge,
    onInsertText,
    onOpenImagePicker,
    shortcutsOpen,
    redo,
    reorderPrimarySelection,
    scene,
    selectedIds,
    setSelectedIds,
    setZoomPercent,
    toggleLockedSelection,
    undo,
    zoomPercent,
  ]);

  useEffect(() => {
    const onPasteEvent = (event: ClipboardEvent) => {
      if (!scene) return;
      if (shouldIgnoreEditorHotkeys(event.target, inlineTextEditing)) return;

      // Cmd+Shift+V is handled in keydown; ignore its paste-event echo.
      if (Date.now() - lastPasteInPlaceRef.current < 300) {
        event.preventDefault();
        return;
      }

      const files = extractClipboardImageFiles(event.clipboardData);
      if (files.length > 0) {
        event.preventDefault();
        onImageFilesPaste(files);
        return;
      }

      const hasFileItems =
        event.clipboardData !== null &&
        Array.from(event.clipboardData.items).some(
          (item) => item.kind === "file",
        );

      if (event.clipboardData === null || hasFileItems) {
        event.preventDefault();
        void (async () => {
          const fallbackImages = await readNavigatorClipboardImageFiles();
          if (fallbackImages.length > 0) {
            onImageFilesPaste(fallbackImages);
            return;
          }
          onPaste();
        })();
        return;
      }

      event.preventDefault();
      onPaste();
    };

    window.addEventListener("paste", onPasteEvent);
    return () => window.removeEventListener("paste", onPasteEvent);
  }, [inlineTextEditing, onImageFilesPaste, onPaste, scene]);
}
