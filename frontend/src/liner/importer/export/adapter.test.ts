import { describe, expect, it } from "vitest";
import { convertImporterToPhase35Draft } from "./ImporterToPhase35Adapter";
import { createSampleImporterProject } from "../__tests__/fixtures/sampleProject";
import { buildBuiltInSampleProject, BUILT_IN_SAMPLE_ALIGNMENT_LENGTH } from "../sample/builtInSampleDataset";
import type { Bridge, JipLinerImporterProject, Section } from "../types";
import { buildNormalizationContext } from "./normalize/normalizationContext";
import { POST_CONDITION_CODES } from "./normalize/postConditions";

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

  it("built-in sample pipeline emits zero LINER_STATION_DUPLICATE_EQUATION warnings", async () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();

    const { buildIntermediateResult } = await import("../../core/pipeline/pipeline");
    const { linerDraftFromProject, withProjectLinerDomainDraft } = await import(
      "../../adapters/linerProjectDraft"
    );

    const shell = {
      schemaVersion: "1.0.0",
      project: {
        id: "shell-built-in-dup",
        name: "Shell built-in dup",
        schemaVersion: "1.0.0",
        createdAt: "2026-07-05T00:00:00+09:00",
        updatedAt: "2026-07-05T00:00:00+09:00",
      },
      units: { length: "m", force: "kN", temperature: "C" } as {
        length: string;
        force: string;
        temperature: string;
      },
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
    const stored = withProjectLinerDomainDraft(
      shell as unknown as Parameters<typeof withProjectLinerDomainDraft>[0],
      result.draft!,
    );
    const draft = linerDraftFromProject(stored);
    const intermediate = buildIntermediateResult(draft!);
    const duplicateStations = intermediate.diagnostics.filter(
      (diagnostic) => diagnostic.code === "LINER_STATION_DUPLICATE_EQUATION",
    );
    expect(duplicateStations).toEqual([]);
  });
});

