/**
 * Context-sensitive toolbar row above the scene canvas.
 *
 * State machine:
 *   canvas-body (nothing selected) → artboard resize + background color
 *   text node                       → TextFormatToolbar + opacity/stroke effects
 *   rect / ellipse / polygon / star → fill swatch + (rect: corner radius) + opacity/stroke effects
 *   line                            → stroke color + opacity effects
 *   image                           → type badge + opacity + delete
 *   group                           → type badge + opacity + ungroup + delete
 *   multi-select                    → count + delete
 *
 * All mutations go through Saraswati commands — no direct state ownership.
 */
import { useEffect, useRef, useState } from "react";
import {
  AiMagicIcon,
  ArrowDown01Icon,
  BendToolIcon,
  Cancel01Icon,
  CropIcon,
  Delete02Icon,
  StraightEdgeIcon,
  Tick02Icon,
  UngroupItemsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FloatingToolbarShell,
  FloatingToolbarDivider,
  floatingToolbarIconButton,
  floatingToolbarPopoverClass,
} from "@/components/editor/shared/floating-toolbar-shell";
import EditorRangeSlider from "@/components/editor/shared/editor-range-slider";
import ArtboardResizeToolbarControl from "@/components/editor/canvas/artboard-resize-toolbar-control";
import PaintPopoverControl from "@/components/editor/color/paint-popover-control";
import TransparencyToolbarPopover from "@/components/editor/color/transparency-toolbar-popover";
import StrokeToolbarPopover from "@/components/editor/color/stroke-toolbar-popover";
import ShadowToolbarPopover from "@/components/editor/color/shadow-toolbar-popover";
import BlurToolbarControl from "@/components/editor/color/blur-toolbar-control";
import { DEFAULT_SHADOW_UI, type ShadowUi } from "@/lib/shadow-ui";
import CornerRadiusToolbarControl from "@/components/editor/shape/corner-radius-toolbar-control";
import ImageCropModal from "@/components/editor/dialogs/image-crop-modal";
import { fitImageNodeSizeToCrop } from "@/lib/image-crop-utils";
import type { SaraswatiCommand } from "@/lib/saraswati/commands/types";
import TextFormatToolbar, {
  type TextFormatToolbarValues,
} from "@/components/editor/text/text-format-toolbar";
import type { BgValue } from "@/lib/editor-paint";
import type {
  SaraswatiColor,
  SaraswatiRectNode,
  SaraswatiTextNode,
  SaraswatiLineNode,
  SaraswatiPaintNodeBase,
  SaraswatiShadow,
  SaraswatiImageNode,
  SaraswatiPolygonNode,
} from "@/lib/saraswati";
import { useSceneEditorStore } from "../store";
import { useRemoveBg } from "@/lib/use-remove-bg";

// ---------------------------------------------------------------------------
// Helpers: SaraswatiColor <-> BgValue boundary casts (same runtime shape)
// ---------------------------------------------------------------------------
function toColor(b: BgValue): SaraswatiColor {
  return b as unknown as SaraswatiColor;
}
function toPaint(c: SaraswatiColor): BgValue {
  return c as unknown as BgValue;
}
// SaraswatiShadow and ShadowUi are structurally identical — cast at boundary.
type ShadowUiShape = {
  blur: number;
  offsetX: number;
  offsetY: number;
  colorHex: string;
  opacityPct: number;
};
function toFabricShadow(s: SaraswatiShadow): ShadowUi {
  return s as ShadowUiShape;
}
function fromFabricShadow(s: ShadowUi): SaraswatiShadow {
  return s as SaraswatiShadow;
}

