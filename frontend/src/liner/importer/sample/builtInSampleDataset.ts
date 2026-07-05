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

/** HCL local alignment length from PDF 小座標 (PH15 cumulative distance). */
export const BUILT_IN_SAMPLE_ALIGNMENT_LENGTH = 164.2476;

type LineLabel =
  | "HL1"
  | "HL2"
  | "G1"
  | "HCL"
  | "G2"
  | "HR2"
  | "HR1"
  | "CL"
  | "ECL";

type SectionPointSpec = {
  localX: number;
  localY: number;
  cumulativeDistance: number;
  designElevation: number;
  crossSlope: number;
  offsets: Record<LineLabel, number>;
};

type BuiltInSectionSpec = {
  id: string;
  pdfPage: number;
  sectionNo: string;
  title: string;
  azimuthNotation: string;
  stationLabel: string;
  point: SectionPointSpec;
  /** When true, offsets are interpolated placeholders (see project notes). */
  interpolated?: boolean;
};

const PH12_OFFSETS: Record<LineLabel, number> = {
  HL1: 7.5707,
  HL2: 7.1256,
  G1: 5.4833,
  HCL: 0,
  G2: -0.5473,
  HR2: -2.6352,
  HR1: -3.0803,
  CL: -4.8875,
  ECL: -11.9577,
};

const BUILT_IN_SECTION_SPECS: BuiltInSectionSpec[] = [
  {
    id: "built-in-section-ph12",
    pdfPage: 21,
    sectionNo: "横断面 1",
    title: "PH12(PE10)",
    azimuthNotation: "109-58-28.3",
    stationLabel: "0+00.0000",
    point: {
      localX: 0,
      localY: 0,
      cumulativeDistance: 0,
      designElevation: 17.6595,
      crossSlope: 0,
      offsets: PH12_OFFSETS,
    },
  },
  {
    id: "built-in-section-s1",
    pdfPage: 22,
    sectionNo: "横断面 3",
    title: "S1",
    azimuthNotation: "109-58-27.0",
    stationLabel: "0+00.6399",
    point: {
      localX: 0.6399,
      localY: 0.0211,
      cumulativeDistance: 0.6399,
      designElevation: 17.6304,
      crossSlope: 0,
      offsets: {
        HL1: 7.5708,
        HL2: 7.1257,
        G1: 5.4197,
        HCL: 0,
        G2: -0.5803,
        HR2: -2.6353,
        HR1: -3.0803,
        CL: -4.876,
        ECL: -11.9017,
      },
    },
  },
  {
    id: "built-in-section-ph13",
    pdfPage: 23,
    sectionNo: "横断面 11",
    title: "PH13(PE11)",
    azimuthNotation: "91-04-32.7",
    stationLabel: "0+45.1726",
    point: {
      localX: 45.1698,
      localY: 0.2763,
      cumulativeDistance: 45.1726,
      designElevation: 16.8476,
      crossSlope: 0,
      offsets: {
        HL1: 4.571,
        HL2: 4.1259,
        G1: 2.9457,
        HCL: 0,
        G2: -1.4553,
        HR2: -2.6356,
        HR1: -3.0807,
        CL: -3.8906,
        ECL: -8.8562,
      },
    },
  },
  {
    id: "built-in-section-ph14",
    pdfPage: 24,
    sectionNo: "横断面 19",
    title: "PH14(PE12)",
    azimuthNotation: "90-10-35.6",
    stationLabel: "1+02.7325",
    point: {
      localX: 102.7296,
      localY: 0.1428,
      cumulativeDistance: 102.7325,
      designElevation: 17.2926,
      crossSlope: 0,
      offsets: {
        HL1: 4.5701,
        HL2: 4.1251,
        G1: 2.945,
        HCL: 0,
        G2: -1.455,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.1804,
        ECL: -6.5166,
      },
    },
  },
  {
    id: "built-in-section-s2",
    pdfPage: 25,
    sectionNo: "横断面 28",
    title: "S2",
    azimuthNotation: "89-54-08.3",
    stationLabel: "1+63.3996",
    point: {
      localX: 163.3996,
      localY: 0.002,
      cumulativeDistance: 163.3996,
      designElevation: 17.7791,
      crossSlope: 0,
      offsets: {
        HL1: 4.572,
        HL2: 4.127,
        G1: 2.947,
        HCL: 0,
        G2: -1.453,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.0571,
        ECL: -6.0738,
      },
    },
  },
  {
    id: "built-in-section-ph15",
    pdfPage: 26,
    sectionNo: "横断面 30",
    title: "PH15(PE13)",
    azimuthNotation: "112-17-26.2",
    stationLabel: "1+64.2476",
    point: {
      localX: 164.2446,
      localY: 0,
      cumulativeDistance: 164.2476,
      designElevation: 17.7878,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.125,
        G1: 2.945,
        HCL: 0,
        G2: -1.455,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.0566,
        ECL: -6.0718,
      },
    },
  },
];

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
  { id: "built-in-hl1", label: "HL1", role: "edge", displayOrder: 0, nominalOffset: 7.5707 },
  { id: "built-in-hl2", label: "HL2", role: "edge", displayOrder: 1, nominalOffset: 7.1256 },
  { id: "built-in-g1", label: "G1", role: "girder", displayOrder: 2, nominalOffset: 5.4833 },
  { id: "built-in-hcl", label: "HCL", role: "center", displayOrder: 3, nominalOffset: 0 },
  { id: "built-in-g2", label: "G2", role: "girder", displayOrder: 4, nominalOffset: -0.5473 },
  { id: "built-in-hr2", label: "HR2", role: "girder", displayOrder: 5, nominalOffset: -2.6352 },
  { id: "built-in-hr1", label: "HR1", role: "girder", displayOrder: 6, nominalOffset: -3.0803 },
  { id: "built-in-cl", label: "CL", role: "custom", displayOrder: 7, nominalOffset: -4.8875 },
  { id: "built-in-ecl", label: "ECL", role: "custom", displayOrder: 8, nominalOffset: -11.9577 },
];

