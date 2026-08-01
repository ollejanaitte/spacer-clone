import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isTreatableAsAdopted } from "../../apollo/numericAuthorityGuard";
import { TargetStandardStatus } from "../../apollo/types";
import { createDefaultProject } from "../../data/defaultProject";
import { buildRunAnalysisIf3Metadata } from "../../if3";
import {
  adoptionStatusToNumericAuthority,
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND,
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_VERSION,
  bridgeSuperstructureDesignDocumentSchema,
  CONTENT_CHECKSUM_ALGORITHM,
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  parseBridgeSuperstructureDesignDocumentValue,
  parseContractValue,
  parseUuid,
  requireRevisionId,
  UNIT_CONTEXT_SCHEMA_VERSION,
  validateBridgeSuperstructureDesignDocument,
  validateGovernedQuantity,
  type BridgeSuperstructureDesignDocument,
  type DesignEntityMetadata,
  type GovernedQuantity,
  type StructuralDesignModel,
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
const SDM_MODEL_ID = parseUuid("b0508400-e29b-41d4-a716-446655440020")!;
const MAIN_GIRDER_ID = parseUuid("b1508400-e29b-41d4-a716-446655440021")!;
const GIRDER_SECTION_SEGMENT_ID = parseUuid("b2508400-e29b-41d4-a716-446655440022")!;
const RC_DECK_ID = parseUuid("b3508400-e29b-41d4-a716-446655440023")!;
const HAUNCH_ID = parseUuid("b4508400-e29b-41d4-a716-446655440024")!;
const CROSS_BEAM_ID = parseUuid("b5508400-e29b-41d4-a716-446655440025")!;
const SWAY_BRACING_ID = parseUuid("b6508400-e29b-41d4-a716-446655440026")!;
const LATERAL_BRACING_ID = parseUuid("b7508400-e29b-41d4-a716-446655440027")!;
const BRACE_MEMBER_ID = parseUuid("b8508400-e29b-41d4-a716-446655440028")!;
const STIFFENER_ID = parseUuid("b9508400-e29b-41d4-a716-446655440029")!;
const SPLICE_ID = parseUuid("c0508400-e29b-41d4-a716-446655440030")!;
const DECK_ANCHORAGE_ID = parseUuid("c1508400-e29b-41d4-a716-446655440031")!;
const DANGLING_REF_ID = parseUuid("c2508400-e29b-41d4-a716-446655440099")!;

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

function createDesignEntityMetadata(
  overrides: Partial<DesignEntityMetadata> = {},
): DesignEntityMetadata {
  return {
    entityRevisionId: 1,
    provenance: createProvenance(),
    geometryRef: { geometryRefId: null, bindingStatus: "unbound" },
    analysisMapping: {
      analysisMemberRefId: null,
      bindingStatus: "unbound",
      analysisBindingId: null,
    },
    designStatus: "NOT_AUTHORIZED",
    adoptionStatus: "UNKNOWN",
    ...overrides,
  };
}

function createMinimalStructuralDesignModel(
  overrides: Partial<StructuralDesignModel> = {},
): StructuralDesignModel {
  return {
    modelId: SDM_MODEL_ID,
    nonCompositeAssertion: { compositeAction: false },
    mainGirders: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "MainGirder",
        mainGirderId: MAIN_GIRDER_ID,
        girderLineRefId: GIRDER_LINE_ID,
        materialRefId: MATERIAL_ID,
      },
    ],
    girderSectionSegments: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "GirderSectionSegment",
        girderSectionSegmentId: GIRDER_SECTION_SEGMENT_ID,
        mainGirderRefId: MAIN_GIRDER_ID,
        materialRefId: null,
      },
    ],
    rcDecks: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "RcDeck",
        rcDeckId: RC_DECK_ID,
        deckRefId: DECK_ID,
      },
    ],
    haunches: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "Haunch",
        haunchId: HAUNCH_ID,
        mainGirderRefId: MAIN_GIRDER_ID,
      },
    ],
    crossBeams: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "CrossBeam",
        crossBeamId: CROSS_BEAM_ID,
        materialRefId: null,
      },
    ],
    swayBracings: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "SwayBracing",
        swayBracingId: SWAY_BRACING_ID,
      },
    ],
    lateralBracings: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "LateralBracing",
        lateralBracingId: LATERAL_BRACING_ID,
      },
    ],
    braceMembers: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "BraceMember",
        braceMemberId: BRACE_MEMBER_ID,
        parentBracingRefId: SWAY_BRACING_ID,
      },
    ],
    stiffeners: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "Stiffener",
        stiffenerId: STIFFENER_ID,
        mainGirderRefId: MAIN_GIRDER_ID,
      },
    ],
    splices: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "Splice",
        spliceId: SPLICE_ID,
        mainGirderRefId: null,
      },
    ],
    deckAnchorages: [
      {
        ...createDesignEntityMetadata(),
        entityKind: "DeckAnchorage",
        deckAnchorageId: DECK_ANCHORAGE_ID,
        anchorageRole: "slab_to_girder",
        girderRefId: MAIN_GIRDER_ID,
        rcDeckRefId: RC_DECK_ID,
      },
    ],
    ...overrides,
  };
}

