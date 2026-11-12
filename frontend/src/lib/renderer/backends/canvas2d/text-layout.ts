/**
 * Canvas2d text measurement + layout (renderer layer only).
 *
 * Wrapping text requires real glyph measurement (ctx.measureText), so this
 * lives under the renderer, NOT the Saraswati engine — the engine must never
 * touch Canvas/DOM. The live canvas2d text renderer and the dirty-region
 * planner use it; the engine's spatial bounds use a pure deterministic
 * estimate instead (see saraswati/spatial).
 */
export type TextLayoutInput = {
  text: string;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  /** Max wrap width (the text node's width). */
  width: number;
};

export type TextLayout = {
  lines: string[];
  boxWidth: number;
  boxHeight: number;
};

export type TextMeasureFn = (font: string, text: string) => number;

/**
 * Vertical metrics for a face at a size, in the same coordinate model the
 * renderer draws with (textBaseline "top", line one at the node's y).
 *
 * The MCP surface used to expose only the text's rectangular box, so centering a
 * dot on "the text" meant centering on the line box: for 13px Poppins caps that
 * put the dot ~5px below the letters. capHeight is the ink height of "H"; ascent
 * is the distance from the box top to the alphabetic baseline.
 */
export type TextVerticalMetrics = {
  ascent: number;
  descent: number;
  capHeight: number;
};

let metricsContext: CanvasRenderingContext2D | null | undefined;

/** Shared offscreen context for vertical metrics, or null without a real canvas. */
function getMetricsContext(): CanvasRenderingContext2D | null {
  if (metricsContext !== undefined) return metricsContext;
  if (typeof document === "undefined") {
    metricsContext = null;
    return null;
  }
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof ctx.measureText !== "function") {
      metricsContext = null;
      return null;
    }
    ctx.font = "16px sans-serif";
    if (!(ctx.measureText("W").width > 0)) {
      metricsContext = null;
      return null;
    }
    metricsContext = ctx;
  } catch {
    metricsContext = null;
  }
  return metricsContext;
}

/**
 * Measure ascent, descent and cap height for a text style, in the coordinate
 * model the renderer draws with: textBaseline "top", so the line box starts at
 * the node's y.
 *
 * Font metric fields are not trustworthy here: `fontBoundingBoxAscent` includes
 * the line gap, and `actualBoundingBoxAscent` changes meaning with the baseline
 * setting, so two arithmetic attempts were each off by 2–4px on a 13px Poppins
 * label. Instead draw "H" into a tiny offscreen canvas exactly as the renderer
 * would and find the ink rows. That is ground truth for the browser in front of
 * us, including whichever font actually resolved.
 *
 * Returns null when no real canvas is available (jsdom, headless), so callers
 * omit the metrics rather than publishing a guess as if it were measured.
 */
export function measureTextVerticalMetrics(
  input: Pick<
    TextLayoutInput,
    "fontSize" | "fontFamily" | "fontWeight" | "fontStyle"
  >,
): TextVerticalMetrics | null {
  const ctx = getMetricsContext();
  if (!ctx) return null;

  const fontSize = Math.max(1, Math.round(input.fontSize));
  const width = Math.ceil(fontSize * 2) + 8;
  const height = Math.ceil(fontSize * 3) + 8;
  const probe = document.createElement("canvas");
  probe.width = width;
  probe.height = height;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx) return null;

  try {
    pctx.clearRect(0, 0, width, height);
    pctx.font = textFontString(input);
    pctx.textBaseline = "top";
    pctx.textAlign = "left";
    pctx.fillStyle = "#000";
    const originY = 1;
    pctx.fillText("H", 2, originY);
    const capRows = inkRows(pctx, width, height);

    pctx.clearRect(0, 0, width, height);
    pctx.fillText("Hg", 2, originY);
    const fullRows = inkRows(pctx, width, height);

    if (!capRows) return null;

    const inkTop = capRows[0] - originY;
    const inkBottom = capRows[1] - originY;
    const capHeight = inkBottom - inkTop + 1;
    // Baseline is the row after the capital's ink bottom; ascent maps the box
    // top (node y) to that baseline through the existing capTop arithmetic.
    const ascent = inkBottom + 1;
    const descent = fullRows ? Math.max(0, fullRows[1] - inkBottom) : fontSize * 0.2;
    return { ascent, descent, capHeight };
  } catch {
    return null;
  }
}

/** First and last row containing any non-transparent pixel, or null. */
function inkRows(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): [number, number] | null {
  const data = ctx.getImageData(0, 0, width, height).data;
  let first = -1;
  let last = -1;
  for (let y = 0; y < height; y += 1) {
    let rowHasInk = false;
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        rowHasInk = true;
        break;
      }
    }
    if (rowHasInk) {
      if (first === -1) first = y;
      last = y;
    }
  }
  return first === -1 ? null : [first, last];
}

let sharedMeasure: TextMeasureFn | null | undefined;

/**
 * Lazily create a shared measureText function backed by a single offscreen
 * canvas context. Returns null in environments without a working canvas
 * (jsdom's stub returns zero widths), in which case callers fall back to the
 * raw-line estimate.
 */
