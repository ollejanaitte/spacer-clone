import { describe, expect, it } from "vitest";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_VERSION,
  getContractVersionSupport,
  isFrameAnalysisResultResource,
  parseUuid,
  requireRevisionId,
  requireSchemaVersion,
  validateFrameAnalysisResultResource,
  type BridgeFrameAnalysisDocument,
  type ContentChecksum,
  type FrameAnalysisResultKind,
  type FrameAnalysisResultPayloadEntry,
  type FrameAnalysisResultResource,
  type UuidString,
} from "../index";
import {
  frameAnalysisResultResourceSchema,
  parseContractValue,
} from "../runtime";

const RESULT_ID = "550e8400-e29b-41d4-a716-446655440000";
const RUN_ID = "550e8400-e29b-41d4-a716-446655440001";
const SOURCE_DOCUMENT_ID = "550e8400-e29b-41d4-a716-446655440002";
const LOAD_CONTEXT_ID = "550e8400-e29b-41d4-a716-446655440003";
const ROW_ID = "550e8400-e29b-41d4-a716-446655440004";
const MEMBER_ID = "550e8400-e29b-41d4-a716-446655440005";

function uuid(value: string): UuidString {
  const parsed = parseUuid(value);
  if (parsed === undefined) {
    throw new Error(`Invalid test UUID: ${value}`);
  }
  return parsed;
}

function checksum(hexDigest = "a".repeat(64)): ContentChecksum {
  return {
    algorithm: CONTENT_CHECKSUM_ALGORITHM,
    hexDigest,
  };
}

function validSourceDocument(): Pick<BridgeFrameAnalysisDocument, "documentId" | "revisionId" | "contentChecksum"> {
  return {
    documentId: uuid(SOURCE_DOCUMENT_ID),
    revisionId: requireRevisionId(3),
    contentChecksum: checksum(),
  };
}

function validResource(): FrameAnalysisResultResource {
  return {
    schemaId: FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
    schemaVersion: FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_VERSION,
    resultId: uuid(RESULT_ID),
    analysisRunId: uuid(RUN_ID),
    sourceDocumentId: uuid(SOURCE_DOCUMENT_ID),
    sourceDocumentVersion: requireRevisionId(3),
    sourceContentChecksum: checksum(),
    status: "SUCCEEDED",
    generatedAt: "2026-07-25T10:00:00.000Z",
    solverName: "scipy_sparse",
    solverVersion: "0.1.0",
    analysisSettingsChecksum: checksum("b".repeat(64)),
    loadContext: {
      entries: [
        {
          kind: "loadCase",
          id: uuid(LOAD_CONTEXT_ID),
          label: "LC1",
          checksum: checksum("c".repeat(64)),
        },
      ],
      requestChecksum: checksum("d".repeat(64)),
    },
    provenance: {
      createdAt: "2026-07-25T10:00:00.000Z",
      createdBy: { actorId: "user-1", actorType: "user" },
      producer: { toolId: "spacer-backend", toolVersion: "0.1.0" },
    },
    diagnostics: [
      {
        code: "SOLVER_COMPLETED",
        severity: "info",
        producer: "normalizer",
        message: "Analysis completed.",
        path: "/payload/memberForce",
        resultKind: "memberForce",
      },
    ],
    payload: {
      memberForce: {
        schemaVersion: requireSchemaVersion("0.1.0"),
        rows: [
          {
            rowId: uuid(ROW_ID),
            entityKind: "member",
            entityId: uuid(MEMBER_ID),
            loadContextId: uuid(LOAD_CONTEXT_ID),
            quantity: "memberEndForce",
            unit: "kN",
            values: { fx: 1.25, my: -2.5 },
          },
        ],
      },
    },
    resultKinds: ["memberForce"],
  };
}

function payloadEntryFor(kind: FrameAnalysisResultKind): FrameAnalysisResultPayloadEntry {
  return {
    schemaVersion: requireSchemaVersion("0.1.0"),
    rows: [
      {
        rowId: uuid(ROW_ID),
        entityKind: kind === "supportReaction" ? "support" : "member",
        entityId: uuid(MEMBER_ID),
        loadContextId: uuid(LOAD_CONTEXT_ID),
        quantity: kind,
        unit: kind === "diagnostics" ? "count" : "kN",
        values: { value: 1 },
      },
    ],
  };
}

