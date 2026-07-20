import type { ProjectModel } from "../../types";
import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import type { AlignmentElement } from "../core/types";
import { sourceRevisionFor } from "../core/pipeline/sourceRevision";
import {
  migrateLinerDraftToVNext,
  type MigrateLinerDraftToVNextResult,
} from "../schema/projectLinerMigration";
import type { RoadDesignDocument } from "../../contracts/roadDesignDocument";
import type { AlignmentBundleDraft, HorizontalElementDraft, LinerDomainDraftVNext } from "../schema/types";
import {
  deriveLinerCenterlineId,
  domainDraftToRoadDesignDocument,
  getActiveAlignmentBundle,
  normalizeLinerDomainDraft,
  roadDesignDocumentToDomainDraft,
  type DomainDraftRoadDesignMapResult,
  type LinerDomainDraftRoadDesignMapperOptions,
  type RoadDesignDomainDraftMapResult,
} from "./linerDomainDraftRoadDesignMapper";
import {
  LINER_DRAFT_SCHEMA_VERSION,
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
} from "../schema/types";
import {
  createAlignmentBundleFromDraft,
  syncActiveBundleToAlignments,
  type LinerDraft,
} from "./linerUiAdapter";

export function linerDraftFromProject(project: ProjectModel): LinerDraft | undefined {
  if (!project.liner) {
    return undefined;
  }

  const migration = readLinerDomainDraftFromProject(project);
  if (migration.ok) {
    return buildIntermediateInputFromDomainDraft(migration.domainDraft);
  }

  return undefined;
}

export function readLinerDomainDraftFromProject(
  project: ProjectModel,
): MigrateLinerDraftToVNextResult {
  if (!project.liner) {
    return {
      ok: false,
      domainDraft: null,
      diagnostics: [
        {
          level: "error",
          code: "LINER_SCHEMA_INVALID",
          path: "/liner",
          message: "liner metadata is missing.",
        },
      ],
    };
  }

  const roadDesignDocument = project.liner.roadDesignDocument;
  if (roadDesignDocument !== undefined) {
    const restored = roadDesignDocumentToDomainDraft(roadDesignDocument);
    if (!restored.ok) {
      return {
        ok: false,
        domainDraft: null,
        diagnostics: restored.diagnostics.map((message) => ({
          level: "error" as const,
          code: "LINER_SCHEMA_INVALID" as const,
          path: "/liner/roadDesignDocument",
          message,
        })),
      };
    }
    return {
      ok: true,
      domainDraft: restored.domainDraft,
      diagnostics: [],
    };
  }

  return migrateLinerDraftToVNext(project.liner);
}

export type HydrateProjectLinerResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

export type SerializeProjectForPersistenceResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

/**
 * Normalizes persisted liner metadata into the in-memory domainDraft working copy.
 * RDD is converted to domainDraft; legacy draft is migrated; roadDesignDocument is stripped.
 */
export function hydrateProjectLinerFromPersistence(project: ProjectModel): HydrateProjectLinerResult {
  if (!project.liner) {
    return { ok: true, project };
  }

  if (project.liner.roadDesignDocument !== undefined) {
    const restored = roadDesignDocumentToDomainDraft(project.liner.roadDesignDocument);
    if (!restored.ok) {
      return { ok: false, diagnostics: restored.diagnostics };
    }
    const hydrated = withProjectLinerDomainDraft(project, restored.domainDraft);
    const { roadDesignDocument: _roadDesignDocument, ...linerWithoutRdd } = hydrated.liner!;
    return {
      ok: true,
      project: {
        ...hydrated,
        liner: linerWithoutRdd,
      },
    };
  }

  if (project.liner.draft !== undefined && project.liner.domainDraft === undefined) {
    const migration = migrateLinerDraftToVNext(project.liner);
    if (!migration.ok) {
      return {
        ok: false,
        diagnostics: migration.diagnostics.map((diagnostic) => diagnostic.message),
      };
    }
    const hydrated = withProjectLinerDomainDraft(project, migration.domainDraft);
    const { draft: _legacyDraft, ...linerWithoutLegacy } = hydrated.liner!;
    return {
      ok: true,
      project: {
        ...hydrated,
        liner: linerWithoutLegacy,
      },
    };
  }

  return { ok: true, project };
}

/**
 * Prepares project JSON for download: embeds RoadDesignDocument and omits domainDraft / legacy draft.
 */
export function serializeProjectForPersistence(
  project: ProjectModel,
): SerializeProjectForPersistenceResult {
  if (!project.liner) {
    return { ok: true, project };
  }

  const migration = readLinerDomainDraftFromProject(project);
  if (!migration.ok) {
    return {
      ok: false,
      diagnostics: migration.diagnostics.map((diagnostic) => diagnostic.message),
    };
  }

  const mapped = domainDraftToRoadDesignDocument(migration.domainDraft);
  if (!mapped.ok) {
    return { ok: false, diagnostics: mapped.diagnostics };
  }

  const {
    domainDraft: _domainDraft,
    draft: _legacyDraft,
    roadDesignDocument: _roadDesignDocument,
    ...linerRest
  } = project.liner;

  return {
    ok: true,
    project: {
      ...project,
      liner: {
        ...linerRest,
        draftSchemaVersion: LINER_DRAFT_SCHEMA_VERSION,
        roadDesignDocument: mapped.document,
      },
    },
  };
}

