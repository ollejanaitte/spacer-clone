import { describe, expect, it } from "vitest";
import { convertImporterToPhase35Draft } from "./ImporterToPhase35Adapter";
import { createSampleImporterProject } from "../__tests__/fixtures/sampleProject";
import { buildBuiltInSampleProject } from "../sample/builtInSampleDataset";
import type { Bridge, JipLinerImporterProject, Section } from "../types";

function createBridgeForStationNormalization(): Bridge {
  const bridgeId = "bridge-station-normalization";
  function makeSection(id: string, pdfPage: number, stationValue: number, stationLabel: string, notation: string): Section {
    return {
      id,
      bridgeId,
      spanId: "span-1",
      pdfPage,
      sectionNo: "讓ｪ譁ｭ髱｢",
      title: id,
      azimuth: {
        value: {
          deg: 109,
          min: 58,
          sec: 20.0,
          decimalDeg: 109.9722222,
          notation: "109-58-20.0",
        },
        flags: {},
        sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" },
      },
      stationingRef: {
        stationLabel,
        stationValue,
        cumulativeDistance: null,
        notation,
        sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" },
      },
      points: [
        {
          id: `${id}-hl1`,
          girderLineId: "hl1",
          lineLabel: "HL1",
          x: { value: -105476.6593, notation: "-105476.6593", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          y: { value: -24333.779, notation: "-24333.7790", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          designElevation: { value: 17.6, notation: "17.6000", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          crossSlope: { value: 2.0, notation: "2.0", unit: "%", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          unitDistance: { value: null, notation: "*********", unit: "m", flags: { notComputed: true }, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          cumulativeDistance: { value: null, notation: "*********", unit: "m", flags: { notComputed: true }, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          unitWidth: { value: 0.445, notation: "0.4450", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          cumulativeWidth: { value: 7.5707, notation: "7.5707", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          intersectionAngle: { value: null, flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          station: { value: null, label: null, notation: null, flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          flags: {},
          sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" },
        },
        {
          id: `${id}-hcl`,
          girderLineId: "hcl",
          lineLabel: "HCL",
          x: { value: -105474.0732, notation: "-105474.0732", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          y: { value: -24340.8943, notation: "-24340.8943", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          designElevation: { value: 17.45, notation: "17.4500", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          crossSlope: { value: 0.0, notation: "0.0", unit: "%", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          unitDistance: { value: null, notation: "*********", unit: "m", flags: { notComputed: true }, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          cumulativeDistance: { value: null, notation: "*********", unit: "m", flags: { notComputed: true }, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          unitWidth: { value: 0.5473, notation: "0.5473", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          cumulativeWidth: { value: 0, notation: "0.0000", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          intersectionAngle: { value: null, flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          station: { value: null, label: null, notation: null, flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" } },
          flags: {},
          sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" },
        },
      ],
      sourceRef: { pdfPage, enteredAt: "2026-07-05T00:00:00+09:00" },
    };
  }
  const sectionPh12 = makeSection("section-ph12", 21, 259.8142, "12+19.8142", "12+19.8142");
  const sectionPh13 = makeSection("section-ph13", 22, 269.5, "12+29.5000", "12+29.5000");
  const sectionPh14 = makeSection("section-ph14", 23, 279.5, "12+39.5000", "12+39.5000");
  const sectionPh15 = makeSection("section-ph15", 24, 289.5, "12+49.5000", "12+49.5000");

  return {
    id: bridgeId,
    name: "Station normalization bridge",
    bridgeType: "continuous",
    girderLineSets: [
      {
        id: "gls-1",
        name: "Main girders",
        referenceMode: "pdf-row-master",
        appliesToSpanIds: ["span-1"],
        lines: [
          { id: "hl1", label: "HL1", role: "edge", displayOrder: 0, nominalOffset: -7.5707 },
          { id: "hcl", label: "HCL", role: "center", displayOrder: 1, nominalOffset: 0 },
        ],
      },
    ],
    spans: [
      {
        id: "span-1",
        name: "PH12-PH15",
        startStation: 259.8142,
        endStation: 395.466,
        girderLineSetId: "gls-1",
        sourceRef: { pdfPage: 21, enteredAt: "2026-07-05T00:00:00+09:00" },
      },
    ],
    sections: [sectionPh12, sectionPh13, sectionPh14, sectionPh15],
    alignmentMetadata: {
      plan: {
        elements: [
          {
            type: "straight",
            id: "plan-1",
            start: { x: -105476.6593, y: -24333.779 },
            azimuth: 1.919,
            length: 135.0,
          },
        ],
      },
      profile: {
        elements: [
          {
            type: "grade",
            id: "profile-1",
            startStation: 250,
            endStation: 300,
            startElevation: 17.6,
            grade: 0.01,
          },
        ],
      },
      crossSlope: {
        definitions: [{ id: "cs-1", station: 259.8142, crossSlope: 2.0 }],
      },
    },
  };
}

function createProjectForStationNormalization(): JipLinerImporterProject {
  return {
    id: "importer-project-station-normalization",
    name: "Station normalization test project",
    createdAt: "2026-07-05T00:00:00+09:00",
    updatedAt: "2026-07-05T00:00:00+09:00",
    liner: { importerSchemaVersion: "0.1.0" },
    coordinateSystem: {
      horizontal: { datum: "Japan Plane Rectangular CS IX", unit: "m" },
      vertical: { heightDatum: "T.P.", unit: "m" },
    },
    bridges: [createBridgeForStationNormalization()],
  };
}

describe("ImporterToPhase35Adapter", () => {
  it("converts sample project to Phase 3.5 draft", () => {
    const project = createSampleImporterProject();
    const result = convertImporterToPhase35Draft(project);
    expect(result.draft).not.toBeNull();
    expect(result.conversionLog).not.toBeNull();
    expect(result.draft?.alignment.elements.length).toBeGreaterThan(0);
    expect(result.draft?.verticalAlignment.elements.length).toBeGreaterThan(0);
  });

  it("blocks export without plan alignment", () => {
    const project = createSampleImporterProject();
    project.bridges[0]!.alignmentMetadata = undefined;
    const result = convertImporterToPhase35Draft(project);
    expect(result.draft).toBeNull();
  });

  it("normalizes explicit station coordinates into the alignment frame (regression for LINER_STATION_OUT_OF_RANGE)", () => {
    const project = createProjectForStationNormalization();
    const result = convertImporterToPhase35Draft(project);
    expect(result.draft).not.toBeNull();

    const stationDefinition = result.draft!.stationDefinition;
    expect(stationDefinition.originDisplayedStation).toBeCloseTo(259.8142, 4);
    const expected = [0, 9.6858, 19.6858, 29.6858];
    expect(stationDefinition.explicitStations).toHaveLength(expected.length);
    stationDefinition.explicitStations!.forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index]!, 6);
    });
    // Each explicit station must fall inside the alignment's [0, totalLength] range.
    const totalLength = result.draft!.alignment.elements.reduce(
      (sum, element) => sum + element.length,
      0,
    );
    for (const station of stationDefinition.explicitStations ?? []) {
      expect(station).toBeGreaterThanOrEqual(0);
      expect(station).toBeLessThanOrEqual(totalLength + 1e-6);
    }
  });

  it("normalizes span start/end physical distances using the same origin", () => {
    const project = createProjectForStationNormalization();
    const result = convertImporterToPhase35Draft(project);
    expect(result.draft).not.toBeNull();
    const span = result.draft!.spans[0]!;
    expect(span.startPhysicalDistance).toBeCloseTo(0, 4);
    expect(span.endPhysicalDistance).toBeCloseTo(135.6518, 4);
  });

  it("produces a draft that runs the Phase 3.5 pipeline without LINER_STATION_OUT_OF_RANGE", async () => {
    const project = createProjectForStationNormalization();
    const result = convertImporterToPhase35Draft(project);
    expect(result.draft).not.toBeNull();

    // Re-import the pipeline to confirm no out-of-range diagnostics are raised.
    const { buildIntermediateResult } = await import("../../core/pipeline/pipeline");
    const { linerDraftFromProject } = await import("../../adapters/linerProjectDraft");
    const { withProjectLinerDomainDraft } = await import("../../adapters/linerProjectDraft");

    const shell = {
      schemaVersion: "1.0.0",
      project: {
        id: "shell",
        name: "Shell",
        schemaVersion: "1.0.0",
        createdAt: "2026-07-05T00:00:00+09:00",
        updatedAt: "2026-07-05T00:00:00+09:00",
      },
      units: { length: "m", force: "kN", temperature: "C" } as { length: string; force: string; temperature: string },
      nodes: [],
      materials: [],
      sections: [],
      members: [],
      supports: [],
      loadCases: [],
      nodalLoads: [],
      memberLoads: [],
      analysisSettings: { solver: "direct-stiffness" } as { solver: string },
    };
    const stored = withProjectLinerDomainDraft(shell as unknown as Parameters<typeof withProjectLinerDomainDraft>[0], result.draft!);
    const draft = linerDraftFromProject(stored);
    expect(draft).toBeDefined();
    const intermediate = buildIntermediateResult(draft!);
    const outOfRange = intermediate.diagnostics.filter(
      (diagnostic) => diagnostic.code === "LINER_STATION_OUT_OF_RANGE",
    );
    expect(outOfRange).toEqual([]);
  });

  it("built-in sample dataset produces a draft without LINER_STATION_OUT_OF_RANGE diagnostics", async () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();

    const { buildIntermediateResult } = await import("../../core/pipeline/pipeline");
    const { linerDraftFromProject } = await import("../../adapters/linerProjectDraft");
    const { withProjectLinerDomainDraft } = await import("../../adapters/linerProjectDraft");

    const shell = {
      schemaVersion: "1.0.0",
      project: {
        id: "shell-built-in",
        name: "Shell built-in",
        schemaVersion: "1.0.0",
        createdAt: "2026-07-05T00:00:00+09:00",
        updatedAt: "2026-07-05T00:00:00+09:00",
      },
      units: { length: "m", force: "kN", temperature: "C" } as { length: string; force: string; temperature: string },
      nodes: [],
      materials: [],
      sections: [],
      members: [],
      supports: [],
      loadCases: [],
      nodalLoads: [],
      memberLoads: [],
      analysisSettings: { solver: "direct-stiffness" } as { solver: string },
    };
    const stored = withProjectLinerDomainDraft(shell as unknown as Parameters<typeof withProjectLinerDomainDraft>[0], result.draft!);
    const draft = linerDraftFromProject(stored);
    expect(draft).toBeDefined();
    const intermediate = buildIntermediateResult(draft!);
    const outOfRange = intermediate.diagnostics.filter(
      (diagnostic) => diagnostic.code === "LINER_STATION_OUT_OF_RANGE",
    );
    expect(outOfRange).toEqual([]);
  });
});