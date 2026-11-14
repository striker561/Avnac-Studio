import type {
  VectorBoardStroke,
  VectorBounds,
  VectorFillRule,
  VectorPenAnchor,
  VectorPoint,
} from './types'
import {
  boundsFromPoints,
  clamp,
  cubicBounds,
  cubicPoint,
  distance,
  distanceToSegment,
  emptyBounds,
  formatNumber,
  isBoundsValid,
  lerpPoint,
  pointInPolygonWithRule,
  unionBounds,
} from './geometry'
import { anchorIn, anchorOut } from './node-types'

export type VectorLineSegment = {
  kind: 'line'
  p0: VectorPoint
  p3: VectorPoint
}

export type VectorCubicSegment = {
  kind: 'cubic'
  p0: VectorPoint
  p1: VectorPoint
  p2: VectorPoint
  p3: VectorPoint
}

export type VectorPathSegment = VectorLineSegment | VectorCubicSegment

export type VectorSubPath = {
  start: VectorPoint
  segments: VectorPathSegment[]
  closed: boolean
}

export type VectorPath = {
  subpaths: VectorSubPath[]
}

export type VectorPathHit = {
  subpathIndex: number
  segmentIndex: number
  t: number
  point: VectorPoint
  distance: number
}

const ELLIPSE_KAPPA = 0.5522847498307936

function samePoint(a: VectorPoint, b: VectorPoint): boolean {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9
}

export function anchorCubicSegment(
  a: VectorPenAnchor,
  b: VectorPenAnchor,
): VectorPathSegment {
  const p0: VectorPoint = [a.x, a.y]
  const p3: VectorPoint = [b.x, b.y]
  const p1 = anchorOut(a) ?? p0
  const p2 = anchorIn(b) ?? p3
  if (samePoint(p0, p1) && samePoint(p3, p2)) {
    return { kind: 'line', p0, p3 }
  }
  return { kind: 'cubic', p0, p1, p2, p3 }
}

function polylineSubPath(points: readonly VectorPoint[], closed: boolean): VectorSubPath | null {
  if (points.length < 2) return null
  const start: VectorPoint = [points[0]![0], points[0]![1]]
  const segments: VectorPathSegment[] = []
  for (let i = 1; i < points.length; i += 1) {
    const p0 = points[i - 1]!
    const p3 = points[i]!
    segments.push({
      kind: 'line',
      p0: [p0[0], p0[1]],
      p3: [p3[0], p3[1]],
    })
  }
  if (closed && !samePoint(points[0]!, points[points.length - 1]!)) {
    const p0 = points[points.length - 1]!
    const p3 = points[0]!
    segments.push({
      kind: 'line',
      p0: [p0[0], p0[1]],
      p3: [p3[0], p3[1]],
    })
  }
  return { start, segments, closed }
}

type PenPathCacheEntry = { open?: VectorPath; closed?: VectorPath }

// Document anchors are immutable by convention; draft anchors are never passed
// here (the draft preview traces directly). Cache per anchor-array identity so
// repeated bounds, hit tests and paints reuse the same cubic path.
const penPathCache = new WeakMap<readonly VectorPenAnchor[], PenPathCacheEntry>()

function buildPenAnchorsPath(
  anchors: readonly VectorPenAnchor[],
  closed: boolean,
): VectorPath {
  const segments: VectorPathSegment[] = []
  const count = closed ? anchors.length : anchors.length - 1
  for (let i = 0; i < count; i += 1) {
    const a = anchors[i]!
    const b = anchors[(i + 1) % anchors.length]!
    segments.push(anchorCubicSegment(a, b))
  }
  return {
    subpaths: [
      {
        start: [anchors[0]!.x, anchors[0]!.y],
        segments,
        closed,
      },
    ],
  }
}

export function penAnchorsToPath(anchors: readonly VectorPenAnchor[], closed: boolean): VectorPath {
  if (anchors.length < 2) return { subpaths: [] }
  let entry = penPathCache.get(anchors)
  if (!entry) {
    entry = {}
    penPathCache.set(anchors, entry)
  }
  if (closed) {
    if (!entry.closed) entry.closed = buildPenAnchorsPath(anchors, true)
    return entry.closed
  }
  if (!entry.open) entry.open = buildPenAnchorsPath(anchors, false)
  return entry.open
}