describe("Phase 3.7 NormalizationContext pipeline", () => {
  it("1: NormalizationContext round-trip toOriginal(toNormalized(259.7133)) ≈ 259.7133", () => {
    const ctx = buildNormalizationContext({
      sectionStations: [259.7133],
      spanStartStations: [],
      spanEndStations: [395.466],
      planLength: 135,
      stationEquations: [],
    });
    expect(Math.abs(ctx.toOriginal(ctx.toNormalized(259.7133)) - 259.7133)).toBeLessThan(
      ctx.tolerance.station,
    );
  });

  it("2: originStation simple min — section-only and section+span cases", () => {
    const sectionOnly = buildNormalizationContext({
      sectionStations: [259.7133],
      spanStartStations: [],
      spanEndStations: [],
      planLength: 135,
    });
    expect(sectionOnly.originStation).toBeCloseTo(259.7133, 6);
    expect(sectionOnly.diagnostics.some((d) => d.code === "LINER_ORIGIN_STATION_AMBIGUOUS")).toBe(
      false,
    );

    const sectionAndSpan = buildNormalizationContext({
      sectionStations: [259.7133],
      spanStartStations: [259.8142],
      spanEndStations: [],
      planLength: 135,
    });
    expect(sectionAndSpan.originStation).toBeCloseTo(259.7133, 6);
    expect(sectionAndSpan.diagnostics.some((d) => d.code === "LINER_ORIGIN_STATION_AMBIGUOUS")).toBe(
      true,
    );
  });

  it("3: alignmentLength Case D — planLength=135, spanReach=135.6518 → 135.6518", () => {
    const ctx = buildNormalizationContext({
      sectionStations: [259.8142],
      spanStartStations: [259.8142],
      spanEndStations: [395.466],
      planLength: 135,
    });
    expect(ctx.planLength).toBeCloseTo(135, 6);
    expect(ctx.spanReach).toBeCloseTo(135.6518, 4);
    expect(ctx.alignmentLength).toBeCloseTo(135.6518, 4);
  });

  it("4: built-in sample profile.elements[0] covers the full HCL alignment length", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();
    const element = result.draft!.verticalAlignment.elements[0]!;
    const totalLength = result.draft!.alignment.elements.reduce(
      (sum, alignmentElement) => sum + alignmentElement.length,
      0,
    );
    expect(element.startStation).toBeCloseTo(0, 6);
    expect(element.endStation).toBeCloseTo(totalLength, 4);
    expect(totalLength).toBeCloseTo(BUILT_IN_SAMPLE_ALIGNMENT_LENGTH, 4);
  });

  it("5: built-in sample pipeline has zero LINER_PROFILE_COVERAGE_GAP", async () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();

    const { buildIntermediateResult } = await import("../../core/pipeline/pipeline");
    const { linerDraftFromProject, withProjectLinerDomainDraft } = await import(
      "../../adapters/linerProjectDraft"
    );

    const shell = {
      schemaVersion: "1.0.0",
      project: {
        id: "shell-coverage",
        name: "Shell coverage",
        schemaVersion: "1.0.0",
        createdAt: "2026-07-05T00:00:00+09:00",
        updatedAt: "2026-07-05T00:00:00+09:00",
      },
      units: { length: "m", force: "kN", temperature: "C" } as {
        length: string;
        force: string;
        temperature: string;
      },
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
    const stored = withProjectLinerDomainDraft(
      shell as unknown as Parameters<typeof withProjectLinerDomainDraft>[0],
      result.draft!,
    );
    const draft = linerDraftFromProject(stored);
    const intermediate = buildIntermediateResult(draft!);
    const coverageGaps = intermediate.diagnostics.filter(
      (diagnostic) => diagnostic.code === "LINER_PROFILE_COVERAGE_GAP",
    );
    expect(coverageGaps).toHaveLength(0);
  });

  it("6: built-in sample emits zero LINER_PROFILE_END_COVERAGE_GAP warnings", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();
    const endCoverageWarnings = result.diagnostics.filter(
      (diagnostic) => diagnostic.code === POST_CONDITION_CODES.PROFILE_END_COVERAGE_GAP,
    );
    expect(endCoverageWarnings).toHaveLength(0);
  });

  it("7: built-in sample has zero LINER_SPAN_END_EXCEEDS_ALIGNMENT", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();
    const spanOverflow = result.diagnostics.filter(
      (diagnostic) => diagnostic.code === POST_CONDITION_CODES.SPAN_END_EXCEEDS_ALIGNMENT,
    );
    expect(spanOverflow).toHaveLength(0);
    expect(result.draft!.spans[0]!.endPhysicalDistance).toBeCloseTo(
      BUILT_IN_SAMPLE_ALIGNMENT_LENGTH,
      4,
    );
  });

  it("8: built-in crossSections[0].station=0 and name CrossSlope @ 0", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();
    const crossSection = result.draft!.crossSections[0]!;
    expect(crossSection.station).toBeCloseTo(0, 6);
    expect(crossSection.name).toBe("CrossSlope @ 0");
  });

  it("9: built-in explicitStations follow PDF 小座標 cumulative distances", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();
    const expected = [
      0, 0.5897, 0.6399, 8.3121, 16.2403, 24.1779, 32.1547, 40.1559, 45.1726, 50.4373,
      59.8385, 69.2395, 78.6403, 88.041, 97.4416, 102.7325, 108.022, 117.5223, 127.0224,
      136.5224, 146.0224, 155.5224, 163.3996, 163.9996, 164.2476,
    ];
    expect(result.draft!.stationDefinition.explicitStations).toHaveLength(expected.length);
    result.draft!.stationDefinition.explicitStations!.forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index]!, 3);
    });
  });

  it("10: NormalizationContext is frozen and originStation assignment throws", () => {
    const ctx = buildNormalizationContext({
      sectionStations: [259.7133],
      spanStartStations: [],
      spanEndStations: [],
      planLength: 135,
    });
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(() => {
      (ctx as { originStation: number }).originStation = 999;
    }).toThrow(TypeError);
  });

  it("11: substructure no-op — undefined bridge.substructure yields empty piers and no crossBeams", () => {
    const sample = buildBuiltInSampleProject();
    expect(sample.bridges[0]!.substructure).toBeUndefined();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();
    expect(result.draft!.piers).toEqual([]);
    expect(result.draft!.crossBeams).toBeUndefined();
    expect(result.draft!.widthChangePoints).toBeUndefined();
    expect(result.diagnostics.some((d) => d.level === "error")).toBe(false);
  });
});

