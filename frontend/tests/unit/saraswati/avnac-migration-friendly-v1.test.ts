import { describe, expect, it } from "vitest";
import { migrateAvnacDocument } from "@/lib/avnac-migration";

describe("migrateAvnacDocument friendly v1", () => {
  it("accepts top-level objects shorthand and normalizes to fabric.objects", () => {
    const raw = {
      v: 1,
      artboard: { width: 1200, height: 800 },
      bg: { type: "solid", color: "#ffffff" },
      objects: [
        {
          type: "rect",
          left: 100,
          top: 100,
          width: 200,
          height: 120,
          fill: "#111111",
        },
      ],
    };

    const doc = migrateAvnacDocument(raw);
    expect(doc).not.toBeNull();
    expect(Array.isArray(doc?.fabric.objects)).toBe(true);
    expect(doc?.fabric.objects).toHaveLength(1);
  });
});
