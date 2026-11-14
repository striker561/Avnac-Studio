/**
 * Deterministic scene checks for the MCP validate action.
 *
 * These are intentionally conservative: warnings flag things a designer should
 * look at (near tangencies, tiny type) without pretending to replace a visual
 * review. Text contrast is measured against the topmost solid shape beneath the
 * text centre, falling back to the artboard fill.
 */
import {
  isSaraswatiRenderableNode,
  listSaraswatiNodesInRenderOrder,
  type SaraswatiColor,
  type SaraswatiNode,
  type SaraswatiScene,
} from "@/lib/saraswati";
import { getNodeBounds } from "@/lib/saraswati/spatial";

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  code: string;
  severity: ValidationSeverity;
  message: string;
  nodeId?: string;
  otherNodeId?: string;
  basis?: string;
};

export type ValidationOptions = {
  tolerance?: number;
  loadedFonts?: Record<string, boolean>;
  checkTangencies?: boolean;
};

export type ValidationReport = {
  ok: boolean;
  errors: number;
  warnings: number;
  info: number;
  issues: ValidationIssue[];
  checked: {
    nodes: number;
    text: number;
    strokes: number;
    fontFamilies: number;
  };
};

function parseHexColor(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const color = (input as { color?: unknown }).color;
  if (typeof color !== "string") return null;
  const value = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return (
      "#" +
      value
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    );
  }
  return null;
}

function luminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/../g)!
    .map((part) => parseInt(part, 16) / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function colorOf(node: SaraswatiNode): SaraswatiColor | null {
  const anyNode = node as Record<string, any>;
  if (node.type === "text") return anyNode.color ?? null;
  if (node.type === "line") return anyNode.stroke ?? null;
  if ("fill" in node) return anyNode.fill ?? null;
  return null;
}

function containsPoint(
  node: SaraswatiNode,
  x: number,
  y: number,
): boolean {
  if (!isSaraswatiRenderableNode(node)) return false;
  const b = getNodeBounds(node);
  return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}

function backgroundUnder(
  scene: SaraswatiScene,
  text: SaraswatiNode,
): { color: SaraswatiColor | null; basis: string } {
  const b = getNodeBounds(text as any);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const leaves = listSaraswatiNodesInRenderOrder(scene);
  let found: SaraswatiColor | null = null;
  for (const node of leaves) {
    if (node.id === text.id) continue;
    if (node.type === "image") continue;
    if (!containsPoint(node, cx, cy)) continue;
    const paint = colorOf(node);
    if (paint && paint.type === "solid" && paint.color !== "transparent") {
      found = paint;
    }
  }
  return found
    ? { color: found, basis: "topmost shape under text centre" }
    : { color: scene.artboard.bg, basis: "artboard fill" };
}

function gapBetween(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): number {
  const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), 0);
  const dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height), 0);
  return Math.hypot(dx, dy);
}