const GIRDER_LINE_SET: GirderLineSet = {
  id: "built-in-gls-main",
  name: "主桁線セット",
  referenceMode: "pdf-row-master",
  appliesToSpanIds: ["built-in-span-1"],
  lines: BUILT_IN_GIRDER_LINES,
};

function createSectionPoint(
  line: GirderLineMaster,
  spec: BuiltInSectionSpec,
  offset: number,
  unitDistance: number,
): Point {
  const { pdfPage, point } = spec;
  const isCenter = line.label === "HCL";
  return {
    id: `${spec.id}-${line.id}`,
    girderLineId: line.id,
    lineLabel: line.label,
    x: numberValue(point.localX, point.localX.toFixed(4), pdfPage),
    y: numberValue(isCenter ? point.localY : offset, (isCenter ? point.localY : offset).toFixed(4), pdfPage),
    designElevation: numberValue(point.designElevation, point.designElevation.toFixed(4), pdfPage),
    crossSlope: numberValue(
      isCenter ? point.crossSlope : point.crossSlope,
      (isCenter ? point.crossSlope : point.crossSlope).toFixed(4),
      pdfPage,
      "%",
    ),
    unitDistance: numberValue(unitDistance, unitDistance.toFixed(4), pdfPage),
    cumulativeDistance: numberValue(
      point.cumulativeDistance,
      point.cumulativeDistance.toFixed(4),
      pdfPage,
    ),
    unitWidth: numberValue(0, "0.0000", pdfPage),
    cumulativeWidth: numberValue(isCenter ? 0 : offset, (isCenter ? 0 : offset).toFixed(4), pdfPage),
    intersectionAngle: {
      value: null,
      flags: {},
      sourceRef: sourceRef(pdfPage),
    },
    station: {
      value: point.cumulativeDistance,
      label: spec.stationLabel,
      notation: spec.stationLabel,
      flags: {},
      sourceRef: sourceRef(pdfPage),
    },
    flags: {},
    sourceRef: sourceRef(pdfPage, { row: line.displayOrder + 1 }),
  };
}

