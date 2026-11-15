import type { VectorBoardDocument } from "./avnac-vector";
import {
  emptyVectorBoardDocument,
  migrateVectorBoardDocument,
} from "./avnac-vector";
import {
  ReadVectorBoardDocs,
  ReadVectorBoards,
  WriteVectorBoardDocs,
  WriteVectorBoards,
} from "../../wailsjs/go/avnacio/IOManager";

export type AvnacVectorBoardMeta = {
  id: string;
  name: string;
  createdAt: number;
};

export async function loadVectorBoards(
  persistId: string,
): Promise<AvnacVectorBoardMeta[]> {
  try {
    const raw = await ReadVectorBoards(persistId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const o = row as Record<string, unknown>;
        const id = typeof o.id === "string" ? o.id : null;
        const name = typeof o.name === "string" ? o.name : null;
        const createdAt = typeof o.createdAt === "number" ? o.createdAt : null;
        if (!id || !name || createdAt == null) return null;
        return { id, name, createdAt } satisfies AvnacVectorBoardMeta;
      })
      .filter((x): x is AvnacVectorBoardMeta => x != null);
  } catch {
    return [];
  }
}

export function saveVectorBoards(
  persistId: string,
  boards: AvnacVectorBoardMeta[],
): Promise<void> {
  try {
    return WriteVectorBoards(persistId, JSON.stringify(boards));
  } catch {
    return Promise.resolve();
  }
}

export async function loadVectorBoardDocs(
  persistId: string,
): Promise<Record<string, VectorBoardDocument>> {
  try {
    const raw = await ReadVectorBoardDocs(persistId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, VectorBoardDocument> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!v || typeof v !== "object") continue;
      const doc = migrateVectorBoardDocument(v);
      out[k] = doc;
      const key = liveKey(persistId, k);
      if (!liveVectorBoardDocs.has(key)) liveVectorBoardDocs.set(key, doc);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveVectorBoardDocs(
  persistId: string,
  docs: Record<string, VectorBoardDocument>,
): Promise<void> {
  try {
    return WriteVectorBoardDocs(persistId, JSON.stringify(docs));
  } catch {
    return Promise.resolve();
  }
}

export function mergeVectorBoardDocsForMeta(
  boards: AvnacVectorBoardMeta[],
  existing: Record<string, VectorBoardDocument>,
): Record<string, VectorBoardDocument> {
  const next = { ...existing };
  for (const b of boards) {
    if (!next[b.id]) next[b.id] = emptyVectorBoardDocument();
  }
  return next;
}

export function clearAvnacVectorBoardStorage(
  _persistId: string,
): Promise<void> {
  return Promise.resolve();
}

/**
 * Live board documents, keyed by `persistId:boardId`.
 *
 * The editor saves through a debounce, but drag-to-canvas must always see the
 * latest strokes. This cache sits in front of the persisted JSON so a board
 * dropped moments after drawing still lands as current content.
 */
const liveVectorBoardDocs = new Map<string, VectorBoardDocument>();

function liveKey(persistId: string, boardId: string): string {
  return `${persistId}:${boardId}`;
}

export function rememberVectorBoardDoc(
  persistId: string,
  boardId: string,
  doc: VectorBoardDocument,
): void {
  liveVectorBoardDocs.set(liveKey(persistId, boardId), doc);
}

export function forgetVectorBoardDoc(persistId: string, boardId: string): void {
  liveVectorBoardDocs.delete(liveKey(persistId, boardId));
}

export function getCachedVectorBoardDoc(
  persistId: string,
  boardId: string,
): VectorBoardDocument | null {
  return liveVectorBoardDocs.get(liveKey(persistId, boardId)) ?? null;
}

export async function loadVectorBoardDoc(
  persistId: string,
  boardId: string,
): Promise<VectorBoardDocument | null> {
  const cached = getCachedVectorBoardDoc(persistId, boardId);
  if (cached) return cached;
  const docs = await loadVectorBoardDocs(persistId);
  return docs[boardId] ?? null;
}

