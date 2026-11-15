import {
  DEFAULT_VECTOR_BOARD_HEIGHT,
  DEFAULT_VECTOR_BOARD_WIDTH,
  VECTOR_BOARD_DOC_VERSION,
  VECTOR_DEFAULT_STROKE_COLOR,
  VECTOR_DEFAULT_STROKE_WIDTH,
  VECTOR_HISTORY_MAX_ENTRIES,
} from './constants'
import type {
  VectorBoardDocument,
  VectorBoardLayer,
  VectorBoardSize,
  VectorBoardStroke,
  VectorBounds,
  VectorFillRule,
  VectorLineCap,
  VectorLineJoin,
  VectorNodeType,
  VectorPenAnchor,
  VectorPoint,
  VectorSelection,
  VectorStrokeKind,
} from './types'
import { clamp, isBoundsValid, unionBounds } from './geometry'
import { inferNodeType, normalizeAnchor, translateAnchors, scaleAnchors } from './node-types'
import {
  pointInStroke,
  nearestPointOnStroke,
  strokeBounds,
  strokeIntersectsBounds,
  strokeIsRenderable,
  strokeToSvgData,
} from './path'

const VALID_KINDS: readonly VectorStrokeKind[] = [
  'pen',
  'line',
  'rect',
  'ellipse',
  'arrow',
  'polygon',
]
const VALID_NODE_TYPES: readonly VectorNodeType[] = [
  'corner',
  'cusp',
  'smooth',
  'symmetric',
]
const VALID_FILL_RULES: readonly VectorFillRule[] = ['nonzero', 'evenodd']
const VALID_LINE_CAPS: readonly VectorLineCap[] = ['butt', 'round', 'square']
const VALID_LINE_JOINS: readonly VectorLineJoin[] = ['miter', 'round', 'bevel']

export function createVectorBoardLayer(name: string): VectorBoardLayer {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    strokes: [],
  }
}

export function defaultVectorBoardSize(): VectorBoardSize {
  return { width: DEFAULT_VECTOR_BOARD_WIDTH, height: DEFAULT_VECTOR_BOARD_HEIGHT }
}

export function emptyVectorBoardDocument(
  size: VectorBoardSize = defaultVectorBoardSize(),
): VectorBoardDocument {
  const layer = createVectorBoardLayer('Layer 1')
  return {
    v: VECTOR_BOARD_DOC_VERSION,
    size: sanitizeBoardSize(size),
    layers: [layer],
    activeLayerId: layer.id,
  }
}

