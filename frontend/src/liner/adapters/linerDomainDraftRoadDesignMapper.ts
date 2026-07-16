import {
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
  ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
  type JsonValue,
} from "../../contracts";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import { deriveStableUuid } from "../../contracts/legacy/idStability";
import type { Extensions } from "../../contracts/extensions";
import { REVISION_METADATA_SCHEMA_VERSION, requireRevisionId } from "../../contracts/revision";
import {
  ROAD_DESIGN_DOCUMENT_KIND,
  validateRoadDesignDocument,
  type RoadAlignmentEntry,
  type RoadBridgeEntry,
  type RoadCrossSectionEntry,
  type RoadDesignDocument,
  type RoadProfileEntry,
  type RoadStationingEntry,
} from "../../contracts/roadDesignDocument";
import { requireStableIdNamespace, type StableEntityId } from "../../contracts/stableEntityId";
import { UNIT_CONTEXT_SCHEMA_VERSION } from "../../contracts/unitContext";
import { hasValidationErrors } from "../../contracts/validation";
import type { UuidString } from "../../contracts/uuid";
import type { LinerDomainDraftVNext } from "../schema/types";

export const LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY =
  "spacer.liner/domain-draft-vnext-geometry" as const;
export const LINER_DOMAIN_DRAFT_MAPPER_ID = "spacer.liner/domain-draft-road-design-mapper" as const;
export const LINER_DOMAIN_DRAFT_MAPPER_VERSION = "0.1.0" as const;
export const LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION = "0.1.0" as const;

const ROAD_NAMESPACE = requireStableIdNamespace("road.geometry");

export interface LinerDomainDraftGeometryPayload {
  readonly payloadVersion: typeof LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION;
  readonly domainDraft: LinerDomainDraftVNext;
}

export interface LinerDomainDraftRoadDesignMapperOptions {
  readonly createdAt?: string;
  readonly revisionId?: number;
}

export type DomainDraftRoadDesignMapResult =
  | { readonly ok: true; readonly document: RoadDesignDocument }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

export type RoadDesignDomainDraftMapResult =
  | { readonly ok: true; readonly domainDraft: LinerDomainDraftVNext }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

function diagnostic(message: string): { ok: false; diagnostics: readonly string[] } {
  return { ok: false, diagnostics: [message] };
}