function shapeRectPoints(stroke: VectorBoardStroke): VectorPoint[] | null {
  if (stroke.points.length < 2) return null
  const [ax, ay] = stroke.points[0]!
  const [bx, by] = stroke.points[1]!
  const minX = Math.min(ax, bx)
  const maxX = Math.max(ax, bx)
  const minY = Math.min(ay, by)
  const maxY = Math.max(ay, by)
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ]
}

function ellipsePath(stroke: VectorBoardStroke): VectorPath {
  if (stroke.points.length < 2) return { subpaths: [] }
  const [ax, ay] = stroke.points[0]!
  const [bx, by] = stroke.points[1]!
  const minX = Math.min(ax, bx)
  const maxX = Math.max(ax, bx)
  const minY = Math.min(ay, by)
  const maxY = Math.max(ay, by)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const rx = (maxX - minX) / 2
  const ry = (maxY - minY) / 2
  if (rx < 1e-9 || ry < 1e-9) return { subpaths: [] }
  const kx = rx * ELLIPSE_KAPPA
  const ky = ry * ELLIPSE_KAPPA
  const top: VectorPoint = [cx, cy - ry]
  const right: VectorPoint = [cx + rx, cy]
  const bottom: VectorPoint = [cx, cy + ry]
  const left: VectorPoint = [cx - rx, cy]
  const segments: VectorPathSegment[] = [
    {
      kind: 'cubic',
      p0: top,
      p1: [cx + kx, cy - ry],
      p2: [cx + rx, cy - ky],
      p3: right,
    },
    {
      kind: 'cubic',
      p0: right,
      p1: [cx + rx, cy + ky],
      p2: [cx + kx, cy + ry],
      p3: bottom,
    },
    {
      kind: 'cubic',
      p0: bottom,
      p1: [cx - kx, cy + ry],
      p2: [cx - rx, cy + ky],
      p3: left,
    },
    {
      kind: 'cubic',
      p0: left,
      p1: [cx - rx, cy - ky],
      p2: [cx - kx, cy - ry],
      p3: top,
    },
  ]
  return { subpaths: [{ start: top, segments, closed: true }] }
}

function arrowHeadPolygon(stroke: VectorBoardStroke): VectorPoint[] | null {
  if (stroke.points.length < 2) return null
  const [x0, y0] = stroke.points[0]!
  const [x1, y1] = stroke.points[1]!
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return null
  const ux = dx / len
  const uy = dy / len
  const head = Math.min(len * 0.35, 28 + stroke.strokeWidth * 4)
  const wing = Math.max(stroke.strokeWidth * 2.2, head * 0.42)
  const bx = x1 - ux * head
  const by = y1 - uy * head
  const px = -uy
  const py = ux
  return [
    [x1, y1],
    [bx + px * wing, by + py * wing],
    [bx - px * wing, by - py * wing],
  ]
}

export function buildStrokePath(stroke: VectorBoardStroke): VectorPath {
  if (stroke.kind === 'pen') {
    if (stroke.penAnchors && stroke.penAnchors.length >= 2) {
      return penAnchorsToPath(stroke.penAnchors, stroke.penClosed === true)
    }
    const sub = polylineSubPath(stroke.points, stroke.penClosed === true)
    return { subpaths: sub ? [sub] : [] }
  }
  if (stroke.kind === 'polygon') {
    const sub = polylineSubPath(stroke.points, true)
    return { subpaths: sub ? [sub] : [] }
  }
  if (stroke.kind === 'rect') {
    const pts = shapeRectPoints(stroke)
    if (!pts) return { subpaths: [] }
    return { subpaths: [polylineSubPath(pts, true)!] }
  }
  if (stroke.kind === 'ellipse') {
    return ellipsePath(stroke)
  }
  if (stroke.kind === 'line') {
    if (stroke.points.length < 2) return { subpaths: [] }
    const sub = polylineSubPath(stroke.points.slice(0, 2), false)
    return { subpaths: sub ? [sub] : [] }
  }
  if (stroke.kind === 'arrow') {
    if (stroke.points.length < 2) return { subpaths: [] }
    const shaft = polylineSubPath(stroke.points.slice(0, 2), false)
    const headPts = arrowHeadPolygon(stroke)
    const head = headPts ? polylineSubPath(headPts, true) : null
    const subpaths = [shaft, head].filter((x): x is VectorSubPath => x != null)
    return { subpaths }
  }
  return { subpaths: [] }
}

