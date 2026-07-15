import { describe, expect, it } from "vitest";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  ROAD_DESIGN_DOCUMENT_KIND,
  ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
  ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
  TRANSFER_RECORD_SCHEMA_ID,
  TRANSFER_RECORD_SCHEMA_VERSION,
  UNIT_CONTEXT_SCHEMA_VERSION,
  assessPackageApplyability,
  contractJsonSchemaPath,
  detectForbiddenTransferPackageKeys,
  generateAllContractJsonSchemas,
  parseRoadToFrameTransferPackageValue,
  parseTransferRecordValue,
  validateSupportedContractVersion,
} from "../index";

const PACKAGE_ID = "550e8400-e29b-41d4-a716-446655440000";
const ROAD_DOC_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const FRAME_DOC_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const RECORD_ID = "8d3e3b2a-1111-4222-8333-444455556666";
const BASELINE_RECORD_ID = "9f4e4c3b-2222-4333-8444-555566667777";
const CONTEXT_ID = "a0508400-e29b-41d4-a716-446655440001";
const ALIGNMENT_ID = "a1508400-e29b-41d4-a716-446655440002";
const SOURCE_ALIGNMENT_ID = "d1508400-e29b-41d4-a716-446655440010";
const STATION_ID = "a2508400-e29b-41d4-a716-446655440003";
const SUBSTRUCTURE_ID = "a3508400-e29b-41d4-a716-446655440004";
const BEARING_ID = "a4508400-e29b-41d4-a716-446655440005";
const SPAN_ID = "a5508400-e29b-41d4-a716-446655440006";
const GIRDER_ID = "a6508400-e29b-41d4-a716-446655440007";
const FRAME_ENTITY_ID = "b0508400-e29b-41d4-a716-446655440011";

const VALID_SHA256 = "a".repeat(64);
const ALT_SHA256 = "b".repeat(64);

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
] as const;

function createChecksum(hexDigest = VALID_SHA256) {
  return {
    algorithm: CONTENT_CHECKSUM_ALGORITHM,
    hexDigest,
  };
}

function createProvenance() {
  return {
    createdAt: "2026-07-15T12:00:00.000Z",
    createdBy: { actorId: "user-1", actorType: "user" as const },
    producer: { toolId: "spacer", toolVersion: "0.1.0" },
  };
}

function createRoadDocumentRef() {
  return {
    documentKind: ROAD_DESIGN_DOCUMENT_KIND,
    documentId: ROAD_DOC_ID,
    revisionId: 2,
    contentChecksum: createChecksum(),
  };
}

function createFrameDocumentRef(revisionId: number, checksum = VALID_SHA256) {
  return {
    documentKind: "bridge-frame-analysis" as const,
    documentId: FRAME_DOC_ID,
    revisionId,
    contentChecksum: createChecksum(checksum),
  };
}

function createCoordinateContext(options: {
  confidenceStatus?: "verified" | "unknown" | "conflicted";
  transformStatus?: "verified" | "unknown" | "conflicted";
  withStation?: boolean;
} = {}) {
  const confidenceStatus = options.confidenceStatus ?? "verified";
  const transformStatus = options.transformStatus ?? "verified";
  const withStation = options.withStation ?? false;

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
      status: transformStatus,
      matrix: IDENTITY_MATRIX,
    },
    angleUnit: "rad" as const,
    confidenceStatus,
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

