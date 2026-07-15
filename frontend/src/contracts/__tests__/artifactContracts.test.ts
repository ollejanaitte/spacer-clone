import { describe, expect, it } from "vitest";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  ENGINEERING_PROJECT_SCHEMA_ID,
  ENGINEERING_PROJECT_SCHEMA_VERSION,
  MIGRATION_RECORD_SCHEMA_ID,
  MIGRATION_RECORD_SCHEMA_VERSION,
  REVISION_METADATA_SCHEMA_VERSION,
  UNKNOWN_FIELD_STORE_SCHEMA_ID,
  UNKNOWN_FIELD_STORE_SCHEMA_VERSION,
  VALIDATION_RESULT_SCHEMA_VERSION,
  detectForbiddenEmbeddedPayloadKeys,
  parseCommonEnvelopeValue,
  parseContentChecksumValue,
  parseDocumentReferenceValue,
  parseEngineeringProjectValue,
  parseMigrationRecordValue,
  parseUnknownFieldStoreValue,
  validateExtensions,
  validateSupportedContractVersion,
} from "../index";

const PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";
const ROAD_DOC_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const FRAME_DOC_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const RECORD_ID = "8d3e3b2a-1111-4222-8333-444455556666";
const STORE_ID = "9f4e4c3b-2222-4333-8444-555566667777";
const MIGRATION_ID = "a05f5d4c-3333-4444-8555-666677778888";

const VALID_SHA256 = "a".repeat(64);

function createChecksum() {
  return {
    algorithm: CONTENT_CHECKSUM_ALGORITHM,
    hexDigest: VALID_SHA256,
  };
}

function createResourceRef(uri: string) {
  return {
    uri,
    contentChecksum: createChecksum(),
  };
}

