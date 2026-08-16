import type { SaraswatiRenderTextCommand } from "../../../saraswati/render/commands";
import { layoutTextLines, textFontString } from "./text-layout";
import {
  applyCanvas2DClipPaths,
  centeredCanvas2DBox,
  measureCanvas2DTextLineWidth,
  normalizeCanvas2DTextAlign,
  paintCanvas2DStyle,
  withCanvas2DTransform,
} from "./shared";

export function renderCanvas2DTextCommand(
  ctx: CanvasRenderingContext2D,
  command: SaraswatiRenderTextCommand,
) {
  if (!command.text.trim()) return;
  // Single source of truth for text layout: the same wrap/measure used by the
  // dirty-region planner and selection bounds, so the painted box always
  // matches what gets cleared and selected.
  const font = textFontString({
    fontStyle: command.fontStyle,
    fontWeight: command.fontWeight,
    fontSize: command.fontSize,
    fontFamily: command.fontFamily,
  });
  const layout = layoutTextLines(
    {
      text: command.text,
      fontSize: command.fontSize,
      lineHeight: command.lineHeight,
      fontFamily: command.fontFamily,
      fontWeight: command.fontWeight,
      fontStyle: command.fontStyle,
      width: command.width,
    },
    (measureFont, text) => measureCanvas2DTextLineWidth(ctx, measureFont, text),
  );
  const { lines } = layout;
  const box = centeredCanvas2DBox(layout.boxWidth, layout.boxHeight);
  const align = normalizeCanvas2DTextAlign(command.textAlign);
  const lineHeightPx =
    Math.max(1, Math.round(command.fontSize)) * Math.max(1, command.lineHeight);

  withCanvas2DTransform(ctx, command, box.width, box.height, () => {
    applyCanvas2DClipPaths(ctx, command.clipPathStack, command.clipPath);
    ctx.font = font;
    ctx.textBaseline = "top";
    ctx.textAlign = align;
    const fillStyle = paintCanvas2DStyle(ctx, command.color, box);
    const strokeStyle = paintCanvas2DStyle(ctx, command.stroke, box);
    const drawX =
      align === "center"
        ? 0
        : align === "right"
          ? box.width / 2
          : -box.width / 2;
    let y = -box.height / 2;
    for (const line of lines) {
      if (strokeStyle && command.strokeWidth > 0) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = command.strokeWidth;
        ctx.strokeText(line, drawX, y);
      }
      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fillText(line, drawX, y);
      }
      if (command.underline && fillStyle) {
        const measured = measureCanvas2DTextLineWidth(ctx, font, line);
        const underlineY = y + Math.max(1, Math.round(command.fontSize));
        const startX =
          align === "center"
            ? -measured / 2
            : align === "right"
              ? drawX - measured
              : drawX;
        ctx.beginPath();
        ctx.strokeStyle = fillStyle;
        ctx.lineWidth = Math.max(1, Math.round(command.fontSize) * 0.06);
        ctx.moveTo(startX, underlineY);
        ctx.lineTo(startX + measured, underlineY);
        ctx.stroke();
      }
      y += lineHeightPx;
    }
  });
}
