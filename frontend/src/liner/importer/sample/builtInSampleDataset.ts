import type {
  Angle,
  Bridge,
  GirderLineMaster,
  GirderLineSet,
  JipLinerImporterProject,
  NullableNumberValue,
  Point,
  Section,
  SourcePdfRef,
  SourceRef,
} from "../types";
import { evaluateProjectRenderability } from "../renderability";
import { createEmptyImporterProject } from "../factory";
import { IMPORTER_SCHEMA_VERSION } from "../version";
import {
  BUILT_IN_SAMPLE_BRIDGE_NAME,
  BUILT_IN_SAMPLE_PDF_FILENAME,
  BUILT_IN_SAMPLE_PROJECT_NAME,
  BUILT_IN_SAMPLE_TIMESTAMP,
} from "./builtInSampleConstants";

const ENTERED_AT = BUILT_IN_SAMPLE_TIMESTAMP;

function sourceRef(pdfPage: number, partial?: Partial<SourceRef>): SourceRef {
  return {
    pdfPage,
    row: partial?.row ?? null,
    col: partial?.col ?? null,
    field: partial?.field,
    enteredAt: ENTERED_AT,
    enteredBy: "built-in-sample",
  };
}

function numberValue(
  value: number,
  notation: string,
  pdfPage: number,
  unit: NullableNumberValue["unit"] = "m",
  row?: number,
  col?: number,
): NullableNumberValue {
  return {
    value,
    notation,
    unit,
    flags: {},
    sourceRef: sourceRef(pdfPage, { row, col }),
  };
}

function notComputedValue(
  notation: string,
  pdfPage: number,
  unit: NullableNumberValue["unit"] = "m",
): NullableNumberValue {
  return {
    value: null,
    notation,
    unit,
    flags: { notComputed: true },
    sourceRef: sourceRef(pdfPage),
  };
}

function angleValue(angle: Angle, pdfPage: number, row?: number, col?: number) {
  return {
    value: angle,
    flags: {},
    sourceRef: sourceRef(pdfPage, { row, col }),
  };
}

function parseDms(notation: string): Angle {
  const match = notation.match(/^(\d+)-(\d+)-([\d.]+)$/);
  if (!match) {
    throw new Error(`Invalid DMS notation: ${notation}`);
  }
  const deg = Number(match[1]);
  const min = Number(match[2]);
  const sec = Number(match[3]);
  const decimalDeg = deg + min / 60 + sec / 3600;
  return { deg, min, sec, decimalDeg, notation };
}

export const BUILT_IN_GIRDER_LINES: GirderLineMaster[] = [
  { id: "built-in-hl1", label: "HL1", role: "edge", displayOrder: 0 },
  { id: "built-in-hl2", label: "HL2", role: "edge", displayOrder: 1 },
  { id: "built-in-hl2p", label: "HL2'", role: "edge", displayOrder: 2 },
  { id: "built-in-g1", label: "G1", role: "girder", displayOrder: 3 },
  { id: "built-in-hcl", label: "HCL", role: "center", displayOrder: 4 },
  { id: "built-in-g2", label: "G2", role: "girder", displayOrder: 5 },
  { id: "built-in-hr2", label: "HR2", role: "girder", displayOrder: 6 },
  { id: "built-in-hr1", label: "HR1", role: "girder", displayOrder: 7 },
  { id: "built-in-cl", label: "CL", role: "custom", displayOrder: 8 },
  { id: "built-in-hr2p", label: "HR2'", role: "girder", displayOrder: 9 },
  { id: "built-in-hr1p", label: "HR1'", role: "girder", displayOrder: 10 },
  { id: "built-in-el1p", label: "EL1'", role: "custom", displayOrder: 11 },
  { id: "built-in-el1", label: "EL1", role: "custom", displayOrder: 12 },
  { id: "built-in-el2", label: "EL2", role: "custom", displayOrder: 13 },
  { id: "built-in-ecl", label: "ECL", role: "custom", displayOrder: 14 },
];

const GIRDER_LINE_SET: GirderLineSet = {
  id: "built-in-gls-main",
  name: "主桁線セット",
  referenceMode: "pdf-row-master",
  appliesToSpanIds: ["built-in-span-1"],
  lines: BUILT_IN_GIRDER_LINES,
};