function createRoadUnitContext() {
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

function emptyGeometry() {
  return {
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
  };
}

function createNonemptyGeometry() {
  return {
    alignmentRefs: [
      {
        entityId: ALIGNMENT_ID,
        provenance: createProvenance(),
        dependencyIds: [],
        sourceAlignmentId: SOURCE_ALIGNMENT_ID,
      },
    ],
    stationRefs: [
      {
        entityId: STATION_ID,
        provenance: createProvenance(),
        dependencyIds: [ALIGNMENT_ID],
        alignmentRefId: ALIGNMENT_ID,
        station: 100,
      },
    ],
    substructures: [
      {
        entityId: SUBSTRUCTURE_ID,
        provenance: createProvenance(),
        dependencyIds: [ALIGNMENT_ID],
        kind: "pier" as const,
        point: { x: 0, y: 0, z: 0 },
      },
    ],
    bearingLines: [
      {
        entityId: BEARING_ID,
        provenance: createProvenance(),
        dependencyIds: [SUBSTRUCTURE_ID],
        substructureId: SUBSTRUCTURE_ID,
        polyline: {
          points: [
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 0, z: 0 },
          ],
        },
      },
    ],
    spans: [
      {
        entityId: SPAN_ID,
        provenance: createProvenance(),
        dependencyIds: [BEARING_ID, SUBSTRUCTURE_ID],
        startRef: { refKind: "bearing-line" as const, refId: BEARING_ID },
        endRef: { refKind: "substructure" as const, refId: SUBSTRUCTURE_ID },
        length: 25,
      },
    ],
    mainGirderCandidates: [
      {
        entityId: GIRDER_ID,
        provenance: createProvenance(),
        dependencyIds: [SPAN_ID],
        spanIds: [SPAN_ID],
        polyline: {
          points: [
            { x: 0, y: 0, z: 2 },
            { x: 25, y: 0, z: 2 },
          ],
        },
      },
    ],
    crossBeamCandidates: [],
    surfaceRegions: [],
    roadRegions: [],
    loadPlacementCandidates: [],
  };
}

function createValidPackage(overrides: Record<string, unknown> = {}) {
  return {
    schemaId: ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
    schemaVersion: ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
    documentKind: "road-to-frame-transfer-package" as const,
    packageId: PACKAGE_ID,
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    sourceDocumentRef: createRoadDocumentRef(),
    coordinateContext: createCoordinateContext(),
    unitContext: createRoadUnitContext(),
    capabilities: [
      { capabilityId: "bridge-geometry-v1", status: "supported" as const },
    ],
    selection: [],
    geometry: emptyGeometry(),
    ...overrides,
  };
}

function createPackageRef() {
  return {
    packageId: PACKAGE_ID,
    schemaVersion: ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
    contentChecksum: createChecksum(),
  };
}

function createRecordRef(recordId: string) {
  return {
    recordId,
    schemaVersion: TRANSFER_RECORD_SCHEMA_VERSION,
    contentChecksum: createChecksum(),
  };
}

function createPolicyRef(policyId: string) {
  return {
    policyId,
    schemaVersion: "0.1.0",
    contentChecksum: createChecksum(),
  };
}

function createValidTransferRecord(overrides: Record<string, unknown> = {}) {
  return {
    schemaId: TRANSFER_RECORD_SCHEMA_ID,
    schemaVersion: TRANSFER_RECORD_SCHEMA_VERSION,
    documentKind: "transfer-record" as const,
    recordId: RECORD_ID,
    contentChecksum: createChecksum(),
    packageRef: createPackageRef(),
    sourceDocumentRef: createRoadDocumentRef(),
    targetBefore: createFrameDocumentRef(1),
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
    coordinateTransform: createPolicyRef("coordinate-transform-v1"),
    applyProfile: createPolicyRef("bridge-frame-v1"),
    timestamp: "2026-07-15T12:30:00.000Z",
    actor: { actorId: "user-1", actorType: "user" as const },
    toolVersion: "0.1.0",
    ...overrides,
  };
}