export function strokeIsRenderable(stroke: VectorBoardStroke): boolean {
  const path = buildStrokePath(stroke)
  return path.subpaths.some((sub) => sub.segments.length > 0)
}

export function strokeCanFill(stroke: VectorBoardStroke): boolean {
  if (stroke.kind === 'rect' || stroke.kind === 'ellipse' || stroke.kind === 'polygon') {
    return true
  }
  if (stroke.kind === 'pen') return stroke.penClosed === true
  return false
}

export function strokeIsClosed(stroke: VectorBoardStroke): boolean {
  if (stroke.kind === 'rect' || stroke.kind === 'ellipse' || stroke.kind === 'polygon') {
    return true
  }
  return stroke.kind === 'pen' && stroke.penClosed === true
}

export function segmentPoint(segment: VectorPathSegment, t: number): VectorPoint {
  if (segment.kind === 'line') return lerpPoint(segment.p0, segment.p3, t)
  return cubicPoint(segment.p0, segment.p1, segment.p2, segment.p3, t)
}

export function segmentBounds(segment: VectorPathSegment): VectorBounds {
  if (segment.kind === 'line') {
    return {
      minX: Math.min(segment.p0[0], segment.p3[0]),
      minY: Math.min(segment.p0[1], segment.p3[1]),
      maxX: Math.max(segment.p0[0], segment.p3[0]),
      maxY: Math.max(segment.p0[1], segment.p3[1]),
    }
  }
  return cubicBounds(segment.p0, segment.p1, segment.p2, segment.p3)
}

export function pathBounds(path: VectorPath): VectorBounds | null {
  let bounds = emptyBounds()
  for (const sub of path.subpaths) {
    bounds = unionBounds(bounds, {
      minX: sub.start[0],
      minY: sub.start[1],
      maxX: sub.start[0],
      maxY: sub.start[1],
    })
    for (const segment of sub.segments) {
      bounds = unionBounds(bounds, segmentBounds(segment))
    }
  }
  return isBoundsValid(bounds) ? bounds : null
}

const strokeBoundsCache = new WeakMap<VectorBoardStroke, VectorBounds | null>()

export function strokeBounds(stroke: VectorBoardStroke): VectorBounds | null {
  if (strokeBoundsCache.has(stroke)) return strokeBoundsCache.get(stroke)!
  const bounds = pathBounds(buildStrokePath(stroke))
  strokeBoundsCache.set(stroke, bounds)
  return bounds
}

/** Flatten a path into one polyline per subpath. */
export function flattenPath(path: VectorPath, samplesPerCurve = 12): VectorPoint[][] {
  const out: VectorPoint[][] = []
  for (const sub of path.subpaths) {
    if (sub.segments.length === 0) continue
    const points: VectorPoint[] = [[sub.start[0], sub.start[1]]]
    for (const segment of sub.segments) {
      if (segment.kind === 'line') {
        points.push([segment.p3[0], segment.p3[1]])
      } else {
        const n = Math.max(2, samplesPerCurve)
        for (let i = 1; i <= n; i += 1) {
          points.push(cubicPoint(segment.p0, segment.p1, segment.p2, segment.p3, i / n))
        }
      }
    }
    out.push(points)
  }
  return out
}

export function flattenStroke(stroke: VectorBoardStroke, samplesPerCurve = 12): VectorPoint[][] {
  return flattenPath(buildStrokePath(stroke), samplesPerCurve)
}

/** Exact for lines, golden-section-free two-pass for cubics. */
export function findNearestPointOnPath(
  path: VectorPath,
  target: VectorPoint,
  coarseSamples = 24,
): VectorPathHit | null {
  return nearestPointOnPath(path, target, coarseSamples)
}

const pathSegmentBoundsCache = new WeakMap<VectorPath, VectorBounds[]>()

function pathSegmentBounds(path: VectorPath): VectorBounds[] {
  const cached = pathSegmentBoundsCache.get(path)
  if (cached) return cached
  const bounds: VectorBounds[] = []
  for (const sub of path.subpaths) {
    for (const segment of sub.segments) bounds.push(segmentBounds(segment))
  }
  pathSegmentBoundsCache.set(path, bounds)
  return bounds
}

