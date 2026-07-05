export const IMPORTER_SCHEMA_VERSION_LITERAL = "0.1.0" as const;

export type ImporterSchemaVersion = typeof IMPORTER_SCHEMA_VERSION_LITERAL;

export type LastEditedStep =
  | "top"
  | "bridge"
  | "lineMaster"
  | "sectionList"
  | "sectionEdit"
  | "spanPier"
  | "export";

export interface JipLinerImporterProject {
  liner: {
    importerSchemaVersion: ImporterSchemaVersion;
  };
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  coordinateSystem: CoordinateSystem;
  sourcePdfRefs?: SourcePdfRef[];
  savedSnapshots?: SavedSnapshotMeta[];
  renderability?: Renderability;
  bridges: Bridge[];
}

export interface SavedSnapshotMeta {
  id: string;
  name: string;
  savedAt: string;
  lastEditedStep: LastEditedStep;
  lastEditedRef?: {
    bridgeId?: string;
    sectionId?: string;
  };
  isDraftSave: boolean;
  notes?: string;
}

export interface CoordinateSystem {
  horizontal: {
    datum: string;
    epoch?: string | null;
    zone?: number | null;
    unit: "m";
    notes?: string;
  };
  vertical: {
    heightDatum: string;
    geoidModel?: string | null;
    unit: "m";
    notes?: string;
  };
}

export type BridgeType =
  | "simple"
  | "continuous"
  | "integrated"
  | "separated"
  | "custom";

export interface BridgeValidationProfile {
  /** When true, cumulativeWidth symmetry is checked against HCL/CL. Defaults to false. */
  expectSymmetry?: boolean;
}

export interface Bridge {
  id: string;
  name: string;
  routeName?: string;
  bridgeType?: BridgeType;
  validationProfile?: BridgeValidationProfile;
  girderLineSets: GirderLineSet[];
  spans: Span[];
  sections: Section[];
  renderability?: Renderability;
  alignmentMetadata?: AlignmentMetadata;
  /** Phase 3.7: optional. Phase 3.9: required. */
  substructure?: BridgeSubstructure;
}

export type SubstructureKind = "abutment" | "pier" | "virtual_pier";

export interface SupportPoint {
  id: string;
  kind: SubstructureKind;
  /** bridge-wide station. */
  station: number;
  skewAngleDeg?: number | null;
  label?: string;
}

export interface CrossBeam {
  id: string;
  /** bridge-wide station. */
  station: number;
  label?: string;
}

export interface WidthPoint {
  id: string;
  /** bridge-wide station. */
  station: number;
  leftOffset: number;
  rightOffset: number;
}

export interface BridgeSubstructure {
  supports: SupportPoint[];
  crossBeams: CrossBeam[];
  widthChangePoints: WidthPoint[];
}

export interface Span {
  id: string;
  name: string;
  startStation?: number | null;
  endStation?: number | null;
  girderLineSetId?: string | null;
  sourceRef?: SourceRef;
}

export type GirderLineReferenceMode =
  | "centerline-offset"
  | "absolute-coordinate"
  | "pdf-row-master";

export interface GirderLineSet {
  id: string;
  name: string;
  referenceMode: GirderLineReferenceMode;
  appliesToSpanIds: string[];
  lines: GirderLineMaster[];
}

export type GirderLineRole =
  | "center"
  | "girder"
  | "edge"
  | "barrier"
  | "custom";

export interface GirderLineMaster {
  id: string;
  label: string;
  role?: GirderLineRole;
  displayOrder: number;
  nominalOffset?: number | null;
}

export interface SourcePdfRef {
  id: string;
  fileName: string;
  sha256?: string | null;
  totalPages?: number | null;
  lastReferencedAt?: string | null;
  notes?: string;
}

export type RenderabilityStatus = "ok" | "partial" | "blocked";

export type RenderabilityTarget = "crossSection" | "planPreview" | "export";

export type MissingFieldSeverity = "blocking" | "degrading";

export interface Renderability {
  crossSection: RenderabilityStatus;
  planPreview: RenderabilityStatus;
  export: RenderabilityStatus;
  missingFields: MissingFieldRef[];
  calculatedAt: string;
}

export interface MissingFieldRef {
  targetPath: string;
  label: string;
  requiredFor: RenderabilityTarget;
  severity: MissingFieldSeverity;
  sourceRef?: SourceRef;
}

export interface Section {
  id: string;
  bridgeId: string;
  spanId: string | null;
  pdfPage: number;
  sectionNo?: string;
  title?: string;
  azimuth: AngleValue;
  stationingRef: StationingRef;
  points: Point[];
  renderability?: Renderability;
  diagnostics?: DiagnosticSummary;
  sourceRef: SourceRef;
}

