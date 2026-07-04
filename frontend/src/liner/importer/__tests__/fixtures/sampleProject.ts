import type { Bridge, GirderLineMaster, JipLinerImporterProject, Section } from "../../types";
import { createEmptyImporterProject } from "../../factory";
import { createEmptySection, createPointFromGirderLine } from "../../utils/importerUtils";

const GIRDER_LINES: GirderLineMaster[] = [
  { id: "hl1", label: "HL1", role: "edge", displayOrder: 0 },
  { id: "hcl", label: "HCL", role: "center", displayOrder: 1 },
  { id: "cl", label: "CL", role: "custom", displayOrder: 2 },
];

export function createSampleSection(bridgeId: string, pdfPage = 23): Section {
  const section = createEmptySection(bridgeId, pdfPage, GIRDER_LINES);
  section.sectionNo = "横断面 1";
  section.title = "PH12(PE10)";
  section.azimuth = {
    value: {
      deg: 109,
      min: 58,
      sec: 28.3,
      decimalDeg: 109.9745278,
      notation: "109-58-28.3",
    },
    flags: {},
    sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" },
  };
  section.stationingRef = {
    stationLabel: "12+19.7133",
    stationValue: 259.7133,
    cumulativeDistance: null,
    notation: "12+19.7133",
    sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" },
  };

  const hl1 = createPointFromGirderLine(GIRDER_LINES[0]!, pdfPage);
  hl1.x = { value: -105476.6593, notation: "-105476.6593", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };
  hl1.y = { value: -24333.779, notation: "-24333.7790", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };
  hl1.designElevation = { value: 17.8144, notation: "17.8144", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };
  hl1.cumulativeWidth = { value: 7.5707, notation: "7.5707", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };
  hl1.unitWidth = { value: 0.445, notation: "0.4450", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };

  const hcl = createPointFromGirderLine(GIRDER_LINES[1]!, pdfPage);
  hcl.x = { value: -105474.0732, notation: "-105474.0732", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };
  hcl.y = { value: -24340.8943, notation: "-24340.8943", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };
  hcl.designElevation = { value: 17.6595, notation: "17.6595", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };
  hcl.cumulativeWidth = { value: 0, notation: "0.0000", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };
  hcl.unitWidth = { value: 0.5473, notation: "0.5473", unit: "m", flags: {}, sourceRef: { pdfPage, enteredAt: "2026-07-02T00:00:00+09:00" } };

  section.points = [hl1, hcl];
  return section;
}

export function createSampleBridge(): Bridge {
  const bridgeId = "bridge-h-ramp-4";
  return {
    id: bridgeId,
    name: "Hランプ4号橋",
    bridgeType: "continuous",
    girderLineSets: [
      {
        id: "gls-main",
        name: "主桁線セット",
        referenceMode: "pdf-row-master",
        appliesToSpanIds: ["span-1"],
        lines: GIRDER_LINES,
      },
    ],
    spans: [
      {
        id: "span-1",
        name: "PH12-PH15",
        startStation: 259.8142,
        endStation: 395.466,
        girderLineSetId: "gls-main",
      },
    ],
    sections: [createSampleSection(bridgeId)],
    alignmentMetadata: {
      plan: {
        elements: [
          {
            type: "straight",
            id: "plan-1",
            start: { x: -105476, y: -24333 },
            azimuth: 1.92,
            length: 100,
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
            startElevation: 17,
            grade: 0.01,
          },
        ],
      },
      crossSlope: {
        definitions: [{ id: "cs-1", station: 259.7133, crossSlope: 2.0 }],
      },
    },
  };
}

export function createSampleImporterProject(): JipLinerImporterProject {
  const project = createEmptyImporterProject("Hランプ4号橋 JIP-LINER PDF 入力");
  return {
    ...project,
    bridges: [createSampleBridge()],
  };
}