export function nearestPointOnPath(
  path: VectorPath,
  target: VectorPoint,
  coarseSamples = 24,
): VectorPathHit | null {
  let best: VectorPathHit | null = null
  const segmentBoundsList = pathSegmentBounds(path)
  let boundIndex = 0
  for (let subIndex = 0; subIndex < path.subpaths.length; subIndex += 1) {
    const sub = path.subpaths[subIndex]!
    for (let segIndex = 0; segIndex < sub.segments.length; segIndex += 1) {
      const segment = sub.segments[segIndex]!
      const bounds = segmentBoundsList[boundIndex]!
      boundIndex += 1
      if (best) {
        // Bounding-box lower bound: a segment that cannot beat the current
        // best is skipped before any sampling.
        const dx =
          target[0] < bounds.minX
            ? bounds.minX - target[0]
            : target[0] > bounds.maxX
              ? target[0] - bounds.maxX
              : 0
        const dy =
          target[1] < bounds.minY
            ? bounds.minY - target[1]
            : target[1] > bounds.maxY
              ? target[1] - bounds.maxY
              : 0
        if (Math.hypot(dx, dy) >= best.distance) continue
      }
      if (segment.kind === 'line') {
        const p0 = segment.p0
        const p3 = segment.p3
        const dx = p3[0] - p0[0]
        const dy = p3[1] - p0[1]
        const len2 = dx * dx + dy * dy
        const t =
          len2 < 1e-18
            ? 0
            : clamp(
                ((target[0] - p0[0]) * dx + (target[1] - p0[1]) * dy) / len2,
                0,
                1,
              )
        const p = lerpPoint(p0, p3, t)
        const d = distance(target, p)
        if (!best || d < best.distance) {
          best = {
            subpathIndex: subIndex,
            segmentIndex: segIndex,
            t,
            point: p,
            distance: d,
          }
        }
        continue
      }
      const n = Math.max(8, coarseSamples)
      let bestT = 0
      let bestD = Infinity
      for (let i = 0; i <= n; i += 1) {
        const t = i / n
        const p = cubicPoint(segment.p0, segment.p1, segment.p2, segment.p3, t)
        const d = distance(target, p)
        if (d < bestD) {
          bestD = d
          bestT = t
        }
      }
      const step = 1 / n
      let lo = Math.max(0, bestT - step)
      let hi = Math.min(1, bestT + step)
      for (let iter = 0; iter < 3; iter += 1) {
        const m1 = lo + (hi - lo) / 3
        const m2 = hi - (hi - lo) / 3
        const p1 = cubicPoint(segment.p0, segment.p1, segment.p2, segment.p3, m1)
        const p2 = cubicPoint(segment.p0, segment.p1, segment.p2, segment.p3, m2)
        if (distance(target, p1) < distance(target, p2)) hi = m2
        else lo = m1
      }
      const t = (lo + hi) / 2
      const p = cubicPoint(segment.p0, segment.p1, segment.p2, segment.p3, t)
      const d = distance(target, p)
      if (!best || d < best.distance) {
        best = {
          subpathIndex: subIndex,
          segmentIndex: segIndex,
          t,
          point: p,
          distance: d,
        }
      }
    }
  }
  return best
}

export function nearestPointOnStroke(stroke: VectorBoardStroke, target: VectorPoint): VectorPathHit | null {
  return nearestPointOnPath(buildStrokePath(stroke), target)
}

/** Centerline distance to a stroke, in document units. */
export function distanceToStroke(stroke: VectorBoardStroke, target: VectorPoint): number {
  const hit = nearestPointOnStroke(stroke, target)
  return hit ? hit.distance : Infinity
}

