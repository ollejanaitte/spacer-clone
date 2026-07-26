import { describe, expect, it } from "vitest";
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
import { buildIf3ResultViewModel } from "./if3ResultViewModel";

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
            values: { ux: 0.001, uy: -0.002, uz: 0, rx: 0, ry: 0, rz: 0 },
          },
        ],
      },
      supportReaction: {
        schemaVersion: requireSchemaVersion("0.1.0"),
        rows: [
          {
            rowId: uuid("550e8400-e29b-41d4-a716-446655440007"),
            entityKind: "support",
            entityId: uuid("550e8400-e29b-41d4-a716-446655440008"),
            loadContextId: uuid(LOAD_CONTEXT_ID),
            quantity: "reaction",
            unit: "kN/kN_m",
            values: { fx: 0, fy: 10, fz: 0, mx: 0, my: 0, mz: 4 },
          },
        ],
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
              "i.fx": 1,
              "i.fy": 2,
              "i.fz": 0,
              "i.mx": 0,
              "i.my": 3,
              "i.mz": 4,
              "j.fx": -1,
              "j.fy": -2,
              "j.fz": 0,
              "j.mx": 0,
              "j.my": -3,
              "j.mz": -4,
            },
          },
        ],
      },
    },
    resultKinds: ["nodeDisplacement", "supportReaction", "memberForce"],
    resultChecksum: checksum("f".repeat(64)),
  };
}

describe("if3ResultViewModel", () => {
  it("uses resource.resultId in the authoritative viewer view model", () => {
    const result = buildIf3ResultViewModel({
      resource: validResource(),
      availabilityStatus: "VALID",
      sourceDocument: validSourceDocument(),
      loadCaseId: "LC1",
    });

    expect(result.gate.authoritativeOutputAllowed).toBe(true);
    expect(result.viewModel?.resultId).toBe(RESULT_ID);
    expect(result.viewModel?.displacements.resultId).toBe(RESULT_ID);
    expect(result.viewModel?.displacements.items[0]?.uy).toBe(-0.002);
  });

  it("returns null view model when the gate blocks authoritative output", () => {
    const result = buildIf3ResultViewModel({
      resource: validResource(),
      availabilityStatus: "STALE",
      sourceDocument: validSourceDocument(),
      loadCaseId: "LC1",
    });

    expect(result.gate.authoritativeOutputAllowed).toBe(false);
    expect(result.viewModel).toBeNull();
  });

  it("does not mutate adapter inputs", () => {
    const resource = validResource();
    const sourceDocument = validSourceDocument();
    const resourceSnapshot = structuredClone(resource);
    const sourceSnapshot = structuredClone(sourceDocument);

    buildIf3ResultViewModel({
      resource,
      availabilityStatus: "VALID",
      sourceDocument,
      loadCaseId: "LC1",
    });

    expect(resource).toEqual(resourceSnapshot);
    expect(sourceDocument).toEqual(sourceSnapshot);
  });
});
