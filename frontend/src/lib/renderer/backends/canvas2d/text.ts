import type { SaraswatiRenderTextCommand } from "../../../saraswati/render/commands";
import {
  applyCanvas2DClipPaths,
  centeredCanvas2DBox,
  layoutCanvas2DTextLines,
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
  const font = [
    command.fontStyle === "italic" ? "italic" : "",
    command.fontWeight,
    `${Math.max(1, command.fontSize)}px`,
    command.fontFamily,
  ]
    .filter(Boolean)
    .join(" ");

  ctx.save();
  ctx.font = font;
  const rawLines = command.text.split(/\r?\n/);
  const maxWidth = Math.max(1, command.width);
  const lines = layoutCanvas2DTextLines(ctx, font, rawLines, maxWidth);
  const measuredWidth = Math.max(
    command.width,
    ...lines.map((line) => measureCanvas2DTextLineWidth(ctx, font, line)),
  );
  const lineHeightPx =
    Math.max(1, command.fontSize) * Math.max(1, command.lineHeight);
  const boxWidth = Math.max(1, measuredWidth);
  const boxHeight = Math.max(lineHeightPx, lines.length * lineHeightPx);
  const box = centeredCanvas2DBox(boxWidth, boxHeight);
  const align = normalizeCanvas2DTextAlign(command.textAlign);
  ctx.restore();

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
        const underlineY = y + command.fontSize;
        const startX =
          align === "center"
            ? -measured / 2
            : align === "right"
              ? drawX - measured
              : drawX;
        ctx.beginPath();
        ctx.strokeStyle = fillStyle;
        ctx.lineWidth = Math.max(1, command.fontSize * 0.06);
        ctx.moveTo(startX, underlineY);
        ctx.lineTo(startX + measured, underlineY);
        ctx.stroke();
      }
      y += lineHeightPx;
    }
  });
}
