import { describe, expect, it } from "vitest";
import { applyCommand } from "@/lib/saraswati/commands/reducer";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type { SaraswatiScene } from "@/lib/saraswati";
import { getNodeBounds } from "@/lib/saraswati/spatial";

function makeTextScene(): SaraswatiScene {
  const scene = createEmptySaraswatiScene({
    width: 800,
    height: 600,
    bg: { type: "solid", color: "#ffffff" },
  });
  scene.nodes["text-1"] = {
    id: "text-1",
    type: "text",
    parentId: scene.root,
    visible: true,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    text: "Hello world",
    width: 300,
    fontSize: 48,
    fontFamily: "Arial",
    fontWeight: "400",
    fontStyle: "normal",
    textAlign: "left",
    lineHeight: 1.2,
    underline: false,
    color: { type: "solid", color: "#111111" },
    stroke: null,
    strokeWidth: 0,
    clipPath: null,
  };
  const root = scene.nodes[scene.root];
  if (root?.type === "group") {
    scene.nodes[scene.root] = {
      ...root,
      children: [...root.children, "text-1"],
    };
  }
  return scene;
}

describe("saraswati reducer: text resize (handle-aware)", () => {
  it("scales font + width uniformly on a corner handle and rounds the font size", () => {
    const scene = makeTextScene();
    const start = getNodeBounds(scene.nodes["text-1"] as never);

    const next = applyCommand(scene, {
      type: "RESIZE_NODE",
      id: "text-1",
      handle: "se",
      x: 0,
      y: 0,
      width: start.width / 2,
      height: start.height / 2,
    });

    const text = next.nodes["text-1"];
    expect(text?.type).toBe("text");
    if (text?.type === "text") {
      // Uniform scale factor 0.5 → font 24 (rounded, integer), width 150.
      expect(text.fontSize).toBe(24);
      expect(text.width).toBe(150);
    }
  });

  it("changes only the width on an e/w handle (font unchanged)", () => {
    const scene = makeTextScene();

    const next = applyCommand(scene, {
      type: "RESIZE_NODE",
      id: "text-1",
      handle: "e",
      x: 0,
      y: 0,
      width: 150,
      height: getNodeBounds(scene.nodes["text-1"] as never).height,
    });

    const text = next.nodes["text-1"];
    if (text?.type === "text") {
      expect(text.width).toBe(150);
      expect(text.fontSize).toBe(48);
    }
  });

  it("ignores n/s handles (height is auto / content-driven)", () => {
    const scene = makeTextScene();
    const start = getNodeBounds(scene.nodes["text-1"] as never);

    const next = applyCommand(scene, {
      type: "RESIZE_NODE",
      id: "text-1",
      handle: "n",
      x: 0,
      y: 0,
      width: start.width,
      height: start.height / 2,
    });

    const text = next.nodes["text-1"];
    if (text?.type === "text") {
      // Figma-style: vertical drags don't resize auto-height text.
      expect(text.fontSize).toBe(48);
      expect(text.width).toBe(300);
    }
  });

  it("keeps font sizes integral even for awkward ratios (no blur)", () => {
    const scene = makeTextScene();

    const next = applyCommand(scene, {
      type: "RESIZE_NODE",
      id: "text-1",
      handle: "se",
      x: 0,
      y: 0,
      width: 137,
      height: 23.4,
    });

    const text = next.nodes["text-1"];
    if (text?.type === "text") {
      expect(Number.isInteger(text.fontSize)).toBe(true);
      expect(text.fontSize).toBeGreaterThanOrEqual(1);
    }
  });

  it("drives corner scale by the width ratio only (stable, no height feedback)", () => {
    const scene = makeTextScene();
    const start = getNodeBounds(scene.nodes["text-1"] as never);

    // A mostly-horizontal corner drag: width grows 1.5x, height unchanged.
    // The old width×height geometric mean bounced the font size; the width
    // ratio keeps the scale monotonic so the drag never jumps.
    const next = applyCommand(scene, {
      type: "RESIZE_NODE",
      id: "text-1",
      handle: "se",
      x: 0,
      y: 0,
      width: 450,
      height: start.height,
    });

    const text = next.nodes["text-1"];
    if (text?.type === "text") {
      expect(text.width).toBe(450);
      expect(text.fontSize).toBe(72); // 48 * (450/300), rounded
    }
  });

  it("changes only the wrap width when no handle is provided", () => {
    const scene = makeTextScene();
    const start = getNodeBounds(scene.nodes["text-1"] as never);

    const next = applyCommand(scene, {
      type: "RESIZE_NODE",
      id: "text-1",
      x: 0,
      y: 0,
      width: start.width / 2,
      height: start.height / 2,
    });

    const text = next.nodes["text-1"];
    if (text?.type === "text") {
      // No handle → programmatic (inspector/AI): only the wrap width changes;
      // font/height are auto and edited via the text toolbar.
      expect(text.width).toBe(150);
      expect(text.fontSize).toBe(48);
    }
  });
});
