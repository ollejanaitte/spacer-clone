import {
  ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
  ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
} from "../../contractVersionRegistry";
import {
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  type CoordinateContext,
} from "../../coordinateContext";
import type { Extensions } from "../../extensions";
import type { JsonValue } from "../../jsonValue";
import type { MigrationIdMapping } from "../../migrationRecord";
import type { Provenance } from "../../provenance";
import { REVISION_METADATA_SCHEMA_VERSION, requireRevisionId } from "../../revision";
import {
  ROAD_DESIGN_DOCUMENT_KIND,
  validateRoadDesignDocument,
  type RoadAlignmentEntry,
  type RoadBridgeEntry,
  type RoadCrossSectionEntry,
  type RoadDesignDocument,
  type RoadProfileEntry,
  type RoadStationingEntry,
} from "../../roadDesignDocument";
import { requireStableIdNamespace, type StableEntityId } from "../../stableEntityId";
import { UNIT_CONTEXT_SCHEMA_VERSION, type UnitContext } from "../../unitContext";
import type { UuidString } from "../../uuid";
import {
  createValidationIssue,
  hasValidationErrors,
  type ValidationIssue,
} from "../../validation";
import { computeContentChecksum } from "../checksum";
import { classifyLegacyInput, isPlainLegacyObject } from "../classify";
import { cloneLegacyValue } from "../clone";
import {
  createLegacyAmbiguousCoordinateError,
  createLegacyBrokenIdError,
  createLegacyInvalidShapeError,
  createLegacyMissingVersionError,
  createLegacyUnresolvedReferenceError,
  createLegacyUnsupportedFormatError,
  createLegacyUnsupportedVersionError,
  createLegacyValidationFailedError,
} from "../errors";
import { deriveStableUuid } from "../idStability";
import {
  defaultLegacyAdapterClock,
  LEGACY_ADAPTER_VERSION,
  LEGACY_ROAD_ADAPTER_ID,
  LEGACY_ROAD_FORMAT_ID,
  type LegacyAdapterOptions,
  type LegacyAdapterResult,
} from "../types";

const SUPPORTED_IMPORTER_VERSIONS = ["0.1.0"] as const;
const ROAD_NAMESPACE = requireStableIdNamespace("road.geometry");

interface LegacyImporterBridge {
  readonly id: string;
  readonly name: string;
  readonly spans: readonly unknown[];
  readonly sections: readonly unknown[];
  readonly girderLineSets: readonly unknown[];
  readonly substructure?: unknown;
  readonly alignmentMetadata?: unknown;
}

interface LegacyImporterProject {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly liner: { readonly importerSchemaVersion: string };
  readonly coordinateSystem: {
    readonly horizontal: { readonly datum: string; readonly unit: string };
    readonly vertical: { readonly heightDatum: string; readonly unit: string };
  };
  readonly bridges: readonly LegacyImporterBridge[];
}

function requireNonEmptyString(value: unknown, path: string): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

