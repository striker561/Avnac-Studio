import type {
  VectorBoardDocument,
  VectorBounds,
  VectorPoint,
} from './types'
import { VECTOR_ANGLE_LOCK_STEP_DEG } from './constants'
import { clamp, distance } from './geometry'
import { strokeSnapPoints } from './path'
import { boardBounds } from './view'

export type SnapCandidateKind =
  | 'node'
  | 'bbox-corner'
  | 'bbox-center'
  | 'board-edge'
  | 'board-center'
  | 'path-midpoint'

export type SnapCandidate = {
  point: VectorPoint
  kind: SnapCandidateKind
  strokeId?: string
  anchorIndex?: number
}

export type SnapGuide = {
  axis: 'x' | 'y'
  value: number
  /** Full extent in document units, already clipped to the board. */
  from: number
  to: number
}

export type SnapResult = {
  point: VectorPoint
  snappedX: boolean
  snappedY: boolean
  target: SnapCandidate | null
  guides: SnapGuide[]
}

export type SnapOptions = {
  /** Document units (screen px / view.scale). */
  tolerance: number
  board: { width: number; height: number }
  /** Exclude these stroke ids (e.g. the stroke being edited). */
  excludeStrokeIds?: ReadonlySet<string>
  /** Additional candidates, e.g. the pen draft's own anchors. */
  extraCandidates?: readonly SnapCandidate[]
  /** Snap to board center/edge guides. Default true. */
  boardGuides?: boolean
  /** Snap candidates on/off. */
  enabled?: boolean
}

export function collectSnapCandidates(
  doc: VectorBoardDocument,
  excludeStrokeIds?: ReadonlySet<string>,
): SnapCandidate[] {
  const out: SnapCandidate[] = []
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    for (const stroke of layer.strokes) {
      if (excludeStrokeIds?.has(stroke.id)) continue
      if (stroke.penAnchors) {
        for (let i = 0; i < stroke.penAnchors.length; i += 1) {
          const a = stroke.penAnchors[i]!
          out.push({
            point: [a.x, a.y],
            kind: 'node',
            strokeId: stroke.id,
            anchorIndex: i,
          })
        }
      }
      const points = strokeSnapPoints(stroke)
      for (let i = 0; i < points.length; i += 1) {
        // Anchors are already present for pen paths; avoid duplicate candidates.
        if (stroke.penAnchors && i < stroke.penAnchors.length) continue
        out.push({
          point: points[i]!,
          kind: stroke.kind === 'rect' || stroke.kind === 'ellipse' ? 'bbox-corner' : 'path-midpoint',
          strokeId: stroke.id,
          anchorIndex: i,
        })
      }
    }
  }
  return out
}

export function boardGuideCandidates(board: { width: number; height: number }): SnapCandidate[] {
  const centerX: SnapCandidate = {
    point: [board.width / 2, board.height / 2],
    kind: 'board-center',
  }
  return [
    centerX,
    { point: [0, 0], kind: 'board-edge' },
    { point: [board.width, 0], kind: 'board-edge' },
    { point: [0, board.height], kind: 'board-edge' },
    { point: [board.width, board.height], kind: 'board-edge' },
  ]
}

function clampGuide(
  axis: 'x' | 'y',
  value: number,
  board: { width: number; height: number },
): SnapGuide {
  return axis === 'x'
    ? { axis, value, from: 0, to: board.height }
    : { axis, value, from: 0, to: board.width }
}

/**
 * Minimum viable snap engine (R7): nodes first, then independent axis guides.
 * Tolerance is document units converted from a screen-pixel preference.
 */
