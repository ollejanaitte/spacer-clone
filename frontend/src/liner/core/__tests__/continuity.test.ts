import { describe, expect, it } from "vitest";
import { checkC0Continuity } from "../continuityC0";
import { checkC1Continuity } from "../continuityC1";
import { DEFAULT_TOLERANCES } from "../tolerances";
import type { AlignmentElement } from "../types";

function straightChain(
  segments: Array<{ id: string; length: number; startGap?: { x: number; y: number } }>,
): AlignmentElement[] {
  const elements: AlignmentElement[] = [];
  let x = 0;
  let y = 0;

  for (const segment of segments) {
    if (segment.startGap) {
      x += segment.startGap.x;
      y += segment.startGap.y;
    }
    elements.push({
      type: "straight",
      id: segment.id,
      start: { x, y },
      azimuth: 0,
      length: segment.length,
    });
    x += segment.length;
  }

  return elements;
}

describe("horizontal continuity tolerances (PR-A)", () => {
  it("uses 1 mm coordinate tolerance", () => {
    expect(DEFAULT_TOLERANCES.coordinate).toBe(0.001);
  });

  it("uses 0.001 deg azimuth tolerance in radians", () => {
    expect(DEFAULT_TOLERANCES.azimuth).toBeCloseTo(0.001 * (Math.PI / 180), 12);
  });

  it("accepts C0 gap within 1 mm (case 4)", () => {
    const elements = straightChain([
      { id: "S1", length: 50 },
      { id: "S2", length: 50, startGap: { x: 0.0005, y: 0.0005 } },
    ]);

    expect(checkC0Continuity(elements)).toHaveLength(0);
  });

  it("rejects C0 gap above 1 mm", () => {
    const elements = straightChain([
      { id: "S1", length: 50 },
      { id: "S2", length: 50, startGap: { x: 0.002, y: 0 } },
    ]);

    expect(checkC0Continuity(elements).length).toBeGreaterThan(0);
  });

  it("accepts C1 azimuth gap within 0.001 deg", () => {
    const gapRad = 0.0005 * (Math.PI / 180);
    const elements: AlignmentElement[] = [
      {
        type: "straight",
        id: "S1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 50,
      },
      {
        type: "straight",
        id: "S2",
        start: { x: 50, y: 0 },
        azimuth: gapRad,
        length: 50,
      },
    ];

    expect(checkC1Continuity(elements)).toHaveLength(0);
  });

  it("rejects C1 azimuth gap above 0.001 deg", () => {
    const gapRad = 0.002 * (Math.PI / 180);
    const elements: AlignmentElement[] = [
      {
        type: "straight",
        id: "S1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 50,
      },
      {
        type: "straight",
        id: "S2",
        start: { x: 50, y: 0 },
        azimuth: gapRad,
        length: 50,
      },
    ];

    expect(checkC1Continuity(elements).length).toBeGreaterThan(0);
  });
});
