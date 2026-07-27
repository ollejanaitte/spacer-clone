import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isTreatableAsAdopted } from "../../apollo/numericAuthorityGuard";
import { createDefaultProject } from "../../data/defaultProject";
import { buildRunAnalysisIf3Metadata } from "../../if3";
import {
  adoptionStatusToNumericAuthority,
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND,
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_VERSION,
  CONTENT_CHECKSUM_ALGORITHM,
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  parseBridgeSuperstructureDesignDocumentValue,
  parseUuid,
  requireRevisionId,
  UNIT_CONTEXT_SCHEMA_VERSION,
  validateBridgeSuperstructureDesignDocument,
  validateGovernedQuantity,
  type BridgeSuperstructureDesignDocument,
  type GovernedQuantity,
} from "../index";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const REFERENCE_BRIDGE_INPUT_PATH = join(
  REPO_ROOT,
  "docs/apollo/step1/07_validation/reference_bridge_input.json",
);

const VALID_SHA256 = "a".repeat(64);
const DOCUMENT_ID = parseUuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8")!;
const CONTEXT_ID = parseUuid("7c9e6679-7425-40de-944b-e07fc1f90ae7")!;
const PROJECT_ID = parseUuid("a0508400-e29b-41d4-a716-446655440001")!;
const BRIDGE_ID = parseUuid("a1508400-e29b-41d4-a716-446655440002")!;
const SPAN_ID = parseUuid("a2508400-e29b-41d4-a716-446655440003")!;
const GIRDER_LINE_ID = parseUuid("a3508400-e29b-41d4-a716-446655440004")!;
const DECK_ID = parseUuid("a4508400-e29b-41d4-a716-446655440005")!;
const SUPPORT_START_ID = parseUuid("a5508400-e29b-41d4-a716-446655440006")!;
const SUPPORT_END_ID = parseUuid("a6508400-e29b-41d4-a716-446655440007")!;
const MATERIAL_ID = parseUuid("a7508400-e29b-41d4-a716-446655440008")!;
const LOAD_CASE_ID = parseUuid("a8508400-e29b-41d4-a716-446655440009")!;
const BINDING_ID = parseUuid("a9508400-e29b-41d4-a716-446655440010")!;
const EXPORT_AUTHORITY_DOC_ID = parseUuid("b0508400-e29b-41d4-a716-446655440011")!;

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
    createdAt: "2026-07-27T12:00:00.000Z",
    createdBy: { actorId: "user-1", actorType: "user" as const },
    producer: { toolId: "spacer-contracts", toolVersion: "0.1.0" },
  };
}

function createCoordinateContext() {
  return {
    schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    referenceType: "local" as const,
    referenceName: "Bridge local CRS",
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
      transformVersion: "canonical-v1",
      status: "verified" as const,
      matrix: IDENTITY_MATRIX,
    },
    angleUnit: "rad" as const,
    confidenceStatus: "unknown" as const,
  };
}

function createUnitContext() {
  return {
    schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    length: "m" as const,
    angle: "rad" as const,
    force: "kN" as const,
    stress: "kPa" as const,
    conversionVersion: "si-v1",
  };
}

function governedQuantity(
  adoptionStatus: GovernedQuantity["adoptionStatus"],
  overrides: Partial<GovernedQuantity> = {},
): GovernedQuantity {
  return {
    value: null,
    units: "m",
    adoptionStatus,
    sourceLocator: null,
    ...overrides,
  };
}

