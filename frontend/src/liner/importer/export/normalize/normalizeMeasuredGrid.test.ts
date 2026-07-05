import { describe, expect, it } from "vitest";
import { normalizeMeasuredGrid, collectMeasuredGridCollapseWarnings } from "./normalizeMeasuredGrid";
import { buildNormalizationContext } from "./normalizationContext";
import type { Bridge, Section } from "../../types";

function createMinimalBridge(sections: Section[]): Bridge {
  return {
    id: "bridge-min",
    name: "Minimal",
    bridgeType: "continuous",
    girderLineSets: [
      {
        id: "gls-1",
        name: "Main",
        referenceMode: "pdf-row-master",
        appliesToSpanIds: ["span-1"],
        lines: [
          { id: "hl1", label: "HL1", role: "edge", displayOrder: 0, nominalOffset: 7.5707 },
          { id: "g1", label: "G1", role: "girder", displayOrder: 1, nominalOffset: 5.4833 },
          { id: "hcl", label: "HCL", role: "center", displayOrder: 2, nominalOffset: 0 },
          { id: "g2", label: "G2", role: "girder", displayOrder: 3, nominalOffset: -0.5473 },
        ],
      },
    ],
    spans: [{ id: "span-1", name: "Span", startStation: 0, endStation: 164.2476, girderLineSetId: "gls-1" }],
    sections,
    alignmentMetadata: {
      plan: {
        elements: [
          { type: "straight", id: "plan", start: { x: 0, y: 0 }, azimuth: 0, length: 164.2476 },
        ],
      },
    },
  };
}

function makeSection(
  id: string,
  title: string,
  station: number,
  hclX: number,
  hclY: number,
  g1Offset: number,
): Section {
  const enteredAt = "2026-07-05T00:00:00+09:00";
  const sourceRef = { pdfPage: 44, enteredAt };
  function num(value: number) {
    return { value, notation: value.toFixed(4), unit: "m" as const, flags: {}, sourceRef };
  }
  return {
    id,
    bridgeId: "bridge-min",
    spanId: "span-1",
    pdfPage: 44,
    title,
    azimuth: {
      value: { deg: 109, min: 58, sec: 28.3, decimalDeg: 109.9745, notation: "109-58-28.3" },
      flags: {},
      sourceRef,
    },
    stationingRef: {
      stationLabel: station.toFixed(4),
      stationValue: station,
      cumulativeDistance: station,
      notation: station.toFixed(4),
      sourceRef,
    },
    points: [
      {
        id: `${id}-g1`,
        girderLineId: "g1",
        lineLabel: "G1",
        x: num(hclX),
        y: num(g1Offset),
        designElevation: num(17.6),
        crossSlope: num(0),
        unitDistance: num(0),
        cumulativeDistance: num(station),
        unitWidth: num(0),
        cumulativeWidth: num(g1Offset),
        flags: {},
        sourceRef,
      },
      {
        id: `${id}-hcl`,
        girderLineId: "hcl",
        lineLabel: "HCL",
        x: num(hclX),
        y: num(hclY),
        designElevation: num(17.6),
        crossSlope: num(0),
        unitDistance: num(0),
        cumulativeDistance: num(station),
        unitWidth: num(0),
        cumulativeWidth: num(0),
        flags: {},
        sourceRef,
      },
    ],
    sourceRef,
  };
}

describe("normalizeMeasuredGrid", () => {
  it("builds measured grid points from bridge section points", () => {
    const bridge = createMinimalBridge([
      makeSection("sec-ph12", "PH12(PE10)", 0, 0, 0, 5.4833),
      makeSection("sec-ph15", "PH15(PE13)", 164.2476, 164.2446, 0, 2.945),
    ]);
    const ctx = buildNormalizationContext({
      sectionStations: [0, 164.2476],
      spanStartStations: [0],
      spanEndStations: [164.2476],
      planLength: 164.2476,
    });
    const measuredGrid = normalizeMeasuredGrid(bridge, ctx);
    expect(measuredGrid).toBeDefined();
    expect(measuredGrid!.points.length).toBeGreaterThan(0);

    const ph12Hcl = measuredGrid!.points.find(
      (point) => point.sectionId === "sec-ph12" && point.lineId === "hcl",
    );
    expect(ph12Hcl?.x).toBeCloseTo(0, 4);
    expect(ph12Hcl?.y).toBeCloseTo(0, 4);

    const ph15Hcl = measuredGrid!.points.find(
      (point) => point.sectionId === "sec-ph15" && point.lineId === "hcl",
    );
    expect(ph15Hcl?.station).toBeCloseTo(164.2476, 4);
  });

  it("preserves line display order in sortIndex", () => {
    const bridge = createMinimalBridge([makeSection("sec-ph12", "PH12(PE10)", 0, 0, 0, 5.4833)]);
    const ctx = buildNormalizationContext({
      sectionStations: [0],
      spanStartStations: [0],
      spanEndStations: [164.2476],
      planLength: 164.2476,
    });
    const measuredGrid = normalizeMeasuredGrid(bridge, ctx)!;
    expect(measuredGrid.lines.map((line) => line.label)).toEqual(["HL1", "G1", "HCL", "G2"]);
    expect(measuredGrid.lines.find((line) => line.label === "G1")?.sortIndex).toBe(1);
  });

  it("returns undefined when no finite section points exist", () => {
    const bridge = createMinimalBridge([]);
    const ctx = buildNormalizationContext({
      sectionStations: [],
      spanStartStations: [0],
      spanEndStations: [164.2476],
      planLength: 164.2476,
    });
    expect(normalizeMeasuredGrid(bridge, ctx)).toBeUndefined();
  });

  it("reports adjacent lines that collapse to the same cumulativeWidth within a section", () => {
    const measuredGrid = {
      id: "mg-test",
      source: "unit-test",
      sections: [{ id: "sec-1", label: "S1", station: 0, sortIndex: 0 }],
      lines: [
        { id: "l1", label: "HL1", sortIndex: 0 },
        { id: "l2", label: "HL2", sortIndex: 1 },
      ],
      points: [
        {
          id: "p1",
          sectionId: "sec-1",
          lineId: "l1",
          station: 0,
          x: 0,
          y: 5,
          z: 0,
          cumulativeWidth: 5,
        },
        {
          id: "p2",
          sectionId: "sec-1",
          lineId: "l2",
          station: 0,
          x: 0,
          y: 5,
          z: 0,
          cumulativeWidth: 5,
        },
      ],
    };

    expect(collectMeasuredGridCollapseWarnings(measuredGrid)).toEqual([
      expect.objectContaining({
        sectionId: "sec-1",
        adjacentLineLabel: "HL1",
        lineLabel: "HL2",
      }),
    ]);
  });
});
