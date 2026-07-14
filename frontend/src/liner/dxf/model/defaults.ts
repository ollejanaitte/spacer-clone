import type { DxfHeader } from "./types";
import { DEFAULT_DXF_UNITS, dxfMeasurementForUnits } from "./units";

export const DEFAULT_DXF_HEADER: DxfHeader = {
  acadVer: "AC1021",
  dwgCodepage: "UTF-8",
  units: DEFAULT_DXF_UNITS,
  measurement: dxfMeasurementForUnits(DEFAULT_DXF_UNITS),
};

export const DEFAULT_DXF_LAYER_0 = {
  name: "0",
  color: 7,
  lineType: "CONTINUOUS",
  frozen: false,
  visible: true,
} as const;

export const DEFAULT_DXF_LINETYPE_CONTINUOUS = {
  name: "CONTINUOUS",
  description: "Solid line",
  patternLength: 0,
  elements: [],
} as const;

export const DEFAULT_DXF_TEXT_STYLE = {
  name: "STANDARD",
  fontFile: "txt",
  height: 0,
} as const;
