import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import { AVNAC_DOC_VERSION } from "@/lib/avnac-document";
import { migrateAvnacDocument } from "@/lib/avnac-migration";
import { fromAvnacV2Document } from "@/lib/saraswati/compat/from-avnac-v2";
import { toAvnacDocument } from "@/lib/saraswati/compat/to-avnac";

export const AVNAC_MULTI_PAGE_DOC_KIND = "avnac-multi-page-document" as const;
export const AVNAC_MULTI_PAGE_DOC_VERSION = 1 as const;

/** Longest accepted page name, in characters. */
export const MAX_PAGE_NAME_LENGTH = 120;

export type AvnacMultiPageDocumentV1 = {
  kind: typeof AVNAC_MULTI_PAGE_DOC_KIND;
  v: typeof AVNAC_MULTI_PAGE_DOC_VERSION;
  currentPage: number;
  /**
   * Optional user-facing name for each page, index-aligned with `pages`.
   * Missing/empty entries fall back to "Page N" in the UI.
   *
   * Added after v1 shipped, so it is optional on read: documents written
   * before pages could be named parse cleanly and get empty names.
   */
  pageNames: string[];
  pages: AvnacDocumentV1[];
};

export type ParsedAvnacImport =
  | { kind: "single"; document: AvnacDocumentV1 }
  | { kind: "multi"; document: AvnacMultiPageDocumentV1 };

function cloneDoc(doc: AvnacDocumentV1): AvnacDocumentV1 {
  if (typeof structuredClone === "function") return structuredClone(doc);
  return JSON.parse(JSON.stringify(doc)) as AvnacDocumentV1;
}

/** Trim and bound one page name. Empty means "use the page-number fallback". */
export function normalizePageName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PAGE_NAME_LENGTH);
}

/** Index-aligned page names, padded/truncated to `count`. */
export function normalizePageNames(raw: unknown, count: number): string[] {
  const values = Array.isArray(raw) ? raw : [];
  const safeCount = Math.max(0, Math.trunc(count));
  return Array.from({ length: safeCount }, (_, index) =>
    normalizePageName(values[index]),
  );
}

/** The label shown in tabs and MCP responses when a page has no name. */
export function pageDisplayName(
  pageNames: readonly string[] | undefined,
  index: number,
): string {
  return normalizePageName(pageNames?.[index]) || `Page ${index + 1}`;
}

export function clampPageIndex(pageCount: number, index: number): number {
  if (pageCount <= 1) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(pageCount - 1, Math.max(0, Math.trunc(index)));
}

export function buildMultiPageDocument(
  pages: readonly AvnacDocumentV1[],
  currentPage: number,
  pageNames: readonly string[] = [],
): AvnacMultiPageDocumentV1 {
  const safePages =
    pages.length > 0 ? pages.map(cloneDoc) : [cloneDoc(createEmptyPage())];
  return {
    kind: AVNAC_MULTI_PAGE_DOC_KIND,
    v: AVNAC_MULTI_PAGE_DOC_VERSION,
    currentPage: clampPageIndex(safePages.length, currentPage),
    pageNames: normalizePageNames(pageNames, safePages.length),
    pages: safePages,
  };
}

export function parseMultiPageDocument(
  raw: unknown,
): AvnacMultiPageDocumentV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<AvnacMultiPageDocumentV1>;
  if (
    candidate.kind !== AVNAC_MULTI_PAGE_DOC_KIND ||
    candidate.v !== AVNAC_MULTI_PAGE_DOC_VERSION ||
    !Array.isArray(candidate.pages)
  ) {
    return null;
  }

  const pages: AvnacDocumentV1[] = [];
  const pageNames: string[] = [];
  candidate.pages.forEach((page, index) => {
    const migrated = migrateAvnacDocument(page);
    if (!migrated) return;
    pages.push(migrated);
    // Keep names aligned with their source page even if one is dropped.
    pageNames.push(normalizePageName(candidate.pageNames?.[index]));
  });
  if (pages.length === 0) return null;

  return {
    kind: AVNAC_MULTI_PAGE_DOC_KIND,
    v: AVNAC_MULTI_PAGE_DOC_VERSION,
    currentPage: clampPageIndex(
      pages.length,
      Number(candidate.currentPage ?? 0),
    ),
    pageNames,
    pages,
  };
}