function toAlignmentElement(element: HorizontalElementDraft): AlignmentElement {
  if (element.type === "straight") {
    return {
      type: "straight",
      id: element.id,
      start: element.start,
      azimuth: element.azimuth,
      length: element.length,
    };
  }
  if (element.type === "arc") {
    return {
      type: "arc",
      id: element.id,
      start: element.start,
      azimuth: element.azimuth,
      radius: element.radius,
      turn: element.turn,
      length: element.length,
    };
  }
  return {
    type: "clothoid",
    id: element.id,
    start: element.start,
    azimuth: element.azimuth,
    clothoidParameter: element.clothoidParameter,
    startRadius: element.startRadius,
    endRadius: element.endRadius,
    turn: element.turn,
    length: element.length,
  };
}

/**
 * Converts a vNext domain draft into the legacy BuildIntermediateInput shape used by the current UI.
 */
export function buildIntermediateInputFromDomainDraft(
  domainDraft: LinerDomainDraftVNext,
): BuildIntermediateInput {
  const normalized = normalizeLinerDomainDraft(domainDraft) ?? domainDraft;
  const activeBundle = getActiveAlignmentBundle(normalized);
  if (!activeBundle) {
    throw new Error("domainDraft has no active alignment bundle.");
  }

  const defaultTemplate = activeBundle.crossSections[0];
  const offsets = defaultTemplate?.offsetLines.map((line) => line.offset) ?? [0];
  const gradeElement = activeBundle.verticalAlignment.elements.find(
    (element) => element.type === "grade",
  );
  const z = gradeElement?.type === "grade" ? gradeElement.startElevation : 0;

  const base: BuildIntermediateInput = {
    alignment: {
      id: activeBundle.id,
      linerModelId: normalized.linerModelId,
      coordinatePolicyId: normalized.coordinatePolicyId,
      elements: activeBundle.alignment.elements.map(toAlignmentElement),
    },
    stationDefinition: activeBundle.stationDefinition,
    verticalAlignment: activeBundle.verticalAlignment,
    crossSections: activeBundle.crossSections,
    crossSlopeIntervals: activeBundle.crossSlopeIntervals,
    offsets,
    sampleInterval: normalized.sampling.display.maxChordLength,
    selectedCrossSectionStation: normalized.selectedCrossSectionStation,
    z,
    linerAlignments: structuredClone(normalized.alignments),
    activeAlignmentId: normalized.activeAlignmentId ?? activeBundle.id,
    activeLineId:
      normalized.activeLineId ?? deriveLinerCenterlineId(activeBundle.id),
    ...(normalized.measuredGrid ? { measuredGrid: normalized.measuredGrid } : {}),
    ...(normalized.drawingSettings ? { drawingSettings: normalized.drawingSettings } : {}),
    ...(normalized.ldistJobs?.length ? { ldistJobs: normalized.ldistJobs } : {}),
    ...(normalized.haunchDefinitions?.length ? { haunchDefinitions: normalized.haunchDefinitions } : {}),
    ...(normalized.hosoDefinitions?.length ? { hosoDefinitions: normalized.hosoDefinitions } : {}),
    ...(activeBundle.widthChangePoints?.length
      ? { widthChangePoints: activeBundle.widthChangePoints }
      : {}),
    ...(activeBundle.gridDefinitions.length > 1 || activeBundle.crossSections.length > 1
      ? { gridDefinitions: activeBundle.gridDefinitions }
      : activeBundle.gridDefinitions.length
        ? { gridDefinitions: activeBundle.gridDefinitions }
        : {}),
    ...(activeBundle.spans.length ? { spans: activeBundle.spans } : {}),
    ...(activeBundle.piers.length ? { piers: activeBundle.piers } : {}),
  };

  return base;
}

function linerDraftSourceRevisionInput(draft: BuildIntermediateInput): Record<string, unknown> {
  return {
    alignment: draft.alignment,
    stationDefinition: draft.stationDefinition,
    verticalAlignment: draft.verticalAlignment,
    crossSections: draft.crossSections,
    gridDefinitions: draft.gridDefinitions,
    crossSlopeIntervals: draft.crossSlopeIntervals,
    ...(draft.widthChangePoints?.length ? { widthChangePoints: draft.widthChangePoints } : {}),
    measuredGrid: draft.measuredGrid,
    offsets: draft.offsets ?? [0],
    z: draft.z ?? 0,
    ...(draft.spans?.length ? { spans: draft.spans } : {}),
    ...(draft.piers?.length ? { piers: draft.piers } : {}),
  };
}

