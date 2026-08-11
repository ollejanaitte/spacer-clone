import { describe, expect, it } from "vitest";
import { buildRoadCimGeometry, ROAD_CIM_GEOMETRY_VERSION } from "../roadCimGeometry";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../../liner/schema/types";

function makeHorizontal(): LinearAlignment {
  return {
    id: "ALIGN-CIM",
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

describe("Phase 2-10 Road CIM Geometry / Pavement Solid boundary", () => {
  it("builds CIM geometry with metadata, stations, sections, profiles", () => {
    const cim = buildRoadCimGeometry({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
      coordinateContextId: "COORD-CIM",
      stationInterval: 25,
    });
    expect(cim.version).toBe(ROAD_CIM_GEOMETRY_VERSION);
    expect(cim.metadata.alignmentId).toBe("ALIGN-CIM");
    expect(cim.metadata.coordinateContextId).toBe("COORD-CIM");
    expect(cim.metadata.unitSystem).toBe("metric");
    expect(cim.metadata.stationCount).toBe(cim.stations.length);
    expect(cim.metadata.sectionCount).toBe(1);
    expect(cim.metadata.profileCount).toBe(1);
    expect(cim.sections[0].offsetCount).toBe(3);
    expect(cim.profiles[0].elementType).toBe("grade");
  });

  it("produces a smooth surface mesh", () => {
    const cim = buildRoadCimGeometry({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
      stationInterval: 25,
    });
    expect(cim.surface.vertices.length).toBeGreaterThan(0);
    expect(cim.surface.triangles.length).toBeGreaterThan(0);
    expect(cim.centerline.length).toBe(cim.stations.length);
  });

  it("produces a pavement envelope separated from the top surface", () => {
    const cim = buildRoadCimGeometry({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
      pavementThickness: 0.2,
      stationInterval: 25,
    });
    expect(cim.pavementEnvelope.thickness).toBeCloseTo(0.2, 9);
    expect(cim.pavementEnvelope.topSurface.vertices.length).toBe(
      cim.pavementEnvelope.bottomSurface.vertices.length,
    );
    // bottom surface is lower by thickness
    const top = cim.pavementEnvelope.topSurface.vertices[1];
    const bottom = cim.pavementEnvelope.bottomSurface.vertices[1];
    expect(top.z - bottom.z).toBeCloseTo(0.2, 9);
  });

  it("carries geometry version and generated timestamp", () => {
    const cim = buildRoadCimGeometry({
      horizontal: makeHorizontal(),
      vertical: makeVertical(),
      crossSection: makeCrossSection(),
    });
    expect(cim.metadata.geometryVersion).toBe(ROAD_CIM_GEOMETRY_VERSION);
    expect(Number.isFinite(Date.parse(cim.metadata.generatedAt))).toBe(true);
  });
});