export function parseAvnacImport(raw: unknown): ParsedAvnacImport | null {
  const single = migrateAvnacDocument(raw);
  if (single) return { kind: "single", document: single };

  const multi = parseMultiPageDocument(raw);
  if (multi) return { kind: "multi", document: multi };

  // Try V2 (web schema) — convert to V1 for desktop storage.
  // Supports both single-page and multi-page web exports.
  const v2Multi = parseV2WorkspaceImport(raw);
  if (v2Multi) {
    return { kind: "multi", document: v2Multi };
  }

  const v2Scene = fromAvnacV2Document(raw);
  if (v2Scene) {
    const v1Doc = toAvnacDocument(v2Scene);
    return { kind: "single", document: v1Doc };
  }

  return null;
}

export type EmptyPageOptions = {
  width?: number;
  height?: number;
  backgroundColor?: string;
};

function pageDimension(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 100 || n > 16000) return null;
  return Math.round(n);
}

export function createEmptyPage(
  from?: AvnacDocumentV1,
  options?: EmptyPageOptions,
): AvnacDocumentV1 {
  const base = from
    ? cloneDoc(from)
    : {
        v: AVNAC_DOC_VERSION,
        artboard: { width: 4000, height: 4000 },
        bg: { type: "solid", color: "#ffffff" } as AvnacDocumentV1["bg"],
        fabric: { objects: [] },
      };

  const width = pageDimension(options?.width) ?? base.artboard.width;
  const height = pageDimension(options?.height) ?? base.artboard.height;
  const requestedBackground =
    typeof options?.backgroundColor === "string" &&
    options.backgroundColor.trim().length > 0
      ? options.backgroundColor.trim()
      : "#ffffff";

  return {
    ...base,
    // A page keeps the current artboard size unless a caller explicitly asks
    // for another one. The background starts fresh rather than inheriting the
    // previous page's fill.
    artboard: { ...base.artboard, width, height },
    bg: { type: "solid", color: requestedBackground } as AvnacDocumentV1["bg"],
    fabric: { objects: [] },
  };
}

export function clonePages(
  pages: readonly AvnacDocumentV1[],
): AvnacDocumentV1[] {
  return pages.map(cloneDoc);
}

function parseV2WorkspaceImport(raw: unknown): AvnacMultiPageDocumentV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as Record<string, unknown>;
  if (doc.v !== 2 || !Array.isArray(doc.pages)) return null;
  if (doc.pages.length === 0) return null;

  const baseArtboard =
    doc.artboard && typeof doc.artboard === "object" ? doc.artboard : null;
  const baseBg = doc.bg;

  const pages: AvnacDocumentV1[] = [];
  const pageIds: string[] = [];
  const pageNames: string[] = [];
  for (const pageRaw of doc.pages) {
    if (!pageRaw || typeof pageRaw !== "object") continue;
    const page = pageRaw as Record<string, unknown>;
    const pageId = typeof page.id === "string" ? page.id : null;
    const asV2Single = {
      v: 2,
      artboard:
        page.artboard && typeof page.artboard === "object"
          ? page.artboard
          : baseArtboard,
      bg: page.bg ?? baseBg,
      objects: Array.isArray(page.objects) ? page.objects : [],
    };
    const scene = fromAvnacV2Document(asV2Single);
    if (!scene) continue;
    pages.push(toAvnacDocument(scene));
    pageIds.push(pageId ?? "");
    // Web workspaces carry a per-page name; keep it when importing.
    pageNames.push(normalizePageName(page.name || page.title));
  }

  if (pages.length === 0) return null;

  const activePageId =
    typeof doc.activePageId === "string" ? doc.activePageId : null;
  const activeById = activePageId ? pageIds.indexOf(activePageId) : -1;
  const currentPage =
    activeById >= 0
      ? activeById
      : clampPageIndex(
          pages.length,
          typeof doc.currentPage === "number" ? doc.currentPage : 0,
        );

  return buildMultiPageDocument(pages, currentPage, pageNames);
}
