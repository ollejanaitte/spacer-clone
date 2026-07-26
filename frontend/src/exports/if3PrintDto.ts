import type {
  FrameAnalysisResultResource,
  UuidString,
} from "../contracts";
import { extractLinearStaticAnalysisResultFromResource } from "../results/if3ResultViewModel";
import type { AnalysisResult } from "../types";
import {
  evaluateIf3PrintCatalog,
  type If3PrintCatalog,
} from "./if3PrintCatalog";

export type If3PrintDto = {
  readonly resultId: UuidString;
  readonly analysisRunId: UuidString;
  readonly sourceDocumentId: UuidString;
  readonly sourceDocumentVersion: number;
  readonly generatedAt: string;
  readonly catalog: If3PrintCatalog;
  /**
   * Compatibility DTO for existing table renderers. It is derived only from
   * an IF3 resource after the authoritative gate and PRINT catalog pass.
   */
  readonly tableResult: AnalysisResult;
};

export function buildIf3PrintDto(
  resource: FrameAnalysisResultResource,
  loadCaseIdByContextId?: Readonly<Record<string, string>>,
): If3PrintDto {
  const catalog = evaluateIf3PrintCatalog(resource);
  return {
    resultId: resource.resultId,
    analysisRunId: resource.analysisRunId,
    sourceDocumentId: resource.sourceDocumentId,
    sourceDocumentVersion: resource.sourceDocumentVersion,
    generatedAt: resource.generatedAt,
    catalog,
    tableResult: extractLinearStaticAnalysisResultFromResource(
      resource,
      loadCaseIdByContextId,
    ),
  };
}
