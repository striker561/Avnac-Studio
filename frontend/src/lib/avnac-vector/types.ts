import type { VECTOR_BOARD_DOC_VERSION } from './constants'

/** A point in document user units. */
export type VectorPoint = [number, number]

/**
 * Per-node constraint, following Inkscape's node model:
 * - corner: no handles, both adjoining segments are straight at this node.
 * - cusp: handles are independent (a corner with two curved sides).
 * - smooth: handles are collinear, lengths are independent.
 * - symmetric: handles are collinear and equal length.
 */
export type VectorNodeType = 'corner' | 'cusp' | 'smooth' | 'symmetric'

export type VectorPenAnchor = {
  x: number
  y: number
  inX?: number
  inY?: number
  outX?: number
  outY?: number
  /** Constraint enforced while editing. Required in v3 documents. */
  type: VectorNodeType
}

export type VectorFillRule = 'nonzero' | 'evenodd'
export type VectorLineCap = 'butt' | 'round' | 'square'
export type VectorLineJoin = 'miter' | 'round' | 'bevel'

export type VectorStrokeKind =
  | 'pen'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'polygon'

/**
 * Paint slots are independent: an empty string (or 'transparent') disables a
 * slot. Widths live in document units, never in screen pixels.
 */
export type VectorBoardPaint = {
  stroke: string
  /** Document units. */
  strokeWidth: number
  strokeOpacity: number
  fill: string
  fillOpacity: number
  fillRule: VectorFillRule
  lineCap: VectorLineCap
  lineJoin: VectorLineJoin
}

export type VectorBoardStroke = VectorBoardPaint & {
  id: string
  kind: VectorStrokeKind
  /** Points in document units. Interpretation depends on `kind`. */
  points: VectorPoint[]
  /** Cubic Bézier path for `kind: 'pen'`. Supersedes `points` when present. */
  penAnchors?: VectorPenAnchor[]
  /** When true, the last anchor connects back to the first. */
  penClosed?: boolean
}

export type VectorBoardLayer = {
  id: string
  name: string
  visible: boolean
  strokes: VectorBoardStroke[]
}

export type VectorBoardSize = {
  width: number
  height: number
}

export type VectorBoardDocument = {
  v: typeof VECTOR_BOARD_DOC_VERSION
  size: VectorBoardSize
  layers: VectorBoardLayer[]
  activeLayerId: string
}

/** Legacy v1 shape kept for migration only. */
export type VectorBoardDocumentV1 = {
  v: 1
  strokes: Array<Record<string, unknown>>
}

/** Legacy v2 shape kept for migration only. */
export type VectorBoardDocumentV2 = {
  v: 2
  layers: Array<{
    id?: string
    name?: string
    visible?: boolean
    strokes: Array<Record<string, unknown>>
  }>
  activeLayerId?: string
}

export type VectorViewport = {
  /** CSS pixels per document unit. */
  scale: number
  /** CSS-pixel translation applied before scale (board origin position). */
  tx: number
  ty: number
}

export type VectorBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type VectorSelection = {
  layerId: string
  strokeId: string
}

export type VectorStrokeSelection = VectorSelection

export type VectorTool =
  | 'move'
  | 'pencil'
  | 'pen'
  | 'rect'
  | 'ellipse'

export type VectorResizeHandleId =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'

export type VectorDraft =
  | { kind: 'freehand'; points: VectorPoint[] }
  | { kind: 'shape'; tool: 'rect' | 'ellipse'; a: VectorPoint; b?: VectorPoint }
  | {
      kind: 'pen'
      anchors: VectorPenAnchor[]
      closed: boolean
      /** Index of the node currently being placed (drag sets its handles). */
      placingAnchor: number | null
      /** Node type of the pending placement. */
      placingType: VectorNodeType
    }
