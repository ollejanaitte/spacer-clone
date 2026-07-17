import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "../types";
import type { AlignmentBundleDraft, LdistJobDraft } from "../../schema/types";

export const LDIST_ALGORITHM_VERSION = "ldist-0.1.0" as const;

export type LdistResultSide = "left" | "right";

export interface LdistResultRow {
  jobId: string;
  stationPhysicalDistance: number;
  displayedStation: number;
  fromLineId?: string;
  toLineId?: string;
  distanceM?: number;
  overhangM?: number;
  side?: LdistResultSide;
  pierId?: string;
  signConvention?: string;
  sourceRevision: string;
  algorithmVersion: typeof LDIST_ALGORITHM_VERSION;
}

export interface LdistComputeInput {
  jobs: readonly LdistJobDraft[];
  intermediate: CanonicalLinerIntermediateResult;
  sourceRevision: string;
  linerAlignments?: readonly AlignmentBundleDraft[];
  activeAlignmentId?: string;
  crossSections?: readonly import("../../schema/types").CrossSectionTemplateDraft[];
  fallbackAlignmentId?: string;
}

export interface LdistComputeOutput {
  rows: LdistResultRow[];
  diagnostics: ComputationDiagnostic[];
}
