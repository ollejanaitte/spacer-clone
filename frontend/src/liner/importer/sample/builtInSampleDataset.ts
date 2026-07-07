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
import { defaultFrameModelEnabled } from "../../core/frameModelTarget";
import {
  BUILT_IN_SAMPLE_BRIDGE_NAME,
  BUILT_IN_SAMPLE_PDF_FILENAME,
  BUILT_IN_SAMPLE_PROJECT_NAME,
  BUILT_IN_SAMPLE_TIMESTAMP,
} from "./builtInSampleConstants";

const ENTERED_AT = BUILT_IN_SAMPLE_TIMESTAMP;

/** HCL local alignment length from PDF 小座標 (PH15 cumulative distance). */
export const BUILT_IN_SAMPLE_ALIGNMENT_LENGTH = 164.2476;

/**
 * Built-in sample coordinate conventions (Phase 3.8 measuredGrid):
 * - C1–C17 and GE2 section point values currently include deterministic interpolations
 *   between PDF anchor sections; see `interpolated: true` entries pending full PDF transcription.
 * - x/y convention is provisional: HCL is the source-of-truth centerline (PDF localX/localY).
 *   Non-HCL girder lines use section localX for x and offset/cumulativeWidth for y where
 *   per-line PDF local x/y has not yet been transcribed (see createSectionPoint).
 * Future work: replace interpolated C1–C17/GE2 and provisional non-HCL x/y with exact PDF 小座標 table values.
 */

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
  /** When true, offsets and local coordinates are deterministic interpolations pending full PDF transcription (C1–C17, GE2). */
  interpolated?: boolean;
};

