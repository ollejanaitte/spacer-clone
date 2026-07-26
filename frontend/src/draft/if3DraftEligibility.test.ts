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
import {
  evaluateDraftSheetEligibility,
  SP1_NEUTRAL_FRAME_DRAWING_PATH_NOT_VERIFIED,
} from "./if3DraftEligibility";

const RESULT_ID = "550e8400-e29b-41d4-a716-446655440000";
const RUN_ID = "550e8400-e29b-41d4-a716-446655440001";
const SOURCE_DOCUMENT_ID = "550e8400-e29b-41d4-a716-446655440002";
const LOAD_CONTEXT_ID = "550e8400-e29b-41d4-a716-446655440003";

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
        rows: [],
      },
    },
    resultKinds: ["nodeDisplacement"],
    resultChecksum: checksum("f".repeat(64)),
  };
}

function frameDocument(): Pick<
  BridgeFrameAnalysisDocument,
  "documentId" | "structuralModel" | "loadDefinitions"
> {
  return {
    documentId: uuid(SOURCE_DOCUMENT_ID),
    structuralModel: {
      nodes: [
        {
          entityId: uuid("550e8400-e29b-41d4-a716-446655440010"),
          coordinateContextId: uuid("550e8400-e29b-41d4-a716-446655440011"),
          x: 0,
          y: 0,
          z: 0,
        },
      ],
      members: [],
      materials: [],
      sections: [],
      supports: [],
    },
    loadDefinitions: [
      {
        entityId: uuid("550e8400-e29b-41d4-a716-446655440012"),
        label: "LC1",
        loadKind: "dead",
      },
    ],
  };
}

describe("if3DraftEligibility", () => {
  it("always records the SP1 neutral Frame drawing blocker", () => {
    const eligibility = evaluateDraftSheetEligibility({
      frameDocument: frameDocument(),
      resource: validResource(),
      availabilityStatus: "VALID",
      sourceDocument: validSourceDocument(),
    });

    expect(eligibility.sp1RemainingBlocker).toBe(SP1_NEUTRAL_FRAME_DRAWING_PATH_NOT_VERIFIED);
    expect(
      eligibility.sheets.every((sheet) => sheet.authoritativeOutputAllowed === false),
    ).toBe(true);
    expect(
      eligibility.sheets.every((sheet) =>
        sheet.diagnostics.some((item) => item.code === SP1_NEUTRAL_FRAME_DRAWING_PATH_NOT_VERIFIED),
      ),
    ).toBe(true);
  });

  it("allows structure and support/load sheets from frame source without a result resource", () => {
    const eligibility = evaluateDraftSheetEligibility({
      frameDocument: frameDocument(),
      resource: null,
      availabilityStatus: "MISSING",
    });

    const structure = eligibility.sheets.find((sheet) => sheet.sheetKind === "structureLayout");
    const supportLoad = eligibility.sheets.find((sheet) => sheet.sheetKind === "supportLoadLayout");
    const resultDiagram = eligibility.sheets.find((sheet) => sheet.sheetKind === "resultDiagram");

    expect(structure?.eligible).toBe(true);
    expect(supportLoad?.eligible).toBe(true);
    expect(resultDiagram?.eligible).toBe(false);
  });

  it("allows result-diagram IF3 eligibility only for VALID authoritative gate states", () => {
    const allowed = evaluateDraftSheetEligibility({
      frameDocument: frameDocument(),
      resource: validResource(),
      availabilityStatus: "VALID",
      sourceDocument: validSourceDocument(),
    });
    const blocked = evaluateDraftSheetEligibility({
      frameDocument: frameDocument(),
      resource: validResource(),
      availabilityStatus: "STALE",
      sourceDocument: validSourceDocument(),
    });

    expect(allowed.sheets.find((sheet) => sheet.sheetKind === "resultDiagram")?.eligible).toBe(true);
    expect(blocked.sheets.find((sheet) => sheet.sheetKind === "resultDiagram")?.eligible).toBe(false);
  });

  it("does not mutate draft eligibility inputs", () => {
    const resource = validResource();
    const frameDoc = frameDocument();
    const sourceDocument = validSourceDocument();
    const resourceSnapshot = structuredClone(resource);
    const frameSnapshot = structuredClone(frameDoc);
    const sourceSnapshot = structuredClone(sourceDocument);

    evaluateDraftSheetEligibility({
      frameDocument: frameDoc,
      resource,
      availabilityStatus: "VALID",
      sourceDocument,
    });

    expect(resource).toEqual(resourceSnapshot);
    expect(frameDoc).toEqual(frameSnapshot);
    expect(sourceDocument).toEqual(sourceSnapshot);
  });
});
