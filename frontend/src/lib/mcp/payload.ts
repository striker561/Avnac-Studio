/**
 * Pure normalizers for MCP tool payloads arriving from the Go backend.
 *
 * The Go side (avnac-system/mcp/tools.go) defines the tool input schemas and
 * emits them verbatim over the Wails "mcp:action" event, so these functions
 * own the conversion from loosely-typed agent input to engine values
 * (SaraswatiColor, font weights, align kinds, polygon point lists).
 * No store, DOM, or Wails access here — everything is payload in, value out.
 */

import type { SaraswatiColor } from "@/lib/saraswati";

/** Standard error for scene-touching tools called before a canvas is open. */
export const NO_SCENE_ERROR = "No active canvas scene. Call create_canvas first.";

/** Loosely-typed MCP tool payload (JSON-decoded on the Go side). */
export type MCPPayload = Record<string, any>;

export type MCPActionEnvelope = {
  action: string;
  requestId?: string;
  payload?: MCPPayload;
};

// ─── paints ───────────────────────────────────────────────────────────────────

export function parseColor(input?: string): SaraswatiColor {
  if (!input || input === "transparent") {
    return { type: "solid", color: "transparent" };
  }
  return { type: "solid", color: input };
}

export type MCPPaintInput = {
  fill?: string;
  color?: string;
  gradientStops?: unknown;
  gradientAngle?: unknown;
};

export type MCPGradientStop = { color: string; offset: number };

export function normalizeGradientStops(input: unknown): MCPGradientStop[] | null {
  if (!Array.isArray(input)) return null;
  const stops = input
    .filter((s): s is { color: string; offset: number } => {
      if (!s || typeof s !== "object") return false;
      const rec = s as Record<string, unknown>;
      return (
        typeof rec.color === "string" &&
        rec.color.length > 0 &&
        typeof rec.offset === "number" &&
        Number.isFinite(rec.offset)
      );
    })
    .map((s) => ({
      color: s.color,
      offset: Math.min(1, Math.max(0, s.offset)),
    }))
    .sort((a, b) => a.offset - b.offset);
  if (stops.length < 2) return null;
  return stops;
}

export function normalizeGradientAngle(input: unknown, fallback = 0): number {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  const n = Number(input);
  if (Number.isFinite(n)) return n;
  return fallback;
}

