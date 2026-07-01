import { repaintContentWithDirtyRegions } from "./backends/canvas2d/partial-repaint";
import { planPartialRepaint } from "./dirty-regions";
import {
  countDuplicateRenderCommands,
  EMPTY_RENDER_PAINT_STATS,
  type RenderPaintStats,
} from "./render-stats";
import type { RendererBackend } from "./types";
import type { SaraswatiRenderCommand } from "@/lib/saraswati";

export type { RenderPaintStats } from "./render-stats";
export { EMPTY_RENDER_PAINT_STATS } from "./render-stats";

export type ContentPaintInput<TTarget> = {
  target: TTarget;
  commands: readonly SaraswatiRenderCommand[];
  artboardWidth: number;
  artboardHeight: number;
  /** Presentation-only key (artboard size, visibility filters, etc.). */
  presentationKey: string;
  backend: RendererBackend<TTarget>;
};

export type ContentPaintResult = {
  status: "skipped" | "painted";
  stats: RenderPaintStats;
};

export type ContentPaintScheduler = {
  reset: () => void;
  paintContent: <TTarget>(
    input: ContentPaintInput<TTarget>,
  ) => Promise<ContentPaintResult>;
};

export function createContentPaintScheduler(): ContentPaintScheduler {
  let previousCommands: SaraswatiRenderCommand[] = [];
  let previousPresentationKey = "";

  function resetPresentationState(presentationKey: string) {
    previousCommands = [];
    previousPresentationKey = presentationKey;
  }

  return {
    reset() {
      previousCommands = [];
      previousPresentationKey = "";
    },

    async paintContent<TTarget>(
      input: ContentPaintInput<TTarget>,
    ): Promise<ContentPaintResult> {
      const {
        target,
        commands,
        artboardWidth,
        artboardHeight,
        presentationKey,
        backend,
      } = input;

      if (presentationKey !== previousPresentationKey) {
        resetPresentationState(presentationKey);
      }

      const allowPartial = backend.kind === "canvas2d";
      const plan = planPartialRepaint({
        previous: previousCommands,
        next: commands,
        artboardWidth,
        artboardHeight,
        allowPartial,
      });

      if (plan.dirtyRects.length === 0 && previousCommands.length > 0) {
        return {
          status: "skipped",
          stats: {
            ...EMPTY_RENDER_PAINT_STATS,
            commands: commands.length,
            repaintMode: "skipped",
          },
        };
      }

      const start = performance.now();
      let commandsRepainted = commands.length;
      let repaintMode: RenderPaintStats["repaintMode"] = plan.mode;

      if (plan.mode === "partial" && allowPartial) {
        const partial = await repaintContentWithDirtyRegions(
          target as CanvasRenderingContext2D,
          commands,
          plan.dirtyRects,
          backend as RendererBackend<CanvasRenderingContext2D>,
        );
        commandsRepainted = partial.commandsRepainted;
      } else {
        repaintMode = "full";
        if (backend.kind === "canvas2d") {
          const ctx = target as CanvasRenderingContext2D;
          ctx.clearRect(0, 0, artboardWidth, artboardHeight);
        }
        await backend.render(target, commands);
      }

      previousCommands = [...commands];

      const end = performance.now();
      return {
        status: "painted",
        stats: {
          ms: end - start,
          commands: commands.length,
          duplicateCommands: countDuplicateRenderCommands(commands),
          repaintMode,
          dirtyRects: plan.dirtyRects.length,
          dirtyCoveragePct: plan.dirtyCoveragePct,
          commandsRepainted,
        },
      };
    },
  };
}
