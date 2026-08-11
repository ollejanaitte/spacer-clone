import { describe, expect, it } from "vitest";
import { buildRoadMesh } from "../roadMesh";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../../liner/schema/types";

function makeHorizontal(): LinearAlignment {
  return {
    id: "ALIGN-1",
    linerModelId: "MODEL-1",
    coordinatePolicyId: "COORD-1",
    elements: [
      { id: "S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 100 },
      { id: "A1", type: "arc", start: { x: 100, y: 0 }, azimuth: 0, radius: 50, turn: "left", length: 50 },
    ],
  };
}

function makeVertical(): VerticalElement[] {
  return [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 10, grade: 0.01, length: 150 },
  ];
}

function makeCrossSection(): CrossSectionTemplateDraft {
  return {
    id: "XS1",
    name: "標準",
    offsetLines: [
      { id: "L1", offset: -5.5, elevation: 0, role: "lane" },
      { id: "C1", offset: 0, elevation: 0, role: "lane" },
      { id: "R1", offset: 5.5, elevation: 0, role: "lane" },
    ],
    crossSlope: { signConvention: "right_down_positive", valuePercent: 2 },
  };
}

describe("Phase 2-09 Road 3D Geometry (smooth surface mesh)", () => {
  it("builds a valid mesh with vertices and triangles", () => {
    const mesh = buildRoadMesh({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
      stationInterval: 10,
    });
    expect(mesh.offsetCount).toBe(3);
    expect(mesh.stationCount).toBeGreaterThan(3);
    expect(mesh.vertices.length).toBe(mesh.stationCount * mesh.offsetCount);
    expect(mesh.triangles.length).toBeGreaterThan(0);
    // (stationCount-1) * (offsetCount-1) * 2 triangles
    expect(mesh.triangles.length).toBe((mesh.stationCount - 1) * (mesh.offsetCount - 1) * 2);
  });

  it("places centerline vertex at offset 0 on the centerline", () => {
    const mesh = buildRoadMesh({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
      stationInterval: 25,
    });
    // first station, center offset (index 1 of 3)
    const center = mesh.vertices[1];
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.y).toBeCloseTo(0, 6);
    expect(center.z).toBeCloseTo(10, 6);
  });

  it("applies cross-slope delta to offset vertices (right edge lower)", () => {
    const mesh = buildRoadMesh({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
      stationInterval: 25,
    });
    const center = mesh.vertices[1];
    const right = mesh.vertices[2];
    // slope delta = (slope/100)*offset = (2/100)*5.5 = 0.11 downward
    expect(right.z).toBeCloseTo(center.z - 0.11, 6);
  });

  it("vertex normals are populated", () => {
    const mesh = buildRoadMesh({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
      stationInterval: 25,
    });
    for (const v of mesh.vertices) {
      expect(Number.isFinite(v.normalX)).toBe(true);
      expect(Number.isFinite(v.normalZ)).toBe(true);
    }
  });

  it("mesh curves with the alignment (arc station y changes)", () => {
    const mesh = buildRoadMesh({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
      stationInterval: 25,
    });
    // last station center vertex should have moved in y due to left arc
    const lastCenter = mesh.vertices[(mesh.stationCount - 1) * mesh.offsetCount + 1];
    expect(Math.abs(lastCenter.y)).toBeGreaterThan(1e-3);
  });
});
