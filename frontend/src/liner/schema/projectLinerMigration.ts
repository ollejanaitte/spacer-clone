import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import { totalAlignmentLength } from "../core/geometry/horizontal";
import type { AlignmentElement, LinearAlignment, StationDefinition } from "../core/types";
import { isSupportedVersion, LINER_DRAFT_SCHEMA_VERSION } from "./version";
import type {
  CrossSlopeIntervalDraft,
  CrossSectionOffsetLineDraft,
  HorizontalAlignmentDraft,
  HorizontalElementDraft,
  LinerDomainDraftVNext,
  AlignmentBundleDraft,
  ProjectLinerExtension,
  ProjectLinerValidationDiagnostic,
} from "./types";
import { deriveLinerCenterlineId } from "../adapters/linerDomainDraftRoadDesignMapper";

type ProjectLike = Record<string, unknown> & Partial<ProjectLinerExtension>;

const FIXED_Z_DRAFT_KEYS = new Set([
  "alignment",
  "stationDefinition",
  "verticalAlignment",
  "crossSections",
  "gridDefinitions",
  "measuredGrid",
  "crossSlopeIntervals",
  "offsets",
  "sampleInterval",
  "selectedCrossSectionStation",
  "drawingSettings",
  "widthChangePoints",
  "spans",
  "piers",
  "z",
  "computedAt",
  "linerAlignments",
  "activeAlignmentId",
  "activeLineId",
]);

export type MigrateLinerDraftToVNextResult =
  | { ok: true; domainDraft: LinerDomainDraftVNext; diagnostics: [] }
  | { ok: false; domainDraft: null; diagnostics: ProjectLinerValidationDiagnostic[] };