function sanitizeBoardSize(size: Partial<VectorBoardSize> | undefined): VectorBoardSize {
  const width =
    typeof size?.width === 'number' && Number.isFinite(size.width) && size.width >= 16
      ? Math.round(size.width)
      : DEFAULT_VECTOR_BOARD_WIDTH
  const height =
    typeof size?.height === 'number' && Number.isFinite(size.height) && size.height >= 16
      ? Math.round(size.height)
      : DEFAULT_VECTOR_BOARD_HEIGHT
  return { width, height }
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseNodeType(raw: unknown, anchor: VectorPenAnchor): VectorNodeType {
  if (typeof raw === 'string' && VALID_NODE_TYPES.includes(raw as VectorNodeType)) {
    return raw as VectorNodeType
  }
  return inferNodeType(anchor)
}

function parseAnchor(
  row: unknown,
  legacy: boolean,
  size: VectorBoardSize,
): VectorPenAnchor | null {
  if (!row || typeof row !== 'object') return null
  const o = row as Record<string, unknown>
  const sx = legacy ? size.width : 1
  const sy = legacy ? size.height : 1
  const x = finiteNumber(o.x, Number.NaN) * sx
  const y = finiteNumber(o.y, Number.NaN) * sy
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const anchor: VectorPenAnchor = { x, y, type: 'corner' }
  const rawInX = finiteNumber(o.inX, Number.NaN)
  const rawInY = finiteNumber(o.inY, Number.NaN)
  const rawOutX = finiteNumber(o.outX, Number.NaN)
  const rawOutY = finiteNumber(o.outY, Number.NaN)
  if (Number.isFinite(rawInX) && Number.isFinite(rawInY)) {
    anchor.inX = rawInX * sx
    anchor.inY = rawInY * sy
  }
  if (Number.isFinite(rawOutX) && Number.isFinite(rawOutY)) {
    anchor.outX = rawOutX * sx
    anchor.outY = rawOutY * sy
  }
  anchor.type = parseNodeType(o.type, anchor)
  return normalizeAnchor(anchor)
}

function parsePaint(
  o: Record<string, unknown>,
  legacy: boolean,
  size: VectorBoardSize,
): Pick<
  VectorBoardStroke,
  | 'stroke'
  | 'strokeWidth'
  | 'strokeOpacity'
  | 'fill'
  | 'fillOpacity'
  | 'fillRule'
  | 'lineCap'
  | 'lineJoin'
> {
  const stroke = typeof o.stroke === 'string' ? o.stroke : VECTOR_DEFAULT_STROKE_COLOR
  const legacyWidth = finiteNumber(o.strokeWidthN, 0)
  const widthFromDoc = finiteNumber(o.strokeWidth, Number.NaN)
  const strokeWidth = legacy
    ? legacyWidth * Math.min(size.width, size.height)
    : Number.isFinite(widthFromDoc)
      ? widthFromDoc
      : legacyWidth > 0
        ? legacyWidth * Math.min(size.width, size.height)
        : VECTOR_DEFAULT_STROKE_WIDTH
  const fill = typeof o.fill === 'string' ? o.fill : ''
  const fillRule =
    typeof o.fillRule === 'string' && VALID_FILL_RULES.includes(o.fillRule as VectorFillRule)
      ? (o.fillRule as VectorFillRule)
      : 'nonzero'
  const lineCap =
    typeof o.lineCap === 'string' && VALID_LINE_CAPS.includes(o.lineCap as VectorLineCap)
      ? (o.lineCap as VectorLineCap)
      : 'round'
  const lineJoin =
    typeof o.lineJoin === 'string' && VALID_LINE_JOINS.includes(o.lineJoin as VectorLineJoin)
      ? (o.lineJoin as VectorLineJoin)
      : 'round'
  return {
    stroke,
    strokeWidth: Math.max(0, strokeWidth),
    strokeOpacity: clamp(finiteNumber(o.strokeOpacity, 1), 0, 1),
    fill,
    fillOpacity: clamp(finiteNumber(o.fillOpacity, 1), 0, 1),
    fillRule,
    lineCap,
    lineJoin,
  }
}

export function strokeFromUnknown(
  row: unknown,
  options: { legacyNormalized?: boolean; size?: VectorBoardSize } = {},
): VectorBoardStroke | null {
  if (!row || typeof row !== 'object') return null
  const o = row as Record<string, unknown>
  const size = sanitizeBoardSize(options.size)
  const legacy = options.legacyNormalized === true
  const sx = legacy ? size.width : 1
  const sy = legacy ? size.height : 1

  const anchorsRaw = Array.isArray(o.penAnchors) ? o.penAnchors : []
  const penAnchors = anchorsRaw
    .map((a) => parseAnchor(a, legacy, size))
    .filter((a): a is VectorPenAnchor => a != null)
  const pointsRaw = Array.isArray(o.points) ? o.points : []
  const points: VectorPoint[] = []
  for (const p of pointsRaw) {
    if (!Array.isArray(p) || p.length < 2) continue
    const x = finiteNumber(p[0], Number.NaN) * sx
    const y = finiteNumber(p[1], Number.NaN) * sy
    if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y])
  }

  const hasAnchors = penAnchors.length >= 2
  if (points.length < 2 && !hasAnchors) return null

  const kindRaw = typeof o.kind === 'string' ? o.kind : 'pen'
  const kind = VALID_KINDS.includes(kindRaw as VectorStrokeKind)
    ? (kindRaw as VectorStrokeKind)
    : 'pen'
  const paint = parsePaint(o, legacy, size)
  const stroke: VectorBoardStroke = {
    id: typeof o.id === 'string' && o.id.length > 0 ? o.id : crypto.randomUUID(),
    kind,
    points,
    ...paint,
  }
  if (hasAnchors) stroke.penAnchors = penAnchors
  if (o.penClosed === true) stroke.penClosed = true
  return stroke
}

