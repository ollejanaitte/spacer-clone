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
import { validateBridgeLayout } from "../core/bridge/bridgeLayoutEvaluation";
import { LINER_DIAGNOSTIC_CODES } from "../core/diagnostics";
import type {
  AlignmentBundleDraft,
  CrossSectionOffsetLineDraft,
  CrossSectionTemplateDraft,
  LinerDomainDraftVNext,
} from "../schema/types";

export const LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY =
  "spacer.liner/domain-draft-vnext-geometry" as const;
export const LINER_DOMAIN_DRAFT_MAPPER_ID = "spacer.liner/domain-draft-road-design-mapper" as const;
export const LINER_DOMAIN_DRAFT_MAPPER_VERSION = "0.1.0" as const;
export const LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V1 = "0.1.0" as const;
export const LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2 = "0.2.0" as const;
/** @deprecated Use V2 for writes; V1 is accepted on read. */
export const LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION =
  LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2;

const ROAD_NAMESPACE = requireStableIdNamespace("road.geometry");

/** Legacy flat domain draft shape (payload 0.1.0). */
type LegacyFlatDomainDraft = {
  id: string;
  linerModelId: string;
  coordinatePolicyId: string;
  alignment: LinerDomainDraftVNext["alignments"][0]["alignment"];
  stationDefinition: AlignmentBundleDraft["stationDefinition"];
  verticalAlignment: AlignmentBundleDraft["verticalAlignment"];
  crossSections: CrossSectionTemplateDraft[];
  crossSlopeIntervals?: AlignmentBundleDraft["crossSlopeIntervals"];
  gridDefinitions: AlignmentBundleDraft["gridDefinitions"];
  spans: AlignmentBundleDraft["spans"];
  piers: AlignmentBundleDraft["piers"];
  widthChangePoints?: AlignmentBundleDraft["widthChangePoints"];
  measuredGrid?: LinerDomainDraftVNext["measuredGrid"];
  selectedCrossSectionStation?: number;
  drawingSettings?: LinerDomainDraftVNext["drawingSettings"];
  generationSettings: LinerDomainDraftVNext["generationSettings"];
  sampling: LinerDomainDraftVNext["sampling"];
  alignments?: AlignmentBundleDraft[];
  activeAlignmentId?: string;
  activeLineId?: string;
};

export type LinerDomainDraftGeometryPayloadV1 = {
  readonly payloadVersion: typeof LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V1;
  readonly domainDraft: LegacyFlatDomainDraft;
};

export type LinerDomainDraftGeometryPayloadV2 = {
  readonly payloadVersion: typeof LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2;
  readonly domainDraft: LinerDomainDraftVNext;
};

export type LinerDomainDraftGeometryPayload =
  | LinerDomainDraftGeometryPayloadV1
  | LinerDomainDraftGeometryPayloadV2;

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

export function deriveLinerDomainDraftDocumentId(domainDraft: LinerDomainDraftVNext): UuidString {
  return deriveStableUuid("liner.domain-draft.document", domainDraft.id);
}

export function deriveLinerAlignmentEntityId(alignmentId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.alignment", alignmentId);
}

export function deriveLinerCenterlineId(alignmentId: string): string {
  return deriveStableUuid("liner.domain-draft.centerline", alignmentId);
}

export function deriveLinerProfileEntityId(profileId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.profile", profileId);
}

export function deriveLinerCrossSectionEntityId(crossSectionId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.cross-section", crossSectionId);
}