describe("Phase 3.8 measuredGrid adapter", () => {
  it("built-in sample draft includes measuredGrid with points", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    expect(result.draft).not.toBeNull();
    expect(result.draft!.measuredGrid).toBeDefined();
    expect(result.draft!.measuredGrid!.points.length).toBeGreaterThan(0);
  });

  it("PH12 HCL is at local origin in measuredGrid", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    const grid = result.draft!.measuredGrid!;
    const ph12 = grid.sections.find((section) => section.label.includes("PH12"));
    const hcl = grid.lines.find((line) => line.label === "HCL");
    expect(ph12).toBeDefined();
    expect(hcl).toBeDefined();
    const point = grid.points.find(
      (entry) => entry.sectionId === ph12!.id && entry.lineId === hcl!.id,
    );
    expect(point?.x).toBeCloseTo(0, 4);
    expect(point?.y).toBeCloseTo(0, 4);
  });

  it("PH15 HCL station is approximately 164.2476", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    const grid = result.draft!.measuredGrid!;
    const ph15 = grid.sections.find((section) => section.label.includes("PH15"));
    const hcl = grid.lines.find((line) => line.label === "HCL");
    const point = grid.points.find(
      (entry) => entry.sectionId === ph15!.id && entry.lineId === hcl!.id,
    );
    expect(point?.station).toBeCloseTo(164.2476, 4);
  });

  it("G1/G2 offsets vary by section in measuredGrid", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    const grid = result.draft!.measuredGrid!;
    const g1 = grid.lines.find((line) => line.label === "G1")!;
    const g2 = grid.lines.find((line) => line.label === "G2")!;
    const ph12 = grid.sections.find((section) => section.label.includes("PH12"))!;
    const ph13 = grid.sections.find((section) => section.label.includes("PH13"))!;
    const ph12G1 = grid.points.find(
      (point) => point.sectionId === ph12.id && point.lineId === g1.id,
    )!;
    const ph13G1 = grid.points.find(
      (point) => point.sectionId === ph13.id && point.lineId === g1.id,
    )!;
    const ph12G2 = grid.points.find(
      (point) => point.sectionId === ph12.id && point.lineId === g2.id,
    )!;
    const ph13G2 = grid.points.find(
      (point) => point.sectionId === ph13.id && point.lineId === g2.id,
    )!;
    expect(ph12G1.cumulativeWidth).not.toBeCloseTo(ph13G1.cumulativeWidth, 2);
    expect(ph12G2.cumulativeWidth).not.toBeCloseTo(ph13G2.cumulativeWidth, 2);
  });

  it("includes C1 through C17 sections in measuredGrid", () => {
    const sample = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(sample);
    const labels = result.draft!.measuredGrid!.sections.map((section) => section.label);
    for (let index = 1; index <= 17; index += 1) {
      expect(labels.some((label) => label === `C${index}`)).toBe(true);
    }
  });

  it("draft without measuredGrid uses nominalOffset path in pipeline (regression)", async () => {
    const { buildIntermediateResult } = await import("../../core/pipeline/pipeline");
    const withoutMeasured = buildIntermediateResult({
      alignment: {
        id: "alignment-fallback",
        linerModelId: "fallback-model",
        coordinatePolicyId: "global",
        elements: [
          {
            type: "straight",
            id: "L1",
            start: { x: 0, y: 0 },
            azimuth: 0,
            length: 20,
          },
        ],
      },
      stationDefinition: { originDisplayedStation: 0, interval: 10 },
      offsets: [-5, 0, 5],
      z: 10,
    });
    expect(withoutMeasured.grid.points).toHaveLength(9);
    expect(withoutMeasured.grid.points[4]?.x).toBeCloseTo(10, 1);
  });
});