function parseImporterProject(
  raw: Record<string, unknown>,
):
  | { readonly ok: true; readonly project: LegacyImporterProject }
  | { readonly ok: false; readonly issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const id = requireNonEmptyString(raw.id, "/id");
  const name = requireNonEmptyString(raw.name, "/name");
  const createdAt = requireNonEmptyString(raw.createdAt, "/createdAt");
  const updatedAt = requireNonEmptyString(raw.updatedAt, "/updatedAt");

  if (id === undefined) {
    issues.push(
      createValidationIssue({
        code: "LEGACY_ROAD_ID_MISSING",
        severity: "error",
        message: "Importer project id is required.",
        path: "/id",
      }),
    );
  }
  if (name === undefined) {
    issues.push(
      createValidationIssue({
        code: "LEGACY_ROAD_NAME_MISSING",
        severity: "error",
        message: "Importer project name is required.",
        path: "/name",
      }),
    );
  }
  if (createdAt === undefined || updatedAt === undefined) {
    issues.push(
      createValidationIssue({
        code: "LEGACY_ROAD_TIMESTAMP_MISSING",
        severity: "error",
        message: "Importer project createdAt/updatedAt are required.",
        path: "/createdAt",
      }),
    );
  }

  if (!isPlainLegacyObject(raw.liner)) {
    issues.push(
      createValidationIssue({
        code: "LEGACY_ROAD_LINER_MISSING",
        severity: "error",
        message: "Importer liner envelope is required.",
        path: "/liner",
      }),
    );
  }

  if (!isPlainLegacyObject(raw.coordinateSystem)) {
    issues.push(
      createValidationIssue({
        code: "LEGACY_ROAD_COORDINATE_SYSTEM_MISSING",
        severity: "error",
        message: "Importer coordinateSystem is required.",
        path: "/coordinateSystem",
      }),
    );
  }

  if (!Array.isArray(raw.bridges)) {
    issues.push(
      createValidationIssue({
        code: "LEGACY_ROAD_BRIDGES_MISSING",
        severity: "error",
        message: "Importer bridges must be an array.",
        path: "/bridges",
      }),
    );
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const liner = raw.liner as Record<string, unknown>;
  const coordinateSystem = raw.coordinateSystem as Record<string, unknown>;
  const horizontal = isPlainLegacyObject(coordinateSystem.horizontal)
    ? coordinateSystem.horizontal
    : undefined;
  const vertical = isPlainLegacyObject(coordinateSystem.vertical)
    ? coordinateSystem.vertical
    : undefined;

  if (horizontal === undefined || vertical === undefined) {
    return {
      ok: false,
      issues: [
        createValidationIssue({
          code: "LEGACY_ROAD_COORDINATE_SYSTEM_INVALID",
          severity: "error",
          message: "coordinateSystem.horizontal and vertical are required.",
          path: "/coordinateSystem",
        }),
      ],
    };
  }

  const bridges: LegacyImporterBridge[] = [];
  for (const [index, entry] of (raw.bridges as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      issues.push(
        createValidationIssue({
          code: "LEGACY_ROAD_BRIDGE_INVALID",
          severity: "error",
          message: "Each bridge must be an object.",
          path: `/bridges/${index}`,
        }),
      );
      continue;
    }
    const bridgeId = requireNonEmptyString(entry.id, `/bridges/${index}/id`);
    const bridgeName = requireNonEmptyString(entry.name, `/bridges/${index}/name`);
    if (bridgeId === undefined || bridgeName === undefined) {
      issues.push(
        createValidationIssue({
          code: "LEGACY_ROAD_BRIDGE_ID_MISSING",
          severity: "error",
          message: "Each bridge requires non-empty id and name.",
          path: `/bridges/${index}`,
        }),
      );
      continue;
    }
    if (!Array.isArray(entry.spans) || !Array.isArray(entry.sections) || !Array.isArray(entry.girderLineSets)) {
      issues.push(
        createValidationIssue({
          code: "LEGACY_ROAD_BRIDGE_COLLECTIONS_INVALID",
          severity: "error",
          message: "Bridge spans, sections, and girderLineSets must be arrays.",
          path: `/bridges/${index}`,
        }),
      );
      continue;
    }
    bridges.push({
      id: bridgeId,
      name: bridgeName,
      spans: entry.spans,
      sections: entry.sections,
      girderLineSets: entry.girderLineSets,
      ...(entry.substructure !== undefined ? { substructure: entry.substructure } : {}),
      ...(entry.alignmentMetadata !== undefined
        ? { alignmentMetadata: entry.alignmentMetadata }
        : {}),
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const horizontalDatum = requireNonEmptyString(horizontal.datum, "/coordinateSystem/horizontal/datum");
  const verticalDatum = requireNonEmptyString(
    vertical.heightDatum,
    "/coordinateSystem/vertical/heightDatum",
  );
  if (horizontalDatum === undefined || verticalDatum === undefined) {
    return {
      ok: false,
      issues: [
        createValidationIssue({
          code: "LEGACY_ROAD_DATUM_MISSING",
          severity: "error",
          message: "Horizontal datum and vertical heightDatum are required.",
          path: "/coordinateSystem",
        }),
      ],
    };
  }

  return {
    ok: true,
    project: {
      id: id!,
      name: name!,
      createdAt: createdAt!,
      updatedAt: updatedAt!,
      liner: {
        importerSchemaVersion: String(liner.importerSchemaVersion ?? ""),
      },
      coordinateSystem: {
        horizontal: { datum: horizontalDatum, unit: String(horizontal.unit ?? "") },
        vertical: { heightDatum: verticalDatum, unit: String(vertical.unit ?? "") },
      },
      bridges,
    },
  };
}

function mapAsJsonValue(value: unknown): JsonValue | undefined {
  if (value === null) {
    return null;
  }
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return value as string | boolean;
  }
  if (valueType === "number" && Number.isFinite(value)) {
    return value as number;
  }
  if (valueType === "undefined") {
    return undefined;
  }
  if (Array.isArray(value)) {
    const mapped: JsonValue[] = [];
    for (const entry of value) {
      if (entry === undefined) {
        return undefined;
      }
      const child = mapAsJsonValue(entry);
      if (child === undefined) {
        return undefined;
      }
      mapped.push(child);
    }
    return mapped;
  }
  if (isPlainLegacyObject(value)) {
    const mapped: { [key: string]: JsonValue } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) {
        continue;
      }
      const child = mapAsJsonValue(entry);
      if (child === undefined) {
        return undefined;
      }
      mapped[key] = child;
    }
    return mapped;
  }
  return undefined;
}

function importerProfileLabel(project: LegacyImporterProject): string {
  for (const bridge of project.bridges) {
    const metadata = bridge.alignmentMetadata;
    if (!isPlainLegacyObject(metadata)) {
      continue;
    }
    const profile = metadata.profile;
    if (!isPlainLegacyObject(profile) || !Array.isArray(profile.elements)) {
      continue;
    }
    if (profile.elements.length > 0) {
      return `${bridge.name} vertical (${profile.elements.length} elements)`;
    }
  }
  return "Importer profile stub";
}

function buildImporterCrossSections(
  project: LegacyImporterProject,
  profileId: UuidString,
  defaultCrossSectionId: UuidString,
  idMappings: MigrationIdMapping[],
): RoadCrossSectionEntry[] {
  const entries: RoadCrossSectionEntry[] = [];

  for (const bridge of project.bridges) {
    const metadata = bridge.alignmentMetadata;
    if (!isPlainLegacyObject(metadata)) {
      continue;
    }
    const crossSlope = metadata.crossSlope;
    if (!isPlainLegacyObject(crossSlope) || !Array.isArray(crossSlope.definitions)) {
      continue;
    }

    for (const [index, definition] of crossSlope.definitions.entries()) {
      if (!isPlainLegacyObject(definition)) {
        continue;
      }
      const sourceId =
        typeof definition.id === "string" && definition.id.trim().length > 0
          ? definition.id
          : `${bridge.id}:cross-slope:${index}`;
      const entityId = deriveStableUuid(
        "legacy.road.cross-section",
        `${project.id}:${sourceId}`,
      );
      idMappings.push({
        sourceId,
        targetId: entityId,
        disposition: "committed",
      });
      const station = typeof definition.station === "number" ? definition.station : undefined;
      entries.push({
        entityId,
        profileId,
        label: station !== undefined ? `CrossSlope @ ${station}` : sourceId,
      });
    }
  }

  if (entries.length === 0) {
    return [
      {
        entityId: defaultCrossSectionId,
        profileId,
        label: "Importer cross-section stub",
      },
    ];
  }

  return entries;
}

/**
 * Adapts an evidenced JIP LINER importer project (schema 0.1.0) into RoadDesignDocument v0.1.0.
 * Geometry payloads that have no home in the skeleton contract are preserved under extensions.
 */
export function adaptLegacyRoadInput(
  rawInput: unknown,
  options: LegacyAdapterOptions = {},
): LegacyAdapterResult<RoadDesignDocument> {
  const diagnostics: ValidationIssue[] = [];
  const notes: {
    readonly jsonPointer: string;
    readonly message: string;
    readonly criticality?: "critical" | "optional" | "informational";
  }[] = [];
  const provenanceNotes: {
    readonly path: string;
    readonly message: string;
    readonly code?: string;
  }[] = [];
  const idMappings: MigrationIdMapping[] = [];

  const sourceCopy = cloneLegacyValue(rawInput);
  const classification = classifyLegacyInput(sourceCopy);

  if (classification.formatId !== LEGACY_ROAD_FORMAT_ID) {
    return {
      ok: false,
      error: createLegacyUnsupportedFormatError(
        "Input is not a supported legacy road (JIP LINER importer) document.",
        classification.hints,
      ),
      diagnostics,
    };
  }

  if (classification.sourceVersion === undefined) {
    return {
      ok: false,
      error: createLegacyMissingVersionError(LEGACY_ROAD_FORMAT_ID),
      diagnostics: [
        createValidationIssue({
          code: "LEGACY_ROAD_VERSION_MISSING",
          severity: "error",
          message: "liner.importerSchemaVersion is required; missing versions are not defaulted.",
          path: "/liner/importerSchemaVersion",
        }),
      ],
    };
  }

  if (
    !(SUPPORTED_IMPORTER_VERSIONS as readonly string[]).includes(classification.sourceVersion)
  ) {
    return {
      ok: false,
      error: createLegacyUnsupportedVersionError(
        LEGACY_ROAD_FORMAT_ID,
        classification.sourceVersion,
        SUPPORTED_IMPORTER_VERSIONS,
      ),
      diagnostics,
    };
  }

  if (!isPlainLegacyObject(sourceCopy)) {
    return {
      ok: false,
      error: createLegacyInvalidShapeError(LEGACY_ROAD_FORMAT_ID, "Legacy road input must be an object."),
      diagnostics,
    };
  }

  const parsed = parseImporterProject(sourceCopy);
  if (!parsed.ok) {
    return {
      ok: false,
      error: createLegacyInvalidShapeError(
        LEGACY_ROAD_FORMAT_ID,
        "Legacy road importer project shape is invalid.",
      ),
      diagnostics: parsed.issues,
    };
  }

  const project = parsed.project;
  if (project.liner.importerSchemaVersion !== classification.sourceVersion) {
    return {
      ok: false,
      error: createLegacyInvalidShapeError(
        LEGACY_ROAD_FORMAT_ID,
        "Importer schema version mismatch after parse.",
      ),
      diagnostics,
    };
  }

  const horizontalUnit = project.coordinateSystem.horizontal.unit;
  const verticalUnit = project.coordinateSystem.vertical.unit;
  if (horizontalUnit !== "m" || verticalUnit !== "m") {
    return {
      ok: false,
      error: createLegacyAmbiguousCoordinateError(
        LEGACY_ROAD_FORMAT_ID,
        `Importer coordinate units must be meters; got horizontal="${horizontalUnit}", vertical="${verticalUnit}".`,
        "/coordinateSystem",
      ),
      diagnostics: [
        createValidationIssue({
          code: "LEGACY_ROAD_UNIT_UNSUPPORTED",
          severity: "error",
          message: "Only unit \"m\" is evidenced for importer coordinateSystem.",
          path: "/coordinateSystem",
        }),
      ],
    };
  }

  const bridgeIds = new Set<string>();
  for (const [index, bridge] of project.bridges.entries()) {
    if (bridgeIds.has(bridge.id)) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(
          LEGACY_ROAD_FORMAT_ID,
          `/bridges/${index}/id`,
          `Duplicate bridge id "${bridge.id}".`,
        ),
        diagnostics,
      };
    }
    bridgeIds.add(bridge.id);

    for (const [spanIndex, span] of bridge.spans.entries()) {
      if (!isPlainLegacyObject(span)) {
        return {
          ok: false,
          error: createLegacyInvalidShapeError(
            LEGACY_ROAD_FORMAT_ID,
            "Bridge span must be an object.",
            `/bridges/${index}/spans/${spanIndex}`,
          ),
          diagnostics,
        };
      }
      const girderLineSetId = span.girderLineSetId;
      if (typeof girderLineSetId === "string" && girderLineSetId.trim().length > 0) {
        const exists = bridge.girderLineSets.some(
          (set) => isPlainLegacyObject(set) && set.id === girderLineSetId,
        );
        if (!exists) {
          return {
            ok: false,
            error: createLegacyUnresolvedReferenceError(
              LEGACY_ROAD_FORMAT_ID,
              `/bridges/${index}/spans/${spanIndex}/girderLineSetId`,
              girderLineSetId,
            ),
            diagnostics,
          };
        }
      }
    }

    for (const [sectionIndex, section] of bridge.sections.entries()) {
      if (!isPlainLegacyObject(section)) {
        return {
          ok: false,
          error: createLegacyInvalidShapeError(
            LEGACY_ROAD_FORMAT_ID,
            "Bridge section must be an object.",
            `/bridges/${index}/sections/${sectionIndex}`,
          ),
          diagnostics,
        };
      }
      const sectionBridgeId = section.bridgeId;
      if (typeof sectionBridgeId === "string" && sectionBridgeId !== bridge.id) {
        return {
          ok: false,
          error: createLegacyUnresolvedReferenceError(
            LEGACY_ROAD_FORMAT_ID,
            `/bridges/${index}/sections/${sectionIndex}/bridgeId`,
            sectionBridgeId,
          ),
          diagnostics,
        };
      }
      const spanId = section.spanId;
      if (typeof spanId === "string" && spanId.trim().length > 0) {
        const exists = bridge.spans.some(
          (span) => isPlainLegacyObject(span) && span.id === spanId,
        );
        if (!exists) {
          return {
            ok: false,
            error: createLegacyUnresolvedReferenceError(
              LEGACY_ROAD_FORMAT_ID,
              `/bridges/${index}/sections/${sectionIndex}/spanId`,
              spanId,
            ),
            diagnostics,
          };
        }
      }
    }
  }

  const clock = options.clock ?? defaultLegacyAdapterClock();
  const createdAt = options.createdAt ?? clock.now();

  const documentId = deriveStableUuid("legacy.road.document", project.id);
  idMappings.push({
    sourceId: project.id,
    targetId: documentId,
    disposition: "committed",
  });

  const contextId = deriveStableUuid("legacy.road.coordinate-context", `${project.id}:crs`);
  const alignmentId = deriveStableUuid("legacy.road.alignment", `${project.id}:alignment`);
  const stationingId = deriveStableUuid("legacy.road.stationing", `${project.id}:stationing`);
  const profileId = deriveStableUuid("legacy.road.profile", `${project.id}:profile`);
  const crossSectionId = deriveStableUuid(
    "legacy.road.cross-section",
    `${project.id}:cross-section`,
  );

  idMappings.push(
    { sourceId: `${project.id}:alignment`, targetId: alignmentId, disposition: "committed" },
    { sourceId: `${project.id}:stationing`, targetId: stationingId, disposition: "committed" },
    { sourceId: `${project.id}:profile`, targetId: profileId, disposition: "committed" },
    {
      sourceId: `${project.id}:cross-section`,
      targetId: crossSectionId,
      disposition: "committed",
    },
  );

  const alignments: RoadAlignmentEntry[] = [
    {
      entityId: alignmentId,
      coordinateContextId: contextId,
      label: project.name,
    },
  ];
  const stationingEntries: RoadStationingEntry[] = [
    {
      entityId: stationingId,
      alignmentId,
      originStation: 0,
    },
  ];
  const profiles: RoadProfileEntry[] = [
    {
      entityId: profileId,
      alignmentId,
      label: importerProfileLabel(project),
    },
  ];
  const crossSections = buildImporterCrossSections(
    project,
    profileId,
    crossSectionId,
    idMappings,
  );

  const bridges: RoadBridgeEntry[] = [];
  for (const bridge of project.bridges) {
    const bridgeEntityId = deriveStableUuid("legacy.road.bridge", bridge.id);
    idMappings.push({
      sourceId: bridge.id,
      targetId: bridgeEntityId,
      disposition: "committed",
    });
    bridges.push({
      entityId: bridgeEntityId,
      alignmentId,
      label: bridge.name,
    });
  }

  const stableIdRegistry: StableEntityId[] = [
    { namespace: ROAD_NAMESPACE, id: alignmentId, entityKind: "alignment" },
    { namespace: ROAD_NAMESPACE, id: stationingId, entityKind: "stationing" },
    { namespace: ROAD_NAMESPACE, id: profileId, entityKind: "profile" },
    ...crossSections.map((crossSection) => ({
      namespace: ROAD_NAMESPACE,
      id: crossSection.entityId,
      entityKind: "cross-section" as const,
    })),
    ...bridges.map((bridge) => ({
      namespace: ROAD_NAMESPACE,
      id: bridge.entityId,
      entityKind: "bridge" as const,
    })),
  ];

  const coordinateContext: CoordinateContext = {
    schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
    contextId,
    referenceType: "project",
    referenceName: project.coordinateSystem.horizontal.datum,
    origin: { x: 0, y: 0, z: 0 },
    axisOrder: ["x", "y", "z"],
    axisDirections: { x: "+x", y: "+y", z: "+z" },
    handedness: "right",
    verticalAxis: "z",
    orientation: {
      rotations: [0, 0, 0],
      rotationOrder: "xyz",
      rotationConvention: "intrinsic",
    },
    transformToCanonical: {
      transformVersion: "legacy-importer-unverified-v1",
      status: "unknown",
    },
    horizontalDatum: {
      name: project.coordinateSystem.horizontal.datum,
      status: "unknown",
    },
    verticalDatum: {
      name: project.coordinateSystem.vertical.heightDatum,
      status: "unknown",
    },
    stationConvention: {
      tangentDirection: "+x",
      offsetSign: "right_positive",
      elevationSign: "up_positive",
    },
    angleUnit: "rad",
    confidenceStatus: "unknown",
  };

  provenanceNotes.push({
    path: "/coordinateContexts/0",
    message:
      "Legacy importer CRS authority is unverified; confidenceStatus and transform remain unknown (fail-closed for apply).",
    code: "LEGACY_ROAD_CRS_UNKNOWN",
  });

  const unitContext: UnitContext = {
    schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
    contextId: deriveStableUuid("legacy.road.unit-context", `${project.id}:units`),
    length: "m",
    angle: "rad",
    conversionVersion: "legacy-importer-si-v1",
    signConventions: {
      crossfall: "right_down_positive",
      rotation: "counterclockwise_positive",
    },
  };

  const geometryPayload = mapAsJsonValue({
    bridges: project.bridges,
    coordinateSystem: project.coordinateSystem,
  });
  if (geometryPayload === undefined) {
    return {
      ok: false,
      error: createLegacyInvalidShapeError(
        LEGACY_ROAD_FORMAT_ID,
        "Legacy geometry payload contains non-JSON values.",
      ),
      diagnostics,
    };
  }

  const extensions: Extensions = {
    "spacer.legacy/jip-liner-importer-geometry": {
      json: geometryPayload,
    },
  };
  notes.push({
    jsonPointer: "/extensions/spacer.legacy~1jip-liner-importer-geometry",
    message:
      "Importer spans/sections/girder lines/substructure are preserved in extensions; RoadDesignDocument v0.1.0 is reference/label skeleton only.",
    criticality: "critical",
  });

  const provenance: Provenance = {
    createdAt,
    createdBy: { actorId: LEGACY_ROAD_ADAPTER_ID, actorType: "tool" },
    producer: {
      toolId: LEGACY_ROAD_ADAPTER_ID,
      toolVersion: LEGACY_ADAPTER_VERSION,
      algorithmVersion: classification.sourceVersion,
    },
  };

  const validationRefId = deriveStableUuid("legacy.road.validation-ref", `${project.id}:validation`);
  const placeholderChecksum = computeContentChecksum({
    documentKind: ROAD_DESIGN_DOCUMENT_KIND,
    documentId,
    revisionId: 1,
  });

  const draftWithoutChecksum = {
    schemaId: ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
    schemaVersion: ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
    documentKind: ROAD_DESIGN_DOCUMENT_KIND,
    documentId,
    revisionId: requireRevisionId(1),
    provenance,
    coordinateContexts: [coordinateContext],
    unitContext,
    stableIdRegistry,
    alignments,
    stationing: { entries: stationingEntries },
    profiles,
    crossSections,
    bridges,
    validation: {
      documentKind: "validation-result" as const,
      documentId: validationRefId,
      revisionId: requireRevisionId(1),
      contentChecksum: placeholderChecksum,
    },
    extensions,
    bridgeGeometryCapability: { state: "absent" as const },
  };

  const contentChecksum = computeContentChecksum(draftWithoutChecksum);
  const document: RoadDesignDocument = {
    ...draftWithoutChecksum,
    contentChecksum,
    revision: {
      schemaVersion: REVISION_METADATA_SCHEMA_VERSION,
      documentId,
      revisionId: requireRevisionId(1),
      createdAt,
      contentChecksum,
      reason: "legacy-road-adapter",
      tool: {
        toolId: LEGACY_ROAD_ADAPTER_ID,
        toolVersion: LEGACY_ADAPTER_VERSION,
      },
    },
  };

  const validation = validateRoadDesignDocument(document);
  if (hasValidationErrors(validation)) {
    return {
      ok: false,
      error: createLegacyValidationFailedError(validation),
      diagnostics: [...diagnostics, ...validation.issues],
    };
  }

  return {
    ok: true,
    document,
    formatId: LEGACY_ROAD_FORMAT_ID,
    sourceVersion: classification.sourceVersion,
    adapterId: LEGACY_ROAD_ADAPTER_ID,
    adapterVersion: LEGACY_ADAPTER_VERSION,
    idMappings,
    diagnostics,
    unknownFieldNotes: notes,
    provenanceNotes,
  };
}

export function isLegacyRoadInput(raw: unknown): boolean {
  return classifyLegacyInput(raw).formatId === LEGACY_ROAD_FORMAT_ID;
}
