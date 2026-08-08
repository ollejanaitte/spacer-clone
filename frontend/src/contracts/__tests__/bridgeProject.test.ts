import { describe, expect, it } from "vitest";
import {
  BRIDGE_PROJECT_SCHEMA_ID,
  BRIDGE_PROJECT_SCHEMA_VERSION,
} from "../contractVersionRegistry";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  bridgeProjectSchema,
  contractJsonSchemaPath,
  generateAllContractJsonSchemas,
  validateBridgeProject,
  type BridgeProject,
} from "../index";
import type { DocumentReference } from "../documentReference";
import type { DocumentKind } from "../documentKind";

const PROJECT_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const DOCUMENT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const CBDM_ID = "a0508400-e29b-41d4-a716-446655440001";
const BSDD_ID = "a1508400-e29b-41d4-a716-446655440002";
const ROAD_ID = "a2508400-e29b-41d4-a716-446655440003";
const BFAD_ID = "a3508400-e29b-41d4-a716-446655440004";
const SUBSTRUCTURE_ID = "a4508400-e29b-41d4-a716-446655440005";
const VALID_SHA256 = "a".repeat(64);

function createChecksum() {
  return { algorithm: CONTENT_CHECKSUM_ALGORITHM, hexDigest: VALID_SHA256 };
}

function createProvenance() {
  return {
    createdAt: "2026-08-08T12:00:00.000Z",
    createdBy: { actorId: "user-1", actorType: "user" as const },
    producer: { toolId: "spacer-bridge-project", toolVersion: "0.1.0" },
  };
}

function createRevisionMetadata() {
  return {
    schemaVersion: "0.1.0",
    documentId: DOCUMENT_ID,
    revisionId: 1,
    createdAt: "2026-08-08T12:00:00.000Z",
    contentChecksum: createChecksum(),
  };
}

function createDocumentRef(documentKind: DocumentKind, documentId: string): DocumentReference {
  return {
    documentKind,
    documentId,
    revisionId: 1,
    contentChecksum: createChecksum(),
  } as unknown as DocumentReference;
}

function createValidBridgeProject(): BridgeProject {
  return {
    schemaId: BRIDGE_PROJECT_SCHEMA_ID,
    schemaVersion: BRIDGE_PROJECT_SCHEMA_VERSION,
    documentId: DOCUMENT_ID,
    documentKind: "bridge-project",
    revisionId: 1,
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    projectId: PROJECT_ID,
    name: "RB-001 integration test",
    projectRevisionMetadata: createRevisionMetadata(),
    status: {
      phase: "superstructure",
      sections: {
        project: { owner: "BRIDGE_PROJECT_SHARED", state: "COMPLETE" },
        alignment: { owner: "ALIGNMENT_OWNER", state: "PARTIAL" },
        bridgeGeometry: { owner: "BRIDGE_PROJECT_SHARED", state: "PARTIAL" },
        superstructure: { owner: "SUPERSTRUCTURE_OWNER", state: "PARTIAL" },
        substructure: { owner: "SUBSTRUCTURE_OWNER", state: "EMPTY" },
        analysis: { owner: "BRIDGE_PROJECT_SHARED", state: "NOT_AUTHORIZED" },
        model3D: { owner: "BRIDGE_PROJECT_SHARED", state: "DEFERRED" },
        metadata: { owner: "BRIDGE_PROJECT_SHARED", state: "COMPLETE" },
      },
    },
    references: {
      roadDesign: createDocumentRef("road-design", ROAD_ID),
      commonModel: createDocumentRef("common-bridge-data-model", CBDM_ID),
      superstructure: createDocumentRef("bridge-superstructure-design", BSDD_ID),
      analysis: [createDocumentRef("bridge-frame-analysis", BFAD_ID)],
      substructure: createDocumentRef("bridge-project", SUBSTRUCTURE_ID),
    },
    sharedFacts: {
      supports: [
        {
          supportId: "SUP-PR1",
          supportType: "pier",
          stationM: { value: 40.201, unit: "m", status: "CONFIRMED" },
          skewRad: { value: 1.5707963267948966, unit: "rad", status: "DERIVED", generatedBy: "apollo-geometry" },
        },
        {
          supportId: "SUP-AR2",
          supportType: "abutment",
          stationM: { value: 0, unit: "m", status: "CONFIRMED" },
        },
      ],
      reactions: [
        {
          supportId: "SUP-PR1",
          caseKind: "permanent",
          status: "NOT_AUTHORIZED",
          stateReason: "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
        },
      ],
      coordinateSystem: "x-longitudinal-y-transverse-z-up",
      unitSystem: "si-m-rad-kn",
    },
    reconstruction: {
      source: createDocumentRef("bridge-superstructure-design", BSDD_ID),
      entries: [
        { fieldKey: "bridgeLengthM", status: "CONFIRMED", value: 134.001, unit: "m" },
        { fieldKey: "spanLengthsM", status: "CONFIRMED", value: 51.0, unit: "m" },
        { fieldKey: "girderOffsetM", status: "INFERRED", value: 1.47689, unit: "m", stateReason: "girder offset not present in superstructure sample as a declared alignment input" },
        { fieldKey: "verticalGrade", status: "MISSING", stateReason: "no vertical profile in superstructure sample" },
      ],
    },
  } as unknown as BridgeProject;
}

