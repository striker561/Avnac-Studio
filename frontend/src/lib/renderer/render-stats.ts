export type RenderPaintStats = {
  ms: number;
  commands: number;
  duplicateCommands: number;
  repaintMode: "full" | "partial" | "skipped";
  dirtyRects: number;
  dirtyCoveragePct: number;
  commandsRepainted: number;
};

export const EMPTY_RENDER_PAINT_STATS: RenderPaintStats = {
  ms: 0,
  commands: 0,
  duplicateCommands: 0,
  repaintMode: "full",
  dirtyRects: 0,
  dirtyCoveragePct: 0,
  commandsRepainted: 0,
};

export function countDuplicateRenderCommands(
  commands: readonly {
    type: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }[],
): number {
  const signatureCount = new Map<string, number>();
  for (const command of commands) {
    const signature = `${command.type}:${Math.round(command.x)}:${Math.round(command.y)}:${command.width !== undefined ? Math.round(command.width) : 0}:${command.height !== undefined ? Math.round(command.height) : 0}`;
    signatureCount.set(signature, (signatureCount.get(signature) ?? 0) + 1);
  }
  let duplicateCommands = 0;
  for (const count of signatureCount.values()) {
    if (count > 1) duplicateCommands += count - 1;
  }
  return duplicateCommands;
}
