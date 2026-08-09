import { describe, expect, it } from "vitest";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  REVISION_METADATA_SCHEMA_VERSION,
  requireSchemaVersion,
} from "../index";
import { parseUuid, type UuidString } from "../uuid";
import { requireRevisionId } from "../revision";
import {
  BUSINESS_PROJECT_SCHEMA_VERSION,
  createEmptyBusinessProjectRefs,
  isBusinessProjectDesignStage,
  isBusinessProjectStatus,
  validateBusinessProjectManifest,
  type BusinessProjectManifest,
  type BusinessProjectRef,
} from "../businessProject";

const PROJECT_ID = parseUuid("11111111-1111-4111-8111-111111111111")!;
const ROAD_ID = parseUuid("33333333-3333-4333-8333-333333333333")!;
const SHARED_VERSION = requireSchemaVersion("0.2.0");

function createChecksum(hexDigest = "a".repeat(64)) {
  return { algorithm: CONTENT_CHECKSUM_ALGORITHM, hexDigest };
}

function createProvenance() {
  return {
    createdAt: "2026-08-01T00:00:00.000Z",
    createdBy: { actorId: "tester", actorType: "user" as const },
    producer: { toolId: "spacer", toolVersion: "0.1.0" },
  };
}

function createRevisionMetadata(documentId: UuidString, revisionId: number) {
  return {
    schemaVersion: REVISION_METADATA_SCHEMA_VERSION,
    documentId,
    revisionId: requireRevisionId(revisionId),
    createdAt: "2026-08-01T00:00:00.000Z",
    contentChecksum: createChecksum(),
  };
}

function buildValidManifest(): BusinessProjectManifest {
  const refs = createEmptyBusinessProjectRefs();
  return {
    schemaId: "spacer.contracts.engineering-project" as BusinessProjectManifest["schemaId"],
    schemaVersion: SHARED_VERSION as BusinessProjectManifest["schemaVersion"],
    documentKind: "engineering-project" as const,
    documentId: PROJECT_ID,
    revisionId: requireRevisionId(1),
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    projectId: PROJECT_ID,
    projectNumber: "H620164A",
    projectName: "テスト道路設計業務",
    designStage: "road_design" as const,
    projectStatus: "active" as const,
    coordinateReference: null,
    roadRefs: refs.roadRefs,
    bridgeProjectRefs: refs.bridgeProjectRefs,
    analysisRefs: refs.analysisRefs,
    sharedDatasetRefs: refs.sharedDatasetRefs,
    deliverableRefs: refs.deliverableRefs,
    projectRevisionMetadata: createRevisionMetadata(PROJECT_ID, 1),
    status: { phase: "road_design", sections: { road: "COMPLETE", bridge: "PARTIAL" } },
    migrationProvenanceRef: null,
  };
}

function roadRef(uri: string): BusinessProjectRef {
  return {
    documentKind: "road-design" as const,
    documentId: ROAD_ID,
    revisionId: requireRevisionId(1),
    contentChecksum: createChecksum("b".repeat(64)),
    uri,
  };
}

describe("validateBusinessProjectManifest", () => {
  it("accepts a valid manifest", () => {
    const result = validateBusinessProjectManifest(buildValidManifest());
    expect(result.status).toBe("valid");
    expect(result.issues).toHaveLength(0);
  });

  it("rejects a non-0.2.0 schemaVersion", () => {
    const manifest = buildValidManifest();
    const result = validateBusinessProjectManifest({ ...manifest, schemaVersion: requireSchemaVersion("0.1.0") });
    expect(result.status).toBe("invalid");
    expect(
      result.issues.some((issue) => issue.code === "BUSINESS_PROJECT_SCHEMA_VERSION_UNSUPPORTED"),
    ).toBe(true);
  });

  it("rejects a missing projectNumber", () => {
    const manifest = buildValidManifest();
    const result = validateBusinessProjectManifest({ ...manifest, projectNumber: "  " });
    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "BUSINESS_PROJECT_NUMBER_INVALID")).toBe(true);
  });

  it("rejects an invalid designStage", () => {
    const manifest = buildValidManifest();
    const result = validateBusinessProjectManifest({
      ...manifest,
      designStage: "bogus" as BusinessProjectManifest["designStage"],
    });
    expect(result.status).toBe("invalid");
    expect(
      result.issues.some((issue) => issue.code === "BUSINESS_PROJECT_DESIGN_STAGE_INVALID"),
    ).toBe(true);
  });

  it("rejects documentId != projectId", () => {
    const manifest = buildValidManifest();
    const otherId = parseUuid("22222222-2222-4222-8222-222222222222")!;
    const result = validateBusinessProjectManifest({ ...manifest, projectId: otherId });
    expect(result.status).toBe("invalid");
    expect(
      result.issues.some((issue) => issue.code === "BUSINESS_PROJECT_DOCUMENT_ID_PROJECT_ID_MISMATCH"),
    ).toBe(true);
  });

  it("accepts child refs with relative uris", () => {
    const manifest = buildValidManifest();
    const result = validateBusinessProjectManifest({
      ...manifest,
      roadRefs: [roadRef("roads/road-3333.road.json")],
    });
    expect(result.status).toBe("valid");
  });

  it("rejects child ref with missing uri", () => {
    const manifest = buildValidManifest();
    const result = validateBusinessProjectManifest({
      ...manifest,
      roadRefs: [roadRef("")],
    });
    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "BUSINESS_PROJECT_REF_URI_INVALID")).toBe(true);
  });
});

describe("BusinessProject enumerations", () => {
  it("recognizes design stages", () => {
    expect(isBusinessProjectDesignStage("road_design")).toBe(true);
    expect(isBusinessProjectDesignStage("complete")).toBe(true);
    expect(isBusinessProjectDesignStage("bogus")).toBe(false);
  });

  it("recognizes statuses", () => {
    expect(isBusinessProjectStatus("active")).toBe(true);
    expect(isBusinessProjectStatus("archived")).toBe(true);
    expect(isBusinessProjectStatus("bogus")).toBe(false);
  });
});

describe("BusinessProject contract version", () => {
  it("publishes the 0.2.0 schema version", () => {
    expect(BUSINESS_PROJECT_SCHEMA_VERSION).toBe(SHARED_VERSION);
  });
});
