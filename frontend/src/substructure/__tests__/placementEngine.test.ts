// Phase C1 (I02) SupportPlacementEngine テスト（P02 Golden Case対応）
import { describe, it, expect } from "vitest";
import {
  computeAllPlacements,
  computeLinerPlacement,
  computeDirectXyzPlacement,
  supportLocalFrame,
  isFatal,
} from "../SupportPlacementEngine";
import type { Support, SubstructureProject } from "../model";
import { SUBSTRUCTURE_SCHEMA_VERSION } from "../model";

type AlignmentInput = {
  alignment: {
    id: string;
    linerModelId: string;
    coordinatePolicyId: string;
    elements: Array<{
      type: "straight" | "arc";
      id: string;
      start: { x: number; y: number };
      azimuth?: number;
      length: number;
      radius?: number;
      turn?: number;
    }>;
  };
  stationDefinition: { originDisplayedStation: number; interval: number };
  offsets: number[];
  z: number;
  computedAt: string;
};

// 直橋（azimuth 0, +X）
const straightInput: AlignmentInput = {
  alignment: {
    id: "aln-main",
    linerModelId: "i02",
    coordinatePolicyId: "global",
    elements: [
      { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 200 },
    ],
  },
  stationDefinition: { originDisplayedStation: 0, interval: 10 },
  offsets: [-5, 0, 5],
  z: 10,
  computedAt: "2026-01-01T00:00:00.000Z",
};

// 単純曲線（radius 100 の arc）
const curveInput: AlignmentInput = {
  alignment: {
    id: "aln-curve",
    linerModelId: "i02-curve",
    coordinatePolicyId: "global",
    elements: [
      { type: "arc", id: "C1", start: { x: 0, y: 0 }, azimuth: 0, radius: 100, turn: 0.3, length: 30 },
    ],
  },
  stationDefinition: { originDisplayedStation: 0, interval: 10 },
  offsets: [-5, 0, 5],
  z: 12,
  computedAt: "2026-01-01T00:00:00.000Z",
};

function pierSupport(overrides: Partial<Support> = {}): Support {
  return {
    supportId: "P1",
    supportType: "pier",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "aln-main", station: 100, offset: 0 },
    bearingSeats: [],
    pier: {
      id: "P1",
      formType: "single_column_rect",
      column: { id: "P1-COLUMN-01", width: 2.0, depth: 2.2, height: 6.0 },
      cap: { id: "P1-CAP", width: 1.6, depth: 7.5, height: 1.6, overhangL: 0, overhangR: 0 },
      footing: { id: "P1-FOOTING", length: 6, width: 8, thickness: 1.8, topElevation: 0 },
    },
    ...overrides,
  };
}

describe("supportLocalFrame (P02 4.2)", () => {
  it("skew=0 -> transverse = alignment normal", () => {
    const frame = supportLocalFrame(0, 0);
    expect(frame.longitudinal.x).toBeCloseTo(1, 9);
    expect(frame.longitudinal.y).toBeCloseTo(0, 9);
    expect(frame.transverse.y).toBeCloseTo(1, 9);
    expect(frame.vertical.z).toBeCloseTo(1, 9);
  });

  it("skew=90deg -> transverse = tangent", () => {
    const frame = supportLocalFrame(0, Math.PI / 2);
    expect(frame.transverse.x).toBeCloseTo(1, 6);
    expect(frame.transverse.y).toBeCloseTo(0, 6);
  });
});

describe("Golden Case 1: 直橋 / offset 0 / 直角", () => {
  it("station 100 offset 0 -> x=100 y=0 z=10", () => {
    const support = pierSupport();
    const result = computeLinerPlacement(support, straightInput as never);
    expect(result.diagnostics.filter(isFatal)).toHaveLength(0);
    expect(result.snapshot.position.x).toBeCloseTo(100, 6);
    expect(result.snapshot.position.y).toBeCloseTo(0, 6);
    expect(result.snapshot.position.z).toBeCloseTo(10, 6);
    expect(result.snapshot.azimuthRad).toBeCloseTo(0, 6);
  });
});

describe("Golden Case 2: 直橋 / offsetあり / skewあり", () => {
  it("station 100 offset 5 skew 30deg", () => {
    const support = pierSupport({
      placement: { source: "liner", alignmentId: "aln-main", station: 100, offset: 5 },
      skewRad: Math.PI / 6,
    });
    const result = computeLinerPlacement(support, straightInput as never);
    expect(result.diagnostics.filter(isFatal)).toHaveLength(0);
    // +Y offset（azimuth 0 の normal は -sin(0),cos(0) = (0,1)）
    expect(result.snapshot.position.x).toBeCloseTo(100, 6);
    expect(result.snapshot.position.y).toBeCloseTo(5, 6);
    // skew=30deg: transverse = cos30*normal + sin30*tangent = (0.5, 0.866)
    expect(result.snapshot.transverse.x).toBeCloseTo(Math.sin(Math.PI / 6), 6);
    expect(result.snapshot.transverse.y).toBeCloseTo(Math.cos(Math.PI / 6), 6);
    expect(result.snapshot.skewRad).toBeCloseTo(Math.PI / 6, 6);
  });
});

