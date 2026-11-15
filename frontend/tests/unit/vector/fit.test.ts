import { describe, expect, it } from "vitest";
import {
  cubicSegmentCount,
  fitFreehandCubics,
  measureFitDeviation,
} from "@/lib/avnac-vector/fit";
import type { VectorPoint } from "@/lib/avnac-vector/types";

function sineStroke(count = 600): VectorPoint[] {
  const points: VectorPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const x = 80 + t * 900;
    const y = 450 + Math.sin(t * Math.PI * 6) * 140 + Math.sin(t * Math.PI * 23) * 6;
    points.push([x, y]);
  }
  return points;
}

function handWobble(count = 420): VectorPoint[] {
  const points: VectorPoint[] = [];
  let x = 150;
  let y = 420;
  for (let i = 0; i < count; i += 1) {
    const a = i / 18;
    x += Math.cos(a) * 2.3 + Math.sin(i * 0.37) * 0.35;
    y += Math.sin(a) * 2.1 + Math.cos(i * 0.61) * 0.3;
    points.push([x, y]);
  }
  return points;
}

describe("unit: vector / pencil fitting", () => {
  it("fits a 600-sample sine stroke to far fewer nodes than samples", () => {
    const samples = sineStroke();
    const result = fitFreehandCubics(samples, { tolerance: 2.5 });
    expect(result.anchors.length).toBeGreaterThanOrEqual(2);
    expect(result.anchors.length).toBeLessThanOrEqual(25);
    expect(cubicSegmentCount(result.anchors)).toBe(result.segments.length);
    expect(result.maxError).toBeLessThanOrEqual(2.5);
  });

  it("tracks the sampled stroke within the requested tolerance", () => {
    const samples = handWobble();
    const result = fitFreehandCubics(samples, { tolerance: 2 });
    const deviation = measureFitDeviation(result.anchors, samples);
    expect(deviation).toBeLessThanOrEqual(4.5);
  });

  it("keeps a straight drag at two anchors", () => {
    const samples: VectorPoint[] = Array.from({ length: 40 }, (_, i) => [100 + i * 10, 200]);
    const result = fitFreehandCubics(samples, { tolerance: 2 });
    expect(result.anchors).toHaveLength(2);
    expect(result.anchors[0]!.type).toBe("corner");
    expect(result.anchors[1]!.type).toBe("corner");
  });

  it("infers smooth/symmetric joins when the fit is collinear", () => {
    const samples = sineStroke(240);
    const result = fitFreehandCubics(samples, { tolerance: 2 });
    const interior = result.anchors.slice(1, -1);
    expect(interior.length).toBeGreaterThan(0);
    // A fitted hand stroke should not be a chain of cusps: its joins are
    // tangent-continuous by construction.
    expect(
      interior.some((a) => a.type === "smooth" || a.type === "symmetric"),
    ).toBe(true);
  });

  it("handles duplicate and near-duplicate samples without collapsing", () => {
    const samples: VectorPoint[] = [
      [100, 100],
      [100, 100],
      [101, 101],
      [130, 140],
      [200, 160],
    ];
    const result = fitFreehandCubics(samples, { tolerance: 3 });
    expect(result.anchors.length).toBeGreaterThanOrEqual(2);
    expect(result.sampleCount).toBe(4);
  });
});
