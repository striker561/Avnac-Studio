import type { VectorPenAnchor, VectorPoint } from './types'
import {
  EPSILON,
  clamp,
  cubicDerivative,
  cubicPoint,
  distance,
  normalize,
  sub,
} from './geometry'
import {
  anchorIn,
  anchorOut,
  applyNodeType,
  clearIn,
  clearOut,
  inferNodeType,
  setIn,
  setOut,
  translateAnchor,
} from './node-types'

export type PenSplitResult = {
  anchors: VectorPenAnchor[]
  insertedIndex: number
}

export type AnchorHit = {
  index: number
  kind: 'anchor'
}

export type HandleHit = {
  index: number
  kind: 'in' | 'out'
}

export type PenHit = AnchorHit | HandleHit

function controlPoints(a: VectorPenAnchor, b: VectorPenAnchor): [VectorPoint, VectorPoint, VectorPoint, VectorPoint] {
  return [
    [a.x, a.y],
    anchorOut(a) ?? [a.x, a.y],
    anchorIn(b) ?? [b.x, b.y],
    [b.x, b.y],
  ]
}

/**
 * Split a segment exactly with De Casteljau. The inserted node is smooth when
 * both halves retain curvature, corner when the segment was a straight line.
 */
export function insertAnchorAtSegment(
  anchors: readonly VectorPenAnchor[],
  segmentIndex: number,
  t: number,
  closed: boolean,
): PenSplitResult | null {
  const count = closed ? anchors.length : anchors.length - 1
  if (segmentIndex < 0 || segmentIndex >= count || anchors.length < 2) return null
  const nextIndex = (segmentIndex + 1) % anchors.length
  const a = anchors[segmentIndex]!
  const b = anchors[nextIndex]!
  const [p0, p1, p2, p3] = controlPoints(a, b)
  const tc = clamp(t, 0.0001, 0.9999)
  const q0: VectorPoint = [p0[0] + (p1[0] - p0[0]) * tc, p0[1] + (p1[1] - p0[1]) * tc]
  const q1: VectorPoint = [p1[0] + (p2[0] - p1[0]) * tc, p1[1] + (p2[1] - p1[1]) * tc]
  const q2: VectorPoint = [p2[0] + (p3[0] - p2[0]) * tc, p2[1] + (p3[1] - p2[1]) * tc]
  const r0: VectorPoint = [q0[0] + (q1[0] - q0[0]) * tc, q0[1] + (q1[1] - q0[1]) * tc]
  const r1: VectorPoint = [q1[0] + (q2[0] - q1[0]) * tc, q1[1] + (q2[1] - q1[1]) * tc]
  const s: VectorPoint = [r0[0] + (r1[0] - r0[0]) * tc, r0[1] + (r1[1] - r0[1]) * tc]

  const out = anchors.map((x) => ({ ...x }))
  const A = out[segmentIndex]!
  const B = out[nextIndex]!

  const aHadOut = anchorOut(a) != null
  if (aHadOut || distance(q0, p0) > 1e-7) setOut(A, q0)
  const bHadIn = anchorIn(b) != null
  if (bHadIn || distance(q2, p3) > 1e-7) setIn(B, q2)

  const straightSegment = !aHadOut && !bHadIn
  const inserted: VectorPenAnchor = {
    x: s[0],
    y: s[1],
    type: 'corner',
  }
  if (!straightSegment) {
    const hasIn = distance(r0, s) > 1e-7
    const hasOut = distance(r1, s) > 1e-7
    if (hasIn) {
      inserted.inX = r0[0]
      inserted.inY = r0[1]
    }
    if (hasOut) {
      inserted.outX = r1[0]
      inserted.outY = r1[1]
    }
    inserted.type = inferNodeType(inserted)
  }

  const insertAt = segmentIndex + 1
  out.splice(insertAt, 0, inserted)
  return { anchors: out, insertedIndex: insertAt }
}

