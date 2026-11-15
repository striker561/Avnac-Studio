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
  /** Rule that defines the check, as a rules:// id, when one backs the issue. */
  rule?: string;
};

/**
 * One rule-backed measurement. Unlike an issue, a passing check is still
 * reported: it is the receipt that the rule was actually applied, not read.
 */
export type RuleCheck = {
  id: string;
  rule: string;
  status: "pass" | "warn";
  /** The measured numbers, so the check can be argued with. */
  detail: string;
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
  /** Rule-backed checks, passing or not, in a stable order. */
  checks: RuleCheck[];
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

type Box = { x: number; y: number; width: number; height: number };

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function unionBounds(nodes: SaraswatiNode[]): Box | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const b = getNodeBounds(node as any);
    if (b.width <= 0 || b.height <= 0) continue;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Content excludes the background plate. A full-bleed fill covers the artboard
 * by design, so counting it would report zero margins and 100% density on every
 * poster — a warning that fires on everything teaches the reader to ignore it.
 */
function contentNodes(scene: SaraswatiScene, nodes: SaraswatiNode[]): SaraswatiNode[] {
  const area = scene.artboard.width * scene.artboard.height;
  if (area <= 0) return nodes;
  return nodes.filter((node) => {
    const b = getNodeBounds(node as any);
    return b.width * b.height < area * 0.9;
  });
}

/**
 * Rule-backed checks. These are the measurements the library states as numbers
 * (margin floor, level count, step ratio, density band, optical centring), so
 * validate can report a fault instead of leaving it to prose nobody reads.
 *
 * ponytail: the density grid is 4x4 bounds coverage, not a blurred raster, so a
 * node counts as filling a cell when the cell centre is inside its box. Upgrade
 * to a downsampled render only if the bounds approximation proves too coarse.
 */
function ruleChecks(
  scene: SaraswatiScene,
  renderables: SaraswatiNode[],
  texts: SaraswatiNode[],
  lowContrast: number,
  issues: ValidationIssue[],
): RuleCheck[] {
  const checks: RuleCheck[] = [];
  const width = scene.artboard.width;
  const height = scene.artboard.height;
  const content = contentNodes(scene, renderables);

  // rules://08-negative-space — margin ladder.
  const bounds = unionBounds(content);
  if (bounds && width > 0 && height > 0) {
    const left = bounds.x;
    const top = bounds.y;
    const right = width - (bounds.x + bounds.width);
    const bottom = height - (bounds.y + bounds.height);
    const floor = Math.min(width, height) * 0.08;
    const smallest = Math.min(left, right, top, bottom);
    const warn = smallest + 0.5 < floor;
    checks.push({
      id: "margin_ladder",
      rule: "08-negative-space",
      status: warn ? "warn" : "pass",
      detail:
        "top " + round1(top) + " · right " + round1(right) + " · bottom " + round1(bottom) +
        " · left " + round1(left) + " px; floor " + round1(floor) + " (8% of " +
        round1(Math.min(width, height)) + "); bottom should be largest.",
    });
    if (warn) {
      issues.push({
        code: "tight_margin",
        severity: "warning",
        rule: "08-negative-space",
        message:
          "Content sits " + round1(smallest) + "px from the nearest edge; rules://08-negative-space " +
          "asks for at least " + round1(floor) + "px (8% of the short edge) with the bottom margin largest.",
      });
    }
  }

  // rules://08-negative-space — density band (4x4 occupancy, backgrounds aside).
  if (width > 0 && height > 0) {
    const cols = 4;
    const rows = 4;
    let filled = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = ((col + 0.5) * width) / cols;
        const cy = ((row + 0.5) * height) / rows;
        const hit = content.some((node) => {
          const b = getNodeBounds(node as any);
          return cx >= b.x && cx <= b.x + b.width && cy >= b.y && cy <= b.y + b.height;
        });
        if (hit) filled++;
      }
    }
    const share = filled / (cols * rows);
    const warn = share > 0.75;
    checks.push({
      id: "density",
      rule: "08-negative-space",
      status: warn ? "warn" : "pass",
      detail:
        filled + "/" + cols * rows + " cells covered (" + Math.round(share * 100) +
        "%); rules://08 bands top out at 75%, and a single-message poster sits under 20%.",
    });
    if (warn) {
      issues.push({
        code: "over_dense",
        severity: "warning",
        rule: "08-negative-space",
        message:
          "Content covers " + Math.round(share * 100) + "% of a 4x4 grid; rules://08-negative-space " +
          "bands top out at 75%, so the sheet has no quiet area to land on.",
      });
    }
  }

  // rules://24-typographic-hierarchy — level census and step measurement.
  const levels = new Map<string, number>();
  const levelsBySize = new Map<number, Set<string>>();
  for (const node of texts) {
    const anyNode = node as any;
    if (!String(anyNode.text ?? "").trim()) continue;
    const size = Number(anyNode.fontSize ?? 0);
    const weight = String(anyNode.fontWeight ?? "400");
    const color = parseHexColor(colorOf(node)) ?? "other";
    const level = size + "|" + weight + "|" + color;
    levels.set(level, size);
    const signatures = levelsBySize.get(size) ?? new Set<string>();
    signatures.add(weight + "|" + color);
    levelsBySize.set(size, signatures);
  }
  const sizes = [...new Set([...levels.values()])].sort((a, b) => b - a);
  const levelWarn = levels.size > 5;
  checks.push({
    id: "level_census",
    rule: "24-typographic-hierarchy",
    status: levelWarn ? "warn" : "pass",
    detail:
      levels.size + " level(s)" + (sizes.length ? " at " + sizes.join(" / ") + " px" : "") +
      "; rules://24 allows four, five on a poster.",
  });
  if (levelWarn) {
    issues.push({
      code: "level_overflow",
      severity: "warning",
      rule: "24-typographic-hierarchy",
      message:
        "Text has " + levels.size + " distinct levels (size + weight + colour); rules://24-typographic-hierarchy " +
        "allows four, five on a poster. Merge or remove one.",
    });
  }
  if (sizes.length >= 2) {
    const flat: string[] = [];
    for (let i = 0; i < sizes.length - 1; i++) {
      const ratio = sizes[i + 1]! / sizes[i]!;
      if (ratio <= 0.87) continue;
      // A level can also step by weight or colour; only a pair that shares both
      // is carrying its whole difference in a size change too small to read.
      const left = levelsBySize.get(sizes[i]!) ?? new Set<string>();
      const right = levelsBySize.get(sizes[i + 1]!) ?? new Set<string>();
      const distinguished = [...left].some((signature) => !right.has(signature));
      if (!distinguished) flat.push(sizes[i] + "→" + sizes[i + 1]);
    }
    const stepWarn = flat.length > 0;
    checks.push({
      id: "type_steps",
      rule: "24-typographic-hierarchy",
      status: stepWarn ? "warn" : "pass",
      detail: stepWarn
        ? "Flat step at " + flat.join(", ") + " (under 1.15x); rules://24 wants 1.3x or two weight steps."
        : "Every adjacent size pair is at least 1.15x; rules://24 wants 1.3x-1.5x.",
    });
    if (stepWarn) {
      issues.push({
        code: "flat_type_steps",
        severity: "warning",
        rule: "24-typographic-hierarchy",
        message:
          "Adjacent type sizes " + flat.join(", ") + " differ by less than 1.15x; rules://24-typographic-hierarchy " +
          "calls that one size, not two levels.",
      });
    }
  }

  // rules://04-balance-and-proportion — optical centring.
  const centred = texts.filter((node) => {
    const b = getNodeBounds(node as any);
    const anyNode = node as any;
    return (
      Number(anyNode.fontSize ?? 0) >= 20 &&
      Math.abs(b.x + b.width / 2 - width / 2) <= 2 &&
      Math.abs(b.y + b.height / 2 - height / 2) <= 2
    );
  });
  checks.push({
    id: "optical_centring",
    rule: "04-balance-and-proportion",
    status: centred.length > 0 ? "warn" : "pass",
    detail:
      centred.length > 0
        ? centred.length + " display text block(s) sit exactly on the geometric centre; rules://04 wants 2-4px high at 100px, about 5% above."
        : "No display text is centred mathematically; nothing to correct.",
  });
  if (centred.length > 0) {
    issues.push({
      code: "mathematical_centring",
      severity: "warning",
      nodeId: centred[0]!.id,
      rule: "04-balance-and-proportion",
      message:
        "Centred display text sits exactly on the geometric centre; rules://04-balance-and-proportion " +
        "puts the optical centre about 5% above it, so this will read low. Offset it up 2-4px at 100px.",
    });
  }

  // rules://14-color-contrast — the existing contrast issues, counted.
  checks.push({
    id: "contrast_floor",
    rule: "14-color-contrast",
    status: lowContrast > 0 ? "warn" : "pass",
    detail:
      lowContrast > 0
        ? lowContrast + " text object(s) below the 4.5:1 body / 3:1 large floor."
        : "Every measured text object meets the 4.5:1 body / 3:1 large floor.",
  });

  return checks;
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
  let lowContrast = 0;
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
          lowContrast++;
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

  const checks = ruleChecks(scene, renderables, texts, lowContrast, issues);

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const info = issues.filter((issue) => issue.severity === "info").length;
  return {
    ok: errors === 0,
    errors,
    warnings,
    info,
    issues,
    checks,
    checked: {
      nodes: nodes.length,
      text: texts.length,
      strokes,
      fontFamilies: families.size,
    },
  };
}
