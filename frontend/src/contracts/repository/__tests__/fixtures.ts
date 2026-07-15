import {
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
  CONTENT_CHECKSUM_ALGORITHM,
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  REVISION_METADATA_SCHEMA_VERSION,
  ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
  ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
  ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
  ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
  TRANSFER_RECORD_SCHEMA_ID,
  TRANSFER_RECORD_SCHEMA_VERSION,
  UNIT_CONTEXT_SCHEMA_VERSION,
  parseBridgeFrameAnalysisDocumentValue,
  parseRoadDesignDocumentValue,
  parseRoadToFrameTransferPackageValue,
  parseTransferRecordValue,
  requireSchemaVersion,
} from "../../index";
import type { BridgeFrameAnalysisDocument } from "../../bridgeFrameAnalysisDocument";
import type { RoadDesignDocument } from "../../roadDesignDocument";
import type { RoadToFrameTransferPackage } from "../../roadToFrameTransferPackage";
import type { TransferRecord } from "../../transferRecord";
import { parseUuid, type UuidString } from "../../uuid";

export const ROAD_DOC_ID = fixtureUuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
export const FRAME_DOC_ID = fixtureUuid("7c9e6679-7425-40de-944b-e07fc1f90ae7");
export const PACKAGE_ID = fixtureUuid("550e8400-e29b-41d4-a716-446655440000");
export const RECORD_ID = fixtureUuid("8d3e3b2a-1111-4222-8333-444455556666");
export const CONTEXT_ID = fixtureUuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
export const ALIGNMENT_ID = fixtureUuid("a0508400-e29b-41d4-a716-446655440001");
export const STATIONING_ID = fixtureUuid("a1508400-e29b-41d4-a716-446655440002");
export const PROFILE_ID = fixtureUuid("a2508400-e29b-41d4-a716-446655440003");
export const CROSS_SECTION_ID = fixtureUuid("a3508400-e29b-41d4-a716-446655440004");
export const BRIDGE_ID = fixtureUuid("a4508400-e29b-41d4-a716-446655440005");
export const NODE_I_ID = fixtureUuid("b0508400-e29b-41d4-a716-446655440011");
export const NODE_J_ID = fixtureUuid("b1508400-e29b-41d4-a716-446655440012");
export const MATERIAL_ID = fixtureUuid("b2508400-e29b-41d4-a716-446655440013");
export const SECTION_ID = fixtureUuid("b3508400-e29b-41d4-a716-446655440014");
export const MEMBER_ID = fixtureUuid("b4508400-e29b-41d4-a716-446655440015");
export const SUPPORT_ID = fixtureUuid("b5508400-e29b-41d4-a716-446655440016");
export const LOAD_ID = fixtureUuid("b6508400-e29b-41d4-a716-446655440017");
export const SETTINGS_ID = fixtureUuid("b7508400-e29b-41d4-a716-446655440018");
export const BINDING_ID = fixtureUuid("b8508400-e29b-41d4-a716-446655440019");
export const VALIDATION_REF_ID = fixtureUuid("b9508400-e29b-41d4-a716-446655440020");

export const VALID_SHA256 = "a".repeat(64);
export const ALT_SHA256 = "b".repeat(64);

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
] as const;

function fixtureUuid(value: string): UuidString {
  const parsed = parseUuid(value);
  if (parsed === undefined) {
    throw new Error(`Invalid fixture UUID: ${value}`);
  }
  return parsed;
}

export function createChecksum(hexDigest = VALID_SHA256) {
  return {
    algorithm: CONTENT_CHECKSUM_ALGORITHM,
    hexDigest,
  };
}

export function createProvenance() {
  return {
    createdAt: "2026-07-15T12:00:00.000Z",
    createdBy: { actorId: "user-1", actorType: "user" as const },
    producer: { toolId: "spacer", toolVersion: "0.1.0" },
  };
}

export function createRevisionMetadata(documentId: UuidString, revisionId: number) {
  return {
    schemaVersion: REVISION_METADATA_SCHEMA_VERSION,
    documentId,
    revisionId,
    createdAt: "2026-07-15T12:00:00.000Z",
    contentChecksum: createChecksum(),
  };
}

export function createValidationRef(documentId: UuidString) {
  return {
    documentKind: "validation-result" as const,
    documentId,
    revisionId: 1,
    contentChecksum: createChecksum(),
  };
}

