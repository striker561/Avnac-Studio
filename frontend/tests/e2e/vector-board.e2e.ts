import { expect, test, type Page } from "@playwright/test";

type BoardDoc = {
  v: number;
  size: { width: number; height: number };
  layers: Array<{
    id: string;
    name: string;
    visible: boolean;
    strokes: Array<{
      id: string;
      kind: string;
      points: Array<[number, number]>;
      penAnchors?: Array<{
        x: number;
        y: number;
        inX?: number;
        inY?: number;
        outX?: number;
        outY?: number;
        type: string;
      }>;
      penClosed?: boolean;
      stroke: string;
      strokeWidth: number;
      fill: string;
      fillRule: string;
      lineJoin: string;
    }>;
  }>;
};

type BoardView = { scale: number; tx: number; ty: number };
type Point = { x: number; y: number };

const trackedScenes = new WeakMap<Page, string>();
const cleanedScenes = new Set<string>();

async function newScene(page: Page): Promise<string> {
  const id = crypto.randomUUID();
  trackedScenes.set(page, id);
  await page.goto(`/scene?id=${id}&w=1600&h=1200`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("scene-canvas-surface").waitFor();
  await page.waitForTimeout(1400);
  return id;
}

async function cleanupScene(page: Page, sceneId: string): Promise<void> {
  if (cleanedScenes.has(sceneId)) return;
  cleanedScenes.add(sceneId);
  try {
    await page.goto("/files", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.evaluate(async (id) => {
      const go = (window as unknown as { go?: any }).go;
      if (go?.avnacio?.IOManager?.DeleteDocument) {
        await go.avnacio.IOManager.DeleteDocument(id);
      }
    }, sceneId);
  } catch {
    /* cleanup must never fail the test */
  }
}

async function openVectorBoard(page: Page) {
  await page.getByRole("button", { name: "Vectors", exact: true }).click();
  await page.getByText("New vector board", { exact: true }).click();
  const workspace = page.getByTestId("vector-board-workspace");
  await workspace.waitFor();
  await page.waitForTimeout(500);
  const canvas = page.getByTestId("vector-board-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Vector canvas has no layout box");
  return { workspace, canvas, box };
}

async function boardView(page: Page): Promise<BoardView> {
  return page.evaluate(
    () => (window as unknown as { __avnacVectorBoard: any }).__avnacVectorBoard.getView(),
  );
}

async function doc(page: Page): Promise<BoardDoc> {
  return page.evaluate(
    () => (window as unknown as { __avnacVectorBoard: any }).__avnacVectorBoard.getDoc(),
  );
}

async function penEdit(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __avnacVectorBoard: any }).__avnacVectorBoard.getPenEdit(),
  );
}

async function draft(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __avnacVectorBoard: any }).__avnacVectorBoard.getDraft(),
  );
}

async function toScreen(page: Page, x: number, y: number): Promise<Point> {
  const box = await page.getByTestId("vector-board-canvas").boundingBox();
  if (!box) throw new Error("Vector canvas has no layout box");
  const view = await boardView(page);
  return { x: box.x + view.tx + x * view.scale, y: box.y + view.ty + y * view.scale };
}

async function dragOnBoard(
  page: Page,
  from: [number, number],
  to: [number, number],
  options: { shift?: boolean; steps?: number } = {},
): Promise<void> {
  const a = await toScreen(page, ...from);
  const b = await toScreen(page, ...to);
  if (options.shift) await page.keyboard.down("Shift");
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: options.steps ?? 10 });
  await page.mouse.up();
  if (options.shift) await page.keyboard.up("Shift");
}

async function clickOnBoard(page: Page, x: number, y: number): Promise<void> {
  const p = await toScreen(page, x, y);
  await page.mouse.click(p.x, p.y);
}

function makePerfDoc(count: number): BoardDoc {
  const strokes = Array.from({ length: count }, (_, index) => {
    const x = 8 + (index % 60) * 19;
    const y = 8 + Math.floor(index / 60) * 18;
    return {
      id: `s${index}`,
      kind: "pen",
      points: [] as Array<[number, number]>,
      penAnchors: [
        { x, y, outX: x + 6, outY: y + 3, type: "cusp" },
        {
          x: x + 9,
          y: y + 9,
          inX: x + 5,
          inY: y + 5,
          outX: x + 13,
          outY: y + 12,
          type: "smooth",
        },
        { x: x + 17, y: y + 4, inX: x + 13, inY: y + 10, type: "cusp" },
      ],
      stroke: "#111111",
      strokeWidth: 1,
      fill: index % 2 === 0 ? "#94a3b8" : "",
      fillRule: "nonzero",
      lineJoin: "round",
    };
  });
  return {
    v: 3,
    size: { width: 1200, height: 900 },
    layers: [{ id: "layer-1", name: "Layer 1", visible: true, strokes }],
  } as unknown as BoardDoc;
}

