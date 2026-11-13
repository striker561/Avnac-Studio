import type { VectorBounds, VectorPoint } from './types'

export const EPSILON = 1e-9

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function point(x: number, y: number): VectorPoint {
  return [x, y]
}

export function add(a: VectorPoint, b: VectorPoint): VectorPoint {
  return [a[0] + b[0], a[1] + b[1]]
}

export function sub(a: VectorPoint, b: VectorPoint): VectorPoint {
  return [a[0] - b[0], a[1] - b[1]]
}

export function mul(a: VectorPoint, scale: number): VectorPoint {
  return [a[0] * scale, a[1] * scale]
}

export function dot(a: VectorPoint, b: VectorPoint): number {
  return a[0] * b[0] + a[1] * b[1]
}

export function cross(a: VectorPoint, b: VectorPoint): number {
  return a[0] * b[1] - a[1] * b[0]
}

export function length(a: VectorPoint): number {
  return Math.hypot(a[0], a[1])
}

export function distance(a: VectorPoint, b: VectorPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

export function distanceSq(a: VectorPoint, b: VectorPoint): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

export function normalize(a: VectorPoint): VectorPoint {
  const len = length(a)
  if (len < EPSILON) return [0, 0]
  return [a[0] / len, a[1] / len]
}

export function rotate(v: VectorPoint, radians: number): VectorPoint {
  const c = Math.cos(radians)
  const s = Math.sin(radians)
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]
}

