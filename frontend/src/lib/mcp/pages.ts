/**
 * Pure page targeting and naming helpers for MCP canvas page operations.
 *
 * Page addressing is deliberately forgiving because agents see both forms in
 * get_canvas_summary: `number` is 1-based and human, `index` is 0-based and
 * programmatic. A name is accepted when it is exact (case-insensitive) or a
 * unique substring, so "draft" can select "Test — Draft" without guessing.
 */

import {
  normalizePageName,
  pageDisplayName,
} from "@/lib/avnac-multi-page-document";

export type PageResolution =
  | { ok: true; index: number; name: string }
  | { ok: false; error: string };

export function formatPageList(
  pageNames: readonly string[],
  pageCount: number,
): string {
  return Array.from(
    { length: pageCount },
    (_, index) => `${index + 1}:${pageDisplayName(pageNames, index)}`,
  ).join(", ");
}

/**
 * Resolve a page selector to a 0-based index.
 *
 * - undefined/null/"" selects `currentPage` (handy for rename/delete defaulting
 *   to the active page).
 * - number or numeric string is a 1-based page number, matching get_canvas_summary.
 * - string is matched against the display name, exact first, then a unique
 *   case-insensitive substring.
 */
export function resolvePageIndex(
  pageCount: number,
  pageNames: readonly string[],
  target: unknown,
  currentPage: number,
): PageResolution {
  if (pageCount <= 0) {
    return { ok: false, error: "This document has no pages." };
  }
  const current = Math.min(Math.max(0, Math.trunc(currentPage)), pageCount - 1);

  if (target === undefined || target === null || target === "") {
    return {
      ok: true,
      index: current,
      name: pageDisplayName(pageNames, current),
    };
  }

  if (typeof target === "number") {
    if (!Number.isFinite(target)) {
      return { ok: false, error: `Invalid page number '${String(target)}'.` };
    }
    const index = Math.trunc(target) - 1;
    if (index < 0 || index >= pageCount) {
      return {
        ok: false,
        error: `Page ${target} does not exist. Pages: ${formatPageList(pageNames, pageCount)}.`,
      };
    }
    return { ok: true, index, name: pageDisplayName(pageNames, index) };
  }

  const raw = String(target).trim();
  if (!raw) {
    return {
      ok: true,
      index: current,
      name: pageDisplayName(pageNames, current),
    };
  }

  if (/^\d+$/.test(raw)) {
    const number = Number(raw);
    const index = number - 1;
    if (index < 0 || index >= pageCount) {
      return {
        ok: false,
        error: `Page ${number} does not exist. Pages: ${formatPageList(pageNames, pageCount)}.`,
      };
    }
    return { ok: true, index, name: pageDisplayName(pageNames, index) };
  }

  const labels = Array.from({ length: pageCount }, (_, index) =>
    pageDisplayName(pageNames, index),
  );
  const wanted = raw.toLowerCase();

  const exact = labels
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => label.toLowerCase() === wanted);
  if (exact.length === 1) {
    return {
      ok: true,
      index: exact[0]!.index,
      name: exact[0]!.label,
    };
  }
  if (exact.length > 1) {
    return {
      ok: false,
      error: `Page name '${raw}' matches more than one page. Use a page number: ${formatPageList(pageNames, pageCount)}.`,
    };
  }

  const partial = labels
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => label.toLowerCase().includes(wanted));
  if (partial.length === 1) {
    return {
      ok: true,
      index: partial[0]!.index,
      name: partial[0]!.label,
    };
  }
  if (partial.length > 1) {
    return {
      ok: false,
      error: `Page name '${raw}' is ambiguous (matches ${partial
        .map(({ index }) => pageDisplayName(pageNames, index))
        .join(", ")}). Use a page number: ${formatPageList(pageNames, pageCount)}.`,
    };
  }

  return {
    ok: false,
    error: `No page named '${raw}'. Pages: ${formatPageList(pageNames, pageCount)}.`,
  };
}

/** Page selector from an MCP payload. `index` is 0-based; `page` is 1-based/name. */
export function pageSelectorFromPayload(payload: Record<string, unknown>): {
  target: unknown;
  fromIndex: boolean;
} {
  if (payload.index !== undefined) {
    const n = Number(payload.index);
    return {
      target: Number.isFinite(n) ? n + 1 : payload.index,
      fromIndex: true,
    };
  }
  if (payload.page !== undefined) {
    return { target: payload.page, fromIndex: false };
  }
  if (payload.pageName !== undefined) {
    return { target: payload.pageName, fromIndex: false };
  }
  return { target: undefined, fromIndex: false };
}

/** Normalize an MCP-supplied page name, preserving the empty fallback. */
export function pageNameFromPayload(value: unknown): string {
  return normalizePageName(value);
}
