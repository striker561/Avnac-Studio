// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectSceneFontFamilies,
  ensureGoogleFontFamilyReady,
  scheduleAppChromeFonts,
} from "@/lib/load-google-font";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type { SaraswatiTextNode } from "@/lib/saraswati";

describe("unit: load-google-font", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

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

  it("loads app chrome fonts when idle", () => {
    vi.stubGlobal("requestIdleCallback", (cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
      return 0;
    });
    scheduleAppChromeFonts();
    expect(document.getElementById("gf-Inter")).not.toBeNull();
    expect(document.getElementById("gf-Fraunces")).not.toBeNull();
    vi.unstubAllGlobals();
  });

  it("loads a canvas font on demand", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load: vi.fn(async () => []) },
    });

    const ready = ensureGoogleFontFamilyReady("Merriweather");
    const link = document.getElementById(
      "gf-Merriweather",
    ) as HTMLLinkElement | null;
    link?.dispatchEvent(new Event("load"));
    await ready;

    expect(document.getElementById("gf-Merriweather")).not.toBeNull();
  });
});
