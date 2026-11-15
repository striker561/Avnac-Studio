import type {
  VectorBoardDocument,
  VectorBoardLayer,
  VectorBoardStroke,
  VectorBounds,
  VectorDraft,
  VectorPenAnchor,
  VectorPoint,
  VectorResizeHandleId,
  VectorViewport,
} from './types'
import {
  VECTOR_ANCHOR_SIZE_PX,
  VECTOR_BOARD_GRID_STEP,
  VECTOR_HANDLE_RADIUS_PX,
  VECTOR_RESIZE_HANDLE_SIZE_PX,
} from './constants'
import { boardToScreen } from './view'
import { buildStrokePath, strokeCanFill, type VectorPath } from './path'
import { anchorIn, anchorOut } from './node-types'
import type { SnapGuide } from './snap'

/** Screen-space sizes stay constant no matter the zoom (R6). */
const HANDLE_LINE = 'rgba(37,99,235,0.55)'
const ACCENT = '#2563eb'
const ACCENT_DARK = '#1e40af'
const NODE_FILL = '#ffffff'
const SNAP_COLOR = '#d946ef'
const BOARD_BG = '#f8f8f7'
const GRID_MINOR = 'rgba(10,10,10,0.055)'
const GRID_MAJOR = 'rgba(10,10,10,0.09)'

export const VECTOR_PAINT_THEME = {
  accent: ACCENT,
  accentDark: ACCENT_DARK,
  handleLine: HANDLE_LINE,
  nodeFill: NODE_FILL,
  snap: SNAP_COLOR,
  boardBackground: BOARD_BG,
} as const

function tracePath(ctx: CanvasRenderingContext2D, path: VectorPath): boolean {
  let has = false
  for (const sub of path.subpaths) {
    if (sub.segments.length === 0) continue
    ctx.moveTo(sub.start[0], sub.start[1])
    for (const segment of sub.segments) {
      if (segment.kind === 'line') {
        ctx.lineTo(segment.p3[0], segment.p3[1])
      } else {
        ctx.bezierCurveTo(
          segment.p1[0],
          segment.p1[1],
          segment.p2[0],
          segment.p2[1],
          segment.p3[0],
          segment.p3[1],
        )
      }
    }
    if (sub.closed) ctx.closePath()
    has = true
  }
  return has
}