function schemaInvalid(path: string, message: string): ProjectLinerValidationDiagnostic {
  return {
    level: "error",
    code: "LINER_SCHEMA_INVALID",
    path,
    message,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyAllowedKeys(object: Record<string, unknown>, allowedKeys: Set<string>): boolean {
  return Object.keys(object).every((key) => allowedKeys.has(key));
}

function cloneDomainDraft(domainDraft: LinerDomainDraftVNext): LinerDomainDraftVNext {
  return structuredClone(domainDraft);
}

function normalizeDomainDraftFromMetadata(
  domainDraft: LinerDomainDraftVNext | Record<string, unknown>,
): LinerDomainDraftVNext {
  if (Array.isArray((domainDraft as LinerDomainDraftVNext).alignments)) {
    const typed = domainDraft as LinerDomainDraftVNext;
    const activeAlignmentId = typed.activeAlignmentId ?? typed.alignments[0]?.id;
    return {
      ...structuredClone(typed),
      activeAlignmentId,
      activeLineId:
        typed.activeLineId
        ?? (activeAlignmentId ? deriveLinerCenterlineId(activeAlignmentId) : undefined),
    };
  }

  const legacy = domainDraft as Record<string, unknown>;
  const alignment = legacy.alignment as HorizontalAlignmentDraft;
  const bundle: AlignmentBundleDraft = {
    id: alignment.id,
    name: alignment.id,
    enabled: true,
    sortIndex: 0,
    alignment,
    stationDefinition: legacy.stationDefinition as AlignmentBundleDraft["stationDefinition"],
    verticalAlignment: legacy.verticalAlignment as AlignmentBundleDraft["verticalAlignment"],
    crossSections: legacy.crossSections as AlignmentBundleDraft["crossSections"],
    ...(legacy.crossSlopeIntervals
      ? { crossSlopeIntervals: legacy.crossSlopeIntervals as CrossSlopeIntervalDraft[] }
      : {}),
    gridDefinitions: legacy.gridDefinitions as AlignmentBundleDraft["gridDefinitions"],
    spans: legacy.spans as AlignmentBundleDraft["spans"],
    piers: legacy.piers as AlignmentBundleDraft["piers"],
    ...(legacy.widthChangePoints
      ? { widthChangePoints: legacy.widthChangePoints as AlignmentBundleDraft["widthChangePoints"] }
      : {}),
  };

  return {
    id: legacy.id as string,
    linerModelId: legacy.linerModelId as string,
    coordinatePolicyId: legacy.coordinatePolicyId as string,
    alignments: [bundle],
    activeAlignmentId: alignment.id,
    activeLineId: deriveLinerCenterlineId(alignment.id),
    ...(legacy.measuredGrid ? { measuredGrid: legacy.measuredGrid as LinerDomainDraftVNext["measuredGrid"] } : {}),
    ...(legacy.selectedCrossSectionStation !== undefined
      ? { selectedCrossSectionStation: legacy.selectedCrossSectionStation as number }
      : {}),
    ...(legacy.drawingSettings
      ? { drawingSettings: legacy.drawingSettings as LinerDomainDraftVNext["drawingSettings"] }
      : {}),
    generationSettings: legacy.generationSettings as LinerDomainDraftVNext["generationSettings"],
    sampling: legacy.sampling as LinerDomainDraftVNext["sampling"],
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => isFiniteNumber(item));
}

function isStationDefinition(value: unknown): value is StationDefinition {
  if (!isPlainObject(value)) {
    return false;
  }
  return isFiniteNumber(value.originDisplayedStation);
}

function isLinearAlignment(value: unknown): value is LinearAlignment {
  if (!isPlainObject(value) || Array.isArray(value)) {
    return false;
  }
  if (!isNonEmptyString(value.id)) {
    return false;
  }
  if (!isNonEmptyString(value.linerModelId)) {
    return false;
  }
  if (!isNonEmptyString(value.coordinatePolicyId)) {
    return false;
  }
  if (!Array.isArray(value.elements)) {
    return false;
  }
  return value.elements.every((element) => isAlignmentElement(element));
}

function isAlignmentElement(value: unknown): value is AlignmentElement {
  if (!isPlainObject(value)) {
    return false;
  }
  if (!isNonEmptyString(value.id) || !isFiniteNumber(value.length)) {
    return false;
  }
  if (value.type === "straight") {
    return (
      isPlainObject(value.start)
      && isFiniteNumber(value.start.x)
      && isFiniteNumber(value.start.y)
      && isFiniteNumber(value.azimuth)
    );
  }
  if (value.type === "arc") {
    return (
      isPlainObject(value.start)
      && isFiniteNumber(value.start.x)
      && isFiniteNumber(value.start.y)
      && isFiniteNumber(value.azimuth)
      && isFiniteNumber(value.radius)
      && (value.turn === "left" || value.turn === "right")
    );
  }
  if (value.type === "clothoid") {
    return (
      isPlainObject(value.start)
      && isFiniteNumber(value.start.x)
      && isFiniteNumber(value.start.y)
      && isFiniteNumber(value.azimuth)
      && isFiniteNumber(value.clothoidParameter)
    );
  }
  return false;
}

function isFixedZDraft(value: unknown): value is BuildIntermediateInput {
  if (!isPlainObject(value)) {
    return false;
  }
  if ("alignments" in value) {
    return false;
  }
  if (!hasOnlyAllowedKeys(value, FIXED_Z_DRAFT_KEYS)) {
    return false;
  }
  if (!isLinearAlignment(value.alignment)) {
    return false;
  }
  if (!isStationDefinition(value.stationDefinition)) {
    return false;
  }
  if (!isNumberArray(value.offsets)) {
    return false;
  }
  if (!isFiniteNumber(value.z)) {
    return false;
  }
  if (value.sampleInterval !== undefined && !isFiniteNumber(value.sampleInterval)) {
    return false;
  }
  if (value.gridDefinitions !== undefined && !Array.isArray(value.gridDefinitions)) {
    return false;
  }
  if (value.computedAt !== undefined && !isNonEmptyString(value.computedAt)) {
    return false;
  }
  if (value.spans !== undefined && !Array.isArray(value.spans)) {
    return false;
  }
  if (value.piers !== undefined && !Array.isArray(value.piers)) {
    return false;
  }
  return true;
}

function isLinerDomainDraftVNext(value: unknown): value is LinerDomainDraftVNext {
  if (!isPlainObject(value)) {
    return false;
  }
  if (
    isNonEmptyString(value.id)
    && isNonEmptyString(value.linerModelId)
    && isNonEmptyString(value.coordinatePolicyId)
    && Array.isArray(value.alignments)
    && value.alignments.length > 0
    && isPlainObject(value.generationSettings)
    && isPlainObject(value.sampling)
  ) {
    return value.alignments.every(
      (entry) =>
        isPlainObject(entry)
        && isNonEmptyString(entry.id)
        && isNonEmptyString(entry.name)
        && isPlainObject(entry.alignment)
        && isPlainObject(entry.stationDefinition)
        && isPlainObject(entry.verticalAlignment)
        && Array.isArray(entry.crossSections)
        && Array.isArray(entry.gridDefinitions)
        && Array.isArray(entry.spans)
        && Array.isArray(entry.piers),
    );
  }
  return (
    isNonEmptyString(value.id)
    && isNonEmptyString(value.linerModelId)
    && isNonEmptyString(value.coordinatePolicyId)
    && isPlainObject(value.alignment)
    && isPlainObject(value.stationDefinition)
    && isPlainObject(value.verticalAlignment)
    && Array.isArray(value.crossSections)
    && Array.isArray(value.gridDefinitions)
    && Array.isArray(value.spans)
    && Array.isArray(value.piers)
    && isPlainObject(value.generationSettings)
    && isPlainObject(value.sampling)
  );
}

function toHorizontalElementDraft(element: AlignmentElement): HorizontalElementDraft {
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
    turn: element.turn ?? "left",
    length: element.length,
  };
}

function toHorizontalAlignmentDraft(alignment: LinearAlignment): HorizontalAlignmentDraft {
  return {
    id: alignment.id,
    elements: alignment.elements.map(toHorizontalElementDraft),
  };
}

function buildOffsetLines(offsets: number[], alignmentId?: string): CrossSectionOffsetLineDraft[] {
  return offsets.map((offset, index) => ({
    id: alignmentId ? `OL-${alignmentId}-${index}` : `OL-${index}`,
    offset,
    elevation: 0,
    role: "custom" as const,
    ...(alignmentId ? { baseLineId: deriveLinerCenterlineId(alignmentId) } : {}),
  }));
}

function defaultCrossfallModeForSlope(valuePercent: number): CrossSlopeIntervalDraft["mode"] {
  if (valuePercent > 0) {
    return "one_way_right";
  }
  if (valuePercent < 0) {
    return "one_way_left";
  }
  return "flat";
}

function buildDefaultCrossSlopeIntervals(
  draft: BuildIntermediateInput,
  totalLength: number,
): CrossSlopeIntervalDraft[] {
  const slopePercent = draft.crossSections?.[0]?.crossSlope?.valuePercent ?? 0;
  return [
    {
      id: "CF-default",
      startPhysicalDistance: 0,
      endPhysicalDistance: totalLength,
      mode: defaultCrossfallModeForSlope(slopePercent),
      leftSlopePercent: slopePercent,
      rightSlopePercent: slopePercent,
    },
  ];
}

function migrateFixedZDraftToVNext(draft: BuildIntermediateInput): LinerDomainDraftVNext {
  const alignment = draft.alignment;
  if (draft.linerAlignments?.length) {
    const activeAlignmentId = draft.activeAlignmentId ?? draft.linerAlignments[0]!.id;
    const activeLineId = draft.activeLineId ?? deriveLinerCenterlineId(activeAlignmentId);
    const selectedCrossSectionStation = Number.isFinite(draft.selectedCrossSectionStation)
      ? draft.selectedCrossSectionStation
      : draft.stationDefinition.explicitStations?.[0] ?? 0;
    return {
      id: alignment.id,
      linerModelId: alignment.linerModelId,
      coordinatePolicyId: alignment.coordinatePolicyId,
      alignments: structuredClone(draft.linerAlignments),
      activeAlignmentId,
      activeLineId,
      ...(draft.measuredGrid ? { measuredGrid: draft.measuredGrid } : {}),
      selectedCrossSectionStation,
      ...(draft.drawingSettings ? { drawingSettings: structuredClone(draft.drawingSettings) } : {}),
      generationSettings: {
        defaultMemberGroupKey: "default",
        connectivityMode: "grid_full",
      },
      sampling: {
        display: {
          maxChordLength: draft.sampleInterval ?? 0.5,
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
          stationIntervalFallback: draft.sampleInterval ?? 0.25,
        },
      },
    };
  }

  const totalLength = totalAlignmentLength(alignment);
  const stationInterval = draft.sampleInterval ?? draft.stationDefinition.interval;
  const fallbackOffsetLines = buildOffsetLines(draft.offsets ?? [0], alignment.id);
  const crossSections = draft.crossSections?.length
    ? draft.crossSections
    : [
        {
          id: alignment.id ? `CS-${alignment.id}` : "CS-default",
          name: "Default",
          offsetLines: fallbackOffsetLines,
        },
      ];
  const defaultTemplate = crossSections[0];
  const offsetLines = defaultTemplate?.offsetLines ?? fallbackOffsetLines;
  const z = draft.z ?? 0;
  const verticalAlignment = draft.verticalAlignment ?? {
    id: alignment.id ? `VA-${alignment.id}` : "VA-default",
    elements: [
      {
        type: "grade" as const,
        id: "VG-default",
        startStation: 0,
        endStation: totalLength,
        startElevation: z,
        grade: 0,
        length: totalLength,
      },
    ],
  };
  const crossSlopeIntervals = draft.crossSlopeIntervals?.length
    ? structuredClone(draft.crossSlopeIntervals)
    : buildDefaultCrossSlopeIntervals(draft, totalLength);
  const selectedCrossSectionStation = Number.isFinite(draft.selectedCrossSectionStation)
    ? draft.selectedCrossSectionStation
    : draft.stationDefinition.explicitStations?.[0] ?? 0;

  const crossSectionTemplateIds = new Set(crossSections.map((section) => section.id));
  const canPreserveGridDefinitions =
    Array.isArray(draft.gridDefinitions)
    && draft.gridDefinitions.length > 0
    && draft.gridDefinitions.every((definition) =>
      crossSectionTemplateIds.has(definition.crossSectionTemplateId),
    );
  const gridDefinitions = canPreserveGridDefinitions
    ? structuredClone(draft.gridDefinitions!)
    : [
        {
          id: "GRID-default",
          crossSectionTemplateId: defaultTemplate?.id ?? (alignment.id ? `CS-${alignment.id}` : "CS-default"),
          stationRange: {
            startPhysicalDistance: 0,
            endPhysicalDistance: totalLength,
          },
          stationInterval,
          offsetLineIds: offsetLines.map((line) => line.id),
        },
      ];

  const bundle: AlignmentBundleDraft = {
    id: alignment.id,
    name: alignment.id,
    enabled: true,
    sortIndex: 0,
    alignment: toHorizontalAlignmentDraft(alignment),
    stationDefinition: draft.stationDefinition,
    verticalAlignment,
    crossSections,
    crossSlopeIntervals,
    gridDefinitions,
    spans: draft.spans?.length ? structuredClone(draft.spans) : [],
    piers: draft.piers?.length ? structuredClone(draft.piers) : [],
    ...(draft.widthChangePoints?.length
      ? { widthChangePoints: structuredClone(draft.widthChangePoints) }
      : {}),
  };

  return {
    id: alignment.id,
    linerModelId: alignment.linerModelId,
    coordinatePolicyId: alignment.coordinatePolicyId,
    alignments: [bundle],
    activeAlignmentId: alignment.id,
    activeLineId: deriveLinerCenterlineId(alignment.id),
    ...(draft.measuredGrid ? { measuredGrid: draft.measuredGrid } : {}),
    selectedCrossSectionStation,
    ...(draft.drawingSettings ? { drawingSettings: structuredClone(draft.drawingSettings) } : {}),
    generationSettings: {
      defaultMemberGroupKey: "default",
      connectivityMode: "grid_full",
    },
    sampling: {
      display: {
        maxChordLength: draft.sampleInterval ?? 0.5,
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
        stationIntervalFallback: draft.sampleInterval ?? 0.25,
      },
    },
  };
}

/**
 * Migrates legacy liner metadata or returns an existing vNext domain draft.
 * Does not mutate the source metadata object.
 */
export function migrateLinerDraftToVNext(metadata: unknown): MigrateLinerDraftToVNextResult {
  if (!isPlainObject(metadata)) {
    return {
      ok: false,
      domainDraft: null,
      diagnostics: [schemaInvalid("/liner", "liner metadata must be an object.")],
    };
  }

  const draftSchemaVersion = metadata.draftSchemaVersion;
  const domainDraft = metadata.domainDraft;
  const legacyDraft = metadata.draft;

  if (typeof draftSchemaVersion === "string" && isSupportedVersion(draftSchemaVersion)) {
    if (isLinerDomainDraftVNext(domainDraft)) {
      return {
        ok: true,
        domainDraft: normalizeDomainDraftFromMetadata(domainDraft),
        diagnostics: [],
      };
    }
    return {
      ok: false,
      domainDraft: null,
      diagnostics: [
        schemaInvalid("/liner/domainDraft", `domainDraft is required for draftSchemaVersion ${draftSchemaVersion}.`),
      ],
    };
  }

  if (draftSchemaVersion !== undefined && draftSchemaVersion !== LINER_DRAFT_SCHEMA_VERSION) {
    return {
      ok: false,
      domainDraft: null,
      diagnostics: [
        schemaInvalid(
          "/liner/draftSchemaVersion",
          `unsupported draftSchemaVersion "${String(draftSchemaVersion)}".`,
        ),
      ],
    };
  }

  if (legacyDraft === undefined) {
    return {
      ok: false,
      domainDraft: null,
      diagnostics: [schemaInvalid("/liner/draft", "liner draft is missing.")],
    };
  }

  if (isPlainObject(legacyDraft) && "alignments" in legacyDraft) {
    if (!isLinerDomainDraftVNext(legacyDraft)) {
      return {
        ok: false,
        domainDraft: null,
        diagnostics: [
          schemaInvalid("/liner/draft/alignments", "malformed multi-alignment draft."),
        ],
      };
    }
    return {
      ok: true,
      domainDraft: normalizeDomainDraftFromMetadata(legacyDraft),
      diagnostics: [],
    };
  }

  if (isPlainObject(legacyDraft) && Array.isArray(legacyDraft.alignment)) {
    return {
      ok: false,
      domainDraft: null,
      diagnostics: [
        schemaInvalid("/liner/draft/alignment", "multiple alignment drafts are not supported."),
      ],
    };
  }

  if (Array.isArray(legacyDraft)) {
    return {
      ok: false,
      domainDraft: null,
      diagnostics: [
        schemaInvalid("/liner/draft", "legacy free-form draft is not supported for migration."),
      ],
    };
  }

  if (!isFixedZDraft(legacyDraft)) {
    return {
      ok: false,
      domainDraft: null,
      diagnostics: [
        schemaInvalid(
          "/liner/draft",
          "legacy draft is not a supported v0.1 fixed-z draft for migration.",
        ),
      ],
    };
  }

  return {
    ok: true,
    domainDraft: migrateFixedZDraftToVNext(legacyDraft),
    diagnostics: [],
  };
}

/**
 * Applies backward-compatible normalization for persisted liner fields.
 * Projects without liner metadata are returned unchanged.
 */
export function migrateProjectLinerExtension<T extends ProjectLike>(project: T): T {
  if (project.liner === undefined && project.linerTrace === undefined) {
    return project;
  }

  if (project.linerTrace === undefined) {
    return project;
  }

  if (!Array.isArray(project.linerTrace)) {
    return project;
  }

  return {
    ...project,
    linerTrace: [...project.linerTrace],
  };
}

/**
 * Ensures linerTrace exists as an empty array when liner metadata is present.
 * Old projects without either field remain unchanged.
 */
export function ensureProjectLinerTraceArray<T extends ProjectLike>(project: T): T {
  if (project.liner === undefined) {
    return project;
  }
  if (project.linerTrace !== undefined) {
    return project;
  }
  return {
    ...project,
    linerTrace: [],
  };
}
