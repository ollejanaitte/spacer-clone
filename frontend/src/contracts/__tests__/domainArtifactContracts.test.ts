import { describe, expect, it } from "vitest";
import {
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
  CONTENT_CHECKSUM_ALGORITHM,
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  ENGINEERING_PROJECT_SCHEMA_ID,
  REVISION_METADATA_SCHEMA_VERSION,
  ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
  ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
  UNIT_CONTEXT_SCHEMA_VERSION,
  contractJsonSchemaPath,
  generateAllContractJsonSchemas,
  parseBridgeFrameAnalysisDocumentValue,
  parseRoadDesignDocumentValue,
  validateBridgeFrameAnalysisDocument,
  validateRoadDesignDocument,
  validateSupportedContractVersion,
} from "../index";

const ROAD_DOC_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const FRAME_DOC_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const CONTEXT_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const ALIGNMENT_ID = "a0508400-e29b-41d4-a716-446655440001";
const STATIONING_ID = "a1508400-e29b-41d4-a716-446655440002";
const PROFILE_ID = "a2508400-e29b-41d4-a716-446655440003";
const CROSS_SECTION_ID = "a3508400-e29b-41d4-a716-446655440004";
const BRIDGE_ID = "a4508400-e29b-41d4-a716-446655440005";
const NODE_I_ID = "b0508400-e29b-41d4-a716-446655440011";
const NODE_J_ID = "b1508400-e29b-41d4-a716-446655440012";
const MATERIAL_ID = "b2508400-e29b-41d4-a716-446655440013";
const SECTION_ID = "b3508400-e29b-41d4-a716-446655440014";
const MEMBER_ID = "b4508400-e29b-41d4-a716-446655440015";
const SUPPORT_ID = "b5508400-e29b-41d4-a716-446655440016";
const LOAD_ID = "b6508400-e29b-41d4-a716-446655440017";
const SETTINGS_ID = "b7508400-e29b-41d4-a716-446655440018";
const BINDING_ID = "b8508400-e29b-41d4-a716-446655440019";
const VALIDATION_REF_ID = "b9508400-e29b-41d4-a716-446655440020";

const VALID_SHA256 = "a".repeat(64);

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
] as const;

function createChecksum() {
  return {
    algorithm: CONTENT_CHECKSUM_ALGORITHM,
    hexDigest: VALID_SHA256,
  };
}

function createProvenance() {
  return {
    createdAt: "2026-07-15T12:00:00.000Z",
    createdBy: { actorId: "user-1", actorType: "user" as const },
    producer: { toolId: "spacer", toolVersion: "0.1.0" },
  };
}

function createRevisionMetadata(documentId: string, revisionId: number) {
  return {
    schemaVersion: REVISION_METADATA_SCHEMA_VERSION,
    documentId,
    revisionId,
    createdAt: "2026-07-15T12:00:00.000Z",
    contentChecksum: createChecksum(),
  };
}

function createValidationRef(documentId: string) {
  return {
    documentKind: "validation-result" as const,
    documentId,
    revisionId: 1,
    contentChecksum: createChecksum(),
  };
}

