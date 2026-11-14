import {
  Cursor01Icon,
  CursorAddSelection01Icon,
  CursorRemoveSelection01Icon,
  CursorMagicSelection01Icon,
} from "@hugeicons/core-free-icons";

type HugeiconSvgShape = readonly (readonly [
  string,
  { readonly [key: string]: string | number },
])[];

function hugeiconToCursorCss(
  icon: HugeiconSvgShape,
  hotspotX: number,
  hotspotY: number,
  color: string,
  fallback: string,
): string {
  const inner = icon
    .map(([tag, raw]) => {
      const attrs = Object.entries(raw)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => {
          const kebab = key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
          const val = String(value).replace(/currentColor/g, color);
          return `${kebab}="${val}"`;
        })
        .join(" ");
      return `<${tag} ${attrs} />`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, ${fallback}`;
}

export const VECTOR_CURSOR_MOVE = hugeiconToCursorCss(
  Cursor01Icon,
  7,
  2,
  "#1e293b",
  "default",
);

export const VECTOR_CURSOR_PEN_ADD = hugeiconToCursorCss(
  CursorAddSelection01Icon,
  10,
  4,
  "#1e293b",
  "crosshair",
);

export const VECTOR_CURSOR_PEN_REMOVE = hugeiconToCursorCss(
  CursorRemoveSelection01Icon,
  10,
  4,
  "#dc2626",
  "not-allowed",
);

export const VECTOR_CURSOR_NODE = hugeiconToCursorCss(
  CursorMagicSelection01Icon,
  6,
  3,
  "#1e293b",
  "move",
);

export const VECTOR_CURSOR_CROSSHAIR = "crosshair";
export const VECTOR_CURSOR_CLOSE = "pointer";

export const VECTOR_RESIZE_CURSORS: Record<string, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};
