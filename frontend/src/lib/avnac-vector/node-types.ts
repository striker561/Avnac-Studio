import type { VectorNodeType, VectorPenAnchor, VectorPoint } from './types'
import {
  EPSILON,
  cross,
  distance,
  formatNumber,
  length,
  normalize,
  sub,
} from './geometry'

export const VECTOR_NODE_TYPES: readonly VectorNodeType[] = [
  'corner',
  'cusp',
  'smooth',
  'symmetric',
] as const

export const VECTOR_NODE_TYPE_LABELS: Record<VectorNodeType, string> = {
  corner: 'Corner',
  cusp: 'Cusp',
  smooth: 'Smooth',
  symmetric: 'Symmetric',
}

export const VECTOR_NODE_TYPE_SHORTCUTS: Record<VectorNodeType, string> = {
  corner: 'K',
  cusp: 'C',
  smooth: 'S',
  symmetric: 'Y',
}

export function anchorPoint(a: VectorPenAnchor): VectorPoint {
  return [a.x, a.y]
}

export function anchorIn(a: VectorPenAnchor): VectorPoint | null {
  if (typeof a.inX === 'number' && typeof a.inY === 'number') {
    return [a.inX, a.inY]
  }
  return null
}

export function anchorOut(a: VectorPenAnchor): VectorPoint | null {
  if (typeof a.outX === 'number' && typeof a.outY === 'number') {
    return [a.outX, a.outY]
  }
  return null
}

export function clearIn(a: VectorPenAnchor): void {
  delete a.inX
  delete a.inY
}

export function clearOut(a: VectorPenAnchor): void {
  delete a.outX
  delete a.outY
}

export function clearHandles(a: VectorPenAnchor): void {
  clearIn(a)
  clearOut(a)
}

export function setIn(a: VectorPenAnchor, p: VectorPoint): void {
  a.inX = p[0]
  a.inY = p[1]
}

export function setOut(a: VectorPenAnchor, p: VectorPoint): void {
  a.outX = p[0]
  a.outY = p[1]
}

/** Opposite handle: the vector a smooth/symmetric node mirrors. */
export function oppositeHandle(anchor: VectorPenAnchor, p: VectorPoint): VectorPoint {
  return [2 * anchor.x - p[0], 2 * anchor.y - p[1]]
}

/**
 * Infer a node constraint when loading a document that predates node types.
 * Geometry is preserved; only the constraint label is added.
 */
export function inferNodeType(a: VectorPenAnchor): VectorNodeType {
  const inP = anchorIn(a)
  const outP = anchorOut(a)
  if (!inP && !outP) return 'corner'
  const anchor = anchorPoint(a)
  const inVec = inP ? sub(inP, anchor) : null
  const outVec = outP ? sub(outP, anchor) : null
  if (!inVec || !outVec) return 'cusp'
  const inLen = length(inVec)
  const outLen = length(outVec)
  if (inLen < EPSILON || outLen < EPSILON) return 'cusp'
  const unitIn = normalize(inVec)
  const unitOut = normalize(outVec)
  const collinear = Math.abs(cross(unitIn, unitOut)) < 0.01
  const opposed = unitIn[0] * unitOut[0] + unitIn[1] * unitOut[1] < -0.99
  if (!collinear || !opposed) return 'cusp'
  const ratio = inLen / outLen
  return Math.abs(ratio - 1) < 0.01 ? 'symmetric' : 'smooth'
}

function handleLength(anchor: VectorPenAnchor, handle: VectorPoint | null): number {
  return handle ? distance(handle, anchorPoint(anchor)) : 0
}

/** Position of a handle in the direction opposite to `handle`, keeping a length. */
function mirroredPosition(
  anchor: VectorPenAnchor,
  handle: VectorPoint,
  keepLength: number,
): VectorPoint {
  const v = sub(handle, anchorPoint(anchor))
  const u = length(v) > EPSILON ? normalize(v) : [1, 0]
  return [anchor.x - u[0] * keepLength, anchor.y - u[1] * keepLength]
}

/**
 * Apply a node constraint without moving the anchor itself. Corner strips both
 * handles; smooth/symmetric rebuild the opposite handle so the invariant holds
 * immediately when the user converts a node.
 */
export function applyNodeType(a: VectorPenAnchor, type: VectorNodeType): VectorPenAnchor {
  a.type = type
  if (type === 'corner') {
    clearHandles(a)
    return a
  }
  if (type === 'cusp') return a

  const inP = anchorIn(a)
  const outP = anchorOut(a)
  if (!inP && !outP) return a
  // Prefer the out handle as the direction source; fall back to the in handle.
  const source = outP ?? inP!
  const other = outP ? inP : outP
  const sourceLen = handleLength(a, source)
  const otherLen = handleLength(a, other)
  const lengthToUse =
    type === 'symmetric' ? sourceLen : otherLen > EPSILON ? otherLen : sourceLen
  const mirrored = mirroredPosition(a, source, lengthToUse)
  if (outP) {
    setIn(a, mirrored)
    if (type === 'symmetric') setOut(a, source)
  } else {
    setOut(a, mirrored)
  }
  return a
}