function createMinimalDraftDocumentWithSdm(
  sdmOverrides: Partial<StructuralDesignModel> = {},
  documentOverrides: Partial<BridgeSuperstructureDesignDocument> = {},
): BridgeSuperstructureDesignDocument {
  return createMinimalDraftDocument({
    structuralDesignModel: createMinimalStructuralDesignModel(sdmOverrides),
    ...documentOverrides,
  });
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

describe("AP-DX-01 structuralDesignModel contracts", () => {
  it("structurally validates a complete structuralDesignModel shape", () => {
    const document = createMinimalDraftDocumentWithSdm();
    const structural = parseContractValue(bridgeSuperstructureDesignDocumentSchema, document, {
      path: "",
    });
    expect(structural.success).toBe(true);
  });

  it.each([
    ["missing nonCompositeAssertion", { nonCompositeAssertion: undefined }],
    ["missing mainGirders array", { mainGirders: undefined }],
    ["invalid modelId", { modelId: "not-a-uuid" }],
    ["wrong entityKind literal", { mainGirders: [{ entityKind: "BraceMember" }] }],
  ] as const)("rejects structuralDesignModel with %s", (_label, patch) => {
    const sdm = {
      ...createMinimalStructuralDesignModel(),
      ...patch,
    };
    const document = createMinimalDraftDocument({ structuralDesignModel: sdm as StructuralDesignModel });
    const structural = parseContractValue(bridgeSuperstructureDesignDocumentSchema, document, {
      path: "",
    });
    expect(structural.success).toBe(false);
  });

  it("round-trips AP-DX-01 entities through parse without dropping fields", () => {
    const source = createMinimalDraftDocumentWithSdm();
    const serialized = JSON.parse(JSON.stringify(source)) as unknown;
    const parsed = parseBridgeSuperstructureDesignDocumentValue(serialized);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const sdm = parsed.data.structuralDesignModel;
    expect(sdm).toBeDefined();
    expect(sdm?.modelId).toBe(SDM_MODEL_ID);
    expect(sdm?.mainGirders).toHaveLength(1);
    expect(sdm?.mainGirders[0]?.mainGirderId).toBe(MAIN_GIRDER_ID);
    expect(sdm?.girderSectionSegments[0]?.mainGirderRefId).toBe(MAIN_GIRDER_ID);
    expect(sdm?.rcDecks[0]?.deckRefId).toBe(DECK_ID);
    expect(sdm?.deckAnchorages[0]?.anchorageRole).toBe("slab_to_girder");
    expect(sdm?.deckAnchorages[0]?.girderRefId).toBe(MAIN_GIRDER_ID);
    expect(sdm?.deckAnchorages[0]?.rcDeckRefId).toBe(RC_DECK_ID);
    expect(sdm?.nonCompositeAssertion.compositeAction).toBe(false);
  });

  it("preserves stable entity IDs across JSON serialization and parse", () => {
    const source = createMinimalDraftDocumentWithSdm();
    const expectedIds = [
      SDM_MODEL_ID,
      MAIN_GIRDER_ID,
      GIRDER_SECTION_SEGMENT_ID,
      RC_DECK_ID,
      HAUNCH_ID,
      CROSS_BEAM_ID,
      SWAY_BRACING_ID,
      LATERAL_BRACING_ID,
      BRACE_MEMBER_ID,
      STIFFENER_ID,
      SPLICE_ID,
      DECK_ANCHORAGE_ID,
    ];
    const parsed = parseBridgeSuperstructureDesignDocumentValue(JSON.parse(JSON.stringify(source)));
    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data.structuralDesignModel === undefined) {
      return;
    }

    const sdm = parsed.data.structuralDesignModel;
    const actualIds = [
      sdm.modelId,
      sdm.mainGirders[0]?.mainGirderId,
      sdm.girderSectionSegments[0]?.girderSectionSegmentId,
      sdm.rcDecks[0]?.rcDeckId,
      sdm.haunches[0]?.haunchId,
      sdm.crossBeams[0]?.crossBeamId,
      sdm.swayBracings[0]?.swayBracingId,
      sdm.lateralBracings[0]?.lateralBracingId,
      sdm.braceMembers[0]?.braceMemberId,
      sdm.stiffeners[0]?.stiffenerId,
      sdm.splices[0]?.spliceId,
      sdm.deckAnchorages[0]?.deckAnchorageId,
    ];
    expect(actualIds).toEqual(expectedIds);
  });

  it("rejects duplicate stable IDs across bridge primitives and design entities", () => {
    const document = createMinimalDraftDocumentWithSdm({
      mainGirders: [
        {
          ...createDesignEntityMetadata(),
          entityKind: "MainGirder",
          mainGirderId: SPAN_ID,
          girderLineRefId: GIRDER_LINE_ID,
          materialRefId: MATERIAL_ID,
        },
      ],
    });
    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "BSDD_DUPLICATE_ENTITY_ID")).toBe(true);
  });

  it("rejects dangling non-null entity cross-references", () => {
    const document = createMinimalDraftDocumentWithSdm({
      girderSectionSegments: [
        {
          ...createDesignEntityMetadata(),
          entityKind: "GirderSectionSegment",
          girderSectionSegmentId: GIRDER_SECTION_SEGMENT_ID,
          mainGirderRefId: DANGLING_REF_ID,
          materialRefId: null,
        },
      ],
    });
    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "BSDD_DANGLING_REFERENCE")).toBe(true);
  });

  it("rejects dangling non-null geometryRef anchors while allowing null placeholders", () => {
    const unboundDocument = createMinimalDraftDocumentWithSdm({
      mainGirders: [
        {
          ...createDesignEntityMetadata({
            geometryRef: { geometryRefId: null, bindingStatus: "unbound" },
            adoptionStatus: "PLACEHOLDER",
          }),
          entityKind: "MainGirder",
          mainGirderId: MAIN_GIRDER_ID,
          girderLineRefId: null,
          materialRefId: null,
        },
      ],
    });
    expect(validateBridgeSuperstructureDesignDocument(unboundDocument).status).toBe("valid");

    const danglingDocument = createMinimalDraftDocumentWithSdm({
      mainGirders: [
        {
          ...createDesignEntityMetadata({
            geometryRef: { geometryRefId: DANGLING_REF_ID, bindingStatus: "bound" },
          }),
          entityKind: "MainGirder",
          mainGirderId: MAIN_GIRDER_ID,
          girderLineRefId: null,
          materialRefId: null,
        },
      ],
    });
    const result = validateBridgeSuperstructureDesignDocument(danglingDocument);
    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "BSDD_DANGLING_REFERENCE")).toBe(true);
  });

  it("rejects unknown keys on strict design entity objects at structural parse", () => {
    const document = createMinimalDraftDocumentWithSdm();
    const serialized = JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
    const sdm = serialized.structuralDesignModel as Record<string, unknown>;
    const mainGirders = sdm.mainGirders as Record<string, unknown>[];
    mainGirders[0] = {
      ...mainGirders[0],
      compositeShearConnector: { count: 4 },
    };

    const parsed = parseBridgeSuperstructureDesignDocumentValue(serialized);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.validation.issues.some((issue) => issue.code === "ZOD_UNRECOGNIZED_KEYS"),
      ).toBe(true);
    }
  });

  it("preserves explicit null references through parse round-trip", () => {
    const source = createMinimalDraftDocumentWithSdm({
      mainGirders: [
        {
          ...createDesignEntityMetadata({ sourceRef: null }),
          entityKind: "MainGirder",
          mainGirderId: MAIN_GIRDER_ID,
          girderLineRefId: null,
          materialRefId: null,
        },
      ],
      splices: [
        {
          ...createDesignEntityMetadata(),
          entityKind: "Splice",
          spliceId: SPLICE_ID,
          mainGirderRefId: null,
        },
      ],
    });
    const parsed = parseBridgeSuperstructureDesignDocumentValue(JSON.parse(JSON.stringify(source)));
    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data.structuralDesignModel === undefined) {
      return;
    }

    const mainGirder = parsed.data.structuralDesignModel.mainGirders[0];
    expect(mainGirder?.girderLineRefId).toBeNull();
    expect(mainGirder?.materialRefId).toBeNull();
    expect(mainGirder?.sourceRef).toBeNull();
    expect(parsed.data.structuralDesignModel.splices[0]?.mainGirderRefId).toBeNull();
    expect(mainGirder?.geometryRef.geometryRefId).toBeNull();
    expect(mainGirder?.analysisMapping.analysisMemberRefId).toBeNull();
  });

  it("rejects composite connector contamination in entity extensions", () => {
    const document = createMinimalDraftDocumentWithSdm({
      mainGirders: [
        {
          ...createDesignEntityMetadata({
            extensions: {
              "spacer.vendor/compositeShearConnector": { json: { count: 3 } },
            },
          }),
          entityKind: "MainGirder",
          mainGirderId: MAIN_GIRDER_ID,
          girderLineRefId: GIRDER_LINE_ID,
          materialRefId: MATERIAL_ID,
        },
      ],
    });
    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "BSDD_COMPOSITE_CONNECTOR_FORBIDDEN")).toBe(
      true,
    );
  });

  it("accepts DeckAnchorage as an independent non-composite entity", () => {
    const document = createMinimalDraftDocumentWithSdm({
      deckAnchorages: [
        {
          ...createDesignEntityMetadata({
            designStatus: "NOT_AUTHORIZED",
            adoptionStatus: "PENDING",
          }),
          entityKind: "DeckAnchorage",
          deckAnchorageId: DECK_ANCHORAGE_ID,
          anchorageRole: "uplift_restraint",
          girderRefId: MAIN_GIRDER_ID,
          rcDeckRefId: RC_DECK_ID,
        },
      ],
    });
    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("valid");
    expect(document.structuralDesignModel?.deckAnchorages[0]?.anchorageRole).toBe("uplift_restraint");
    expect(
      Object.prototype.hasOwnProperty.call(
        document.structuralDesignModel?.deckAnchorages[0] ?? {},
        "compositeAction",
      ),
    ).toBe(false);
  });

  it("accepts NOT_AUTHORIZED design entities fail-closed by default", () => {
    const document = createMinimalDraftDocumentWithSdm({
      mainGirders: [
        {
          ...createDesignEntityMetadata({
            designStatus: "NOT_AUTHORIZED",
            adoptionStatus: "UNKNOWN",
          }),
          entityKind: "MainGirder",
          mainGirderId: MAIN_GIRDER_ID,
          girderLineRefId: GIRDER_LINE_ID,
          materialRefId: MATERIAL_ID,
        },
      ],
    });
    const result = validateBridgeSuperstructureDesignDocument(document);
    expect(result.status).toBe("valid");
  });

  it("rejects check-result designStatus when numeric authority is NOT_SELECTED", () => {
    const document = createMinimalDraftDocumentWithSdm({
      mainGirders: [
        {
          ...createDesignEntityMetadata({
            designStatus: "OK",
            adoptionStatus: "ADOPTED",
          }),
          entityKind: "MainGirder",
          mainGirderId: MAIN_GIRDER_ID,
          girderLineRefId: GIRDER_LINE_ID,
          materialRefId: MATERIAL_ID,
        },
      ],
    });
    const result = validateBridgeSuperstructureDesignDocument(document, {
      numericAuthorityContext: {
        targetStandardStatus: TargetStandardStatus.NOT_SELECTED,
      },
    });
    expect(result.status).toBe("invalid");
    expect(
      result.issues.some((issue) => issue.code === "BSDD_DESIGN_STATUS_NOT_AUTHORIZED_FAIL_CLOSED"),
    ).toBe(true);
  });

  it("keeps legacy BSDD fixture valid without structuralDesignModel (non-regression)", () => {
    const legacyDocument = createMinimalDraftDocument();
    expect(legacyDocument.structuralDesignModel).toBeUndefined();

    const validation = validateBridgeSuperstructureDesignDocument(legacyDocument);
    expect(validation.status).toBe("valid");

    const parsed = parseBridgeSuperstructureDesignDocumentValue(
      JSON.parse(JSON.stringify(legacyDocument)),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.structuralDesignModel).toBeUndefined();
    }
  });
});
