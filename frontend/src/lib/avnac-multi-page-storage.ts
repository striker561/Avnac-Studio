import {
  ReadPages,
  WritePages,
  DeletePages,
  DuplicatePages,
} from "../../wailsjs/go/avnacio/IOManager";
import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import {
  buildMultiPageDocument,
  parseMultiPageDocument,
  type AvnacMultiPageDocumentV1,
} from "@/lib/avnac-multi-page-document";

async function readStorage(
  persistId: string,
): Promise<AvnacMultiPageDocumentV1 | null> {
  try {
    const raw = await ReadPages(persistId);
    if (!raw) return null;
    return parseMultiPageDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Read the raw stored pages without needing the current document.
 * Use together with {@link mergeStoredPages} when you want to parallelise
 * the pages read with the IDB document read.
 */
export async function readRawStoredPages(
  persistId: string,
): Promise<AvnacMultiPageDocumentV1 | null> {
  return readStorage(persistId);
}

/**
 * Synchronously merge a raw stored-pages result with the authoritative
 * document from IDB.  Equivalent to the second half of {@link loadStoredPages}.
 */
export function mergeStoredPages(
  stored: AvnacMultiPageDocumentV1 | null,
  currentDoc: AvnacDocumentV1,
): AvnacMultiPageDocumentV1 {
  if (!stored) {
    // No multi-page state saved yet — bootstrap from the IDB document.
    return buildMultiPageDocument([currentDoc], 0, [""]);
  }
  // Trust saveStoredPages as the authoritative multi-page state.
  // Do NOT overwrite stored.pages[currentPage] with the IDB document:
  // idbPutDocument is always written for the *active* page at save time, but
  // after a page navigation it becomes stale (still pointing at the old page).
  // Overwriting stored.pages[0] with a stale page-3 document is exactly what
  // caused the "close on page 3 corrupts page 1" data-loss bug.
  return stored;
}

export async function loadStoredPages(
  persistId: string,
  currentDoc: AvnacDocumentV1,
): Promise<AvnacMultiPageDocumentV1> {
  const stored = await readStorage(persistId);
  return mergeStoredPages(stored, currentDoc);
}

/**
 * Serialize page-envelope writes. Autosave and page renames can overlap; two
 * concurrent WritePages calls have no guaranteed completion order, so an
 * older snapshot could land after a newer one and silently undo a rename.
 * Chaining keeps last-call-wins for the persisted envelope.
 */
let pageWriteQueue: Promise<void> = Promise.resolve();

export async function saveStoredPages(
  persistId: string,
  pages: readonly AvnacDocumentV1[],
  currentPage: number,
  pageNames: readonly string[] = [],
): Promise<void> {
  const payload = JSON.stringify(
    buildMultiPageDocument(pages, currentPage, pageNames),
  );
  const write = pageWriteQueue.then(() => WritePages(persistId, payload));
  pageWriteQueue = write.catch(() => {});
  try {
    await write;
  } catch (err) {
    console.error("[avnac] saveStoredPages failed", err);
  }
}

export async function clearStoredPages(persistId: string): Promise<void> {
  try {
    await DeletePages(persistId);
  } catch (err) {
    console.error("[avnac] clearStoredPages failed", err);
  }
}

export async function duplicateStoredPages(
  sourceId: string,
  targetId: string,
): Promise<void> {
  try {
    await DuplicatePages(sourceId, targetId);
  } catch (err) {
    console.error("[avnac] duplicateStoredPages failed", err);
  }
}

export async function readStoredPagesForExport(
  persistId: string,
  currentDoc: AvnacDocumentV1,
): Promise<AvnacMultiPageDocumentV1> {
  return loadStoredPages(persistId, currentDoc);
}
