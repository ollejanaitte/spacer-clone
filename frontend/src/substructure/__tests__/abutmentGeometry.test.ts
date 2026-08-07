// Phase C1 (I03A) 橋台ジオメトリ生成 テスト
import { describe, it, expect } from "vitest";
import {
  buildAbutmentSolids,
  buildSupportSolids,
  localToWorld,
  transformFromSnapshot,
  toWorldSolid,
} from "../SubstructureSolidGenerator";
import type { Support, SupportPlacementSnapshot, AbutmentData } from "../model";

const snapshot: SupportPlacementSnapshot = {
  source: "liner",
  position: { x: 100, y: 0, z: 5 },
  tangent: { x: 1, y: 0, z: 0 },
  transverse: { x: 0, y: 1, z: 0 },
  vertical: { x: 0, y: 0, z: 1 },
  azimuthRad: 0,
  skewRad: 0,
};

function abutmentSupport(overrides: Partial<Support> = {}): Support {
  return {
    supportId: "A1",
    supportType: "abutment",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "aln-main", station: 0, offset: 0 },
    bearingSeats: [],
    abutment: {
      id: "A1",
      formType: "inverted_t",
      backwall: { id: "A1-BACKWALL", height: 5.5, thickness: 0.8, width: 11.0, seatElevation: 8.0 },
      wingWallL: { id: "A1-WING-L", length: 4.0, height: 5.5, thickness: 0.5 },
      wingWallR: { id: "A1-WING-R", length: 4.0, height: 5.5, thickness: 0.5 },
      footing: { id: "A1-FOOTING", length: 5, width: 7, thickness: 1.5, topElevation: 0 },
    },
    ...overrides,
  };
}

describe("buildAbutmentSolids - 逆T式", () => {
  it("generates backwall + 2 wing walls with P02 IDs", () => {
    const support = abutmentSupport();
    const group = buildAbutmentSolids(support, support.abutment!, transformFromSnapshot(snapshot));
    const ids = group.solids.map((s) => s.id);
    expect(ids).toContain("A1-BACKWALL");
    expect(ids).toContain("A1-WING-L");
    expect(ids).toContain("A1-WING-R");
    expect(group.solids).toHaveLength(3);
    // all boxes
    expect(group.solids.every((s) => s.kind === "box")).toBe(true);
  });

  it("reflects dimensions", () => {
    const support = abutmentSupport();
    const group = buildAbutmentSolids(support, support.abutment!, transformFromSnapshot(snapshot));
    const bw = group.solids.find((s) => s.id === "A1-BACKWALL")!;
    expect(bw.localSize).toEqual({ x: 0.8, y: 11.0, z: 5.5 });
    expect(bw.localCenter).toEqual({ x: 0, y: 0, z: 2.75 });
  });
});

describe("buildSupportSolids - placement & skew", () => {
  it("applies snapshot to world position", () => {
    const support = abutmentSupport();
    const map = new Map<string, SupportPlacementSnapshot>([["A1", snapshot]]);
    const group = buildSupportSolids(support, map);
    expect(group.transform.origin).toEqual({ x: 100, y: 0, z: 5 });
  });

  it("localToWorld transforms backwall center correctly", () => {
    const support = abutmentSupport();
    const group = buildAbutmentSolids(support, support.abutment!, transformFromSnapshot(snapshot));
    const bw = group.solids.find((s) => s.id === "A1-BACKWALL")!;
    const ws = toWorldSolid(bw, group.transform);
    const worldCenter = localToWorld(bw.localCenter, ws.transform);
    expect(worldCenter).toEqual({ x: 100, y: 0, z: 5 + 2.75 });
  });
});

describe("invalid input (fail-closed)", () => {
  it("throws GeometryError when snapshot missing", () => {
    const support = abutmentSupport();
    expect(() => buildSupportSolids(support, new Map())).toThrow(/スナップショット/);
  });

  it("dispatches pier support to I03B generator", () => {
    const support = abutmentSupport({ supportId: "P1", supportType: "pier", pier: { id: "P1", formType: "single_column_rect", footing: { id: "P1-FOOTING", length: 6, width: 8, thickness: 1.8, topElevation: 0 } } } as never);
    const map = new Map<string, SupportPlacementSnapshot>([["P1", snapshot]]);
    const group = buildSupportSolids(support, map);
    expect(group.supportId).toBe("P1");
    expect(group.solids.every((s) => s.entity === "pier")).toBe(true);
  });
});

describe("deterministic regeneration", () => {
  it("same input produces identical solids", () => {
    const support = abutmentSupport();
    const a = buildAbutmentSolids(support, support.abutment!, transformFromSnapshot(snapshot));
    const b = buildAbutmentSolids(support, support.abutment!, transformFromSnapshot(snapshot));
    expect(a).toEqual(b);
  });
});

describe("cantilever_frame (ラーメン式, same shape)", () => {
  it("generates same solids as inverted_t", () => {
    const support = abutmentSupport();
    support.abutment!.formType = "cantilever_frame" as never;
    const group = buildAbutmentSolids(support, support.abutment!, transformFromSnapshot(snapshot));
    expect(group.solids.map((s) => s.id)).toEqual(["A1-BACKWALL", "A1-WING-L", "A1-WING-R"]);
  });
});