function createMinimalDraftDocument(
  overrides: Partial<BridgeSuperstructureDesignDocument> = {},
): BridgeSuperstructureDesignDocument {
  return {
    schemaId: BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
    schemaVersion: BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_VERSION,
    documentKind: BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND,
    documentId: DOCUMENT_ID,
    revisionId: 1,
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    lifecycleStatus: "DRAFT",
    coordinateContexts: [createCoordinateContext()],
    unitContext: createUnitContext(),
    projectContext: {
      projectId: PROJECT_ID,
      name: "Phase 1 exemplar bridge",
      clientName: null,
      phaseTag: "ap01-contract-test",
    },
    bridge: {
      bridgeId: BRIDGE_ID,
      name: "Exemplar bridge",
      spans: [
        {
          spanId: SPAN_ID,
          index: 0,
          startSupportId: SUPPORT_START_ID,
          endSupportId: SUPPORT_END_ID,
          length: governedQuantity("UNKNOWN"),
        },
      ],
      girderLines: [
        {
          girderLineId: GIRDER_LINE_ID,
          index: 0,
          label: "G1",
          offsetFromCenterline: governedQuantity("PENDING"),
          depthProfile: "equal",
          materialRefId: null,
          sectionIntentRefId: null,
        },
      ],
      deck: {
        deckId: DECK_ID,
        deckKind: "rc_non_composite",
        width: governedQuantity("PLACEHOLDER"),
        thickness: governedQuantity("PENDING"),
        unitWeight: governedQuantity("UNKNOWN"),
      },
      supports: [
        {
          supportId: SUPPORT_START_ID,
          station: governedQuantity("PENDING"),
          fixity: "pinned",
          role: "abutment",
        },
        {
          supportId: SUPPORT_END_ID,
          station: governedQuantity("UNKNOWN"),
          fixity: "roller",
          role: "bearing",
        },
      ],
    },
    materialDefinitions: [
      {
        materialId: MATERIAL_ID,
        designation: "SN400B",
        yieldStrength: governedQuantity("PENDING", { units: "MPa" }),
        elasticModulus: governedQuantity("PLACEHOLDER", { units: "MPa" }),
        unitWeight: governedQuantity("UNKNOWN", { units: "kN/m3" }),
      },
    ],
    loadCases: [
      {
        loadCaseId: LOAD_CASE_ID,
        name: "Dead load",
        kind: "dead",
        loads: [],
      },
    ],
    analysisBindings: [],
    roadImportProvenance: null,
    phase1ScopeAssertion: {
      alignmentClass: "straight",
      skewAngleDeg: governedQuantity("PLACEHOLDER", { units: "deg" }),
      spanSystem: "simple",
      superstructureKind: "plate_girder_rc_slab_non_composite",
      analysisType: "static_linear",
    },
    validationStatus: "unvalidated",
    ...overrides,
  };
}