function requireNonEmptyString(value: string, label: string): string | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }
  return value;
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
  if (Array.isArray(value)) {
    const mapped: JsonValue[] = [];
    for (const entry of value) {
      const child = mapAsJsonValue(entry);
      if (child === undefined) {
        return undefined;
      }
      mapped.push(child);
    }
    return mapped;
  }
  if (typeof value === "object" && value !== null) {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLinerDomainDraftGeometryPayload(value: unknown): value is LinerDomainDraftGeometryPayload {
  if (!isPlainObject(value)) {
    return false;
  }
  return (
    value.payloadVersion === LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION
    && isPlainObject(value.domainDraft)
    && typeof value.domainDraft.id === "string"
    && typeof value.domainDraft.linerModelId === "string"
    && typeof value.domainDraft.coordinatePolicyId === "string"
    && isPlainObject(value.domainDraft.alignment)
    && isPlainObject(value.domainDraft.stationDefinition)
    && isPlainObject(value.domainDraft.verticalAlignment)
    && Array.isArray(value.domainDraft.crossSections)
    && Array.isArray(value.domainDraft.gridDefinitions)
    && isPlainObject(value.domainDraft.generationSettings)
    && isPlainObject(value.domainDraft.sampling)
  );
}

export function deriveLinerDomainDraftDocumentId(domainDraft: LinerDomainDraftVNext): UuidString {
  return deriveStableUuid("liner.domain-draft.document", domainDraft.id);
}

export function deriveLinerAlignmentEntityId(alignmentId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.alignment", alignmentId);
}

export function deriveLinerProfileEntityId(profileId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.profile", profileId);
}

export function deriveLinerCrossSectionEntityId(crossSectionId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.cross-section", crossSectionId);
}

export function deriveLinerStationingEntityId(domainDraftId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.stationing", domainDraftId);
}

export function deriveLinerBridgeEntityId(spanId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.bridge", spanId);
}

export function deriveLinerCoordinateContextId(domainDraftId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.coordinate-context", `${domainDraftId}:crs`);
}

export function deriveLinerUnitContextId(domainDraftId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.unit-context", `${domainDraftId}:units`);
}

function validateDomainDraftForMapping(domainDraft: LinerDomainDraftVNext): readonly string[] {
  const issues: string[] = [];
  if (requireNonEmptyString(domainDraft.id, "id") === undefined) {
    issues.push("domainDraft.id is required.");
  }
  if (requireNonEmptyString(domainDraft.alignment.id, "alignment.id") === undefined) {
    issues.push("domainDraft.alignment.id is required.");
  }
  if (requireNonEmptyString(domainDraft.verticalAlignment.id, "verticalAlignment.id") === undefined) {
    issues.push("domainDraft.verticalAlignment.id is required.");
  }
  if (domainDraft.crossSections.length === 0) {
    issues.push("domainDraft.crossSections must contain at least one entry.");
  }
  for (const [index, crossSection] of domainDraft.crossSections.entries()) {
    if (requireNonEmptyString(crossSection.id, `crossSections[${index}].id`) === undefined) {
      issues.push(`crossSections[${index}].id is required.`);
    }
  }
  return issues;
}

function buildGeometryPayload(domainDraft: LinerDomainDraftVNext): LinerDomainDraftGeometryPayload {
  return {
    payloadVersion: LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION,
    domainDraft: structuredClone(domainDraft),
  };
}

export function domainDraftToRoadDesignDocument(
  domainDraft: LinerDomainDraftVNext,
  options: LinerDomainDraftRoadDesignMapperOptions = {},
): DomainDraftRoadDesignMapResult {
  const validationIssues = validateDomainDraftForMapping(domainDraft);
  if (validationIssues.length > 0) {
    return { ok: false, diagnostics: validationIssues };
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  const revisionId = requireRevisionId(options.revisionId ?? 1);
  const documentId = deriveLinerDomainDraftDocumentId(domainDraft);
  const contextId = deriveLinerCoordinateContextId(domainDraft.id);
  const alignmentId = deriveLinerAlignmentEntityId(domainDraft.alignment.id);
  const profileId = deriveLinerProfileEntityId(domainDraft.verticalAlignment.id);
  const stationingId = deriveLinerStationingEntityId(domainDraft.id);

  const alignments: RoadAlignmentEntry[] = [
    {
      entityId: alignmentId,
      coordinateContextId: contextId,
      label: domainDraft.alignment.id,
    },
  ];

  const stationingEntries: RoadStationingEntry[] = [
    {
      entityId: stationingId,
      alignmentId,
      originStation: domainDraft.stationDefinition.originDisplayedStation,
    },
  ];

  const profiles: RoadProfileEntry[] = [
    {
      entityId: profileId,
      alignmentId,
      label: domainDraft.verticalAlignment.id,
    },
  ];

  const crossSections: RoadCrossSectionEntry[] = domainDraft.crossSections.map((template) => ({
    entityId: deriveLinerCrossSectionEntityId(template.id),
    profileId,
    label: template.name || template.id,
  }));

  const bridges: RoadBridgeEntry[] = domainDraft.spans.map((span) => ({
    entityId: deriveLinerBridgeEntityId(span.id),
    alignmentId,
    label: span.id,
  }));

  const stableIdRegistry: StableEntityId[] = [
    { namespace: ROAD_NAMESPACE, id: alignmentId, entityKind: "alignment" },
    { namespace: ROAD_NAMESPACE, id: stationingId, entityKind: "stationing" },
    { namespace: ROAD_NAMESPACE, id: profileId, entityKind: "profile" },
    ...crossSections.map((entry) => ({
      namespace: ROAD_NAMESPACE,
      id: entry.entityId,
      entityKind: "cross-section" as const,
    })),
    ...bridges.map((entry) => ({
      namespace: ROAD_NAMESPACE,
      id: entry.entityId,
      entityKind: "bridge" as const,
    })),
  ];

  const geometryPayload = mapAsJsonValue(buildGeometryPayload(domainDraft));
  if (geometryPayload === undefined) {
    return diagnostic("domainDraft geometry payload contains non-JSON values.");
  }

  const extensions: Extensions = {
    [LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY]: {
      json: geometryPayload,
    },
  };

  const validationRefId = deriveStableUuid(
    "liner.domain-draft.validation-ref",
    `${domainDraft.id}:validation`,
  );
  const placeholderChecksum = computeContentChecksum({
    documentKind: ROAD_DESIGN_DOCUMENT_KIND,
    documentId,
    revisionId,
  });

  const draftWithoutChecksum = {
    schemaId: ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
    schemaVersion: ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
    documentKind: ROAD_DESIGN_DOCUMENT_KIND,
    documentId,
    revisionId,
    provenance: {
      createdAt,
      createdBy: { actorId: LINER_DOMAIN_DRAFT_MAPPER_ID, actorType: "tool" as const },
      producer: {
        toolId: LINER_DOMAIN_DRAFT_MAPPER_ID,
        toolVersion: LINER_DOMAIN_DRAFT_MAPPER_VERSION,
        algorithmVersion: LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION,
      },
    },
    coordinateContexts: [
      {
        schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
        contextId,
        referenceType: "project" as const,
        referenceName: domainDraft.coordinatePolicyId,
        origin: { x: 0, y: 0, z: 0 },
        axisOrder: ["x", "y", "z"] as const,
        axisDirections: { x: "+x" as const, y: "+y" as const, z: "+z" as const },
        handedness: "right" as const,
        verticalAxis: "z" as const,
        orientation: {
          rotations: [0, 0, 0] as const,
          rotationOrder: "xyz" as const,
          rotationConvention: "intrinsic" as const,
        },
        transformToCanonical: {
          transformVersion: "liner-domain-draft-v1",
          status: "unknown" as const,
        },
        angleUnit: "rad" as const,
        confidenceStatus: "unknown" as const,
        stationConvention: {
          tangentDirection: "+x" as const,
          offsetSign: "right_positive" as const,
          elevationSign: "up_positive" as const,
        },
      },
    ],
    unitContext: {
      schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
      contextId: deriveLinerUnitContextId(domainDraft.id),
      length: "m" as const,
      angle: "rad" as const,
      conversionVersion: "liner-domain-draft-si-v1",
      signConventions: {
        crossfall: "right_down_positive" as const,
        rotation: "counterclockwise_positive" as const,
      },
    },
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
    topologyCapability: { state: "absent" as const },
    bridgeGeometryCapability: { state: "absent" as const },
    ldistCapability: { state: "absent" as const },
    haunchCapability: { state: "absent" as const },
    hosoCapability: { state: "absent" as const },
    drawingCapability: { state: "absent" as const },
  };

  const contentChecksum = computeContentChecksum(draftWithoutChecksum);
  const document: RoadDesignDocument = {
    ...draftWithoutChecksum,
    contentChecksum,
    revision: {
      schemaVersion: REVISION_METADATA_SCHEMA_VERSION,
      documentId,
      revisionId,
      createdAt,
      contentChecksum,
      reason: "liner-domain-draft-mapper",
      tool: {
        toolId: LINER_DOMAIN_DRAFT_MAPPER_ID,
        toolVersion: LINER_DOMAIN_DRAFT_MAPPER_VERSION,
      },
    },
  };

  const validation = validateRoadDesignDocument(document);
  if (hasValidationErrors(validation)) {
    return {
      ok: false,
      diagnostics: validation.issues.map((issue) => issue.message),
    };
  }

  return { ok: true, document };
}

export function roadDesignDocumentToDomainDraft(
  document: RoadDesignDocument,
): RoadDesignDomainDraftMapResult {
  const validation = validateRoadDesignDocument(document);
  if (hasValidationErrors(validation)) {
    return {
      ok: false,
      diagnostics: validation.issues.map((issue) => issue.message),
    };
  }

  const extension = document.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
  if (extension?.json === undefined) {
    return diagnostic(
      `RoadDesignDocument is missing required extension "${LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY}".`,
    );
  }

  if (!isLinerDomainDraftGeometryPayload(extension.json)) {
    return diagnostic("Liner domain-draft geometry extension payload is invalid.");
  }

  const domainDraft = structuredClone(extension.json.domainDraft);
  const mappingIssues = validateDomainDraftForMapping(domainDraft);
  if (mappingIssues.length > 0) {
    return { ok: false, diagnostics: mappingIssues };
  }

  const expectedDocumentId = deriveLinerDomainDraftDocumentId(domainDraft);
  if (document.documentId !== expectedDocumentId) {
    return diagnostic("RoadDesignDocument documentId does not match the derived liner domain draft id.");
  }

  const expectedAlignmentId = deriveLinerAlignmentEntityId(domainDraft.alignment.id);
  if (document.alignments[0]?.entityId !== expectedAlignmentId) {
    return diagnostic("RoadDesignDocument alignment stable id does not match domainDraft.alignment.id.");
  }

  const expectedProfileId = deriveLinerProfileEntityId(domainDraft.verticalAlignment.id);
  if (document.profiles[0]?.entityId !== expectedProfileId) {
    return diagnostic(
      "RoadDesignDocument profile stable id does not match domainDraft.verticalAlignment.id.",
    );
  }

  const expectedCrossSectionIds = domainDraft.crossSections.map((entry) =>
    deriveLinerCrossSectionEntityId(entry.id),
  );
  const actualCrossSectionIds = document.crossSections.map((entry) => entry.entityId);
  if (actualCrossSectionIds.join("|") !== expectedCrossSectionIds.join("|")) {
    return diagnostic("RoadDesignDocument cross-section stable ids do not match domainDraft.crossSections.");
  }

  return { ok: true, domainDraft };
}