describe("Step 0B2c transfer artifact contracts", () => {
  describe("RoadToFrameTransferPackage", () => {
    it("accepts a valid minimal empty-capability package", () => {
      const parsed = parseRoadToFrameTransferPackageValue(createValidPackage());
      expect(parsed.success).toBe(true);
    });

    it("accepts a valid nonempty geometry package", () => {
      const geometry = createNonemptyGeometry();
      const parsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry,
          selection: [ALIGNMENT_ID, STATION_ID, SUBSTRUCTURE_ID, BEARING_ID, SPAN_ID, GIRDER_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(parsed.success).toBe(true);
    });

    it("round-trips through JSON and freezes parsed output recursively", () => {
      const source = createValidPackage();
      const input = structuredClone(source);
      const serialized = JSON.parse(JSON.stringify(source)) as unknown;
      const parsed = parseRoadToFrameTransferPackageValue(serialized);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        return;
      }

      expect(parsed.data.packageId).toBe(source.packageId);
      expect(parsed.data.schemaId).toBe(source.schemaId);
      expect(parsed.data.geometry.alignmentRefs).toEqual(source.geometry.alignmentRefs);
      expect(parsed.data.capabilities).toEqual(source.capabilities);
      expect(Object.isFrozen(parsed.data)).toBe(true);
      expect(Object.isFrozen(parsed.data.geometry)).toBe(true);
      expect(Object.isFrozen(parsed.data.geometry.alignmentRefs)).toBe(true);
      expect(Object.isFrozen(parsed.data.capabilities)).toBe(true);
      expect(Object.isFrozen(input)).toBe(false);
      expect(Object.isFrozen(input.geometry)).toBe(false);
    });

    it("rejects unknown major schema versions", () => {
      const parsed = parseRoadToFrameTransferPackageValue({
        ...createValidPackage(),
        schemaVersion: "1.0.0",
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED",
          ),
        ).toBe(true);
      }
    });

    it("rejects invalid UUID and checksum values", () => {
      const invalidUuid = parseRoadToFrameTransferPackageValue({
        ...createValidPackage(),
        packageId: "not-a-uuid",
      });
      expect(invalidUuid.success).toBe(false);

      const invalidChecksum = parseRoadToFrameTransferPackageValue({
        ...createValidPackage(),
        contentChecksum: {
          algorithm: CONTENT_CHECKSUM_ALGORITHM,
          hexDigest: "Z".repeat(64),
        },
      });
      expect(invalidChecksum.success).toBe(false);
    });

    it("rejects nonfinite polyline and polygon geometry", () => {
      const geometry = createNonemptyGeometry();
      geometry.bearingLines[0] = {
        ...geometry.bearingLines[0]!,
        polyline: {
          points: [
            { x: Number.NaN, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
          ],
        },
      };
      const parsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry,
          selection: [ALIGNMENT_ID, STATION_ID, SUBSTRUCTURE_ID, BEARING_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(parsed.success).toBe(false);
    });

    it("rejects global duplicate geometry IDs and unresolved dependency refs", () => {
      const geometry = createNonemptyGeometry();
      geometry.bearingLines[0] = {
        ...geometry.bearingLines[0]!,
        entityId: ALIGNMENT_ID,
      };
      const duplicate = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry,
          selection: [ALIGNMENT_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(duplicate.success).toBe(false);

      const unresolved = createNonemptyGeometry();
      unresolved.stationRefs[0] = {
        ...unresolved.stationRefs[0]!,
        dependencyIds: ["00000000-0000-4000-8000-000000000099"],
      };
      const unresolvedParsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry: unresolved,
          selection: [ALIGNMENT_ID, STATION_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(unresolvedParsed.success).toBe(false);
    });

    it("accepts reverse dependency-first selection order when closure is complete", () => {
      const geometry = createNonemptyGeometry();
      const reverseSelection = [GIRDER_ID, SPAN_ID, BEARING_ID, SUBSTRUCTURE_ID, STATION_ID, ALIGNMENT_ID];
      const parsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry,
          selection: reverseSelection,
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(parsed.success).toBe(true);
    });

    it("rejects category refs pointing at wrong collections and bypassing dependencyIds", () => {
      const geometry = createNonemptyGeometry();
      geometry.stationRefs[0] = {
        ...geometry.stationRefs[0]!,
        alignmentRefId: SUBSTRUCTURE_ID,
      };
      const wrongCollection = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry,
          selection: [ALIGNMENT_ID, STATION_ID, SUBSTRUCTURE_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(wrongCollection.success).toBe(false);

      const bypassDependency = createNonemptyGeometry();
      bypassDependency.bearingLines[0] = {
        ...bypassDependency.bearingLines[0]!,
        dependencyIds: [ALIGNMENT_ID],
      };
      const bypassParsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry: bypassDependency,
          selection: [ALIGNMENT_ID, STATION_ID, SUBSTRUCTURE_ID, BEARING_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(bypassParsed.success).toBe(false);
    });

    it("rejects package artifact references with unsupported major schema versions", () => {
      const parsed = parseTransferRecordValue(
        createValidTransferRecord({
          packageRef: {
            ...createPackageRef(),
            schemaVersion: "1.0.0",
          },
        }),
      );
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED",
          ),
        ).toBe(true);
      }
    });

    it("rejects self and duplicate dependencies and selection closure violations", () => {
      const geometry = createNonemptyGeometry();
      geometry.substructures[0] = {
        ...geometry.substructures[0]!,
        dependencyIds: [SUBSTRUCTURE_ID],
      };
      const selfDependency = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry,
          selection: [ALIGNMENT_ID, STATION_ID, SUBSTRUCTURE_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(selfDependency.success).toBe(false);

      geometry.substructures[0] = {
        ...geometry.substructures[0]!,
        dependencyIds: [ALIGNMENT_ID, ALIGNMENT_ID],
      };
      const duplicateDependency = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry,
          selection: [ALIGNMENT_ID, STATION_ID, SUBSTRUCTURE_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(duplicateDependency.success).toBe(false);

      const closure = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry: createNonemptyGeometry(),
          selection: [GIRDER_ID],
          coordinateContext: createCoordinateContext({ withStation: true }),
        }),
      );
      expect(closure.success).toBe(false);
    });

    it("requires stationConvention when stationRefs are present", () => {
      const parsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          geometry: createNonemptyGeometry(),
          selection: [ALIGNMENT_ID, STATION_ID],
        }),
      );
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "TRANSFER_PACKAGE_STATION_CONVENTION_REQUIRED",
          ),
        ).toBe(true);
      }
    });

    it("rejects prohibited fields structurally and via direct semantic detection", () => {
      const structural = parseRoadToFrameTransferPackageValue({
        ...createValidPackage(),
        structuralModel: { nodes: [] },
      });
      expect(structural.success).toBe(false);

      const keys = detectForbiddenTransferPackageKeys({
        ...createValidPackage(),
        solverResults: [],
      });
      expect(keys).toContain("solverResults");
    });

    it("preserves artifact parse while applyability fails closed for unknown coordinate/capability", () => {
      const parsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          coordinateContext: createCoordinateContext({ confidenceStatus: "unknown" }),
          capabilities: [
            { capabilityId: "bridge-geometry-v1", status: "unknown", critical: true },
          ],
          capabilityAssessmentSummary: {
            mutationBlocked: true,
            blockedCapabilityIds: ["bridge-geometry-v1"],
          },
        }),
      );
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        return;
      }

      const applyability = assessPackageApplyability(parsed.data);
      expect(applyability.applyable).toBe(false);
      expect(applyability.blockers.length).toBeGreaterThan(0);
    });

    it("allows packages without capabilityAssessmentSummary while applyability stays fail-closed", () => {
      const parsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          coordinateContext: createCoordinateContext({ confidenceStatus: "unknown" }),
          capabilities: [
            { capabilityId: "bridge-geometry-v1", status: "unknown", critical: true },
          ],
        }),
      );
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        return;
      }

      const applyability = assessPackageApplyability(parsed.data);
      expect(applyability.applyable).toBe(false);
    });

    it("rejects non-blocking capability IDs in blockedCapabilityIds", () => {
      const parsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          capabilities: [
            { capabilityId: "bridge-geometry-v1", status: "supported", critical: true },
          ],
          capabilityAssessmentSummary: {
            mutationBlocked: true,
            blockedCapabilityIds: ["bridge-geometry-v1"],
          },
        }),
      );
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "CAPABILITY_ASSESSMENT_BLOCKED_ID_NOT_BLOCKING",
          ),
        ).toBe(true);
      }
    });

    it("rejects summary with mutationBlocked=false when coordinate context is not apply-ready", () => {
      const parsed = parseRoadToFrameTransferPackageValue(
        createValidPackage({
          coordinateContext: createCoordinateContext({ transformStatus: "conflicted" }),
          capabilityAssessmentSummary: {
            mutationBlocked: false,
          },
        }),
      );
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "CAPABILITY_ASSESSMENT_COORDINATE_TRANSFORM_NOT_BLOCKED",
          ),
        ).toBe(true);
      }
    });
  });

  describe("TransferRecord", () => {
    it("accepts valid first-import preview and reject records", () => {
      const preview = parseTransferRecordValue(createValidTransferRecord());
      expect(preview.success).toBe(true);

      const rejected = parseTransferRecordValue(
        createValidTransferRecord({
          status: "rejected",
          rejectedChanges: [
            {
              decisionId: "c0508400-e29b-41d4-a716-446655440008",
              reason: "User rejected preview",
            },
          ],
        }),
      );
      expect(rejected.success).toBe(true);
    });

    it("accepts accepted re-import records with targetAfter", () => {
      const parsed = parseTransferRecordValue(
        createValidTransferRecord({
          status: "accepted",
          firstImport: false,
          baselineRecordRef: createRecordRef(BASELINE_RECORD_ID),
          targetAfter: createFrameDocumentRef(2, ALT_SHA256),
          acceptedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              entityId: GIRDER_ID,
              reason: "Accepted girder geometry",
            },
          ],
          entityMappings: [
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: [FRAME_ENTITY_ID],
              disposition: "mapped",
            },
          ],
        }),
      );
      expect(parsed.success).toBe(true);
    });

    it("enforces firstImport/baseline and targetAfter status invariants", () => {
      const missingBaseline = parseTransferRecordValue(
        createValidTransferRecord({
          firstImport: false,
        }),
      );
      expect(missingBaseline.success).toBe(false);

      const forbiddenTargetAfter = parseTransferRecordValue(
        createValidTransferRecord({
          status: "previewed",
          targetAfter: createFrameDocumentRef(2, ALT_SHA256),
        }),
      );
      expect(forbiddenTargetAfter.success).toBe(false);

      const requiredTargetAfter = parseTransferRecordValue(
        createValidTransferRecord({
          status: "accepted",
          targetAfter: undefined,
          acceptedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              reason: "Accepted",
            },
          ],
        }),
      );
      expect(requiredTargetAfter.success).toBe(false);
    });

    it("requires targetBefore/After same document with advanced revision and changed checksum", () => {
      const sameRevision = parseTransferRecordValue(
        createValidTransferRecord({
          status: "accepted",
          targetAfter: createFrameDocumentRef(1),
          acceptedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              reason: "Accepted",
            },
          ],
        }),
      );
      expect(sameRevision.success).toBe(false);

      const greaterRevisionSameChecksum = parseTransferRecordValue(
        createValidTransferRecord({
          status: "accepted",
          targetAfter: createFrameDocumentRef(2),
          acceptedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              reason: "Accepted",
            },
          ],
        }),
      );
      expect(greaterRevisionSameChecksum.success).toBe(false);

      const equalRevisionDifferentChecksum = parseTransferRecordValue(
        createValidTransferRecord({
          status: "accepted",
          targetAfter: createFrameDocumentRef(1, ALT_SHA256),
          acceptedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              reason: "Accepted",
            },
          ],
        }),
      );
      expect(equalRevisionDifferentChecksum.success).toBe(false);

      const differentDocument = parseTransferRecordValue(
        createValidTransferRecord({
          status: "accepted",
          targetAfter: {
            ...createFrameDocumentRef(2, ALT_SHA256),
            documentId: "00000000-0000-4000-8000-000000000099",
          },
          acceptedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              reason: "Accepted",
            },
          ],
        }),
      );
      expect(differentDocument.success).toBe(false);
    });

    it("requires exact package/source/target kinds and versions/checksums", () => {
      const wrongSourceKind = parseTransferRecordValue(
        createValidTransferRecord({
          sourceDocumentRef: createFrameDocumentRef(1),
        }),
      );
      expect(wrongSourceKind.success).toBe(false);

      const wrongTargetKind = parseTransferRecordValue(
        createValidTransferRecord({
          targetBefore: createRoadDocumentRef(),
        }),
      );
      expect(wrongTargetKind.success).toBe(false);
    });

    it("enforces mapping disposition invariants and order-independent namespace reuse checks", () => {
      const mappedWithoutFrames = parseTransferRecordValue(
        createValidTransferRecord({
          entityMappings: [
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: [],
              disposition: "mapped",
            },
          ],
        }),
      );
      expect(mappedWithoutFrames.success).toBe(false);

      const unmappedWithFrames = parseTransferRecordValue(
        createValidTransferRecord({
          entityMappings: [
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: [FRAME_ENTITY_ID],
              disposition: "unmapped",
            },
          ],
        }),
      );
      expect(unmappedWithFrames.success).toBe(false);

      const otherRoadId = "b1508400-e29b-41d4-a716-446655440012";
      const crossNamespaceReuse = parseTransferRecordValue(
        createValidTransferRecord({
          entityMappings: [
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: [FRAME_ENTITY_ID],
              disposition: "mapped",
            },
            {
              roadGeometryId: otherRoadId,
              frameEntityIds: [GIRDER_ID],
              disposition: "mapped",
            },
          ],
        }),
      );
      expect(crossNamespaceReuse.success).toBe(false);

      const reverseOrderReuse = parseTransferRecordValue(
        createValidTransferRecord({
          entityMappings: [
            {
              roadGeometryId: otherRoadId,
              frameEntityIds: [GIRDER_ID],
              disposition: "mapped",
            },
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: [FRAME_ENTITY_ID],
              disposition: "mapped",
            },
          ],
        }),
      );
      expect(reverseOrderReuse.success).toBe(false);
    });

    it("validates transfer capability assessment semantics and optional preservation refs", () => {
      const blockedContradiction = parseTransferRecordValue(
        createValidTransferRecord({
          capabilityAssessment: [
            {
              capabilityId: "bridge-geometry-v1",
              producerStatus: "unknown",
              consumerStatus: "supported",
              blocked: false,
            },
          ],
        }),
      );
      expect(blockedContradiction.success).toBe(false);

      const blockedWithPolicyReason = parseTransferRecordValue(
        createValidTransferRecord({
          capabilityAssessment: [
            {
              capabilityId: "bridge-geometry-v1",
              producerStatus: "supported",
              consumerStatus: "supported",
              blocked: true,
              reason: "Apply profile dependency not satisfied",
            },
          ],
        }),
      );
      expect(blockedWithPolicyReason.success).toBe(true);

      const blockedWithoutReason = parseTransferRecordValue(
        createValidTransferRecord({
          capabilityAssessment: [
            {
              capabilityId: "bridge-geometry-v1",
              producerStatus: "supported",
              consumerStatus: "supported",
              blocked: true,
            },
          ],
        }),
      );
      expect(blockedWithoutReason.success).toBe(false);

      const withPreservation = parseTransferRecordValue(
        createValidTransferRecord({
          validationRef: {
            documentKind: "validation-result",
            documentId: "e1508400-e29b-41d4-a716-446655440014",
            revisionId: 1,
            contentChecksum: createChecksum(),
          },
          unknownFieldStoreRef: {
            documentKind: "unknown-field-store",
            documentId: "f1508400-e29b-41d4-a716-446655440015",
            revisionId: 1,
            contentChecksum: createChecksum(),
          },
        }),
      );
      expect(withPreservation.success).toBe(true);
    });

    it("requires rollbackOf for rolled-back records and forbids it otherwise", () => {
      const missingRollbackOf = parseTransferRecordValue(
        createValidTransferRecord({
          status: "rolled-back",
          targetAfter: createFrameDocumentRef(2, ALT_SHA256),
          acceptedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              reason: "Rolled back",
            },
          ],
        }),
      );
      expect(missingRollbackOf.success).toBe(false);

      const forbiddenRollbackOf = parseTransferRecordValue(
        createValidTransferRecord({
          rollbackOf: createRecordRef(BASELINE_RECORD_ID),
        }),
      );
      expect(forbiddenRollbackOf.success).toBe(false);
      if (!forbiddenRollbackOf.success) {
        expect(
          forbiddenRollbackOf.validation.issues.some(
            (issue) => issue.code === "TRANSFER_RECORD_ROLLBACK_OF_FORBIDDEN",
          ),
        ).toBe(true);
      }
    });

    it("returns ContractParseResult failure without throwing for semantic validation errors", () => {
      expect(() =>
        parseTransferRecordValue({
          ...createValidTransferRecord(),
          capabilityAssessment: [
            {
              capabilityId: "bridge-geometry-v1",
              producerStatus: "unsupported",
              consumerStatus: "supported",
              blocked: false,
            },
          ],
        }),
      ).not.toThrow();

      const parsed = parseTransferRecordValue({
        ...createValidTransferRecord(),
        capabilityAssessment: [
          {
            capabilityId: "bridge-geometry-v1",
            producerStatus: "unsupported",
            consumerStatus: "supported",
            blocked: false,
          },
        ],
      });
      expect(parsed.success).toBe(false);
    });

    it("supports one-to-many mappings but rejects duplicate source IDs and namespace reuse", () => {
      const oneToMany = parseTransferRecordValue(
        createValidTransferRecord({
          entityMappings: [
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: [
                "b1508400-e29b-41d4-a716-446655440012",
                "b2508400-e29b-41d4-a716-446655440013",
              ],
              disposition: "mapped",
            },
          ],
        }),
      );
      expect(oneToMany.success).toBe(true);

      const duplicateSource = parseTransferRecordValue(
        createValidTransferRecord({
          entityMappings: [
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: [FRAME_ENTITY_ID],
              disposition: "mapped",
            },
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: ["b1508400-e29b-41d4-a716-446655440012"],
              disposition: "mapped",
            },
          ],
        }),
      );
      expect(duplicateSource.success).toBe(false);

      const namespaceReuse = parseTransferRecordValue(
        createValidTransferRecord({
          entityMappings: [
            {
              roadGeometryId: GIRDER_ID,
              frameEntityIds: [GIRDER_ID],
              disposition: "mapped",
            },
          ],
        }),
      );
      expect(namespaceReuse.success).toBe(false);
    });

    it("rejects cross-list decision collisions and inconsistent status lists", () => {
      const collision = parseTransferRecordValue(
        createValidTransferRecord({
          status: "partially-accepted",
          firstImport: false,
          baselineRecordRef: createRecordRef(BASELINE_RECORD_ID),
          targetAfter: createFrameDocumentRef(2, ALT_SHA256),
          acceptedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              reason: "Accepted",
            },
          ],
          rejectedChanges: [
            {
              decisionId: "c1508400-e29b-41d4-a716-446655440009",
              reason: "Rejected",
            },
          ],
        }),
      );
      expect(collision.success).toBe(false);

      const inconsistent = parseTransferRecordValue(
        createValidTransferRecord({
          status: "accepted",
          acceptedChanges: [],
        }),
      );
      expect(inconsistent.success).toBe(false);
    });

    it("round-trips through JSON and freezes parsed output without mutating input", () => {
      const source = createValidTransferRecord({
        status: "rejected",
        rejectedChanges: [
          {
            decisionId: "c0508400-e29b-41d4-a716-446655440008",
            reason: "Rejected",
          },
        ],
      });
      const input = structuredClone(source);
      const parsed = parseTransferRecordValue(JSON.parse(JSON.stringify(source)));
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        return;
      }

      expect(Object.isFrozen(parsed.data)).toBe(true);
      expect(Object.isFrozen(parsed.data.entityMappings)).toBe(true);
      expect(Object.isFrozen(input)).toBe(false);
    });
  });

  describe("contract version registry and JSON schema output", () => {
    it("registers both transfer families at v0.1.0 only", () => {
      expect(
        validateSupportedContractVersion(
          ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
          ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
        ).status,
      ).toBe("valid");
      expect(
        validateSupportedContractVersion(
          TRANSFER_RECORD_SCHEMA_ID,
          TRANSFER_RECORD_SCHEMA_VERSION,
        ).status,
      ).toBe("valid");
      expect(
        validateSupportedContractVersion(
          ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
          "1.0.0" as never,
        ).status,
      ).toBe("invalid");
    });

    it("reports package artifact schema version issues at /packageRef/schemaVersion", () => {
      const parsed = parseTransferRecordValue(
        createValidTransferRecord({
          packageRef: {
            ...createPackageRef(),
            schemaVersion: "1.0.0",
          },
        }),
      );
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) =>
              issue.code === "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED" &&
              issue.path === "/packageRef/schemaVersion",
          ),
        ).toBe(true);
        expect(
          parsed.validation.issues.some(
            (issue) => issue.path === "/packageRef/schemaVersion/schemaVersion",
          ),
        ).toBe(false);
      }
    });

    it("generates schemas at repo-root schemas/contracts/v0.1 without frontend/schemas", () => {
      const slugs = generateAllContractJsonSchemas().map((entry) => entry.slug);
      expect(slugs).toContain("road-to-frame-transfer-package");
      expect(slugs).toContain("transfer-record");
      expect(contractJsonSchemaPath("road-to-frame-transfer-package")).toBe(
        "schemas/contracts/v0.1/road-to-frame-transfer-package.schema.json",
      );
      expect(contractJsonSchemaPath("transfer-record")).toBe(
        "schemas/contracts/v0.1/transfer-record.schema.json",
      );
      expect(contractJsonSchemaPath("road-to-frame-transfer-package").startsWith("frontend/")).toBe(
        false,
      );
    });
  });
});
