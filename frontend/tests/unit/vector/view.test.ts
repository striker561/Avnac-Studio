import { describe, expect, it } from "vitest";
import {
  boardToScreen,
  clampBoardPoint,
  fitBoardView,
  fitBoundsView,
  screenPxToDoc,
  screenToBoard,
  zoomViewAt,
} from "@/lib/avnac-vector/view";
import type { VectorViewport } from "@/lib/avnac-vector/types";

const board = { width: 1200, height: 900 };

describe("unit: vector / viewport", () => {
  it("fits the board centered with the fixed board aspect", () => {
    const view = fitBoardView(board, 900, 700, 25);
    expect(view.scale).toBeGreaterThan(0);
    expect(view.scale).toBeLessThanOrEqual(1);
    expect(view.tx).toBeCloseTo((900 - 1200 * view.scale) / 2, 6);
    expect(view.ty).toBeCloseTo((700 - 900 * view.scale) / 2, 6);
    expect(board.width / board.height).toBeCloseTo(4 / 3, 9);
  });

  it("round-trips client coordinates through the view", () => {
    const view = fitBoardView(board, 900, 700, 25);
    const rect = { left: 40, top: 30 };
    const local = screenToBoard(140, 130, rect, view);
    const screen = boardToScreen(local, view);
    expect(screen[0]).toBeCloseTo(100, 9);
    expect(screen[1]).toBeCloseTo(100, 9);
  });

  it("keeps the zoom anchor fixed", () => {
    const view: VectorViewport = { scale: 1, tx: 20, ty: 10 };
    const next = zoomViewAt(view, 200, 150, 2);
    expect((200 - next.tx) / next.scale).toBeCloseTo((200 - view.tx) / view.scale, 9);
    expect((150 - next.ty) / next.scale).toBeCloseTo((150 - view.ty) / view.scale, 9);
  });

  it("converts screen pixels to document units per zoom (R6)", () => {
    expect(screenPxToDoc(8, { scale: 4, tx: 0, ty: 0 })).toBe(2);
    expect(screenPxToDoc(8, { scale: 0.5, tx: 0, ty: 0 })).toBe(16);
  });

  it("fits bounds with padding", () => {
    const view = fitBoundsView({ minX: 100, minY: 100, maxX: 300, maxY: 200 }, 800, 600, 20);
    expect(view.scale).toBeGreaterThan(1);
    const center = boardToScreen([200, 150], view);
    expect(center[0]).toBeCloseTo(400, 6);
    expect(center[1]).toBeCloseTo(300, 6);
  });

  it("clamps drawing to the board without touching geometry on resize", () => {
    expect(clampBoardPoint([-10, 1000], board)).toEqual([0, 900]);
    const left = fitBoardView(board, 600, 600, 10);
    const right = fitBoardView(board, 1400, 500, 10);
    expect(left.scale).not.toBeCloseTo(right.scale, 3);
    // The same document point is valid at every viewport; only its screen
    // position changes.
    expect(boardToScreen([600, 450], left)).not.toEqual(boardToScreen([600, 450], right));
  });
});