// ---------------------------------------------------------------------------
// Node type display labels
// ---------------------------------------------------------------------------
const NODE_TYPE_LABEL: Record<string, string> = {
  rect: "Rectangle",
  ellipse: "Ellipse",
  polygon: "Polygon",
  star: "Star",
  line: "Line",
  image: "Image",
  text: "Text",
  group: "Group",
  vector: "Vector",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SceneSelectionBar() {
  const scene = useSceneEditorStore((s) => s.scene);
  const selectedIds = useSceneEditorStore((s) => s.selectedIds);
  const focusMode = useSceneEditorStore((s) => s.focusMode);
  const applyCommands = useSceneEditorStore((s) => s.applyCommands);
  const beginHistoryBatch = useSceneEditorStore((s) => s.beginHistoryBatch);
  const endHistoryBatch = useSceneEditorStore((s) => s.endHistoryBatch);
  const setSelectedIds = useSceneEditorStore((s) => s.setSelectedIds);
  const setArtboard = useSceneEditorStore((s) => s.setArtboard);
  const setNodeFill = useSceneEditorStore((s) => s.setNodeFill);
  const setNodeStroke = useSceneEditorStore((s) => s.setNodeStroke);
  const setNodeCornerRadius = useSceneEditorStore((s) => s.setNodeCornerRadius);
  const setTextFormat = useSceneEditorStore((s) => s.setTextFormat);
  const setNodeOpacity = useSceneEditorStore((s) => s.setNodeOpacity);
  const setNodeShadow = useSceneEditorStore((s) => s.setNodeShadow);
  const setNodeBlur = useSceneEditorStore((s) => s.setNodeBlur);
  const setPolygonSides = useSceneEditorStore((s) => s.setPolygonSides);
  const barRef = useRef<HTMLDivElement>(null);
  const linePathRef = useRef<HTMLDivElement>(null);
  const linePathPanelRef = useRef<HTMLDivElement>(null);
  const lineWeightRef = useRef<HTMLDivElement>(null);
  const lineWeightPanelRef = useRef<HTMLDivElement>(null);
  const [linePathPanelOpen, setLinePathPanelOpen] = useState(false);
  const [lineWeightPanelOpen, setLineWeightPanelOpen] = useState(false);
  const styleBatchDepthRef = useRef(0);

  const beginStyleBatch = () => {
    if (styleBatchDepthRef.current === 0) {
      beginHistoryBatch();
    }
    styleBatchDepthRef.current += 1;
  };

  const endStyleBatch = () => {
    if (styleBatchDepthRef.current <= 0) return;
    styleBatchDepthRef.current -= 1;
    if (styleBatchDepthRef.current === 0) {
      endHistoryBatch();
    }
  };

  useEffect(() => {
    return () => {
      while (styleBatchDepthRef.current > 0) {
        styleBatchDepthRef.current -= 1;
        endHistoryBatch();
      }
    };
  }, [endHistoryBatch]);

  useEffect(() => {
    const anyOpen = linePathPanelOpen || lineWeightPanelOpen;
    if (!anyOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (linePathRef.current?.contains(target)) return;
      if (lineWeightRef.current?.contains(target)) return;
      setLinePathPanelOpen(false);
      setLineWeightPanelOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLinePathPanelOpen(false);
        setLineWeightPanelOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [linePathPanelOpen, lineWeightPanelOpen]);

  if (!scene) return null;

  const hasSelection = selectedIds.length > 0;

  const handleDelete = () => {
    applyCommands(
      selectedIds.map((id) => ({ type: "DELETE_NODE" as const, id })),
    );
    setSelectedIds([]);
  };

  // Single-node toolbar
  if (hasSelection && selectedIds.length === 1) {
    const nodeId = selectedIds[0]!;
    const node = scene.nodes[nodeId];
    if (!node) return null;

    // TEXT
    if (node.type === "text") {
      const textNode = node as SaraswatiTextNode;
      const opacityPct = Math.round((textNode.opacity ?? 1) * 100);
      const values: TextFormatToolbarValues = {
        fontFamily: textNode.fontFamily,
        fontSize: textNode.fontSize,
        fillStyle: toPaint(textNode.color),
        textAlign:
          textNode.textAlign === "right"
            ? "right"
            : textNode.textAlign === "center"
              ? "center"
              : "left",
        bold: textNode.fontWeight === "700" || textNode.fontWeight === "bold",
        italic: textNode.fontStyle === "italic",
        underline: textNode.underline,
      };
      return (
        <BarShell barRef={barRef} focusMode={focusMode}>
          <TextFormatToolbar
            values={values}
            onChange={(patch) => {
              const colorPatch = patch.fillStyle
                ? { color: toColor(patch.fillStyle) }
                : {};
              setTextFormat(nodeId, {
                fontFamily: patch.fontFamily,
                fontSize: patch.fontSize,
                fontWeight:
                  patch.bold !== undefined
                    ? patch.bold
                      ? "700"
                      : "400"
                    : undefined,
                fontStyle:
                  patch.italic !== undefined
                    ? patch.italic
                      ? "italic"
                      : "normal"
                    : undefined,
                textAlign:
                  patch.textAlign === "justify" ? "left" : patch.textAlign,
                underline: patch.underline,
                ...colorPatch,
              });
            }}
            footerSlot={
              <>
                <BlurToolbarControl
                  blurPct={textNode.blur ?? 0}
                  onChange={(b) => setNodeBlur(nodeId, b)}
                  onInteractionStart={beginStyleBatch}
                  onInteractionEnd={endStyleBatch}
                />
                <FloatingToolbarDivider />
                <TransparencyToolbarPopover
                  opacityPct={opacityPct}
                  onChange={(pct) => setNodeOpacity(nodeId, pct / 100)}
                  onInteractionStart={beginStyleBatch}
                  onInteractionEnd={endStyleBatch}
                />
                <FloatingToolbarDivider />
                <StrokeToolbarPopover
                  strokeWidthPx={textNode.strokeWidth ?? 0}
                  strokePaint={toPaint(
                    textNode.stroke ?? { type: "solid", color: "#000000" },
                  )}
                  onStrokeWidthChange={(w) =>
                    setNodeStroke(nodeId, textNode.stroke, w)
                  }
                  onStrokePaintChange={(v) =>
                    setNodeStroke(nodeId, toColor(v), textNode.strokeWidth)
                  }
                  onInteractionStart={beginStyleBatch}
                  onInteractionEnd={endStyleBatch}
                />
                <FloatingToolbarDivider />
                <ShadowToolbarPopover
                  value={toFabricShadow(
                    textNode.shadow ?? (DEFAULT_SHADOW_UI as SaraswatiShadow),
                  )}
                  shadowActive={Boolean(textNode.shadow)}
                  onChange={(s) => setNodeShadow(nodeId, fromFabricShadow(s))}
                  onInteractionStart={beginStyleBatch}
                  onInteractionEnd={endStyleBatch}
                />
              </>
            }
          />
        </BarShell>
      );
    }

    // RECT
    if (node.type === "rect") {
      const rectNode = node as SaraswatiRectNode;
      const radiusMax = Math.min(rectNode.width, rectNode.height) / 2;
      const opacityPct = Math.round((rectNode.opacity ?? 1) * 100);
      return (
        <BarShell barRef={barRef} focusMode={focusMode}>
          <FloatingToolbarShell role="toolbar" aria-label="Rectangle options">
            <div className="flex items-center py-1.5 pl-2.5 pr-1.5">
              <PaintPopoverControl
                compact
                value={toPaint(rectNode.fill)}
                onChange={(v) => setNodeFill(nodeId, toColor(v))}
                title="Fill color and gradient"
                ariaLabel="Fill color and gradient"
              />
              {radiusMax > 0 && (
                <>
                  <FloatingToolbarDivider />
                  <CornerRadiusToolbarControl
                    value={rectNode.radiusX}
                    max={radiusMax}
                    onChange={(r) => setNodeCornerRadius(nodeId, r)}
                    onInteractionStart={beginStyleBatch}
                    onInteractionEnd={endStyleBatch}
                  />
                </>
              )}
              <FloatingToolbarDivider />
              <BlurToolbarControl
                blurPct={rectNode.blur ?? 0}
                onChange={(b) => setNodeBlur(nodeId, b)}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <TransparencyToolbarPopover
                opacityPct={opacityPct}
                onChange={(pct) => setNodeOpacity(nodeId, pct / 100)}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <StrokeToolbarPopover
                strokeWidthPx={rectNode.strokeWidth}
                strokePaint={toPaint(
                  rectNode.stroke ?? { type: "solid", color: "#000000" },
                )}
                onStrokeWidthChange={(w) =>
                  setNodeStroke(nodeId, rectNode.stroke, w)
                }
                onStrokePaintChange={(v) =>
                  setNodeStroke(nodeId, toColor(v), rectNode.strokeWidth)
                }
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <ShadowToolbarPopover
                value={toFabricShadow(
                  rectNode.shadow ?? (DEFAULT_SHADOW_UI as SaraswatiShadow),
                )}
                shadowActive={Boolean(rectNode.shadow)}
                onChange={(s) => setNodeShadow(nodeId, fromFabricShadow(s))}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <DeleteBtn onClick={handleDelete} />
            </div>
          </FloatingToolbarShell>
        </BarShell>
      );
    }

    // ELLIPSE / POLYGON
    if (node.type === "ellipse" || node.type === "polygon") {
      const paintNode = node as unknown as SaraswatiPaintNodeBase;
      const polygonNode =
        node.type === "polygon" ? (node as SaraswatiPolygonNode) : null;
      const polygonIsStar = polygonNode
        ? /star/i.test(polygonNode.name ?? "")
        : false;
      const polygonSides = polygonNode
        ? Math.max(
            3,
            Math.round(
              polygonIsStar
                ? polygonNode.points.length / 2
                : polygonNode.points.length,
            ),
          )
        : 0;
      const opacityPct = Math.round((paintNode.opacity ?? 1) * 100);
      return (
        <BarShell barRef={barRef} focusMode={focusMode}>
          <FloatingToolbarShell
            role="toolbar"
            aria-label={`${NODE_TYPE_LABEL[node.type] ?? node.type} options`}
          >
            <div className="flex items-center py-1.5 pl-2.5 pr-1.5">
              <PaintPopoverControl
                compact
                value={toPaint(paintNode.fill)}
                onChange={(v) => setNodeFill(nodeId, toColor(v))}
                title="Fill color and gradient"
                ariaLabel="Fill color and gradient"
              />
              {polygonNode ? (
                <>
                  <FloatingToolbarDivider />
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                      {polygonIsStar ? "Points" : "Sides"}
                    </span>
                    <input
                      type="number"
                      min={3}
                      max={polygonIsStar ? 24 : 32}
                      value={polygonSides}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next)) return;
                        setPolygonSides(nodeId, next, polygonIsStar);
                      }}
                      className="h-8 w-14 rounded-lg border border-black/10 bg-white px-2 text-xs text-neutral-800 outline-none focus:border-black/20"
                      aria-label={
                        polygonIsStar ? "Star points" : "Polygon sides"
                      }
                    />
                  </div>
                </>
              ) : null}
              <FloatingToolbarDivider />
              <BlurToolbarControl
                blurPct={(node as unknown as { blur?: number }).blur ?? 0}
                onChange={(b) => setNodeBlur(nodeId, b)}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <TransparencyToolbarPopover
                opacityPct={opacityPct}
                onChange={(pct) => setNodeOpacity(nodeId, pct / 100)}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <StrokeToolbarPopover
                strokeWidthPx={paintNode.strokeWidth}
                strokePaint={toPaint(
                  paintNode.stroke ?? { type: "solid", color: "#000000" },
                )}
                onStrokeWidthChange={(w) =>
                  setNodeStroke(nodeId, paintNode.stroke, w)
                }
                onStrokePaintChange={(v) =>
                  setNodeStroke(nodeId, toColor(v), paintNode.strokeWidth)
                }
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <ShadowToolbarPopover
                value={toFabricShadow(
                  (node as unknown as { shadow?: SaraswatiShadow }).shadow ??
                    (DEFAULT_SHADOW_UI as SaraswatiShadow),
                )}
                shadowActive={Boolean(
                  (node as unknown as { shadow?: SaraswatiShadow }).shadow,
                )}
                onChange={(s) => setNodeShadow(nodeId, fromFabricShadow(s))}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <DeleteBtn onClick={handleDelete} />
            </div>
          </FloatingToolbarShell>
        </BarShell>
      );
    }

    // LINE
    if (node.type === "line") {
      const lineNode = node as SaraswatiLineNode;
      const opacityPct = Math.round((lineNode.opacity ?? 1) * 100);
      const pathType = lineNode.pathType ?? "straight";
      const strokeW = Math.max(1, Math.round(lineNode.strokeWidth ?? 2));
      const applyLinePatch = (
        patch: Partial<
          Pick<
            SaraswatiLineNode,
            | "pathType"
            | "curveBulge"
            | "curveT"
            | "strokeWidth"
            | "arrowStart"
            | "arrowEnd"
          >
        >,
      ) => {
        const nextPathType = patch.pathType ?? lineNode.pathType;
        applyCommands([
          {
            type: "REPLACE_NODE",
            node: {
              ...lineNode,
              ...patch,
              lineStyle: "solid",
              pathType: nextPathType,
              curveBulge:
                nextPathType === "straight"
                  ? 0
                  : (patch.curveBulge ?? lineNode.curveBulge ?? 60),
              curveT: patch.curveT ?? lineNode.curveT ?? 0.5,
            },
          },
        ]);
      };

      return (
        <BarShell barRef={barRef} focusMode={focusMode}>
          <FloatingToolbarShell role="toolbar" aria-label="Line options">
            <div className="flex items-center py-1.5 pl-2.5 pr-1.5">
              {/* Stroke color */}
              <PaintPopoverControl
                compact
                value={toPaint(lineNode.stroke)}
                onChange={(v) =>
                  setNodeStroke(nodeId, toColor(v), lineNode.strokeWidth)
                }
                title="Stroke color and gradient"
                ariaLabel="Stroke color and gradient"
              />

              <FloatingToolbarDivider />

              {/* Path type button + flyout */}
              <div ref={linePathRef} className="relative">
                <button
                  type="button"
                  className={floatingToolbarIconButton(linePathPanelOpen, {
                    wide: true,
                  })}
                  onClick={() => {
                    setLinePathPanelOpen((o) => !o);
                    setLineWeightPanelOpen(false);
                  }}
                  aria-label="Line type"
                  title="Line type"
                  aria-expanded={linePathPanelOpen}
                  aria-haspopup="dialog"
                >
                  <HugeiconsIcon
                    icon={
                      pathType === "curved" ? BendToolIcon : StraightEdgeIcon
                    }
                    size={18}
                    strokeWidth={1.75}
                  />
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    size={12}
                    strokeWidth={1.75}
                    className={`transition-transform ${
                      linePathPanelOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {linePathPanelOpen ? (
                  <div
                    ref={linePathPanelRef}
                    role="dialog"
                    aria-label="Line type"
                    className={[
                      "absolute left-1/2 z-60 min-w-48 -translate-x-1/2 px-2 py-2 top-full mt-2",
                      floatingToolbarPopoverClass,
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/5"
                      onClick={() => {
                        applyLinePatch({ pathType: "straight" });
                        setLinePathPanelOpen(false);
                      }}
                    >
                      <HugeiconsIcon
                        icon={StraightEdgeIcon}
                        size={18}
                        strokeWidth={1.75}
                        className="shrink-0 text-neutral-600"
                      />
                      <span className="flex-1">Straight</span>
                      {pathType === "straight" ? (
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          size={16}
                          strokeWidth={1.75}
                          className="shrink-0 text-neutral-700"
                        />
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/5"
                      onClick={() => {
                        applyLinePatch({ pathType: "curved" });
                        setLinePathPanelOpen(false);
                      }}
                    >
                      <HugeiconsIcon
                        icon={BendToolIcon}
                        size={18}
                        strokeWidth={1.75}
                        className="shrink-0 text-neutral-600"
                      />
                      <span className="flex-1">Curved</span>
                      {pathType === "curved" ? (
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          size={16}
                          strokeWidth={1.75}
                          className="shrink-0 text-neutral-700"
                        />
                      ) : null}
                    </button>

                    {pathType === "curved" ? (
                      <>
                        <div className="mx-2 my-1.5 h-px bg-black/6" />
                        <div className="flex flex-col gap-3 px-2 py-1.5">
                          <div>
                            <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                              Bulge
                            </span>
                            <div className="flex items-center gap-2">
                              <EditorRangeSlider
                                min={-2400}
                                max={2400}
                                step={1}
                                value={Math.round(lineNode.curveBulge ?? 0)}
                                onChange={(v) =>
                                  applyLinePatch({ curveBulge: v })
                                }
                                onInteractionStart={beginStyleBatch}
                                onInteractionEnd={endStyleBatch}
                                aria-label="Curve bulge"
                                trackClassName="min-w-0 flex-1"
                              />
                              <input
                                type="number"
                                min={-2400}
                                max={2400}
                                value={Math.round(lineNode.curveBulge ?? 0)}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  if (Number.isFinite(v))
                                    applyLinePatch({ curveBulge: v });
                                }}
                                onFocus={beginStyleBatch}
                                onBlur={endStyleBatch}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    endStyleBatch();
                                    (
                                      e.currentTarget as HTMLInputElement
                                    ).blur();
                                  }
                                }}
                                className="w-16 rounded-md border border-black/12 bg-neutral-50 px-1.5 py-1 text-center text-xs tabular-nums text-neutral-900 outline-none focus:border-black/25"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                              Position
                            </span>
                            <EditorRangeSlider
                              min={-4}
                              max={5}
                              step={0.01}
                              value={lineNode.curveT ?? 0.5}
                              onChange={(v) => applyLinePatch({ curveT: v })}
                              onInteractionStart={beginStyleBatch}
                              onInteractionEnd={endStyleBatch}
                              aria-label="Curve position"
                              trackClassName="w-full"
                            />
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <FloatingToolbarDivider />

              {/* Stroke weight button + flyout */}
              <div ref={lineWeightRef} className="relative">
                <button
                  type="button"
                  className={floatingToolbarIconButton(lineWeightPanelOpen, {
                    wide: true,
                  })}
                  onClick={() => {
                    setLineWeightPanelOpen((o) => !o);
                    setLinePathPanelOpen(false);
                  }}
                  aria-label="Stroke weight"
                  title="Stroke weight"
                  aria-expanded={lineWeightPanelOpen}
                  aria-haspopup="dialog"
                >
                  <span className="text-[13px] tabular-nums">{strokeW}</span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    size={12}
                    strokeWidth={1.75}
                    className={`transition-transform ${
                      lineWeightPanelOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {lineWeightPanelOpen ? (
                  <div
                    ref={lineWeightPanelRef}
                    role="dialog"
                    aria-label="Stroke weight"
                    className={[
                      "absolute left-1/2 z-60 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 px-4 py-3.5 top-full mt-2",
                      floatingToolbarPopoverClass,
                    ].join(" ")}
                  >
                    <span className="text-[13px] font-medium text-neutral-700">
                      Stroke weight
                    </span>
                    <div className="mt-2 flex items-center gap-2">
                      <EditorRangeSlider
                        min={1}
                        max={80}
                        value={strokeW}
                        onChange={(v) => applyLinePatch({ strokeWidth: v })}
                        onInteractionStart={beginStyleBatch}
                        onInteractionEnd={endStyleBatch}
                        aria-label="Stroke weight"
                        trackClassName="min-w-0 flex-1"
                      />
                      <input
                        type="number"
                        min={1}
                        max={80}
                        value={strokeW}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v))
                            applyLinePatch({ strokeWidth: v });
                        }}
                        onFocus={beginStyleBatch}
                        onBlur={endStyleBatch}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            endStyleBatch();
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        className="w-12 rounded-md border border-black/12 bg-neutral-50 px-1.5 py-1 text-center text-xs tabular-nums text-neutral-900 outline-none focus:border-black/25"
                      />
                    </div>

                    <div className="mt-3">
                      <span className="text-[13px] font-medium text-neutral-700">
                        Arrow heads
                      </span>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            applyLinePatch({
                              arrowStart: !lineNode.arrowStart,
                            })
                          }
                          className={[
                            floatingToolbarIconButton(!!lineNode.arrowStart, {
                              wide: true,
                            }),
                            "flex-1 text-[13px] font-medium",
                          ].join(" ")}
                        >
                          ← Start
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            applyLinePatch({ arrowEnd: !lineNode.arrowEnd })
                          }
                          className={[
                            floatingToolbarIconButton(!!lineNode.arrowEnd, {
                              wide: true,
                            }),
                            "flex-1 text-[13px] font-medium",
                          ].join(" ")}
                        >
                          End →
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <FloatingToolbarDivider />
              <BlurToolbarControl
                blurPct={lineNode.blur ?? 0}
                onChange={(b) => setNodeBlur(nodeId, b)}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <TransparencyToolbarPopover
                opacityPct={opacityPct}
                onChange={(pct) => setNodeOpacity(nodeId, pct / 100)}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <ShadowToolbarPopover
                value={toFabricShadow(
                  lineNode.shadow ?? (DEFAULT_SHADOW_UI as SaraswatiShadow),
                )}
                shadowActive={Boolean(lineNode.shadow)}
                onChange={(s) => setNodeShadow(nodeId, fromFabricShadow(s))}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <DeleteBtn onClick={handleDelete} />
            </div>
          </FloatingToolbarShell>
        </BarShell>
      );
    }

    // GROUP
    if (node.type === "group") {
      const opacityPct = Math.round((node.opacity ?? 1) * 100);
      return (
        <BarShell barRef={barRef} focusMode={focusMode}>
          <FloatingToolbarShell role="toolbar" aria-label="Selection">
            <div className="flex items-center py-1.5 pl-2.5 pr-1.5">
              <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {node.name ?? "Group"}
              </span>
              <FloatingToolbarDivider />
              <BlurToolbarControl
                blurPct={node.blur ?? 0}
                onChange={(b) => setNodeBlur(nodeId, b)}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <TransparencyToolbarPopover
                opacityPct={opacityPct}
                onChange={(pct) => setNodeOpacity(nodeId, pct / 100)}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <ShadowToolbarPopover
                value={toFabricShadow(
                  node.shadow ?? (DEFAULT_SHADOW_UI as SaraswatiShadow),
                )}
                shadowActive={Boolean(node.shadow)}
                onChange={(s) => setNodeShadow(nodeId, fromFabricShadow(s))}
                onInteractionStart={beginStyleBatch}
                onInteractionEnd={endStyleBatch}
              />
              <FloatingToolbarDivider />
              <button
                type="button"
                onClick={() => {
                  applyCommands([{ type: "UNGROUP_NODE", id: nodeId }]);
                  setSelectedIds([]);
                }}
                title="Ungroup (Cmd/Ctrl+Shift+G)"
                aria-label="Ungroup"
                className={[
                  floatingToolbarIconButton(false, { wide: true }),
                  "gap-1 px-2",
                ].join(" ")}
              >
                <HugeiconsIcon
                  icon={UngroupItemsIcon}
                  size={16}
                  strokeWidth={1.75}
                />
                <span className="text-[13px] font-medium">Ungroup</span>
              </button>
              <FloatingToolbarDivider />
              <DeleteBtn onClick={handleDelete} />
            </div>
          </FloatingToolbarShell>
        </BarShell>
      );
    }

    // IMAGE
    if (node.type === "image") {
      const imageNode = node as SaraswatiImageNode;
      return <ImageToolbar nodeId={nodeId} imageNode={imageNode} focusMode={focusMode} barRef={barRef} onDelete={handleDelete} />;
    }

    // UNKNOWN
    const label = "Selection";
    const opacityPct = Math.round(
      ((node as { opacity?: number }).opacity ?? 1) * 100,
    );
    const nodeWithEffects = node as { blur?: number; shadow?: SaraswatiShadow };
    return (
      <BarShell barRef={barRef} focusMode={focusMode}>
        <FloatingToolbarShell role="toolbar" aria-label="Selection">
          <div className="flex items-center py-1.5 pl-2.5 pr-1.5">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {label}
            </span>
            <FloatingToolbarDivider />
            <BlurToolbarControl
              blurPct={nodeWithEffects.blur ?? 0}
              onChange={(b) => setNodeBlur(nodeId, b)}
              onInteractionStart={beginStyleBatch}
              onInteractionEnd={endStyleBatch}
            />
            <FloatingToolbarDivider />
            <TransparencyToolbarPopover
              opacityPct={opacityPct}
              onChange={(pct) => setNodeOpacity(nodeId, pct / 100)}
              onInteractionStart={beginStyleBatch}
              onInteractionEnd={endStyleBatch}
            />
            <FloatingToolbarDivider />
            <ShadowToolbarPopover
              value={toFabricShadow(
                nodeWithEffects.shadow ??
                  (DEFAULT_SHADOW_UI as SaraswatiShadow),
              )}
              shadowActive={Boolean(nodeWithEffects.shadow)}
              onChange={(s) => setNodeShadow(nodeId, fromFabricShadow(s))}
              onInteractionStart={beginStyleBatch}
              onInteractionEnd={endStyleBatch}
            />
            <FloatingToolbarDivider />
            <DeleteBtn onClick={handleDelete} />
          </div>
        </FloatingToolbarShell>
      </BarShell>
    );
  }

  // Multi-select
  if (hasSelection && selectedIds.length > 1) {
    return (
      <BarShell barRef={barRef} focusMode={focusMode}>
        <FloatingToolbarShell role="toolbar" aria-label="Selection">
          <div className="flex items-center py-1.5 pl-3 pr-1.5">
            <span className="text-[13px] font-medium text-neutral-600">
              {selectedIds.length} items
            </span>
            <FloatingToolbarDivider />
            <DeleteBtn onClick={handleDelete} />
          </div>
        </FloatingToolbarShell>
      </BarShell>
    );
  }

  // Nothing selected — artboard / background controls
  return (
    <BarShell barRef={barRef} focusMode={focusMode}>
      <FloatingToolbarShell role="toolbar" aria-label="Artboard">
        <div className="flex items-center py-1.5 pl-2.5 pr-1.5">
          <ArtboardResizeToolbarControl
            width={scene.artboard.width}
            height={scene.artboard.height}
            onResize={(w, h) => setArtboard(w, h)}
            viewportRef={barRef}
          />
          <FloatingToolbarDivider />
          <PaintPopoverControl
            value={toPaint(scene.artboard.bg)}
            onChange={(bg) => setArtboard(undefined, undefined, toColor(bg))}
            ariaLabel="Artboard background"
            title="Background"
            compact
          />
        </div>
      </FloatingToolbarShell>
    </BarShell>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------
function BarShell({
  barRef,
  focusMode,
  children,
}: {
  barRef: React.RefObject<HTMLDivElement | null>;
  focusMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-avnac-chrome
      ref={barRef}
      className={[
        "pointer-events-none absolute inset-x-0 top-3 z-80 flex h-14 items-center justify-center px-2 transition-opacity duration-150",
        focusMode ? "pointer-events-none opacity-0" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Delete selected (Delete)"
      aria-label="Delete selected"
      className={floatingToolbarIconButton(false)}
    >
      <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.75} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// ImageToolbar — extracted so it can own the useRemoveBg hook
// ---------------------------------------------------------------------------
function ImageToolbar({
  nodeId,
  imageNode,
  focusMode,
  barRef,
  onDelete,
}: {
  nodeId: string;
  imageNode: SaraswatiImageNode;
  focusMode: boolean;
  barRef: React.RefObject<HTMLDivElement | null>;
  onDelete: () => void;
}) {
  const [cropModalOpen, setCropModalOpen] = useState(false);

  const applyCommands = useSceneEditorStore((s) => s.applyCommands);
  const trimImageToContent = useSceneEditorStore((s) => s.trimImageToContent);
  const setImageBorderRadius = useSceneEditorStore(
    (s) => s.setImageBorderRadius,
  );
  const setNodeBlur = useSceneEditorStore((s) => s.setNodeBlur);
  const setNodeOpacity = useSceneEditorStore((s) => s.setNodeOpacity);
  const setNodeShadow = useSceneEditorStore((s) => s.setNodeShadow);
  const beginHistoryBatch = useSceneEditorStore((s) => s.beginHistoryBatch);
  const endHistoryBatch = useSceneEditorStore((s) => s.endHistoryBatch);
  const styleBatchDepthRef = useRef(0);

  const beginStyleBatch = () => {
    if (styleBatchDepthRef.current === 0) beginHistoryBatch();
    styleBatchDepthRef.current += 1;
  };
  const endStyleBatch = () => {
    if (styleBatchDepthRef.current <= 0) return;
    styleBatchDepthRef.current -= 1;
    if (styleBatchDepthRef.current === 0) endHistoryBatch();
  };

  const { isProcessing, error, clearError, startRemoveBg } = useRemoveBg(
    nodeId,
    imageNode,
  );

  const opacityPct = Math.round((imageNode.opacity ?? 1) * 100);
  const radiusValue = imageNode.borderRadius ?? 0;
  const radiusMax = Math.min(imageNode.width, imageNode.height) / 2;

  return (
    <>
      <BarShell barRef={barRef} focusMode={focusMode}>
        <FloatingToolbarShell role="toolbar" aria-label="Image options">
          <div className="flex items-center py-1.5 pl-2.5 pr-1.5">
            {/* Remove background */}
            <button
              type="button"
              onClick={() => void startRemoveBg()}
              disabled={isProcessing}
              className={[
                floatingToolbarIconButton(isProcessing, { wide: true }),
                "gap-1 px-2",
                isProcessing ? "opacity-70 cursor-wait" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title="Remove background"
              aria-label="Remove background"
              aria-busy={isProcessing}
            >
              <HugeiconsIcon
                icon={AiMagicIcon}
                size={15}
                strokeWidth={1.75}
                className={isProcessing ? "animate-pulse" : ""}
              />
              <span className="text-[13px] font-medium">Remove bg</span>
            </button>

            {/* Inline error badge */}
            {error ? (
              <>
                <FloatingToolbarDivider />
                <div className="flex items-center gap-1 pl-1 pr-0.5">
                  <span
                    className="max-w-56 truncate text-[11px] font-medium text-red-500"
                    title={error}
                  >
                    {error}
                  </span>
                  <button
                    type="button"
                    onClick={clearError}
                    aria-label="Dismiss error"
                    className="flex h-5 w-5 items-center justify-center rounded text-neutral-400 hover:text-neutral-700"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={12}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </>
            ) : null}

            <FloatingToolbarDivider />

            {/* Crop */}
            <button
              type="button"
              onClick={() => setCropModalOpen(true)}
              className={floatingToolbarIconButton(false)}
              title="Crop image"
              aria-label="Crop image"
            >
              <HugeiconsIcon icon={CropIcon} size={16} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => {
                void trimImageToContent(nodeId);
              }}
              className={floatingToolbarIconButton(false)}
              title="Trim transparent padding"
              aria-label="Trim to content"
            >
              Trim
            </button>

            <FloatingToolbarDivider />
            <CornerRadiusToolbarControl
              value={radiusValue}
              max={radiusMax}
              onChange={(r) => setImageBorderRadius(nodeId, r)}
              onInteractionStart={beginStyleBatch}
              onInteractionEnd={endStyleBatch}
            />
            <FloatingToolbarDivider />
            <BlurToolbarControl
              blurPct={imageNode.blur ?? 0}
              onChange={(b) => setNodeBlur(nodeId, b)}
              onInteractionStart={beginStyleBatch}
              onInteractionEnd={endStyleBatch}
            />
            <FloatingToolbarDivider />
            <TransparencyToolbarPopover
              opacityPct={opacityPct}
              onChange={(pct) => setNodeOpacity(nodeId, pct / 100)}
              onInteractionStart={beginStyleBatch}
              onInteractionEnd={endStyleBatch}
            />
            <FloatingToolbarDivider />
            <ShadowToolbarPopover
              value={toFabricShadow(
                imageNode.shadow ?? (DEFAULT_SHADOW_UI as SaraswatiShadow),
              )}
              shadowActive={Boolean(imageNode.shadow)}
              onChange={(s) => setNodeShadow(nodeId, fromFabricShadow(s))}
              onInteractionStart={beginStyleBatch}
              onInteractionEnd={endStyleBatch}
            />
            <FloatingToolbarDivider />
            <DeleteBtn onClick={onDelete} />
          </div>
        </FloatingToolbarShell>
      </BarShell>

      <ImageCropModal
        open={cropModalOpen}
        imageSrc={imageNode.src}
        initialCrop={{
          x: imageNode.cropX,
          y: imageNode.cropY,
          w: imageNode.cropWidth,
          h: imageNode.cropHeight,
        }}
        onCancel={() => setCropModalOpen(false)}
        onApply={(rect) => {
          const prevCropW = imageNode.cropWidth ?? rect.sourceNaturalWidth;
          const prevCropH = imageNode.cropHeight ?? rect.sourceNaturalHeight;
          const nextSize = fitImageNodeSizeToCrop({
            nodeWidth: imageNode.width,
            nodeHeight: imageNode.height,
            prevCropWidth: prevCropW,
            prevCropHeight: prevCropH,
            nextCropWidth: rect.width,
            nextCropHeight: rect.height,
          });
          const commands: SaraswatiCommand[] = [
            {
              type: "SET_IMAGE_CROP",
              id: nodeId,
              cropX: rect.cropX,
              cropY: rect.cropY,
              cropWidth: rect.width,
              cropHeight: rect.height,
            },
          ];
          if (
            nextSize.width !== imageNode.width ||
            nextSize.height !== imageNode.height
          ) {
            commands.push({
              type: "RESIZE_NODE",
              id: nodeId,
              x: imageNode.x,
              y: imageNode.y,
              width: nextSize.width,
              height: nextSize.height,
            });
          }
          applyCommands(commands);
          setCropModalOpen(false);
        }}
      />
    </>
  );
}
