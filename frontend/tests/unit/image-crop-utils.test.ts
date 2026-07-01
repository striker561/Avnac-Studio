import { describe, expect, it } from "vitest";
import {
  fitImageNodeSizeToCrop,
  resolveImageCropRect,
} from "@/lib/image-crop-utils";

describe("unit: image-crop-utils", () => {
  it("defaults missing crop size to the natural image dimensions", () => {
    expect(
      resolveImageCropRect({ x: 0, y: 0 }, 4000, 3000),
    ).toEqual({ x: 0, y: 0, w: 4000, h: 3000 });
  });

  it("scales the node frame when the crop region shrinks", () => {
    expect(
      fitImageNodeSizeToCrop({
        nodeWidth: 720,
        nodeHeight: 540,
        prevCropWidth: 4000,
        prevCropHeight: 3000,
        nextCropWidth: 2000,
        nextCropHeight: 1500,
      }),
    ).toEqual({ width: 360, height: 270 });
  });
});