function domainDraftFromLinerDraft(
  draft: LinerDraft,
  existingDocumentId?: string,
): LinerDomainDraftVNext {
  const synced = syncActiveBundleToAlignments(draft);
  const activeId = synced.activeAlignmentId ?? synced.alignment.id;
  const existingActive = synced.linerAlignments?.find((entry) => entry.id === activeId);
  const activeBundle: AlignmentBundleDraft = {
    ...createAlignmentBundleFromDraft(
      synced,
      activeId,
      existingActive?.name,
      existingActive?.sortIndex ?? 0,
    ),
    enabled: existingActive?.enabled ?? true,
  };
  const alignments =
    synced.linerAlignments?.map((bundle) =>
      bundle.id === activeBundle.id ? activeBundle : bundle,
    ) ?? [activeBundle];
  const sortedBundles = [...alignments].sort((left, right) => left.sortIndex - right.sortIndex);
  const documentId = existingDocumentId ?? sortedBundles[0]?.id ?? synced.alignment.id;

  return {
    id: documentId,
    linerModelId: synced.alignment.linerModelId,
    coordinatePolicyId: synced.alignment.coordinatePolicyId,
    alignments,
    activeAlignmentId: activeId,
    activeLineId: synced.activeLineId ?? deriveLinerCenterlineId(activeId),
    ...(synced.measuredGrid ? { measuredGrid: synced.measuredGrid } : {}),
    ...(synced.selectedCrossSectionStation !== undefined
      ? { selectedCrossSectionStation: synced.selectedCrossSectionStation }
      : {}),
    ...(synced.drawingSettings ? { drawingSettings: synced.drawingSettings } : {}),
    ...(synced.ldistJobs?.length ? { ldistJobs: structuredClone(synced.ldistJobs) } : {}),
    ...(synced.haunchDefinitions?.length
      ? { haunchDefinitions: structuredClone(synced.haunchDefinitions) }
      : {}),
    ...(synced.hosoDefinitions?.length
      ? { hosoDefinitions: structuredClone(synced.hosoDefinitions) }
      : {}),
    generationSettings: {
      defaultMemberGroupKey: "default",
      connectivityMode: "grid_full",
    },
    sampling: {
      display: {
        maxChordLength: synced.sampleInterval ?? 0.5,
        maxSagitta: 0.005,
        minSegmentsPerElement: 1,
      },
      dxf: {
        maxChordLength: 0.1,
        maxSagitta: 0.001,
        minSegmentsPerElement: 1,
      },
      frame: {
        maxMemberLength: 0.25,
        maxSagitta: 0.0025,
        stationIntervalFallback: synced.sampleInterval ?? 0.25,
      },
    },
  };
}

export function validateLinerDraftForCommit(draft: LinerDraft): string | null {
  try {
    const domainDraft = domainDraftFromLinerDraft(draft);
    const mapped = domainDraftToRoadDesignDocument(domainDraft);
    if (!mapped.ok) {
      return mapped.diagnostics.join("; ");
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return message;
  }
}

export function withProjectLinerDraft(project: ProjectModel, draft: LinerDraft): ProjectModel {
  const domainDraft = domainDraftFromLinerDraft(draft, project.liner?.domainDraft?.id);
  return withProjectLinerDomainDraft(project, domainDraft);
}

export function tryWithProjectLinerDraft(project: ProjectModel, draft: LinerDraft): ProjectModel {
  const synced = syncActiveBundleToAlignments(draft);
  const migration = migrateLinerDraftToVNext({ draft: synced });
  if (!migration.ok) {
    return project;
  }
  return withProjectLinerDomainDraft(project, migration.domainDraft);
}

export function projectLinerDomainDraftToRoadDesignDocument(
  domainDraft: LinerDomainDraftVNext,
  options: LinerDomainDraftRoadDesignMapperOptions = {},
): DomainDraftRoadDesignMapResult {
  return domainDraftToRoadDesignDocument(domainDraft, options);
}

export function roadDesignDocumentToProjectLinerDomainDraft(
  document: RoadDesignDocument,
): RoadDesignDomainDraftMapResult {
  return roadDesignDocumentToDomainDraft(document);
}

export function withProjectLinerDomainDraft(
  project: ProjectModel,
  domainDraft: LinerDomainDraftVNext,
): ProjectModel {
  const normalized = normalizeLinerDomainDraft(domainDraft) ?? domainDraft;
  const linerDraft = buildIntermediateInputFromDomainDraft(normalized);
  const { draft: _legacyDraft, ...existingLiner } = project.liner ?? {};

  return {
    ...project,
    liner: {
      ...existingLiner,
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      draftSchemaVersion: LINER_DRAFT_SCHEMA_VERSION,
      sourceRevision: sourceRevisionFor(linerDraftSourceRevisionInput(linerDraft)),
      linerModelId: normalized.linerModelId,
      coordinatePolicyId: normalized.coordinatePolicyId,
      intermediateSchemaVersion: "0.2.0",
      domainDraft: structuredClone(normalized),
    },
  };
}
