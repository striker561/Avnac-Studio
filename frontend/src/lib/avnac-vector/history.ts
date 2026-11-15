import type { VectorBoardDocument } from './types'
import {
  VECTOR_HISTORY_MAX_BYTES,
  VECTOR_HISTORY_MAX_ENTRIES,
} from './constants'
import { estimateDocumentBytes } from './document'

export type VectorHistoryEntry = {
  doc: VectorBoardDocument
  bytes: number
}

export type VectorHistoryOptions = {
  maxEntries?: number
  maxBytes?: number
}

export type VectorBoardHistory = {
  commit: (doc: VectorBoardDocument) => void
  undo: () => VectorBoardDocument | null
  redo: () => VectorBoardDocument | null
  reset: (doc: VectorBoardDocument) => void
  current: () => VectorBoardDocument
  canUndo: () => boolean
  canRedo: () => boolean
  stats: () => {
    entries: number
    bytes: number
    index: number
    maxEntries: number
    maxBytes: number
  }
}

export function createVectorBoardHistory(
  initial: VectorBoardDocument,
  options: VectorHistoryOptions = {},
): VectorBoardHistory {
  const maxEntries = Math.max(2, options.maxEntries ?? VECTOR_HISTORY_MAX_ENTRIES)
  const maxBytes = Math.max(1024, options.maxBytes ?? VECTOR_HISTORY_MAX_BYTES)
  let entries: VectorHistoryEntry[] = [
    { doc: initial, bytes: estimateDocumentBytes(initial) },
  ]
  let index = 0

  function totalBytes(): number {
    let total = 0
    for (const entry of entries) total += entry.bytes
    return total
  }

  /** Drop the oldest snapshots until both caps hold. */
  function trim(): void {
    while (entries.length > maxEntries) {
      entries.shift()
      index = Math.max(0, index - 1)
    }
    while (entries.length > 1 && totalBytes() > maxBytes) {
      const removed = entries.shift()
      if (!removed) break
      index = Math.max(0, index - 1)
    }
    if (index < 0) index = 0
    if (index >= entries.length) index = entries.length - 1
  }

  return {
    commit(doc) {
      if (doc === entries[index]?.doc) {
        trim()
        return
      }
      entries = entries.slice(0, index + 1)
      entries.push({ doc, bytes: estimateDocumentBytes(doc) })
      index = entries.length - 1
      trim()
    },
    undo() {
      if (index <= 0) return null
      index -= 1
      return entries[index]!.doc
    },
    redo() {
      if (index >= entries.length - 1) return null
      index += 1
      return entries[index]!.doc
    },
    reset(doc) {
      entries = [{ doc, bytes: estimateDocumentBytes(doc) }]
      index = 0
    },
    current() {
      return entries[index]!.doc
    },
    canUndo() {
      return index > 0
    },
    canRedo() {
      return index < entries.length - 1
    },
    stats() {
      return {
        entries: entries.length,
        bytes: totalBytes(),
        index,
        maxEntries,
        maxBytes,
      }
    },
  }
}