function createPoint(
  line: GirderLineMaster,
  pdfPage: number,
  data: Partial<
    Pick<
      Point,
      | "x"
      | "y"
      | "designElevation"
      | "crossSlope"
      | "unitDistance"
      | "cumulativeDistance"
      | "unitWidth"
      | "cumulativeWidth"
      | "intersectionAngle"
      | "station"
    >
  > = {},
): Point {
  return {
    id: `built-in-point-${line.id}-p${pdfPage}`,
    girderLineId: line.id,
    lineLabel: line.label,
    x: data.x ?? notComputedValue("********", pdfPage),
    y: data.y ?? notComputedValue("********", pdfPage),
    designElevation: data.designElevation ?? notComputedValue("********", pdfPage),
    crossSlope: data.crossSlope ?? notComputedValue("********", pdfPage, "%"),
    unitDistance: data.unitDistance ?? notComputedValue("*********", pdfPage),
    cumulativeDistance: data.cumulativeDistance ?? notComputedValue("*********", pdfPage),
    unitWidth: data.unitWidth ?? notComputedValue("********", pdfPage),
    cumulativeWidth: data.cumulativeWidth ?? notComputedValue("********", pdfPage),
    intersectionAngle: data.intersectionAngle ?? {
      value: null,
      flags: {},
      sourceRef: sourceRef(pdfPage),
    },
    station: data.station ?? {
      value: null,
      label: null,
      notation: null,
      flags: {},
      sourceRef: sourceRef(pdfPage),
    },
    flags: {},
    sourceRef: sourceRef(pdfPage, { row: line.displayOrder + 1 }),
  };
}

function lineByLabel(label: string): GirderLineMaster {
  const line = BUILT_IN_GIRDER_LINES.find((entry) => entry.label === label);
  if (!line) {
    throw new Error(`Unknown girder line label: ${label}`);
  }
  return line;
}