describe("Golden Case 3: 単純曲線 / offset 0", () => {
  it("station on arc has nonzero azimuth and correct position", () => {
    const support = pierSupport({
      placement: { source: "liner", alignmentId: "aln-curve", station: 15, offset: 0 },
    });
    const result = computeLinerPlacement(support, curveInput as never);
    expect(result.diagnostics.filter(isFatal)).toHaveLength(0);
    // arc turn=-0.3 (clockwise): point (R*sin(0.15), -R*(1-cos(0.15))), azimuth=-0.15
    const theta = -0.15;
    expect(result.snapshot.position.x).toBeCloseTo(100 * Math.sin(0.15), 3);
    expect(result.snapshot.position.y).toBeCloseTo(-100 * (1 - Math.cos(0.15)), 3);
    expect(result.snapshot.azimuthRad).toBeCloseTo(theta, 3);
    expect(result.snapshot.tangent.x).toBeCloseTo(Math.cos(theta), 3);
    expect(result.snapshot.tangent.y).toBeCloseTo(Math.sin(theta), 3);
  });
});

describe("Golden Case 4: 曲線 / offsetあり / skewあり", () => {
  it("station 15 offset 5 skew 15deg -> transverse rotated from curve normal", () => {
    const support = pierSupport({
      placement: { source: "liner", alignmentId: "aln-curve", station: 15, offset: 5 },
      skewRad: Math.PI / 12,
    });
    const result = computeLinerPlacement(support, curveInput as never);
    expect(result.diagnostics.filter(isFatal)).toHaveLength(0);
    expect(result.snapshot.skewRad).toBeCloseTo(Math.PI / 12, 6);
    // transverse should be unit length
    const t = result.snapshot.transverse;
    expect(Math.hypot(t.x, t.y)).toBeCloseTo(1, 6);
  });
});

describe("Golden Case 5: XYZ直接指定", () => {
  it("direct_xyz with position + azimuth", () => {
    const support = pierSupport({
      placement: { source: "direct_xyz", position: { x: 12, y: 34, z: 7 }, azimuthRad: 0.5 },
      skewRad: 0.3,
    });
    const result = computeDirectXyzPlacement(support);
    expect(result.diagnostics.filter(isFatal)).toHaveLength(0);
    expect(result.snapshot.position.x).toBeCloseTo(12, 6);
    expect(result.snapshot.position.y).toBeCloseTo(34, 6);
    expect(result.snapshot.position.z).toBeCloseTo(7, 6);
    expect(result.snapshot.azimuthRad).toBeCloseTo(0.5, 6);
    expect(result.snapshot.source).toBe("direct_xyz");
    expect(result.diagnostics.some((d) => d.code === "PLACEMENT_DIRECT_XYZ")).toBe(true);
  });
});

describe("Golden Case 6: LINER支点連携", () => {
  it("multiple supports computed together via computeAllPlacements", () => {
    const supports: Support[] = [
      pierSupport({ supportId: "P1", placement: { source: "liner", alignmentId: "aln-main", station: 40, offset: 0 } }),
      pierSupport({ supportId: "P2", placement: { source: "liner", alignmentId: "aln-main", station: 80, offset: 0 } }),
      pierSupport({ supportId: "P3", placement: { source: "direct_xyz", position: { x: 1, y: 2, z: 3 } } }),
    ];
    const output = computeAllPlacements(supports, straightInput as never);
    expect(output.fatalCount).toBe(0);
    expect(output.results).toHaveLength(3);
    expect(output.results[0].snapshot.position.x).toBeCloseTo(40, 6);
    expect(output.results[1].snapshot.position.x).toBeCloseTo(80, 6);
    expect(output.results[2].snapshot.position.x).toBeCloseTo(1, 6);
  });
});

describe("error behavior (P02 FATAL/WARNING/INFO)", () => {
  it("liner without LINER input -> FATAL", () => {
    const support = pierSupport();
    const output = computeAllPlacements([support], null);
    expect(output.fatalCount).toBe(1);
    expect(output.results[0].diagnostics.some((d) => d.code === "PLACEMENT_LINER_DATA_MISSING")).toBe(true);
  });

  it("direct_xyz without position -> FATAL", () => {
    const support = pierSupport({ placement: { source: "direct_xyz" } as never });
    const result = computeDirectXyzPlacement(support);
    expect(result.diagnostics.some((d) => d.code === "PLACEMENT_POSITION_MISSING" && isFatal(d))).toBe(true);
  });

  it("Z override applied instead of LINER vertical", () => {
    const support = pierSupport({ zOverride: 25 });
    const result = computeLinerPlacement(support, straightInput as never);
    expect(result.snapshot.position.z).toBeCloseTo(25, 6);
  });
});

describe("deterministic regeneration", () => {
  it("repeated computation yields identical snapshots", () => {
    const support = pierSupport({
      placement: { source: "liner", alignmentId: "aln-main", station: 123.45, offset: 2.5 },
      skewRad: 0.4,
    });
    const a = computeLinerPlacement(support, straightInput as never).snapshot;
    const b = computeLinerPlacement(support, straightInput as never).snapshot;
    expect(a).toEqual(b);
  });
});