export function pointInStroke(stroke: VectorBoardStroke, target: VectorPoint): boolean {
  if (!strokeCanFill(stroke)) return false
  if (stroke.kind === 'rect') {
    const pts = shapeRectPoints(stroke)
    if (!pts) return false
    return (
      target[0] >= pts[0]![0] &&
      target[0] <= pts[1]![0] &&
      target[1] >= pts[0]![1] &&
      target[1] <= pts[3]![1]
    )
  }
  if (stroke.kind === 'ellipse') {
    if (stroke.points.length < 2) return false
    const [ax, ay] = stroke.points[0]!
    const [bx, by] = stroke.points[1]!
    const minX = Math.min(ax, bx)
    const maxX = Math.max(ax, bx)
    const minY = Math.min(ay, by)
    const maxY = Math.max(ay, by)
    const rx = (maxX - minX) / 2
    const ry = (maxY - minY) / 2
    if (rx < 1e-9 || ry < 1e-9) return false
    const dx = (target[0] - (minX + maxX) / 2) / rx
    const dy = (target[1] - (minY + maxY) / 2) / ry
    return dx * dx + dy * dy <= 1 + 1e-9
  }
  const polys = flattenStroke(stroke, 16)
  const rule: VectorFillRule = stroke.fillRule
  for (const poly of polys) {
    if (pointInPolygonWithRule(target, poly, rule)) return true
  }
  return false
}

/** Point-in-polygon hit test for a marquee, including stroke width slop. */
export function strokeIntersectsBounds(
  stroke: VectorBoardStroke,
  rect: VectorBounds,
  slop = 0,
): boolean {
  const b = strokeBounds(stroke)
  if (!b) return false
  const margin =
    slop +
    (stroke.stroke &&
    stroke.stroke !== 'transparent' &&
    stroke.strokeWidth > 0 &&
    stroke.strokeOpacity > 0
      ? stroke.strokeWidth / 2
      : 0)
  return !(
    b.maxX + margin < rect.minX ||
    b.minX - margin > rect.maxX ||
    b.maxY + margin < rect.minY ||
    b.minY - margin > rect.maxY
  )
}

export function strokeAnchorPoints(stroke: VectorBoardStroke): VectorPoint[] {
  if (stroke.penAnchors) return stroke.penAnchors.map((a) => [a.x, a.y])
  return stroke.points
}

export function pathToSvgData(path: VectorPath): string {
  const parts: string[] = []
  for (const sub of path.subpaths) {
    if (sub.segments.length === 0) continue
    parts.push(`M${formatNumber(sub.start[0])} ${formatNumber(sub.start[1])}`)
    for (const segment of sub.segments) {
      if (segment.kind === 'line') {
        parts.push(`L${formatNumber(segment.p3[0])} ${formatNumber(segment.p3[1])}`)
      } else {
        parts.push(
          `C${formatNumber(segment.p1[0])} ${formatNumber(segment.p1[1])} ` +
            `${formatNumber(segment.p2[0])} ${formatNumber(segment.p2[1])} ` +
            `${formatNumber(segment.p3[0])} ${formatNumber(segment.p3[1])}`,
        )
      }
    }
    if (sub.closed) parts.push('Z')
  }
  return parts.join(' ')
}

export function strokeToSvgData(stroke: VectorBoardStroke): string {
  return pathToSvgData(buildStrokePath(stroke))
}

/** Sample a stroke's centerline for overlays and performance-safe hit tests. */
export function sampleStroke(stroke: VectorBoardStroke, samplesPerCurve = 12): VectorPoint[] {
  const polys = flattenStroke(stroke, samplesPerCurve)
  if (polys.length === 0) return []
  if (polys.length === 1) return polys[0]!
  const out: VectorPoint[] = []
  for (const poly of polys) out.push(...poly)
  return out
}

/** Bounds used for snap candidates; all visible anchor/geometry extents. */
export function strokeSnapPoints(stroke: VectorBoardStroke): VectorPoint[] {
  const points: VectorPoint[] = []
  if (stroke.penAnchors) {
    for (const a of stroke.penAnchors) points.push([a.x, a.y])
  } else if (stroke.kind === 'rect' || stroke.kind === 'ellipse') {
    const b = strokeBounds(stroke)
    if (b) {
      points.push(
        [b.minX, b.minY],
        [b.maxX, b.minY],
        [b.maxX, b.maxY],
        [b.minX, b.maxY],
        [(b.minX + b.maxX) / 2, b.minY],
        [b.maxX, (b.minY + b.maxY) / 2],
        [(b.minX + b.maxX) / 2, b.maxY],
        [b.minX, (b.minY + b.maxY) / 2],
      )
    }
  } else {
    for (const p of stroke.points) points.push([p[0], p[1]])
  }
  const b = strokeBounds(stroke)
  if (b) {
    points.push([(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2])
  }
  return points
}

export { boundsFromPoints, distanceToSegment }
