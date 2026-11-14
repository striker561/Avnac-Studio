import type { VectorNodeType, VectorPenAnchor, VectorPoint } from './types'
import {
  EPSILON,
  clamp,
  cubicPoint,
  distance,
  lerpPoint,
  normalize,
  simplifyPolyline,
  sub,
} from './geometry'

/**
 * Schneider cubic fitting (the algorithm behind 2geom's
 * `bezier_fit_cubic_r`, which Inkscape uses for the pencil tool).
 *
 * The raw sample buffer is input only. The output is a chain of cubic segments
 * whose maximum deviation from the samples stays inside `tolerance`.
 */

export type VectorFitSegment = {
  p0: VectorPoint
  p1: VectorPoint
  p2: VectorPoint
  p3: VectorPoint
}

export type VectorFitResult = {
  anchors: VectorPenAnchor[]
  segments: VectorFitSegment[]
  maxError: number
  sampleCount: number
}

export type VectorFitOptions = {
  /** Document units. Convert from screen pixels with px / view.scale. */
  tolerance: number
  /** Safety cap; the recursive fitter stops splitting beyond it. */
  maxSegments?: number
  /** Cheap RDP pre-pass, as a fraction of tolerance. Default 0.15. */
  simplifyRatio?: number
}

type FitState = {
  segments: VectorFitSegment[]
  errorSq: number
  maxSegments: number
}

function bezierQ(controls: readonly VectorPoint[], t: number): VectorPoint {
  const [p0, p1, p2, p3] = controls as [VectorPoint, VectorPoint, VectorPoint, VectorPoint]
  const u = 1 - t
  const b0 = u * u * u
  const b1 = 3 * u * u * t
  const b2 = 3 * u * t * t
  const b3 = t * t * t
  return [
    b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
    b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
  ]
}

function bezierQPrime(controls: readonly VectorPoint[], t: number): VectorPoint {
  const [p0, p1, p2, p3] = controls as [VectorPoint, VectorPoint, VectorPoint, VectorPoint]
  const u = 1 - t
  return [
    3 * u * u * (p1[0] - p0[0]) +
      6 * u * t * (p2[0] - p1[0]) +
      3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) +
      6 * u * t * (p2[1] - p1[1]) +
      3 * t * t * (p3[1] - p2[1]),
  ]
}

function bezierQDoublePrime(controls: readonly VectorPoint[], t: number): VectorPoint {
  const [p0, p1, p2, p3] = controls as [VectorPoint, VectorPoint, VectorPoint, VectorPoint]
  const u = 1 - t
  return [
    6 * u * (p2[0] - 2 * p1[0] + p0[0]) + 6 * t * (p3[0] - 2 * p2[0] + p1[0]),
    6 * u * (p2[1] - 2 * p1[1] + p0[1]) + 6 * t * (p3[1] - 2 * p2[1] + p1[1]),
  ]
}

function dot(a: VectorPoint, b: VectorPoint): number {
  return a[0] * b[0] + a[1] * b[1]
}

function chordLengthParameterize(points: readonly VectorPoint[]): number[] {
  const u: number[] = [0]
  for (let i = 1; i < points.length; i += 1) {
    u.push(u[i - 1]! + distance(points[i - 1]!, points[i]!))
  }
  const total = u[u.length - 1]!
  if (total < EPSILON) {
    return points.map((_, i) => (points.length <= 1 ? 0 : i / (points.length - 1)))
  }
  for (let i = 0; i < u.length; i += 1) u[i] = u[i]! / total
  return u
}