export function getSharedTextMeasure(): TextMeasureFn | null {
  if (sharedMeasure !== undefined) return sharedMeasure;
  if (typeof document === "undefined") {
    sharedMeasure = null;
    return null;
  }
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof ctx.measureText !== "function") {
      sharedMeasure = null;
      return null;
    }
    ctx.font = "16px sans-serif";
    const sample = ctx.measureText("W").width;
    if (!(sample > 0)) {
      // Stub canvas (jsdom) — measuring would produce nonsense; fall back.
      sharedMeasure = null;
      return null;
    }
    sharedMeasure = (font: string, text: string): number => {
      ctx.font = font;
      return ctx.measureText(text).width;
    };
  } catch {
    sharedMeasure = null;
  }
  return sharedMeasure;
}

export function textFontString(
  input: Pick<
    TextLayoutInput,
    "fontStyle" | "fontWeight" | "fontSize" | "fontFamily"
  >,
): string {
  const size = Math.max(1, Math.round(input.fontSize));
  return [
    input.fontStyle === "italic" ? "italic" : "",
    input.fontWeight,
    `${size}px`,
    quoteFontFamily(input.fontFamily),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Quote a font family for the CSS `font` shorthand when needed. Unquoted
 * multi-word families ("Baloo 2", "Plus Jakarta Sans") make the whole
 * `ctx.font` assignment invalid and Canvas silently keeps the previous font,
 * which used to render text at a stale fallback size. Families that are
 * already quoted, or that are a single valid CSS identifier, pass through.
 */
export function quoteFontFamily(family: string): string {
  const trimmed = (family ?? "").trim();
  if (!trimmed) return "sans-serif";
  if (/^["'].*["']$/.test(trimmed)) return trimmed;
  if (/^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(trimmed)) return trimmed;
  return `"${trimmed.replace(/["\\]/g, "\\$&")}"`;
}

// Cache of laid-out text boxes keyed by (measure source, font, width, text).
// The renderer's context and the shared context both measure deterministically,
// so sharing one cache is safe and keeps bounds consistent with the paint.
const layoutCache = new Map<string, TextLayout>();

function layoutCacheKey(
  source: string,
  font: string,
  width: number,
  text: string,
): string {
  return `${source}\0${font}\0${width}\0${text}`;
}

/**
 * Lay out text into wrapped lines and compute the box the renderer will draw.
 * Pass a `measure` function when you have a live context (the renderer does);
 * otherwise a shared context is used, and if no measurement is available the
 * result degrades to one box line per literal line break.
 */
export function layoutTextLines(
  input: TextLayoutInput,
  measure?: TextMeasureFn | null,
): TextLayout {
  const font = textFontString(input);
  const maxWidth = Math.max(1, input.width);
  const fontSizePx = Math.max(1, Math.round(input.fontSize));
  const lineHeightPx = fontSizePx * Math.max(1, input.lineHeight);
  const measureFn = measure ?? getSharedTextMeasure();
  const source = measureFn ? "measure" : "raw";
  const key = layoutCacheKey(source, font, maxWidth, input.text);
  const hit = layoutCache.get(key);
  if (hit) return hit;

  const rawLines = input.text.split(/\r?\n/);

  let layout: TextLayout;
  if (!measureFn) {
    // No measurement available — one box line per literal line break.
    layout = {
      lines: rawLines,
      boxWidth: maxWidth,
      boxHeight: tightTextBoxHeight(rawLines.length, fontSizePx, lineHeightPx),
    };
  } else {
    const lines = wrapTextLines(rawLines, maxWidth, font, measureFn);
    const measuredWidth = Math.max(
      maxWidth,
      ...lines.map((line) => measureFn(font, line)),
    );
    layout = {
      lines,
      boxWidth: Math.max(1, measuredWidth),
      boxHeight: tightTextBoxHeight(lines.length, fontSizePx, lineHeightPx),
    };
  }
  layoutCache.set(key, layout);
  return layout;
}

/**
 * "Tight" text box height: the last line is an em box tall (fontSize), and
 * each preceding line adds one line box (fontSize * lineHeight). This makes
 * the box hug the glyphs instead of leaving line-height leading below.
 */
function tightTextBoxHeight(
  lineCount: number,
  fontSizePx: number,
  lineHeightPx: number,
): number {
  return Math.max(fontSizePx, (lineCount - 1) * lineHeightPx + fontSizePx);
}

/** Greedy word-wrap at maxWidth using the provided width measurement. */
export function wrapTextLines(
  rawLines: string[],
  maxWidth: number,
  font: string,
  measure: TextMeasureFn,
): string[] {
  if (maxWidth <= 1) return rawLines;
  const wrapped: string[] = [];
  for (const rawLine of rawLines) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      wrapped.push("");
      continue;
    }
    let current = words[0]!;
    for (let index = 1; index < words.length; index += 1) {
      const next = `${current} ${words[index]}`;
      if (measure(font, next) <= maxWidth) current = next;
      else {
        wrapped.push(current);
        current = words[index]!;
      }
    }
    wrapped.push(current);
  }
  return wrapped;
}