export function validateScene(
  scene: SaraswatiScene,
  options: ValidationOptions = {},
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const tolerance = Math.max(0, options.tolerance ?? 0.5);
  const nodes = Object.values(scene.nodes).filter(
    (node) => node.id !== scene.root,
  );
  const renderables = nodes.filter(isSaraswatiRenderableNode);
  const texts = renderables.filter((node) => node.type === "text");
  let strokes = 0;
  const families = new Set<string>();

  for (const [key, node] of Object.entries(scene.nodes)) {
    if (key !== node.id) {
      issues.push({
        code: "invalid_id",
        severity: "error",
        nodeId: node.id,
        message: "Node key does not match node.id; saved documents will be unstable.",
      });
    }
  }

  for (const node of renderables) {
    const bounds = getNodeBounds(node);
    if (
      bounds.x < -tolerance ||
      bounds.y < -tolerance ||
      bounds.x + bounds.width > scene.artboard.width + tolerance ||
      bounds.y + bounds.height > scene.artboard.height + tolerance
    ) {
      issues.push({
        code: "out_of_bounds",
        severity: "warning",
        nodeId: node.id,
        message:
          "Extends outside the artboard (" +
          Math.round(bounds.x) + "," + Math.round(bounds.y) + " " +
          Math.round(bounds.width) + "×" + Math.round(bounds.height) + ").",
      });
    }
    if ("strokeWidth" in node) {
      const strokeWidth = Number((node as any).strokeWidth ?? 0);
      if (strokeWidth > 0) {
        strokes++;
        if (strokeWidth < 0.5) {
          issues.push({
            code: "thin_stroke",
            severity: "warning",
            nodeId: node.id,
            message: "Stroke is " + strokeWidth + "px; below 0.5px it may disappear in print.",
          });
        }
      }
    }
    if (node.type === "text") {
      const text = String((node as any).text ?? "");
      if (!text.trim()) {
        issues.push({
          code: "empty_text",
          severity: "warning",
          nodeId: node.id,
          message: "Text object is empty.",
        });
      }
      const fontSize = Number((node as any).fontSize ?? 0);
      if (fontSize > 0 && fontSize < 8) {
        issues.push({
          code: "tiny_type",
          severity: "warning",
          nodeId: node.id,
          message: "Type is " + fontSize + "px; check legibility at final size.",
        });
      }
      const family = String((node as any).fontFamily ?? "").trim();
      if (family) {
        families.add(family);
        if (options.loadedFonts && options.loadedFonts[family] === false) {
          issues.push({
            code: "font_not_loaded",
            severity: "error",
            nodeId: node.id,
            message: "Font " + family + " is not loaded in this client; rendering will fall back.",
          });
        }
      }

      const textColor = parseHexColor(colorOf(node));
      const background = backgroundUnder(scene, node);
      const bgColor = parseHexColor(background.color);
      if (textColor && bgColor) {
        const ratio = contrastRatio(textColor, bgColor);
        const large = fontSize >= 24 || Number((node as any).fontWeight ?? 400) >= 700;
        const minimum = large ? 3 : 4.5;
        if (ratio + 0.001 < minimum) {
          issues.push({
            code: "low_contrast",
            severity: "warning",
            nodeId: node.id,
            basis: background.basis,
            message:
              "Text contrast is " + ratio.toFixed(2) + ":1 against " + background.basis +
              "; target " + minimum + ":1.",
          });
        }
      }
    }
  }

  const names = new Map<string, string[]>();
  for (const node of nodes) {
    const name = String((node as any).name ?? "").trim();
    if (!name) continue;
    const list = names.get(name) ?? [];
    list.push(node.id);
    names.set(name, list);
  }
  for (const [name, ids] of names) {
    if (ids.length > 1) {
      issues.push({
        code: "duplicate_name",
        severity: "info",
        nodeId: ids[0],
        message:
          "Name " + JSON.stringify(name) + " is shared by " + ids.length +
          " objects; name targeting will be ambiguous.",
      });
    }
  }

  if (options.checkTangencies !== false && renderables.length <= 250) {
    const shapes = renderables.filter((node) => node.type !== "text");
    for (let i = 0; i < shapes.length; i++) {
      const a = getNodeBounds(shapes[i]!);
      for (let j = i + 1; j < shapes.length; j++) {
        const b = getNodeBounds(shapes[j]!);
        const gap = gapBetween(a, b);
        if (gap > 0 && gap <= 1.5) {
          issues.push({
            code: "near_tangency",
            severity: "info",
            nodeId: shapes[i]!.id,
            otherNodeId: shapes[j]!.id,
            message: "Objects are " + gap.toFixed(1) + "px apart; this may read as a tangent.",
          });
        }
      }
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const info = issues.filter((issue) => issue.severity === "info").length;
  return {
    ok: errors === 0,
    errors,
    warnings,
    info,
    issues,
    checked: {
      nodes: nodes.length,
      text: texts.length,
      strokes,
      fontFamilies: families.size,
    },
  };
}