function migrateLegacyDocument(
  raw: Record<string, unknown>,
  version: 1 | 2,
): VectorBoardDocument {
  const size = sanitizeBoardSize(
    raw.size && typeof raw.size === 'object'
      ? (raw.size as Partial<VectorBoardSize>)
      : defaultVectorBoardSize(),
  )
  const layersRaw =
    version === 1
      ? [
          {
            id: crypto.randomUUID(),
            name: 'Layer 1',
            visible: true,
            strokes: Array.isArray(raw.strokes) ? raw.strokes : [],
          },
        ]
      : Array.isArray(raw.layers)
        ? raw.layers
        : []

  const layers: VectorBoardLayer[] = []
  for (const layerRow of layersRaw) {
    if (!layerRow || typeof layerRow !== 'object') continue
    const layer = layerRow as Record<string, unknown>
    const strokesRaw = Array.isArray(layer.strokes) ? layer.strokes : []
    const strokes = strokesRaw
      .map((s) => strokeFromUnknown(s, { legacyNormalized: true, size }))
      .filter((s): s is VectorBoardStroke => s != null)
    layers.push({
      id: typeof layer.id === 'string' ? layer.id : crypto.randomUUID(),
      name: typeof layer.name === 'string' ? layer.name : 'Layer',
      visible: layer.visible !== false,
      strokes,
    })
  }
  if (layers.length === 0) {
    const layer = createVectorBoardLayer('Layer 1')
    return {
      v: VECTOR_BOARD_DOC_VERSION,
      size,
      layers: [layer],
      activeLayerId: layer.id,
    }
  }
  let activeLayerId =
    typeof raw.activeLayerId === 'string' ? raw.activeLayerId : layers[0]!.id
  if (!layers.some((l) => l.id === activeLayerId)) activeLayerId = layers[0]!.id
  return { v: VECTOR_BOARD_DOC_VERSION, size, layers, activeLayerId }
}

function migrateV3(raw: Record<string, unknown>): VectorBoardDocument {
  const size = sanitizeBoardSize(
    raw.size && typeof raw.size === 'object'
      ? (raw.size as Partial<VectorBoardSize>)
      : defaultVectorBoardSize(),
  )
  const layersRaw = Array.isArray(raw.layers) ? raw.layers : []
  const layers: VectorBoardLayer[] = []
  for (const layerRow of layersRaw) {
    if (!layerRow || typeof layerRow !== 'object') continue
    const layer = layerRow as Record<string, unknown>
    const strokesRaw = Array.isArray(layer.strokes) ? layer.strokes : []
    const strokes = strokesRaw
      .map((s) => strokeFromUnknown(s, { size }))
      .filter((s): s is VectorBoardStroke => s != null)
    layers.push({
      id: typeof layer.id === 'string' ? layer.id : crypto.randomUUID(),
      name: typeof layer.name === 'string' ? layer.name : 'Layer',
      visible: layer.visible !== false,
      strokes,
    })
  }
  if (layers.length === 0) return emptyVectorBoardDocument(size)
  let activeLayerId =
    typeof raw.activeLayerId === 'string' ? raw.activeLayerId : layers[0]!.id
  if (!layers.some((l) => l.id === activeLayerId)) activeLayerId = layers[0]!.id
  return { v: VECTOR_BOARD_DOC_VERSION, size, layers, activeLayerId }
}

