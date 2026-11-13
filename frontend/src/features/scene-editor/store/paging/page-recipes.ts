import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import {
  clampPageIndex,
  createEmptyPage,
  normalizePageName,
  normalizePageNames,
} from "@/lib/avnac-multi-page-document";
import { clonePageDoc } from "./page-state";

export type PageState = {
  currentPage: number;
  pageNames: string[];
  pages: AvnacDocumentV1[];
};

type PageUpdateResult = {
  nextState: PageState;
  nextDoc: AvnacDocumentV1;
};

export function buildGoToPageResult(
  prev: PageState,
  targetIndex: number,
): PageUpdateResult {
  const nextIndex = clampPageIndex(prev.pages.length, targetIndex);
  return {
    nextState: {
      currentPage: nextIndex,
      pageNames: prev.pageNames,
      pages: prev.pages,
    },
    nextDoc: prev.pages[nextIndex]!,
  };
}

export function buildAddPageResult(
  prev: PageState,
  currentDoc: AvnacDocumentV1,
  name = "",
): PageUpdateResult {
  const nextPage = createEmptyPage(currentDoc);
  const nextIndex = prev.currentPage + 1;
  const pages = [...prev.pages];
  pages.splice(nextIndex, 0, nextPage);
  const pageNames = normalizePageNames(prev.pageNames, prev.pages.length);
  pageNames.splice(nextIndex, 0, normalizePageName(name));
  return {
    nextState: {
      currentPage: nextIndex,
      pageNames,
      pages,
    },
    nextDoc: nextPage,
  };
}

/**
 * Delete a page by index. Deleting the active page selects its neighbour;
 * deleting a page before it keeps the same content active and shifts the
 * index down. Refuses to delete the only page.
 */
export function buildDeletePageResult(
  prev: PageState,
  targetIndex = prev.currentPage,
): PageUpdateResult {
  if (prev.pages.length <= 1) {
    return {
      nextState: prev,
      nextDoc: prev.pages[prev.currentPage]!,
    };
  }
  const index = clampPageIndex(prev.pages.length, targetIndex);
  const pages = prev.pages.filter((_, pageIndex) => pageIndex !== index);
  const pageNames = normalizePageNames(prev.pageNames, prev.pages.length).filter(
    (_, pageIndex) => pageIndex !== index,
  );
  let nextIndex = prev.currentPage;
  if (index < prev.currentPage) nextIndex = prev.currentPage - 1;
  else if (index === prev.currentPage)
    nextIndex = Math.min(prev.currentPage, pages.length - 1);
  return {
    nextState: {
      currentPage: nextIndex,
      pageNames,
      pages,
    },
    nextDoc: pages[nextIndex]!,
  };
}

export function buildInsertImportedPageResult(
  prev: PageState,
  importedDoc: AvnacDocumentV1,
  name = "",
): PageUpdateResult {
  const insertIndex = prev.currentPage + 1;
  const pages = [...prev.pages];
  pages.splice(insertIndex, 0, clonePageDoc(importedDoc));
  const pageNames = normalizePageNames(prev.pageNames, prev.pages.length);
  pageNames.splice(insertIndex, 0, normalizePageName(name));
  return {
    nextState: {
      currentPage: insertIndex,
      pageNames,
      pages,
    },
    nextDoc: pages[insertIndex]!,
  };
}
