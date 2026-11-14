import {
  DeleteDocument,
  ListDocuments,
  ReadDocumentRecord,
  WriteDocumentRecord,
} from "../../wailsjs/go/avnacio/IOManager";
import { duplicateStoredPages } from "@/lib/avnac-multi-page-storage";
import { type AvnacDocumentV1 } from "./avnac-document";
import { migrateAvnacDocument } from "@/lib/avnac-migration";
import type { VectorBoardDocument } from "./avnac-vector";
import {
  loadVectorBoardDocs,
  loadVectorBoards,
  saveVectorBoardDocs,
  saveVectorBoards,
} from "./avnac-vector-boards-storage";

export type AvnacEditorIdbRecord = {
  id: string;
  updatedAt: number;
  document: AvnacDocumentV1;
  /** User-visible file name (optional on legacy rows). */
  name?: string;
};

function parseEditorRecord(raw: string): AvnacEditorIdbRecord | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const id = typeof parsed.id === "string" ? parsed.id : null;
    const updatedAt =
      typeof parsed.updatedAt === "number" ? parsed.updatedAt : null;
    const name = typeof parsed.name === "string" ? parsed.name : undefined;
    const document = migrateAvnacDocument(parsed.document);
    if (!id || updatedAt == null || !document) return null;
    return {
      id,
      updatedAt,
      name,
      document,
    } satisfies AvnacEditorIdbRecord;
  } catch {
    return null;
  }
}

export async function idbGetEditorRecord(
  id: string,
): Promise<AvnacEditorIdbRecord | null> {
  const raw = await ReadDocumentRecord(id);
  if (!raw) return null;
  return parseEditorRecord(raw);
}

export async function idbGetDocument(
  id: string,
): Promise<AvnacDocumentV1 | null> {
  const row = await idbGetEditorRecord(id);
  return row?.document ?? null;
}

export type AvnacEditorIdbListItem = {
  id: string;
  name: string;
  updatedAt: number;
  artboardWidth: number;
  artboardHeight: number;
};

export async function idbListDocuments(): Promise<AvnacEditorIdbListItem[]> {
  const raw = await ListDocuments();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const obj = row as Record<string, unknown>;
        const id = typeof obj.id === "string" ? obj.id : null;
        const updatedAt =
          typeof obj.updatedAt === "number" ? obj.updatedAt : null;
        const artboardWidth =
          typeof obj.artboardWidth === "number" ? obj.artboardWidth : 0;
        const artboardHeight =
          typeof obj.artboardHeight === "number" ? obj.artboardHeight : 0;
        if (!id || updatedAt == null) return null;
        return {
          id,
          name:
            typeof obj.name === "string" && obj.name.trim().length > 0
              ? obj.name.trim()
              : "Untitled",
          updatedAt,
          artboardWidth,
          artboardHeight,
        } satisfies AvnacEditorIdbListItem;
      })
      .filter((row): row is AvnacEditorIdbListItem => row != null);
  } catch {
    return [];
  }
}

export async function idbPutDocument(
  id: string,
  document: AvnacDocumentV1,
  opts?: { name?: string },
): Promise<void> {
  const name =
    opts && opts.name !== undefined
      ? opts.name.trim() || "Untitled"
      : (await idbGetEditorRecord(id))?.name?.trim() || "Untitled";
  await WriteDocumentRecord(
    id,
    JSON.stringify({
      id,
      updatedAt: Date.now(),
      document,
      name,
    } satisfies AvnacEditorIdbRecord),
  );
}

export async function idbSetDocumentName(
  id: string,
  name: string,
): Promise<void> {
  const row = await idbGetEditorRecord(id);
  if (!row) return;
  await idbPutDocument(id, row.document, { name });
}

export async function idbDeleteDocument(id: string): Promise<void> {
  await DeleteDocument(id);
}

export async function idbDuplicateDocument(
  sourceId: string,
): Promise<string | null> {
  const row = await idbGetEditorRecord(sourceId);
  if (!row) return null;
  const newId = crypto.randomUUID();
  const baseName = row.name?.trim() || "Untitled";
  const name = `${baseName} copy`;
  const docClone: AvnacDocumentV1 =
    typeof structuredClone === "function"
      ? structuredClone(row.document)
      : (JSON.parse(JSON.stringify(row.document)) as AvnacDocumentV1);
  await idbPutDocument(newId, docClone, { name });

  const boards = await loadVectorBoards(sourceId);
  const docs = await loadVectorBoardDocs(sourceId);
  if (boards.length > 0) {
    await saveVectorBoards(
      newId,
      JSON.parse(JSON.stringify(boards)) as typeof boards,
    );
  }
  if (Object.keys(docs).length > 0) {
    await saveVectorBoardDocs(
      newId,
      JSON.parse(JSON.stringify(docs)) as Record<string, VectorBoardDocument>,
    );
  }
  await duplicateStoredPages(sourceId, newId);
  return newId;
}