function createSectionFromSpec(
  bridgeId: string,
  spec: BuiltInSectionSpec,
  unitDistance: number,
): Section {
  const azimuth = parseDms(spec.azimuthNotation);
  const points = BUILT_IN_GIRDER_LINES.map((line) =>
    createSectionPoint(line, spec, spec.point.offsets[line.label as LineLabel], unitDistance),
  );

  return {
    id: spec.id,
    bridgeId,
    spanId: "built-in-span-1",
    pdfPage: spec.pdfPage,
    sectionNo: spec.sectionNo,
    title: spec.title,
    azimuth: angleValue(azimuth, spec.pdfPage, 1, 1),
    stationingRef: {
      stationLabel: spec.stationLabel,
      stationValue: spec.point.cumulativeDistance,
      cumulativeDistance: spec.point.cumulativeDistance,
      notation: spec.stationLabel,
      sourceRef: sourceRef(spec.pdfPage),
    },
    points,
    sourceRef: sourceRef(spec.pdfPage),
  };
}

function createBuiltInBridge(bridgeId: string): Bridge {
  const startElevation = BUILT_IN_SECTION_SPECS[0]!.point.designElevation;
  const endElevation = BUILT_IN_SECTION_SPECS[BUILT_IN_SECTION_SPECS.length - 1]!.point.designElevation;
  const profileGrade =
    (endElevation - startElevation) / BUILT_IN_SAMPLE_ALIGNMENT_LENGTH;

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
        startStation: 0,
        endStation: BUILT_IN_SAMPLE_ALIGNMENT_LENGTH,
        girderLineSetId: GIRDER_LINE_SET.id,
      },
    ],
    sections: BUILT_IN_SECTION_SPECS.map((spec, index) => {
      const unitDistance =
        index === 0
          ? 0
          : spec.point.cumulativeDistance -
            BUILT_IN_SECTION_SPECS[index - 1]!.point.cumulativeDistance;
      return createSectionFromSpec(bridgeId, spec, unitDistance);
    }),
    alignmentMetadata: {
      plan: {
        elements: [
          {
            type: "straight",
            id: "built-in-plan-hcl",
            start: { x: 0, y: 0 },
            azimuth: 0,
            length: BUILT_IN_SAMPLE_ALIGNMENT_LENGTH,
          },
        ],
      },
      profile: {
        elements: [
          {
            type: "grade",
            id: "built-in-profile-hcl",
            startStation: 0,
            endStation: BUILT_IN_SAMPLE_ALIGNMENT_LENGTH,
            startElevation,
            grade: profileGrade,
          },
        ],
      },
      crossSlope: {
        definitions: [{ id: "built-in-cs-ph12", station: 0, crossSlope: 2.0 }],
      },
      notes:
        "001_サンプル_LINER計算書_高架橋_入力結果_出力結果.PDF 小座標表より転記。PH12(PE10) HCL を原点 (0,0)。S1/S2 は PDF 小座標値。GE/C 断面は未収録。",
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
        name: "PH12-PH15 小座標",
        savedAt: ENTERED_AT,
        lastEditedStep: "sectionEdit",
        lastEditedRef: {
          bridgeId,
          sectionId: "built-in-section-ph12",
        },
        isDraftSave: false,
        notes: "001 サンプル PDF 小座標 (PH12/S1/PH13/PH14/S2/PH15) を転記済み",
      },
    ],
    bridges: [createBuiltInBridge(bridgeId)],
  };

  project.renderability = evaluateProjectRenderability(project);
  return project;
}