export function findSnap(
  point: VectorPoint,
  candidates: readonly SnapCandidate[],
  options: SnapOptions,
): SnapResult {
  const noSnap: SnapResult = {
    point,
    snappedX: false,
    snappedY: false,
    target: null,
    guides: [],
  }
  if (options.enabled === false) return noSnap
  const tolerance = Math.max(0, options.tolerance)
  if (tolerance <= 0) return noSnap

  const all =
    options.boardGuides === false
      ? candidates
      : [...candidates, ...boardGuideCandidates(options.board)]

  let bestNode: { candidate: SnapCandidate; d: number } | null = null
  let bestX: { candidate: SnapCandidate; dx: number } | null = null
  let bestY: { candidate: SnapCandidate; dy: number } | null = null

  for (const candidate of all) {
    const dx = Math.abs(candidate.point[0] - point[0])
    const dy = Math.abs(candidate.point[1] - point[1])
    if (dx <= tolerance && dy <= tolerance) {
      const d = Math.hypot(dx, dy)
      if (!bestNode || d < bestNode.d) bestNode = { candidate, d }
    }
    if (dx <= tolerance && (!bestX || dx < bestX.dx)) {
      bestX = { candidate, dx }
    }
    if (dy <= tolerance && (!bestY || dy < bestY.dy)) {
      bestY = { candidate, dy }
    }
  }

  if (bestNode) {
    const target = bestNode.candidate
    const guides: SnapGuide[] = []
    if (options.boardGuides !== false) {
      guides.push(clampGuide('x', target.point[0], options.board))
      guides.push(clampGuide('y', target.point[1], options.board))
    }
    return {
      point: [target.point[0], target.point[1]],
      snappedX: true,
      snappedY: true,
      target,
      guides,
    }
  }

  const snappedX = bestX != null
  const snappedY = bestY != null
  const next: VectorPoint = [
    snappedX ? bestX!.candidate.point[0] : point[0],
    snappedY ? bestY!.candidate.point[1] : point[1],
  ]
  const guides: SnapGuide[] = []
  if (snappedX) guides.push(clampGuide('x', next[0], options.board))
  if (snappedY) guides.push(clampGuide('y', next[1], options.board))
  return {
    point: next,
    snappedX,
    snappedY,
    target: null,
    guides,
  }
}

/** Shift: lock the point to the dominant axis from `base`. */
export function applyAxisLock(base: VectorPoint, point: VectorPoint): VectorPoint {
  const dx = point[0] - base[0]
  const dy = point[1] - base[1]
  if (Math.abs(dx) >= Math.abs(dy)) return [point[0], base[1]]
  return [base[0], point[1]]
}

/** Alt: lock the point to the nearest 15° ray from `base`. */
export function applyAngleLock(
  base: VectorPoint,
  point: VectorPoint,
  stepDegrees = VECTOR_ANGLE_LOCK_STEP_DEG,
): VectorPoint {
  const dx = point[0] - base[0]
  const dy = point[1] - base[1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return point
  const step = (Math.max(1, stepDegrees) * Math.PI) / 180
  const angle = Math.atan2(dy, dx)
  const snapped = Math.round(angle / step) * step
  return [base[0] + Math.cos(snapped) * len, base[1] + Math.sin(snapped) * len]
}

/** Clamp a point to the board, used by every draw tool. */
export function clampToBoard(
  point: VectorPoint,
  board: { width: number; height: number },
): VectorPoint {
  return [clamp(point[0], 0, board.width), clamp(point[1], 0, board.height)]
}

/** Snap with axis/angle lock applied first, in that order. */
export function resolvePlacementPoint(input: {
  point: VectorPoint
  base?: VectorPoint | null
  shiftKey?: boolean
  altKey?: boolean
  candidates: readonly SnapCandidate[]
  options: SnapOptions
}): SnapResult & { axisLocked: boolean; angleLocked: boolean } {
  let point = input.point
  let axisLocked = false
  let angleLocked = false
  if (input.base) {
    if (input.shiftKey) {
      point = applyAxisLock(input.base, point)
      axisLocked = true
    } else if (input.altKey) {
      point = applyAngleLock(input.base, point)
      angleLocked = true
    }
  }
  if (axisLocked || angleLocked) {
    // A shift/alt constraint is absolute: snapping must not pull the point off
    // the locked axis or ray.
    return {
      point,
      snappedX: false,
      snappedY: false,
      target: null,
      guides: [],
      axisLocked,
      angleLocked,
    }
  }
  const snap = findSnap(point, input.candidates, input.options)
  return { ...snap, axisLocked, angleLocked }
}

/** Bounds helper for snapping to the center of a selection. */
export function boundsSnapPoint(bounds: VectorBounds): VectorPoint {
  return [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2]
}

/** Debug / perf helper: nearest candidate by true distance. */
export function nearestCandidateDistance(
  point: VectorPoint,
  candidates: readonly SnapCandidate[],
): number {
  let best = Infinity
  for (const candidate of candidates) {
    const d = distance(point, candidate.point)
    if (d < best) best = d
  }
  return best
}

export { boardBounds }