/** Sample the stretch that will be swallowed by a node deletion. */
function sampleStretch(
  anchors: readonly VectorPenAnchor[],
  fromIndex: number,
  toIndex: number,
  closed: boolean,
  perSegment = 12,
): { points: VectorPoint[]; tHat1: VectorPoint; tHat2: VectorPoint; chord: number } {
  const points: VectorPoint[] = []
  const total = anchors.length
  let index = fromIndex
  let guard = 0
  while (index !== toIndex && guard < total) {
    const next = (index + 1) % total
    const a = anchors[index]!
    const b = anchors[next === 0 && !closed ? index : next]!
    const [p0, p1, p2, p3] = controlPoints(a, b)
    for (let i = 0; i < perSegment; i += 1) {
      points.push(cubicPoint(p0, p1, p2, p3, i / perSegment))
    }
    index = next
    guard += 1
  }
  const end = anchors[toIndex]!
  points.push([end.x, end.y])

  const first = anchors[fromIndex]!
  const lastSegStart = anchors[(toIndex - 1 + total) % total]!
  const lastCP = controlPoints(lastSegStart, end)
  const tangentOut = anchorOut(first)
  const tHat1 = normalize(
    tangentOut
      ? sub(tangentOut, [first.x, first.y])
      : sub(points[Math.min(1, points.length - 1)]!, [first.x, first.y]),
  )
  const tangentIn = anchorIn(end)
  const tHat2 = normalize(
    tangentIn
      ? sub(tangentIn, [end.x, end.y])
      : sub(cubicPoint(lastCP[0], lastCP[1], lastCP[2], lastCP[3], 0.85), [end.x, end.y]),
  )
  return {
    points,
    tHat1: Math.hypot(tHat1[0], tHat1[1]) < EPSILON ? normalize(sub(points[1]!, points[0]!)) : tHat1,
    tHat2: Math.hypot(tHat2[0], tHat2[1]) < EPSILON ? normalize(sub(points[points.length - 2]!, points[points.length - 1]!)) : tHat2,
    chord: distance([first.x, first.y], [end.x, end.y]),
  }
}