export interface StationingRef {
  stationLabel?: string | null;
  stationValue?: number | null;
  cumulativeDistance?: number | null;
  notation?: string | null;
  sourceRef?: SourceRef;
}

export interface Point {
  id: string;
  girderLineId: string;
  lineLabel: string;
  x: NullableNumberValue;
  y: NullableNumberValue;
  designElevation: NullableNumberValue;
  crossSlope: NullableNumberValue;
  unitDistance: NullableNumberValue;
  cumulativeDistance: NullableNumberValue;
  unitWidth: NullableNumberValue;
  cumulativeWidth: NullableNumberValue;
  intersectionAngle?: NullableAngleValue;
  station?: NullableStationValue;
  flags: Flags;
  sourceRef: SourceRef;
}

export interface Angle {
  deg: number;
  min: number;
  sec: number;
  decimalDeg: number;
  notation: string;
}

export interface AngleValue {
  value: Angle | null;
  flags: Flags;
  sourceRef: SourceRef;
}

export type NullableAngleValue = AngleValue;

export type NullableNumberUnit = "m" | "%" | "deg";

export interface NullableNumberValue {
  value: number | null;
  notation?: string | null;
  unit?: NullableNumberUnit;
  flags: Flags;
  sourceRef: SourceRef;
}

export interface NullableStationValue {
  value: number | null;
  label?: string | null;
  notation?: string | null;
  flags: Flags;
  sourceRef: SourceRef;
}

export interface Flags {
  notComputed?: boolean;
  notApplicable?: boolean;
  outOfRange?: boolean;
}

export interface SourceRef {
  pdfPage: number;
  row?: number | null;
  col?: number | null;
  field?: string;
  enteredAt: string;
  enteredBy?: string | null;
}

export interface HorizontalAlignmentDraftLike {
  elements: Array<
    | {
        type: "straight";
        id: string;
        start: { x: number; y: number };
        azimuth: number;
        length: number;
      }
    | {
        type: "arc";
        id: string;
        start: { x: number; y: number };
        azimuth: number;
        radius: number;
        turn: "left" | "right";
        length: number;
      }
    | {
        type: "clothoid";
        id: string;
        start: { x: number; y: number };
        azimuth: number;
        clothoidParameter: number;
        startRadius?: number | null;
        endRadius?: number | null;
        turn: "left" | "right";
        length: number;
      }
  >;
}

export interface VerticalAlignmentDraftLike {
  elements: Array<
    | {
        type: "grade";
        id: string;
        startStation: number;
        endStation: number;
        startElevation: number;
        grade: number;
      }
    | {
        type: "parabolic";
        id: string;
        startStation: number;
        endStation: number;
        startGrade: number;
        endGrade: number;
        length: number;
        startElevation?: number;
        curveType?: "crest" | "sag";
      }
  >;
}

export interface CrossSlopeDraftLike {
  definitions: Array<{
    id: string;
    station: number;
    crossSlope: number;
    source?: string;
  }>;
}

export interface AlignmentMetadata {
  plan?: HorizontalAlignmentDraftLike;
  profile?: VerticalAlignmentDraftLike;
  crossSlope?: CrossSlopeDraftLike;
  notes?: string;
  sourceRef?: SourceRef;
}

export interface DiagnosticAcknowledgement {
  acknowledgedBy?: string | null;
  acknowledgedAt: string;
  reason: string;
  suppressUntilChange: boolean;
}

export interface ImporterDiagnostic {
  id: string;
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  targetPath: string;
  sourceRef?: SourceRef;
  suggestedAction?: string;
  acknowledgement?: DiagnosticAcknowledgement;
}

export interface DiagnosticSummary {
  items: ImporterDiagnostic[];
  lastCalculatedAt?: string;
}

export interface ImporterConversionLog {
  id: string;
  importerProjectId: string;
  bridgeId: string;
  sourceImporterSchemaVersion: ImporterSchemaVersion;
  targetDraftSchemaVersion: string;
  convertedAt: string;
  convertedBy?: string | null;
  diagnostics: AdapterDiagnostic[];
  sourceRefs: SourceRef[];
  inferredValues: Array<{
    targetPath: string;
    reason: string;
    sourcePaths: string[];
    inferred: true;
    interpolation?: "linear";
  }>;
}

export interface AdapterDiagnostic {
  id: string;
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  targetPath: string;
  sourceRef?: SourceRef;
  suggestedAction?: string;
}
