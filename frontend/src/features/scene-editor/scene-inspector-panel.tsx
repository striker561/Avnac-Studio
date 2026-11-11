/**
 * SceneInspectorPanel — top-right floating inspector.
 *
 * Shows X, Y (and W, H where applicable) for the currently selected element.
 * Click the pill to expand inputs; blur or Enter to commit a change.
 *
 * Node support matrix:
 *   rect / ellipse / polygon / image  → X  Y  W  H
 *   text                              → X  Y  W  (height is auto)
 *   line / arrow                      → X  Y  (bounding-box top-left, no resize)
 *   group                             → read-only label ("Group · N items")
 *   nothing selected                  → hidden
 *   multi-selection (>1)              → collapsed pill "N items"
 *
 * Coordinates are derived from getNodeBounds() so they match the overlay handles
 * exactly, including origin/scale/rotation adjustments.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link01Icon, Unlink01Icon } from "@hugeicons/core-free-icons";
import type { SaraswatiNode, SaraswatiGroupNode } from "@/lib/saraswati/types";
import { isSaraswatiRenderableNode } from "@/lib/saraswati/scene";
import { getNodeBounds } from "@/lib/saraswati/spatial";
import { useSceneEditorStore } from "./store";

// ─── helpers ─────────────────────────────────────────────────────────────────

type NodeLayout =
  | { kind: "none" }
  | { kind: "multi"; count: number }
  | { kind: "group"; id: string; count: number }
  | {
      kind: "line";
      id: string;
      x: number;
      y: number;
    }
  | {
      kind: "text";
      id: string;
      x: number;
      y: number;
      w: number;
      /** Raw (unrounded) bounds width — used for AR calculations. */
      rawW: number;
    }
  | {
      kind: "sized";
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      /** Raw (unrounded) bounds dimensions — used for AR calculations. */
      rawW: number;
      rawH: number;
    };

function nodeLayout(node: SaraswatiNode): NodeLayout {
  if (node.type === "group") {
    return {
      kind: "group",
      id: node.id,
      count: (node as SaraswatiGroupNode).children.length,
    };
  }
  if (!isSaraswatiRenderableNode(node)) return { kind: "none" };

  const bounds = getNodeBounds(node);

  if (node.type === "line") {
    return {
      kind: "line",
      id: node.id,
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
    };
  }
  if (node.type === "text") {
    return {
      kind: "text",
      id: node.id,
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      w: Math.round(node.width),
      rawW: node.width,
    };
  }
  return {
    kind: "sized",
    id: node.id,
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    w: Math.round(bounds.width),
    h: Math.round(bounds.height),
    rawW: bounds.width,
    rawH: bounds.height,
  };
}

// ─── collapsed pill label ─────────────────────────────────────────────────────

function pillLabel(layout: NodeLayout): string | null {
  if (layout.kind === "none") return null;
  if (layout.kind === "multi") return `${layout.count} items`;
  if (layout.kind === "group")
    return `Group · ${layout.count} item${layout.count === 1 ? "" : "s"}`;
  if (layout.kind === "line") return `X ${layout.x}  Y ${layout.y}`;
  if (layout.kind === "text")
    return `X ${layout.x}  Y ${layout.y}  W ${layout.w}`;
  return `X ${layout.x}  Y ${layout.y}  W ${layout.w}  H ${layout.h}`;
}

// ─── a single scrub-able numeric input ───────────────────────────────────────