function paintArrow(ctx: CanvasRenderingContext2D, stroke: VectorBoardStroke): void {
  if (stroke.points.length < 2) return
  const [x0, y0] = stroke.points[0]!
  const [x1, y1] = stroke.points[1]!
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return
  const ux = dx / len
  const uy = dy / len
  const head = Math.min(len * 0.35, 28 + stroke.strokeWidth * 4)
  const wing = Math.max(stroke.strokeWidth * 2.2, head * 0.42)
  const bx = x1 - ux * head
  const by = y1 - uy * head
  const px = -uy
  const py = ux
  const strokeVisible = stroke.stroke && stroke.strokeWidth > 0
  if (strokeVisible) {
    ctx.save()
    ctx.strokeStyle = stroke.stroke
    ctx.lineWidth = stroke.strokeWidth
    ctx.lineCap = stroke.lineCap
    ctx.lineJoin = stroke.lineJoin
    ctx.globalAlpha = stroke.strokeOpacity
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(bx, by)
    ctx.stroke()
    ctx.globalAlpha = stroke.strokeOpacity
    ctx.fillStyle = stroke.stroke
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(bx + px * wing, by + py * wing)
    ctx.lineTo(bx - px * wing, by - py * wing)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    return
  }
  if (stroke.fill && stroke.fill !== 'transparent') {
    ctx.save()
    ctx.fillStyle = stroke.fill
    ctx.globalAlpha = stroke.fillOpacity
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(bx + px * wing, by + py * wing)
    ctx.lineTo(bx - px * wing, by - py * wing)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

export function paintVectorStroke(ctx: CanvasRenderingContext2D, stroke: VectorBoardStroke): void {
  if (stroke.kind === 'arrow') {
    paintArrow(ctx, stroke)
    return
  }
  const path = buildStrokePath(stroke)
  if (path.subpaths.length === 0) return
  ctx.save()
  ctx.lineCap = stroke.lineCap
  ctx.lineJoin = stroke.lineJoin
  const fillVisible =
    stroke.fill.length > 0 &&
    stroke.fill !== 'transparent' &&
    stroke.fillOpacity > 0 &&
    strokeCanFill(stroke)
  const strokeVisible =
    stroke.stroke.length > 0 &&
    stroke.stroke !== 'transparent' &&
    stroke.strokeWidth > 0 &&
    stroke.strokeOpacity > 0
  if (fillVisible) {
    ctx.beginPath()
    if (tracePath(ctx, path)) {
      ctx.fillStyle = stroke.fill
      ctx.globalAlpha = stroke.fillOpacity
      ctx.fill(stroke.fillRule)
    }
  }
  if (strokeVisible) {
    ctx.beginPath()
    if (tracePath(ctx, path)) {
      ctx.strokeStyle = stroke.stroke
      ctx.lineWidth = stroke.strokeWidth
      ctx.globalAlpha = stroke.strokeOpacity
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function paintVectorLayer(ctx: CanvasRenderingContext2D, layer: VectorBoardLayer): void {
  for (const stroke of layer.strokes) paintVectorStroke(ctx, stroke)
}

export function paintVectorDocument(ctx: CanvasRenderingContext2D, doc: VectorBoardDocument): void {
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    paintVectorLayer(ctx, layer)
  }
}

/** Paint a single layer into a board-sized cache canvas. */
export function paintLayerToCacheCanvas(
  canvas: HTMLCanvasElement,
  layer: VectorBoardLayer,
  pixelRatio: number,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  paintVectorLayer(ctx, layer)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

/** Board background, shadow, grid and border, in screen space. */
export function paintBoardSurface(
  ctx: CanvasRenderingContext2D,
  board: { width: number; height: number },
  view: VectorViewport,
  width: number,
  height: number,
): void {
  const scale = view.scale
  const x = view.tx
  const y = view.ty
  const w = board.width * scale
  const h = board.height * scale

  ctx.save()
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#e8e8e6'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.shadowColor = 'rgba(15,23,42,0.18)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 4
  ctx.fillStyle = BOARD_BG
  ctx.fillRect(x, y, w, h)
  ctx.restore()

  // Grid: skip when it would turn into noise at low zoom.
  const step = VECTOR_BOARD_GRID_STEP * scale
  if (step >= 7) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.lineWidth = 1
    const startCol = Math.floor(Math.max(0, x) / step)
    const endCol = Math.ceil(Math.min(width, x + w) / step)
    for (let i = startCol; i <= endCol; i += 1) {
      const px = x + i * step
      if (px < x - 1 || px > x + w + 1) continue
      ctx.strokeStyle = i % 5 === 0 ? GRID_MAJOR : GRID_MINOR
      ctx.beginPath()
      ctx.moveTo(px + 0.5, y)
      ctx.lineTo(px + 0.5, y + h)
      ctx.stroke()
    }
    const startRow = Math.floor(Math.max(0, y) / step)
    const endRow = Math.ceil(Math.min(height, y + h) / step)
    for (let i = startRow; i <= endRow; i += 1) {
      const py = y + i * step
      if (py < y - 1 || py > y + h + 1) continue
      ctx.strokeStyle = i % 5 === 0 ? GRID_MAJOR : GRID_MINOR
      ctx.beginPath()
      ctx.moveTo(x, py + 0.5)
      ctx.lineTo(x + w, py + 0.5)
      ctx.stroke()
    }
    ctx.restore()
  }

  ctx.strokeStyle = 'rgba(15,23,42,0.16)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1))
  ctx.restore()
}

function paintNodeGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: VectorPenAnchor['type'],
  selected: boolean,
  sizePx = VECTOR_ANCHOR_SIZE_PX,
): void {
  const size = selected ? sizePx + 2 : sizePx
  const half = size / 2
  ctx.save()
  ctx.fillStyle = selected ? ACCENT : NODE_FILL
  ctx.strokeStyle = selected ? ACCENT_DARK : ACCENT
  ctx.lineWidth = 1.25
  ctx.beginPath()
  if (type === 'corner') {
    ctx.rect(x - half, y - half, size, size)
  } else if (type === 'cusp') {
    ctx.moveTo(x, y - half - 1)
    ctx.lineTo(x + half + 1, y)
    ctx.lineTo(x, y + half + 1)
    ctx.lineTo(x - half - 1, y)
    ctx.closePath()
  } else {
    ctx.arc(x, y, half + 0.5, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.stroke()
  if (type === 'symmetric') {
    ctx.fillStyle = selected ? '#ffffff' : ACCENT
    ctx.beginPath()
    ctx.arc(x, y, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function paintHandleDot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save()
  ctx.fillStyle = ACCENT
  ctx.beginPath()
  ctx.arc(x, y, VECTOR_HANDLE_RADIUS_PX, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function traceAnchorsOnScreen(
  ctx: CanvasRenderingContext2D,
  anchors: readonly VectorPenAnchor[],
  view: VectorViewport,
  closed: boolean,
): void {
  if (anchors.length < 2) return
  const first = boardToScreen([anchors[0]!.x, anchors[0]!.y], view)
  ctx.moveTo(first[0], first[1])
  const count = closed ? anchors.length : anchors.length - 1
  for (let i = 0; i < count; i += 1) {
    const a = anchors[i]!
    const b = anchors[(i + 1) % anchors.length]!
    const out = anchorOut(a) ?? [a.x, a.y]
    const inPoint = anchorIn(b) ?? [b.x, b.y]
    const c1 = boardToScreen(out, view)
    const c2 = boardToScreen(inPoint, view)
    const end = boardToScreen([b.x, b.y], view)
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1])
  }
  if (closed) ctx.closePath()
}

export type PenDraftPaintOptions = {
  strokeColor: string
  strokeWidth: number
  fillColor: string
  closeHover: boolean
  removeHintIndex: number | null
  selectedAnchor: number | null
}

export function paintPenDraft(
  ctx: CanvasRenderingContext2D,
  draft: Extract<VectorDraft, { kind: 'pen' }>,
  view: VectorViewport,
  options: PenDraftPaintOptions,
): void {
  const { anchors } = draft
  if (anchors.length === 0) return
  const strokePx = options.strokeWidth * view.scale
  const hasStroke = options.strokeColor && options.strokeColor !== 'transparent' && strokePx > 0
  const hasFill = options.fillColor && options.fillColor !== 'transparent'

  ctx.save()
  if (anchors.length >= 2) {
    if (options.closeHover && hasFill && anchors.length >= 3) {
      ctx.beginPath()
      traceAnchorsOnScreen(ctx, anchors, view, true)
      ctx.fillStyle = options.fillColor
      ctx.globalAlpha = 0.35
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.beginPath()
    traceAnchorsOnScreen(ctx, anchors, view, false)
    ctx.strokeStyle = hasStroke ? options.strokeColor : 'rgba(71,85,105,0.82)'
    ctx.lineWidth = hasStroke ? Math.max(0.75, strokePx) : 1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  if (options.closeHover && anchors.length >= 2) {
    const last = anchors[anchors.length - 1]!
    const first = anchors[0]!
    const start = boardToScreen([last.x, last.y], view)
    const out = anchorOut(last) ?? [last.x, last.y]
    const inPoint = anchorIn(first) ?? [first.x, first.y]
    const c1 = boardToScreen(out, view)
    const c2 = boardToScreen(inPoint, view)
    const end = boardToScreen([first.x, first.y], view)
    ctx.save()
    ctx.strokeStyle = 'rgba(37,99,235,0.9)'
    ctx.lineWidth = Math.max(1, strokePx || 1)
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(start[0], start[1])
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1])
    ctx.stroke()
    ctx.restore()
  }

  for (let i = 0; i < anchors.length; i += 1) {
    const a = anchors[i]!
    const p = boardToScreen([a.x, a.y], view)
    const inPoint = anchorIn(a)
    const outPoint = anchorOut(a)
    if (inPoint) {
      const q = boardToScreen(inPoint, view)
      ctx.strokeStyle = HANDLE_LINE
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(q[0], q[1])
      ctx.stroke()
      paintHandleDot(ctx, q[0], q[1])
    }
    if (outPoint) {
      const q = boardToScreen(outPoint, view)
      ctx.strokeStyle = HANDLE_LINE
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(q[0], q[1])
      ctx.stroke()
      paintHandleDot(ctx, q[0], q[1])
    }
  }
  for (let i = 0; i < anchors.length; i += 1) {
    const p = boardToScreen([anchors[i]!.x, anchors[i]!.y], view)
    paintNodeGlyph(ctx, p[0], p[1], anchors[i]!.type, options.selectedAnchor === i)
    if (options.removeHintIndex === i) {
      const k = 6
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 1.75
      ctx.beginPath()
      ctx.moveTo(p[0] - k, p[1] - k)
      ctx.lineTo(p[0] + k, p[1] + k)
      ctx.moveTo(p[0] + k, p[1] - k)
      ctx.lineTo(p[0] - k, p[1] + k)
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function paintFreehandDraft(
  ctx: CanvasRenderingContext2D,
  points: readonly VectorPoint[],
  view: VectorViewport,
  color: string,
  strokeWidth: number,
): void {
  if (points.length < 2) return
  const strokePx = strokeWidth * view.scale
  if (!color || color === 'transparent' || strokePx <= 0) return
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(0.75, strokePx)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const first = boardToScreen(points[0]!, view)
  ctx.moveTo(first[0], first[1])
  for (let i = 1; i < points.length; i += 1) {
    const p = boardToScreen(points[i]!, view)
    ctx.lineTo(p[0], p[1])
  }
  ctx.stroke()
  ctx.restore()
}

export function paintShapeDraft(
  ctx: CanvasRenderingContext2D,
  draft: Extract<VectorDraft, { kind: 'shape' }>,
  view: VectorViewport,
  fillColor: string,
): void {
  const b = draft.b ?? draft.a
  const a = boardToScreen(draft.a, view)
  const c = boardToScreen(b, view)
  const x = Math.min(a[0], c[0])
  const y = Math.min(a[1], c[1])
  const w = Math.abs(c[0] - a[0])
  const h = Math.abs(c[1] - a[1])
  ctx.save()
  ctx.beginPath()
  if (draft.tool === 'rect') {
    ctx.rect(x, y, w, h)
  } else {
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.01, w / 2), Math.max(0.01, h / 2), 0, 0, Math.PI * 2)
  }
  if (fillColor && fillColor !== 'transparent' && w > 0 && h > 0) {
    ctx.fillStyle = fillColor
    ctx.globalAlpha = 0.28
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.strokeStyle = 'rgba(15,23,42,0.34)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

export function paintMarquee(
  ctx: CanvasRenderingContext2D,
  rect: { minX: number; minY: number; maxX: number; maxY: number },
  view: VectorViewport,
): void {
  const a = boardToScreen([rect.minX, rect.minY], view)
  const b = boardToScreen([rect.maxX, rect.maxY], view)
  const x = Math.min(a[0], b[0])
  const y = Math.min(a[1], b[1])
  const w = Math.abs(b[0] - a[0])
  const h = Math.abs(b[1] - a[1])
  if (w <= 0 || h <= 0) return
  ctx.save()
  ctx.fillStyle = 'rgba(37,99,235,0.08)'
  ctx.strokeStyle = 'rgba(37,99,235,0.75)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x + 0.5, y + 0.5, w, h)
  ctx.restore()
}

export function resizeHandlePositions(
  bounds: VectorBounds,
): Record<VectorResizeHandleId, VectorPoint> {
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  return {
    nw: [bounds.minX, bounds.minY],
    n: [cx, bounds.minY],
    ne: [bounds.maxX, bounds.minY],
    e: [bounds.maxX, cy],
    se: [bounds.maxX, bounds.maxY],
    s: [cx, bounds.maxY],
    sw: [bounds.minX, bounds.maxY],
    w: [bounds.minX, cy],
  }
}

export function resizeHandleOpposite(
  bounds: VectorBounds,
  handle: VectorResizeHandleId,
): VectorPoint {
  const positions = resizeHandlePositions(bounds)
  const opposite: Record<VectorResizeHandleId, VectorResizeHandleId> = {
    nw: 'se',
    n: 's',
    ne: 'sw',
    e: 'w',
    se: 'nw',
    s: 'n',
    sw: 'ne',
    w: 'e',
  }
  return positions[opposite[handle]]
}

export function paintSelectionHandles(
  ctx: CanvasRenderingContext2D,
  bounds: VectorBounds,
  view: VectorViewport,
): void {
  const a = boardToScreen([bounds.minX, bounds.minY], view)
  const b = boardToScreen([bounds.maxX, bounds.maxY], view)
  const x = Math.min(a[0], b[0])
  const y = Math.min(a[1], b[1])
  const w = Math.max(1, Math.abs(b[0] - a[0]))
  const h = Math.max(1, Math.abs(b[1] - a[1]))
  ctx.save()
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])
  ctx.strokeRect(x + 0.5, y + 0.5, w, h)
  ctx.setLineDash([])
  const size = VECTOR_RESIZE_HANDLE_SIZE_PX
  const positions = resizeHandlePositions(bounds)
  for (const id of Object.keys(positions) as VectorResizeHandleId[]) {
    const p = boardToScreen(positions[id], view)
    ctx.fillStyle = NODE_FILL
    ctx.strokeStyle = ACCENT
    ctx.lineWidth = 1
    ctx.fillRect(p[0] - size / 2, p[1] - size / 2, size, size)
    ctx.strokeRect(p[0] - size / 2 + 0.5, p[1] - size / 2 + 0.5, size, size)
  }
  ctx.restore()
}

export type PenEditOverlayInput = {
  anchors: readonly VectorPenAnchor[]
  closed: boolean
  selectedAnchor: number | null
  addHint: { x: number; y: number } | null
}

export function paintPenEditOverlay(
  ctx: CanvasRenderingContext2D,
  input: PenEditOverlayInput,
  view: VectorViewport,
): void {
  const { anchors } = input
  if (anchors.length === 0) return
  ctx.save()
  if (anchors.length >= 2) {
    ctx.beginPath()
    traceAnchorsOnScreen(ctx, anchors, view, input.closed)
    ctx.strokeStyle = 'rgba(100,116,139,0.45)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  for (const a of anchors) {
    const p = boardToScreen([a.x, a.y], view)
    const inPoint = anchorIn(a)
    const outPoint = anchorOut(a)
    if (inPoint) {
      const q = boardToScreen(inPoint, view)
      ctx.strokeStyle = HANDLE_LINE
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(q[0], q[1])
      ctx.stroke()
      paintHandleDot(ctx, q[0], q[1])
    }
    if (outPoint) {
      const q = boardToScreen(outPoint, view)
      ctx.strokeStyle = HANDLE_LINE
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(q[0], q[1])
      ctx.stroke()
      paintHandleDot(ctx, q[0], q[1])
    }
  }
  for (let i = 0; i < anchors.length; i += 1) {
    const p = boardToScreen([anchors[i]!.x, anchors[i]!.y], view)
    paintNodeGlyph(ctx, p[0], p[1], anchors[i]!.type, input.selectedAnchor === i)
  }
  if (input.addHint) {
    const p = boardToScreen([input.addHint.x, input.addHint.y], view)
    ctx.beginPath()
    ctx.arc(p[0], p[1], 4, 0, Math.PI * 2)
    ctx.fillStyle = NODE_FILL
    ctx.fill()
    ctx.lineWidth = 1.25
    ctx.strokeStyle = ACCENT
    ctx.stroke()
  }
  ctx.restore()
}

export function paintSnapGuides(
  ctx: CanvasRenderingContext2D,
  guides: readonly SnapGuide[],
  view: VectorViewport,
): void {
  if (guides.length === 0) return
  ctx.save()
  ctx.strokeStyle = SNAP_COLOR
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  for (const guide of guides) {
    if (guide.axis === 'x') {
      const a = boardToScreen([guide.value, guide.from], view)
      const b = boardToScreen([guide.value, guide.to], view)
      ctx.beginPath()
      ctx.moveTo(a[0] + 0.5, a[1])
      ctx.lineTo(b[0] + 0.5, b[1])
      ctx.stroke()
    } else {
      const a = boardToScreen([guide.from, guide.value], view)
      const b = boardToScreen([guide.to, guide.value], view)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1] + 0.5)
      ctx.lineTo(b[0], b[1] + 0.5)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** Thin adapter used by the thumbnail component. */
export function paintVectorDocumentToBox(
  ctx: CanvasRenderingContext2D,
  doc: VectorBoardDocument,
  boxWidth: number,
  boxHeight: number,
): void {
  const scale = Math.min(boxWidth / doc.size.width, boxHeight / doc.size.height)
  const offsetX = (boxWidth - doc.size.width * scale) / 2
  const offsetY = (boxHeight - doc.size.height * scale) / 2
  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)
  paintVectorDocument(ctx, doc)
  ctx.restore()
}

/** Thumbnail/list preview: light board surface + artwork fitted into the box. */
export function renderVectorBoardDocumentPreview(
  ctx: CanvasRenderingContext2D,
  doc: VectorBoardDocument,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.fillStyle = '#f8f8f7';
  ctx.fillRect(0, 0, width, height);
  paintVectorDocumentToBox(ctx, doc, width, height);
  ctx.restore();
}

/** Transparent render used by scene placement/export fallbacks. */
export function renderVectorBoardDocumentTransparent(
  ctx: CanvasRenderingContext2D,
  doc: VectorBoardDocument,
  width: number,
  height: number,
): void {
  paintVectorDocumentToBox(ctx, doc, width, height);
}