function issueCodes(resource: Partial<FrameAnalysisResultResource>, source = validSourceDocument()) {
  return validateFrameAnalysisResultResource(resource, "", source).issues.map((issue) => issue.code);
}

describe("FrameAnalysisResultResource contract", () => {
  it("accepts a valid resource and registers the schema version", () => {
    const resource = validResource();
    const validation = validateFrameAnalysisResultResource(resource, "", validSourceDocument());

    expect(validation.status).toBe("valid");
    expect(validation.issues).toHaveLength(0);
    expect(isFrameAnalysisResultResource(resource, validSourceDocument())).toBe(true);
    expect(getContractVersionSupport(FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID)?.currentVersion).toBe(
      FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_VERSION,
    );
  });

  it("rejects invalid resource identity", () => {
    const codes = issueCodes({
      ...validResource(),
      resultId: "not-a-uuid",
      analysisRunId: "not-a-uuid",
    } as unknown as Partial<FrameAnalysisResultResource>);

    expect(codes).toContain("FRAME_RESULT_ID_INVALID");
    expect(codes).toContain("FRAME_RESULT_ANALYSIS_RUN_ID_INVALID");
  });

  it("rejects invalid source binding against BridgeFrameAnalysisDocument identity", () => {
    const codes = issueCodes(validResource(), {
      documentId: uuid("550e8400-e29b-41d4-a716-446655440099"),
      revisionId: requireRevisionId(4),
      contentChecksum: checksum("e".repeat(64)),
    });

    expect(codes).toEqual([
      "FRAME_RESULT_SOURCE_CHECKSUM_MISMATCH",
      "FRAME_RESULT_SOURCE_DOCUMENT_MISMATCH",
      "FRAME_RESULT_SOURCE_VERSION_MISMATCH",
    ]);
  });

  it("rejects invalid schema identity, status, and result kind catalog", () => {
    const codes = issueCodes({
      ...validResource(),
      schemaId: "spacer.contracts.other",
      schemaVersion: "1.0.0",
      status: "DONE",
      resultKinds: ["memberForce", "plasticCollapse"],
    } as unknown as Partial<FrameAnalysisResultResource>);

    expect(codes).toContain("FRAME_RESULT_SCHEMA_ID_INVALID");
    expect(codes).toContain("CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED");
    expect(codes).toContain("FRAME_RESULT_STATUS_INVALID");
    expect(codes).toContain("FRAME_RESULT_KIND_INVALID");
  });

  it("accepts required output result kinds in the payload catalog", () => {
    const requiredKinds: readonly FrameAnalysisResultKind[] = [
      "nodeDisplacement",
      "supportReaction",
      "memberForce",
      "stress",
      "modal",
      "buckling",
      "timeHistory",
      "diagnostics",
    ];
    const payload = Object.fromEntries(
      requiredKinds.map((kind) => [kind, payloadEntryFor(kind)]),
    ) as FrameAnalysisResultResource["payload"];
    const resource: FrameAnalysisResultResource = {
      ...validResource(),
      diagnostics: [
        {
          code: "RESULT_DIAGNOSTIC",
          severity: "info",
          producer: "normalizer",
          message: "Diagnostic payload present.",
          path: "/payload/diagnostics",
          resultKind: "diagnostics",
        },
      ],
      payload,
      resultKinds: requiredKinds,
    };

    expect(validateFrameAnalysisResultResource(resource, "", validSourceDocument()).status).toBe(
      "valid",
    );
    expect(parseContractValue(frameAnalysisResultResourceSchema, resource).success).toBe(true);
  });

  it("rejects unknown output result kinds in payload, resultKinds, and diagnostics", () => {
    const codes = issueCodes({
      ...validResource(),
      diagnostics: [
        {
          code: "UNKNOWN_RESULT",
          severity: "warning",
          producer: "normalizer",
          message: "Unknown result kind.",
          resultKind: "plasticCollapse",
        },
      ],
      payload: {
        plasticCollapse: payloadEntryFor("memberForce"),
      },
      resultKinds: ["plasticCollapse"],
    } as unknown as Partial<FrameAnalysisResultResource>);

    expect(codes).toContain("FRAME_RESULT_DIAGNOSTIC_RESULT_KIND_INVALID");
    expect(codes).toContain("FRAME_RESULT_PAYLOAD_KIND_UNSUPPORTED");
    expect(codes).toContain("FRAME_RESULT_KIND_INVALID");
    expect(parseContractValue(frameAnalysisResultResourceSchema, {
      ...validResource(),
      payload: { plasticCollapse: payloadEntryFor("memberForce") },
    }).success).toBe(false);
  });

  it("rejects invalid load context entries", () => {
    const codes = issueCodes({
      ...validResource(),
      loadContext: {
        entries: [
          { kind: "snow", id: "not-a-uuid", label: "" },
          { kind: "loadCase", id: LOAD_CONTEXT_ID },
          { kind: "loadCase", id: LOAD_CONTEXT_ID },
        ],
        requestChecksum: { algorithm: CONTENT_CHECKSUM_ALGORITHM, hexDigest: "bad" },
      },
    } as unknown as Partial<FrameAnalysisResultResource>);

    expect(codes).toContain("FRAME_RESULT_LOAD_CONTEXT_KIND_INVALID");
    expect(codes).toContain("FRAME_RESULT_LOAD_CONTEXT_ID_INVALID");
    expect(codes).toContain("FRAME_RESULT_LOAD_CONTEXT_LABEL_INVALID");
    expect(codes).toContain("FRAME_RESULT_LOAD_CONTEXT_ID_DUPLICATE");
    expect(codes).toContain("CONTENT_CHECKSUM_HEX_INVALID");
  });

  it("rejects invalid diagnostics", () => {
    const codes = issueCodes({
      ...validResource(),
      diagnostics: [
        {
          code: "",
          severity: "fatal",
          producer: "",
          message: "",
          path: "relative",
          entityId: "not-a-uuid",
          resultKind: "plasticCollapse",
        },
      ],
    } as unknown as Partial<FrameAnalysisResultResource>);

    expect(codes).toContain("FRAME_RESULT_DIAGNOSTIC_CODE_INVALID");
    expect(codes).toContain("FRAME_RESULT_DIAGNOSTIC_SEVERITY_INVALID");
    expect(codes).toContain("FRAME_RESULT_DIAGNOSTIC_PRODUCER_INVALID");
    expect(codes).toContain("FRAME_RESULT_DIAGNOSTIC_MESSAGE_INVALID");
    expect(codes).toContain("FRAME_RESULT_DIAGNOSTIC_PATH_INVALID");
    expect(codes).toContain("FRAME_RESULT_DIAGNOSTIC_ENTITY_ID_INVALID");
    expect(codes).toContain("FRAME_RESULT_DIAGNOSTIC_RESULT_KIND_INVALID");
  });

  it("rejects unsafe numeric payload values", () => {
    const resource = validResource();
    const codes = issueCodes({
      ...resource,
      payload: {
        memberForce: {
          schemaVersion: requireSchemaVersion("0.1.0"),
          rows: [
            {
              ...resource.payload.memberForce!.rows[0],
              values: { fx: Number.NaN, my: Number.POSITIVE_INFINITY },
            },
          ],
        },
      },
    });

    expect(codes.filter((code) => code === "FRAME_RESULT_NUMERIC_VALUE_INVALID")).toHaveLength(2);
  });

  it("does not accept raw AnalysisResult as an authoritative result resource", () => {
    const rawAnalysisResult = {
      projectId: "project-1",
      schemaVersion: "1.0.0",
      analysisSummary: {
        analysisType: "linear_static",
        status: "success",
        startedAt: "2026-07-25T10:00:00.000Z",
        finishedAt: "2026-07-25T10:00:01.000Z",
        durationMs: 1000,
        nodeCount: 2,
        memberCount: 1,
        loadCaseCount: 1,
        totalDof: 12,
        freeDof: 6,
        constrainedDof: 6,
        solver: "scipy_sparse",
      },
      displacements: [],
      reactions: [],
      memberEndForces: [],
      warnings: [],
      errors: [],
    };

    expect(isFrameAnalysisResultResource(rawAnalysisResult)).toBe(false);
    expect(
      validateFrameAnalysisResultResource(
        rawAnalysisResult as unknown as Partial<FrameAnalysisResultResource>,
        "",
      ).status,
    ).toBe("invalid");
    expect(parseContractValue(frameAnalysisResultResourceSchema, rawAnalysisResult).success).toBe(false);
  });

  it("parses valid resources structurally with the runtime schema", () => {
    const parsed = parseContractValue(frameAnalysisResultResourceSchema, validResource());

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.resultId).toBe(RESULT_ID);
    }
  });
});
