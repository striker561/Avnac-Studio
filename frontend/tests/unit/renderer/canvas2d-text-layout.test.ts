import { describe, expect, it, vi } from "vitest";
import {
  layoutCanvas2DTextLines,
  measureCanvas2DTextLineWidth,
} from "@/lib/renderer/backends/canvas2d/shared";

function createMockContext(measureWidth = (text: string) => text.length * 8) {
  return {
    font: "",
    measureText: vi.fn((text: string) => ({ width: measureWidth(text) })),
  } as unknown as CanvasRenderingContext2D;
}

describe("unit: canvas2d / text layout cache", () => {
  it("reuses cached line widths for identical font and text", () => {
    const ctx = createMockContext();
    const font = "16px sans-serif";
    const first = measureCanvas2DTextLineWidth(ctx, font, "Hello world");
    const second = measureCanvas2DTextLineWidth(ctx, font, "Hello world");
    expect(second).toBe(first);
    expect(ctx.measureText).toHaveBeenCalledTimes(1);
  });

  it("reuses cached wrapped lines for identical layout input", () => {
    const ctx = createMockContext();
    const font = "16px sans-serif";
    const lines = ["The quick brown fox jumps over the lazy dog"];
    const first = layoutCanvas2DTextLines(ctx, font, lines, 120);
    const second = layoutCanvas2DTextLines(ctx, font, lines, 120);
    expect(second).toBe(first);
  });
});