function createCoordinateContext(withStation = true) {
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

function createFrameUnitContext() {
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

function createValidRoadDesignDocument() {
  return {
    schemaId: ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
    schemaVersion: ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
    documentKind: "road-design" as const,
    documentId: ROAD_DOC_ID,
    revisionId: 1,
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    coordinateContexts: [createCoordinateContext(true)],
    unitContext: createRoadUnitContext(),
    stableIdRegistry: [
      {
        namespace: "road.geometry",
        id: ALIGNMENT_ID,
        entityKind: "alignment",
      },
      {
        namespace: "road.geometry",
        id: STATIONING_ID,
        entityKind: "stationing",
      },
      {
        namespace: "road.geometry",
        id: PROFILE_ID,
        entityKind: "profile",
      },
      {
        namespace: "road.geometry",
        id: CROSS_SECTION_ID,
        entityKind: "cross-section",
      },
      {
        namespace: "road.geometry",
        id: BRIDGE_ID,
        entityKind: "bridge",
      },
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
    revision: createRevisionMetadata(ROAD_DOC_ID, 1),
    validation: createValidationRef(VALIDATION_REF_ID),
    bridgeGeometryCapability: { state: "absent" as const },
  };
}

function createValidBridgeFrameAnalysisDocument() {
  return {
    schemaId: BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
    schemaVersion: BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
    documentKind: "bridge-frame-analysis" as const,
    documentId: FRAME_DOC_ID,
    revisionId: 1,
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
        targetEntityKind: "node",
        targetEntityId: NODE_I_ID,
        sourceEntityId: ALIGNMENT_ID,
      },
    ],
    revision: createRevisionMetadata(FRAME_DOC_ID, 1),
    validation: createValidationRef(VALIDATION_REF_ID),
    springsCapability: { state: "absent" as const },
  };
}

describe("Step 0B2b domain artifact contracts", () => {
  describe("RoadDesignDocument", () => {
    it("accepts a valid minimal road design document", () => {
      const parsed = parseRoadDesignDocumentValue(createValidRoadDesignDocument());
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.documentKind).toBe("road-design");
        expect(parsed.data.alignments).toHaveLength(1);
      }
    });

    it("round-trips through JSON with semantic equality", () => {
      const source = createValidRoadDesignDocument();
      const parsed = parseRoadDesignDocumentValue(JSON.parse(JSON.stringify(source)));
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual(source);
      }
    });

    it("rejects fixed schemaId/documentKind mismatches", () => {
      const wrongSchema = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        schemaId: ENGINEERING_PROJECT_SCHEMA_ID,
      });
      expect(wrongSchema.success).toBe(false);

      const wrongKind = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        documentKind: "bridge-frame-analysis",
      });
      expect(wrongKind.success).toBe(false);
    });

    it("rejects envelope revision and checksum mismatches", () => {
      const revisionMismatch = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        revision: createRevisionMetadata(FRAME_DOC_ID, 1),
      });
      expect(revisionMismatch.success).toBe(false);
      if (!revisionMismatch.success) {
        expect(
          revisionMismatch.validation.issues.some(
            (issue) => issue.code === "ROAD_DESIGN_REVISION_DOCUMENT_ID_MISMATCH",
          ),
        ).toBe(true);
      }

      const checksumMismatch = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        revision: {
          ...createRevisionMetadata(ROAD_DOC_ID, 1),
          contentChecksum: {
            algorithm: CONTENT_CHECKSUM_ALGORITHM,
            hexDigest: "b".repeat(64),
          },
        },
      });
      expect(checksumMismatch.success).toBe(false);
      if (!checksumMismatch.success) {
        expect(
          checksumMismatch.validation.issues.some(
            (issue) => issue.code === "ROAD_DESIGN_REVISION_CHECKSUM_MISMATCH",
          ),
        ).toBe(true);
      }
    });

    it("rejects duplicate stable IDs across road entity collections", () => {
      const parsed = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        profiles: [
          {
            entityId: ALIGNMENT_ID,
            alignmentId: ALIGNMENT_ID,
            label: "Reused id",
          },
        ],
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "ROAD_DESIGN_ENTITY_ID_CROSS_COLLECTION_DUPLICATE",
          ),
        ).toBe(true);
      }
    });

    it("rejects missing, mismatched, and orphan stableIdRegistry entries", () => {
      const missingRegistry = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        stableIdRegistry: createValidRoadDesignDocument().stableIdRegistry.filter(
          (entry) => entry.id !== STATIONING_ID,
        ),
      });
      expect(missingRegistry.success).toBe(false);
      if (!missingRegistry.success) {
        expect(
          missingRegistry.validation.issues.some(
            (issue) => issue.code === "ROAD_DESIGN_STABLE_ID_REGISTRY_ENTRY_MISSING",
          ),
        ).toBe(true);
      }

      const kindMismatch = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        stableIdRegistry: createValidRoadDesignDocument().stableIdRegistry.map((entry) =>
          entry.id === PROFILE_ID ? { ...entry, entityKind: "alignment" } : entry,
        ),
      });
      expect(kindMismatch.success).toBe(false);
      if (!kindMismatch.success) {
        expect(
          kindMismatch.validation.issues.some(
            (issue) => issue.code === "ROAD_DESIGN_STABLE_ID_REGISTRY_KIND_MISMATCH",
          ),
        ).toBe(true);
      }

      const orphan = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        stableIdRegistry: [
          ...createValidRoadDesignDocument().stableIdRegistry,
          {
            namespace: "road.geometry",
            id: "c0508400-e29b-41d4-a716-446655440099",
            entityKind: "bridge",
          },
        ],
      });
      expect(orphan.success).toBe(false);
      if (!orphan.success) {
        expect(
          orphan.validation.issues.some(
            (issue) => issue.code === "ROAD_DESIGN_STABLE_ID_REGISTRY_ORPHAN",
          ),
        ).toBe(true);
      }
    });

    it("rejects empty or missing coordinateContexts via direct semantic validator", () => {
      const parsed = parseRoadDesignDocumentValue(createValidRoadDesignDocument());
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        return;
      }

      const missing = validateRoadDesignDocument({
        ...parsed.data,
        coordinateContexts: undefined,
      });
      expect(missing.status).toBe("invalid");
      expect(
        missing.issues.some((issue) => issue.code === "ROAD_DESIGN_COORDINATE_CONTEXTS_MISSING"),
      ).toBe(true);

      const empty = validateRoadDesignDocument({
        ...parsed.data,
        coordinateContexts: [],
      });
      expect(empty.status).toBe("invalid");
      expect(
        empty.issues.some((issue) => issue.code === "ROAD_DESIGN_COORDINATE_CONTEXTS_EMPTY"),
      ).toBe(true);
    });

    it("rejects invalid coordinate and unit contexts", () => {
      const invalidCoordinate = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        coordinateContexts: [createCoordinateContext(false)],
      });
      expect(invalidCoordinate.success).toBe(false);
      if (!invalidCoordinate.success) {
        expect(
          invalidCoordinate.validation.issues.some(
            (issue) => issue.code === "ROAD_DESIGN_STATION_CAPABLE_CONTEXT_REQUIRED",
          ),
        ).toBe(true);
      }

      const invalidUnit = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        unitContext: {
          schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
          contextId: CONTEXT_ID,
          length: "invalid-unit",
          angle: "rad",
          conversionVersion: "si-v1",
        },
      });
      expect(invalidUnit.success).toBe(false);
      if (!invalidUnit.success) {
        expect(
          invalidUnit.validation.issues.some(
            (issue) =>
              issue.code === "UNIT_LENGTH_INVALID" || issue.code.startsWith("ZOD_"),
          ),
        ).toBe(true);
      }
    });

    it("structurally rejects forbidden frame mechanics fields", () => {
      const parsed = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        structuralModel: { nodes: [] },
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some((issue) => issue.code === "ZOD_UNRECOGNIZED_KEYS"),
        ).toBe(true);
      }
    });

    it("rejects unknown major schema versions via parser inputs", () => {
      const registryResult = validateSupportedContractVersion(
        ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
        "1.0.0" as never,
      );
      expect(registryResult.status).toBe("invalid");
      expect(
        registryResult.issues.some((issue) => issue.code === "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED"),
      ).toBe(true);

      const roadParsed = parseRoadDesignDocumentValue({
        ...createValidRoadDesignDocument(),
        schemaVersion: "1.0.0",
      });
      expect(roadParsed.success).toBe(false);
      if (!roadParsed.success) {
        expect(
          roadParsed.validation.issues.some(
            (issue) => issue.code === "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED",
          ),
        ).toBe(true);
      }

      const frameParsed = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        schemaVersion: "1.0.0",
      });
      expect(frameParsed.success).toBe(false);
      if (!frameParsed.success) {
        expect(
          frameParsed.validation.issues.some(
            (issue) => issue.code === "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED",
          ),
        ).toBe(true);
      }
    });
  });

  describe("BridgeFrameAnalysisDocument", () => {
    it("accepts a valid minimal frame analysis document", () => {
      const parsed = parseBridgeFrameAnalysisDocumentValue(createValidBridgeFrameAnalysisDocument());
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.structuralModel.members).toHaveLength(1);
        expect(parsed.data.transferBindings).toHaveLength(1);
      }
    });

    it("round-trips through JSON with semantic equality", () => {
      const source = createValidBridgeFrameAnalysisDocument();
      const parsed = parseBridgeFrameAnalysisDocumentValue(JSON.parse(JSON.stringify(source)));
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual(source);
      }
    });

    it("rejects fixed schemaId/documentKind mismatches", () => {
      const wrongSchema = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        schemaId: ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
      });
      expect(wrongSchema.success).toBe(false);

      const wrongKind = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        documentKind: "road-design",
      });
      expect(wrongKind.success).toBe(false);
    });

    it("rejects envelope revision and checksum mismatches", () => {
      const parsed = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        revisionId: 2,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some((issue) => issue.code === "BRIDGE_FRAME_REVISION_ID_MISMATCH"),
        ).toBe(true);
      }
    });

    it("structurally rejects forbidden viewer and road truth fields", () => {
      const viewer = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        viewerState: { camera: [0, 0, 0] },
      });
      expect(viewer.success).toBe(false);

      const roadTruth = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        alignments: [],
      });
      expect(roadTruth.success).toBe(false);
    });

    it("rejects broken structural model references and same-node members", () => {
      const brokenRefs = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        structuralModel: {
          ...createValidBridgeFrameAnalysisDocument().structuralModel,
          members: [
            {
              entityId: MEMBER_ID,
              nodeIId: NODE_I_ID,
              nodeJId: "c0508400-e29b-41d4-a716-446655440099",
              materialId: MATERIAL_ID,
              sectionId: SECTION_ID,
            },
          ],
        },
      });
      expect(brokenRefs.success).toBe(false);
      if (!brokenRefs.success) {
        expect(
          brokenRefs.validation.issues.some(
            (issue) => issue.code === "BRIDGE_FRAME_NODE_REF_UNRESOLVED",
          ),
        ).toBe(true);
      }

      const zeroLength = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        structuralModel: {
          ...createValidBridgeFrameAnalysisDocument().structuralModel,
          members: [
            {
              entityId: MEMBER_ID,
              nodeIId: NODE_I_ID,
              nodeJId: NODE_I_ID,
              materialId: MATERIAL_ID,
              sectionId: SECTION_ID,
            },
          ],
        },
      });
      expect(zeroLength.success).toBe(false);
      if (!zeroLength.success) {
        expect(
          zeroLength.validation.issues.some(
            (issue) => issue.code === "BRIDGE_FRAME_MEMBER_ZERO_LENGTH",
          ),
        ).toBe(true);
      }
    });

    it("requires transferBinding exact road source ref and provenance", () => {
      const wrongKind = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        transferBindings: [
          {
            ...createValidBridgeFrameAnalysisDocument().transferBindings[0]!,
            sourceDocumentRef: {
              documentKind: "bridge-frame-analysis",
              documentId: FRAME_DOC_ID,
              revisionId: 1,
              contentChecksum: createChecksum(),
            },
          },
        ],
      });
      expect(wrongKind.success).toBe(false);
      if (!wrongKind.success) {
        expect(
          wrongKind.validation.issues.some(
            (issue) =>
              issue.code === "DOCUMENT_REFERENCE_KIND_MISMATCH" ||
              issue.code === "BRIDGE_FRAME_TRANSFER_SOURCE_KIND_INVALID",
          ),
        ).toBe(true);
      }

      const missingProvenance = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        transferBindings: [
          {
            bindingId: BINDING_ID,
            sourceDocumentRef: {
              documentKind: "road-design",
              documentId: ROAD_DOC_ID,
              revisionId: 1,
              contentChecksum: createChecksum(),
            },
            mappingProvenance: {
              createdAt: "not-utc",
              createdBy: { actorId: "user-1", actorType: "user" },
              producer: { toolId: "spacer", toolVersion: "0.1.0" },
            },
            targetEntityKind: "node",
            targetEntityId: NODE_I_ID,
            sourceEntityId: ALIGNMENT_ID,
          },
        ],
      });
      expect(missingProvenance.success).toBe(false);
    });

    it("rejects empty or missing coordinateContexts via direct semantic validator", () => {
      const parsed = parseBridgeFrameAnalysisDocumentValue(createValidBridgeFrameAnalysisDocument());
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        return;
      }

      const missing = validateBridgeFrameAnalysisDocument({
        ...parsed.data,
        coordinateContexts: undefined,
      });
      expect(missing.status).toBe("invalid");
      expect(
        missing.issues.some((issue) => issue.code === "BRIDGE_FRAME_COORDINATE_CONTEXTS_MISSING"),
      ).toBe(true);

      const empty = validateBridgeFrameAnalysisDocument({
        ...parsed.data,
        coordinateContexts: [],
      });
      expect(empty.status).toBe("invalid");
      expect(
        empty.issues.some((issue) => issue.code === "BRIDGE_FRAME_COORDINATE_CONTEXTS_EMPTY"),
      ).toBe(true);
    });

    it("rejects duplicate entity IDs across frame collections", () => {
      const parsed = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        loadDefinitions: [
          {
            entityId: NODE_I_ID,
            label: "Reused node id",
            loadKind: "dead" as const,
          },
        ],
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "BRIDGE_FRAME_ENTITY_ID_CROSS_COLLECTION_DUPLICATE",
          ),
        ).toBe(true);
      }
    });

    it("rejects invalid analysisSettings.settingsVersion", () => {
      const parsed = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        analysisSettings: {
          ...createValidBridgeFrameAnalysisDocument().analysisSettings,
          settingsVersion: "not-semver",
        },
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) =>
              issue.code === "BRIDGE_FRAME_ANALYSIS_SETTINGS_VERSION_INVALID" ||
              issue.code.startsWith("ZOD_"),
          ),
        ).toBe(true);
      }

      const frameParsed = parseBridgeFrameAnalysisDocumentValue(createValidBridgeFrameAnalysisDocument());
      expect(frameParsed.success).toBe(true);
      if (!frameParsed.success) {
        return;
      }

      const direct = validateBridgeFrameAnalysisDocument({
        ...frameParsed.data,
        analysisSettings: {
          ...frameParsed.data.analysisSettings,
          settingsVersion: "01.0.0",
        },
      });
      expect(direct.status).toBe("invalid");
      expect(
        direct.issues.some(
          (issue) => issue.code === "BRIDGE_FRAME_ANALYSIS_SETTINGS_VERSION_INVALID",
        ),
      ).toBe(true);
    });

    it("resolves transferBinding targets against frame entities", () => {
      const unresolved = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        transferBindings: [
          {
            ...createValidBridgeFrameAnalysisDocument().transferBindings[0]!,
            targetEntityId: "c0508400-e29b-41d4-a716-446655440099",
          },
        ],
      });
      expect(unresolved.success).toBe(false);
      if (!unresolved.success) {
        expect(
          unresolved.validation.issues.some(
            (issue) => issue.code === "BRIDGE_FRAME_TRANSFER_TARGET_REF_UNRESOLVED",
          ),
        ).toBe(true);
      }

      const kindMismatch = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        transferBindings: [
          {
            ...createValidBridgeFrameAnalysisDocument().transferBindings[0]!,
            targetEntityKind: "member",
            targetEntityId: NODE_I_ID,
          },
        ],
      });
      expect(kindMismatch.success).toBe(false);
      if (!kindMismatch.success) {
        expect(
          kindMismatch.validation.issues.some(
            (issue) => issue.code === "BRIDGE_FRAME_TRANSFER_TARGET_KIND_MISMATCH",
          ),
        ).toBe(true);
      }
    });

    it("rejects mechanical unit profile gaps", () => {
      const parsed = parseBridgeFrameAnalysisDocumentValue({
        ...createValidBridgeFrameAnalysisDocument(),
        unitContext: createRoadUnitContext(),
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.validation.issues.some((issue) => issue.code === "UNIT_FORCE_INVALID")).toBe(
          true,
        );
      }
    });
  });

  describe("JSON Schema generation", () => {
    it("registers road and frame schemas at schemas/contracts/v0.1", () => {
      expect(contractJsonSchemaPath("road-design-document")).toBe(
        "schemas/contracts/v0.1/road-design-document.schema.json",
      );
      expect(contractJsonSchemaPath("bridge-frame-analysis-document")).toBe(
        "schemas/contracts/v0.1/bridge-frame-analysis-document.schema.json",
      );

      const slugs = generateAllContractJsonSchemas().map((generated) => generated.slug);
      expect(slugs).toContain("road-design-document");
      expect(slugs).toContain("bridge-frame-analysis-document");
    });
  });
});
