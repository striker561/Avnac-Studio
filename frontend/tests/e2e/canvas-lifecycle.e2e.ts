import { expect, test, type Page } from "@playwright/test";

const trackedScenes = new WeakMap<Page, string>();
const cleanedScenes = new Set<string>();

async function newScene(page: Page): Promise<string> {
  const id = crypto.randomUUID();
  trackedScenes.set(page, id);
  await page.goto("/scene?id=" + id + "&w=1000&h=800", {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("scene-canvas-surface").waitFor();
  await page.waitForTimeout(1300);
  return id;
}

async function cleanupScene(page: Page, sceneId: string): Promise<void> {
  if (cleanedScenes.has(sceneId)) return;
  cleanedScenes.add(sceneId);
  try {
    await page.goto("/files", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
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

async function sceneState(page: Page) {
  return page.evaluate(() =>
    (window as unknown as { __avnacSceneEditor?: any }).__avnacSceneEditor.getState(),
  );
}

async function dispatch(page: Page, action: string, payload: Record<string, unknown>) {
  await page.evaluate(
    async ({ action: name, payload: data }) => {
      const api = (window as unknown as { __avnacSceneEditor?: any }).__avnacSceneEditor;
      if (!api) throw new Error("scene editor debug API is unavailable");
      await api.dispatchMCPAction(name, data);
    },
    { action, payload },
  );
}

test.afterEach(async ({ page }) => {
  const id = trackedScenes.get(page);
  if (!id) return;
  trackedScenes.delete(page);
  await cleanupScene(page, id);
});

test.describe("canvas lifecycle and MCP mutation reliability", () => {
  test("creates a custom page, resizes it, snapshots and restores it", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      const initial = await sceneState(page);
      expect(initial.artboard).toEqual({ width: 1000, height: 800 });
      expect(initial.pageCount).toBe(1);

      await dispatch(page, "add_page", {
        name: "Poster",
        width: 1200,
        height: 1600,
        backgroundColor: "#F4ECDD",
      });
      let state = await sceneState(page);
      expect(state.pageCount).toBe(2);
      expect(state.currentPage).toBe(1);
      expect(state.pageNames[1]).toBe("Poster");
      expect(state.artboard).toEqual({ width: 1200, height: 1600 });
      expect(state.background).toMatchObject({ type: "solid", color: "#F4ECDD" });

      await dispatch(page, "resize_artboard", {
        width: 900,
        height: 1200,
        backgroundColor: "#173B2C",
      });
      state = await sceneState(page);
      expect(state.artboard).toEqual({ width: 900, height: 1200 });
      expect(state.background).toMatchObject({ type: "solid", color: "#173B2C" });

      await dispatch(page, "create_snapshot", { token: "e2e-snapshot" });
      await dispatch(page, "resize_artboard", { width: 600, height: 600 });
      state = await sceneState(page);
      expect(state.artboard).toEqual({ width: 600, height: 600 });

      await dispatch(page, "restore_snapshot", { token: "e2e-snapshot" });
      state = await sceneState(page);
      expect(state.artboard).toEqual({ width: 900, height: 1200 });
      expect(state.background).toMatchObject({ type: "solid", color: "#173B2C" });
      expect(state.pageNames[1]).toBe("Poster");
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("modifies a unique name and keeps object identity", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      await dispatch(page, "render_elements", {
        elements: [
          {
            type: "rect",
            id: "card",
            name: "Card",
            left: 100,
            top: 80,
            width: 200,
            height: 120,
            fill: "#A9B79D",
          },
        ],
      });
      let node = await page.evaluate(() =>
        (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor
          .getScene()
          .nodes.card,
      );
      expect(node.width).toBe(200);

      await dispatch(page, "modify_elements", {
        modifications: [
          { name: "Card", width: 320, height: 180, fill: "#C76C4B" },
        ],
      });
      node = await page.evaluate(() =>
        (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor
          .getScene()
          .nodes.card,
      );
      expect(node.width).toBe(320);
      expect(node.height).toBe(180);
      expect(node.fill).toMatchObject({ color: "#C76C4B" });

      await dispatch(page, "modify_elements", {
        modifications: [{ objectId: "card", name: "Headline Card" }],
      });
      node = await page.evaluate(() =>
        (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor
          .getScene()
          .nodes.card,
      );
      expect(node.name).toBe("Headline Card");

      const state = await sceneState(page);
      expect(state.revision).toBeGreaterThan(1);
      expect(state.nodeCount).toBe(1);
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("returns revision, before/after modify state, validation and SVG export", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      await dispatch(page, "render_elements", {
        elements: [
          {
            type: "rect",
            id: "card",
            name: "Card",
            left: 100,
            top: 80,
            width: 200,
            height: 120,
            fill: "#A9B79D",
          },
        ],
      });

      const response = async () =>
        page.evaluate(() =>
          (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor.getLastMCPResponse(),
        );

      await dispatch(page, "get_canvas_summary", {});
      const summary = await response();
      expect(typeof summary.clientId).toBe("string");
      expect(summary.revision).toBeGreaterThan(0);
      expect(summary.page).toMatchObject({ width: 1000, height: 800 });
      expect(summary.pages[0].nodeCount).toBe(1);
      expect(summary.pageCount).toBe(1);

      await dispatch(page, "modify_elements", {
        page: 2,
        modifications: [{ name: "Card", width: 300 }],
      });
      const guard = await response();
      expect(String(guard.error)).toContain("Page 2");

      await dispatch(page, "modify_elements", {
        modifications: [{ name: "Card", width: 320 }],
      });
      const modified = await response();
      expect(modified.modifiedCount).toBe(1);
      expect(modified.modified[0].before.width).toBe(200);
      expect(modified.modified[0].after.width).toBe(320);
      expect(modified.modified[0].changedFields).toContain("layout");

      await dispatch(page, "validate_canvas", {});
      const validation = await response();
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(typeof validation.errors).toBe("number");

      await dispatch(page, "get_font_list", { families: ["Inter"] });
      const fonts = await response();
      expect(fonts.loaded).toHaveProperty("Inter");

      await dispatch(page, "export_svg", { scope: "page" });
      const pageSvg = await response();
      expect(pageSvg.svg).toContain("<svg");
      expect(pageSvg.width).toBe(1000);
      expect(pageSvg.height).toBe(800);

      await dispatch(page, "export_svg", { scope: "selection", objectIds: ["card"] });
      const selectionSvg = await response();
      expect(selectionSvg.svg).toContain("<svg");
      expect(selectionSvg.svg).toContain("#A9B79D");
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("places, updates and deletes a vector plate through the MCP handler", async ({ page }) => {
    const sceneId = await newScene(page);
    const svgA =
      "data:image/svg+xml;base64," +
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#173B2C"/></svg>',
      ).toString("base64");
    const svgB =
      "data:image/svg+xml;base64," +
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><circle cx="100" cy="50" r="40" fill="#C76C4B"/></svg>',
      ).toString("base64");
    try {
      await dispatch(page, "vector_draw", {
        objectId: "vec-e2e",
        name: "Vector plate",
        src: svgA,
        width: 200,
        height: 100,
        x: 20,
        y: 30,
      });
      let node = await page.evaluate(() =>
        (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor
          .getScene()
          .nodes["vec-e2e"],
      );
      expect(node).toMatchObject({ type: "image", name: "Vector plate" });
      expect(node.src).toBe(svgA);

      await dispatch(page, "vector_update", {
        objectId: "vec-e2e",
        src: svgB,
        name: "Updated plate",
      });
      node = await page.evaluate(() =>
        (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor
          .getScene()
          .nodes["vec-e2e"],
      );
      expect(node.src).toBe(svgB);
      expect(node.name).toBe("Updated plate");

      await dispatch(page, "vector_delete", { objectId: "vec-e2e" });
      const exists = await page.evaluate(() =>
        Boolean(
          (window as unknown as { __avnacSceneEditor: any }).__avnacSceneEditor
            .getScene()
            .nodes["vec-e2e"],
        ),
      );
      expect(exists).toBe(false);
    } finally {
      await cleanupScene(page, sceneId);
    }
  });

  test("adds and undoes a page with the editor keyboard path", async ({ page }) => {
    const sceneId = await newScene(page);
    try {
      const before = await sceneState(page);
      expect(before.pageCount).toBe(1);

      await page.keyboard.press("Control+n");
      await page.waitForTimeout(350);
      const added = await sceneState(page);
      expect(added.pageCount).toBe(2);
      expect(added.currentPage).toBe(1);

      await page.keyboard.press("Control+z");
      await page.waitForTimeout(350);
      const undone = await sceneState(page);
      expect(undone.pageCount).toBe(1);
      expect(undone.currentPage).toBe(0);

      await page.keyboard.press("Control+Shift+z");
      await page.waitForTimeout(350);
      const redone = await sceneState(page);
      expect(redone.pageCount).toBe(2);
      expect(redone.currentPage).toBe(1);
    } finally {
      await cleanupScene(page, sceneId);
    }
  });
});