type NumInputProps = {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  /** Optional step for keyboard arrows (default 1). */
  step?: number;
  min?: number;
  max?: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

function NumInput({
  label,
  value,
  onCommit,
  step = 1,
  min,
  max,
  onDragStart,
  onDragEnd,
}: NumInputProps) {
  const [draft, setDraft] = useState(String(Math.round(value)));
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startValue: number;
    active: boolean;
  } | null>(null);

  // Sync from outside when not editing
  useEffect(() => {
    if (!editing) setDraft(String(Math.round(value)));
  }, [value, editing]);

  const commit = useCallback(
    (raw: string) => {
      const parsed = Number.parseFloat(raw);
      if (!Number.isFinite(parsed)) {
        setDraft(String(Math.round(value)));
        return;
      }
      const clamped =
        min !== undefined && max !== undefined
          ? Math.max(min, Math.min(max, parsed))
          : min !== undefined
            ? Math.max(min, parsed)
            : max !== undefined
              ? Math.min(max, parsed)
              : parsed;
      setDraft(String(Math.round(clamped)));
      onCommit(clamped);
    },
    [min, max, value, onCommit],
  );

  if (editing) {
    return (
      <label className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          {label}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={draft}
          autoFocus
          className="h-7 w-14 rounded-md border border-blue-400 bg-white px-1.5 text-center font-mono text-[12px] text-neutral-900 outline-none ring-1 ring-blue-400/40"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => {
            setEditing(false);
            commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              inputRef.current?.blur();
            } else if (e.key === "Escape") {
              setEditing(false);
              setDraft(String(Math.round(value)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const cur = Number.parseFloat(draft) || value;
              const next = cur + (e.shiftKey ? step * 10 : step);
              setDraft(String(Math.round(next)));
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const cur = Number.parseFloat(draft) || value;
              const next = cur - (e.shiftKey ? step * 10 : step);
              setDraft(String(Math.round(next)));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col items-center gap-0.5 touch-none">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <div
        role="spinbutton"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        tabIndex={0}
        className="flex h-7 w-14 cursor-ew-resize select-none items-center justify-center rounded-md border border-black/10 bg-white/80 px-1.5 font-mono text-[12px] text-neutral-900 transition-colors hover:border-black/20 hover:bg-white"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startValue: Math.round(value),
            active: false,
          };
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag || e.pointerId !== drag.pointerId) return;
          const dx = e.clientX - drag.startX;
          if (!drag.active) {
            if (Math.abs(dx) < 3) return;
            drag.active = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onDragStart?.();
          }
          const sensitivity = e.shiftKey ? 10 : 1;
          const next = drag.startValue + dx * sensitivity;
          onCommit(next);
          setDraft(String(Math.round(next)));
        }}
        onPointerUp={(e) => {
          const drag = dragRef.current;
          if (!drag || e.pointerId !== drag.pointerId) return;
          if (!drag.active) {
            // Treat as click → open edit
            setEditing(true);
          } else {
            onDragEnd?.();
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(
                e.pointerId,
              );
            } catch {
              /* already released */
            }
          }
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          const drag = dragRef.current;
          if (drag?.active) onDragEnd?.();
          dragRef.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditing(true);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onCommit(value + (e.shiftKey ? step * 10 : step));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onCommit(value - (e.shiftKey ? step * 10 : step));
          }
        }}
      >
        {draft}
      </div>
    </label>
  );
}

// ─── main panel ──────────────────────────────────────────────────────────────

