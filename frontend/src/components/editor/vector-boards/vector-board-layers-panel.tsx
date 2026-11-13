import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import type { VectorBoardDocument } from "@/lib/avnac-vector";

type Props = {
  doc: VectorBoardDocument;
  onSetActive: (layerId: string) => void;
  onAdd: () => void;
  onDelete: (layerId: string) => void;
  onMove: (layerId: string, direction: -1 | 1) => void;
  onToggleVisible: (layerId: string, visible: boolean) => void;
  onClearLayer: (layerId: string) => void;
};

export default function VectorBoardLayersPanel({
  doc,
  onSetActive,
  onAdd,
  onDelete,
  onMove,
  onToggleVisible,
  onClearLayer,
}: Props) {
  return (
    <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-black/[0.06] bg-neutral-50/90">
      <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Layers
        </span>
        <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-neutral-500">
          {doc.layers.length}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2">
        {doc.layers.map((layer) => {
          const active = layer.id === doc.activeLayerId;
          return (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              data-active={active ? "true" : "false"}
              className={[
                "flex flex-col rounded-xl border px-2 py-1.5 transition-colors",
                active
                  ? "border-[var(--accent)]/60 bg-[var(--accent)]/15"
                  : "border-black/[0.05] bg-white/80 hover:bg-white",
              ].join(" ")}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-black/[0.06]"
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                  aria-pressed={layer.visible}
                  onClick={() => onToggleVisible(layer.id, !layer.visible)}
                >
                  <HugeiconsIcon
                    icon={layer.visible ? ViewIcon : ViewOffSlashIcon}
                    size={16}
                    strokeWidth={1.75}
                  />
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-neutral-800"
                  onClick={() => onSetActive(layer.id)}
                  title={active ? `${layer.name} (active)` : `Make ${layer.name} active`}
                >
                  {layer.name}
                </button>
                <span className="shrink-0 rounded bg-black/[0.04] px-1 text-[10px] tabular-nums text-neutral-500">
                  {layer.strokes.length}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-end gap-0.5">
                <button
                  type="button"
                  className="rounded p-1 text-neutral-500 hover:bg-black/[0.06] hover:text-neutral-800 disabled:opacity-30"
                  title="Move layer down"
                  aria-label={`Move ${layer.name} down`}
                  onClick={() => onMove(layer.id, -1)}
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-neutral-500 hover:bg-black/[0.06] hover:text-neutral-800 disabled:opacity-30"
                  title="Move layer up"
                  aria-label={`Move ${layer.name} up`}
                  onClick={() => onMove(layer.id, 1)}
                >
                  <HugeiconsIcon icon={ArrowUp01Icon} size={14} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-neutral-500 hover:bg-black/[0.06] hover:text-neutral-800"
                  title="Clear layer"
                  aria-label={`Clear ${layer.name}`}
                  onClick={() => onClearLayer(layer.id)}
                >
                  <span className="block text-[11px] font-semibold">C</span>
                </button>
                <button
                  type="button"
                  disabled={doc.layers.length <= 1}
                  className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                  title="Delete layer"
                  aria-label={`Delete ${layer.name}`}
                  onClick={() => onDelete(layer.id)}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-black/[0.06] p-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] bg-white py-2 text-[13px] font-medium text-neutral-800 hover:bg-black/[0.03]"
          onClick={onAdd}
        >
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.75} />
          Add layer
        </button>
      </div>
    </aside>
  );
}