describe("validateBridgeSuperstructureDesignDocument", () => {
  it("accepts a minimal DRAFT document with non-adopted null quantities", () => {
    const document = createMinimalDraftDocument();
    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("valid");
  });

  it("rejects ADOPTED quantities when Target Standard is NOT_SELECTED", () => {
    const document = createMinimalDraftDocument({
      phase1ScopeAssertion: {
        alignmentClass: "straight",
        skewAngleDeg: governedQuantity("ADOPTED", {
          value: 90,
          units: "deg",
          sourceLocator: "DEC-S1-0008",
          decisionId: "dec-001",
        }),
        spanSystem: "simple",
        superstructureKind: "plate_girder_rc_slab_non_composite",
        analysisType: "static_linear",
      },
    });

    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD")).toBe(
      true,
    );
  });

  it("does not treat PLACEHOLDER as ADOPTED", () => {
    expect(isTreatableAsAdopted(adoptionStatusToNumericAuthority("PLACEHOLDER"))).toBe(false);

    const placeholderResult = validateGovernedQuantity(
      governedQuantity("PLACEHOLDER"),
      "test.quantity",
    );
    expect(placeholderResult.status).toBe("valid");
    expect(placeholderResult.issues.some((issue) => issue.code === "AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD")).toBe(
      false,
    );
  });

  it.each([
    ["missing provenance", { provenance: undefined }],
    ["missing documentId", { documentId: "not-a-uuid" as BridgeSuperstructureDesignDocument["documentId"] }],
    ["wrong schemaId", { schemaId: "spacer.contracts.road-design-document" as BridgeSuperstructureDesignDocument["schemaId"] }],
    ["wrong schemaVersion", { schemaVersion: "0.0.0-design-draft" as BridgeSuperstructureDesignDocument["schemaVersion"] }],
  ] as const)("rejects %s", (_label, patch) => {
    const document = { ...createMinimalDraftDocument(), ...patch };
    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("invalid");
  });

  it("accepts analysisBinding with valid if3Metadata", () => {
    const if3Metadata = buildRunAnalysisIf3Metadata(createDefaultProject(), { authoritative: true });
    const document = createMinimalDraftDocument({
      analysisBindings: [
        {
          bindingId: BINDING_ID,
          analysisType: "static_linear",
          bindingStatus: "pending",
          sourceBsdDocumentRef: {
            documentKind: "bridge-superstructure-design",
            documentId: DOCUMENT_ID,
            revisionId: requireRevisionId(1),
            contentChecksum: createChecksum(),
          },
          targetBfadDocumentRef: null,
          resultResourceRef: null,
          if3Metadata,
        },
      ],
    });

    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("valid");
  });

  it("rejects analysisBinding with unbound if3Metadata", () => {
    const document = createMinimalDraftDocument({
      analysisBindings: [
        {
          bindingId: BINDING_ID,
          analysisType: "static_linear",
          bindingStatus: "pending",
          sourceBsdDocumentRef: {
            documentKind: "bridge-superstructure-design",
            documentId: DOCUMENT_ID,
            revisionId: requireRevisionId(1),
            contentChecksum: createChecksum(),
          },
          targetBfadDocumentRef: null,
          resultResourceRef: null,
          if3Metadata: {} as BridgeSuperstructureDesignDocument["analysisBindings"][number]["if3Metadata"],
        },
      ],
    });

    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "BSDD_ANALYSIS_BINDING_IF3_METADATA_INVALID")).toBe(
      true,
    );
  });

  it("round-trips optional exportAuthorityRef", () => {
    const exportAuthorityRef = {
      documentKind: "bridge-frame-analysis" as const,
      documentId: EXPORT_AUTHORITY_DOC_ID,
      revisionId: requireRevisionId(1),
      contentChecksum: createChecksum(),
    };
    const document = createMinimalDraftDocument({ exportAuthorityRef });
    const firstPass = validateBridgeSuperstructureDesignDocument(document);
    expect(firstPass.status).toBe("valid");

    const serialized = JSON.parse(JSON.stringify(document)) as BridgeSuperstructureDesignDocument;
    const secondPass = validateBridgeSuperstructureDesignDocument(serialized);
    expect(secondPass.status).toBe("valid");
    expect(serialized.exportAuthorityRef).toEqual(exportAuthorityRef);
  });

  it("survives JSON serialization round-trip through parse", () => {
    const source = createMinimalDraftDocument();
    const parsed = parseBridgeSuperstructureDesignDocumentValue(JSON.parse(JSON.stringify(source)));
    expect(parsed.success).toBe(true);
  });

  it("does not accept RB-P1-001 planning draft as production", () => {
    const planningDraft = JSON.parse(readFileSync(REFERENCE_BRIDGE_INPUT_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    const parsed = parseBridgeSuperstructureDesignDocumentValue(planningDraft);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const codes = new Set(parsed.validation.issues.map((issue) => issue.code));
      // Structural parse rejects design-draft schemaVersion and draft checksum `{ value }` shape.
      expect(
        codes.has("CONTRACT_SCHEMA_VERSION_UNSUPPORTED") ||
          codes.has("CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED") ||
          codes.has("ZOD_INVALID_TYPE") ||
          codes.has("ZOD_UNRECOGNIZED_KEYS") ||
          codes.has("CONTENT_CHECKSUM_HEX_INVALID"),
      ).toBe(true);
    }
  });

  it("does not register golden numeric displacement or force fixtures", () => {
    const document = createMinimalDraftDocument();
    const serialized = JSON.stringify(document);
    expect(serialized).not.toContain("goldenExpectations");
    expect(serialized).not.toContain("displacements");
    expect(serialized).not.toContain("sectionForces");
    expect(document.bridge.spans[0]?.length.value).toBeNull();
    expect(
      document.materialDefinitions.every(
        (material) =>
          material.yieldStrength.adoptionStatus !== "ADOPTED" &&
          material.elasticModulus.adoptionStatus !== "ADOPTED",
      ),
    ).toBe(true);
  });
});
