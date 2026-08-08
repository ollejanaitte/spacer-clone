/**
 * CBDM document builder + BridgeProject manifest for the Phase 3-1/3-2 chain.
 *
 * Serializes BridgeProject.Alignment and BridgeProject.BridgeGeometry into the
 * canonical Common Bridge Data Model (CBDM) document so the results are actually
 * stored in the shared model and Phase 3-3 (superstructure binding) can consume
 * them through the existing CommonModelGeometryInputAdapter.
 *
 * Serialization is deterministic (canonical key order + checksum) so that
 * Save / Load / Replay preserve values, units, status, and source.
 */

import { COMMON_BRIDGE_DATA_MODEL_SCHEMA_ID } from "../contracts/contractVersionRegistry";
import {
  commonBridgeDataModelSchema,
  type CommonBridgeDataModelValue,
  type ResolvedValueValue,
} from "../contracts/runtime/schemas/commonBridgeDataModel";
import { deriveStableUuid } from "../contracts/legacy/idStability";
import {
  canonicalJsonForChecksum,
  computeContentChecksum,
} from "../contracts/legacy/checksum";
import type { UuidString } from "../contracts/uuid";
import {
  BRIDGE_PROJECT_SCHEMA_ID,
  BRIDGE_PROJECT_SCHEMA_VERSION,
} from "../contracts/contractVersionRegistry";
import {
  BRIDGE_PROJECT_DOCUMENT_KIND,
  validateBridgeProject,
  type BridgeProject,
} from "../contracts/bridgeProject";
import type { BpValue, BridgeProjectAlignment, BridgeProjectBridgeGeometry } from "./types";
import { BridgeProjectAdapterError, BP_CODES, assertBpValueShape } from "./validation";

const DOCUMENT_VERSION = "1.0.0";
const DEFAULT_CREATED_AT = "2026-08-08T00:00:00.000Z";
const TOOL_ID = "spacer-bridge-project-cbdm";
const TOOL_VERSION = "0.1.0";

export interface CbdmBuildOptions {
  readonly bridgeId?: string;
  readonly displayName?: string;
  readonly createdAt?: string;
  readonly revisionId?: number;
}

function checksumHex(doc: Record<string, unknown>): string {
  // Checksum is computed over the document excluding its own contentChecksum field
  // (mirrors the reference P5 python finalize_document behavior).
  const { contentChecksum: _ignored, ...body } = doc;
  const checksum = computeContentChecksum(body);
  return checksum.hexDigest;
}

function uuidOrThrow(namespace: string, id: string): UuidString {
  return deriveStableUuid(namespace, id);
}

// ---------------------------------------------------------------------------
// BpValue -> CBDM ResolvedValue mapping (docs/integration/value-status-unit-policy.md)
// ---------------------------------------------------------------------------

export function mapBpValueToCbdm(value: BpValue): ResolvedValueValue {
  assertBpValueShape(value, "bpValue");
  const sourceRefs =
    value.sourceReference !== undefined && value.sourceReference.trim().length > 0
      ? [value.sourceReference]
      : undefined;

  switch (value.status) {
    case "CONFIRMED":
      return {
        state: "CONFIRMED",
        value: value.value!,
        unit: value.unit,
        ...(sourceRefs !== undefined ? { sourceRefs } : {}),
        authority: value.source === "USER_INPUT" ? "USER_PROVIDED_UNVERIFIED" : "SOURCE_TRACED",
      };
    case "DERIVED":
      return {
        state: "DERIVED",
        value: value.value!,
        unit: value.unit,
        derivedFrom: value.derivedFrom ?? "bridge-project adapter derivation",
        ...(value.generatedBy !== undefined ? { generatedBy: value.generatedBy } : {}),
        authority: "SOURCE_TRACED",
      };
    case "INFERRED":
      return {
        state: "INFERRED",
        value: value.value!,
        unit: value.unit,
        inferenceBasis: value.stateReason ?? value.derivedFrom ?? "inferred from indirect source",
        confidence: "medium",
        ...(sourceRefs !== undefined ? { sourceRefs } : {}),
      };
    case "MISSING":
      return {
        state: "HOLD_INSUFFICIENT_SOURCE",
        stateReason: value.stateReason ?? "value missing",
        unit: value.unit,
      };
    case "DEFERRED":
      return {
        state: "DEFERRED",
        stateReason: value.stateReason ?? "value deferred",
        unit: value.unit,
      };
    case "NOT_AUTHORIZED":
      return {
        state: "NOT_AVAILABLE",
        stateReason: value.stateReason ?? "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
      };
  }
}