function generateBezier(
  points: readonly VectorPoint[],
  u: readonly number[],
  tHat1: VectorPoint,
  tHat2: VectorPoint,
): [VectorPoint, VectorPoint, VectorPoint, VectorPoint] {
  const first = points[0]!
  const last = points[points.length - 1]!
  let c00 = 0
  let c01 = 0
  let c11 = 0
  let x0 = 0
  let x1 = 0

  for (let i = 0; i < points.length; i += 1) {
    const t = u[i]!
    const u1 = 1 - t
    const b0 = u1 * u1 * u1
    const b1 = 3 * u1 * u1 * t
    const b2 = 3 * u1 * t * t
    const b3 = t * t * t
    const a0: VectorPoint = [tHat1[0] * b1, tHat1[1] * b1]
    const a1: VectorPoint = [tHat2[0] * b2, tHat2[1] * b2]
    c00 += dot(a0, a0)
    c01 += dot(a0, a1)
    c11 += dot(a1, a1)
    const tmp: VectorPoint = [
      points[i]![0] - (first[0] * (b0 + b1) + last[0] * (b2 + b3)),
      points[i]![1] - (first[1] * (b0 + b1) + last[1] * (b2 + b3)),
    ]
    x0 += dot(a0, tmp)
    x1 += dot(a1, tmp)
  }

  const det = c00 * c11 - c01 * c01
  let alpha = Math.abs(det) > 1e-12 ? (x0 * c11 - x1 * c01) / det : 0
  let beta = Math.abs(det) > 1e-12 ? (c00 * x1 - c01 * x0) / det : 0

  const segLength = distance(first, last)
  const epsilon = 1e-6 * segLength
  if (alpha < epsilon || beta < epsilon) {
    // Wu/Barsky heuristic: the tangent handles are one third of the chord.
    alpha = segLength / 3
    beta = segLength / 3
  }
  const p1: VectorPoint = [first[0] + tHat1[0] * alpha, first[1] + tHat1[1] * alpha]
  const p2: VectorPoint = [last[0] + tHat2[0] * beta, last[1] + tHat2[1] * beta]
  return [first, p1, p2, last]
}

function computeMaxError(
  points: readonly VectorPoint[],
  controls: readonly VectorPoint[],
  u: readonly number[],
): { errorSq: number; splitIndex: number } {
  let maxDistSq = 0
  let split = Math.floor(points.length / 2)
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = bezierQ(controls, u[i]!)
    const d = distance(p, points[i]!)
    const dSq = d * d
    if (dSq >= maxDistSq) {
      maxDistSq = dSq
      split = i
    }
  }
  return { errorSq: maxDistSq, splitIndex: split }
}

function reparameterize(
  points: readonly VectorPoint[],
  controls: readonly VectorPoint[],
  u: readonly number[],
): number[] {
  const next = [...u]
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = bezierQ(controls, u[i]!)
    const d = sub(p, points[i]!)
    const qPrime = bezierQPrime(controls, u[i]!)
    const qPrimePrime = bezierQDoublePrime(controls, u[i]!)
    const numerator = dot(d, qPrime)
    const denominator = dot(qPrime, qPrime) + dot(d, qPrimePrime)
    if (Math.abs(denominator) < 1e-12) continue
    const candidate = clamp(u[i]! - numerator / denominator, 1e-6, 1 - 1e-6)
    if (candidate <= next[i - 1]! || candidate >= next[i + 1]!) break
    next[i] = candidate
  }
  return next
}

function fitSingle(
  points: readonly VectorPoint[],
  tHat1: VectorPoint,
  tHat2: VectorPoint,
): { controls: [VectorPoint, VectorPoint, VectorPoint, VectorPoint]; u: number[] } {
  let u = chordLengthParameterize(points)
  let controls = generateBezier(points, u, tHat1, tHat2)
  let { errorSq } = computeMaxError(points, controls, u)
  if (errorSq <= 1e-12) return { controls, u }

  let best = { controls, u, errorSq }
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const nextU = reparameterize(points, best.controls, best.u)
    const nextControls = generateBezier(points, nextU, tHat1, tHat2)
    const result = computeMaxError(points, nextControls, nextU)
    if (result.errorSq >= best.errorSq) break
    best = { controls: nextControls, u: nextU, errorSq: result.errorSq }
  }
  return { controls: best.controls, u: best.u }
}