export function lerpPoint(a: VectorPoint, b: VectorPoint, t: number): VectorPoint {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export function midpoint(a: VectorPoint, b: VectorPoint): VectorPoint {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

export function pointsEqual(a: VectorPoint, b: VectorPoint, eps = 1e-7): boolean {
  return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps
}

export function distanceToSegment(
  p: VectorPoint,
  a: VectorPoint,
  b: VectorPoint,
): number {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const apx = p[0] - a[0]
  const apy = p[1] - a[1]
  const ab2 = abx * abx + aby * aby
  if (ab2 < 1e-18) return Math.hypot(apx, apy)
  const t = clamp((apx * abx + apy * aby) / ab2, 0, 1)
  return Math.hypot(p[0] - (a[0] + t * abx), p[1] - (a[1] + t * aby))
}

/** Cubic point at t. */
export function cubicPoint(
  p0: VectorPoint,
  p1: VectorPoint,
  p2: VectorPoint,
  p3: VectorPoint,
  t: number,
): VectorPoint {
  const u = 1 - t
  const u2 = u * u
  const u3 = u2 * u
  const t2 = t * t
  const t3 = t2 * t
  return [
    u3 * p0[0] + 3 * u2 * t * p1[0] + 3 * u * t2 * p2[0] + t3 * p3[0],
    u3 * p0[1] + 3 * u2 * t * p1[1] + 3 * u * t2 * p2[1] + t3 * p3[1],
  ]
}

/** Cubic first derivative at t. */
export function cubicDerivative(
  p0: VectorPoint,
  p1: VectorPoint,
  p2: VectorPoint,
  p3: VectorPoint,
  t: number,
): VectorPoint {
  const u = 1 - t
  const a = 3 * u * u
  const b = 6 * u * t
  const c = 3 * t * t
  return [
    a * (p1[0] - p0[0]) + b * (p2[0] - p1[0]) + c * (p3[0] - p2[0]),
    a * (p1[1] - p0[1]) + b * (p2[1] - p1[1]) + c * (p3[1] - p2[1]),
  ]
}

/** De Casteljau split at t; both halves are exact. */
export function splitCubic(
  p0: VectorPoint,
  p1: VectorPoint,
  p2: VectorPoint,
  p3: VectorPoint,
  t: number,
): {
  left: [VectorPoint, VectorPoint, VectorPoint, VectorPoint]
  right: [VectorPoint, VectorPoint, VectorPoint, VectorPoint]
  point: VectorPoint
} {
  const q0 = lerpPoint(p0, p1, t)
  const q1 = lerpPoint(p1, p2, t)
  const q2 = lerpPoint(p2, p3, t)
  const r0 = lerpPoint(q0, q1, t)
  const r1 = lerpPoint(q1, q2, t)
  const s = lerpPoint(r0, r1, t)
  return {
    left: [p0, q0, r0, s],
    right: [s, r1, q2, p3],
    point: s,
  }
}

function quadRoots(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return []
    return [-c / b]
  }
  const disc = b * b - 4 * a * c
  if (disc < 0) return []
  const root = Math.sqrt(disc)
  return [(-b + root) / (2 * a), (-b - root) / (2 * a)]
}

function cubicExtremaT(p0: number, p1: number, p2: number, p3: number): number[] {
  // B'(t) = 3[(p1-p0)(1-t)^2 + 2(p2-p1)(1-t)t + (p3-p2)t^2]
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 2 * (p0 - 2 * p1 + p2)
  const c = p1 - p0
  const roots = quadRoots(a, b, c)
  return roots.filter((t) => t > 0 && t < 1)
}

/** Tight bounds of a cubic (uses derivative roots, not a sample grid). */
export function cubicBounds(
  p0: VectorPoint,
  p1: VectorPoint,
  p2: VectorPoint,
  p3: VectorPoint,
): VectorBounds {
  let minX = Math.min(p0[0], p3[0])
  let maxX = Math.max(p0[0], p3[0])
  let minY = Math.min(p0[1], p3[1])
  let maxY = Math.max(p0[1], p3[1])
  for (const t of cubicExtremaT(p0[0], p1[0], p2[0], p3[0])) {
    const x = cubicPoint(p0, p1, p2, p3, t)[0]
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
  }
  for (const t of cubicExtremaT(p0[1], p1[1], p2[1], p3[1])) {
    const y = cubicPoint(p0, p1, p2, p3, t)[1]
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

export function emptyBounds(): VectorBounds {
  return {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }
}

export function isBoundsValid(b: VectorBounds): boolean {
  return (
    Number.isFinite(b.minX) &&
    Number.isFinite(b.minY) &&
    Number.isFinite(b.maxX) &&
    Number.isFinite(b.maxY) &&
    b.maxX >= b.minX &&
    b.maxY >= b.minY
  )
}

export function expandBounds(b: VectorBounds, amount: number): VectorBounds {
  return {
    minX: b.minX - amount,
    minY: b.minY - amount,
    maxX: b.maxX + amount,
    maxY: b.maxY + amount,
  }
}

export function unionBounds(a: VectorBounds | null, b: VectorBounds): VectorBounds {
  if (!a || !isBoundsValid(a)) return b
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

export function boundsFromPoints(points: readonly VectorPoint[]): VectorBounds | null {
  let b = emptyBounds()
  for (const p of points) {
    if (p[0] < b.minX) b.minX = p[0]
    if (p[1] < b.minY) b.minY = p[1]
    if (p[0] > b.maxX) b.maxX = p[0]
    if (p[1] > b.maxY) b.maxY = p[1]
  }
  return isBoundsValid(b) ? b : null
}

export function boundsFromCenterSize(
  cx: number,
  cy: number,
  width: number,
  height: number,
): VectorBounds {
  return {
    minX: cx - width / 2,
    minY: cy - height / 2,
    maxX: cx + width / 2,
    maxY: cy + height / 2,
  }
}

export function boundsIntersect(a: VectorBounds, b: VectorBounds): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  )
}

export function boundsContainsPoint(b: VectorBounds, p: VectorPoint): boolean {
  return p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minY && p[1] <= b.maxY
}

export function boundsContainsBounds(outer: VectorBounds, inner: VectorBounds): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.minY >= outer.minY &&
    inner.maxX <= outer.maxX &&
    inner.maxY <= outer.maxY
  )
}

export function boundsCenter(b: VectorBounds): VectorPoint {
  return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]
}

export function boundsWidth(b: VectorBounds): number {
  return b.maxX - b.minX
}

export function boundsHeight(b: VectorBounds): number {
  return b.maxY - b.minY
}

/** Ray-casting point test for an implicitly closed polygon. */
export function pointInPolygon(p: VectorPoint, polygon: readonly VectorPoint[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]![0]
    const yi = polygon[i]![1]
    const xj = polygon[j]![0]
    const yj = polygon[j]![1]
    const denom = yj - yi
    if (Math.abs(denom) < 1e-18) continue
    if (
      (yi > p[1]) !== (yj > p[1]) &&
      p[0] < ((xj - xi) * (p[1] - yi)) / denom + xi
    ) {
      inside = !inside
    }
  }
  return inside
}