const BUILT_IN_SECTION_SPECS: BuiltInSectionSpec[] = [
  {
    id: "built-in-section-ph12",
    pdfPage: 44,
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
      offsets: {
        HL1: 7.5707,
        HL2: 7.1256,
        G1: 5.4833,
        HCL: 0,
        G2: -0.5473,
        HR2: -2.6352,
        HR1: -3.0803,
        CL: -4.8875,
        ECL: -11.9577,
      },
    },
  },
  {
    id: "built-in-section-ge1",
    pdfPage: 45,
    sectionNo: "横断面 2",
    title: "GE1",
    azimuthNotation: "109-58-27.6",
    stationLabel: "0+00.5897",
    point: {
      localX: 0.5897,
      localY: 0.0063,
      cumulativeDistance: 0.5897,
      designElevation: 17.655,
      crossSlope: 0,
      offsets: {
        HL1: 7.5707,
        HL2: 7.1257,
        G1: 5.4645,
        HCL: 0,
        G2: -0.5571,
        HR2: -2.6353,
        HR1: -3.0803,
        CL: -4.8842,
        ECL: -11.9412,
      },
    },
  },
  {
    id: "built-in-section-s1",
    pdfPage: 46,
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
    id: "built-in-section-c1",
    pdfPage: 48,
    sectionNo: "横断面 5",
    title: "C1",
    azimuthNotation: "109-58-20.0",
    stationLabel: "0+08.3121",
    point: {
      localX: 8.3121,
      localY: 0.1733,
      cumulativeDistance: 8.3121,
      designElevation: 17.59,
      crossSlope: 0,
      offsets: {
        HL1: 7.4263,
        HL2: 7.1257,
        G1: 4.8933,
        HCL: 0,
        G2: -0.8344,
        HR2: -2.6353,
        HR1: -3.0803,
        CL: -4.876,
        ECL: -11.5,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c2",
    pdfPage: 49,
    sectionNo: "横断面 6",
    title: "C2",
    azimuthNotation: "109-58-12.0",
    stationLabel: "0+16.2403",
    point: {
      localX: 16.2403,
      localY: 0.2782,
      cumulativeDistance: 16.2403,
      designElevation: 17.52,
      crossSlope: 0,
      offsets: {
        HL1: 6.6263,
        HL2: 6.2263,
        G1: 4.3872,
        HCL: 0,
        G2: -0.9,
        HR2: -2.6353,
        HR1: -3.0803,
        CL: -4.876,
        ECL: -11.0,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c3",
    pdfPage: 50,
    sectionNo: "横断面 7",
    title: "C3",
    azimuthNotation: "109-58-04.0",
    stationLabel: "0+24.1779",
    point: {
      localX: 24.1779,
      localY: 0.3192,
      cumulativeDistance: 24.1779,
      designElevation: 17.45,
      crossSlope: 0,
      offsets: {
        HL1: 5.8263,
        HL2: 5.4263,
        G1: 3.9458,
        HCL: 0,
        G2: -1.0,
        HR2: -2.6353,
        HR1: -3.0803,
        CL: -4.876,
        ECL: -10.5,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c4",
    pdfPage: 51,
    sectionNo: "横断面 8",
    title: "C4",
    azimuthNotation: "109-57-56.0",
    stationLabel: "0+32.1547",
    point: {
      localX: 32.1547,
      localY: 0.3065,
      cumulativeDistance: 32.1547,
      designElevation: 17.38,
      crossSlope: 0,
      offsets: {
        HL1: 5.0263,
        HL2: 4.6263,
        G1: 3.5593,
        HCL: 0,
        G2: -1.1,
        HR2: -2.6353,
        HR1: -3.0803,
        CL: -4.876,
        ECL: -10.0,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c5",
    pdfPage: 53,
    sectionNo: "横断面 9",
    title: "C5",
    azimuthNotation: "109-57-48.0",
    stationLabel: "0+40.1559",
    point: {
      localX: 40.1559,
      localY: 0.288,
      cumulativeDistance: 40.1559,
      designElevation: 17.31,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1259,
        G1: 3.1795,
        HCL: 0,
        G2: -1.2,
        HR2: -2.6356,
        HR1: -3.0807,
        CL: -3.8906,
        ECL: -9.0,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-ph13",
    pdfPage: 54,
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
    id: "built-in-section-c6",
    pdfPage: 56,
    sectionNo: "横断面 12",
    title: "C6",
    azimuthNotation: "91-04-28.0",
    stationLabel: "0+50.4373",
    point: {
      localX: 50.4373,
      localY: 0.2641,
      cumulativeDistance: 50.4373,
      designElevation: 16.95,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1259,
        G1: 2.945,
        HCL: 0,
        G2: -1.4553,
        HR2: -2.6356,
        HR1: -3.0807,
        CL: -3.8906,
        ECL: -8.5,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c7",
    pdfPage: 57,
    sectionNo: "横断面 13",
    title: "C7",
    azimuthNotation: "91-04-24.0",
    stationLabel: "0+59.8385",
    point: {
      localX: 59.8385,
      localY: 0.2423,
      cumulativeDistance: 59.8385,
      designElevation: 17.05,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1259,
        G1: 2.945,
        HCL: 0,
        G2: -1.4553,
        HR2: -2.6356,
        HR1: -3.0807,
        CL: -3.8906,
        ECL: -8.0,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c8",
    pdfPage: 58,
    sectionNo: "横断面 14",
    title: "C8",
    azimuthNotation: "91-04-20.0",
    stationLabel: "1+09.2395",
    point: {
      localX: 69.2395,
      localY: 0.2205,
      cumulativeDistance: 69.2395,
      designElevation: 17.15,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1259,
        G1: 2.945,
        HCL: 0,
        G2: -1.4553,
        HR2: -2.6356,
        HR1: -3.0807,
        CL: -3.8906,
        ECL: -7.5,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c9",
    pdfPage: 59,
    sectionNo: "横断面 15",
    title: "C9",
    azimuthNotation: "91-04-16.0",
    stationLabel: "1+18.6403",
    point: {
      localX: 78.6403,
      localY: 0.1986,
      cumulativeDistance: 78.6403,
      designElevation: 17.22,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1259,
        G1: 2.945,
        HCL: 0,
        G2: -1.4553,
        HR2: -2.6356,
        HR1: -3.0807,
        CL: -3.8906,
        ECL: -7.0,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c10",
    pdfPage: 60,
    sectionNo: "横断面 16",
    title: "C10",
    azimuthNotation: "91-04-12.0",
    stationLabel: "1+28.0410",
    point: {
      localX: 88.041,
      localY: 0.1768,
      cumulativeDistance: 88.041,
      designElevation: 17.26,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1259,
        G1: 2.945,
        HCL: 0,
        G2: -1.4553,
        HR2: -2.6356,
        HR1: -3.0807,
        CL: -3.8906,
        ECL: -6.8,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c11",
    pdfPage: 61,
    sectionNo: "横断面 17",
    title: "C11",
    azimuthNotation: "91-04-08.0",
    stationLabel: "1+37.4416",
    point: {
      localX: 97.4416,
      localY: 0.155,
      cumulativeDistance: 97.4416,
      designElevation: 17.28,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1259,
        G1: 2.945,
        HCL: 0,
        G2: -1.4553,
        HR2: -2.6356,
        HR1: -3.0807,
        CL: -3.8906,
        ECL: -6.6,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-ph14",
    pdfPage: 62,
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
    id: "built-in-section-c12",
    pdfPage: 63,
    sectionNo: "横断面 20",
    title: "C12",
    azimuthNotation: "90-10-32.0",
    stationLabel: "1+08.0220",
    point: {
      localX: 108.022,
      localY: 0.1305,
      cumulativeDistance: 108.022,
      designElevation: 17.35,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1251,
        G1: 2.945,
        HCL: 0,
        G2: -1.455,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.1804,
        ECL: -6.4,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c13",
    pdfPage: 64,
    sectionNo: "横断面 21",
    title: "C13",
    azimuthNotation: "90-10-28.0",
    stationLabel: "1+17.5223",
    point: {
      localX: 117.5223,
      localY: 0.1084,
      cumulativeDistance: 117.5223,
      designElevation: 17.45,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1251,
        G1: 2.945,
        HCL: 0,
        G2: -1.455,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.1804,
        ECL: -6.2,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c14",
    pdfPage: 65,
    sectionNo: "横断面 22",
    title: "C14",
    azimuthNotation: "90-10-24.0",
    stationLabel: "1+27.0224",
    point: {
      localX: 127.0224,
      localY: 0.0864,
      cumulativeDistance: 127.0224,
      designElevation: 17.55,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1251,
        G1: 2.945,
        HCL: 0,
        G2: -1.455,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.1804,
        ECL: -6.1,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c15",
    pdfPage: 66,
    sectionNo: "横断面 23",
    title: "C15",
    azimuthNotation: "90-10-20.0",
    stationLabel: "1+36.5224",
    point: {
      localX: 136.5224,
      localY: 0.0643,
      cumulativeDistance: 136.5224,
      designElevation: 17.65,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1251,
        G1: 2.945,
        HCL: 0,
        G2: -1.455,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.1804,
        ECL: -6.08,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c16",
    pdfPage: 69,
    sectionNo: "横断面 25",
    title: "C16",
    azimuthNotation: "90-10-16.0",
    stationLabel: "1+46.0224",
    point: {
      localX: 146.0224,
      localY: 0.0423,
      cumulativeDistance: 146.0224,
      designElevation: 17.72,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1251,
        G1: 2.945,
        HCL: 0,
        G2: -1.455,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.1804,
        ECL: -6.07,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-c17",
    pdfPage: 70,
    sectionNo: "横断面 26",
    title: "C17",
    azimuthNotation: "90-10-12.0",
    stationLabel: "1+55.5224",
    point: {
      localX: 155.5224,
      localY: 0.0202,
      cumulativeDistance: 155.5224,
      designElevation: 17.76,
      crossSlope: 0,
      offsets: {
        HL1: 4.57,
        HL2: 4.1251,
        G1: 2.945,
        HCL: 0,
        G2: -1.455,
        HR2: -2.635,
        HR1: -3.08,
        CL: -3.1804,
        ECL: -6.07,
      },
    },
    interpolated: true,
  },
  {
    id: "built-in-section-s2",
    pdfPage: 71,
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
    id: "built-in-section-ge2",
    pdfPage: 72,
    sectionNo: "横断面 29",
    title: "GE2",
    azimuthNotation: "112-17-26.0",
    stationLabel: "1+63.9996",
    point: {
      localX: 163.9894,
      localY: 0.0006,
      cumulativeDistance: 163.9996,
      designElevation: 17.784,
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
    interpolated: true,
  },
  {
    id: "built-in-section-ph15",
    pdfPage: 73,
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

// Phase 3.9: 骨組み生成対象フラグの既定値。
// HCL / CL / ECL は OFF、それ以外は ON。
export const BUILT_IN_FRAME_MODEL_ENABLED_BY_LABEL: Readonly<Record<string, boolean>> = {
  HL1: true,
  HL2: true,
  G1: true,
  HCL: false,
  G2: true,
  HR2: true,
  HR1: true,
  CL: false,
  ECL: false,
};

export function builtInFrameModelEnabled(label: string): boolean {
  if (Object.prototype.hasOwnProperty.call(BUILT_IN_FRAME_MODEL_ENABLED_BY_LABEL, label)) {
    return BUILT_IN_FRAME_MODEL_ENABLED_BY_LABEL[label]!;
  }
  return defaultFrameModelEnabled(label);
}

const GIRDER_LINE_SET: GirderLineSet = {
  id: "built-in-gls-main",
  name: "主桁線セット",
  referenceMode: "pdf-row-master",
  appliesToSpanIds: ["built-in-span-1"],
  lines: BUILT_IN_GIRDER_LINES,
};

/** Provisional x/y: HCL uses PDF localX/localY; other lines use localX for x and offset for y until per-line PDF x/y is transcribed. */
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
        "001_サンプル_LINER計算書_高架橋_入力結果_出力結果.PDF 小座標 3.2 より転記。PH12/PH13/PH14/PH15/S1/S2 は PDF 値。C1-C17/GE2 は決定論的補間（interpolated フラグ参照、将来課題: 正確な PDF 小座標表へ置換）。非 HCL 線の x/y は暫定（HCL=中心線真値、他線は localX + offset/cumulativeWidth）。",
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
