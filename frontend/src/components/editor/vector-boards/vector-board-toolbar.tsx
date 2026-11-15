import { HugeiconsIcon } from "@hugeicons/react";
import {
  CircleIcon,
  Cursor01Icon,
  Pen01Icon,
  PenTool03Icon,
  SquareIcon,
} from "@hugeicons/core-free-icons";
import PaintPopoverControl from "@/components/editor/color/paint-popover-control";
import StrokeToolbarPopover from "@/components/editor/color/stroke-toolbar-popover";
import EditorRangeSlider from "@/components/editor/shared/editor-range-slider";
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
} from "@/components/editor/shared/floating-toolbar-shell";
import {
  VECTOR_NODE_TYPE_LABELS,
  VECTOR_NODE_TYPE_SHORTCUTS,
  VECTOR_PENCIL_MAX_TOLERANCE_PX,
  VECTOR_PENCIL_MIN_TOLERANCE_PX,
  type VectorNodeType,
  type VectorTool,
} from "@/lib/avnac-vector";
import type { BgValue } from "@/lib/editor-paint";
import type { VectorBoardEditorState } from "./hooks/use-vector-board-editor";

type Props = {
  editor: VectorBoardEditorState;
};

const TOOLS: ReadonlyArray<{
  id: VectorTool;
  label: string;
  shortcut: string;
  icon: typeof Cursor01Icon;
}> = [
  { id: "move", label: "Move", shortcut: "V", icon: Cursor01Icon },
  { id: "pencil", label: "Pencil", shortcut: "Shift+P", icon: Pen01Icon },
  { id: "pen", label: "Pen", shortcut: "P", icon: PenTool03Icon },
  { id: "rect", label: "Rectangle", shortcut: "R", icon: SquareIcon },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: CircleIcon },
];

function solid(color: string): BgValue {
  return { type: "solid", color };
}

function colorFromPaint(value: BgValue): string {
  if (value.type === "solid") return value.color;
  return value.stops[0]?.color ?? "#1a1a1a";
}

const NODE_GLYPHS: Record<VectorNodeType, string> = {
  corner: "M4 4h10v10H4z",
  cusp: "M9 2l7 7-7 7-7-7z",
  smooth: "M9 2a7 7 0 1 0 0 14A7 7 0 0 0 9 2z",
  symmetric: "M9 2a7 7 0 1 0 0 14A7 7 0 0 0 9 2zm0 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
};