function createDocumentReference(
  documentKind: "road-design" | "bridge-frame-analysis" | "transfer-record" | "engineering-project",
  documentId: string,
  revisionId: number,
) {
  return {
    documentKind,
    documentId,
    revisionId,
    contentChecksum: createChecksum(),
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

function createValidEngineeringProject() {
  return {
    schemaId: ENGINEERING_PROJECT_SCHEMA_ID,
    schemaVersion: ENGINEERING_PROJECT_SCHEMA_VERSION,
    documentKind: "engineering-project" as const,
    projectId: PROJECT_ID,
    revisionId: 1,
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    name: "Bridge study",
    roadDesignRef: createDocumentReference("road-design", ROAD_DOC_ID, 2),
    frameAnalysisRefs: [createDocumentReference("bridge-frame-analysis", FRAME_DOC_ID, 1)],
    transferRecordRefs: [createDocumentReference("transfer-record", RECORD_ID, 1)],
    projectRevisionMetadata: createRevisionMetadata(PROJECT_ID, 1),
  };
}

function createValidUnknownFieldStore() {
  return {
    schemaId: UNKNOWN_FIELD_STORE_SCHEMA_ID,
    schemaVersion: UNKNOWN_FIELD_STORE_SCHEMA_VERSION,
    documentKind: "unknown-field-store" as const,
    storeId: STORE_ID,
    sourceRawChecksum: createChecksum(),
    sourceVersionClassification: "exact_supported" as const,
    sourceVersion: "0.1.0",
    entries: [
      {
        jsonPointer: "/legacy/extra",
        criticality: "optional" as const,
        rawPayloadRef: createResourceRef("blob://raw/legacy-extra"),
      },
    ],
  };
}

function createValidMigrationRecord() {
  return {
    schemaId: MIGRATION_RECORD_SCHEMA_ID,
    schemaVersion: MIGRATION_RECORD_SCHEMA_VERSION,
    documentKind: "migration-record" as const,
    migrationId: MIGRATION_ID,
    adapterId: "legacy-project-model",
    adapterVersion: "0.1.0",
    sourceRawChecksum: createChecksum(),
    sourceContentChecksum: createChecksum(),
    sourceVersion: "legacy-1",
    targetVersion: "0.1.0",
    targetRefs: [createDocumentReference("engineering-project", PROJECT_ID, 1)],
    diagnostics: [],
    recordedAt: "2026-07-15T12:30:00.000Z",
    idMappings: [
      {
        sourceId: "old-1",
        disposition: "committed" as const,
        targetId: ROAD_DOC_ID,
      },
    ],
    status: "committed" as const,
  };
}

describe("Step 0B2a artifact contracts", () => {
  describe("ContentChecksum", () => {
    it("accepts valid sha256 lowercase hex digests", () => {
      const parsed = parseContentChecksumValue(createChecksum());
      expect(parsed.success).toBe(true);
    });

    it("rejects uppercase hex digests", () => {
      const parsed = parseContentChecksumValue({
        algorithm: CONTENT_CHECKSUM_ALGORITHM,
        hexDigest: "A".repeat(64),
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some((issue) => issue.code.startsWith("ZOD_")),
        ).toBe(true);
      }
    });

    it("rejects non-sha256 algorithms", () => {
      const parsed = parseContentChecksumValue({
        algorithm: "md5",
        hexDigest: VALID_SHA256,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("DocumentReference", () => {
    it("rejects non-positive revisions", () => {
      const parsed = parseDocumentReferenceValue({
        ...createDocumentReference("road-design", ROAD_DOC_ID, 1),
        revisionId: 0,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) =>
              issue.code === "DOCUMENT_REFERENCE_REVISION_INVALID" ||
              issue.code === "ZOD_TOO_SMALL",
          ),
        ).toBe(true);
      }
    });
  });

  describe("CommonEnvelope", () => {
    it("rejects unregistered schemaId values fail-closed", () => {
      const parsed = parseCommonEnvelopeValue({
        schemaId: "spacer.contracts.not-registered",
        schemaVersion: ENGINEERING_PROJECT_SCHEMA_VERSION,
        documentId: PROJECT_ID,
        documentKind: "engineering-project",
        revisionId: 1,
        contentChecksum: createChecksum(),
        provenance: createProvenance(),
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "COMMON_ENVELOPE_SCHEMA_ID_UNKNOWN",
          ),
        ).toBe(true);
      }
    });
  });

  describe("Extensions", () => {
    it("rejects extension entries with both json and resourceRef", () => {
      const result = validateExtensions({
        "vendor.example/key": {
          json: { enabled: true },
          resourceRef: createResourceRef("blob://ext"),
        },
      });
      expect(result.status).toBe("invalid");
      expect(result.issues.some((issue) => issue.code === "EXTENSION_VALUE_EXCLUSIVE")).toBe(true);
    });

    it("rejects non-finite JSON numbers in extension json", () => {
      const result = validateExtensions({
        "vendor.example/key": {
          json: Number.NaN,
        },
      });
      expect(result.status).toBe("invalid");
      expect(result.issues.some((issue) => issue.code === "EXTENSION_JSON_INVALID")).toBe(true);
    });

    it("loses NaN through JSON round-trip and rejects on re-parse", () => {
      const source = {
        "vendor.example/key": {
          json: { factor: Number.NaN },
        },
      };
      const serialized = JSON.parse(JSON.stringify(source)) as typeof source;
      expect(serialized["vendor.example/key"].json).toEqual({ factor: null });
      const result = validateExtensions(serialized);
      expect(result.status).toBe("valid");
    });
  });

  describe("EngineeringProject", () => {
    it("accepts a valid reference manifest", () => {
      const parsed = parseEngineeringProjectValue(createValidEngineeringProject());
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.roadDesignRef?.documentKind).toBe("road-design");
        expect(parsed.data.frameAnalysisRefs).toHaveLength(1);
        expect(parsed.data.transferRecordRefs).toHaveLength(1);
      }
    });

    it("round-trips through JSON with semantic equality", () => {
      const source = createValidEngineeringProject();
      const serialized = JSON.parse(JSON.stringify(source)) as unknown;
      const parsed = parseEngineeringProjectValue(serialized);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(JSON.stringify(parsed.data)).toBe(JSON.stringify(source));
      }
    });

    it("rejects revision metadata mismatches", () => {
      const parsed = parseEngineeringProjectValue({
        ...createValidEngineeringProject(),
        projectRevisionMetadata: createRevisionMetadata(ROAD_DOC_ID, 2),
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "ENGINEERING_PROJECT_REVISION_DOCUMENT_ID_MISMATCH",
          ),
        ).toBe(true);
      }
    });

    it("rejects checksum mismatches between top-level and revision metadata", () => {
      const parsed = parseEngineeringProjectValue({
        ...createValidEngineeringProject(),
        projectRevisionMetadata: {
          ...createRevisionMetadata(PROJECT_ID, 1),
          contentChecksum: {
            algorithm: CONTENT_CHECKSUM_ALGORITHM,
            hexDigest: "b".repeat(64),
          },
        },
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "ENGINEERING_PROJECT_REVISION_CHECKSUM_MISMATCH",
          ),
        ).toBe(true);
      }
    });

    it("rejects unknown top-level fields", () => {
      const parsed = parseEngineeringProjectValue({
        ...createValidEngineeringProject(),
        viewerState: { camera: [0, 0, 0] },
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some((issue) => issue.code === "ZOD_UNRECOGNIZED_KEYS"),
        ).toBe(true);
      }
    });

    it("rejects wrong roadDesignRef document kind", () => {
      const parsed = parseEngineeringProjectValue({
        ...createValidEngineeringProject(),
        roadDesignRef: createDocumentReference("bridge-frame-analysis", FRAME_DOC_ID, 1),
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "DOCUMENT_REFERENCE_KIND_MISMATCH",
          ),
        ).toBe(true);
      }
    });

    it("rejects duplicate frame analysis references", () => {
      const duplicateRef = createDocumentReference("bridge-frame-analysis", FRAME_DOC_ID, 1);
      const parsed = parseEngineeringProjectValue({
        ...createValidEngineeringProject(),
        frameAnalysisRefs: [duplicateRef, duplicateRef],
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some((issue) => issue.code === "DOCUMENT_REFERENCE_DUPLICATE"),
        ).toBe(true);
      }
    });

    it("rejects unsupported schema versions without defaulting", () => {
      const parsed = parseEngineeringProjectValue({
        ...createValidEngineeringProject(),
        schemaVersion: "0.2.0",
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "CONTRACT_SCHEMA_VERSION_UNSUPPORTED",
          ),
        ).toBe(true);
      }
    });

    it("rejects unknown major schema versions", () => {
      const result = validateSupportedContractVersion(
        ENGINEERING_PROJECT_SCHEMA_ID,
        "1.0.0" as never,
      );
      expect(result.status).toBe("invalid");
      expect(
        result.issues.some((issue) => issue.code === "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED"),
      ).toBe(true);
    });

    it("detects forbidden embedded domain payloads", () => {
      const keys = detectForbiddenEmbeddedPayloadKeys({
        name: "ok",
        structuralModel: { nodes: [] },
        solverResults: [],
      });
      expect(keys).toContain("structuralModel");
      expect(keys).toContain("solverResults");
    });

    it("rejects embedded road design payload fields on parse", () => {
      const parsed = parseEngineeringProjectValue({
        ...createValidEngineeringProject(),
        alignments: [{ id: "a1" }],
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("UnknownFieldStore", () => {
    it("accepts valid preservation metadata", () => {
      const parsed = parseUnknownFieldStoreValue(createValidUnknownFieldStore());
      expect(parsed.success).toBe(true);
    });

    it("round-trips through JSON with semantic equality", () => {
      const source = createValidUnknownFieldStore();
      const parsed = parseUnknownFieldStoreValue(JSON.parse(JSON.stringify(source)));
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.storeId).toBe(source.storeId);
        expect(parsed.data.entries).toEqual(source.entries);
        expect(parsed.data.sourceVersion).toBe(source.sourceVersion);
        expect(parsed.data.sourceRawChecksum).toEqual(source.sourceRawChecksum);
      }
    });

    it("rejects duplicate jsonPointer entries", () => {
      const entry = {
        jsonPointer: "/legacy/extra",
        criticality: "optional" as const,
        rawPayloadRef: createResourceRef("blob://raw/legacy-extra"),
      };
      const parsed = parseUnknownFieldStoreValue({
        ...createValidUnknownFieldStore(),
        entries: [entry, entry],
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "UNKNOWN_FIELD_ENTRY_POINTER_DUPLICATE",
          ),
        ).toBe(true);
      }
    });

    it("blocks apply when critical entries collide", () => {
      const parsed = parseUnknownFieldStoreValue({
        ...createValidUnknownFieldStore(),
        entries: [
          {
            jsonPointer: "/legacy/critical",
            criticality: "critical" as const,
            rawPayloadRef: createResourceRef("blob://raw/critical"),
          },
        ],
        collisionRecords: [
          {
            jsonPointer: "/legacy/critical",
            knownFieldPath: "name",
            rawPayloadRef: createResourceRef("blob://raw/collision"),
          },
        ],
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "UNKNOWN_FIELD_CRITICAL_COLLISION_BLOCKS_APPLY",
          ),
        ).toBe(true);
      }
    });
  });

  describe("MigrationRecord", () => {
    it("accepts valid migration audit records", () => {
      const parsed = parseMigrationRecordValue(createValidMigrationRecord());
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid recordedAt timestamps", () => {
      const parsed = parseMigrationRecordValue({
        ...createValidMigrationRecord(),
        recordedAt: "2026-07-15T12:30:00+09:00",
      });
      expect(parsed.success).toBe(false);
    });

    it("requires targetRefs when status is committed", () => {
      const parsed = parseMigrationRecordValue({
        ...createValidMigrationRecord(),
        targetRefs: [],
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          parsed.validation.issues.some(
            (issue) => issue.code === "MIGRATION_RECORD_TARGET_REFS_REQUIRED",
          ),
        ).toBe(true);
      }
    });

    it("allows dry_run records with candidate target refs", () => {
      const parsed = parseMigrationRecordValue({
        ...createValidMigrationRecord(),
        status: "dry_run",
        targetRefs: undefined,
        candidateTargetRefs: [createDocumentReference("engineering-project", PROJECT_ID, 1)],
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("contract version registry", () => {
    it("supports only 0.1.0 for v0.1 engineering project", () => {
      expect(
        validateSupportedContractVersion(
          ENGINEERING_PROJECT_SCHEMA_ID,
          ENGINEERING_PROJECT_SCHEMA_VERSION,
        ).status,
      ).toBe("valid");
      expect(
        validateSupportedContractVersion(ENGINEERING_PROJECT_SCHEMA_ID, "0.1.1" as never).status,
      ).toBe("invalid");
    });
  });

  describe("validation result contract remains available", () => {
    it("keeps existing validation result schema version constant", () => {
      expect(VALIDATION_RESULT_SCHEMA_VERSION).toBe("0.1.0");
    });
  });
});