export function migrateVectorBoardDocument(raw: unknown): VectorBoardDocument {
  if (!raw || typeof raw !== 'object') return emptyVectorBoardDocument()
  const o = raw as Record<string, unknown>
  if (o.v === VECTOR_BOARD_DOC_VERSION) return migrateV3(o)
  if (o.v === 2) return migrateLegacyDocument(o, 2)
  if (o.v === 1) return migrateLegacyDocument(o, 1)
  // Unknown / missing version: try the newest parser, then legacy v2.
  if (Array.isArray(o.layers)) {
    const v3 = migrateV3(o)
    if (v3.layers.some((l) => l.strokes.length > 0)) return v3
  }
  if (Array.isArray(o.strokes)) return migrateLegacyDocument(o, 1)
  return emptyVectorBoardDocument()
}

export function getActiveLayer(doc: VectorBoardDocument): VectorBoardLayer | undefined {
  return doc.layers.find((l) => l.id === doc.activeLayerId)
}

export function flattenVisibleStrokes(doc: VectorBoardDocument): VectorBoardStroke[] {
  return doc.layers.filter((l) => l.visible).flatMap((l) => l.strokes)
}

export function vectorDocHasRenderableStrokes(doc: VectorBoardDocument): boolean {
  return flattenVisibleStrokes(doc).some((s) => strokeIsRenderable(s))
}

export function countDocumentStrokes(doc: VectorBoardDocument): number {
  return doc.layers.reduce((sum, l) => sum + l.strokes.length, 0)
}

export function countDocumentAnchors(doc: VectorBoardDocument): number {
  let total = 0
  for (const layer of doc.layers) {
    for (const stroke of layer.strokes) {
      total += stroke.penAnchors?.length ?? stroke.points.length
    }
  }
  return total
}

export function findStrokeInDoc(
  doc: VectorBoardDocument,
  selection: VectorSelection,
): VectorBoardStroke | null {
  const layer = doc.layers.find((l) => l.id === selection.layerId)
  return layer?.strokes.find((s) => s.id === selection.strokeId) ?? null
}

function strokeHitTest(
  stroke: VectorBoardStroke,
  point: VectorPoint,
  tolerance: number,
): boolean {
  if (!strokeIsRenderable(stroke)) return false
  const strokeVisible =
    stroke.stroke &&
    stroke.stroke !== 'transparent' &&
    stroke.strokeWidth > 0 &&
    stroke.strokeOpacity > 0
  const halfWidth = strokeVisible ? stroke.strokeWidth / 2 : 0
  const hit = nearestPointOnStroke(stroke, point)
  if (hit && hit.distance <= tolerance + halfWidth) return true
  if (
    stroke.fill &&
    stroke.fill !== 'transparent' &&
    stroke.fillOpacity > 0 &&
    pointInStroke(stroke, point)
  ) {
    return true
  }
  return false
}

export function findTopStrokeAt(
  doc: VectorBoardDocument,
  point: VectorPoint,
  tolerance: number,
): { layerId: string; stroke: VectorBoardStroke } | null {
  for (let li = doc.layers.length - 1; li >= 0; li -= 1) {
    const layer = doc.layers[li]!
    if (!layer.visible) continue
    for (let si = layer.strokes.length - 1; si >= 0; si -= 1) {
      const stroke = layer.strokes[si]!
      if (strokeHitTest(stroke, point, tolerance)) {
        return { layerId: layer.id, stroke }
      }
    }
  }
  return null
}

export function findStrokesIntersectingRect(
  doc: VectorBoardDocument,
  rect: VectorBounds,
): VectorSelection[] {
  const out: VectorSelection[] = []
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    for (const stroke of layer.strokes) {
      if (!strokeIsRenderable(stroke)) continue
      if (strokeIntersectsBounds(stroke, rect, 0)) {
        out.push({ layerId: layer.id, strokeId: stroke.id })
      }
    }
  }
  return out
}