export function deriveLinerStationingEntityId(alignmentId: string): UuidString {
  return deriveStableUuid("liner.domain-draft.stationing", alignmentId);
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

function normalizeOffsetLine(
  line: CrossSectionOffsetLineDraft,
  index: number,
): CrossSectionOffsetLineDraft {
  return {
    ...line,
    enabled: line.enabled ?? true,
    sortIndex: line.sortIndex ?? index,
  };
}

function normalizeCrossSections(crossSections: CrossSectionTemplateDraft[]): CrossSectionTemplateDraft[] {
  return crossSections.map((template) => ({
    ...template,
    offsetLines: template.offsetLines.map((line, index) => normalizeOffsetLine(line, index)),
  }));
}

function bundleFromLegacyFlat(flat: LegacyFlatDomainDraft): AlignmentBundleDraft {
  const alignmentId = flat.alignment.id;
  return {
    id: alignmentId,
    name: alignmentId,
    enabled: true,
    sortIndex: 0,
    alignment: flat.alignment,
    stationDefinition: flat.stationDefinition,
    verticalAlignment: flat.verticalAlignment,
    crossSections: normalizeCrossSections(flat.crossSections),
    crossSlopeIntervals: flat.crossSlopeIntervals,
    gridDefinitions: flat.gridDefinitions,
    spans: flat.spans,
    piers: flat.piers,
    ...(flat.widthChangePoints?.length ? { widthChangePoints: flat.widthChangePoints } : {}),
  };
}

/**
 * Normalizes legacy flat or mixed payloads into the v2 multi-alignment domain draft.
 */
export function normalizeLinerDomainDraft(raw: unknown): LinerDomainDraftVNext | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  if (
    isNonEmptyString(raw.id)
    && isNonEmptyString(raw.linerModelId)
    && isNonEmptyString(raw.coordinatePolicyId)
    && Array.isArray(raw.alignments)
    && raw.alignments.length > 0
    && isPlainObject(raw.generationSettings)
    && isPlainObject(raw.sampling)
  ) {
    const alignments = (raw.alignments as AlignmentBundleDraft[]).map((bundle, index) => ({
      ...bundle,
      name: bundle.name?.trim() || bundle.id,
      enabled: bundle.enabled ?? true,
      sortIndex: bundle.sortIndex ?? index,
      crossSections: normalizeCrossSections(bundle.crossSections ?? []),
    }));
    const activeAlignmentId =
      typeof raw.activeAlignmentId === "string" && raw.activeAlignmentId.length > 0
        ? raw.activeAlignmentId
        : alignments[0]?.id;
    const activeLineId =
      typeof raw.activeLineId === "string" && raw.activeLineId.length > 0
        ? raw.activeLineId
        : activeAlignmentId
          ? deriveLinerCenterlineId(activeAlignmentId)
          : undefined;
    return {
      id: raw.id,
      linerModelId: raw.linerModelId,
      coordinatePolicyId: raw.coordinatePolicyId,
      alignments,
      activeAlignmentId,
      activeLineId,
      ...(raw.measuredGrid ? { measuredGrid: raw.measuredGrid as LinerDomainDraftVNext["measuredGrid"] } : {}),
      ...(raw.selectedCrossSectionStation !== undefined
        ? { selectedCrossSectionStation: raw.selectedCrossSectionStation as number }
        : {}),
      ...(raw.drawingSettings
        ? { drawingSettings: raw.drawingSettings as LinerDomainDraftVNext["drawingSettings"] }
        : {}),
      ...(Array.isArray(raw.ldistJobs)
        ? { ldistJobs: raw.ldistJobs as LinerDomainDraftVNext["ldistJobs"] }
        : {}),
      ...(Array.isArray(raw.haunchDefinitions)
        ? { haunchDefinitions: raw.haunchDefinitions as LinerDomainDraftVNext["haunchDefinitions"] }
        : {}),
      ...(Array.isArray(raw.hosoDefinitions)
        ? { hosoDefinitions: raw.hosoDefinitions as LinerDomainDraftVNext["hosoDefinitions"] }
        : {}),
      generationSettings: raw.generationSettings as LinerDomainDraftVNext["generationSettings"],
      sampling: raw.sampling as unknown as LinerDomainDraftVNext["sampling"],
    };
  }

  if (
    isNonEmptyString(raw.id)
    && isNonEmptyString(raw.linerModelId)
    && isNonEmptyString(raw.coordinatePolicyId)
    && isPlainObject(raw.alignment)
    && isPlainObject(raw.stationDefinition)
    && isPlainObject(raw.verticalAlignment)
    && Array.isArray(raw.crossSections)
    && Array.isArray(raw.gridDefinitions)
    && Array.isArray(raw.spans)
    && Array.isArray(raw.piers)
    && isPlainObject(raw.generationSettings)
    && isPlainObject(raw.sampling)
  ) {
    const flat = raw as LegacyFlatDomainDraft;
    const bundle = bundleFromLegacyFlat(flat);
    const activeAlignmentId = bundle.id;
    return {
      id: flat.id,
      linerModelId: flat.linerModelId,
      coordinatePolicyId: flat.coordinatePolicyId,
      alignments: [bundle],
      activeAlignmentId,
      activeLineId: deriveLinerCenterlineId(activeAlignmentId),
      ...(flat.measuredGrid ? { measuredGrid: flat.measuredGrid } : {}),
      ...(flat.selectedCrossSectionStation !== undefined
        ? { selectedCrossSectionStation: flat.selectedCrossSectionStation }
        : {}),
      ...(flat.drawingSettings ? { drawingSettings: flat.drawingSettings } : {}),
      generationSettings: flat.generationSettings,
      sampling: flat.sampling,
    };
  }

  return null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getActiveAlignmentBundle(
  domainDraft: LinerDomainDraftVNext,
): AlignmentBundleDraft | undefined {
  if (domainDraft.activeAlignmentId) {
    const found = domainDraft.alignments.find((entry) => entry.id === domainDraft.activeAlignmentId);
    if (found) {
      return found;
    }
  }
  return domainDraft.alignments[0];
}

function collectLineIdsForBundle(bundle: AlignmentBundleDraft): Set<string> {
  const ids = new Set<string>();
  ids.add(deriveLinerCenterlineId(bundle.id));
  for (const template of bundle.crossSections) {
    for (const line of template.offsetLines) {
      ids.add(line.id);
    }
  }
  return ids;
}

function detectBaseLineCycle(
  lineIds: Set<string>,
  centerlineId: string,
  baseLineId: string,
  visited: Set<string>,
): boolean {
  if (baseLineId === centerlineId) {
    return false;
  }
  if (visited.has(baseLineId)) {
    return true;
  }
  visited.add(baseLineId);
  return false;
}

function bundleAlignmentTotalLength(bundle: AlignmentBundleDraft): number {
  return bundle.alignment.elements.reduce((total, element) => total + element.length, 0);
}

function bundleBridgeAlignmentLength(bundle: AlignmentBundleDraft): number {
  const elementLength = bundleAlignmentTotalLength(bundle);
  const spanReach = bundle.spans.reduce((max, span) => Math.max(max, span.endPhysicalDistance), 0);
  return Math.max(elementLength, spanReach);
}

function validateBridgeLayoutForBundle(bundle: AlignmentBundleDraft): readonly string[] {
  if (bundle.spans.length === 0 && bundle.piers.length === 0) {
    return [];
  }
  const bridgeIssues = validateBridgeLayout({
    spans: bundle.spans,
    piers: bundle.piers,
    alignmentTotalLength: bundleBridgeAlignmentLength(bundle),
    stationDefinition: bundle.stationDefinition,
    gridPoints: [],
  });
  return bridgeIssues
    .filter((issue) => issue.level === "error")
    .map((issue) => {
      const entity = issue.entityId ? ` (${issue.entityId})` : "";
      return `Bridge layout [${bundle.id}]: ${issue.code}${entity}`;
    });
}

function validateOffsetLineReferences(
  bundle: AlignmentBundleDraft,
): readonly string[] {
  const issues: string[] = [];
  const lineIds = collectLineIdsForBundle(bundle);
  const centerlineId = deriveLinerCenterlineId(bundle.id);

  for (const template of bundle.crossSections) {
    for (const line of template.offsetLines) {
      const baseLineId = line.baseLineId ?? centerlineId;
      if (baseLineId === line.id) {
        issues.push(
          `${LINER_DIAGNOSTIC_CODES.lineBaselineSelfReference}: offset line ${line.id} references itself.`,
        );
        continue;
      }
      if (!lineIds.has(baseLineId)) {
        issues.push(
          `${LINER_DIAGNOSTIC_CODES.lineReferenceMissing}: offset line ${line.id} baseLineId ${baseLineId} is missing.`,
        );
        continue;
      }
      if (baseLineId !== centerlineId) {
        const visited = new Set<string>([line.id]);
        if (detectBaseLineCycle(lineIds, centerlineId, baseLineId, visited)) {
          issues.push(
            `${LINER_DIAGNOSTIC_CODES.lineBaselineCycle}: offset line ${line.id} has cyclic baseLineId chain.`,
          );
        }
      }
    }
  }
  return issues;
}

function validateDomainDraftForMapping(domainDraft: LinerDomainDraftVNext): readonly string[] {
  const issues: string[] = [];
  if (requireNonEmptyString(domainDraft.id, "id") === undefined) {
    issues.push("domainDraft.id is required.");
  }
  if (domainDraft.alignments.length === 0) {
    issues.push("domainDraft.alignments must contain at least one entry.");
  }

  const seenAlignmentIds = new Set<string>();
  const globalEntityIds = new Map<string, string>();

  for (const [index, bundle] of domainDraft.alignments.entries()) {
    if (requireNonEmptyString(bundle.id, `alignments[${index}].id`) === undefined) {
      issues.push(`alignments[${index}].id is required.`);
      continue;
    }
    if (requireNonEmptyString(bundle.name, `alignments[${index}].name`) === undefined) {
      issues.push(`${LINER_DIAGNOSTIC_CODES.alignmentEmptyName}: alignments[${index}].name is required.`);
    }
    if (requireNonEmptyString(bundle.alignment.id, `alignments[${index}].alignment.id`) === undefined) {
      issues.push(`${LINER_DIAGNOSTIC_CODES.alignmentEmptyName}: alignments[${index}].alignment.id is required.`);
    }
    if (seenAlignmentIds.has(bundle.id)) {
      issues.push(`${LINER_DIAGNOSTIC_CODES.alignmentDuplicateId}: duplicate alignment id ${bundle.id}.`);
    }
    seenAlignmentIds.add(bundle.id);

    if (requireNonEmptyString(bundle.verticalAlignment.id, `alignments[${index}].verticalAlignment.id`) === undefined) {
      issues.push(`alignments[${index}].verticalAlignment.id is required.`);
    }
    if (bundle.crossSections.length === 0) {
      issues.push(`alignments[${index}].crossSections must contain at least one entry.`);
    }
    for (const crossSection of bundle.crossSections) {
      if (requireNonEmptyString(crossSection.id, `crossSections[].id`) === undefined) {
        issues.push(`alignments[${index}] cross-section id is required.`);
      } else if (globalEntityIds.has(crossSection.id)) {
        issues.push(
          `${LINER_DIAGNOSTIC_CODES.crossAlignmentIdCollision}: cross-section id ${crossSection.id} collides with alignment ${globalEntityIds.get(crossSection.id)}.`,
        );
      } else {
        globalEntityIds.set(crossSection.id, bundle.id);
      }
    }
    for (const span of bundle.spans) {
      if (globalEntityIds.has(span.id)) {
        issues.push(
          `${LINER_DIAGNOSTIC_CODES.crossAlignmentIdCollision}: span id ${span.id} collides across alignments.`,
        );
      } else {
        globalEntityIds.set(span.id, bundle.id);
      }
    }
    for (const pier of bundle.piers) {
      if (globalEntityIds.has(pier.id)) {
        issues.push(
          `${LINER_DIAGNOSTIC_CODES.crossAlignmentIdCollision}: pier id ${pier.id} collides across alignments.`,
        );
      } else {
        globalEntityIds.set(pier.id, bundle.id);
      }
    }
    issues.push(...validateBridgeLayoutForBundle(bundle));
    issues.push(...validateOffsetLineReferences(bundle));
  }

  if (domainDraft.activeAlignmentId) {
    if (!seenAlignmentIds.has(domainDraft.activeAlignmentId)) {
      issues.push(
        `${LINER_DIAGNOSTIC_CODES.alignmentReferenceMissing}: activeAlignmentId ${domainDraft.activeAlignmentId} is missing.`,
      );
    }
  } else if (domainDraft.alignments.length > 0) {
    issues.push(`${LINER_DIAGNOSTIC_CODES.activeAlignmentRequired}: activeAlignmentId is required.`);
  }

  if (domainDraft.activeLineId) {
    const activeBundle = getActiveAlignmentBundle(domainDraft);
    if (activeBundle) {
      const lineIds = collectLineIdsForBundle(activeBundle);
      if (!lineIds.has(domainDraft.activeLineId)) {
        issues.push(
          `${LINER_DIAGNOSTIC_CODES.lineReferenceMissing}: activeLineId ${domainDraft.activeLineId} is missing.`,
        );
      }
    }
  } else if (domainDraft.alignments.length > 0) {
    issues.push(`${LINER_DIAGNOSTIC_CODES.activeLineRequired}: activeLineId is required.`);
  }

  return issues;
}

function buildGeometryPayload(domainDraft: LinerDomainDraftVNext): LinerDomainDraftGeometryPayloadV2 {
  return {
    payloadVersion: LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2,
    domainDraft: structuredClone(domainDraft),
  };
}

function isGeometryPayload(value: unknown): value is LinerDomainDraftGeometryPayload {
  if (!isPlainObject(value)) {
    return false;
  }
  if (
    value.payloadVersion === LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V1
    || value.payloadVersion === LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2
  ) {
    return isPlainObject(value.domainDraft);
  }
  return false;
}

export function domainDraftToRoadDesignDocument(
  domainDraft: LinerDomainDraftVNext,
  options: LinerDomainDraftRoadDesignMapperOptions = {},
): DomainDraftRoadDesignMapResult {
  const normalized = normalizeLinerDomainDraft(domainDraft) ?? domainDraft;
  const validationIssues = validateDomainDraftForMapping(normalized);
  if (validationIssues.length > 0) {
    return { ok: false, diagnostics: validationIssues };
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  const revisionId = requireRevisionId(options.revisionId ?? 1);
  const documentId = deriveLinerDomainDraftDocumentId(normalized);
  const contextId = deriveLinerCoordinateContextId(normalized.id);

  const alignments: RoadAlignmentEntry[] = normalized.alignments.map((bundle) => ({
    entityId: deriveLinerAlignmentEntityId(bundle.id),
    coordinateContextId: contextId,
    label: bundle.name || bundle.id,
  }));

  const stationingEntries: RoadStationingEntry[] = normalized.alignments.map((bundle) => ({
    entityId: deriveLinerStationingEntityId(bundle.id),
    alignmentId: deriveLinerAlignmentEntityId(bundle.id),
    originStation: bundle.stationDefinition.originDisplayedStation,
  }));

  const profiles: RoadProfileEntry[] = normalized.alignments.map((bundle) => ({
    entityId: deriveLinerProfileEntityId(bundle.verticalAlignment.id),
    alignmentId: deriveLinerAlignmentEntityId(bundle.id),
    label: bundle.verticalAlignment.id,
  }));

  const crossSections: RoadCrossSectionEntry[] = normalized.alignments.flatMap((bundle) => {
    const profileId = deriveLinerProfileEntityId(bundle.verticalAlignment.id);
    return bundle.crossSections.map((template) => ({
      entityId: deriveLinerCrossSectionEntityId(template.id),
      profileId,
      label: template.name || template.id,
    }));
  });

  const bridges: RoadBridgeEntry[] = normalized.alignments.flatMap((bundle) => {
    const alignmentEntityId = deriveLinerAlignmentEntityId(bundle.id);
    return bundle.spans.map((span) => ({
      entityId: deriveLinerBridgeEntityId(span.id),
      alignmentId: alignmentEntityId,
      label: span.id,
    }));
  });

  const stableIdRegistry: StableEntityId[] = [
    ...normalized.alignments.flatMap((bundle) => {
      const alignmentEntityId = deriveLinerAlignmentEntityId(bundle.id);
      const stationingId = deriveLinerStationingEntityId(bundle.id);
      const profileId = deriveLinerProfileEntityId(bundle.verticalAlignment.id);
      const centerlineId = deriveLinerCenterlineId(bundle.id);
      return [
        { namespace: ROAD_NAMESPACE, id: alignmentEntityId, entityKind: "alignment" as const },
        { namespace: ROAD_NAMESPACE, id: stationingId, entityKind: "stationing" as const },
        { namespace: ROAD_NAMESPACE, id: profileId, entityKind: "profile" as const },
        { namespace: ROAD_NAMESPACE, id: centerlineId as UuidString, entityKind: "centerline" as const },
        ...bundle.crossSections.map((entry) => ({
          namespace: ROAD_NAMESPACE,
          id: deriveLinerCrossSectionEntityId(entry.id),
          entityKind: "cross-section" as const,
        })),
        ...bundle.spans.map((entry) => ({
          namespace: ROAD_NAMESPACE,
          id: deriveLinerBridgeEntityId(entry.id),
          entityKind: "bridge" as const,
        })),
      ];
    }),
  ];

  const geometryPayload = mapAsJsonValue(buildGeometryPayload(normalized));
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
    `${normalized.id}:validation`,
  );
  const placeholderChecksum = computeContentChecksum({
    documentKind: ROAD_DESIGN_DOCUMENT_KIND,
    documentId,
    revisionId,
  });

  const topologyCapability =
    normalized.alignments.length >= 2
      ? ({ state: "supported" as const })
      : ({ state: "absent" as const });

  const ldistCapability =
    (normalized.ldistJobs?.length ?? 0) > 0
      ? ({ state: "supported" as const })
      : ({ state: "absent" as const });

  const haunchCapability =
    (normalized.haunchDefinitions?.length ?? 0) > 0
      ? ({ state: "supported" as const })
      : ({ state: "absent" as const });

  const hosoCapability =
    (normalized.hosoDefinitions?.length ?? 0) > 0
      ? ({ state: "supported" as const })
      : ({ state: "absent" as const });

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
        algorithmVersion: LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2,
      },
    },
    coordinateContexts: [
      {
        schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
        contextId,
        referenceType: "project" as const,
        referenceName: normalized.coordinatePolicyId,
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
      contextId: deriveLinerUnitContextId(normalized.id),
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
    topologyCapability,
    bridgeGeometryCapability: { state: "absent" as const },
    ldistCapability,
    haunchCapability,
    hosoCapability,
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

  if (!isGeometryPayload(extension.json)) {
    return diagnostic("Liner domain-draft geometry extension payload is invalid.");
  }

  const normalized = normalizeLinerDomainDraft(extension.json.domainDraft);
  if (!normalized) {
    return diagnostic("Liner domain-draft geometry extension payload is invalid.");
  }

  const domainDraft = structuredClone(normalized);
  const mappingIssues = validateDomainDraftForMapping(domainDraft);
  if (mappingIssues.length > 0) {
    return { ok: false, diagnostics: mappingIssues };
  }

  const expectedDocumentId = deriveLinerDomainDraftDocumentId(domainDraft);
  if (document.documentId !== expectedDocumentId) {
    return diagnostic("RoadDesignDocument documentId does not match the derived liner domain draft id.");
  }

  for (const bundle of domainDraft.alignments) {
    const expectedAlignmentId = deriveLinerAlignmentEntityId(bundle.id);
    const rddEntry = document.alignments.find((entry) => entry.entityId === expectedAlignmentId);
    if (!rddEntry) {
      return diagnostic(
        `RoadDesignDocument alignment stable id does not match domainDraft alignment ${bundle.id}.`,
      );
    }

    const expectedProfileId = deriveLinerProfileEntityId(bundle.verticalAlignment.id);
    const profileEntry = document.profiles.find((entry) => entry.entityId === expectedProfileId);
    if (!profileEntry) {
      return diagnostic(
        "RoadDesignDocument profile stable id does not match domainDraft.verticalAlignment.id.",
      );
    }

    const expectedCrossSectionIds = bundle.crossSections.map((entry) =>
      deriveLinerCrossSectionEntityId(entry.id),
    );
    const actualCrossSectionIds = document.crossSections
      .filter((entry) => entry.profileId === expectedProfileId)
      .map((entry) => entry.entityId);
    if (actualCrossSectionIds.join("|") !== expectedCrossSectionIds.join("|")) {
      return diagnostic("RoadDesignDocument cross-section stable ids do not match domainDraft.crossSections.");
    }

    const expectedBridgeIds = bundle.spans.map((entry) => deriveLinerBridgeEntityId(entry.id));
    const alignmentEntityId = deriveLinerAlignmentEntityId(bundle.id);
    const actualBridgeIds = document.bridges
      .filter((entry) => entry.alignmentId === alignmentEntityId)
      .map((entry) => entry.entityId);
    if (actualBridgeIds.join("|") !== expectedBridgeIds.join("|")) {
      return diagnostic("RoadDesignDocument bridge stable ids do not match domainDraft.spans.");
    }
  }

  return { ok: true, domainDraft };
}

/** @deprecated Use isGeometryPayload via roadDesignDocumentToDomainDraft. */
export function isLinerDomainDraftGeometryPayload(value: unknown): boolean {
  return isGeometryPayload(value);
}