/** 横断面 1 : PH12(PE10) — values from 001 sample PDF §3.1 大座標. */
function createSectionPh12(bridgeId: string): Section {
  const pdfPage = 21;
  const points: Point[] = [
    createPoint(lineByLabel("HL1"), pdfPage, {
      x: numberValue(-105476.6593, "-105476.6593", pdfPage, "m", 1, 2),
      y: numberValue(-24333.779, "-24333.7790", pdfPage, "m", 1, 3),
      designElevation: numberValue(17.8144, "17.8144", pdfPage, "m", 1, 4),
      crossSlope: numberValue(2.0, "2.0000", pdfPage, "%", 1, 5),
      unitWidth: numberValue(0.445, "0.4450", pdfPage, "m", 2, 8),
      cumulativeWidth: numberValue(7.5707, "7.5707", pdfPage, "m", 1, 9),
      intersectionAngle: angleValue(parseDms("90-45-49"), pdfPage, 1, 10),
      station: {
        value: 259.8142,
        label: "12+19.8142",
        notation: "12+19.8142",
        flags: {},
        sourceRef: sourceRef(pdfPage, { row: 1, col: 11 }),
      },
    }),
    createPoint(lineByLabel("HCL"), pdfPage, {
      x: numberValue(-105474.0732, "-105474.0732", pdfPage, "m", 5, 2),
      y: numberValue(-24340.8943, "-24340.8943", pdfPage, "m", 5, 3),
      designElevation: numberValue(17.6595, "17.6595", pdfPage, "m", 5, 4),
      crossSlope: numberValue(0.0, "0.0000", pdfPage, "%", 5, 5),
      unitWidth: numberValue(0.5473, "0.5473", pdfPage, "m", 6, 8),
      cumulativeWidth: numberValue(0.0, "0.0000", pdfPage, "m", 5, 9),
      intersectionAngle: angleValue(parseDms("90-46-10"), pdfPage, 5, 10),
      station: {
        value: 259.7133,
        label: "12+19.7133",
        notation: "12+19.7133",
        flags: {},
        sourceRef: sourceRef(pdfPage, { row: 5, col: 11 }),
      },
    }),
    createPoint(lineByLabel("CL"), pdfPage, {
      x: numberValue(-105472.4036, "-105472.4036", pdfPage, "m", 9, 2),
      y: numberValue(-24345.4878, "-24345.4878", pdfPage, "m", 9, 3),
      designElevation: notComputedValue("*********", pdfPage, "m"),
      crossSlope: notComputedValue("********", pdfPage, "%"),
      unitWidth: numberValue(3.6805, "3.6805", pdfPage, "m", 10, 8),
      cumulativeWidth: numberValue(-4.8875, "-4.8875", pdfPage, "m", 9, 9),
      intersectionAngle: angleValue(parseDms("90-00-00"), pdfPage, 9, 10),
      station: {
        value: 926.9277,
        label: "46+06.9277",
        notation: "46+06.9277",
        flags: {},
        sourceRef: sourceRef(pdfPage, { row: 9, col: 11 }),
      },
    }),
    createPoint(lineByLabel("G1"), pdfPage, {
      x: numberValue(-105475.9463, "-105475.9463", pdfPage),
      y: numberValue(-24349.1587, "-24349.1587", pdfPage),
      designElevation: numberValue(17.6483, "17.6483", pdfPage),
      crossSlope: numberValue(-2.0, "-2.0000", pdfPage, "%"),
      unitWidth: numberValue(0.4456, "0.4456", pdfPage),
      cumulativeWidth: numberValue(-8.8835, "-8.8835", pdfPage),
    }),
    createPoint(lineByLabel("G2"), pdfPage, {
      x: numberValue(-105473.173, "-105473.1730", pdfPage),
      y: numberValue(-24348.9469, "-24348.9469", pdfPage),
      designElevation: numberValue(17.7717, "17.7717", pdfPage),
      crossSlope: numberValue(2.0, "2.0000", pdfPage, "%"),
      unitWidth: numberValue(2.088, "2.0880", pdfPage),
      cumulativeWidth: numberValue(-0.5473, "-0.5473", pdfPage),
    }),
  ];

  for (const line of BUILT_IN_GIRDER_LINES) {
    if (!points.some((point) => point.girderLineId === line.id)) {
      points.push(createPoint(line, pdfPage));
    }
  }

  points.sort(
    (left, right) =>
      (BUILT_IN_GIRDER_LINES.find((line) => line.id === left.girderLineId)?.displayOrder ?? 0) -
      (BUILT_IN_GIRDER_LINES.find((line) => line.id === right.girderLineId)?.displayOrder ?? 0),
  );

  return {
    id: "built-in-section-ph12",
    bridgeId,
    spanId: "built-in-span-1",
    pdfPage,
    sectionNo: "横断面 1",
    title: "PH12(PE10)",
    azimuth: angleValue(parseDms("109-58-28.3"), pdfPage, 1, 1),
    stationingRef: {
      stationLabel: "12+19.7133",
      stationValue: 259.7133,
      cumulativeDistance: null,
      notation: "12+19.7133",
      sourceRef: sourceRef(pdfPage),
    },
    points,
    sourceRef: sourceRef(pdfPage),
  };
}

function createSectionFromTemplate(
  bridgeId: string,
  template: Section,
  config: {
    id: string;
    pdfPage: number;
    sectionNo: string;
    title: string;
    stationLabel: string;
    stationValue: number;
    azimuthNotation: string;
  },
): Section {
  const azimuth = parseDms(config.azimuthNotation);
  return {
    ...template,
    id: config.id,
    bridgeId,
    pdfPage: config.pdfPage,
    sectionNo: config.sectionNo,
    title: config.title,
    azimuth: angleValue(azimuth, config.pdfPage, 1, 1),
    stationingRef: {
      stationLabel: config.stationLabel,
      stationValue: config.stationValue,
      cumulativeDistance: null,
      notation: config.stationLabel,
      sourceRef: sourceRef(config.pdfPage),
    },
    points: template.points.map((point) => ({
      ...point,
      id: `${point.id}-p${config.pdfPage}`,
      x: { ...point.x, sourceRef: sourceRef(config.pdfPage) },
      y: { ...point.y, sourceRef: sourceRef(config.pdfPage) },
      designElevation: {
        ...point.designElevation,
        sourceRef: sourceRef(config.pdfPage),
      },
      crossSlope: { ...point.crossSlope, sourceRef: sourceRef(config.pdfPage) },
      unitDistance: { ...point.unitDistance, sourceRef: sourceRef(config.pdfPage) },
      cumulativeDistance: {
        ...point.cumulativeDistance,
        sourceRef: sourceRef(config.pdfPage),
      },
      unitWidth: { ...point.unitWidth, sourceRef: sourceRef(config.pdfPage) },
      cumulativeWidth: {
        ...point.cumulativeWidth,
        sourceRef: sourceRef(config.pdfPage),
      },
      intersectionAngle: point.intersectionAngle
        ? { ...point.intersectionAngle, sourceRef: sourceRef(config.pdfPage) }
        : { value: null, flags: {}, sourceRef: sourceRef(config.pdfPage) },
      station: point.station
        ? { ...point.station, sourceRef: sourceRef(config.pdfPage) }
        : {
            value: null,
            label: null,
            notation: null,
            flags: {},
            sourceRef: sourceRef(config.pdfPage),
          },
      sourceRef: sourceRef(config.pdfPage, { row: point.sourceRef.row ?? null }),
    })),
    sourceRef: sourceRef(config.pdfPage),
  };
}

