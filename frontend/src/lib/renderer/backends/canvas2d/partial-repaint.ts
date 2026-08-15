import type { SaraswatiRenderCommand } from "@/lib/saraswati";
import {
  type DirtyRect,
  renderCommandBounds,
  rectsIntersect,
} from "../../dirty-regions";
import type { RendererBackend } from "../../types";

export type PartialRepaintResult = {
  commandsRepainted: number;
  dirtyRectPasses: number;
};

export async function repaintContentWithDirtyRegions(
  ctx: CanvasRenderingContext2D,
  commands: readonly SaraswatiRenderCommand[],
  dirtyRects: readonly DirtyRect[],
  backend: RendererBackend<CanvasRenderingContext2D>,
): Promise<PartialRepaintResult> {
  let commandsRepainted = 0;

  for (const dirty of dirtyRects) {
    // Always clear the dirty region first. A dirty rect can have no
    // intersecting commands in the *new* scene (e.g. the canvas was emptied or
    // a page switch cleared all nodes); skipping the clear there would leave
    // the previous frame's pixels ghosted on screen until a full repaint.
    ctx.save();
    ctx.beginPath();
    ctx.rect(dirty.x, dirty.y, dirty.width, dirty.height);
    ctx.clip();
    ctx.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);
    const batch = commands.filter((command) => {
      const bounds = renderCommandBounds(command);
      return bounds ? rectsIntersect(dirty, bounds) : false;
    });
    if (batch.length > 0) {
      await backend.render(ctx, batch);
      commandsRepainted += batch.length;
    }
    ctx.restore();
  }

  return {
    commandsRepainted,
    dirtyRectPasses: dirtyRects.length,
  };
}
