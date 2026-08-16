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
    input.fontFamily,
  ]
    .filter(Boolean)
    .join(" ");
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
