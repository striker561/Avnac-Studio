import type { VectorBoardDocument, VectorBoardStroke } from './types'
import { formatNumber } from './geometry'
import { buildStrokePath, pathToSvgData, strokeCanFill } from './path'

export type VectorSvgOptions = {
  /** Paint a background rect. Transparent by default (scene placement). */
  background?: string
  /** Include hidden layers. Off by default, matching canvas output. */
  includeHiddenLayers?: boolean
  /** Extra attributes placed on the root <svg>. */
  rootAttributes?: Record<string, string>
}

function escapeXmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function paintAttributes(stroke: VectorBoardStroke): string {
  const attrs: string[] = []
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
  attrs.push(fillVisible ? `fill="${escapeXmlAttr(stroke.fill)}"` : 'fill="none"')
  if (fillVisible) {
    if (stroke.fillOpacity !== 1) {
      attrs.push(`fill-opacity="${formatNumber(stroke.fillOpacity)}"`)
    }
    if (stroke.fillRule !== 'nonzero') {
      attrs.push(`fill-rule="${stroke.fillRule}"`)
    }
  }
  attrs.push(strokeVisible ? `stroke="${escapeXmlAttr(stroke.stroke)}"` : 'stroke="none"')
  if (strokeVisible) {
    attrs.push(`stroke-width="${formatNumber(stroke.strokeWidth)}"`)
    if (stroke.strokeOpacity !== 1) {
      attrs.push(`stroke-opacity="${formatNumber(stroke.strokeOpacity)}"`)
    }
    attrs.push(`stroke-linecap="${stroke.lineCap}"`)
    attrs.push(`stroke-linejoin="${stroke.lineJoin}"`)
  }
  return attrs.join(' ')
}

function arrowHeadPoints(stroke: VectorBoardStroke): string {
  if (stroke.points.length < 2) return ''
  const [x0, y0] = stroke.points[0]!
  const [x1, y1] = stroke.points[1]!
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return ''
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
    .map((p) => `${formatNumber(p[0])},${formatNumber(p[1])}`)
    .join(' ')
}

export function strokeToSvgMarkup(
  stroke: VectorBoardStroke,
  options: { includeMeta?: boolean } = {},
): string {
  if (stroke.kind === 'arrow' && stroke.points.length >= 2) {
    const [x0, y0] = stroke.points[0]!
    const [x1, y1] = stroke.points[1]!
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy)
    if (len < 1e-9) return ''
    const head = Math.min(len * 0.35, 28 + stroke.strokeWidth * 4)
    const ux = dx / len
    const uy = dy / len
    const end = [x1 - ux * head, y1 - uy * head] as const
    const strokeVisible =
      stroke.stroke.length > 0 &&
      stroke.stroke !== 'transparent' &&
      stroke.strokeWidth > 0 &&
      stroke.strokeOpacity > 0
    if (!strokeVisible) return ''
    const color = escapeXmlAttr(stroke.stroke)
    return (
      `<g>` +
      `<path d="M${formatNumber(x0)} ${formatNumber(y0)} L${formatNumber(end[0])} ${formatNumber(end[1])}" ` +
      `fill="none" stroke="${color}" stroke-width="${formatNumber(stroke.strokeWidth)}" ` +
      `stroke-opacity="${formatNumber(stroke.strokeOpacity)}" stroke-linecap="${stroke.lineCap}" ` +
      `stroke-linejoin="${stroke.lineJoin}"/>` +
      `<polygon points="${arrowHeadPoints(stroke)}" fill="${color}" fill-opacity="${formatNumber(
        stroke.strokeOpacity,
      )}"/>` +
      `</g>`
    )
  }

  const path = buildStrokePath(stroke)
  if (path.subpaths.length === 0) return ''
  const d = pathToSvgData(path)
  if (!d) return ''
  const meta = options.includeMeta
    ? ` data-stroke-id="${escapeXmlAttr(stroke.id)}" data-stroke-kind="${stroke.kind}"`
    : ''
  return `<path${meta} d="${d}" ${paintAttributes(stroke)}/>`
}

/**
 * R10: serialize a board to real SVG paths. No bitmap is produced here, so a
 * board placed on the scene stays resolution-independent.
 */
export function vectorBoardDocumentToSvg(
  doc: VectorBoardDocument,
  options: VectorSvgOptions = {},
): string {
  const width = Math.max(1, doc.size.width)
  const height = Math.max(1, doc.size.height)
  const rootAttrs: string[] = [
    `xmlns="http://www.w3.org/2000/svg"`,
    `width="${formatNumber(width)}"`,
    `height="${formatNumber(height)}"`,
    `viewBox="0 0 ${formatNumber(width)} ${formatNumber(height)}"`,
    `data-avnac-vector-board="1"`,
  ]
  if (options.rootAttributes) {
    for (const [key, value] of Object.entries(options.rootAttributes)) {
      rootAttrs.push(`${escapeXmlAttr(key)}="${escapeXmlAttr(value)}"`)
    }
  }
  const parts: string[] = []
  const bg = options.background
  if (bg && bg !== 'transparent') {
    parts.push(
      `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(
        height,
      )}" fill="${escapeXmlAttr(bg)}"/>`,
    )
  }
  for (const layer of doc.layers) {
    if (!layer.visible && options.includeHiddenLayers !== true) continue
    const strokes = layer.strokes
      .map((stroke) => strokeToSvgMarkup(stroke))
      .filter(Boolean)
    parts.push(
      `<g data-layer-id="${escapeXmlAttr(layer.id)}" data-layer-name="${escapeXmlAttr(
        layer.name,
      )}"${layer.visible ? '' : ' style="display:none"'}` +
        `>${strokes.join('')}</g>`,
    )
  }
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg ${rootAttrs.join(' ')}>${parts.join('')}</svg>`
}

export function vectorBoardDocumentToSvgDataUrl(
  doc: VectorBoardDocument,
  options: VectorSvgOptions = {},
): string {
  const svg = vectorBoardDocumentToSvg(doc, options)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Decode a data:image/svg+xml URL back to source (used by the scene exporter). */
export function decodeSvgDataUrl(src: string): string | null {
  if (!src.startsWith('data:image/svg+xml')) return null
  const comma = src.indexOf(',')
  if (comma < 0) return null
  const meta = src.slice(0, comma)
  const payload = src.slice(comma + 1)
  try {
    if (meta.includes(';base64')) {
      return atob(payload)
    }
    return decodeURIComponent(payload)
  } catch {
    return null
  }
}

/** True when the src is an Avnac vector-board SVG we can inline on export. */
export function isAvnacVectorBoardSvg(src: string): boolean {
  if (!src.startsWith('data:image/svg+xml')) return false
  const svg = decodeSvgDataUrl(src)
  return svg != null && /data-avnac-vector-board="1"/.test(svg)
}