// ---------------------------------------------------------------------------
// CBDM document builder
// ---------------------------------------------------------------------------

export function buildCommonBridgeModel(
  alignment: BridgeProjectAlignment,
  geometry: BridgeProjectBridgeGeometry,
  options: CbdmBuildOptions = {},
): CommonBridgeDataModelValue {
  const bridgeId = options.bridgeId ?? geometry.bridgeId ?? alignment.alignmentId;
  const documentId = uuidOrThrow("bridge-project.common-model", bridgeId);
  const alignmentId = alignment.alignmentId;

  const aggregateFields: Record<string, ResolvedValueValue> = {
    bridgeLength: mapBpValueToCbdm(alignment.bridgeLengthM),
    bridgeStartStation: mapBpValueToCbdm(alignment.bridgeStartStationM),
    bridgeEndStation: mapBpValueToCbdm(alignment.bridgeEndStationM),
    coordinateSystem: {
      state: "CONFIRMED",
      value: alignment.coordinateSystem.name,
    },
    unitSystem: {
      state: "CONFIRMED",
      value: `${alignment.unitContext.length}-${alignment.unitContext.angle}`,
    },
    stationCount: {
      state: "DERIVED",
      value: alignment.stations.length,
      derivedFrom: "alignment sample station count",
      generatedBy: TOOL_ID,
    },
  };

  const stationEntities = alignment.stations.map((station) => ({
    id: uuidOrThrow("bridge-project.alignment.station", `${alignmentId}:${station.stationM.value}`),
    displayName: `station ${station.stationM.value}`,
    entityType: "ALIGNMENT" as const,
    fields: {
      station: mapBpValueToCbdm(station.stationM),
      x: mapBpValueToCbdm(station.position.x),
      y: mapBpValueToCbdm(station.position.y),
      z: mapBpValueToCbdm(station.position.z),
      azimuth: mapBpValueToCbdm(station.azimuthRad),
      curvature: mapBpValueToCbdm(station.curvaturePerM),
      ...(station.grade !== undefined ? { grade: mapBpValueToCbdm(station.grade) } : {}),
      ...(station.crossfallPercent !== undefined
        ? { crossfall: mapBpValueToCbdm(station.crossfallPercent) }
        : {}),
      ...(station.widthM !== undefined ? { widthM: mapBpValueToCbdm(station.widthM) } : {}),
      ...(station.widthLeftM !== undefined ? { widthLeft: mapBpValueToCbdm(station.widthLeftM) } : {}),
      ...(station.widthRightM !== undefined ? { widthRight: mapBpValueToCbdm(station.widthRightM) } : {}),
      ...(station.supportId !== undefined ? { supportId: { state: "CONFIRMED", value: station.supportId } } : {}),
    },
  }));

  const supportEntities = geometry.supports.map((support) => ({
    id: support.supportId,
    displayName: support.supportId,
    entityType: "SUPPORT" as const,
    fields: {
      station: mapBpValueToCbdm(support.stationM),
      stationM: mapBpValueToCbdm(support.stationM),
      skew: mapBpValueToCbdm(support.skewRad),
      skewRad: mapBpValueToCbdm(support.skewRad),
      x: mapBpValueToCbdm(support.position.x),
      y: mapBpValueToCbdm(support.position.y),
      z: mapBpValueToCbdm(support.position.z),
      tangentX: mapBpValueToCbdm(support.tangent.x),
      tangentY: mapBpValueToCbdm(support.tangent.y),
      tangentZ: mapBpValueToCbdm(support.tangent.z),
      transverseX: mapBpValueToCbdm(support.transverse.x),
      transverseY: mapBpValueToCbdm(support.transverse.y),
      transverseZ: mapBpValueToCbdm(support.transverse.z),
      kind: { state: "CONFIRMED", value: support.kind },
    },
  }));

  const spanEntities = geometry.spans.map((span) => ({
    id: span.spanId,
    displayName: `${span.startSupportId}-${span.endSupportId}`,
    entityType: "SPAN" as const,
    fields: {
      spanLength: mapBpValueToCbdm(span.lengthM),
      startStationM: mapBpValueToCbdm(span.startStationM),
      endStationM: mapBpValueToCbdm(span.endStationM),
      startSupportId: { state: "CONFIRMED", value: span.startSupportId },
      endSupportId: { state: "CONFIRMED", value: span.endSupportId },
    },
  }));

  const deckEntities = geometry.deckWidthM
    ? [
        {
          id: uuidOrThrow("bridge-project.deck", bridgeId),
          displayName: "deck",
          entityType: "DECK" as const,
          fields: {
            widthM: mapBpValueToCbdm(geometry.deckWidthM),
          },
        },
      ]
    : [];

  const document = {
    schemaId: COMMON_BRIDGE_DATA_MODEL_SCHEMA_ID,
    schemaVersion: DOCUMENT_VERSION,
    documentId,
    documentKind: "common-bridge-data-model",
    revisionId: options.revisionId ?? 1,
    contentChecksum: { algorithm: "sha256", hexDigest: "0".repeat(64) },
    provenance: {
      createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
      createdBy: {
        actorId: TOOL_ID,
        actorType: "tool" as const,
        displayName: "BridgeProject CBDM builder",
      },
      producer: { toolId: TOOL_ID, toolVersion: TOOL_VERSION },
    },
    metadata: {
      bridgeId,
      displayName: options.displayName ?? bridgeId,
      standardProfile: "bridge-project-integration",
      r7Compliance: "NOT_VERIFIED",
      numericDesignAuthorization: "NOT_GRANTED",
      designOrConstructionUse: "PROHIBITED",
      referenceType: "NON_RELEASE",
    },
    alignments: {
      alignments: [
        {
          id: uuidOrThrow("bridge-project.alignment", alignmentId),
          displayName: alignmentId,
          entityType: "ALIGNMENT",
          fields: aggregateFields,
        },
        ...stationEntities,
      ],
    },
    bridgeGeometry: {
      spans: spanEntities,
      supports: supportEntities,
      girders: [],
      gridPoints: [],
      deck: deckEntities,
      crossMembers: [],
    },
    structuralModel: { nodes: [], members: [] },
    materials: { materials: [] },
    sections: { sections: [] },
    loads: { loadCases: [], loadCombinations: [] },
    analysisReference: {
      status: "NOT_AVAILABLE",
      stateReason: "no authorized analysis in this contract",
      results: [],
    },
    design: { items: [] },
    reportSpecification: { items: [] },
    drawingSpecification: { sheets: [], items: [] },
    traceability: { links: [] },
    resolutionRegistry: { conflicts: [], humanConfirmations: [], holds: [] },
  };

  const checksum = checksumHex(document);
  const finalized = { ...document, contentChecksum: { algorithm: "sha256", hexDigest: checksum } };

  const parsed = commonBridgeDataModelSchema.safeParse(finalized);
  if (!parsed.success) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `Built CBDM document failed schema validation: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Deterministic serialization / parse (Save / Load / Replay)
// ---------------------------------------------------------------------------

export function serializeCommonBridgeModel(doc: CommonBridgeDataModelValue): string {
  return canonicalJsonForChecksum(doc);
}

export function parseCommonBridgeModel(text: string): CommonBridgeDataModelValue {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `Invalid CBDM JSON: ${(error as Error).message}`,
    );
  }
  const parsed = commonBridgeDataModelSchema.safeParse(value);
  if (!parsed.success) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `CBDM document failed schema validation: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// BridgeProject manifest (coordination document referencing the CBDM)
// ---------------------------------------------------------------------------

export interface ManifestBuildOptions extends CbdmBuildOptions {
  readonly projectId?: string;
}

export function buildBridgeProjectManifest(
  alignment: BridgeProjectAlignment,
  geometry: BridgeProjectBridgeGeometry,
  commonModel: CommonBridgeDataModelValue,
  options: ManifestBuildOptions = {},
): BridgeProject {
  const projectId = (options.projectId ?? uuidOrThrow("bridge-project.project", commonModel.metadata.bridgeId)) as UuidString;
  const manifestDocumentId = uuidOrThrow("bridge-project.manifest", commonModel.metadata.bridgeId);

  const documentReference = {
    documentKind: "common-bridge-data-model" as const,
    documentId: commonModel.documentId,
    revisionId: commonModel.revisionId,
    contentChecksum: commonModel.contentChecksum,
  };

  const manifest = {
    schemaId: BRIDGE_PROJECT_SCHEMA_ID,
    schemaVersion: BRIDGE_PROJECT_SCHEMA_VERSION,
    documentId: manifestDocumentId,
    documentKind: BRIDGE_PROJECT_DOCUMENT_KIND,
    revisionId: options.revisionId ?? 1,
    contentChecksum: { algorithm: "sha256", hexDigest: "0".repeat(64) },
    provenance: {
      createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
      createdBy: {
        actorId: TOOL_ID,
        actorType: "tool" as const,
        displayName: "BridgeProject manifest builder",
      },
      producer: { toolId: TOOL_ID, toolVersion: TOOL_VERSION },
    },
    projectId,
    name: options.displayName ?? commonModel.metadata.bridgeId,
    projectRevisionMetadata: {
      schemaVersion: DOCUMENT_VERSION,
      documentId: projectId,
      revisionId: options.revisionId ?? 1,
      createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
      contentChecksum: commonModel.contentChecksum,
    },
    status: {
      phase: "reconciliation",
      sections: {
        project: { owner: "BRIDGE_PROJECT_SHARED", state: "COMPLETE" },
        alignment: { owner: "ALIGNMENT_OWNER", state: "COMPLETE" },
        bridgeGeometry: { owner: "BRIDGE_PROJECT_SHARED", state: "COMPLETE" },
        superstructure: { owner: "SUPERSTRUCTURE_OWNER", state: "EMPTY" },
        substructure: { owner: "SUBSTRUCTURE_OWNER", state: "EMPTY" },
        analysis: { owner: "BRIDGE_PROJECT_SHARED", state: "NOT_AUTHORIZED" },
        model3D: { owner: "BRIDGE_PROJECT_SHARED", state: "DEFERRED" },
        metadata: { owner: "BRIDGE_PROJECT_SHARED", state: "COMPLETE" },
      },
    },
    references: {
      commonModel: documentReference,
    },
    sharedFacts: {
      coordinateSystem: "x-east-y-north-z-up",
      unitSystem: "si-m-rad-kn",
      supports: geometry.supports.map((support) => ({
        supportId: support.supportId,
        supportType: support.kind === "abutment" ? ("abutment" as const) : ("pier" as const),
        stationM: {
          value: support.stationM.value ?? null,
          unit: support.stationM.unit,
          status: support.stationM.status,
          ...(support.stationM.source !== undefined ? { source: support.stationM.source } : {}),
          ...(support.stationM.generatedBy !== undefined
            ? { generatedBy: support.stationM.generatedBy }
            : {}),
          ...(support.stationM.sourceReference !== undefined
            ? { sourceReference: support.stationM.sourceReference }
            : {}),
        },
        skewRad: {
          value: support.skewRad.value ?? null,
          unit: support.skewRad.unit,
          status: support.skewRad.status,
          ...(support.skewRad.stateReason !== undefined ? { stateReason: support.skewRad.stateReason } : {}),
        },
      })),
    },
  };

  const checksum = checksumHex(manifest);
  const finalized = { ...manifest, contentChecksum: { algorithm: "sha256", hexDigest: checksum } };

  const result = validateBridgeProject(finalized as unknown as Partial<BridgeProject>);
  if (result.issues.length > 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `Built BridgeProject manifest failed validation: ${result.issues.map((issue) => issue.code).join(", ")}`,
    );
  }
  return finalized as unknown as BridgeProject;
}

export function serializeBridgeProjectManifest(doc: BridgeProject): string {
  return canonicalJsonForChecksum(doc);
}

export function parseBridgeProjectManifest(text: string): BridgeProject {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `Invalid BridgeProject manifest JSON: ${(error as Error).message}`,
    );
  }
  const result = validateBridgeProject(value as Partial<BridgeProject>);
  if (result.issues.length > 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `BridgeProject manifest failed validation: ${result.issues.map((issue) => issue.code).join(", ")}`,
    );
  }
  return value as BridgeProject;
}