export function createCoordinateContext(withStation = true) {
  return {
    schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    referenceType: "project" as const,
    referenceName: "Main alignment CRS",
    origin: { x: 1000, y: 2000, z: 15.5 },
    axisOrder: ["x", "y", "z"] as const,
    axisDirections: { x: "+x", y: "+y", z: "+z" },
    handedness: "right" as const,
    verticalAxis: "z" as const,
    orientation: {
      rotations: [0, 0, 0] as const,
      rotationOrder: "xyz" as const,
      rotationConvention: "intrinsic" as const,
    },
    transformToCanonical: {
      transformVersion: "canonical-v1",
      status: "verified" as const,
      matrix: IDENTITY_MATRIX,
    },
    angleUnit: "rad" as const,
    confidenceStatus: "verified" as const,
    ...(withStation
      ? {
          stationConvention: {
            tangentDirection: "+x" as const,
            offsetSign: "left_positive" as const,
            elevationSign: "up_positive" as const,
          },
        }
      : {}),
  };
}

export function createRoadUnitContext() {
  return {
    schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    length: "m" as const,
    angle: "rad" as const,
    conversionVersion: "si-v1",
    signConventions: {
      crossfall: "right_down_positive" as const,
      rotation: "counterclockwise_positive" as const,
    },
  };
}

export function createFrameUnitContext() {
  return {
    schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    length: "m" as const,
    angle: "rad" as const,
    force: "kN" as const,
    moment: "kN·m" as const,
    mass: "kg" as const,
    temperature: "°C" as const,
    stress: "MPa" as const,
    area: "m²" as const,
    inertia: "m⁴" as const,
    modulus: "GPa" as const,
    time: "s" as const,
    conversionVersion: "si-v1",
  };
}

function parseFixture<T>(
  label: string,
  parsed: { success: boolean; data?: T },
): T {
  if (!parsed.success || parsed.data === undefined) {
    throw new Error(`Failed to parse ${label} fixture.`);
  }
  return parsed.data;
}

export function createValidRoadDesignDocument(revisionId = 1): RoadDesignDocument {
  const raw = {
    schemaId: ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
    schemaVersion: ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
    documentKind: "road-design" as const,
    documentId: ROAD_DOC_ID,
    revisionId,
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    coordinateContexts: [createCoordinateContext(true)],
    unitContext: createRoadUnitContext(),
    stableIdRegistry: [
      { namespace: "road.geometry", id: ALIGNMENT_ID, entityKind: "alignment" },
      { namespace: "road.geometry", id: STATIONING_ID, entityKind: "stationing" },
      { namespace: "road.geometry", id: PROFILE_ID, entityKind: "profile" },
      { namespace: "road.geometry", id: CROSS_SECTION_ID, entityKind: "cross-section" },
      { namespace: "road.geometry", id: BRIDGE_ID, entityKind: "bridge" },
    ],
    alignments: [
      {
        entityId: ALIGNMENT_ID,
        coordinateContextId: CONTEXT_ID,
        label: "Main",
      },
    ],
    stationing: {
      entries: [
        {
          entityId: STATIONING_ID,
          alignmentId: ALIGNMENT_ID,
          originStation: 0,
        },
      ],
    },
    profiles: [
      {
        entityId: PROFILE_ID,
        alignmentId: ALIGNMENT_ID,
        label: "Crown",
      },
    ],
    crossSections: [
      {
        entityId: CROSS_SECTION_ID,
        profileId: PROFILE_ID,
        label: "Typical",
      },
    ],
    bridges: [
      {
        entityId: BRIDGE_ID,
        alignmentId: ALIGNMENT_ID,
        label: "Bridge 1",
      },
    ],
    revision: createRevisionMetadata(ROAD_DOC_ID, revisionId),
    validation: createValidationRef(VALIDATION_REF_ID),
    bridgeGeometryCapability: { state: "absent" as const },
  };

  return parseFixture("RoadDesignDocument", parseRoadDesignDocumentValue(raw));
}