function createBuiltInBridge(bridgeId: string): Bridge {
  const sectionPh12 = createSectionPh12(bridgeId);
  return {
    id: bridgeId,
    name: BUILT_IN_SAMPLE_BRIDGE_NAME,
    routeName: "Hランプ",
    bridgeType: "continuous",
    girderLineSets: [GIRDER_LINE_SET],
    spans: [
      {
        id: "built-in-span-1",
        name: "PH12-PH15",
        startStation: 259.8142,
        endStation: 395.466,
        girderLineSetId: GIRDER_LINE_SET.id,
      },
    ],
    sections: [
      sectionPh12,
      createSectionFromTemplate(bridgeId, sectionPh12, {
        id: "built-in-section-ph13",
        pdfPage: 22,
        sectionNo: "横断面 2",
        title: "PH13(PE11)",
        stationLabel: "12+29.5000",
        stationValue: 269.5,
        azimuthNotation: "109-58-20.0",
      }),
      createSectionFromTemplate(bridgeId, sectionPh12, {
        id: "built-in-section-ph14",
        pdfPage: 23,
        sectionNo: "横断面 3",
        title: "PH14(PE12)",
        stationLabel: "12+39.5000",
        stationValue: 279.5,
        azimuthNotation: "109-58-10.0",
      }),
      createSectionFromTemplate(bridgeId, sectionPh12, {
        id: "built-in-section-ph15",
        pdfPage: 24,
        sectionNo: "横断面 4",
        title: "PH15(PE13)",
        stationLabel: "12+49.5000",
        stationValue: 289.5,
        azimuthNotation: "109-58-00.0",
      }),
    ],
    alignmentMetadata: {
      plan: {
        elements: [
          {
            type: "straight",
            id: "built-in-plan-1",
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
            id: "built-in-profile-1",
            startStation: 250,
            endStation: 300,
            startElevation: 17.6,
            grade: 0.01,
          },
        ],
      },
      crossSlope: {
        definitions: [{ id: "built-in-cs-1", station: 259.7133, crossSlope: 2.0 }],
      },
      notes: "001_サンプル_LINER計算書_高架橋_入力結果_出力結果.PDF より転記",
    },
  };
}

function createSourcePdfRef(): SourcePdfRef {
  return {
    id: "built-in-pdf-ref-001",
    fileName: BUILT_IN_SAMPLE_PDF_FILENAME,
    sha256: null,
    totalPages: 52,
    lastReferencedAt: ENTERED_AT,
    notes: "リポジトリ同梱の JIP-LINER サンプル計算書",
  };
}

/** Returns an unsaved built-in sample project payload. */
export function buildBuiltInSampleProject(): JipLinerImporterProject {
  const bridgeId = "built-in-bridge-h-ramp-4";
  const project: JipLinerImporterProject = {
    ...createEmptyImporterProject(BUILT_IN_SAMPLE_PROJECT_NAME),
    id: "built-in-importer-project",
    createdAt: ENTERED_AT,
    updatedAt: ENTERED_AT,
    liner: { importerSchemaVersion: IMPORTER_SCHEMA_VERSION },
    sourcePdfRefs: [createSourcePdfRef()],
    savedSnapshots: [
      {
        id: "built-in-snapshot-001",
        name: "横断面1まで入力",
        savedAt: ENTERED_AT,
        lastEditedStep: "sectionEdit",
        lastEditedRef: {
          bridgeId,
          sectionId: "built-in-section-ph12",
        },
        isDraftSave: false,
        notes: "001 サンプル PDF の横断面1を転記済み",
      },
    ],
    bridges: [createBuiltInBridge(bridgeId)],
  };

  project.renderability = evaluateProjectRenderability(project);
  return project;
}
