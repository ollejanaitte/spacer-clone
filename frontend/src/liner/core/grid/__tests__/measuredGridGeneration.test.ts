import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../pipeline/pipeline";
import { generateGridPoints } from "../gridGeneration";
import { generateMeasuredGridPoints } from "../measuredGridGeneration";
import { evaluateAlignmentAtDistance } from "../../geometry/horizontal";
import { offsetPoint } from "../../vector";
import { mapToFrameModel } from "../../../mapper/frameModelMapper";
import type { LinearAlignment } from "../../types";
import type { MeasuredGridDraft } from "../../../schema/types";

const alignment: LinearAlignment = {
  id: "alignment-measured",
  linerModelId: "sample-bridge",
  coordinatePolicyId: "local-hcl",
  elements: [
    {
      type: "straight",
      id: "plan-hcl",
      start: { x: 0, y: 0 },
      azimuth: 0,
      length: 164.2476,
    },
  ],
};

function buildSampleMeasuredGrid(): MeasuredGridDraft {
  const sections = [
    { id: "sec-ph12", label: "PH12", station: 0, sortIndex: 0 },
    { id: "sec-ph13", label: "PH13", station: 45.1726, sortIndex: 1 },
    { id: "sec-ph15", label: "PH15", station: 164.2476, sortIndex: 2 },
  ];
  const lines = [
    { id: "line-g1", label: "G1", role: "girder" as const, sortIndex: 0 },
    { id: "line-hcl", label: "HCL", role: "center" as const, sortIndex: 1 },
  ];
  const points = [
    {
      id: "p-ph12-g1",
      sectionId: "sec-ph12",
      lineId: "line-g1",
      station: 0,
      x: 0,
      y: 5.4833,
      z: 17.6595,
      cumulativeWidth: 5.4833,
    },
    {
      id: "p-ph12-hcl",
      sectionId: "sec-ph12",
      lineId: "line-hcl",
      station: 0,
      x: 0,
      y: 0,
      z: 17.6595,
      cumulativeWidth: 0,
    },
    {
      id: "p-ph13-g1",
      sectionId: "sec-ph13",
      lineId: "line-g1",
      station: 45.1726,
      x: 45.1698,
      y: 2.9457,
      z: 16.8476,
      cumulativeWidth: 2.9457,
    },
    {
      id: "p-ph13-hcl",
      sectionId: "sec-ph13",
      lineId: "line-hcl",
      station: 45.1726,
      x: 45.1698,
      y: 0.2763,
      z: 16.8476,
      cumulativeWidth: 0,
    },
    {
      id: "p-ph15-hcl",
      sectionId: "sec-ph15",
      lineId: "line-hcl",
      station: 164.2476,
      x: 164.2446,
      y: 0,
      z: 17.7878,
      cumulativeWidth: 0,
    },
    {
      id: "p-ph15-g1",
      sectionId: "sec-ph15",
      lineId: "line-g1",
      station: 164.2476,
      x: 164.2446,
      y: 2.945,
      z: 17.7878,
      cumulativeWidth: 2.945,
    },
  ];
  return {
    id: "mg-sample",
    source: "test",
    sections,
    lines,
    points,
  };
}

describe("generateMeasuredGridPoints", () => {
  it("uses measured x/y rather than centerline offsetPoint for G1", () => {
    const measuredGrid = buildSampleMeasuredGrid();
    const { gridPoints } = generateMeasuredGridPoints({
      measuredGrid,
      alignment,
      sourceRevision: "test-revision",
    });

    const ph13G1 = gridPoints.find(
      (point) =>
        point.source.sectionId === "sec-ph13" && point.source.longitudinalLineId === "line-g1",
    );
    expect(ph13G1).toBeDefined();
    expect(ph13G1!.x).toBeCloseTo(45.1698, 4);
    expect(ph13G1!.y).toBeCloseTo(2.9457, 4);

    const nominal = generateGridPoints({
      alignment,
      stations: [
        {
          id: "ST-001",
          physicalDistance: 45.1726,
          displayedStation: 45.1726,
          source: "explicit",
          sortIndex: 1,
        },
      ],
      offsets: [5.4833],
      sourceRevision: "nominal",
      z: 16.8476,
    });
    const base = evaluateAlignmentAtDistance(alignment, 45.1726, 45.1726);
    const nominalPoint = offsetPoint(base.point, base.azimuth, 5.4833);
    expect(ph13G1!.y).not.toBeCloseTo(nominalPoint.y, 2);
    expect(nominal.gridPoints[0]?.y).toBeCloseTo(nominalPoint.y, 4);
  });

  it("connects G1 longitudinal line in station order", () => {
    const measuredGrid = buildSampleMeasuredGrid();
    const intermediate = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, explicitStations: [0, 45.1726, 164.2476] },
      measuredGrid,
      offsets: [0],
      z: 17,
    });

    const g1Line = intermediate.grid.lines.find(
      (line) => line.direction === "longitudinal" && line.index === 0,
    );
    expect(g1Line).toBeDefined();
    expect(g1Line!.pointIds).toEqual([
      "GP-sample-bridge-000-000",
      "GP-sample-bridge-001-000",
      "GP-sample-bridge-002-000",
    ]);
  });

  it("connects PH13 transverse line in line sort order", () => {
    const measuredGrid = buildSampleMeasuredGrid();
    const intermediate = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, explicitStations: [0, 45.1726, 164.2476] },
      measuredGrid,
      offsets: [0],
      z: 17,
    });

    const ph13Transverse = intermediate.grid.lines.find(
      (line) => line.direction === "transverse" && line.index === 1,
    );
    expect(ph13Transverse).toBeDefined();
    expect(ph13Transverse!.pointIds).toEqual([
      "GP-sample-bridge-001-000",
      "GP-sample-bridge-001-001",
    ]);
  });

  it("retains lineId and sectionId in grid point source", () => {
    const measuredGrid = buildSampleMeasuredGrid();
    const { gridPoints } = generateMeasuredGridPoints({
      measuredGrid,
      alignment,
      sourceRevision: "test-revision",
    });
    const ph13G1 = gridPoints.find((point) => point.source.sectionId === "sec-ph13");
    expect(ph13G1?.source.longitudinalLineId).toBe("line-g1");
    expect(ph13G1?.source.sectionId).toBe("sec-ph13");
    expect(ph13G1?.labels.longitudinalIndex).toBe(1);
    expect(ph13G1?.labels.transverseIndex).toBe(0);
  });
});

