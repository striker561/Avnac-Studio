import { describe, expect, it } from "vitest";
import { fitDisplaySizeToNatural } from "@/lib/image-pixel-utils";

describe("unit: image-pixel-utils", () => {
  it("fits display size to a new natural aspect ratio at the same max edge", () => {
    expect(
      fitDisplaySizeToNatural({
        displayWidth: 720,
        displayHeight: 480,
        naturalWidth: 2000,
        naturalHeight: 1000,
      }),
    ).toEqual({ width: 720, height: 360 });
  });
});
