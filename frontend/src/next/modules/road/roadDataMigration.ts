/**
 * Canonical Road Data migration (Phase 7.2 FROZEN / Phase 7.3 WP-A).
 *
 * Migrates legacy sources into modules.road.data.roadData (single source of
 * truth):
 *   - project.liner (legacy LINER domain draft / roadDesignDocument)
 *   - modules.road.data.roadInput (loose Road UI inputs)
 *
 * Rules (FROZEN):
 *   - non-destructive (legacy sources are never overwritten)
 *   - atomic (validate -> compute -> single commit)
 *   - fail-closed (divergence / malformed data -> block, never overwrite)
 *   - conflict comparator: when both legacy sources exist and their content
 *     differs beyond a "Reference Mountain default only" marker, block.
 */

import type { ProjectModel } from "../../../types";
import type { LinerDomainDraftVNext } from "../../../liner/schema/types";
import { readLinerDomainDraftFromProject } from "../../../liner/adapters/linerProjectDraft";
import {
  buildCanonicalRoadData,
  computeRoadDataChecksum,
  finalizeCanonicalRoadData,
  type CanonicalRoadData,
  type RoadDataMeta,
} from "./roadDataSchema";

export type MigrationResult =
  | { ok: true; roadData: CanonicalRoadData; migrated: boolean }
  | { ok: false; issues: readonly { path: string; message: string }[] };

export interface MigrationContext {
  readonly project?: ProjectModel;
  readonly roadInput?: RoadInputsData;
}

/** Loose Road UI inputs (mirror of roadModuleAdapter.RoadInputsData; kept local
 *  to avoid a circular import). */
export interface RoadInputsData {
  readonly label?: string;
  readonly horizontal?: unknown;
  readonly vertical?: readonly unknown[];
  readonly crossSections?: readonly unknown[];
}

const REFERENCE_MOUNTAIN_MARKER = "Mountain Road";

/** Detect whether a roadInput is just the Reference Mountain default. */
export function isReferenceMountainDefault(input: RoadInputsData): boolean {
  const label = input.label;
  return typeof label === "string" && label.includes(REFERENCE_MOUNTAIN_MARKER);
}

/** Build a minimal domain draft from loose roadInput (label + geometry blobs). */
export function domainDraftFromRoadInput(input: RoadInputsData): LinerDomainDraftVNext | null {
  const horizontal = input.horizontal;
  if (!horizontal || typeof horizontal !== "object") {
    return null;
  }
  return {
    id: "road",
    linerModelId: "road",
    coordinatePolicyId: null as unknown as string,
    alignments: [
      {
        id: "AL-1",
        name: input.label ?? "Road",
        enabled: true,
        sortIndex: 0,
        alignment: horizontal as never,
        stationDefinition: { originDisplayedStation: 0, interval: 20, explicitStations: [] },
        verticalAlignment: { id: "VA-1", elements: (Array.isArray(input.vertical) ? input.vertical : []) as never },
        crossSections: (Array.isArray(input.crossSections) ? input.crossSections : []) as never,
        gridDefinitions: [],
        spans: [],
        piers: [],
      },
    ],
    generationSettings: {},
    sampling: {
      display: { maxChordLength: 0.5, maxSagitta: 0.01, minSegmentsPerElement: 4 },
      dxf: { maxChordLength: 0.1, maxSagitta: 0.005, minSegmentsPerElement: 4 },
      frame: { maxMemberLength: 0.25, maxSagitta: 0.005, stationIntervalFallback: 0.25 },
    },
  };
}

/**
 * The single migration entry. Returns the canonical roadData (migrating when
 * absent) or a fail-closed block.
 */