function fitCubicWithTangents(
  samples: readonly VectorPoint[],
  p0: VectorPoint,
  p3: VectorPoint,
  tHat1: VectorPoint,
  tHat2: VectorPoint,
): { controls: [VectorPoint, VectorPoint, VectorPoint, VectorPoint]; error: number } | null {
  const n = samples.length
  if (n < 2) return null

  // Chord-length parameterization.
  const u: number[] = [0]
  for (let i = 1; i < n; i += 1) {
    u.push(u[i - 1]! + distance(samples[i - 1]!, samples[i]!))
  }
  const total = u[u.length - 1]!
  if (total < EPSILON) return null
  for (let i = 0; i < n; i += 1) u[i] = u[i]! / total

  let c00 = 0
  let c01 = 0
  let c11 = 0
  let x0 = 0
  let x1 = 0
  for (let i = 0; i < n; i += 1) {
    const t = u[i]!
    const it = 1 - t
    const b0 = it * it * it
    const b1 = 3 * it * it * t
    const b2 = 3 * it * t * t
    const b3 = t * t * t
    const a0: VectorPoint = [tHat1[0] * b1, tHat1[1] * b1]
    const a1: VectorPoint = [tHat2[0] * b2, tHat2[1] * b2]
    c00 += a0[0] * a0[0] + a0[1] * a0[1]
    c01 += a0[0] * a1[0] + a0[1] * a1[1]
    c11 += a1[0] * a1[0] + a1[1] * a1[1]
    const baseX = p0[0] * (b0 + b1) + p3[0] * (b2 + b3)
    const baseY = p0[1] * (b0 + b1) + p3[1] * (b2 + b3)
    x0 += a0[0] * (samples[i]![0] - baseX) + a0[1] * (samples[i]![1] - baseY)
    x1 += a1[0] * (samples[i]![0] - baseX) + a1[1] * (samples[i]![1] - baseY)
  }
  const chord = distance(p0, p3)
  const maxHandle = Math.max(chord * 4, 1)

  function solve(parameters: readonly number[]): {
    controls: [VectorPoint, VectorPoint, VectorPoint, VectorPoint]
    error: number
  } | null {
    let s00 = 0
    let s01 = 0
    let s11 = 0
    let y0 = 0
    let y1 = 0
    for (let i = 0; i < n; i += 1) {
      const t = parameters[i]!
      const it = 1 - t
      const b0 = it * it * it
      const b1 = 3 * it * it * t
      const b2 = 3 * it * t * t
      const b3 = t * t * t
      const a0: VectorPoint = [tHat1[0] * b1, tHat1[1] * b1]
      const a1: VectorPoint = [tHat2[0] * b2, tHat2[1] * b2]
      s00 += a0[0] * a0[0] + a0[1] * a0[1]
      s01 += a0[0] * a1[0] + a0[1] * a1[1]
      s11 += a1[0] * a1[0] + a1[1] * a1[1]
      const baseX = p0[0] * (b0 + b1) + p3[0] * (b2 + b3)
      const baseY = p0[1] * (b0 + b1) + p3[1] * (b2 + b3)
      y0 += a0[0] * (samples[i]![0] - baseX) + a0[1] * (samples[i]![1] - baseY)
      y1 += a1[0] * (samples[i]![0] - baseX) + a1[1] * (samples[i]![1] - baseY)
    }
    const det = s00 * s11 - s01 * s01
    if (Math.abs(det) < 1e-12) return null
    const alpha = (y0 * s11 - y1 * s01) / det
    const beta = (s00 * y1 - s01 * y0) / det
    if (
      !Number.isFinite(alpha) ||
      !Number.isFinite(beta) ||
      alpha <= 1e-4 ||
      beta <= 1e-4 ||
      alpha > maxHandle ||
      beta > maxHandle
    ) {
      return null
    }
    const p1: VectorPoint = [p0[0] + tHat1[0] * alpha, p0[1] + tHat1[1] * alpha]
    const p2: VectorPoint = [p3[0] + tHat2[0] * beta, p3[1] + tHat2[1] * beta]
    const controls: [VectorPoint, VectorPoint, VectorPoint, VectorPoint] = [p0, p1, p2, p3]
    let maxError = 0
    for (let i = 0; i < n; i += 1) {
      const p = cubicPoint(controls[0], controls[1], controls[2], controls[3], parameters[i]!)
      maxError = Math.max(maxError, distance(p, samples[i]!))
    }
    return { controls, error: maxError }
  }

  let best = solve(u)
  if (!best) return null

  // Reparameterize: chord length alone is a poor guess on S-shaped stretches.
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const nextU = [...u]
    for (let i = 1; i < n - 1; i += 1) {
      const t = u[i]!
      const controls = best!.controls
      const p = cubicPoint(controls[0], controls[1], controls[2], controls[3], t)
      const diff = sub(p, samples[i]!)
      const d1 = cubicDerivative(controls[0], controls[1], controls[2], controls[3], t)
      const d2: VectorPoint = [
        6 * (1 - t) * (controls[2][0] - 2 * controls[1][0] + controls[0][0]) +
          6 * t * (controls[3][0] - 2 * controls[2][0] + controls[1][0]),
        6 * (1 - t) * (controls[2][1] - 2 * controls[1][1] + controls[0][1]) +
          6 * t * (controls[3][1] - 2 * controls[2][1] + controls[1][1]),
      ]
      const numerator = diff[0] * d1[0] + diff[1] * d1[1]
      const denominator = d1[0] * d1[0] + d1[1] * d1[1] + diff[0] * d2[0] + diff[1] * d2[1]
      if (Math.abs(denominator) < 1e-12) continue
      const candidate = t - numerator / denominator
      if (candidate <= nextU[i - 1]! || candidate >= nextU[i + 1]!) continue
      nextU[i] = candidate
    }
    const candidate = solve(nextU)
    if (!candidate || candidate.error >= best.error) break
    best = candidate
    for (let i = 0; i < n; i += 1) u[i] = nextU[i]!
  }
  return best
}

/**
 * R5: delete a node without vandalising the neighbouring curvature.
 *
 * We resample the stretch that the deleted node used to describe, then solve a
 * single cubic that keeps the surviving endpoints and their tangents. Only when
 * that fit cannot stay inside `tolerance` do we fall back to a straight line.
 */
