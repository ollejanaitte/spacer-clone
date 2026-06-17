import type { AnalysisResult, ProjectModel, StructuredMessage, TimeHistoryResult } from "../types";

export type TimeHistoryDirection = "X" | "Y" | "Z";
export type TimeHistoryGroundMotionUnit = "m/s2" | "gal";

export type TimeHistoryGroundMotion = NonNullable<ProjectModel["groundMotions"]>[number];
export type TimeHistoryAnalysisEnvelope = AnalysisResult & {
  analysisSummary: AnalysisResult["analysisSummary"] & {
    analysisType: "time_history";
    solver: "newmark_beta";
  };
  timeHistoryResult: TimeHistoryResult | null;
};

export type TimeHistoryAnalysisRequest = {
  project: ProjectModel;
  analysisId?: string;
};

export type TimeHistoryAnalysisResponse = {
  result: TimeHistoryAnalysisEnvelope;
};

export type TimeHistoryHookState = {
  loading: boolean;
  result: TimeHistoryAnalysisEnvelope | null;
  error: StructuredMessage | null;
};
