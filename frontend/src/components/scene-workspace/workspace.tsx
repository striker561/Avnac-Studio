import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import type { RendererBackend } from "@/lib/renderer";
import {
  applyCommand,
  type SaraswatiCommand,
  type SaraswatiScene,
} from "@/lib/saraswati";
import { fromAvnacDocument } from "@/lib/saraswati/compat/from-avnac";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import { useEffect, useMemo, useRef, useState } from "react";
import SceneWorkspaceStage, {
  EMPTY_SCENE_WORKSPACE_RENDER_STATS,
  type SceneWorkspaceRenderStats,
} from "./stage";
import type { SceneWorkspacePreviewMode, SceneWorkspaceStore } from "./store";
import { useSceneWorkspaceEditor } from "./use-scene-workspace-editor";

type Props = {
  mode: SceneWorkspacePreviewMode;
  document: AvnacDocumentV1 | null;
  backend?: RendererBackend<CanvasRenderingContext2D>;
  commands?: readonly SaraswatiCommand[];
  /** The shared scene workspace Zustand store. When provided, selection state is written to it. */
  store?: SceneWorkspaceStore;
  onCommandsApplied?: (result: {
    commands: readonly SaraswatiCommand[];
    scene: SaraswatiScene;
  }) => void;
};

export default function SceneWorkspace({
  mode,
  document,
  backend,
  commands,
  store,
  onCommandsApplied,
}: Props) {
  // ── derive the scene (may be null when mode is "off") ──────────────────
  const adapterResult = useMemo(() => {
    if (!document || mode === "off") return null;
    return fromAvnacDocument(document);
  }, [document, mode]);

  const sceneResult = useMemo(() => {
    if (!adapterResult) return null;
    if (!commands || commands.length === 0) {
      return {
        scene: adapterResult.scene,
        issues: adapterResult.issues,
        appliedCommands: [] as SaraswatiCommand[],
      };
    }
    let nextScene = adapterResult.scene;
    for (const command of commands) {
      nextScene = applyCommand(nextScene, command);
    }
    return {
      scene: nextScene,
      issues: adapterResult.issues,
      appliedCommands: [...commands],
    };
  }, [adapterResult, commands]);

  // ── stable fallback scene — keeps hook call count constant ─────────────
  const emptySceneRef = useRef(createEmptySaraswatiScene());
  const isInteractive = mode === "full" && !!sceneResult;
  const editorScene = sceneResult?.scene ?? emptySceneRef.current;
  const [renderStats, setRenderStats] = useState<SceneWorkspaceRenderStats>(
    EMPTY_SCENE_WORKSPACE_RENDER_STATS,
  );

  // ── ALL hooks must be unconditional — no early return before this ───────
  useEffect(() => {
    if (!onCommandsApplied || !sceneResult) return;
    if (sceneResult.appliedCommands.length === 0) return;
    onCommandsApplied({
      commands: sceneResult.appliedCommands,
      scene: sceneResult.scene,
    });
  }, [onCommandsApplied, sceneResult]);

  const editor = useSceneWorkspaceEditor({
    enabled: isInteractive,
    scene: editorScene,
    store,
    onCommandsApplied,
  });

  // ── early exit after all hooks ──────────────────────────────────────────
  if (mode === "off" || !sceneResult) return null;

  const { scene, issues } = sceneResult;
  const renderedScene = isInteractive ? editor.scene : scene;

  const issueSummary = useMemo(() => {
    if (issues.length === 0) return null;
    const buckets = new Map<string, number>();
    for (const issue of issues) {
      const key = `${issue.sourceType}:${issue.reason}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => {
        const [sourceType, reason] = key.split(":");
        return `${sourceType} (${reason}) x${count}`;
      })
      .slice(0, 3)
      .join(", ");
  }, [issues]);
  const isFullWorkspace = mode === "full";
  const maxPreviewEdge = mode === "split" ? 300 : 560;
  const maxSceneEdge = Math.max(
    renderedScene.artboard.width,
    renderedScene.artboard.height,
    1,
  );
  const scale = isFullWorkspace
    ? 1
    : Math.min(1, maxPreviewEdge / maxSceneEdge);
  const scaledWidth = Math.max(
    1,
    Math.round(renderedScene.artboard.width * scale),
  );
  const scaledHeight = Math.max(
    1,
    Math.round(renderedScene.artboard.height * scale),
  );

  return (
    <div
      className={
        mode === "split"
          ? "pointer-events-none absolute right-4 top-4 z-[35] w-[min(24rem,calc(100%-2rem))]"
          : "pointer-events-none absolute inset-0 z-[35] flex min-h-0 flex-1 flex-col"
      }
    >
      <div
        className={
          mode === "split"
            ? "max-w-full overflow-hidden rounded-[1.4rem] border border-black/[0.08] bg-white/92 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl"
            : "relative flex min-h-0 flex-1 flex-col rounded-2xl border border-black/[0.06] bg-white/94 p-3 shadow-[0_18px_56px_rgba(0,0,0,0.10)] backdrop-blur-xl"
        }
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Saraswati
            </div>
            <div className="text-sm font-semibold text-neutral-900">
              {mode === "split" ? "Split preview" : "Scene workspace"}
            </div>
          </div>
          <span className="rounded-full border border-black/10 bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-neutral-700">
            {isInteractive ? "Select + drag" : "Read-only"}
          </span>
        </div>

        <div
          className={
            mode === "split"
              ? "overflow-auto rounded-[1.1rem] bg-neutral-100/70 p-2"
              : "flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[1.1rem] bg-neutral-100/70 p-2"
          }
        >
          <div style={{ width: scaledWidth, height: scaledHeight }}>
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <SceneWorkspaceStage
                scene={renderedScene}
                backend={backend}
                className={mode === "split" ? undefined : "max-w-none"}
                interactive={isInteractive}
                selectedIds={editor.selectedIds}
                hoveredId={editor.hoveredId}
                guides={editor.guides}
                measurement={editor.measurement}
                onScenePointerDown={editor.onPointerDown}
                onScenePointerMove={editor.onPointerMove}
                onScenePointerUp={editor.onPointerUp}
                onScenePointerLeave={editor.onPointerLeave}
                onHandlePointerDown={editor.onHandlePointerDown}
                onClipHandlePointerDown={editor.onClipHandlePointerDown}
                onCreateClipPath={editor.onCreateClipPath}
                onRenderStats={setRenderStats}
              />
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-neutral-600">
          {issues.length > 0
            ? `Partial render: ${issues.length} legacy Fabric item${issues.length === 1 ? "" : "s"} still need porting. ${issueSummary ? `Top blockers: ${issueSummary}.` : ""}`
            : isInteractive
              ? "Prototype interaction is enabled in full scene workspace: selection and drag-to-move are routed through Saraswati commands."
              : "RenderCommands are being interpreted by the selected renderer backend instead of Fabric."}
          {` Render ${renderStats.ms.toFixed(1)}ms · Cmds ${renderStats.commands} · Dup ${renderStats.duplicateCommands} · ${renderStats.repaintMode === "partial" ? `Partial ${renderStats.dirtyCoveragePct.toFixed(1)}% (${renderStats.dirtyRects} rects, ${renderStats.commandsRepainted} draws)` : renderStats.repaintMode === "skipped" ? "Skipped (no diff)" : "Full repaint"}.`}
        </p>
      </div>
    </div>
  );
}