export default function VectorBoardToolbar({ editor }: Props) {
  const {
    tool,
    setTool,
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
    nodeEditActive,
    selectedNodeType,
  } = editor;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <FloatingToolbarShell role="toolbar" aria-label="Drawing tools">
        <div className="flex flex-wrap items-center gap-0.5 py-1 pl-1 pr-2">
          {TOOLS.map(({ id, label, shortcut, icon }) => (
            <button
              key={id}
              type="button"
              className={floatingToolbarIconButton(tool === id)}
              title={`${label} (${shortcut})`}
              aria-label={`${label} (${shortcut})`}
              aria-keyshortcuts={shortcut}
              aria-pressed={tool === id}
              data-tool={id}
              onClick={() => setTool(id)}
            >
              <HugeiconsIcon icon={icon} size={18} strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </FloatingToolbarShell>

      <FloatingToolbarShell role="toolbar" aria-label="Stroke and fill">
        <div className="flex flex-wrap items-center gap-0.5 py-1 pl-1 pr-2">
          <button
            type="button"
            className={floatingToolbarIconButton(strokeEnabled)}
            title={strokeEnabled ? "Disable stroke" : "Enable stroke"}
            aria-label={strokeEnabled ? "Disable stroke" : "Enable stroke"}
            aria-pressed={strokeEnabled}
            onClick={() => editor.setStrokeEnabled(!strokeEnabled)}
          >
            <span
              className="block h-4 w-4 rounded-full border-2"
              style={{ borderColor: strokeColor }}
            />
          </button>
          <StrokeToolbarPopover
            strokeWidthMax={40}
            strokeWidthPx={strokeEnabled ? strokeWidth : 0}
            strokePaint={solid(strokeColor)}
            onStrokeWidthChange={(width) => editor.setStrokeWidth(width)}
            onStrokePaintChange={(value) => editor.setStrokeColor(colorFromPaint(value))}
            onInteractionStart={editor.beginStyleInteraction}
            onInteractionEnd={editor.endStyleInteraction}
          />
          <FloatingToolbarDivider />
          <button
            type="button"
            className={floatingToolbarIconButton(fillEnabled)}
            title={fillEnabled ? "Disable fill" : "Enable fill"}
            aria-label={fillEnabled ? "Disable fill" : "Enable fill"}
            aria-pressed={fillEnabled}
            onClick={() => editor.setFillEnabled(!fillEnabled)}
          >
            <span
              className="block h-4 w-4 rounded-sm border border-black/20"
              style={{ background: fillEnabled ? fillColor : "transparent" }}
            />
          </button>
          <PaintPopoverControl
            compact
            value={solid(fillColor)}
            onChange={(value) => editor.setFillColor(colorFromPaint(value))}
            title="Fill color"
            ariaLabel="Fill color"
          />
          <FloatingToolbarDivider />
          <select
            aria-label="Line join"
            title="Line join"
            value={lineJoin}
            onChange={(event) =>
              editor.setLineJoin(event.target.value as "miter" | "round" | "bevel")
            }
            className="h-8 rounded-lg border border-black/[0.08] bg-white px-1.5 text-[11px] font-medium text-neutral-700 outline-none"
          >
            <option value="round">Round join</option>
            <option value="miter">Miter join</option>
            <option value="bevel">Bevel join</option>
          </select>
          <button
            type="button"
            className={floatingToolbarIconButton(fillRule === "evenodd")}
            title="Toggle fill rule (nonzero / evenodd)"
            aria-label={`Fill rule: ${fillRule}`}
            onClick={() => editor.setFillRule(fillRule === "evenodd" ? "nonzero" : "evenodd")}
          >
            <span className="text-[10px] font-semibold uppercase">
              {fillRule === "evenodd" ? "EO" : "NZ"}
            </span>
          </button>
        </div>
      </FloatingToolbarShell>

      {tool === "pencil" ? (
        <FloatingToolbarShell role="toolbar" aria-label="Pencil fidelity">
          <div className="flex items-center gap-2 py-1 pl-3 pr-2">
            <span className="whitespace-nowrap text-[11px] font-medium text-neutral-600">
              Fidelity
            </span>
            <EditorRangeSlider
              min={VECTOR_PENCIL_MIN_TOLERANCE_PX}
              max={VECTOR_PENCIL_MAX_TOLERANCE_PX}
              step={0.5}
              value={pencilTolerancePx}
              onChange={editor.setPencilTolerancePx}
              aria-label="Pencil fitting tolerance"
              trackClassName="w-24"
            />
            <span className="w-10 text-right text-[11px] tabular-nums text-neutral-500">
              {pencilTolerancePx.toFixed(0)}px
            </span>
          </div>
        </FloatingToolbarShell>
      ) : null}

      <FloatingToolbarShell role="toolbar" aria-label="Drawing aids">
        <div className="flex items-center gap-0.5 py-1 pl-1 pr-2">
          <button
            type="button"
            className={floatingToolbarIconButton(snapEnabled)}
            title="Snap to nodes and guides"
            aria-label="Snap to nodes and guides"
            aria-pressed={snapEnabled}
            onClick={() => editor.setSnapEnabled(!snapEnabled)}
          >
            <span className="text-[11px] font-bold">⌗</span>
          </button>
          <button
            type="button"
            className={floatingToolbarIconButton(scaleStrokesWithObject)}
            title="Scale stroke width with the object"
            aria-label="Scale stroke width with the object"
            aria-pressed={scaleStrokesWithObject}
            onClick={() => editor.setScaleStrokesWithObject(!scaleStrokesWithObject)}
          >
            <span className="text-[10px] font-bold">↔</span>
          </button>
          <FloatingToolbarDivider />
          <button
            type="button"
            disabled={!editor.canUndo}
            className={floatingToolbarIconButton(false)}
            title="Undo (Cmd/Ctrl+Z)"
            aria-label="Undo"
            onClick={editor.undo}
          >
            <span className="text-base leading-none">↶</span>
          </button>
          <button
            type="button"
            disabled={!editor.canRedo}
            className={floatingToolbarIconButton(false)}
            title="Redo (Cmd/Ctrl+Shift+Z)"
            aria-label="Redo"
            onClick={editor.redo}
          >
            <span className="text-base leading-none">↷</span>
          </button>
        </div>
      </FloatingToolbarShell>

      {nodeEditActive ? (
        <FloatingToolbarShell role="toolbar" aria-label="Node type">
          <div className="flex items-center gap-0.5 py-1 pl-1 pr-2">
            <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Node
            </span>
            {(Object.keys(NODE_GLYPHS) as VectorNodeType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={floatingToolbarIconButton(selectedNodeType === type)}
                title={`${VECTOR_NODE_TYPE_LABELS[type]} (${VECTOR_NODE_TYPE_SHORTCUTS[type]})`}
                aria-label={`Node type ${VECTOR_NODE_TYPE_LABELS[type]}`}
                aria-pressed={selectedNodeType === type}
                data-node-type={type}
                onClick={() => editor.setSelectedNodeType(type)}
              >
                <svg viewBox="0 0 18 18" width="17" height="17" aria-hidden>
                  <path
                    d={NODE_GLYPHS[type]}
                    fill={selectedNodeType === type ? "#2563eb" : "#ffffff"}
                    stroke="#2563eb"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            ))}
            <FloatingToolbarDivider />
            <button
              type="button"
              className={floatingToolbarIconButton(false)}
              title="Delete node (Backspace)"
              aria-label="Delete selected node"
              onClick={editor.deleteSelectedNode}
              disabled={editor.selectedNodeIndex == null}
            >
              <span className="text-[13px] font-semibold">⌫</span>
            </button>
          </div>
        </FloatingToolbarShell>
      ) : null}
    </div>
  );
}
