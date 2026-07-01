import {
  ArrowDown01Icon,
  Image01Icon,
  RedoIcon,
  TextFontIcon,
  UndoIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import CanvasZoomSlider from "@/components/editor/canvas/canvas-zoom-slider";
import EditorFloatingCanvasControls from "@/components/editor/canvas/editor-floating-canvas-controls";
import ShapesPopover, {
  iconForShapesQuickAdd,
  type PopoverShapeKind,
  type ShapesQuickAddKind,
} from "@/components/editor/shape/shapes-popover";
import { useCallback, useEffect, useRef, useState } from "react";
import { computeFitZoomPercent } from "../scene-editor-viewport-utils";
import { useSceneEditorStore } from "../store";
import { useSceneEditorDropActions } from "../use-scene-editor-drop-actions";

function toolbarIconBtn(disabled = false) {
  return [
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-neutral-700 transition",
    "hover:bg-black/[0.05] hover:text-neutral-900",
    disabled ? "pointer-events-none opacity-45" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const QUICK_SHAPE_TITLE: Record<ShapesQuickAddKind, string> = {
  generic: "Add shape",
  rect: "Add rectangle",
  ellipse: "Add ellipse",
  polygon: "Add polygon",
  star: "Add star",
  line: "Add line",
  arrow: "Add arrow",
};

export default function BottomFloatingToolbar() {
  const scene = useSceneEditorStore((s) => s.scene);
  const insertRect = useSceneEditorStore((s) => s.insertRect);
  const insertEllipse = useSceneEditorStore((s) => s.insertEllipse);
  const insertPolygon = useSceneEditorStore((s) => s.insertPolygon);
  const insertStar = useSceneEditorStore((s) => s.insertStar);
  const insertLine = useSceneEditorStore((s) => s.insertLine);
  const insertArrow = useSceneEditorStore((s) => s.insertArrow);
  const insertText = useSceneEditorStore((s) => s.insertText);
  const canUndo = useSceneEditorStore((s) => s.canUndo);
  const canRedo = useSceneEditorStore((s) => s.canRedo);
  const undo = useSceneEditorStore((s) => s.undo);
  const redo = useSceneEditorStore((s) => s.redo);
  const focusMode = useSceneEditorStore((s) => s.focusMode);
  const toggleFocusMode = useSceneEditorStore((s) => s.toggleFocusMode);
  const zoomPercent = useSceneEditorStore((s) => s.zoomPercent);
  const setZoomPercent = useSceneEditorStore((s) => s.setZoomPercent);
  const canvasViewport = useSceneEditorStore((s) => s.canvasViewport);
  const dropActions = useSceneEditorDropActions();

  const [shapesPopoverOpen, setShapesPopoverOpen] = useState(false);
  const [shapesQuickAddKind, setShapesQuickAddKind] =
    useState<ShapesQuickAddKind>("generic");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const shapeToolSplitRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const addShapeFromPopover = useCallback(
    (kind: PopoverShapeKind) => {
      if (kind === "rect") insertRect();
      else if (kind === "ellipse") insertEllipse();
      else if (kind === "polygon") insertPolygon();
      else if (kind === "star") insertStar();
      else if (kind === "line") insertLine();
      else if (kind === "arrow") insertArrow();
    },
    [
      insertArrow,
      insertEllipse,
      insertLine,
      insertPolygon,
      insertRect,
      insertStar,
    ],
  );

  const addQuickShape = useCallback(() => {
    const kind: PopoverShapeKind =
      shapesQuickAddKind === "generic" ? "rect" : shapesQuickAddKind;
    addShapeFromPopover(kind);
  }, [addShapeFromPopover, shapesQuickAddKind]);

  useEffect(() => {
    if (!shapesPopoverOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !shapeToolSplitRef.current) return;
      if (!shapeToolSplitRef.current.contains(target)) {
        setShapesPopoverOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [shapesPopoverOpen]);

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const onImageInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!scene) {
        event.target.value = "";
        return;
      }
      const files = event.target.files ? Array.from(event.target.files) : [];
      if (files.length === 0) {
        event.target.value = "";
        return;
      }
      const centerPoint = {
        x: scene.artboard.width / 2,
        y: scene.artboard.height / 2,
      };
      void dropActions.handleDropIntent(
        {
          kind: "image-files",
          files,
        },
        centerPoint,
      );
      event.target.value = "";
    },
    [dropActions, scene],
  );

  const fitToViewport = useCallback(() => {
    if (!scene) return;
    setZoomPercent(
      computeFitZoomPercent({
        artboardWidth: scene.artboard.width,
        artboardHeight: scene.artboard.height,
        viewportWidth: canvasViewport.width,
        viewportHeight: canvasViewport.height,
      }),
    );
  }, [canvasViewport.height, canvasViewport.width, scene, setZoomPercent]);

  return (
    <EditorFloatingCanvasControls
      ready={Boolean(scene)}
      focusMode={focusMode}
      onToggleFocusMode={toggleFocusMode}
      zoomRef={zoomRef}
      toolbarRef={toolbarRef}
      zoomControl={
        <CanvasZoomSlider
          value={zoomPercent}
          min={5}
          max={400}
          onChange={setZoomPercent}
          onFitRequest={fitToViewport}
          disabled={!scene}
        />
      }
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onImageInputChange}
      />

      <button
        type="button"
        disabled={!canUndo}
        className={toolbarIconBtn(!canUndo)}
        onClick={undo}
        aria-label="Undo"
        title="Undo (Cmd/Ctrl+Z)"
      >
        <HugeiconsIcon icon={UndoIcon} size={18} strokeWidth={1.75} />
      </button>

      <button
        type="button"
        disabled={!canRedo}
        className={toolbarIconBtn(!canRedo)}
        onClick={redo}
        aria-label="Redo"
        title="Redo (Cmd/Ctrl+Shift+Z)"
      >
        <HugeiconsIcon icon={RedoIcon} size={18} strokeWidth={1.75} />
      </button>

      <div
        className="mx-0.5 h-5 w-px shrink-0 self-center bg-black/10"
        aria-hidden
      />

      <div
        ref={shapeToolSplitRef}
        className="relative flex items-stretch rounded-lg border border-black/6 bg-black/2"
      >
        <button
          type="button"
          disabled={!scene}
          className={`${toolbarIconBtn(!scene)} rounded-r-none border-0`}
          onClick={addQuickShape}
          aria-label={QUICK_SHAPE_TITLE[shapesQuickAddKind]}
          title={QUICK_SHAPE_TITLE[shapesQuickAddKind]}
        >
          <HugeiconsIcon
            icon={iconForShapesQuickAdd(shapesQuickAddKind)}
            size={18}
            strokeWidth={1.75}
          />
        </button>
        <button
          type="button"
          disabled={!scene}
          className={`${toolbarIconBtn(!scene)} rounded-l-none rounded-r-lg border-0 border-l border-black/6`}
          onClick={() => setShapesPopoverOpen((open) => !open)}
          aria-expanded={shapesPopoverOpen}
          aria-haspopup="menu"
          aria-label="More shapes"
          title="More shapes"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.75} />
        </button>
        <ShapesPopover
          open={shapesPopoverOpen}
          disabled={!scene}
          anchorRef={shapeToolSplitRef}
          onClose={() => setShapesPopoverOpen(false)}
          onPick={(kind) => {
            setShapesQuickAddKind(kind);
            addShapeFromPopover(kind);
            setShapesPopoverOpen(false);
          }}
        />
      </div>

      <button
        type="button"
        disabled={!scene}
        className={toolbarIconBtn(!scene)}
        onClick={insertText}
        aria-label="Add text"
        title="Add text (T)"
      >
        <HugeiconsIcon icon={TextFontIcon} size={20} strokeWidth={1.75} />
      </button>

      <button
        type="button"
        disabled={!scene}
        className={toolbarIconBtn(!scene)}
        onClick={openImagePicker}
        aria-label="Add image"
        title="Add image (I)"
      >
        <HugeiconsIcon icon={Image01Icon} size={20} strokeWidth={1.75} />
      </button>

    </EditorFloatingCanvasControls>
  );
}
