import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import {
  buildMultiPageDocument,
  createEmptyPage,
  parseMultiPageDocument,
} from "@/lib/avnac-multi-page-document";
import {
  mergeStoredPages,
  saveStoredPages,
} from "@/lib/avnac-multi-page-storage";

const writePages = vi.fn();
const readPages = vi.fn();

vi.mock("../../../wailsjs/go/avnacio/IOManager", () => ({
  WritePages: (...args: unknown[]) => writePages(...args),
  ReadPages: (...args: unknown[]) => readPages(...args),
  DeletePages: vi.fn(),
  DuplicatePages: vi.fn(),
}));

function makeDoc(label: string, payloadSize = 0): AvnacDocumentV1 {
  return {
    v: 1,
    artboard: { width: 1920, height: 1080 },
    bg: { type: "solid", color: "#ffffff" },
    fabric: {
      objects: [
        {
          type: "text",
          text: payloadSize > 0 ? "x".repeat(payloadSize) : label,
          left: 0,
          top: 0,
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

describe("feature: storage / large multi-page persistence", () => {
  beforeEach(() => {
    writePages.mockReset();
    readPages.mockReset();
  });

  it("serializes and parses a multi-megabyte workspace envelope", () => {
    const pages = [makeDoc("page-1", 512_000), makeDoc("page-2", 512_000)];
    const envelope = buildMultiPageDocument(pages, 1);
    const raw = JSON.stringify(envelope);
    expect(raw.length).toBeGreaterThan(1_000_000);

    const parsed = parseMultiPageDocument(JSON.parse(raw));
    expect(parsed).not.toBeNull();
    expect(parsed!.pages).toHaveLength(2);
    expect(parsed!.currentPage).toBe(1);
  });

  it("writes the full pages payload through the native storage bridge", async () => {
    const pages = [makeDoc("a", 256_000), makeDoc("b", 256_000)];
    writePages.mockResolvedValue(undefined);

    await saveStoredPages("workspace-huge", pages, 0);

    expect(writePages).toHaveBeenCalledTimes(1);
    const [persistId, raw] = writePages.mock.calls[0] as [string, string];
    expect(persistId).toBe("workspace-huge");
    expect(raw.length).toBeGreaterThan(500_000);

    const parsed = parseMultiPageDocument(JSON.parse(raw));
    expect(parsed).not.toBeNull();
    expect(parsed!.pages).toHaveLength(2);
  });

  it("keeps stored pages authoritative when the active-page snapshot is stale", () => {
    const stored = buildMultiPageDocument(
      [makeDoc("page-1", 100_000), makeDoc("page-2", 100_000)],
      1,
    );
    const staleActivePageDoc = makeDoc("stale-active-page", 100_000);

    const merged = mergeStoredPages(stored, staleActivePageDoc);
    const first = merged.pages[0]?.fabric.objects as Array<{ text?: string }>;
    const second = merged.pages[1]?.fabric.objects as Array<{ text?: string }>;

    expect(first?.[0]?.text?.length).toBe(100_000);
    expect(second?.[0]?.text?.length).toBe(100_000);
    expect(merged.currentPage).toBe(1);
  });

  it("createEmptyPage keeps the artboard size but resets the background", () => {
    const blue = makeDoc("page-1");
    blue.bg = { type: "solid", color: "#3366ff" };
    blue.artboard = { width: 1280, height: 720 };

    const empty = createEmptyPage(blue);

    // New page starts with the default background, not the previous page's fill.
    expect(empty.bg).toEqual({ type: "solid", color: "#ffffff" });
    // But it keeps the artboard dimensions as a convenience.
    expect(empty.artboard).toEqual({ width: 1280, height: 720 });
    // And it is blank.
    expect((empty.fabric as { objects: unknown[] }).objects).toHaveLength(0);
  });
});
