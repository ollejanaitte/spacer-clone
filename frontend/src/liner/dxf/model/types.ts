import type { Point2 } from "../../drawing/model/geometry";
import type { DxfDiagnostic } from "./diagnostics";
import type { DxfPrecisionPolicy } from "./precision";
import type { DxfUnits } from "./units";

export const SUPPORTED_ACAD_VERSIONS = ["AC1015", "AC1021", "AC1024", "AC1027"] as const;
export type DxfAcadVersion = (typeof SUPPORTED_ACAD_VERSIONS)[number];

export const SUPPORTED_DWG_CODEPAGES = [
  "ANSI_1252",
  "ANSI_932",
  "UTF-8",
  "UTF-8-BOM",
] as const;
export type DxfDwgCodepage = (typeof SUPPORTED_DWG_CODEPAGES)[number];

export type DxfHeader = {
  acadVer: DxfAcadVersion;
  dwgCodepage: DxfDwgCodepage;
  units: DxfUnits;
  measurement: 0 | 1;
};

export type DxfLayer = {
  name: string;
  color: number;
  lineType: string;
  /** DXF lineweight in 100ths of mm (group 370). Optional. */
  lineweight?: number;
  frozen: boolean;
  visible: boolean;
};

export type DxfLinetype = {
  name: string;
  description: string;
  patternLength: number;
  elements: readonly number[];
};

export type DxfTextStyle = {
  name: string;
  fontFile: string;
  height: number;
};

export type DxfLineEntity = {
  kind: "line";
  layer: string;
  lineType?: string;
  start: Point2;
  end: Point2;
};

export type DxfLwPolylineEntity = {
  kind: "lwpolyline";
  layer: string;
  lineType?: string;
  vertices: readonly Point2[];
  closed?: boolean;
};

export type DxfArcEntity = {
  kind: "arc";
  layer: string;
  lineType?: string;
  center: Point2;
  radius: number;
  startAngleDeg: number;
  endAngleDeg: number;
};

export type DxfCircleEntity = {
  kind: "circle";
  layer: string;
  lineType?: string;
  center: Point2;
  radius: number;
};

export type DxfTextEntity = {
  kind: "text";
  layer: string;
  position: Point2;
  text: string;
  height: number;
  rotationDeg?: number;
  halign?: number;
  valign?: number;
};

/** Extension point for future MTEXT support; not serialized in Step3 PR1. */
export type DxfMTextEntity = {
  kind: "mtext";
  layer: string;
  position: Point2;
  text: string;
  height: number;
  rotationDeg?: number;
};

export type DxfEntity =
  | DxfLineEntity
  | DxfLwPolylineEntity
  | DxfArcEntity
  | DxfCircleEntity
  | DxfTextEntity
  | DxfMTextEntity;

export type DxfTables = {
  layers: readonly DxfLayer[];
  linetypes: readonly DxfLinetype[];
  textStyles: readonly DxfTextStyle[];
};

export type DxfDocument = {
  header: DxfHeader;
  tables: DxfTables;
  entities: readonly DxfEntity[];
  diagnostics: readonly DxfDiagnostic[];
};

export type DxfDocumentOptions = {
  precision?: Partial<DxfPrecisionPolicy>;
  header?: Partial<DxfHeader>;
};
