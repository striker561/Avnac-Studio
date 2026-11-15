import type { VectorBounds, VectorPoint, VectorViewport } from './types'
import { VECTOR_ZOOM_MAX, VECTOR_ZOOM_MIN } from './constants'
import { clamp } from './geometry'

export type ViewportRect = {
  left: number
  top: number
  width: number
  height: number
}

export function clampViewScale(scale: number): number {
  return clamp(scale, VECTOR_ZOOM_MIN, VECTOR_ZOOM_MAX)
}

/** CSS client coordinates → document user units. */
export function screenToBoard(
  clientX: number,
  clientY: number,
  rect: Pick<ViewportRect, 'left' | 'top'>,
  view: VectorViewport,
): VectorPoint {
  return [
    (clientX - rect.left - view.tx) / view.scale,
    (clientY - rect.top - view.ty) / view.scale,
  ]
}

/** Document user units → canvas-local CSS pixels. */
export function boardToScreen(
  p: VectorPoint,
  view: VectorViewport,
): VectorPoint {
  return [p[0] * view.scale + view.tx, p[1] * view.scale + view.ty]
}

/** Board size in CSS pixels at the current view. */
export function boardScreenSize(
  board: { width: number; height: number },
  view: VectorViewport,
): { width: number; height: number } {
  return { width: board.width * view.scale, height: board.height * view.scale }
}

/**
 * Fit the whole board in a viewport with padding. The result is independent of
 * the document: resizing the panel only changes this view transform, never the
 * geometry (R2).
 */
export function fitBoardView(
  board: { width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
  paddingPx = 28,
  maxScale = 1,
): VectorViewport {
  const availableW = Math.max(1, viewportWidth - paddingPx * 2)
  const availableH = Math.max(1, viewportHeight - paddingPx * 2)
  const fit = Math.min(availableW / Math.max(1, board.width), availableH / Math.max(1, board.height))
  const scale = clampViewScale(Math.min(fit, maxScale))
  const tx = (viewportWidth - board.width * scale) / 2
  const ty = (viewportHeight - board.height * scale) / 2
  return { scale, tx, ty }
}

export function zoomViewAt(
  view: VectorViewport,
  anchorX: number,
  anchorY: number,
  factor: number,
): VectorViewport {
  const nextScale = clampViewScale(view.scale * factor)
  if (Math.abs(nextScale - view.scale) < 1e-9) return view
  const worldX = (anchorX - view.tx) / view.scale
  const worldY = (anchorY - view.ty) / view.scale
  return {
    scale: nextScale,
    tx: anchorX - worldX * nextScale,
    ty: anchorY - worldY * nextScale,
  }
}

export function panView(view: VectorViewport, dx: number, dy: number): VectorViewport {
  return { ...view, tx: view.tx + dx, ty: view.ty + dy }
}

export function resetBoardView(): VectorViewport {
  return { scale: 1, tx: 0, ty: 0 }
}

/** Fit a document-space bounds rectangle into the viewport. */
export function fitBoundsView(
  bounds: VectorBounds,
  viewportWidth: number,
  viewportHeight: number,
  paddingPx = 28,
  maxScale = 8,
): VectorViewport {
  const width = Math.max(1e-6, bounds.maxX - bounds.minX)
  const height = Math.max(1e-6, bounds.maxY - bounds.minY)
  const availableW = Math.max(1, viewportWidth - paddingPx * 2)
  const availableH = Math.max(1, viewportHeight - paddingPx * 2)
  const scale = clampViewScale(Math.min(availableW / width, availableH / height, maxScale))
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  return {
    scale,
    tx: viewportWidth / 2 - centerX * scale,
    ty: viewportHeight / 2 - centerY * scale,
  }
}

/** Screen-pixel distance threshold converted to document units (R6). */
export function screenPxToDoc(px: number, view: VectorViewport): number {
  return px / Math.max(1e-6, view.scale)
}

export function docToScreenPx(value: number, view: VectorViewport): number {
  return value * view.scale
}

/** True when a document-space point is inside the visible canvas viewport. */
export function pointInView(
  p: VectorPoint,
  view: VectorViewport,
  width: number,
  height: number,
  margin = 0,
): boolean {
  const screen = boardToScreen(p, view)
  return (
    screen[0] >= -margin &&
    screen[0] <= width + margin &&
    screen[1] >= -margin &&
    screen[1] <= height + margin
  )
}

/** Board bounds in document space. */
export function boardBounds(board: { width: number; height: number }): VectorBounds {
  return { minX: 0, minY: 0, maxX: board.width, maxY: board.height }
}

export function clampBoardPoint(
  p: VectorPoint,
  board: { width: number; height: number },
): VectorPoint {
  return [clamp(p[0], 0, board.width), clamp(p[1], 0, board.height)]
}

export function viewSignature(view: VectorViewport): string {
  return `${view.scale.toFixed(6)}:${view.tx.toFixed(2)}:${view.ty.toFixed(2)}`
}
