// Phase C1 (I04) 2D Plan Projection テスト
import { describe, it, expect } from "vitest";
import {
  projectSupport,
  projectAll,
  nodeToPlanPrimitive,
} from "../PlanProjection";
import { buildSupportSolids } from "../SubstructureSolidGenerator";
import { buildFoundationSolids } from "../FoundationSolidGenerator";
import {
  type SolidGroup,
  type SolidTransform,
  type SolidNode,
} from "../geometryBase";
import type { Support, SupportPlacementSnapshot } from "../model";

const snap: SupportPlacementSnapshot = {
  source: "liner",
  position: { x: 100, y: 200, z: 5 },
  tangent: { x: 1, y: 0, z: 0 },
  transverse: { x: 0, y: 1, z: 0 },
  vertical: { x: 0, y: 0, z: 1 },
  azimuthRad: 0,
  skewRad: 0,
};

const tf = (): SolidTransform => ({
  origin: snap.position,
  xAxis: snap.tangent,
  yAxis: snap.transverse,
  zAxis: snap.vertical,
  skewRad: snap.skewRad,
});

function abutmentSupport(): Support {
  return {
    supportId: "A1",
    supportType: "abutment",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "aln", station: 0, offset: 0 },
    bearingSeats: [],
    abutment: {
      id: "A1",
      formType: "inverted_t",
      backwall: { id: "A1-BW", height: 5.5, thickness: 0.8, width: 11.0, seatElevation: 8 },
      wingWallL: { id: "A1-WL", length: 4, height: 5.5, thickness: 0.5 },
      wingWallR: { id: "A1-WR", length: 4, height: 5.5, thickness: 0.5 },
      footing: { id: "A1-FOOTING", length: 12, width: 8, thickness: 1.5, topElevation: 0 },
    },
  };
}

function abutmentGroup(): SolidGroup {
  return buildSupportSolids(abutmentSupport(), new Map([["A1", snap]]));
}

function footingGroup(): SolidGroup {
  return buildFoundationSolids(
    "A1",
    { id: "F", length: 12, width: 8, thickness: 1.5, topElevation: 0 },
    { id: "P", pileType: "bored_pile", diameter: 1.2, length: 18, pileCount: 6, spacing: { x: 3.6, y: 3.6 } },
    tf(),
  );
}

describe("projectSupport primitives", () => {
  it("includes center/skewdir/label + solid primitives", () => {
    const proj = projectSupport(abutmentGroup(), "A1");
    expect(proj.supportId).toBe("A1");
    expect(proj.supportCenter).toEqual({ x: 100, y: 200 });
    expect(proj.primitives.some((p) => p.type === "center")).toBe(true);
    expect(proj.primitives.some((p) => p.type === "line")).toBe(true);
    expect(proj.primitives.some((p) => p.type === "text")).toBe(true);
    expect(proj.primitives).toHaveLength(3 + abutmentGroup().solids.length);
  });

  it("labels carries support id + center", () => {
    const proj = projectSupport(abutmentGroup(), "A1");
    expect(proj.labels).toEqual([
      { id: "A1", label: "A1", position: { x: 100, y: 200 } },
    ]);
  });
});

describe("3D/2D source parity", () => {
  it("every solid yields a 2D primitive with same sourceObjectId", () => {
    const g = abutmentGroup();
    const proj = projectSupport(g);
    const projected = proj.primitives
      .filter((p) => p.type === "polygon" || p.type === "circle")
      .map((p) => p.sourceObjectId);
    for (const id of g.solids.map((n) => n.id)) {
      expect(projected).toContain(id);
    }
  });
});

describe("polygon footprint", () => {
  it("backwall footprint spans thickness(0.8) x width(11)", () => {
    const g = abutmentGroup();
    const bw = g.solids.find((n) => n.id === "A1-BACKWALL")!;
    const prim = nodeToPlanPrimitive("A1", bw, g.transform);
    expect(prim.type).toBe("polygon");
    if (prim.type !== "polygon" || !("polygon" in prim.geometry)) {
      throw new Error("expected polygon");
    }
    const poly = prim.geometry.polygon;
    const xs = poly.map((v) => v.x) as number[];
    const ys = poly.map((v) => v.y) as number[];
    expect(poly).toHaveLength(4);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(0.8, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(11, 6);
  });
});

describe("pile circle", () => {
  it("radius = diameter/2 from local", () => {
    const g = footingGroup();
    const pile = g.solids.find((n) => n.entity === "pile")!;
    const prim = nodeToPlanPrimitive("A1", pile, g.transform);
    expect(prim.type).toBe("circle");
    if (prim.type !== "circle" || !("circle" in prim.geometry)) {
      throw new Error("expected circle");
    }
    expect(prim.geometry.circle.radius).toBeCloseTo(0.6, 6);
    // 世界中心 = origin + ローカルオフセット（杭は対称配置のため最初の杭は -1.8 シフト）
    expect(prim.geometry.circle.center.x).toBeCloseTo(100 + pile.localCenter.x, 6);
    expect(prim.geometry.circle.center.y).toBeCloseTo(200 + pile.localCenter.y, 6);
  });
});

describe("projectAll", () => {
  it("projects multiple groups", () => {
    const out = projectAll([abutmentGroup(), footingGroup()]);
    expect(out).toHaveLength(2);
    expect(out.map((p) => p.supportId)).toEqual(["A1", "A1"]);
  });
});

describe("deterministic & stable", () => {
  it("same group produces identical projection", () => {
    const a = projectSupport(abutmentGroup());
    const b = projectSupport(abutmentGroup());
    expect(a).toEqual(b);
  });
});

// keep SolidNode referenced for clarity (no unused import)
void (null as unknown as SolidNode);