import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "../types";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_VERSION,
  parseUuid,
  requireRevisionId,
  requireSchemaVersion,
  type BridgeFrameAnalysisDocument,
  type ContentChecksum,
  type FrameAnalysisResultResource,
  type UuidString,
} from "../contracts";
import {
  evaluateIf3ResultGate,
  IF3_AVAILABILITY_STATUSES,
  isRawAnalysisResultCandidate,
  resolveTransientIf3AvailabilityStatus,
} from "./if3ResultGate";

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

function validSourceDocument(): Pick<
  BridgeFrameAnalysisDocument,
  "documentId" | "revisionId" | "contentChecksum"
> {
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
    diagnostics: [],
    payload: {
      nodeDisplacement: {
        schemaVersion: requireSchemaVersion("0.1.0"),
        rows: [
          {
            rowId: uuid(ROW_ID),
            entityKind: "node",
            entityId: uuid("550e8400-e29b-41d4-a716-446655440006"),
            loadContextId: uuid(LOAD_CONTEXT_ID),
            quantity: "displacement",
            unit: "m/rad",
            values: { ux: 0, uy: -0.01, uz: 0, rx: 0, ry: 0, rz: 0 },
          },
        ],
      },
      supportReaction: {
        schemaVersion: requireSchemaVersion("0.1.0"),
        rows: [],
      },
      memberForce: {
        schemaVersion: requireSchemaVersion("0.1.0"),
        rows: [
          {
            rowId: uuid("550e8400-e29b-41d4-a716-446655440009"),
            entityKind: "member",
            entityId: uuid(MEMBER_ID),
            loadContextId: uuid(LOAD_CONTEXT_ID),
            quantity: "memberEndForce",
            unit: "kN/kN_m",
            values: {
              "i.fx": 0,
              "i.fy": 10,
              "i.fz": 0,
              "i.mx": 0,
              "i.my": 0,
              "i.mz": 40,
              "j.fx": 0,
              "j.fy": -10,
              "j.fz": 0,
              "j.mx": 0,
              "j.my": 0,
              "j.mz": 0,
            },
          },
        ],
      },
    },
    resultKinds: ["nodeDisplacement", "supportReaction", "memberForce"],
    resultChecksum: checksum("f".repeat(64)),
  };
}

function rawAnalysisResult(): AnalysisResult {
  return {
    projectId: "legacy-project",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-07-25T10:00:00.000Z",
      finishedAt: "2026-07-25T10:00:00.100Z",
      durationMs: 100,
      nodeCount: 1,
      memberCount: 1,
      loadCaseCount: 1,
      totalDof: 6,
      freeDof: 3,
      constrainedDof: 3,
      solver: "scipy_sparse",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    warnings: [],
    errors: [],
  };
}

describe("if3ResultGate", () => {
  it("registers the full availability status catalog", () => {
    expect(IF3_AVAILABILITY_STATUSES).toEqual([
      "VALID",
      "STALE",
      "MISSING",
      "INVALID",
      "UNSUPPORTED",
      "FAILED",
      "PARTIAL",
      "RUNNING",
      "PENDING",
    ]);
  });

  it("allows authoritative output for VALID availability with a bound SUCCEEDED resource", () => {
    const gate = evaluateIf3ResultGate({
      resource: validResource(),
      availabilityStatus: "VALID",
      sourceDocument: validSourceDocument(),
    });

    expect(gate.state).toBe("VALID");
    expect(gate.authoritativeOutputAllowed).toBe(true);
    expect(gate.resultRef).toEqual({
      resultId: RESULT_ID,
      resultChecksum: "f".repeat(64),
      analysisRunId: RUN_ID,
    });
  });

  it.each([
    "STALE",
    "MISSING",
    "INVALID",
    "UNSUPPORTED",
    "FAILED",
    "PARTIAL",
    "RUNNING",
    "PENDING",
  ] as const)("blocks authoritative output for %s availability", (availabilityStatus) => {
    const gate = evaluateIf3ResultGate({
      resource: validResource(),
      availabilityStatus,
      sourceDocument: validSourceDocument(),
    });

    expect(gate.state).toBe(availabilityStatus);
    expect(gate.authoritativeOutputAllowed).toBe(false);
  });

  it("rejects raw AnalysisResult candidates on authoritative paths", () => {
    const raw = rawAnalysisResult();
    expect(isRawAnalysisResultCandidate(raw)).toBe(true);

    const gate = evaluateIf3ResultGate({
      resource: raw as unknown as FrameAnalysisResultResource,
      availabilityStatus: "VALID",
      sourceDocument: validSourceDocument(),
    });

    expect(gate.authoritativeOutputAllowed).toBe(false);
    expect(gate.state).toBe("INVALID");
    expect(gate.diagnostics.map((item) => item.code)).toContain("RAW_ANALYSIS_RESULT_REJECTED");
  });

  it("returns deterministic diagnostics ordering", () => {
    const gate = evaluateIf3ResultGate({
      resource: {
        ...validResource(),
        diagnostics: [
          {
            code: "Z_LAST",
            severity: "warning",
            producer: "test",
            message: "z",
          },
          {
            code: "A_FIRST",
            severity: "error",
            producer: "test",
            message: "a",
          },
        ],
      },
      availabilityStatus: "STALE",
      availabilityDiagnostics: [
        {
          code: "STALE_RESULT",
          severity: "error",
          producer: "if3-c.availability",
          message: "Result is stale.",
        },
      ],
      sourceDocument: validSourceDocument(),
    });

    const codes = gate.diagnostics.map((item) => item.code);
    expect(codes).toEqual([...codes].sort((left, right) => left.localeCompare(right)));
  });

  it("maps transient resource status to availability for just-run analysis", () => {
    expect(resolveTransientIf3AvailabilityStatus(validResource())).toBe("VALID");
    expect(resolveTransientIf3AvailabilityStatus({ ...validResource(), status: "FAILED" })).toBe("FAILED");
    expect(resolveTransientIf3AvailabilityStatus({ ...validResource(), status: "UNSUPPORTED" })).toBe("UNSUPPORTED");
    expect(resolveTransientIf3AvailabilityStatus(null)).toBe("MISSING");
  });

  it("does not mutate gate inputs", () => {
    const resource = validResource();
    const sourceDocument = validSourceDocument();
    const availabilityDiagnostics = [
      {
        code: "STALE_RESULT",
        severity: "error" as const,
        producer: "if3-c.availability",
        message: "Result is stale.",
      },
    ];
    const resourceSnapshot = structuredClone(resource);
    const sourceSnapshot = structuredClone(sourceDocument);
    const diagnosticsSnapshot = structuredClone(availabilityDiagnostics);

    evaluateIf3ResultGate({
      resource,
      availabilityStatus: "STALE",
      availabilityDiagnostics,
      sourceDocument,
    });

    expect(resource).toEqual(resourceSnapshot);
    expect(sourceDocument).toEqual(sourceSnapshot);
    expect(availabilityDiagnostics).toEqual(diagnosticsSnapshot);
  });
});
