import { describe, expect, it } from "vitest";
import { getNodeBounds } from "@/lib/saraswati/spatial";
import type { SaraswatiTextNode } from "@/lib/saraswati";

function makeTextNode(
  text: string,
  width: number,
  fontSize: number,
  lineHeight: number,
): SaraswatiTextNode {
  return {
    id: "text-1",
    type: "text",
    parentId: null,
    visible: true,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    text,
    width,
    fontSize,
    fontFamily: "Arial",
    fontWeight: "400",
    fontStyle: "normal",
    textAlign: "left",
    lineHeight,
    underline: false,
    color: { type: "solid", color: "#111111" },
    stroke: null,
    strokeWidth: 0,
    clipPath: null,
  };
}

describe("engine text bounds (pure, deterministic — no canvas/DOM)", () => {
  it("grows taller for wrapped text in a narrow box", () => {
    // "aa bb cc dd ee ff" at ~8px/char wraps to 3 lines in a 40px box.
    // Tight box: (3-1) * lineBox + emBox = 2*19.2 + 16 = 54.4.
    const bounds = getNodeBounds(
      makeTextNode("aa bb cc dd ee ff", 40, 16, 1.2),
    );
    expect(bounds.height).toBeGreaterThan(16);
    expect(bounds.height).toBeCloseTo(54.4, 5);
  });

  it("hugs a single line tightly (em box, no line-height leading)", () => {
    const bounds = getNodeBounds(makeTextNode("Hello", 200, 16, 1.2));
    expect(bounds.height).toBe(16);
  });

  it("is deterministic — same node yields the same bounds", () => {
    const node = makeTextNode(
      "The quick brown fox jumps over the lazy dog",
      90,
      16,
      1.2,
    );
    const a = getNodeBounds(node);
    const b = getNodeBounds(node);
    expect(a).toEqual(b);
  });
});
