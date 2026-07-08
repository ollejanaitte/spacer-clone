import { describe, expect, it } from "vitest";
import { validateBridge, validateProject, validateSection } from "./validateImporter";
import { IMPORTER_STATION_NOT_MONOTONIC, IMPORTER_SYMMETRY_WIDTH_MISMATCH } from "./diagnosticCodes";
import { createSampleBridge, createSampleImporterProject } from "../__tests__/fixtures/sampleProject";
import { buildBuiltInSampleProject } from "../sample/builtInSampleDataset";
import type { LinerBridge, GirderLineMaster, Point, Section } from "../types";
import { createPointFromGirderLine } from "../utils/importerUtils";

const SYMMETRIC_GIRDER_LINES: GirderLineMaster[] = [
  { id: "hl1-left", label: "HL1", role: "edge", displayOrder: 0 },
  { id: "hcl", label: "HCL", role: "center", displayOrder: 1 },
  { id: "hl1-right", label: "HL1", role: "edge", displayOrder: 2 },
];

function withCumulativeWidth(point: Point, width: number, pdfPage: number): Point {
  return {
    ...point,
    cumulativeWidth: {
      value: width,
      notation: width.toFixed(4),
      unit: "m",
      flags: {},
      sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" },
    },
  };
}

function createSymmetricSection(bridgeId: string, pdfPage = 23): Section {
  const bridge = createSampleBridge();
  const section = { ...bridge.sections[0]!, bridgeId, pdfPage };
  const centerWidth = 3.5;
  const left = withCumulativeWidth(
    createPointFromGirderLine(SYMMETRIC_GIRDER_LINES[0]!, pdfPage),
    -centerWidth,
    pdfPage,
  );
  const center = withCumulativeWidth(
    createPointFromGirderLine(SYMMETRIC_GIRDER_LINES[1]!, pdfPage),
    centerWidth,
    pdfPage,
  );
  const right = withCumulativeWidth(
    createPointFromGirderLine(SYMMETRIC_GIRDER_LINES[2]!, pdfPage),
    centerWidth,
    pdfPage,
  );
  section.points = [left, center, right];
  return section;
}

function createAsymmetricRampBridge(): LinerBridge {
  const bridge = createSampleBridge();
  const pdfPage = 23;
  const lines: GirderLineMaster[] = [
    { id: "hl1", label: "HL1", role: "edge", displayOrder: 0 },
    { id: "g1", label: "G1", role: "girder", displayOrder: 1 },
    { id: "hcl", label: "HCL", role: "center", displayOrder: 2 },
    { id: "g2", label: "G2", role: "girder", displayOrder: 3 },
    { id: "cl", label: "CL", role: "custom", displayOrder: 4 },
  ];
  const widths = [7.5707, -8.8835, 0, -0.5473, -4.8875];
  const section = {
    ...bridge.sections[0]!,
    points: lines.map((line, index) =>
      withCumulativeWidth(createPointFromGirderLine(line, pdfPage), widths[index]!, pdfPage),
    ),
  };
  return {
    ...bridge,
    girderLineSets: [
      {
        ...bridge.girderLineSets[0]!,
        lines,
      },
    ],
    sections: [section],
  };
}

describe("validateImporter", () => {
  it("detects station monotonic violations", () => {
    const bridge = createSampleBridge();
    const badSection = {
      ...bridge.sections[0]!,
      id: "section-bad",
      pdfPage: 99,
      stationingRef: {
        ...bridge.sections[0]!.stationingRef,
        stationValue: 100,
      },
    };
    const diagnostics = validateBridge({ ...bridge, sections: [...bridge.sections, badSection] });
    expect(diagnostics.some((item) => item.code === IMPORTER_STATION_NOT_MONOTONIC)).toBe(true);
  });

  it("validates full project", () => {
    const project = createSampleImporterProject();
    const diagnostics = validateProject(project);
    expect(Array.isArray(diagnostics)).toBe(true);
  });

  it("does not emit symmetry diagnostics for a symmetric bridge when expectSymmetry is true", () => {
    const bridge = createSampleBridge();
    const section = createSymmetricSection(bridge.id);
    const symmetricBridge: LinerBridge = {
      ...bridge,
      validationProfile: { expectSymmetry: true },
      girderLineSets: [
        {
          ...bridge.girderLineSets[0]!,
          lines: SYMMETRIC_GIRDER_LINES,
        },
      ],
      sections: [section],
    };

    const diagnostics = validateSection(section, symmetricBridge, symmetricBridge.sections);
    expect(
      diagnostics.filter((item) => item.code === IMPORTER_SYMMETRY_WIDTH_MISMATCH),
    ).toEqual([]);
  });

  it("does not emit symmetry warnings for an asymmetric ramp bridge when expectSymmetry is false", () => {
    const bridge = createAsymmetricRampBridge();
    const section = bridge.sections[0]!;

    const diagnostics = validateSection(section, bridge, bridge.sections);
    expect(
      diagnostics.some((item) => item.code === IMPORTER_SYMMETRY_WIDTH_MISMATCH),
    ).toBe(false);
  });

  it("emits symmetry warnings for an asymmetric ramp bridge when expectSymmetry is true", () => {
    const bridge: LinerBridge = {
      ...createAsymmetricRampBridge(),
      validationProfile: { expectSymmetry: true },
    };
    const section = bridge.sections[0]!;

    const diagnostics = validateSection(section, bridge, bridge.sections);
    expect(
      diagnostics.some((item) => item.code === IMPORTER_SYMMETRY_WIDTH_MISMATCH),
    ).toBe(true);
  });

  it("does not emit symmetry warnings for the built-in sample bridge by default", () => {
    const bridge = buildBuiltInSampleProject().bridges[0]!;
    const diagnostics = validateBridge(bridge);
    expect(
      diagnostics.filter((item) => item.code === IMPORTER_SYMMETRY_WIDTH_MISMATCH),
    ).toEqual([]);
  });
});
