import { describe, expect, it } from "vitest";

import {
  pageSelectorFromPayload,
  resolvePageIndex,
} from "@/lib/mcp/pages";
import { normalizePageName, pageDisplayName } from "@/lib/avnac-multi-page-document";

const names = ["Cover", "Test — poster", "Page 4"];

describe("MCP page targeting", () => {
  it("treats a number as a 1-based page number", () => {
    expect(resolvePageIndex(3, names, 2, 0)).toMatchObject({
      ok: true,
      index: 1,
      name: "Test — poster",
    });
  });

  it("accepts a 0-based index through the payload helper", () => {
    const selector = pageSelectorFromPayload({ index: 2 });
    expect(selector.target).toBe(3);
    expect(resolvePageIndex(3, names, selector.target, 0)).toMatchObject({
      ok: true,
      index: 2,
    });
  });

  it("matches a page name exactly, case-insensitively", () => {
    expect(resolvePageIndex(3, names, "cover", 0)).toMatchObject({
      ok: true,
      index: 0,
    });
  });

  it("accepts a unique substring of a page name", () => {
    expect(resolvePageIndex(3, names, "poster", 0)).toMatchObject({
      ok: true,
      index: 1,
    });
  });

  it("reports ambiguity instead of guessing", () => {
    const result = resolvePageIndex(3, ["Draft one", "Draft two", "Cover"], "draft", 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("ambiguous");
  });

  it("lists available pages when a name misses", () => {
    const result = resolvePageIndex(3, names, "missing", 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("1:Cover");
      expect(result.error).toContain("3:Page 4");
    }
  });

  it("defaults to the current page for rename/delete", () => {
    expect(resolvePageIndex(3, names, undefined, 1)).toMatchObject({
      ok: true,
      index: 1,
    });
  });

  it("rejects out-of-range page numbers", () => {
    expect(resolvePageIndex(3, names, 9, 0).ok).toBe(false);
    expect(resolvePageIndex(3, names, 0, 0).ok).toBe(false);
  });

  it("normalizes and bounds page names", () => {
    expect(normalizePageName("  Test   page  ")).toBe("Test page");
    expect(normalizePageName("x".repeat(200))).toHaveLength(120);
    expect(pageDisplayName(["", "Cover"], 0)).toBe("Page 1");
    expect(pageDisplayName(["", "Cover"], 1)).toBe("Cover");
  });
});
