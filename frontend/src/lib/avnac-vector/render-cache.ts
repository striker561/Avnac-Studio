import type { VectorBoardDocument, VectorBoardLayer, VectorViewport } from './types'
import { paintLayerToCacheCanvas } from './paint'

/**
 * Per-layer board-space caches.
 *
 * Painting a layer into a canvas the size of the board (not the viewport) means
 * panning and zooming never invalidate the cache; only a layer object identity
 * or the cache resolution does. Document operations are immutable, so an
 * unchanged layer keeps its identity and is never re-stroked.
 */

export type LayerCacheEntry = {
  id: string
  layerRef: VectorBoardLayer
  pixelRatio: number
  canvas: HTMLCanvasElement
  pixels: number
}

export type LayerCachePlan = {
  create: string[]
  repaint: string[]
  reuse: string[]
  remove: string[]
}

export type CachePixelRatioInput = {
  boardWidth: number
  boardHeight: number
  viewScale: number
  devicePixelRatio: number
  maxPixels?: number
  maxRatio?: number
  minRatio?: number
}

/** Quantized cache resolution, bounded by a pixel budget. */
export function chooseCachePixelRatio(input: CachePixelRatioInput): number {
  const maxPixels = input.maxPixels ?? 6_000_000
  const maxRatio = input.maxRatio ?? 2
  const minRatio = input.minRatio ?? 1
  const boardPixels = Math.max(1, input.boardWidth * input.boardHeight)
  const budgetRatio = Math.sqrt(maxPixels / boardPixels)
  const desired = Math.max(1, input.viewScale) * Math.max(1, input.devicePixelRatio)
  const raw = Math.min(desired, maxRatio, budgetRatio, 4)
  const clamped = Math.max(minRatio, raw)
  // 0.25 steps prevent a cache rebuild on every wheel tick.
  return Math.round(clamped * 4) / 4
}

/**
 * Pure cache plan: which layer ids need a canvas allocation, which need a
 * repaint, which can be drawn as-is, and which are gone.
 */
export function planLayerCaches(
  previous: ReadonlyMap<string, { layerRef: VectorBoardLayer; pixelRatio: number }>,
  doc: VectorBoardDocument,
  pixelRatio: number,
): LayerCachePlan {
  const plan: LayerCachePlan = { create: [], repaint: [], reuse: [], remove: [] }
  const alive = new Set<string>()
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    alive.add(layer.id)
    const cached = previous.get(layer.id)
    if (!cached) {
      plan.create.push(layer.id)
      continue
    }
    if (cached.layerRef === layer && cached.pixelRatio === pixelRatio) {
      plan.reuse.push(layer.id)
    } else {
      plan.repaint.push(layer.id)
    }
  }
  for (const id of previous.keys()) {
    if (!alive.has(id)) plan.remove.push(id)
  }
  return plan
}

export type LayerCacheOptions = {
  createCanvas?: () => HTMLCanvasElement
  maxPixels?: number
}

export type LayerCache = {
  sync: (
    doc: VectorBoardDocument,
    pixelRatio: number,
  ) => LayerCachePlan
  get: (layerId: string) => LayerCacheEntry | undefined
  invalidateAll: () => void
  invalidateLayer: (layerId: string) => void
  clear: () => void
  stats: () => { layers: number; pixels: number; repaints: number }
}

export function createLayerCache(options: LayerCacheOptions = {}): LayerCache {
  const entries = new Map<string, LayerCacheEntry>()
  let repaints = 0

  const createCanvas =
    options.createCanvas ??
    (() => document.createElement('canvas'))

  function ensureEntry(
    layer: VectorBoardLayer,
    board: VectorBoardDocument['size'],
    pixelRatio: number,
  ): LayerCacheEntry {
    const existing = entries.get(layer.id)
    const width = Math.max(1, Math.round(board.width * pixelRatio))
    const height = Math.max(1, Math.round(board.height * pixelRatio))
    if (existing && existing.canvas.width === width && existing.canvas.height === height) {
      existing.layerRef = layer
      existing.pixelRatio = pixelRatio
      return existing
    }
    const canvas = existing?.canvas ?? createCanvas()
    canvas.width = width
    canvas.height = height
    const entry: LayerCacheEntry = {
      id: layer.id,
      layerRef: layer,
      pixelRatio,
      canvas,
      pixels: width * height,
    }
    entries.set(layer.id, entry)
    return entry
  }

  return {
    sync(doc, pixelRatio) {
      if (options.maxPixels != null) {
        const width = Math.round(doc.size.width * pixelRatio)
        const height = Math.round(doc.size.height * pixelRatio)
        if (width * height > options.maxPixels) {
          pixelRatio = Math.max(0.5, Math.sqrt(options.maxPixels / (doc.size.width * doc.size.height)))
        }
      }
      const snapshot = new Map<string, { layerRef: VectorBoardLayer; pixelRatio: number }>()
      for (const [id, entry] of entries) {
        snapshot.set(id, { layerRef: entry.layerRef, pixelRatio: entry.pixelRatio })
      }
      const plan = planLayerCaches(snapshot, doc, pixelRatio)
      for (const id of plan.remove) entries.delete(id)
      for (const id of [...plan.create, ...plan.repaint]) {
        const layer = doc.layers.find((l) => l.id === id)
        if (!layer) continue
        const entry = ensureEntry(layer, doc.size, pixelRatio)
        paintLayerToCacheCanvas(entry.canvas, layer, pixelRatio)
        repaints += 1
      }
      if (entries.size > doc.layers.length) {
        const alive = new Set(doc.layers.filter((l) => l.visible).map((l) => l.id))
        for (const id of [...entries.keys()]) {
          if (!alive.has(id)) entries.delete(id)
        }
      }
      return plan
    },
    get(layerId) {
      return entries.get(layerId)
    },
    invalidateAll() {
      for (const entry of entries.values()) {
        entry.layerRef = null as unknown as VectorBoardLayer
        entry.pixelRatio = -1
      }
    },
    invalidateLayer(layerId) {
      const entry = entries.get(layerId)
      if (!entry) return
      entry.layerRef = null as unknown as VectorBoardLayer
      entry.pixelRatio = -1
    },
    clear() {
      entries.clear()
    },
    stats() {
      let pixels = 0
      for (const entry of entries.values()) pixels += entry.pixels
      return { layers: entries.size, pixels, repaints }
    },
  }
}

/** Draw cached layers into a screen-space 2D context (DPR transform active). */
export function drawLayerCaches(
  ctx: CanvasRenderingContext2D,
  cache: LayerCache,
  doc: VectorBoardDocument,
  view: VectorViewport,
): void {
  const w = doc.size.width * view.scale
  const h = doc.size.height * view.scale
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    const entry = cache.get(layer.id)
    if (!entry) continue
    ctx.drawImage(entry.canvas, view.tx, view.ty, w, h)
  }
}
