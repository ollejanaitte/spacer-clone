import type { AlignmentBundleDraft, LdistJobDraft } from "../../schema/types";
import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "../types";
import {
  createLdistDiagnostic,
  LINER_LDIST_DIAGNOSTIC_CODES,
} from "./diagnostics";

export interface LdistValidationContext {
  alignmentIds: ReadonlySet<string>;
  lineIdsByAlignment: ReadonlyMap<string, ReadonlySet<string>>;
  pierIdsByAlignment: ReadonlyMap<string, ReadonlySet<string>>;
  stationIds: ReadonlySet<string>;
  stationPhysicalDistances: ReadonlySet<number>;
  intermediate?: CanonicalLinerIntermediateResult;
}

export function buildLdistValidationContext(
  linerAlignments: readonly AlignmentBundleDraft[],
  intermediate?: CanonicalLinerIntermediateResult,
): LdistValidationContext {
  const alignmentIds = new Set<string>();
  const lineIdsByAlignment = new Map<string, Set<string>>();
  const pierIdsByAlignment = new Map<string, Set<string>>();

  for (const bundle of linerAlignments) {
    alignmentIds.add(bundle.id);
    const lineIds = new Set<string>();
    for (const template of bundle.crossSections) {
      for (const line of template.offsetLines) {
        lineIds.add(line.id);
      }
    }
    lineIdsByAlignment.set(bundle.id, lineIds);
    pierIdsByAlignment.set(bundle.id, new Set(bundle.piers.map((pier) => pier.id)));
  }

  const stationIds = new Set<string>();
  const stationPhysicalDistances = new Set<number>();
  if (intermediate) {
    for (const entry of intermediate.stations.entries) {
      stationIds.add(entry.entryId);
      stationPhysicalDistances.add(entry.physicalDistance);
    }
  }

  return {
    alignmentIds,
    lineIdsByAlignment,
    pierIdsByAlignment,
    stationIds,
    stationPhysicalDistances,
    intermediate,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateLineReference(
  diagnostics: ComputationDiagnostic[],
  alignmentId: string,
  lineId: string | undefined,
  context: LdistValidationContext,
  entityPath: string,
): void {
  if (!isNonEmptyString(lineId)) {
    return;
  }
  const lineIds = context.lineIdsByAlignment.get(alignmentId);
  if (!lineIds?.has(lineId)) {
    diagnostics.push(
      createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.lineReferenceMissing, {
        entityPath,
        entityId: lineId,
      }),
    );
  }
}

function validateStationScope(
  diagnostics: ComputationDiagnostic[],
  job: LdistJobDraft,
): void {
  if (job.stationScope === "all_generated") {
    return;
  }
  if ("stationIds" in job.stationScope) {
    for (const stationId of job.stationScope.stationIds) {
      if (!isNonEmptyString(stationId)) {
        diagnostics.push(
          createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.jobSchemaInvalid, {
            entityId: job.id,
            entityPath: "stationScope.stationIds",
          }),
        );
      }
    }
    return;
  }
  if ("physicalDistances" in job.stationScope) {
    for (const distance of job.stationScope.physicalDistances) {
      if (!Number.isFinite(distance)) {
        diagnostics.push(
          createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.jobSchemaInvalid, {
            entityId: job.id,
            entityPath: "stationScope.physicalDistances",
          }),
        );
      }
    }
  }
}

export function validateLdistJobs(
  jobs: readonly LdistJobDraft[],
  context: LdistValidationContext,
): ComputationDiagnostic[] {
  const diagnostics: ComputationDiagnostic[] = [];

  for (const job of jobs) {
    if (!isNonEmptyString(job.id) || !isNonEmptyString(job.alignmentId)) {
      diagnostics.push(
        createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.jobSchemaInvalid, {
          entityId: job.id,
        }),
      );
      continue;
    }

    if (!context.alignmentIds.has(job.alignmentId)) {
      diagnostics.push(
        createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.alignmentReferenceMissing, {
          entityId: job.id,
          entityPath: "alignmentId",
        }),
      );
      continue;
    }

    validateStationScope(diagnostics, job);

    if (job.kind === "grid_distance") {
      if (!job.pairs.length) {
        diagnostics.push(
          createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.pairsEmpty, {
            entityId: job.id,
          }),
        );
      }
      const mode = job.distanceMode ?? "mode_a";
      if (mode === "mode_b" && !isNonEmptyString(job.referenceLineId)) {
        diagnostics.push(
          createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.referenceLineRequired, {
            entityId: job.id,
            entityPath: "referenceLineId",
          }),
        );
      }
      for (const pair of job.pairs) {
        validateLineReference(diagnostics, job.alignmentId, pair.fromLineId, context, "pairs.fromLineId");
        validateLineReference(diagnostics, job.alignmentId, pair.toLineId, context, "pairs.toLineId");
      }
      if (mode === "mode_b") {
        validateLineReference(diagnostics, job.alignmentId, job.referenceLineId, context, "referenceLineId");
      }
    } else if (job.kind === "overhang") {
      if (job.enabled === false) {
        continue;
      }
      validateLineReference(diagnostics, job.alignmentId, job.leftLineId, context, "leftLineId");
      validateLineReference(diagnostics, job.alignmentId, job.rightLineId, context, "rightLineId");
      if (isNonEmptyString(job.pierId)) {
        const pierIds = context.pierIdsByAlignment.get(job.alignmentId);
        if (!pierIds?.has(job.pierId)) {
          diagnostics.push(
            createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.pierReferenceInvalid, {
              entityId: job.id,
              entityPath: "pierId",
            }),
          );
        }
      }
    } else {
      diagnostics.push(
        createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.jobSchemaInvalid, {
          entityId: job.id,
          entityPath: "kind",
        }),
      );
    }
  }

  return diagnostics;
}