export function translateVectorStroke(
  stroke: VectorBoardStroke,
  dx: number,
  dy: number,
): VectorBoardStroke {
  const next: VectorBoardStroke = {
    ...stroke,
    points: stroke.points.map((p) => [p[0] + dx, p[1] + dy] as VectorPoint),
  }
  if (stroke.penAnchors) next.penAnchors = translateAnchors(stroke.penAnchors, dx, dy)
  return next
}

export function scaleVectorStroke(
  stroke: VectorBoardStroke,
  ax: number,
  ay: number,
  sx: number,
  sy: number,
  scaleStrokeWidth = true,
): VectorBoardStroke {
  const next: VectorBoardStroke = {
    ...stroke,
    points: stroke.points.map(
      (p) => [ax + (p[0] - ax) * sx, ay + (p[1] - ay) * sy] as VectorPoint,
    ),
  }
  if (stroke.penAnchors) next.penAnchors = scaleAnchors(stroke.penAnchors, ax, ay, sx, sy)
  if (scaleStrokeWidth) {
    const factor = (Math.abs(sx) + Math.abs(sy)) / 2
    next.strokeWidth = Math.max(0, stroke.strokeWidth * factor)
  }
  return next
}

function selectionKey(selection: VectorSelection): string {
  return `${selection.layerId}:${selection.strokeId}`
}

function buildSelectionSet(selections: readonly VectorSelection[]): Set<string> {
  const set = new Set<string>()
  for (const selection of selections) set.add(selectionKey(selection))
  return set
}

export function applyTranslateStrokesInDoc(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
  dx: number,
  dy: number,
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const index = buildSelectionSet(selections)
  return {
    ...doc,
    layers: doc.layers.map((layer) => ({
      ...layer,
      strokes: layer.strokes.map((s) =>
        index.has(`${layer.id}:${s.id}`) ? translateVectorStroke(s, dx, dy) : s,
      ),
    })),
  }
}

export function applyScaleStrokesInDoc(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
  ax: number,
  ay: number,
  sx: number,
  sy: number,
  scaleStrokeWidth = true,
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const index = buildSelectionSet(selections)
  return {
    ...doc,
    layers: doc.layers.map((layer) => ({
      ...layer,
      strokes: layer.strokes.map((s) =>
        index.has(`${layer.id}:${s.id}`)
          ? scaleVectorStroke(s, ax, ay, sx, sy, scaleStrokeWidth)
          : s,
      ),
    })),
  }
}

export function removeStrokesFromDoc(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const index = buildSelectionSet(selections)
  return {
    ...doc,
    layers: doc.layers.map((layer) => ({
      ...layer,
      strokes: layer.strokes.filter((s) => !index.has(`${layer.id}:${s.id}`)),
    })),
  }
}

export function getStrokesForSelections(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
): VectorBoardStroke[] {
  const index = buildSelectionSet(selections)
  const out: VectorBoardStroke[] = []
  for (const layer of doc.layers) {
    for (const stroke of layer.strokes) {
      if (index.has(`${layer.id}:${stroke.id}`)) out.push(stroke)
    }
  }
  return out
}

export function cloneVectorBoardStroke(stroke: VectorBoardStroke): VectorBoardStroke {
  return {
    ...stroke,
    id: crypto.randomUUID(),
    points: stroke.points.map((p) => [p[0], p[1]] as VectorPoint),
    penAnchors: stroke.penAnchors?.map((a) => ({ ...a })),
  }
}