async function seedBoard(
  page: Page,
  sceneId: string,
  boardId: string,
  name: string,
  seeded: BoardDoc,
): Promise<void> {
  await page.evaluate(
    async ({ sceneId: id, boardId: board, name: boardName, seeded: boardDoc }) => {
      const io = (window as unknown as { go?: any }).go?.avnacio?.IOManager;
      if (!io) throw new Error("Wails IOManager is not available");
      await io.WriteVectorBoards(
        id,
        JSON.stringify([{ id: board, name: boardName, createdAt: Date.now() }]),
      );
      await io.WriteVectorBoardDocs(id, JSON.stringify({ [board]: boardDoc }));
    },
    { sceneId, boardId, name, seeded },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("scene-canvas-surface").waitFor();
  await page.waitForTimeout(2200);
}

async function openSeededBoard(page: Page, name: string) {
  await page.getByRole("button", { name: "Vectors", exact: true }).click();
  await page.waitForTimeout(350);
  await page
    .locator('[aria-label="Vector boards"]')
    .getByRole("button")
    .filter({ hasText: name })
    .click();
  const workspace = page.getByTestId("vector-board-workspace");
  await workspace.waitFor();
  await page.waitForTimeout(600);
  const canvas = page.getByTestId("vector-board-canvas");
  return { workspace, canvas };
}

async function historyStats(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __avnacVectorBoard: any }).__avnacVectorBoard.getHistoryStats(),
  );
}

async function firstStrokeWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const api = (window as unknown as { __avnacVectorBoard: any }).__avnacVectorBoard;
    return api.getDoc().layers[0].strokes[0].strokeWidth as number;
  });
}

async function freehandSquiggle(
  page: Page,
  startX: number,
  startY: number,
  width: number,
  amplitude: number,
  samples = 70,
): Promise<void> {
  const box = await page.getByTestId("vector-board-canvas").boundingBox();
  if (!box) throw new Error("Vector canvas has no layout box");
  await page.mouse.move(box.x + startX, box.y + startY);
  await page.mouse.down();
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    await page.mouse.move(
      box.x + startX + t * width,
      box.y + startY + Math.sin(t * Math.PI * 5) * amplitude,
    );
  }
  await page.mouse.up();
}

test.afterEach(async ({ page }) => {
  const id = trackedScenes.get(page);
  if (!id) return;
  trackedScenes.delete(page);
  await cleanupScene(page, id);
});

