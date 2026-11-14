import { describe, expect, it } from "vitest";

import { buildCanvasSummary, buildPageContext } from "@/lib/mcp/summaries";
import type { SaraswatiScene } from "@/lib/saraswati";

/**
 * Text nodes have no stored height. get_canvas_summary must report the height the
 * renderer uses, not the 0.5em estimate, or an agent laying out from the summary
 * leaves gaps: the estimate once reported 74.8px for a one-line 34px label.
 */

const textNode = {
  id: "t1",
  type: "text",
  x: 100,
  y: 470,
  width: 337,
  text: "A late-night print fair",
  fontSize: 34,
  fontFamily: "Inter",
  fontWeight: "500",
  fontStyle: "normal",
  lineHeight: 1.2,
  textAlign: "left",
  originX: "left",
  originY: "top",
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
  visible: true,
};

function scene(node: Record<string, unknown> = {}): SaraswatiScene {
  return {
    root: "root",
    artboard: { width: 1080, height: 1080, bg: { type: "solid", color: "#101014" } },
    nodes: {
      root: { id: "root", type: "root" },
      t1: { ...textNode, ...node },
    },
  } as unknown as SaraswatiScene;
}

describe("buildCanvasSummary text bounds", () => {
  it("uses measured text bounds when a measurer is supplied", () => {
    const summary = buildCanvasSummary(scene(), () => ({ width: 337, height: 34 }));
    const [node] = summary.nodes;
    expect(node).toMatchObject({ x: 100, y: 470, width: 337, height: 34 });
  });

  it("respects centered origins when using measured bounds", () => {
    const summary = buildCanvasSummary(
      scene({ originX: "center", originY: "center", x: 540, y: 540 }),
      () => ({ width: 200, height: 40 }),
    );
    const [node] = summary.nodes;
    expect(node).toMatchObject({ x: 440, y: 520, width: 200, height: 40 });
  });

  it("falls back to the estimate when no measurer is available", () => {
    const summary = buildCanvasSummary(scene());
    const [node] = summary.nodes;
    expect(node.width).toBeGreaterThan(0);
    expect(node.height).toBeGreaterThan(0);
  });

  it("ignores the measurer for rotated text (estimate stays authoritative)", () => {
    const summary = buildCanvasSummary(scene({ rotation: 30 }), () => ({
      width: 1,
      height: 1,
    }));
    const [node] = summary.nodes;
    // Rotated bounds come from the estimate, so they are not 1x1.
    expect(node.width).toBeGreaterThan(1);
  });
});

describe("buildPageContext", () => {
  const page = (objects: unknown[]) =>
    ({
      v: 1,
      artboard: { width: 1080, height: 1350 },
      bg: { type: "solid", color: "#fff" },
      fabric: { objects },
    }) as any;

  it("names the active page and lists every page", () => {
    const context = buildPageContext(
      [page([{}, {}]), page([]), page([{}])],
      ["Cover", "Test — layout", ""],
      1,
    );
    expect(context.pageCount).toBe(3);
    expect(context.page).toEqual({
      index: 1,
      number: 2,
      name: "Test — layout",
      pageCount: 3,
      width: 1080,
      height: 1350,
    });
    expect(context.pages.map((entry) => entry.nodeCount)).toEqual([2, 0, 1]);
    expect(context.pages[2]).toMatchObject({ name: "Page 3", current: false });
  });

  it("clamps a stale current index to a real page", () => {
    const context = buildPageContext([page([]), page([])], ["A", "B"], 99);
    expect(context.page?.index).toBe(1);
    expect(context.pages[1]?.current).toBe(true);
  });

  it("prefers the live node count for the active page", () => {
    // The stored page snapshot lags the live scene until autosave; the
    // summary must not report 0 nodes right after a render.
    const context = buildPageContext([page([]), page([])], ["A", "B"], 0, 7);
    expect(context.pages[0]?.nodeCount).toBe(7);
    expect(context.pages[1]?.nodeCount).toBe(0);
  });
});