export function duplicateSelectionsInPlace(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
): { doc: VectorBoardDocument; newSelections: VectorSelection[] } | null {
  if (selections.length === 0) return null
  const index = buildSelectionSet(selections)
  const newSelections: VectorSelection[] = []
  let mutated = false
  const layers = doc.layers.map((layer) => {
    const next: VectorBoardStroke[] = []
    for (const stroke of layer.strokes) {
      next.push(stroke)
      if (index.has(`${layer.id}:${stroke.id}`)) {
        const clone = cloneVectorBoardStroke(stroke)
        next.push(clone)
        newSelections.push({ layerId: layer.id, strokeId: clone.id })
        mutated = true
      }
    }
    return mutated ? { ...layer, strokes: next } : layer
  })
  return mutated ? { doc: { ...doc, layers }, newSelections } : null
}

type ZOrderOp = 'front' | 'back' | 'forward' | 'backward'

function reorderStrokes(
  strokes: VectorBoardStroke[],
  selected: Set<string>,
  op: ZOrderOp,
): VectorBoardStroke[] {
  if (strokes.length === 0) return strokes
  const selectedInOrder = strokes.filter((s) => selected.has(s.id))
  if (selectedInOrder.length === 0) return strokes
  if (op === 'front') {
    return [...strokes.filter((s) => !selected.has(s.id)), ...selectedInOrder]
  }
  if (op === 'back') {
    return [...selectedInOrder, ...strokes.filter((s) => !selected.has(s.id))]
  }
  const out = strokes.slice()
  if (op === 'forward') {
    for (let i = out.length - 2; i >= 0; i -= 1) {
      const s = out[i]!
      if (!selected.has(s.id)) continue
      const next = out[i + 1]!
      if (selected.has(next.id)) continue
      out[i] = next
      out[i + 1] = s
    }
  } else {
    for (let i = 1; i < out.length; i += 1) {
      const s = out[i]!
      if (!selected.has(s.id)) continue
      const prev = out[i - 1]!
      if (selected.has(prev.id)) continue
      out[i] = prev
      out[i - 1] = s
    }
  }
  return out
}

export function applyZOrderInDoc(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
  op: ZOrderOp,
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const byLayer = new Map<string, Set<string>>()
  for (const selection of selections) {
    const set = byLayer.get(selection.layerId) ?? new Set<string>()
    set.add(selection.strokeId)
    byLayer.set(selection.layerId, set)
  }
  return {
    ...doc,
    layers: doc.layers.map((layer) => {
      const ids = byLayer.get(layer.id)
      return ids ? { ...layer, strokes: reorderStrokes(layer.strokes, ids, op) } : layer
    }),
  }
}

export function updateStrokeInDocFull(
  doc: VectorBoardDocument,
  layerId: string,
  strokeId: string,
  patch: Partial<VectorBoardStroke>,
): VectorBoardDocument {
  return {
    ...doc,
    layers: doc.layers.map((layer) =>
      layer.id !== layerId
        ? layer
        : {
            ...layer,
            strokes: layer.strokes.map((s) => (s.id !== strokeId ? s : { ...s, ...patch })),
          },
    ),
  }
}

export type VectorPaintPatch = Partial<
  Pick<
    VectorBoardStroke,
    | 'stroke'
    | 'strokeWidth'
    | 'strokeOpacity'
    | 'fill'
    | 'fillOpacity'
    | 'fillRule'
    | 'lineCap'
    | 'lineJoin'
  >
>

export function updateVectorStrokeInDoc(
  doc: VectorBoardDocument,
  layerId: string,
  strokeId: string,
  patch: VectorPaintPatch,
): VectorBoardDocument {
  return updateStrokeInDocFull(doc, layerId, strokeId, patch)
}

export function updateSelectionPaint(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
  patch: VectorPaintPatch,
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const index = buildSelectionSet(selections)
  return {
    ...doc,
    layers: doc.layers.map((layer) => ({
      ...layer,
      strokes: layer.strokes.map((s) =>
        index.has(`${layer.id}:${s.id}`) ? { ...s, ...patch } : s,
      ),
    })),
  }
}

