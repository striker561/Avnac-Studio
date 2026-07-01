import { describe, expect, it } from "vitest";
import { parseAvnacImport } from "@/lib/avnac-multi-page-document";

describe("parseAvnacImport web v2 workspace", () => {
  it("imports v2 pages as multi-page and preserves activePageId", () => {
    const raw = {
      v: 2,
      artboard: { width: 1920, height: 1080 },
      bg: { type: "solid", color: "#ffffff" },
      activePageId: "page-2",
      pages: [
        {
          id: "page-1",
          objects: [
            {
              id: "rect-1",
              type: "rect",
              x: 100,
              y: 120,
              width: 300,
              height: 200,
              rotation: 0,
              opacity: 1,
              visible: true,
              fill: { type: "solid", color: "#111111" },
              stroke: { type: "solid", color: "transparent" },
              strokeWidth: 0,
            },
          ],
        },
        {
          id: "page-2",
          objects: [
            {
              id: "text-1",
              type: "text",
              x: 40,
              y: 55,
              width: 600,
              height: 80,
              rotation: 0,
              opacity: 1,
              visible: true,
              text: "Hello",
              fill: { type: "solid", color: "#171717" },
              stroke: { type: "solid", color: "transparent" },
              strokeWidth: 0,
            },
          ],
        },
      ],
    };

    const imported = parseAvnacImport(raw);
    expect(imported).not.toBeNull();
    expect(imported?.kind).toBe("multi");
    if (!imported || imported.kind !== "multi") return;

    expect(imported.document.pages).toHaveLength(2);
    expect(imported.document.currentPage).toBe(1);

    const active = imported.document.pages[imported.document.currentPage];
    expect(active?.v).toBe(1);
    expect(active?.fabric).toBeDefined();
  });
});