export default function SceneInspectorPanel() {
  const scene = useSceneEditorStore((s) => s.scene);
  const selectedIds = useSceneEditorStore((s) => s.selectedIds);
  const applyCommands = useSceneEditorStore((s) => s.applyCommands);
  const beginHistoryBatch = useSceneEditorStore((s) => s.beginHistoryBatch);
  const endHistoryBatch = useSceneEditorStore((s) => s.endHistoryBatch);
  // AR lock is stored in the global scene editor store so the canvas
  // interaction hook can also respect it during handle-drag resizes.
  const arLocked = useSceneEditorStore((s) => s.arLocked);
  const setArLocked = useSceneEditorStore((s) => s.setArLocked);

  const [open, setOpen] = useState(false);
  // arRef mirrors arLockedRatio from the store for use in commitW/commitH callbacks.
  const arRef = useRef<number>(1);
  const panelRef = useRef<HTMLDivElement>(null);

  // Compute layout descriptor from selection
  const layout: NodeLayout = (() => {
    if (!scene || selectedIds.length === 0) return { kind: "none" };
    if (selectedIds.length > 1)
      return { kind: "multi", count: selectedIds.length };
    const node = scene.nodes[selectedIds[0]!];
    if (!node) return { kind: "none" };
    return nodeLayout(node);
  })();

  // Close panel when selection goes away or changes to unsupported kind
  useEffect(() => {
    if (layout.kind === "none" || layout.kind === "multi") setOpen(false);
  }, [layout.kind]);

  // Keep arRef in sync with the store's arLockedRatio for callback use.
  const arLockedRatio = useSceneEditorStore((s) => s.arLockedRatio);
  arRef.current = arLockedRatio;

  // Reset aspect ratio lock when selection changes (store handles reset on setSelectedIds).
  const prevIdRef = useRef<string | null>(null);
  const currentId =
    layout.kind !== "none" && layout.kind !== "multi" ? layout.id : null;
  if (currentId !== prevIdRef.current) {
    prevIdRef.current = currentId;
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const pill = pillLabel(layout);

  // ── commit helpers ───────────────────────────────────────────────────────

  const commitX = useCallback(
    (newX: number) => {
      if (
        layout.kind === "none" ||
        layout.kind === "multi" ||
        layout.kind === "group"
      )
        return;
      applyCommands([
        { type: "MOVE_NODE", id: layout.id, dx: newX - layout.x, dy: 0 },
      ]);
    },
    [layout, applyCommands],
  );

  const commitY = useCallback(
    (newY: number) => {
      if (
        layout.kind === "none" ||
        layout.kind === "multi" ||
        layout.kind === "group"
      )
        return;
      applyCommands([
        { type: "MOVE_NODE", id: layout.id, dx: 0, dy: newY - layout.y },
      ]);
    },
    [layout, applyCommands],
  );

  const commitW = useCallback(
    (newW: number) => {
      if (layout.kind !== "sized" && layout.kind !== "text") return;
      const w = Math.max(1, newW);
      const h =
        layout.kind === "sized"
          ? arLocked && arRef.current > 0
            ? Math.max(1, w / arRef.current)
            : layout.rawH
          : 0;
      applyCommands([
        {
          type: "RESIZE_NODE",
          id: layout.id,
          x: layout.x,
          y: layout.y,
          width: w,
          height: h,
        },
      ]);
    },
    [layout, applyCommands, arLocked],
  );

  const commitH = useCallback(
    (newH: number) => {
      if (layout.kind !== "sized") return;
      const h = Math.max(1, newH);
      const w =
        arLocked && arRef.current > 0
          ? Math.max(1, h * arRef.current)
          : layout.rawW;
      applyCommands([
        {
          type: "RESIZE_NODE",
          id: layout.id,
          x: layout.x,
          y: layout.y,
          width: w,
          height: h,
        },
      ]);
    },
    [layout, applyCommands, arLocked],
  );

  // ── render ───────────────────────────────────────────────────────────────

  const isGroup = layout.kind === "group";
  const canEdit = !isGroup && layout.kind !== "multi" && layout.kind !== "none";

  const canResize = layout.kind === "sized" || layout.kind === "text";
  if (!pill) return null;

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto absolute right-3 top-3 z-[65]"
    >
      {/* ── Collapsed pill ─── */}
      <button
        type="button"
        onClick={() => {
          if (canEdit) setOpen((v) => !v);
        }}
        className={[
          "flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/92 px-3 py-1.5 font-mono text-[11px] text-neutral-700",
          "shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_0_0_1px_rgba(255,255,255,0.7)] backdrop-blur-xl",
          canEdit
            ? "cursor-pointer hover:border-black/15 hover:bg-white"
            : "cursor-default",
          open ? "border-blue-400/60 ring-1 ring-blue-400/20" : "",
        ].join(" ")}
        aria-expanded={canEdit ? open : undefined}
        title={canEdit ? "Click to edit — or drag values to scrub" : undefined}
      >
        {pill}
        {canEdit && (
          <span
            className={[
              "ml-0.5 text-[20px] leading-none text-neutral-400 transition-transform",
              open ? "rotate-180" : "",
            ].join(" ")}
            aria-hidden
          >
            ▾
          </span>
        )}
      </button>

      {/* ── Expanded panel ─── */}
      {open && canEdit && (
        <div className="absolute right-0 top-full mt-1.5 flex gap-2 rounded-2xl border border-black/[0.08] bg-white/96 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.10),inset_0_0_0_1px_rgba(255,255,255,0.8)] backdrop-blur-xl">
          {/* Position */}
          <div className="flex flex-col gap-2">
            <p className="text-center text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
              Position
            </p>
            <div className="flex gap-1.5">
              <NumInput
                label="X"
                value={"x" in layout ? layout.x : 0}
                onCommit={commitX}
                onDragStart={beginHistoryBatch}
                onDragEnd={endHistoryBatch}
              />
              <NumInput
                label="Y"
                value={"y" in layout ? layout.y : 0}
                onCommit={commitY}
                onDragStart={beginHistoryBatch}
                onDragEnd={endHistoryBatch}
              />
            </div>
          </div>

          {/* Size (only if applicable) */}
          {canResize && (
            <>
              <div className="w-px self-stretch bg-black/[0.06]" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
                    Size
                  </p>
                  {layout.kind === "sized" && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = !arLocked;
                        const ratio =
                          next && layout.kind === "sized" && layout.rawH > 0
                            ? layout.rawW / layout.rawH
                            : undefined;
                        setArLocked(next, ratio);
                      }}
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded transition-colors",
                        arLocked
                          ? "bg-blue-500/15 text-blue-600"
                          : "text-neutral-400 hover:bg-black/[0.06] hover:text-neutral-600",
                      ].join(" ")}
                      title={
                        arLocked
                          ? "Aspect ratio locked — click to unlock"
                          : "Lock aspect ratio"
                      }
                      aria-label={
                        arLocked ? "Unlock aspect ratio" : "Lock aspect ratio"
                      }
                    >
                      <HugeiconsIcon
                        icon={arLocked ? Link01Icon : Unlink01Icon}
                        size={14}
                        strokeWidth={1.75}
                      />
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <NumInput
                    label="W"
                    value={layout.w}
                    onCommit={commitW}
                    min={1}
                    onDragStart={beginHistoryBatch}
                    onDragEnd={endHistoryBatch}
                  />
                  {layout.kind === "sized" && (
                    <NumInput
                      label="H"
                      value={layout.h}
                      onCommit={commitH}
                      min={1}
                      onDragStart={beginHistoryBatch}
                      onDragEnd={endHistoryBatch}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