function fitRecursive(
  points: readonly VectorPoint[],
  tHat1: VectorPoint,
  tHat2: VectorPoint,
  errorSq: number,
  depth: number,
  state: FitState,
): void {
  if (state.segments.length >= state.maxSegments) {
    const first = points[0]!
    const last = points[points.length - 1]!
    state.segments.push({ p0: first, p1: first, p2: last, p3: last })
    state.errorSq = Math.max(state.errorSq, errorSq)
    return
  }

  if (points.length <= 2) {
    const first = points[0]!
    const last = points[points.length - 1]!
    state.segments.push({ p0: first, p1: first, p2: last, p3: last })
    return
  }

  const { controls, u } = fitSingle(points, tHat1, tHat2)
  const { errorSq: maxError, splitIndex } = computeMaxError(points, controls, u)

  if (maxError <= errorSq || depth >= 24) {
    state.segments.push({
      p0: controls[0],
      p1: controls[1],
      p2: controls[2],
      p3: controls[3],
    })
    state.errorSq = Math.max(state.errorSq, maxError)
    return
  }

  const split = splitIndex <= 1 || splitIndex >= points.length - 2
    ? Math.floor(points.length / 2)
    : splitIndex
  const centerTangent = normalize(sub(points[split - 1]!, points[split + 1]!))
  const leftTangent = tHat1
  const rightTangent = tHat2
  fitRecursive(points.slice(0, split + 1), leftTangent, centerTangent, errorSq, depth + 1, state)
  fitRecursive(
    points.slice(split),
    [-centerTangent[0], -centerTangent[1]],
    rightTangent,
    errorSq,
    depth + 1,
    state,
  )
}

function estimateStartTangent(points: readonly VectorPoint[]): VectorPoint {
  const n = points.length
  if (n < 2) return [1, 0]
  const span = Math.min(3, n - 1)
  const t = normalize(sub(points[span]!, points[0]!))
  if (Math.hypot(t[0], t[1]) < EPSILON) return [1, 0]
  return t
}

function estimateEndTangent(points: readonly VectorPoint[]): VectorPoint {
  const n = points.length
  if (n < 2) return [-1, 0]
  const span = Math.min(3, n - 1)
  const t = normalize(sub(points[n - 1 - span]!, points[n - 1]!))
  if (Math.hypot(t[0], t[1]) < EPSILON) return [-1, 0]
  return t
}

function nodeTypeAtJoin(
  inHandle: VectorPoint | undefined,
  outHandle: VectorPoint | undefined,
  anchor: VectorPoint,
): VectorNodeType {
  if (!inHandle && !outHandle) return 'corner'
  if (!inHandle || !outHandle) return 'cusp'
  const a = sub(inHandle, anchor)
  const b = sub(outHandle, anchor)
  if (Math.hypot(a[0], a[1]) < EPSILON || Math.hypot(b[0], b[1]) < EPSILON) {
    return 'cusp'
  }
  const opposed = dot(normalize(a), normalize(b)) < -0.99
  if (!opposed) return 'cusp'
  const ratio = Math.hypot(a[0], a[1]) / Math.hypot(b[0], b[1])
  return Math.abs(ratio - 1) < 0.01 ? 'symmetric' : 'smooth'
}

/** Convert a cubic chain into anchors, preserving segment joins exactly. */
export function fitSegmentsToAnchors(segments: readonly VectorFitSegment[]): VectorPenAnchor[] {
  if (segments.length === 0) return []
  const anchors: VectorPenAnchor[] = []
  const eps = 1e-7
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!
    const prev = segments[i - 1]
    const hasIn = prev != null && distance(seg.p0, prev.p2) > eps
    const hasOut = i < segments.length - 1 && distance(seg.p0, seg.p1) > eps
    const anchor: VectorPenAnchor = {
      x: seg.p0[0],
      y: seg.p0[1],
      type: 'corner',
    }
    if (hasIn) {
      anchor.inX = prev!.p2[0]
      anchor.inY = prev!.p2[1]
    }
    if (hasOut) {
      anchor.outX = seg.p1[0]
      anchor.outY = seg.p1[1]
    }
    anchor.type = nodeTypeAtJoin(
      hasIn ? prev!.p2 : undefined,
      hasOut ? seg.p1 : undefined,
      [seg.p0[0], seg.p0[1]],
    )
    anchors.push(anchor)
  }

  const lastSeg = segments[segments.length - 1]!
  const end: VectorPenAnchor = {
    x: lastSeg.p3[0],
    y: lastSeg.p3[1],
    type: 'corner',
  }
  if (distance(lastSeg.p3, lastSeg.p2) > eps) {
    end.inX = lastSeg.p2[0]
    end.inY = lastSeg.p2[1]
    end.type = 'cusp'
  }
  anchors.push(end)
  return anchors
}

