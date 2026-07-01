import { describe, expect, it } from "vitest";
import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import { mergeStoredPages } from "@/lib/avnac-multi-page-storage";
import { buildMultiPageDocument } from "@/lib/avnac-multi-page-document";

function makeDoc(page: number): AvnacDocumentV1 {
  return {
    v: 1,
    artboard: { width: 1000, height: 1000 },
    bg: { type: "solid", color: "#ffffff" },
    fabric: {
      objects: [
        {
          type: "text",
          text: `page-${page}`,
          left: 100,
          top: 100,
          width: 10,
          height: 10,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          originX: "left",
          originY: "top",
          visible: true,
          opacity: 1,
          fontSize: 16,
        },
      ],
    },
  };
}

describe("mergeStoredPages", () => {
  it("does not overwrite stored page content with stale IDB doc", () => {
    const page1 = makeDoc(1);
    const page2 = makeDoc(2);
    const page3 = makeDoc(3);

    const stored = buildMultiPageDocument([page1, page2, page3], 2);
    const staleIdbDoc = makeDoc(3);

    const merged = mergeStoredPages(stored, staleIdbDoc);

    const page1Objects = merged.pages[0]?.fabric.objects as Array<{
      text?: string;
    }>;
    const page3Objects = merged.pages[2]?.fabric.objects as Array<{
      text?: string;
    }>;
    const page1Text = page1Objects?.[0]?.text;
    const page3Text = page3Objects?.[0]?.text;

    expect(page1Text).toBe("page-1");
    expect(page3Text).toBe("page-3");
    expect(merged.currentPage).toBe(2);
  });
});
