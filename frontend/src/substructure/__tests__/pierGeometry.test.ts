// Phase C1 (I03B) 橋脚ジオメトリ生成 テスト
import { describe, it, expect } from "vitest";
import { buildPierSolids } from "../PierSolidGenerator";
import {
  transformFromSnapshot,
  localToWorld,
  toWorldSolid,
  type SolidTransform,
} from "../geometryBase";
import type { Support, SupportPlacementSnapshot, PierData } from "../model";

const snapshot: SupportPlacementSnapshot = {
  source: "liner",
  position: { x: 200, y: 0, z: 8 },
  tangent: { x: 1, y: 0, z: 0 },
  transverse: { x: 0, y: 1, z: 0 },
  vertical: { x: 0, y: 0, z: 1 },
  azimuthRad: 0,
  skewRad: 0,
};

const tf = (): SolidTransform => transformFromSnapshot(snapshot);

function pierSupport(
  formType: PierData["formType"],
  data: Partial<PierData>,
): Support {
  return {
    supportId: "P1",
    supportType: "pier",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "aln-main", station: 100, offset: 0 },
    bearingSeats: [],
    pier: {
      id: "P1",
      formType,
      footing: { id: "F1", length: 6, width: 8, thickness: 1.8, topElevation: 0 },
      ...data,
    },
  };
}

describe("single_column_rect", () => {
  it("single column + cap with stable IDs and dimensions", () => {
    const sup = pierSupport("single_column_rect", {
      column: { id: "C-1", width: 1.2, depth: 1.6, height: 7.0 },
      cap: { id: "CAP-1", width: 1.6, depth: 8.0, height: 1.2, overhangL: 0.5, overhangR: 0.5 },
    });
    const g = buildPierSolids(sup, sup.pier!, tf());
    expect(g.solids.map((s) => s.id)).toEqual(["P1-COLUMN", "P1-CAP"]);
    expect(g.solids[0].localSize).toEqual({ x: 1.6, y: 1.2, z: 7.0 });
    expect(g.solids[0]).toEqual(g.solids[0] && expect.objectContaining({ entity: "pier" }));
    expect(g.solids[1].localCenter.z).toBeCloseTo(7.0 + 1.2 / 2, 6);
  });
});

describe("wall pier", () => {
  it("wall column solid", () => {
    const sup = pierSupport("wall", {
      column: { id: "W-1", width: 7.0, depth: 1.5, height: 6.0 },
    });
    const g = buildPierSolids(sup, sup.pier!, tf());
    expect(g.solids.map((s) => s.id)).toEqual(["P1-COLUMN"]);
    expect(g.solids[0].localSize).toEqual({ x: 1.5, y: 7.0, z: 6.0 });
  });
});

describe("portal_frame", () => {
  it("two columns + beam", () => {
    const sup = pierSupport("portal_frame", {
      columns: [
        { id: "C1", width: 1.4, depth: 1.8, height: 8.0, transverseOffset: -3.5 },
        { id: "C2", width: 1.4, depth: 1.8, height: 8.0, transverseOffset: 3.5 },
      ],
      beam: { id: "B1", width: 1.6, depth: 9.0, height: 1.5, spanDirection: "transverse" },
    });
    const g = buildPierSolids(sup, sup.pier!, tf());
    expect(g.solids.map((s) => s.id)).toEqual([
      "P1-COLUMN-01",
      "P1-COLUMN-02",
      "P1-BEAM",
    ]);
    expect(g.solids[0].localCenter.y).toBeCloseTo(-3.5, 6);
    expect(g.solids[1].localCenter.y).toBeCloseTo(3.5, 6);
    expect(g.solids[2].localCenter.z).toBeCloseTo(8.0 + 1.5 / 2, 6);
  });

  it("fails-closed when fewer than 2 columns", () => {
    const sup = pierSupport("portal_frame", {
      columns: [{ id: "C1", width: 1.4, depth: 1.8, height: 8.0 }],
    });
    expect(() => buildPierSolids(sup, sup.pier!, tf())).toThrow(/2本以上/);
  });
});

describe("placement", () => {
  it("maps local center to world via snapshot", () => {
    const sup = pierSupport("single_column_rect", {
      column: { id: "C", width: 1.2, depth: 1.6, height: 7.0 },
    });
    const transform = transformFromSnapshot(snapshot);
    const g = buildPierSolids(sup, sup.pier!, transform);
    const col = g.solids[0];
    const world = localToWorld(col.localCenter, transform);
    expect(world.x).toBeCloseTo(200, 6);
    expect(world.y).toBeCloseTo(0, 6);
    expect(world.z).toBeCloseTo(8 + 7 / 2, 6);
    expect(toWorldSolid(col, transform).node.id).toBe(col.id);
  });
});

describe("invalid input (fail-closed)", () => {
  it("throws on non-positive column height", () => {
    const sup = pierSupport("single_column_rect", {
      column: { id: "C", width: 1.2, depth: 1.6, height: 0 },
    });
    expect(() => buildPierSolids(sup, sup.pier!, tf())).toThrow();
  });
});

describe("deterministic regeneration", () => {
  it("same input produces identical solids", () => {
    const mk = () =>
      pierSupport("portal_frame", {
        columns: [
          { id: "C1", width: 1.4, depth: 1.8, height: 8.0, transverseOffset: -3.5 },
          { id: "C2", width: 1.4, depth: 1.8, height: 8.0, transverseOffset: 3.5 },
        ],
        beam: { id: "B1", width: 1.6, depth: 9.0, height: 1.5 },
      });
    const a = buildPierSolids(mk(), mk().pier!, tf());
    const b = buildPierSolids(mk(), mk().pier!, tf());
    expect(a).toEqual(b);
  });
});