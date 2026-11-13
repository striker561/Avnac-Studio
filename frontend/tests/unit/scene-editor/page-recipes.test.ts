import { describe, expect, it } from "vitest";
import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import {
  buildAddPageResult,
  buildDeletePageResult,
  buildInsertImportedPageResult,
} from "@/features/scene-editor/store/paging/page-recipes";

function doc(label: string): AvnacDocumentV1 {
  return {
    v: 1,
    artboard: { width: 1080, height: 1080 },
    bg: { type: "solid", color: "#ffffff" },
    fabric: { objects: [{ type: "text", text: label }] },
  };
}

describe("page recipes with page names", () => {
  it("inserts a named page after the active page and activates it", () => {
    const { nextState } = buildAddPageResult(
      {
        currentPage: 0,
        pageNames: ["Cover"],
        pages: [doc("one"), doc("two")],
      },
      doc("one"),
      "Test — layout",
    );
    expect(nextState.currentPage).toBe(1);
    expect(nextState.pages).toHaveLength(3);
    expect(nextState.pageNames).toEqual(["Cover", "Test — layout", ""]);
  });

  it("deletes the active page and selects its neighbour", () => {
    const { nextState } = buildDeletePageResult(
      {
        currentPage: 1,
        pageNames: ["Cover", "Draft", "Back"],
        pages: [doc("one"), doc("two"), doc("three")],
      },
      1,
    );
    expect(nextState.currentPage).toBe(1);
    expect(nextState.pageNames).toEqual(["Cover", "Back"]);
    expect(nextState.pages).toHaveLength(2);
  });

  it("keeps the active content when a page before it is deleted", () => {
    const { nextState } = buildDeletePageResult(
      {
        currentPage: 2,
        pageNames: ["Cover", "Draft", "Back"],
        pages: [doc("one"), doc("two"), doc("three")],
      },
      0,
    );
    expect(nextState.currentPage).toBe(1);
    expect(nextState.pageNames).toEqual(["Draft", "Back"]);
  });

  it("refuses to delete the final page", () => {
    const prev = {
      currentPage: 0,
      pageNames: ["Cover"],
      pages: [doc("one")],
    };
    const { nextState } = buildDeletePageResult(prev, 0);
    expect(nextState).toBe(prev);
  });

  it("names an imported page while inserting it", () => {
    const { nextState } = buildInsertImportedPageResult(
      { currentPage: 0, pageNames: ["Cover"], pages: [doc("one")] },
      doc("imported"),
      "Imported poster",
    );
    expect(nextState.currentPage).toBe(1);
    expect(nextState.pageNames).toEqual(["Cover", "Imported poster"]);
  });
});
