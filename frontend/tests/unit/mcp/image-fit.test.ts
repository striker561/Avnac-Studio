import { describe, expect, it } from "vitest";

import { computeImageCrop, normalizeImageFit, imageNeedsNaturalSize } from "@/lib/mcp/image-fit";

const landscape = { width: 1600, height: 900 }; // 16:9
const portrait = { width: 900, height: 1600 };  // 9:16

describe("imageNeedsNaturalSize", () => {
  it("is false for plain stretched images", () => {
    expect(imageNeedsNaturalSize({})).toBe(false);
    expect(imageNeedsNaturalSize({ fit: "fill" })).toBe(false);
  });

  it("is true for cover crops and explicit source crops", () => {
    expect(imageNeedsNaturalSize({ fit: "cover" })).toBe(true);
    expect(imageNeedsNaturalSize({ fit: "COVER" })).toBe(true);
    expect(
      imageNeedsNaturalSize({
        crop: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
      }),
    ).toBe(true);
  });
});

describe("normalizeImageFit", () => {
  it("defaults to fill, the pre-existing behaviour", () => {
    expect(normalizeImageFit(undefined)).toBe("fill");
    expect(normalizeImageFit("")).toBe("fill");
    expect(normalizeImageFit("COVER")).toBe("cover");
    expect(normalizeImageFit("contain")).toBe("fill");
  });
});

describe("computeImageCrop", () => {
  it("stretches the full source when fit is omitted", () => {
    expect(
      computeImageCrop({
        natural: landscape,
        target: { width: 300, height: 300 },
      }),
    ).toEqual({ cropX: 0, cropY: 0 });
  });

  it("crops a wide source horizontally for a square box", () => {
    const crop = computeImageCrop({
      natural: landscape,
      target: { width: 300, height: 300 },
      fit: "cover",
    });
    expect(crop.cropY).toBe(0);
    expect(crop.cropHeight).toBe(900);
    expect(crop.cropWidth).toBe(900); // 900 * (300/300)
    expect(crop.cropX).toBe(350); // centred: (1600 - 900) / 2
  });

  it("crops a tall source vertically for a wide box", () => {
    const crop = computeImageCrop({
      natural: portrait,
      target: { width: 400, height: 200 },
      fit: "cover",
    });
    expect(crop.cropX).toBe(0);
    expect(crop.cropWidth).toBe(900);
    // 900 / (400/200) = 450 tall, centred in 1600 => (1600-450)/2
    expect(crop.cropHeight).toBe(450);
    expect(crop.cropY).toBe(575);
  });

  it("anchors the crop on the focal point", () => {
    const top = computeImageCrop({
      natural: portrait,
      target: { width: 400, height: 200 },
      fit: "cover",
      focalPoint: { x: 0.5, y: 0.1 },
    });
    expect(top.cropY).toBe(0);
    const bottom = computeImageCrop({
      natural: portrait,
      target: { width: 400, height: 200 },
      fit: "cover",
      focalPoint: { x: 0.5, y: 0.95 },
    });
    expect(bottom.cropY).toBe(1150); // clamped to 1600 - 450
  });

  it("lets an explicit normalized crop win over fit", () => {
    const crop = computeImageCrop({
      natural: landscape,
      target: { width: 300, height: 300 },
      fit: "cover",
      crop: { x: 0.25, y: 0.1, width: 0.5, height: 0.5 },
    });
    expect(crop).toEqual({
      cropX: 400,
      cropY: 90,
      cropWidth: 800,
      cropHeight: 450,
    });
  });

  it("falls back to the full source when the size is unknown", () => {
    expect(
      computeImageCrop({
        natural: null,
        target: { width: 300, height: 300 },
        fit: "cover",
      }),
    ).toEqual({ cropX: 0, cropY: 0 });
  });
});