export function createValidBridgeFrameAnalysisDocument(
  revisionId = 1,
): BridgeFrameAnalysisDocument {
  const raw = {
    schemaId: BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
    schemaVersion: BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
    documentKind: "bridge-frame-analysis" as const,
    documentId: FRAME_DOC_ID,
    revisionId,
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    coordinateContexts: [createCoordinateContext(false)],
    unitContext: createFrameUnitContext(),
    structuralModel: {
      nodes: [
        {
          entityId: NODE_I_ID,
          coordinateContextId: CONTEXT_ID,
          x: 0,
          y: 0,
          z: 0,
        },
        {
          entityId: NODE_J_ID,
          coordinateContextId: CONTEXT_ID,
          x: 10,
          y: 0,
          z: 0,
        },
      ],
      materials: [{ entityId: MATERIAL_ID, label: "Steel" }],
      sections: [{ entityId: SECTION_ID, label: "Girder" }],
      members: [
        {
          entityId: MEMBER_ID,
          nodeIId: NODE_I_ID,
          nodeJId: NODE_J_ID,
          materialId: MATERIAL_ID,
          sectionId: SECTION_ID,
        },
      ],
      supports: [{ entityId: SUPPORT_ID, nodeId: NODE_I_ID, label: "Fixed" }],
    },
    loadDefinitions: [
      {
        entityId: LOAD_ID,
        label: "Dead load",
        loadKind: "dead" as const,
      },
    ],
    analysisSettings: {
      settingsId: SETTINGS_ID,
      solverFamily: "frame-static",
      settingsVersion: "0.1.0",
    },
    transferBindings: [
      {
        bindingId: BINDING_ID,
        sourceDocumentRef: {
          documentKind: "road-design" as const,
          documentId: ROAD_DOC_ID,
          revisionId: 1,
          contentChecksum: createChecksum(),
        },
        mappingProvenance: createProvenance(),
        targetEntityKind: "node" as const,
        targetEntityId: NODE_I_ID,
        sourceEntityId: ALIGNMENT_ID,
      },
    ],
    revision: createRevisionMetadata(FRAME_DOC_ID, revisionId),
    validation: createValidationRef(VALIDATION_REF_ID),
    springsCapability: { state: "absent" as const },
  };

  return parseFixture("BridgeFrameAnalysisDocument", parseBridgeFrameAnalysisDocumentValue(raw));
}

export function createValidTransferPackage(): RoadToFrameTransferPackage {
  const raw = {
    schemaId: ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
    schemaVersion: ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
    documentKind: "road-to-frame-transfer-package" as const,
    packageId: PACKAGE_ID,
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    sourceDocumentRef: {
      documentKind: "road-design" as const,
      documentId: ROAD_DOC_ID,
      revisionId: 1,
      contentChecksum: createChecksum(),
    },
    coordinateContext: createCoordinateContext(),
    unitContext: createRoadUnitContext(),
    capabilities: [{ capabilityId: "bridge-geometry-v1", status: "supported" as const }],
    selection: [],
    geometry: {
      alignmentRefs: [],
      stationRefs: [],
      substructures: [],
      bearingLines: [],
      spans: [],
      mainGirderCandidates: [],
      crossBeamCandidates: [],
      surfaceRegions: [],
      roadRegions: [],
      loadPlacementCandidates: [],
    },
  };

  return parseFixture("RoadToFrameTransferPackage", parseRoadToFrameTransferPackageValue(raw));
}

export function createValidTransferRecord(recordId: UuidString = RECORD_ID): TransferRecord {
  const raw = {
    schemaId: TRANSFER_RECORD_SCHEMA_ID,
    schemaVersion: TRANSFER_RECORD_SCHEMA_VERSION,
    documentKind: "transfer-record" as const,
    recordId,
    contentChecksum: createChecksum(),
    packageRef: {
      packageId: PACKAGE_ID,
      schemaVersion: ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
      contentChecksum: createChecksum(),
    },
    sourceDocumentRef: {
      documentKind: "road-design" as const,
      documentId: ROAD_DOC_ID,
      revisionId: 1,
      contentChecksum: createChecksum(),
    },
    targetBefore: {
      documentKind: "bridge-frame-analysis" as const,
      documentId: FRAME_DOC_ID,
      revisionId: 1,
      contentChecksum: createChecksum(),
    },
    status: "previewed" as const,
    firstImport: true,
    capabilityAssessment: [
      {
        capabilityId: "bridge-geometry-v1",
        producerStatus: "supported" as const,
        consumerStatus: "supported" as const,
        blocked: false,
      },
    ],
    entityMappings: [],
    acceptedChanges: [],
    rejectedChanges: [],
    conflicts: [],
    coordinateTransform: {
      policyId: "coordinate-transform-v1",
      schemaVersion: requireSchemaVersion("0.1.0"),
      contentChecksum: createChecksum(),
    },
    applyProfile: {
      policyId: "bridge-frame-v1",
      schemaVersion: requireSchemaVersion("0.1.0"),
      contentChecksum: createChecksum(),
    },
    timestamp: "2026-07-15T12:30:00.000Z",
    actor: { actorId: "user-1", actorType: "user" as const },
    toolVersion: "0.1.0",
  };

  return parseFixture("TransferRecord", parseTransferRecordValue(raw));
}
