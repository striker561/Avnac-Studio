import { describe, expect, it, vi } from "vitest";
import type { SaraswatiScene } from "@/lib/saraswati";
import * as exportIo from "@/lib/avnac-export-io";

// jsdom does not decode images, so natural-size reads must be mocked.
vi.mock("@/lib/image-pixel-utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/image-pixel-utils")>();
  return {
    ...actual,
    readImageNaturalSize: vi.fn(async () => ({ width: 800, height: 600 })),
  };
});

function imageScene(crop: boolean): SaraswatiScene {
  return {
    version: 1,
    root: "root",
    artboard: { width: 1000, height: 800, bg: { type: "solid", color: "#fff" } },
    nodes: {
      root: {
        id: "root",
        type: "group",
        parentId: null,
        visible: true,
        opacity: 1,
        rotation: 0,
        children: ["img-1"],
      },
      "img-1": {
        id: "img-1",
        type: "image",
        parentId: "root",
        name: "photo",
        visible: true,
        opacity: 1,
        rotation: 0,
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        scaleX: 1,
        scaleY: 1,
        originX: "left",
        originY: "top",
        src: "data:image/png;base64,AAA",
        cropX: crop ? 50 : 0,
        cropY: crop ? 40 : 0,
        cropWidth: crop ? 200 : undefined,
        cropHeight: crop ? 150 : undefined,
        borderRadius: 0,
        blur: 0,
        shadow: null,
        clipPath: null,
      },
    },
  };
}

async function captureSvg(scene: SaraswatiScene): Promise<string> {
  const captured: string[] = [];
  const spy = vi
    .spyOn(exportIo, "downloadSvgViaBrowser")
    .mockImplementation((_name, svg) => {
      captured.push(svg);
    });
  try {
    const { exportSelectionAsSvg } = await import(
      "@/lib/avnac-selection-export"
    );
    await exportSelectionAsSvg("selection.svg", scene, ["img-1"]);
  } finally {
    spy.mockRestore();
  }
  return captured[0] ?? "";
}

describe("SVG selection export: image crop", () => {
  it("encodes the crop region so a cropped image exports cropped", async () => {
    const svg = await captureSvg(imageScene(true));

    expect(svg).toContain("<image");
    // A clipPath constrains the source to the crop rect.
    expect(svg).toContain("clipPath");
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="150"');
    // The crop offsets translate the image so the right source region shows.
    expect(svg).toContain('x="-50"');
    expect(svg).toContain('y="-40"');
    // The crop clip is scaled into the 400x300 node box (200x150 -> 400x300).
    expect(svg).toContain("scale(2,2)");
    // The image is embedded at its natural size inside the crop clip.
    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="600"');
  });

  it("keeps the original embedding behaviour for uncropped images", async () => {
    const svg = await captureSvg(imageScene(false));

    expect(svg).toContain("<image");
    expect(svg).toContain("xMidYMid slice");
    expect(svg).not.toContain("scale(2,2)");
  });
});