describe("BridgeProject contract", () => {
  it("registers bridge-project schema in the generated JSON schema set", () => {
    const generated = generateAllContractJsonSchemas();
    const entry = generated.find((item) => item.slug === "bridge-project");
    expect(entry).toBeDefined();
    expect(entry?.schemaId).toBe("https://spacer.local/schemas/contracts/v0.1/bridge-project.schema.json");
    expect(contractJsonSchemaPath("bridge-project")).toBe(
      "schemas/contracts/v0.1/bridge-project.schema.json",
    );
  });

  it("parses a valid BridgeProject document structurally", () => {
    const parsed = bridgeProjectSchema.safeParse(createValidBridgeProject());
    expect(parsed.success).toBe(true);
  });

  it("validates a valid BridgeProject document semantically", () => {
    const result = validateBridgeProject(createValidBridgeProject());
    expect(result.issues).toEqual([]);
  });

  it("rejects an unknown section key", () => {
    const base = createValidBridgeProject();
    const doc = {
      ...base,
      status: {
        ...base.status,
        sections: {
          ...base.status.sections,
          bogus: { owner: "BRIDGE_PROJECT_SHARED", state: "EMPTY" },
        },
      },
    } as unknown as BridgeProject;
    const issues = validateBridgeProject(doc).issues;
    expect(issues.some((i) => i.code === "BRIDGE_PROJECT_SECTION_KEY_INVALID")).toBe(true);
  });

  it("rejects duplicate support ids in sharedFacts", () => {
    const base = createValidBridgeProject();
    const doc: BridgeProject = {
      ...base,
      sharedFacts: {
        ...base.sharedFacts,
        supports: [
          { supportId: "SUP-PR1", stationM: { value: 40.201, unit: "m", status: "CONFIRMED" } },
          { supportId: "SUP-PR1", stationM: { value: 91.201, unit: "m", status: "CONFIRMED" } },
        ],
      },
    };
    const issues = validateBridgeProject(doc).issues;
    expect(issues.some((i) => i.code === "BRIDGE_PROJECT_SUPPORT_DUPLICATE")).toBe(true);
  });

  it("rejects an invalid reconstruction status (DERIVED is allowed, FABRICATED is not)", () => {
    const base = createValidBridgeProject();
    const doc = {
      ...base,
      reconstruction: {
        source: base.reconstruction?.source,
        entries: [{ fieldKey: "alignmentX", status: "FABRICATED", value: 0, unit: "m" }],
      },
    } as unknown as BridgeProject;
    const issues = validateBridgeProject(doc).issues;
    expect(issues.some((i) => i.code === "BRIDGE_PROJECT_RECONSTRUCTION_STATUS_INVALID")).toBe(true);
  });

  it("rejects embedded domain payloads", () => {
    const base = createValidBridgeProject();
    const withEmbedded = { ...base, alignments: { alignments: [] } };
    const issues = validateBridgeProject(withEmbedded).issues;
    expect(issues.some((i) => i.code === "BRIDGE_PROJECT_EMBEDDED_PAYLOAD_FORBIDDEN")).toBe(true);
  });

  it("keeps DERIVED / INFERRED / DEFERRED distinct from CONFIRMED in the shared vocabulary", () => {
    const statuses = ["CONFIRMED", "DERIVED", "INFERRED", "MISSING", "DEFERRED", "NOT_AUTHORIZED"];
    for (const status of statuses) {
      const base = createValidBridgeProject();
      const doc = {
        ...base,
        sharedFacts: {
          ...base.sharedFacts,
          supports: [
            { supportId: "SUP-PR1", stationM: { value: 40.201, unit: "m", status } },
          ],
        },
      };
      const parsed = bridgeProjectSchema.safeParse(doc);
      expect(parsed.success, `status ${status} must be structurally valid`).toBe(true);
    }
  });
});