function dedupeSamples(points: readonly VectorPoint[]): VectorPoint[] {
  const out: VectorPoint[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && distance(last, p) < 1e-6) continue
    out.push([p[0], p[1]])
  }
  return out
}

export function fitFreehandCubics(
  samples: readonly VectorPoint[],
  options: VectorFitOptions,
): VectorFitResult {
  const tolerance = Math.max(1e-4, options.tolerance)
  const raw = dedupeSamples(samples)
  if (raw.length < 2) {
    return { anchors: [], segments: [], maxError: 0, sampleCount: raw.length }
  }

  const simplifyRatio = options.simplifyRatio ?? 0.15
  const simplified =
    raw.length > 3 && simplifyRatio > 0
      ? simplifyPolyline(raw, tolerance * simplifyRatio)
      : raw

  const tHat1 = estimateStartTangent(simplified)
  const tHat2 = estimateEndTangent(simplified)
  const maxSegments = Math.max(4, options.maxSegments ?? 120)
  const state: FitState = { segments: [], errorSq: 0, maxSegments }
  fitRecursive(simplified, tHat1, tHat2, tolerance * tolerance, 0, state)

  const anchors = fitSegmentsToAnchors(state.segments)
  return {
    anchors,
    segments: state.segments,
    maxError: Math.sqrt(state.errorSq),
    sampleCount: raw.length,
  }
}

/** Max distance between the fitted path and the original samples. */
export function measureFitDeviation(
  anchors: readonly VectorPenAnchor[],
  samples: readonly VectorPoint[],
  samplesPerSegment = 24,
): number {
  if (anchors.length < 2 || samples.length === 0) return Infinity
  const controlPoints: VectorPoint[][] = []
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i]!
    const b = anchors[i + 1]!
    const p0: VectorPoint = [a.x, a.y]
    const p1: VectorPoint = [a.outX ?? a.x, a.outY ?? a.y]
    const p2: VectorPoint = [b.inX ?? b.x, b.inY ?? b.y]
    const p3: VectorPoint = [b.x, b.y]
    for (let s = 0; s <= samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment
      const u = 1 - t
      controlPoints.push([
        [
          u * u * u * p0[0] +
            3 * u * u * t * p1[0] +
            3 * u * t * t * p2[0] +
            t * t * t * p3[0],
          u * u * u * p0[1] +
            3 * u * u * t * p1[1] +
            3 * u * t * t * p2[1] +
            t * t * t * p3[1],
        ],
      ])
    }
  }
  const polyline = controlPoints.map((p) => p[0]!)
  let max = 0
  for (const sample of samples) {
    let best = Infinity
    for (const p of polyline) {
      const d = distance(sample, p)
      if (d < best) best = d
    }
    if (best > max) max = best
  }
  return max
}

/** Count the cubic segments used by an anchor chain. */
export function cubicSegmentCount(anchors: readonly VectorPenAnchor[], closed = false): number {
  if (anchors.length < 2) return 0
  return closed ? anchors.length : anchors.length - 1
}

/** Cheap visual preview while the pencil is still sampling. */
export function previewFittedPolyline(anchors: readonly VectorPenAnchor[]): VectorPoint[] {
  if (anchors.length < 2) return []
  const out: VectorPoint[] = []
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i]!
    const b = anchors[i + 1]!
    const p0: VectorPoint = [a.x, a.y]
    const p1: VectorPoint = [a.outX ?? a.x, a.outY ?? a.y]
    const p2: VectorPoint = [b.inX ?? b.x, b.inY ?? b.y]
    const p3: VectorPoint = [b.x, b.y]
    const n = 10
    for (let s = 0; s <= n; s += 1) {
      if (i > 0 && s === 0) continue
      out.push(cubicPoint(p0, p1, p2, p3, s / n))
    }
  }
  return out
}

export { lerpPoint }