/** Winding number for nonzero fill rule; negative and positive cancel. */
export function windingNumber(p: VectorPoint, polygon: readonly VectorPoint[]): number {
  let winding = 0
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!
    const b = polygon[i]!
    if (a[1] <= p[1]) {
      if (b[1] > p[1] && cross(sub(b, a), sub(p, a)) > 0) winding += 1
    } else if (b[1] <= p[1] && cross(sub(b, a), sub(p, a)) < 0) {
      winding -= 1
    }
  }
  return winding
}

export function pointInPolygonWithRule(
  p: VectorPoint,
  polygon: readonly VectorPoint[],
  rule: 'nonzero' | 'evenodd',
): boolean {
  if (polygon.length < 3) return false
  if (rule === 'evenodd') return pointInPolygon(p, polygon)
  return windingNumber(p, polygon) !== 0
}

export function polygonArea(points: readonly VectorPoint[]): number {
  let area = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += points[j]![0] * points[i]![1] - points[i]![0] * points[j]![1]
  }
  return area / 2
}

export function polylineLength(points: readonly VectorPoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1]!, points[i]!)
  }
  return total
}

/**
 * Ramer–Douglas–Peucker simplification. Used as a cheap pre-pass before
 * curve fitting (the fit itself does the quality work).
 */
export function simplifyPolyline(
  points: readonly VectorPoint[],
  tolerance: number,
): VectorPoint[] {
  if (points.length <= 2) return points.map((p) => [p[0], p[1]])
  const sqTolerance = Math.max(0, tolerance) * Math.max(0, tolerance)
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: Array<[number, number]> = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [start, end] = stack.pop()!
    let maxDist = sqTolerance
    let maxIndex = -1
    const a = points[start]!
    const b = points[end]!
    for (let i = start + 1; i < end; i += 1) {
      const p = points[i]!
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      let d: number
      if (dx * dx + dy * dy < 1e-18) {
        d = distanceSq(p, a)
      } else {
        const apx = p[0] - a[0]
        const apy = p[1] - a[1]
        const t = clamp((apx * dx + apy * dy) / (dx * dx + dy * dy), 0, 1)
        const qx = a[0] + t * dx
        const qy = a[1] + t * dy
        d = (p[0] - qx) * (p[0] - qx) + (p[1] - qy) * (p[1] - qy)
      }
      if (d > maxDist) {
        maxDist = d
        maxIndex = i
      }
    }
    if (maxIndex > 0) {
      keep[maxIndex] = 1
      stack.push([start, maxIndex])
      stack.push([maxIndex, end])
    }
  }
  const out: VectorPoint[] = []
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i]) out.push([points[i]![0], points[i]![1]])
  }
  return out
}

/** Moving-average smoothing that preserves the endpoints. */
export function smoothPolyline(
  points: readonly VectorPoint[],
  window = 3,
): VectorPoint[] {
  if (points.length <= 2 || window < 3) {
    return points.map((p) => [p[0], p[1]])
  }
  const radius = Math.floor(window / 2)
  const out: VectorPoint[] = []
  for (let i = 0; i < points.length; i += 1) {
    if (i === 0 || i === points.length - 1) {
      out.push([points[i]![0], points[i]![1]])
      continue
    }
    let sx = 0
    let sy = 0
    let n = 0
    for (let k = Math.max(0, i - radius); k <= Math.min(points.length - 1, i + radius); k += 1) {
      sx += points[k]![0]
      sy += points[k]![1]
      n += 1
    }
    out.push([sx / n, sy / n])
  }
  return out
}

/** Angle between two vectors in radians (0..π). */
export function angleBetween(a: VectorPoint, b: VectorPoint): number {
  const la = length(a)
  const lb = length(b)
  if (la < EPSILON || lb < EPSILON) return 0
  return Math.acos(clamp(dot(a, b) / (la * lb), -1, 1))
}

/** Round to 4 decimals for serialized SVG output, without trailing zeros. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 10000) / 10000
  return Object.is(rounded, -0) ? '0' : String(rounded)
}
