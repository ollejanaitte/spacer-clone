import type { LdistJobDraft } from "../../schema/types";
import type { SectionSliceResult, SpanResult, StationTableEntry } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import {
  computeGridDistanceModeA,
  computeGridDistanceModeB,
  resolveSectionAlignmentAzimuth,
} from "./computeGridDistance";
import {
  computeOverhangAtStation,
  findPiersAtStation,
  resolvePierForJob,
} from "./computeOverhang";
import {
  createLdistDiagnostic,
  LINER_LDIST_DIAGNOSTIC_CODES,
} from "./diagnostics";
import {
  buildLineOffsetMap,
} from "./sectionLineIntersection";
import {
  buildLdistValidationContext,
  validateLdistJobs,
} from "./validateLdistJobs";
import { resolveLdistAlignmentBundles } from "./resolveLdistAlignmentBundles";
import {
  LDIST_ALGORITHM_VERSION,
  type LdistComputeInput,
  type LdistComputeOutput,
  type LdistResultRow,
} from "./types";

function resolveStationsForJob(
  job: LdistJobDraft,
  entries: readonly StationTableEntry[],
  spans: readonly SpanResult[],
): StationTableEntry[] {
  let stations: StationTableEntry[];
  if (job.stationScope === "all_generated") {
    stations = [...entries];
  } else if ("stationIds" in job.stationScope) {
    const ids = new Set(job.stationScope.stationIds);
    stations = entries.filter((entry) => ids.has(entry.entryId));
  } else {
    const distances = job.stationScope.physicalDistances;
    stations = entries.filter((entry) =>
      distances.some(
        (distance) => Math.abs(distance - entry.physicalDistance) <= DEFAULT_TOLERANCES.station,
      ),
    );
  }

  if (!job.spanId) {
    return stations;
  }
  const span = spans.find((entry) => entry.id === job.spanId);
  if (!span) {
    return stations;
  }
  return stations.filter(
    (entry) =>
      entry.physicalDistance >= span.startPhysicalDistance - DEFAULT_TOLERANCES.station
      && entry.physicalDistance <= span.endPhysicalDistance + DEFAULT_TOLERANCES.station,
  );
}

function resolveSectionsForJob(
  job: LdistJobDraft,
  sections: readonly SectionSliceResult[],
  physicalDistance: number,
): SectionSliceResult[] {
  const atStation = sections.filter(
    (section) => Math.abs(section.physicalDistance - physicalDistance) <= DEFAULT_TOLERANCES.station,
  );
  if (!job.sectionIds?.length) {
    return atStation;
  }
  const ids = new Set(job.sectionIds);
  return atStation.filter((section) => ids.has(section.id));
}

function baseRow(
  job: LdistJobDraft,
  section: SectionSliceResult,
  sourceRevision: string,
): Omit<LdistResultRow, "fromLineId" | "toLineId" | "distanceM" | "overhangM" | "side" | "pierId" | "signConvention"> {
  return {
    jobId: job.id,
    stationPhysicalDistance: section.physicalDistance,
    displayedStation: section.displayedStation,
    sourceRevision,
    algorithmVersion: LDIST_ALGORITHM_VERSION,
  };
}

export function computeLdistResults(input: LdistComputeInput): LdistComputeOutput {
  const rows: LdistResultRow[] = [];
  const diagnostics = [];
  const alignments = resolveLdistAlignmentBundles({
    linerAlignments: input.linerAlignments,
    activeAlignmentId: input.activeAlignmentId,
    crossSections: input.crossSections,
    fallbackAlignmentId: input.fallbackAlignmentId ?? input.intermediate.horizontal.segments[0]?.id ?? "alignment-1",
  });
  const context = buildLdistValidationContext(alignments, input.intermediate);
  diagnostics.push(...validateLdistJobs(input.jobs, context));

  const validationErrors = diagnostics.filter((entry) => entry.level === "error");
  if (validationErrors.length > 0) {
    return { rows, diagnostics };
  }

  const lineOffsetMap = buildLineOffsetMap(alignments);
  const sampledPoints = input.intermediate.horizontal.sampledPoints;
  const stationEntries = input.intermediate.stations.entries;

  for (const job of input.jobs) {
    if (job.kind === "overhang" && job.enabled === false) {
      continue;
    }

    const stations = resolveStationsForJob(job, stationEntries, input.intermediate.spans);
    for (const station of stations) {
      const sections = resolveSectionsForJob(job, input.intermediate.sections, station.physicalDistance);
      for (const section of sections) {
        if (job.kind === "grid_distance") {
          const mode = job.distanceMode ?? "mode_a";
          const alignmentAzimuth = resolveSectionAlignmentAzimuth(section, sampledPoints);
          if (alignmentAzimuth === null) {
            diagnostics.push(
              createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.stationOutOfRange, {
                entityId: job.id,
                physicalDistance: section.physicalDistance,
              }),
            );
            continue;
          }
          for (const pair of job.pairs) {
            const result =
              mode === "mode_b" && job.referenceLineId
                ? computeGridDistanceModeB(
                    pair,
                    job.referenceLineId,
                    section,
                    lineOffsetMap,
                    alignmentAzimuth,
                  )
                : computeGridDistanceModeA(pair, section, lineOffsetMap);
            if (!result) {
              diagnostics.push(
                createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.degenerateGeometry, {
                  entityId: job.id,
                  physicalDistance: section.physicalDistance,
                  entityPath: `${pair.fromLineId}->${pair.toLineId}`,
                }),
              );
              continue;
            }
            rows.push({
              ...baseRow(job, section, input.sourceRevision),
              fromLineId: pair.fromLineId,
              toLineId: pair.toLineId,
              distanceM: result.distanceM,
              signConvention: result.signConvention,
            });
          }
        } else if (job.kind === "overhang") {
          const piersAtStation = findPiersAtStation(input.intermediate.piers, section.physicalDistance);
          const pierResolution = resolvePierForJob(job, piersAtStation);
          if (pierResolution === "missing_id") {
            diagnostics.push(
              createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.pierIdRequired, {
                entityId: job.id,
                physicalDistance: section.physicalDistance,
              }),
            );
            continue;
          }
          if (pierResolution === "invalid_id") {
            diagnostics.push(
              createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.pierReferenceInvalid, {
                entityId: job.id,
                physicalDistance: section.physicalDistance,
              }),
            );
            continue;
          }
          if (!pierResolution) {
            continue;
          }
          const overhangRows = computeOverhangAtStation(
            job,
            pierResolution,
            section,
            lineOffsetMap,
            sampledPoints,
          );
          if (overhangRows.length === 0) {
            diagnostics.push(
              createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.degenerateGeometry, {
                entityId: job.id,
                physicalDistance: section.physicalDistance,
              }),
            );
            continue;
          }
          for (const overhang of overhangRows) {
            rows.push({
              ...baseRow(job, section, input.sourceRevision),
              overhangM: overhang.overhangM,
              side: overhang.side,
              pierId: overhang.pierId,
            });
          }
        }
      }
    }
  }

  return { rows, diagnostics };
}