export function applyNodeTypeAt(
  anchors: VectorPenAnchor[],
  index: number,
  type: VectorNodeType,
): VectorPenAnchor[] {
  const next = anchors.map((a) => ({ ...a }))
  const anchor = next[index]
  if (!anchor) return next
  applyNodeType(anchor, type)
  return next
}

/**
 * Move one control handle and enforce the node's invariant on the other.
 * This is the heart of R4: the constraint belongs to the node, so a drag can
 * never silently turn a smooth node into a cusp.
 */
export function dragNodeHandle(
  a: VectorPenAnchor,
  which: 'in' | 'out',
  target: VectorPoint,
): void {
  if (which === 'in') setIn(a, target)
  else setOut(a, target)

  if (a.type === 'corner') {
    clearHandles(a)
    return
  }
  if (a.type === 'cusp') return

  const dragged = which === 'in' ? anchorIn(a) : anchorOut(a)
  if (!dragged) return
  const draggedLen = handleLength(a, dragged)
  const other = which === 'in' ? anchorOut(a) : anchorIn(a)
  const otherLen = handleLength(a, other)

  if (a.type === 'symmetric') {
    const mirrored = oppositeHandle(a, dragged)
    if (which === 'in') setOut(a, mirrored)
    else setIn(a, mirrored)
    return
  }

  // smooth: collinear, length independent. Keep the other handle's length when
  // it exists; otherwise create a matching-length companion.
  const len = otherLen > EPSILON ? otherLen : draggedLen
  const mirrored = mirroredPosition(a, dragged, len)
  if (which === 'in') setOut(a, mirrored)
  else setIn(a, mirrored)
}

/** Move an anchor and its handles by a delta. */
export function translateAnchor(a: VectorPenAnchor, dx: number, dy: number): VectorPenAnchor {
  const next: VectorPenAnchor = {
    ...a,
    x: a.x + dx,
    y: a.y + dy,
  }
  if (a.inX != null && a.inY != null) {
    next.inX = a.inX + dx
    next.inY = a.inY + dy
  }
  if (a.outX != null && a.outY != null) {
    next.outX = a.outX + dx
    next.outY = a.outY + dy
  }
  return next
}

export function translateAnchors(
  anchors: readonly VectorPenAnchor[],
  dx: number,
  dy: number,
): VectorPenAnchor[] {
  return anchors.map((a) => translateAnchor(a, dx, dy))
}

export function scaleAnchors(
  anchors: readonly VectorPenAnchor[],
  ax: number,
  ay: number,
  sx: number,
  sy: number,
): VectorPenAnchor[] {
  const map = (x: number, y: number): VectorPoint => [
    ax + (x - ax) * sx,
    ay + (y - ay) * sy,
  ]
  return anchors.map((a) => {
    const p = map(a.x, a.y)
    const next: VectorPenAnchor = {
      ...a,
      x: p[0],
      y: p[1],
    }
    if (a.inX != null && a.inY != null) {
      const q = map(a.inX, a.inY)
      next.inX = q[0]
      next.inY = q[1]
    }
    if (a.outX != null && a.outY != null) {
      const q = map(a.outX, a.outY)
      next.outX = q[0]
      next.outY = q[1]
    }
    return next
  })
}

/** A short debug label used by the node toolbar and tests. */
export function describeAnchor(a: VectorPenAnchor): string {
  const inP = anchorIn(a)
  const outP = anchorOut(a)
  return (
    `${VECTOR_NODE_TYPE_LABELS[a.type]} (` +
    `${formatNumber(a.x)},${formatNumber(a.y)}` +
    ` in=${inP ? 'yes' : 'no'} out=${outP ? 'yes' : 'no'})`
  )
}

/** Ensure a loaded/created anchor has a valid type. */
export function normalizeAnchor(a: VectorPenAnchor): VectorPenAnchor {
  if (!VECTOR_NODE_TYPES.includes(a.type)) {
    return { ...a, type: inferNodeType(a) }
  }
  return a
}

export function anchorWithHandles(
  x: number,
  y: number,
  type: VectorNodeType = 'corner',
): VectorPenAnchor {
  return { x, y, type }
}

/** Move an anchor's position while carrying its handles (and optionally snapping). */
export function moveAnchorTo(
  anchors: VectorPenAnchor[],
  index: number,
  target: VectorPoint,
): VectorPenAnchor[] {
  const current = anchors[index]
  if (!current) return anchors
  const dx = target[0] - current.x
  const dy = target[1] - current.y
  return anchors.map((a, i) => (i === index ? translateAnchor(a, dx, dy) : a))
}

/** Add a handle pair to a cusp at an offset, used by tests and the pen tool. */
export function setSymmetricHandles(a: VectorPenAnchor, out: VectorPoint): void {
  a.type = 'symmetric'
  setOut(a, out)
  setIn(a, oppositeHandle(a, out))
}