export function insertStrokeIntoActiveLayer(
  doc: VectorBoardDocument,
  stroke: VectorBoardStroke,
): VectorBoardDocument {
  const active = getActiveLayer(doc)
  if (!active) return doc
  return {
    ...doc,
    layers: doc.layers.map((layer) =>
      layer.id === active.id ? { ...layer, strokes: [...layer.strokes, stroke] } : layer,
    ),
  }
}

export function insertStrokeCloneAfterInDoc(
  doc: VectorBoardDocument,
  layerId: string,
  strokeId: string,
): { doc: VectorBoardDocument; newStrokeId: string } | null {
  const layer = doc.layers.find((l) => l.id === layerId)
  if (!layer) return null
  const index = layer.strokes.findIndex((s) => s.id === strokeId)
  if (index < 0) return null
  const clone = cloneVectorBoardStroke(layer.strokes[index]!)
  const strokes = [
    ...layer.strokes.slice(0, index + 1),
    clone,
    ...layer.strokes.slice(index + 1),
  ]
  return {
    doc: {
      ...doc,
      layers: doc.layers.map((l) => (l.id === layerId ? { ...l, strokes } : l)),
    },
    newStrokeId: clone.id,
  }
}

export function appendClonedStrokesToActiveLayer(
  doc: VectorBoardDocument,
  strokes: readonly VectorBoardStroke[],
  dx: number,
  dy: number,
): { doc: VectorBoardDocument; newStrokeIds: string[] } | null {
  const active = getActiveLayer(doc)
  if (!active || !active.visible) return null
  const newStrokeIds: string[] = []
  const next = strokes.map((stroke) => {
    const clone = cloneVectorBoardStroke(stroke)
    newStrokeIds.push(clone.id)
    return translateVectorStroke(clone, dx, dy)
  })
  return {
    doc: {
      ...doc,
      layers: doc.layers.map((layer) =>
        layer.id === active.id ? { ...layer, strokes: [...layer.strokes, ...next] } : layer,
      ),
    },
    newStrokeIds,
  }
}

export function serializeVectorStrokesForClipboard(strokes: readonly VectorBoardStroke[]): string {
  return JSON.stringify({
    avnacVectorStrokeClip: true,
    v: 2,
    strokes,
  })
}

export function parseVectorStrokeClipboardText(
  text: string,
): VectorBoardStroke[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  if (o.avnacVectorStrokeClip !== true || !Array.isArray(o.strokes)) return null
  const version = o.v === 2 ? 2 : 1
  const legacy = version === 1
  const strokes: VectorBoardStroke[] = []
  for (const row of o.strokes) {
    const stroke = strokeFromUnknown(row, {
      legacyNormalized: legacy,
      size: defaultVectorBoardSize(),
    })
    if (stroke) strokes.push(stroke)
  }
  return strokes.length > 0 ? strokes : null
}

const selectionBoundsCache = new WeakMap<
  readonly VectorSelection[],
  { doc: VectorBoardDocument; bounds: VectorBounds | null }
>()

export function selectionBounds(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
): VectorBounds | null {
  if (selections.length === 0) return null
  const cached = selectionBoundsCache.get(selections)
  if (cached && cached.doc === doc) return cached.bounds
  const index = buildSelectionSet(selections)
  let bounds: VectorBounds | null = null
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    for (const stroke of layer.strokes) {
      if (!index.has(`${layer.id}:${stroke.id}`)) continue
      const b = strokeBounds(stroke)
      if (b) bounds = unionBounds(bounds, b)
    }
  }
  const result = bounds && isBoundsValid(bounds) ? bounds : null
  selectionBoundsCache.set(selections, { doc, bounds: result })
  return result
}

export function allStrokeSelections(doc: VectorBoardDocument): VectorSelection[] {
  const out: VectorSelection[] = []
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    for (const stroke of layer.strokes) {
      out.push({ layerId: layer.id, strokeId: stroke.id })
    }
  }
  return out
}