test.describe("vector board / drawing tools", () => {
  test("draws freehand, rectangle, ellipse and pen paths", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      const { canvas } = await openVectorBoard(page);

      await freehandSquiggle(page, 140, 320, 520, 90);
      await page.waitForTimeout(300);
      expect(await canvas.getAttribute("data-vector-strokes")).toBe("1");
      const fitNodes = Number(await canvas.getAttribute("data-vector-last-fit-nodes"));
      const fitSamples = Number(await canvas.getAttribute("data-vector-last-fit-samples"));
      expect(fitNodes).toBeGreaterThan(1);
      expect(fitNodes).toBeLessThan(25);
      expect(fitSamples).toBeGreaterThan(40);

      await page.keyboard.press("r");
      await dragOnBoard(page, [200, 180], [500, 340]);
      await page.waitForTimeout(250);

      await page.keyboard.press("o");
      await dragOnBoard(page, [700, 200], [880, 410], { shift: true });
      await page.waitForTimeout(250);

      await page.keyboard.press("p");
      await clickOnBoard(page, 300, 600);
      await clickOnBoard(page, 520, 500);
      await clickOnBoard(page, 760, 640);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(350);

      const document = await doc(page);
      const strokes = document.layers.flatMap((layer) => layer.strokes);
      expect(strokes).toHaveLength(4);
      expect(strokes[0]!.kind).toBe("pen");
      expect(strokes[0]!.penAnchors!.length).toBeLessThan(25);
      expect(strokes[1]!.kind).toBe("rect");
      expect(strokes[1]!.fill).toBeTruthy();
      expect(strokes[1]!.strokeWidth).toBeGreaterThan(0);
      expect(strokes[2]!.kind).toBe("ellipse");
      const ellipseWidth = Math.abs(strokes[2]!.points[1]![0] - strokes[2]!.points[0]![0]);
      const ellipseHeight = Math.abs(strokes[2]!.points[1]![1] - strokes[2]!.points[0]![1]);
      expect(Math.abs(ellipseWidth - ellipseHeight)).toBeLessThan(1.5);
      expect(strokes[3]!.kind).toBe("pen");
      expect(strokes[3]!.penAnchors).toHaveLength(3);
      expect(strokes[3]!.penClosed).toBeFalsy();

      // Independent paint slots + line join.
      await page.keyboard.press("v");
      await clickOnBoard(page, 350, 260);
      await page.getByLabel("Line join").selectOption("miter");
      await expect
        .poll(async () => (await doc(page)).layers.flatMap((l) => l.strokes)[1]!.lineJoin)
        .toBe("miter");
      await page.getByRole("button", { name: /Fill rule:/ }).click();
      await expect
        .poll(async () => (await doc(page)).layers.flatMap((l) => l.strokes)[1]!.fillRule)
        .toBe("evenodd");

      // Clicking the first anchor closes the path and applies the fill slot.
      await page.keyboard.press("p");
      await clickOnBoard(page, 300, 700);
      await clickOnBoard(page, 520, 700);
      await clickOnBoard(page, 420, 800);
      await clickOnBoard(page, 300, 700);
      await page.waitForTimeout(350);
      const closed = (await doc(page)).layers.flatMap((l) => l.strokes).at(-1)!;
      expect(closed.penClosed).toBe(true);
      expect(closed.fill).toBeTruthy();
      expect(closed.penAnchors).toHaveLength(3);

      // The fixed document size is independent of the panel viewport.
      const beforeResize = await doc(page);
      const viewBefore = await boardView(page);
      await page.setViewportSize({ width: 1180, height: 820 });
      await page.waitForTimeout(600);
      const afterResize = await doc(page);
      const viewAfter = await boardView(page);
      expect(afterResize.size).toEqual(beforeResize.size);
      expect(viewAfter.scale).not.toBeCloseTo(viewBefore.scale, 3);
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("pen node editing enforces node types, refits and inserts", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      const { canvas } = await openVectorBoard(page);

      // Three curved nodes created with press-drag.
      await page.keyboard.press("p");
      for (const [x, y, hx, hy] of [
        [260, 560, 100, -130],
        [520, 360, 100, 100],
        [820, 560, -100, -100],
      ] as const) {
        const anchor = await toScreen(page, x, y);
        const handle = { x: anchor.x + hx, y: anchor.y + hy };
        await page.mouse.move(anchor.x, anchor.y);
        await page.mouse.down();
        await page.mouse.move(handle.x, handle.y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(100);
      }
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      let document = await doc(page);
      let stored = document.layers.flatMap((l) => l.strokes)[0]!;
      expect(stored.penAnchors).toHaveLength(3);
      expect(stored.penAnchors!.every((a) => a.type === "symmetric")).toBe(true);
      expect(stored.penAnchors![0]!.outX).toBeGreaterThan(stored.penAnchors![0]!.x);

      // Backspace removes the last draft node without touching the board.
      await page.keyboard.press("p");
      await clickOnBoard(page, 900, 700);
      await clickOnBoard(page, 1000, 720);
      expect((await draft(page)).anchors).toHaveLength(2);
      await page.keyboard.press("Backspace");
      await expect.poll(async () => (await draft(page))?.anchors.length ?? 0).toBe(1);
      await page.keyboard.press("Escape");
      await expect.poll(async () => (await draft(page)) === null).toBe(true);
      expect(await canvas.getAttribute("data-vector-node-edit")).toBe("false");
      expect(await page.getByTestId("vector-board-workspace").count()).toBe(1);

      // Enter node editing on the middle of the first segment.
      await page.keyboard.press("v");
      const mid = await page.evaluate(() => {
        const api = (window as unknown as { __avnacVectorBoard: any }).__avnacVectorBoard;
        const anchors = api.getDoc().layers.flatMap((l: any) => l.strokes)[0].penAnchors;
        const a = anchors[0];
        const b = anchors[1];
        const p0 = [a.x, a.y];
        const p1 = [a.outX, a.outY];
        const p2 = [b.inX, b.inY];
        const p3 = [b.x, b.y];
        const t = 0.5;
        const u = 1 - t;
        return [
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ];
      });
      const midScreen = await toScreen(page, mid[0], mid[1]);
      await page.mouse.dblclick(midScreen.x, midScreen.y);
      await expect.poll(async () => (await penEdit(page)) !== null).toBe(true);
      expect(await canvas.getAttribute("data-vector-node-edit")).toBe("true");

      // Select the first node before changing its type.
      let edited = await penEdit(page);
      const firstNode = await toScreen(page, edited.anchors[0].x, edited.anchors[0].y);
      await page.mouse.click(firstNode.x, firstNode.y);
      await page.waitForTimeout(150);

      // Smooth: collinear handles, independent lengths.
      await page.keyboard.press("s");
      await page.waitForTimeout(150);
      edited = await penEdit(page);
      expect(edited.anchors[0].type).toBe("smooth");
      const out = await toScreen(page, edited.anchors[0].outX, edited.anchors[0].outY);
      await page.mouse.move(out.x, out.y);
      await page.mouse.down();
      await page.mouse.move(out.x + 70, out.y + 30, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      edited = await penEdit(page);
      const first = edited.anchors[0];
      const vin = [first.inX - first.x, first.inY - first.y];
      const vout = [first.outX - first.x, first.outY - first.y];
      expect(Math.abs(vin[0] * vout[1] - vin[1] * vout[0])).toBeLessThan(0.01);
      expect(Math.hypot(...(vin as [number, number]))).not.toBeCloseTo(
        Math.hypot(...(vout as [number, number])),
        3,
      );

      // Cusp: the opposite handle must not move.
      await page.keyboard.press("c");
      await page.waitForTimeout(150);
      edited = await penEdit(page);
      const inBefore = [edited.anchors[0].inX, edited.anchors[0].inY];
      const cuspOut = await toScreen(page, edited.anchors[0].outX, edited.anchors[0].outY);
      await page.mouse.move(cuspOut.x, cuspOut.y);
      await page.mouse.down();
      await page.mouse.move(cuspOut.x - 60, cuspOut.y + 20, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      edited = await penEdit(page);
      expect(edited.anchors[0].type).toBe("cusp");
      expect([edited.anchors[0].inX, edited.anchors[0].inY]).toEqual(inBefore);

      // Corner strips handles.
      await page.keyboard.press("k");
      await page.waitForTimeout(150);
      edited = await penEdit(page);
      expect(edited.anchors[0].type).toBe("corner");
      expect(edited.anchors[0].inX).toBeUndefined();
      expect(edited.anchors[0].outX).toBeUndefined();

      // Phase B: a two-anchor arch. Inserting a node and deleting it again
      // must refit back to a single cubic instead of destroying the arch.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      await page.keyboard.press("p");
      let start = await toScreen(page, 260, 720);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 100, start.y - 100, { steps: 8 });
      await page.mouse.up();
      start = await toScreen(page, 820, 720);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 100, start.y + 100, { steps: 8 });
      await page.mouse.up();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);

      await page.keyboard.press("v");
      const archMid = await page.evaluate(() => {
        const api = (window as unknown as { __avnacVectorBoard: any }).__avnacVectorBoard;
        const strokes = api.getDoc().layers.flatMap((l: any) => l.strokes);
        const anchors = strokes[strokes.length - 1].penAnchors;
        const a = anchors[0];
        const b = anchors[1];
        const p0 = [a.x, a.y];
        const p1 = [a.outX, a.outY];
        const p2 = [b.inX, b.inY];
        const p3 = [b.x, b.y];
        const t = 0.5;
        const u = 1 - t;
        return [
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ];
      });
      const archScreen = await toScreen(page, archMid[0], archMid[1]);
      await page.mouse.dblclick(archScreen.x, archScreen.y);
      await expect.poll(async () => (await penEdit(page)) !== null).toBe(true);
      await page.mouse.click(archScreen.x, archScreen.y);
      await page.waitForTimeout(300);
      edited = await penEdit(page);
      expect(edited.anchors).toHaveLength(3);
      expect(edited.anchors[1].type).not.toBe("corner");

      const inserted = await toScreen(page, edited.anchors[1].x, edited.anchors[1].y);
      await page.keyboard.down("Alt");
      await page.mouse.click(inserted.x, inserted.y);
      await page.keyboard.up("Alt");
      await page.waitForTimeout(300);
      edited = await penEdit(page);
      expect(edited.anchors).toHaveLength(2);
      expect(edited.anchors[0].outX).not.toBeUndefined();
      expect(edited.anchors[1].inX).not.toBeUndefined();

      // Escape leaves node edit; a second clears selection; the third closes.
      await page.keyboard.press("Escape");
      await expect.poll(async () => (await penEdit(page)) === null).toBe(true);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await expect.poll(async () => page.getByTestId("vector-board-workspace").count()).toBe(0);
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("undo, layers, zoom and pan", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      const { canvas } = await openVectorBoard(page);

      await freehandSquiggle(page, 160, 280, 360, 70);
      await page.waitForTimeout(250);
      await page.keyboard.press("r");
      await dragOnBoard(page, [650, 260], [900, 420]);
      await page.waitForTimeout(300);
      expect(await canvas.getAttribute("data-vector-strokes")).toBe("2");

      await page.keyboard.press("Control+z");
      await expect.poll(async () => canvas.getAttribute("data-vector-strokes")).toBe("1");
      await page.keyboard.press("Control+Shift+z");
      await expect.poll(async () => canvas.getAttribute("data-vector-strokes")).toBe("2");

      await page.getByRole("button", { name: "Add layer", exact: true }).click();
      await expect.poll(async () => (await doc(page)).layers.length).toBe(2);
      await page.getByRole("button", { name: "Hide Layer 2" }).click();
      await expect.poll(async () => (await doc(page)).layers[1]!.visible).toBe(false);
      await page.getByRole("button", { name: "Show Layer 2" }).click();
      await page.getByRole("button", { name: "Delete Layer 2" }).click();
      await expect.poll(async () => (await doc(page)).layers.length).toBe(1);

      const zoomBefore = Number(await canvas.getAttribute("data-vector-zoom"));
      await page.getByRole("button", { name: "Zoom in" }).click();
      await expect
        .poll(async () => Number(await canvas.getAttribute("data-vector-zoom")))
        .toBeGreaterThan(zoomBefore);
      await page.getByRole("button", { name: "Reset zoom to 100%" }).click();
      await expect.poll(async () => canvas.getAttribute("data-vector-zoom")).toBe("100");

      const panBefore = await boardView(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error("missing canvas box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down({ button: "middle" });
      await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 40, {
        steps: 8,
      });
      await page.mouse.up({ button: "middle" });
      await page.waitForTimeout(250);
      const panAfter = await boardView(page);
      expect(panAfter.tx).not.toBeCloseTo(panBefore.tx, 2);
      expect(panAfter.ty).not.toBeCloseTo(panBefore.ty, 2);
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("saves and reloads the board with every anchor intact", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      const { workspace } = await openVectorBoard(page);
      await freehandSquiggle(page, 150, 300, 420, 80);
      await page.waitForTimeout(250);
      await page.keyboard.press("r");
      await dragOnBoard(page, [650, 240], [920, 430]);
      await page.waitForTimeout(300);

      const before = await doc(page);
      expect(before.v).toBe(3);
      await workspace.getByRole("button", { name: "Save", exact: true }).click();
      await page.waitForTimeout(1600);

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2200);
      await page.getByRole("button", { name: "Vectors", exact: true }).click();
      await page.waitForTimeout(400);
      await page
        .locator('[aria-label="Vector boards"]')
        .getByRole("button")
        .filter({ hasText: "Vector board 1" })
        .click();
      await page.getByTestId("vector-board-workspace").waitFor();
      await page.waitForTimeout(500);

      const after = await doc(page);
      expect(after.v).toBe(3);
      expect(after.size).toEqual(before.size);
      expect(after.layers).toHaveLength(before.layers.length);
      expect(after.layers[0]!.strokes).toHaveLength(2);
      for (let i = 0; i < before.layers[0]!.strokes.length; i += 1) {
        const a = before.layers[0]!.strokes[i]!;
        const b = after.layers[0]!.strokes[i]!;
        expect(b.kind).toBe(a.kind);
        expect(b.penAnchors ?? b.points).toEqual(a.penAnchors ?? a.points);
        expect(b.strokeWidth).toBe(a.strokeWidth);
        expect(b.fill).toBe(a.fill);
      }
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("places and drops boards on the scene as real SVG paths", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      const { workspace } = await openVectorBoard(page);
      const boardId = await workspace.getAttribute("data-board-id");
      expect(boardId).toBeTruthy();

      await page.keyboard.press("r");
      await dragOnBoard(page, [220, 180], [640, 470]);
      await page.waitForTimeout(300);

      await page.getByRole("button", { name: "More save options" }).click();
      await page.getByRole("menuitem", { name: "Save and place on canvas" }).click();
      await page.waitForTimeout(1600);
      expect(await page.getByTestId("vector-board-workspace").count()).toBe(0);

      const sceneImages = await page.evaluate(() => {
        const scene = (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor.getScene();
        return Object.values(scene.nodes)
          .filter((node: any) => node.type === "image")
          .map((node: any) => ({ src: String(node.src), width: node.width, height: node.height }));
      });
      expect(sceneImages).toHaveLength(1);
      expect(sceneImages[0]!.src.startsWith("data:image/svg+xml")).toBe(true);
      expect(sceneImages[0]!.width).toBe(640);
      expect(sceneImages[0]!.height).toBe(480);

      const svg = await page.evaluate(() =>
        (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor.buildSelectionSvg(),
      );
      expect(svg).toContain("<path");
      expect(svg).not.toContain("<image");
      expect(svg).toContain('fill="#94a3b8"');

      // Drop the same board again through the panel's drag payload.
      if ((await page.locator('[aria-label="Vector boards"]').count()) === 0) {
        await page.getByRole("button", { name: "Vectors", exact: true }).click();
      }
      await page.waitForTimeout(300);
      const dispatched = await page.evaluate((id) => {
        const surface = document.querySelector('[data-testid="scene-canvas-surface"]');
        const preview = document.querySelector('[draggable="true"]');
        if (!surface || !preview) return false;
        const dataTransfer = new DataTransfer();
        dataTransfer.setData("application/avnac-vector-board", id);
        preview.dispatchEvent(
          new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
        );
        const rect = surface.getBoundingClientRect();
        const options = {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        };
        surface.dispatchEvent(new DragEvent("dragover", options));
        surface.dispatchEvent(new DragEvent("drop", options));
        return true;
      }, boardId!);
      expect(dispatched).toBe(true);
      await page.waitForTimeout(2200);
      const afterDrop = await page.evaluate(() => {
        const scene = (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor.getScene();
        return Object.values(scene.nodes)
          .filter((node: any) => node.type === "image")
          .map((node: any) => ({ src: String(node.src), width: node.width, height: node.height }));
      });
      expect(afterDrop).toHaveLength(2);
      expect(afterDrop[1]!.src.startsWith("data:image/svg+xml")).toBe(true);
      expect(afterDrop[1]!.width).toBe(720);
      expect(afterDrop[1]!.height).toBe(540);
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("coalesces paint edits and clears a large board in one step", async ({ page }) => {
    const sceneId = await newScene(page);
    const boardId = crypto.randomUUID();
    await seedBoard(page, sceneId, boardId, "Perf Board", makePerfDoc(300));
    const { canvas } = await openSeededBoard(page, "Perf Board");

    await canvas.focus();
    await page.keyboard.press("Control+a");
    await expect.poll(async () => canvas.getAttribute("data-vector-selection")).toBe("300");
    const beforeHistory = await historyStats(page);
    expect(await firstStrokeWidth(page)).toBe(1);

    await page.getByRole("button", { name: /Outline stroke/ }).click();
    await page.waitForTimeout(250);
    await page.evaluate(async () => {
      const el = document.querySelector('input[aria-label="Stroke width"]') as HTMLInputElement;
      if (!el) throw new Error("stroke width slider missing");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      const setValue = (value: number) => {
        setter.call(el, String(value));
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      for (let value = 2; value <= 20; value += 1) {
        setValue(value);
        await new Promise((resolve) => setTimeout(resolve, 8));
      }
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    });

    // Twenty ticks must be one undo transaction, not twenty.
    await expect
      .poll(async () => (await historyStats(page)).entries)
      .toBe(beforeHistory.entries + 1);
    expect(await firstStrokeWidth(page)).toBe(20);

    await canvas.focus();
    await page.keyboard.press("Control+z");
    await expect.poll(async () => firstStrokeWidth(page)).toBe(1);

    // Clearing a 300-stroke board must not wait on serialization or a repaint
    // of every stroke, and must collapse to one undo entry.
    const clearStarted = Date.now();
    await page.getByRole("button", { name: "Clear all", exact: true }).click();
    await expect.poll(async () => canvas.getAttribute("data-vector-strokes")).toBe("0");
    expect(Date.now() - clearStarted).toBeLessThan(1500);

    await canvas.focus();
    await page.keyboard.press("Control+z");
    await expect.poll(async () => canvas.getAttribute("data-vector-strokes")).toBe("300");
  });
});