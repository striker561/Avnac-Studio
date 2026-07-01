import { describe, expect, it } from "vitest";
import {
  createIdlePointerState,
  pointerMove,
  rotateHandlePointerDown,
} from "@/lib/saraswati/editor/interaction";

describe("rotation interaction", () => {
  it("uses shortest incremental angle when crossing 0/360", () => {
    const pointerId = 1;
    const bounds = { x: -50, y: -50, width: 100, height: 100 };

    const angle10 = (10 * Math.PI) / 180;
    const angle350 = (350 * Math.PI) / 180;

    const start = rotateHandlePointerDown(
      "node-1",
      bounds,
      0,
      pointerId,
      Math.cos(angle10),
      Math.sin(angle10),
    );

    const result = pointerMove(
      start,
      pointerId,
      Math.cos(angle350),
      Math.sin(angle350),
    );

    expect(result.command).not.toBeNull();
    if (!result.command || result.command.type !== "ROTATE_NODE") {
      throw new Error("Expected ROTATE_NODE command");
    }

    // A small backward drag across 0° should stay near 360° (small negative delta),
    // not jump far forward.
    expect(result.command.rotation).toBeGreaterThan(340);
  });

  it("ignores pointerMove when pointer is idle", () => {
    const state = createIdlePointerState();
    const result = pointerMove(state, 1, 100, 100);
    expect(result.command).toBeNull();
  });
});
