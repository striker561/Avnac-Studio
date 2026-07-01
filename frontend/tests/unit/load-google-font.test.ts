import { describe, expect, it } from "vitest";
import { collectSceneFontFamilies } from "@/lib/load-google-font";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type { SaraswatiTextNode } from "@/lib/saraswati";

describe("unit: load-google-font", () => {
  it("collects unique font families from text nodes", () => {
    const scene = createEmptySaraswatiScene();
    const textA: SaraswatiTextNode = {
      id: "text-a",
      type: "text",
      parentId: scene.root,
      visible: true,
      x: 0,
      y: 0,
      width: 200,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      text: "Hello",
      fontSize: 24,
      fontFamily: "Roboto",
      fontWeight: "400",
      fontStyle: "normal",
      textAlign: "left",
      lineHeight: 1.2,
      underline: false,
      color: { type: "solid", color: "#000000" },
      stroke: null,
      strokeWidth: 0,
      clipPath: null,
    };
    const textB: SaraswatiTextNode = {
      ...textA,
      id: "text-b",
      fontFamily: "Roboto",
    };
    const textC: SaraswatiTextNode = {
      ...textA,
      id: "text-c",
      fontFamily: "Playfair Display",
    };
    scene.nodes[textA.id] = textA;
    scene.nodes[textB.id] = textB;
    scene.nodes[textC.id] = textC;

    expect(collectSceneFontFamilies(scene).sort()).toEqual([
      "Playfair Display",
      "Roboto",
    ]);
  });
});