describe("measured grid pipeline fallback", () => {
  it("uses nominalOffset path when measuredGrid is absent", () => {
    const withoutMeasured = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, interval: 82 },
      offsets: [0, 5],
      z: 10,
    });
    const withMeasured = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, interval: 82 },
      measuredGrid: buildSampleMeasuredGrid(),
      offsets: [0, 5],
      z: 10,
    });

    expect(withoutMeasured.grid.points.length).toBeGreaterThan(0);
    expect(withMeasured.grid.points.length).not.toBe(withoutMeasured.grid.points.length);

    const nominalMid = withoutMeasured.grid.points.find(
      (point) => point.labels.transverseIndex === 1 && point.labels.longitudinalIndex === 1,
    );
    expect(nominalMid).toBeDefined();
    expect(nominalMid!.x).toBeCloseTo(82, 1);
    expect(nominalMid!.y).toBeCloseTo(5, 4);
  });
});

describe("measured grid frame mapping", () => {
  it("maps nodes and members from measured grid with trace identity", () => {
    const intermediate = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, explicitStations: [0, 45.1726, 164.2476] },
      measuredGrid: buildSampleMeasuredGrid(),
      offsets: [0],
      z: 17,
    });

    const frame = mapToFrameModel(intermediate);
    expect(frame.nodes).toHaveLength(intermediate.grid.points.length);
    const longitudinalMembers = frame.members.filter((member) => member.direction === "longitudinal");
    const transverseMembers = frame.members.filter((member) => member.direction === "transverse");
    const expectedLongitudinal = intermediate.grid.lines
      .filter((line) => line.direction === "longitudinal")
      .reduce((count, line) => count + Math.max(0, line.pointIds.length - 1), 0);
    const expectedTransverse = intermediate.grid.lines
      .filter((line) => line.direction === "transverse")
      .reduce((count, line) => count + Math.max(0, line.pointIds.length - 1), 0);
    expect(longitudinalMembers.length).toBe(expectedLongitudinal);
    expect(transverseMembers.length).toBe(expectedTransverse);

    const nodeTrace = frame.linerTrace.find(
      (entry) => entry.frameEntityType === "node" && entry.sectionId === "sec-ph13",
    );
    expect(nodeTrace?.longitudinalLineId).toBeDefined();
    expect(nodeTrace?.gridPointId).toMatch(/^GP-sample-bridge-/);

    const ph13G1Longitudinal = frame.linerTrace.find(
      (entry) =>
        entry.frameEntityType === "member" &&
        entry.memberDirection === "longitudinal" &&
        entry.gridPointIds?.includes("GP-sample-bridge-001-000") &&
        entry.gridPointIds?.includes("GP-sample-bridge-002-000"),
    );
    expect(ph13G1Longitudinal?.longitudinalLineId).toBe("line-g1");
    expect(ph13G1Longitudinal?.sectionId).toBeUndefined();

    const ph13Transverse = frame.linerTrace.find(
      (entry) =>
        entry.frameEntityType === "member" &&
        entry.memberDirection === "transverse" &&
        entry.gridPointIds?.includes("GP-sample-bridge-001-000") &&
        entry.gridPointIds?.includes("GP-sample-bridge-001-001"),
    );
    expect(ph13Transverse?.sectionId).toBe("sec-ph13");
    expect(ph13Transverse?.longitudinalLineId).toBeUndefined();
  });
});
