import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "../types";
import type {
  AlignmentBundleDraft,
  CrossSectionTemplateDraft,
  HaunchDefinitionDraft,
  HaunchTypeFamily,
  HaunchSide,
} from "../../schema/types";

export const HAUNCH_ALGORITHM_VERSION = "haunch-0.1.0" as const;

export interface HaunchResultRow {
  definitionId: string;
  type: HaunchTypeFamily;
  stationPhysicalDistance: number;
  displayedStation: number;
  haunchTopElevationM: number;
  haunchThicknessM?: number;
  side?: HaunchSide;
  lineId?: string;
  sourceRevision: string;
  algorithmVersion: typeof HAUNCH_ALGORITHM_VERSION;
}

export interface HaunchComputeInput {
  definitions: readonly HaunchDefinitionDraft[];
  intermediate: CanonicalLinerIntermediateResult;
  sourceRevision: string;
  linerAlignments?: readonly AlignmentBundleDraft[];
  activeAlignmentId?: string;
  crossSections?: readonly CrossSectionTemplateDraft[];
  fallbackAlignmentId?: string;
}

export interface HaunchComputeOutput {
  rows: HaunchResultRow[];
  diagnostics: ComputationDiagnostic[];
}