export function selectionContains(
  selections: readonly VectorSelection[],
  selection: VectorSelection,
): boolean {
  return selections.some(
    (s) => s.layerId === selection.layerId && s.strokeId === selection.strokeId,
  )
}

export function filterSelectionsForDoc(
  doc: VectorBoardDocument,
  selections: readonly VectorSelection[],
): VectorSelection[] {
  const out: VectorSelection[] = []
  for (const selection of selections) {
    if (findStrokeInDoc(doc, selection)) out.push(selection)
  }
  return out
}

export function setLayerVisible(
  doc: VectorBoardDocument,
  layerId: string,
  visible: boolean,
): VectorBoardDocument {
  return {
    ...doc,
    layers: doc.layers.map((layer) =>
      layer.id === layerId ? { ...layer, visible } : layer,
    ),
  }
}

export function renameLayer(
  doc: VectorBoardDocument,
  layerId: string,
  name: string,
): VectorBoardDocument {
  return {
    ...doc,
    layers: doc.layers.map((layer) => (layer.id === layerId ? { ...layer, name } : layer)),
  }
}

export function addLayer(doc: VectorBoardDocument, name?: string): VectorBoardDocument {
  const layer = createVectorBoardLayer(name ?? `Layer ${doc.layers.length + 1}`)
  return {
    ...doc,
    layers: [...doc.layers, layer],
    activeLayerId: layer.id,
  }
}

export function deleteLayer(doc: VectorBoardDocument, layerId: string): VectorBoardDocument {
  if (doc.layers.length <= 1) return doc
  const layers = doc.layers.filter((layer) => layer.id !== layerId)
  const activeLayerId =
    doc.activeLayerId === layerId ? layers[0]!.id : doc.activeLayerId
  return { ...doc, layers, activeLayerId }
}

export function moveLayer(
  doc: VectorBoardDocument,
  layerId: string,
  direction: -1 | 1,
): VectorBoardDocument {
  const index = doc.layers.findIndex((layer) => layer.id === layerId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= doc.layers.length) return doc
  const layers = [...doc.layers]
  const temp = layers[index]!
  layers[index] = layers[target]!
  layers[target] = temp
  return { ...doc, layers }
}

export function clearLayer(doc: VectorBoardDocument, layerId: string): VectorBoardDocument {
  return {
    ...doc,
    layers: doc.layers.map((layer) =>
      layer.id === layerId ? { ...layer, strokes: [] } : layer,
    ),
  }
}

export function setActiveLayer(doc: VectorBoardDocument, layerId: string): VectorBoardDocument {
  if (!doc.layers.some((layer) => layer.id === layerId)) return doc
  return { ...doc, activeLayerId: layerId }
}

export function cloneVectorBoardDocument(doc: VectorBoardDocument): VectorBoardDocument {
  return {
    ...doc,
    size: { ...doc.size },
    layers: doc.layers.map((layer) => ({
      ...layer,
      strokes: layer.strokes.map((stroke) => ({
        ...stroke,
        points: stroke.points.map((p) => [p[0], p[1]] as VectorPoint),
        penAnchors: stroke.penAnchors?.map((a) => ({ ...a })),
      })),
    })),
  }
}

export function documentStrokeSvg(stroke: VectorBoardStroke): string {
  return strokeToSvgData(stroke)
}

/** Only useful for tests and diagnostics; O(n) but never on the paint path. */
export function estimateDocumentBytes(doc: VectorBoardDocument): number {
  let bytes = 256
  for (const layer of doc.layers) {
    bytes += 120
    for (const stroke of layer.strokes) {
      bytes += 180
      bytes += stroke.stroke.length + stroke.fill.length
      bytes += stroke.points.length * 24
      if (stroke.penAnchors) {
        bytes += stroke.penAnchors.length * 90
      }
    }
  }
  return bytes
}

export { VECTOR_HISTORY_MAX_ENTRIES }
