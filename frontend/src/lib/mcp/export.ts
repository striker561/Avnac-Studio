/**
 * Export planning for MCP `export` ops.
 *
 * Kept pure (no DOM) so the multiplier clamp and object crop can be unit
 * tested: the handler only has to render the planned canvas and cut the rect.
 */

import { getRenderableNodeBounds } from "@/lib/editor/overlays";
import type { SaraswatiScene } from "@/lib/saraswati";

export type ExportCrop = { x: number; y: number; width: number; height: number };

export type ExportPlan = {
  /** Effective scale applied to the artboard, after clamping. */
  multiplier: number;
  /** Paint the artboard background before drawing (false for object cutouts). */
  prePaintBackground: boolean;
  /** Object bounds in artboard pixels; null for a full-artboard export. */
  crop: ExportCrop | null;
};

export const DEFAULT_EXPORT_MULTIPLIER = 1;
export const MIN_EXPORT_MULTIPLIER = 0.25;
export const MAX_EXPORT_MULTIPLIER = 8;
/** Largest output edge, to keep a 16000px artboard at 8x from exploding. */
export const MAX_EXPORT_EDGE_PX = 8192;
/** Breathing room around a cut-out object, in artboard pixels. */
export const OBJECT_EXPORT_PADDING = 8;

/**
 * Resolve the requested multiplier to a safe, effective one.
 *
 * Accepts numeric strings because MCP clients send loose JSON. Invalid or
 * non-positive values fall back to 1 instead of failing an export.
 */
export function resolveExportMultiplier(
  value: unknown,
  artboard: { width: number; height: number },
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  let multiplier =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXPORT_MULTIPLIER;
  multiplier = Math.min(
    MAX_EXPORT_MULTIPLIER,
    Math.max(MIN_EXPORT_MULTIPLIER, multiplier),
  );

  const maxEdge = Math.max(1, artboard.width, artboard.height);
  if (maxEdge * multiplier > MAX_EXPORT_EDGE_PX) {
    multiplier = MAX_EXPORT_EDGE_PX / maxEdge;
  }
  return multiplier;
}

/** Object bounds padded for antialiasing/shadow spill, clamped to the artboard. */
export function computeObjectCrop(
  scene: SaraswatiScene,
  objectId: string,
  padding: number = OBJECT_EXPORT_PADDING,
): ExportCrop | null {
  const bounds = getRenderableNodeBounds(scene, objectId);
  if (!bounds) return null;

  const artboardWidth = Math.max(1, scene.artboard.width);
  const artboardHeight = Math.max(1, scene.artboard.height);
  const x = Math.max(0, Math.floor(bounds.x - padding));
  const y = Math.max(0, Math.floor(bounds.y - padding));
  const right = Math.min(artboardWidth, Math.ceil(bounds.x + bounds.width + padding));
  const bottom = Math.min(artboardHeight, Math.ceil(bounds.y + bounds.height + padding));

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

export function planExport(
  scene: SaraswatiScene,
  payload: { multiplier?: unknown; objectId?: unknown; transparent?: unknown },
): ExportPlan {
  const objectId =
    typeof payload.objectId === "string" && payload.objectId
      ? payload.objectId
      : null;
  return {
    multiplier: resolveExportMultiplier(payload.multiplier, scene.artboard),
    prePaintBackground: objectId ? false : payload.transparent !== true,
    crop: objectId ? computeObjectCrop(scene, objectId) : null,
  };
}