export function deleteAnchorWithRefit(
  anchors: readonly VectorPenAnchor[],
  index: number,
  closed: boolean,
  tolerance: number,
): { anchors: VectorPenAnchor[]; refit: boolean; error: number } {
  if (index < 0 || index >= anchors.length) {
    return { anchors: [...anchors], refit: false, error: 0 }
  }
  if (anchors.length <= 2) {
    const out = anchors.filter((_, i) => i !== index).map((a) => ({ ...a }))
    return { anchors: out, refit: false, error: 0 }
  }

  const total = anchors.length
  const prevIndex = (index - 1 + total) % total
  const nextIndex = (index + 1) % total
  const isEndpoint =
    !closed && (index === 0 || index === total - 1)

  if (isEndpoint) {
    const out = anchors.filter((_, i) => i !== index).map((a) => ({ ...a }))
    if (index === 0) {
      const first = out[0]
      if (first) {
        clearIn(first)
        first.type = anchorOut(first) ? 'cusp' : 'corner'
      }
    } else {
      const last = out[out.length - 1]
      if (last) {
        clearOut(last)
        last.type = anchorIn(last) ? 'cusp' : 'corner'
      }
    }
    return { anchors: out, refit: false, error: 0 }
  }

  const prevPoint: VectorPoint = [anchors[prevIndex]!.x, anchors[prevIndex]!.y]
  const nextPoint: VectorPoint = [anchors[nextIndex]!.x, anchors[nextIndex]!.y]
  const stretch = sampleStretch(anchors, prevIndex, nextIndex, closed)
  // A single cubic cannot reproduce every multi-hump stretch. Inkscape's
  // endpoint-slope fit is accepted as-is; we only fall back when the deviation
  // is large relative to the gap it replaces.
  const tol = Math.max(1e-3, tolerance, stretch.chord * 0.08)
  const fit = fitCubicWithTangents(
    stretch.points,
    prevPoint,
    nextPoint,
    stretch.tHat1,
    stretch.tHat2,
  )

  const out = anchors.map((a) => ({ ...a }))
  const endpoint = out.splice(index, 1)[0]
  if (!endpoint) return { anchors: [...anchors], refit: false, error: 0 }
  const adjustedIndex = index % out.length
  const prevAfter = out[(adjustedIndex - 1 + out.length) % out.length]!
  const nextAfter = out[adjustedIndex % out.length]!

  if (fit && fit.error <= tol) {
    setOut(prevAfter, fit.controls[1])
    setIn(nextAfter, fit.controls[2])
    if (prevAfter.type === 'corner') prevAfter.type = 'cusp'
    else applyNodeType(prevAfter, prevAfter.type)
    if (nextAfter.type === 'corner') nextAfter.type = 'cusp'
    else applyNodeType(nextAfter, nextAfter.type)
    return { anchors: out, refit: true, error: fit.error }
  }

  clearOut(prevAfter)
  clearIn(nextAfter)
  prevAfter.type = inferNodeType(prevAfter)
  nextAfter.type = inferNodeType(nextAfter)
  return { anchors: out, refit: false, error: fit ? fit.error : Infinity }
}

/** Move a node (and its handles) in place. */
export function moveAnchor(
  anchors: readonly VectorPenAnchor[],
  index: number,
  dx: number,
  dy: number,
): VectorPenAnchor[] {
  return anchors.map((a, i) => (i === index ? translateAnchor(a, dx, dy) : a))
}

/** Cycle through node types in the order corner → cusp → smooth → symmetric. */
export function nextNodeType(type: VectorPenAnchor['type']): VectorPenAnchor['type'] {
  if (type === 'corner') return 'cusp'
  if (type === 'cusp') return 'smooth'
  if (type === 'smooth') return 'symmetric'
  return 'corner'
}

/** Convert all anchors of a path at once, enforcing each new constraint. */
export function setPathNodeType(
  anchors: readonly VectorPenAnchor[],
  type: VectorPenAnchor['type'],
): VectorPenAnchor[] {
  return anchors.map((a) => {
    const next = { ...a }
    applyNodeType(next, type)
    return next
  })
}

/** Local tangent at a cubic segment endpoint, used for refit and snapping. */
export function segmentTangentAt(
  anchors: readonly VectorPenAnchor[],
  segmentIndex: number,
  atEnd: boolean,
): VectorPoint {
  const nextIndex = (segmentIndex + 1) % anchors.length
  const a = anchors[segmentIndex]!
  const b = anchors[nextIndex]!
  const cp = controlPoints(a, b)
  return normalize(cubicDerivative(cp[0], cp[1], cp[2], cp[3], atEnd ? 1 : 0))
}
