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
    const batch = commands.filter((command) => {
      const bounds = renderCommandBounds(command);
      return bounds ? rectsIntersect(dirty, bounds) : false;
    });
    if (batch.length === 0) continue;

    ctx.save();
    ctx.beginPath();
    ctx.rect(dirty.x, dirty.y, dirty.width, dirty.height);
    ctx.clip();
    ctx.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);
    await backend.render(ctx, batch);
    ctx.restore();
    commandsRepainted += batch.length;
  }

  return {
    commandsRepainted,
    dirtyRectPasses: dirtyRects.length,
  };
}
