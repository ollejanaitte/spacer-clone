import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "../types";
import type {
  AlignmentBundleDraft,
  CrossSectionTemplateDraft,
  CrossSlopeIntervalDraft,
  HosoDefinitionDraft,
  HosoTypeFamily,
} from "../../schema/types";

export const HOSO_ALGORITHM_VERSION = "hoso-0.1.0" as const;

export interface HosoResultRow {
  definitionId: string;
  type: HosoTypeFamily;
  stationPhysicalDistance: number;
  displayedStation: number;
  offsetM?: number;
  pavementThicknessM: number;
  pavementElevationM?: number;
  lineId?: string;
  sourceRevision: string;
  algorithmVersion: typeof HOSO_ALGORITHM_VERSION;
}

export interface HosoComputeInput {
  definitions: readonly HosoDefinitionDraft[];
  intermediate: CanonicalLinerIntermediateResult;
  sourceRevision: string;
  linerAlignments?: readonly AlignmentBundleDraft[];
  activeAlignmentId?: string;
  crossSections?: readonly CrossSectionTemplateDraft[];
  crossSlopeIntervals?: readonly CrossSlopeIntervalDraft[];
  fallbackAlignmentId?: string;
}

export interface HosoComputeOutput {
  rows: HosoResultRow[];
  diagnostics: ComputationDiagnostic[];
}
