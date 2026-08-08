// Phase C1 (M3-03) 概算数量（幾何）テスト
import { describe, it, expect } from "vitest";
import { computeSupportQuantity, computeProjectQuantity } from "../design/geometricQuantity";
import { generateCombo } from "../planning/samples/sampleGenerator";
import type { Support } from "../model";

describe("computeSupportQuantity", () => {
  it("computes pier column/cap/footing volumes", () => {
    const support = generateCombo("combo-standard")[1]; // P1 portal
    const q = computeSupportQuantity(support);
    // 門型: column 1.4*1.8*8 ×2 + beam 1.6*9*1.5 + footing 10*7*1.8
    expect(q.columnVolume).toBeCloseTo(1.4 * 1.8 * 8 * 2, 6);
    expect(q.beamVolume).toBeCloseTo(1.6 * 9 * 1.5, 6);
    expect(q.footingVolume).toBeCloseTo(10 * 7 * 1.8, 6);
  });

  it("computes abutment backwall/wing/footing and pile volumes", () => {
    const support = generateCombo("combo-standard")[0]; // A1 inverted_t (no pile in combo)
    const q = computeSupportQuantity(support);
    expect(q.backwallVolume).toBeCloseTo(11 * 0.8 * 5.5, 6);
    expect(q.wingVolume).toBeCloseTo((4 * 0.5 * 5.5) * 2, 6);
    expect(q.pileVolume).toBe(0);
  });

  it("computes bored pile volume and length", () => {
    const support: Support = {
      supportId: "S1",
      supportType: "abutment",
      skewRad: 0,
      placement: { source: "liner", alignmentId: "aln", station: 0, offset: 0 },
      bearingSeats: [],
      abutment: {
        id: "S1",
        formType: "inverted_t",
        backwall: { id: "S1-BW", height: 5.5, thickness: 0.8, width: 11, seatElevation: 8 },
        wingWallL: { id: "S1-WL", length: 4, height: 5.5, thickness: 0.5 },
        wingWallR: { id: "S1-WR", length: 4, height: 5.5, thickness: 0.5 },
        footing: { id: "S1-F", length: 12, width: 8, thickness: 1.5, topElevation: 0 },
        pileGroup: {
          id: "S1-PILES",
          pileType: "bored_pile",
          diameter: 1.2,
          length: 18,
          pileCount: 6,
          spacing: { x: 3.6, y: 3.6 },
        },
      },
    };
    const q = computeSupportQuantity(support);
    const perPile = Math.PI * 0.6 * 0.6 * 18;
    expect(q.pileVolume).toBeCloseTo(perPile * 6, 6);
    expect(q.totalPileLength).toBe(18 * 6);
  });
});

describe("computeProjectQuantity", () => {
  it("aggregates across all supports deterministically", () => {
    const supports = generateCombo("combo-standard");
    const q = computeProjectQuantity(supports);
    expect(q.totalConcreteVolume).toBeCloseTo(
      supports.reduce((sum, s) => sum + computeSupportQuantity(s).totalConcreteVolume, 0),
      6,
    );
    expect(q.units).toContain("m³");
    expect(q.note).toContain("実務数量・設計照査値ではない");
  });
});