export function gradientCss(stops: MCPGradientStop[], angle: number): string {
  const s = stops.map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`).join(", ");
  return `linear-gradient(${angle}deg, ${s})`;
}

export function parsePaint(input: MCPPaintInput): SaraswatiColor {
  const stops = normalizeGradientStops(input.gradientStops);
  if (stops) {
    const angle = normalizeGradientAngle(input.gradientAngle, 0);
    return { type: "gradient", css: gradientCss(stops, angle), stops, angle };
  }
  return parseColor(input.fill ?? input.color);
}

export function existingGradientAngle(fill: unknown, fallback = 0): number {
  if (fill && typeof fill === "object") {
    const rec = fill as Record<string, unknown>;
    if (rec.type === "gradient" && typeof rec.angle === "number" && Number.isFinite(rec.angle)) {
      return rec.angle as number;
    }
  }
  return fallback;
}

export function existingGradientStops(fill: unknown): MCPGradientStop[] | null {
  if (fill && typeof fill === "object") {
    const rec = fill as Record<string, unknown>;
    if (rec.type === "gradient" && Array.isArray(rec.stops)) {
      return normalizeGradientStops(rec.stops);
    }
  }
  return null;
}

/**
 * Resolve a paint update for modify_elements.
 * - gradientStops present + valid → new gradient (angle falls back to mod angle → existing angle → 0)
 * - only gradientAngle present + existing is gradient → re-angle existing stops
 * - fill/color present → solid (unless gradient above takes precedence)
 * - otherwise → null (no paint change)
 */
export function resolveModifyPaint(
  mod: { fill?: string; color?: string; gradientStops?: unknown; gradientAngle?: unknown },
  currentPaint: unknown,
): SaraswatiColor | null {
  const hasStopsField = mod.gradientStops !== undefined;
  const hasAngleField = mod.gradientAngle !== undefined;
  const hasSolidField = mod.fill !== undefined || mod.color !== undefined;

  if (hasStopsField) {
    const stops = normalizeGradientStops(mod.gradientStops);
    if (stops) {
      const angle = normalizeGradientAngle(
        mod.gradientAngle,
        existingGradientAngle(currentPaint, 0),
      );
      return { type: "gradient", css: gradientCss(stops, angle), stops, angle };
    }
    // Invalid stops array: fall through to solid if provided, else no change.
    if (hasSolidField) return parseColor(mod.fill ?? mod.color);
    return null;
  }

  if (hasAngleField) {
    const currentStops = existingGradientStops(currentPaint);
    if (currentStops) {
      const angle = normalizeGradientAngle(mod.gradientAngle, existingGradientAngle(currentPaint, 0));
      return { type: "gradient", css: gradientCss(currentStops, angle), stops: currentStops, angle };
    }
    if (hasSolidField) return parsePaint(mod as MCPPaintInput);
    return null;
  }

  if (hasSolidField) {
    // parsePaint also covers the case where solid + gradient arrive together (gradient wins).
    return parsePaint(mod as MCPPaintInput);
  }
  return null;
}

// ─── text ─────────────────────────────────────────────────────────────────────

export function normalizeTextAlign(input: unknown): "left" | "center" | "right" {
  const v = String(input ?? "left").trim().toLowerCase();
  if (v === "center" || v === "middle") return "center";
  if (v === "right" || v === "end") return "right";
  return "left";
}

export function normalizeFontWeight(input: unknown): string {
  if (input == null) return "400";
  const v = String(input).trim().toLowerCase();
  if (v === "bold") return "700";
  if (v === "medium") return "500";
  if (v === "semibold" || v === "semi-bold") return "600";
  if (v === "normal" || v === "regular") return "400";
  if (/^\d{3}$/.test(v)) return v;
  const n = Number(v);
  if (Number.isFinite(n)) return String(Math.min(900, Math.max(100, Math.round(n))));
  return "400";
}

export function normalizeFontStyle(input: unknown): "normal" | "italic" {
  return String(input ?? "normal").trim().toLowerCase() === "italic" ? "italic" : "normal";
}

// ─── align kinds ──────────────────────────────────────────────────────────────

export const ALIGN_KINDS = ["left", "centerH", "right", "top", "centerV", "bottom"];

export function normalizeAlignKind(input: unknown): string {
  const v = String(input ?? "").trim();
  const lower = v.toLowerCase();
  if (lower === "left") return "left";
  if (lower === "center" || lower === "centerh" || lower === "center_h") return "centerH";
  if (lower === "right") return "right";
  if (lower === "top") return "top";
  if (lower === "middle" || lower === "centerv" || lower === "center_v") return "centerV";
  if (lower === "bottom") return "bottom";
  // Already-normalized engine kinds pass through.
  if (v === "centerH" || v === "centerV") return v;
  return v;
}

// ─── polygon geometry ─────────────────────────────────────────────────────────

export function regularPolygonPoints(sides: number, radius: number) {
  const n = Math.max(3, Math.min(32, Math.round(sides)));
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < n; index += 1) {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  return points;
}

export function starPolygonPoints(pointsCount: number, outerRadius: number) {
  const n = Math.max(3, Math.min(24, Math.round(pointsCount)));
  const innerRadius = outerRadius * 0.45;
  const points: Array<{ x: number; y: number }> = [];
  const step = Math.PI / n;
  for (let index = 0; index < n * 2; index += 1) {
    const angle = -Math.PI / 2 + index * step;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  return points;
}