export function ensureCanonicalRoadData(
  existing: unknown,
  context: MigrationContext,
  now: string = new Date().toISOString(),
): MigrationResult {
  // 1. Existing canonical data -> finalize (checksum check).
  if (existing !== undefined) {
    const finalized = finalizeCanonicalRoadData(existing);
    if (!finalized) {
      return {
        ok: false,
        issues: [
          { path: "roadData", message: "existing roadData checksum mismatch or malformed (fail-closed)." },
        ],
      };
    }
    return { ok: true, roadData: finalized, migrated: false };
  }

  const projectLiner = context.project?.liner;
  const roadInput = context.roadInput;
  const hasLiner = Boolean(projectLiner && typeof projectLiner === "object");
  const hasRoadInput = Boolean(roadInput && typeof roadInput === "object");

  // 2. Neither -> fresh canonical (minimal default draft).
  if (!hasLiner && !hasRoadInput) {
    const draft = createDefaultDomainDraft();
    return {
      ok: true,
      roadData: buildCanonicalRoadData(draft, { source: "new", migratedAt: now }),
      migrated: false,
    };
  }

  // 3. Both legacy sources -> conflict comparator.
  if (hasLiner && hasRoadInput) {
    return migrateBoth(context.project!, roadInput!, now);
  }

  // 4. Single legacy source.
  if (hasLiner) {
    return migrateFromProjectLiner(context.project!, now);
  }
  return migrateFromRoadInput(roadInput!, now);
}

function migrateFromProjectLiner(project: ProjectModel, now: string): MigrationResult {
  const result = readLinerDomainDraftFromProject(project);
  if (!result.ok || !result.domainDraft) {
    return {
      ok: false,
      issues: result.diagnostics.map((d) => ({ path: d.path, message: d.message })),
    };
  }
  const meta: RoadDataMeta = { source: "liner", migratedAt: now, legacyId: result.domainDraft.id };
  return { ok: true, roadData: buildCanonicalRoadData(result.domainDraft, meta), migrated: true };
}

function migrateFromRoadInput(input: RoadInputsData, now: string): MigrationResult {
  const draft = domainDraftFromRoadInput(input);
  if (!draft) {
    return {
      ok: false,
      issues: [{ path: "roadInput", message: "roadInput has no usable horizontal data (fail-closed)." }],
    };
  }
  const meta: RoadDataMeta = {
    source: "roadInput",
    migratedAt: now,
    roadLabel: input.label,
    legacyId: draft.id,
  };
  return { ok: true, roadData: buildCanonicalRoadData(draft, meta), migrated: true };
}

function migrateBoth(
  project: ProjectModel,
  input: RoadInputsData,
  now: string,
): MigrationResult {
  // Reference Mountain default roadInput does not represent authored content:
  // prefer the (more complete) project.liner when available.
  if (isReferenceMountainDefault(input)) {
    return migrateFromProjectLiner(project, now);
  }

  const linerResult = readLinerDomainDraftFromProject(project);
  if (!linerResult.ok || !linerResult.domainDraft) {
    return {
      ok: false,
      issues: linerResult.diagnostics.map((d) => ({ path: d.path, message: d.message })),
    };
  }
  const inputDraft = domainDraftFromRoadInput(input);
  if (!inputDraft) {
    return migrateFromProjectLiner(project, now);
  }

  // Conflict comparator: compare canonical checksums of the two derived drafts.
  const linerChecksum = computeRoadDataChecksum(linerResult.domainDraft);
  const inputChecksum = computeRoadDataChecksum(inputDraft);
  if (linerChecksum === inputChecksum) {
    const meta: RoadDataMeta = { source: "liner", migratedAt: now, legacyId: linerResult.domainDraft.id };
    return { ok: true, roadData: buildCanonicalRoadData(linerResult.domainDraft, meta), migrated: true };
  }

  // Divergence: block (fail-closed). Do not silently overwrite either source.
  return {
    ok: false,
    issues: [
      {
        path: "roadData",
        message: "project.liner and modules.road.data.roadInput diverge; migration blocked (fail-closed).",
      },
    ],
  };
}

function createDefaultDomainDraft(): LinerDomainDraftVNext {
  return {
    id: "road-default",
    linerModelId: "road",
    coordinatePolicyId: null as unknown as string,
    alignments: [],
    generationSettings: {},
    sampling: {
      display: { maxChordLength: 0.5, maxSagitta: 0.01, minSegmentsPerElement: 4 },
      dxf: { maxChordLength: 0.1, maxSagitta: 0.005, minSegmentsPerElement: 4 },
      frame: { maxMemberLength: 0.25, maxSagitta: 0.005, stationIntervalFallback: 0.25 },
    },
  };
}
