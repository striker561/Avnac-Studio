import { describe, expect, it } from "vitest";
import {
  decodeSvgDataUrl,
  isAvnacVectorBoardSvg,
  strokeToSvgMarkup,
  vectorBoardDocumentToSvg,
  vectorBoardDocumentToSvgDataUrl,
} from "@/lib/avnac-vector/svg";
import { emptyVectorBoardDocument, insertStrokeIntoActiveLayer } from "@/lib/avnac-vector/document";
import type { VectorBoardStroke } from "@/lib/avnac-vector/types";

function closedPen(): VectorBoardStroke {
  return {
    id: "p1",
    kind: "pen",
    points: [],
    penAnchors: [
      { x: 100, y: 100, type: "corner" },
      { x: 300, y: 100, type: "corner" },
      { x: 200, y: 300, type: "corner" },
    ],
    penClosed: true,
    stroke: "#112233",
    strokeWidth: 5,
    strokeOpacity: 0.8,
    fill: "#aabbcc",
    fillOpacity: 0.6,
    fillRule: "evenodd",
    lineCap: "butt",
    lineJoin: "miter",
  };
}

function line(): VectorBoardStroke {
  return {
    id: "l1",
    kind: "line",
    points: [[10, 10], [200, 120]],
    stroke: "#ff0000",
    strokeWidth: 2,
    strokeOpacity: 1,
    fill: "",
    fillOpacity: 1,
    fillRule: "nonzero",
    lineCap: "round",
    lineJoin: "round",
  };
}

describe("unit: vector / SVG output", () => {
  it("serializes to real path elements with paint slots", () => {
    let doc = emptyVectorBoardDocument();
    doc = insertStrokeIntoActiveLayer(doc, closedPen());
    const svg = vectorBoardDocumentToSvg(doc);
    expect(svg).toContain('data-avnac-vector-board="1"');
    expect(svg).toContain("<path");
    expect(svg).toContain('fill="#aabbcc"');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain('stroke="#112233"');
    expect(svg).toContain('stroke-width="5"');
    expect(svg).toContain('stroke-linejoin="miter"');
    expect(svg).toContain('stroke-opacity="0.8"');
    expect(svg).toContain('fill-opacity="0.6"');
    expect(svg).toContain('viewBox="0 0 1200 900"');
  });

  it("does not fill an open path", () => {
    const markup = strokeToSvgMarkup({
      ...line(),
      fill: "#ff0000",
    });
    expect(markup).toContain('fill="none"');
  });

  it("omits hidden layers", () => {
    let doc = emptyVectorBoardDocument();
    doc = insertStrokeIntoActiveLayer(doc, line());
    const hidden = {
      ...doc,
      layers: doc.layers.map((layer) => ({ ...layer, visible: false })),
    };
    expect(vectorBoardDocumentToSvg(hidden)).not.toContain("<path");
    expect(vectorBoardDocumentToSvg(hidden, { includeHiddenLayers: true })).toContain("<path");
  });

  it("adds a background only when asked", () => {
    let doc = emptyVectorBoardDocument();
    doc = insertStrokeIntoActiveLayer(doc, line());
    expect(vectorBoardDocumentToSvg(doc)).not.toContain('fill="#ffffff"');
    expect(vectorBoardDocumentToSvg(doc, { background: "#ffffff" })).toContain('fill="#ffffff"');
  });

  it("exports arrows as a shaft path plus a filled head", () => {
    const arrow: VectorBoardStroke = {
      ...line(),
      id: "a1",
      kind: "arrow",
      stroke: "#222222",
      strokeWidth: 4,
    };
    const markup = strokeToSvgMarkup(arrow);
    expect(markup).toContain("<path");
    expect(markup).toContain("<polygon");
    expect(markup).toContain('fill="#222222"');
  });

  it("produces a decodable data URL tagged as a vector board", () => {
    let doc = emptyVectorBoardDocument();
    doc = insertStrokeIntoActiveLayer(doc, line());
    const url = vectorBoardDocumentToSvgDataUrl(doc);
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    const decoded = decodeSvgDataUrl(url);
    expect(decoded).toContain("<path");
    expect(isAvnacVectorBoardSvg(url)).toBe(true);
    expect(isAvnacVectorBoardSvg("data:image/png;base64,abc")).toBe(false);
  });
});
