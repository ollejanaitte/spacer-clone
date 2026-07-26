import { describe, expect, it } from "vitest";
import type { AnalysisResult, TimeHistoryResult } from "../types";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_VERSION,
  parseUuid,
  requireRevisionId,
  requireSchemaVersion,
  type ContentChecksum,
  type FrameAnalysisResultResource,
  type UuidString,
} from "../contracts";
import {
  classifyIf3Compatibility,
  evaluateWriteTargetEligibility,
  OLD_ANALYSIS_RESULT_POLICY,
} from "./if3LegacyCompatibility";

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
    resultKinds: ["nodeDisplacement", "supportReaction", "memberForce"],
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
              "i.mz": 0,
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
    resultChecksum: checksum("e".repeat(64)),
  };
}

function legacyRawResult(): AnalysisResult {
  return {
    projectId: "legacy-project",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-07-25T00:00:00.000Z",
      finishedAt: "2026-07-25T00:00:00.100Z",
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

function completeWriteTargetMetadata() {
  return {
    sourceDocumentId: SOURCE_DOCUMENT_ID,
    sourceDocumentVersion: 3,
    sourceContentChecksumHex: "a".repeat(64),
    analysisSettingsChecksumHex: "b".repeat(64),
    provenanceCreatedAt: "2026-07-25T10:00:00.000Z",
    provenanceActorId: "user-1",
    provenanceProducerToolId: "spacer-backend",
    provenanceProducerToolVersion: "0.1.0",
    solverName: "scipy_sparse",
    solverVersion: "0.1.0",
  };
}

function legacyTimeHistory(): TimeHistoryResult {
  return {
    meta: {
      analysisId: "th-legacy",
      status: "success",
      method: "newmark_beta",
      timeStep: 0.01,
      duration: 1,
      sampleCount: 2,
    },
    time: [0, 0.01],
    displacements: { "node-1.ux": [0, 0.1] },
    velocities: { "node-1.ux": [0, 0.2] },
    accelerations: { "node-1.ux": [0, 0.3] },
  };
}

describe("if3LegacyCompatibility", () => {
  it("keeps current IF3 VALID resources authoritative", () => {
    const assessment = classifyIf3Compatibility({
      resource: validResource(),
      availabilityStatus: "VALID",
      sourceDocument: {
        documentId: uuid(SOURCE_DOCUMENT_ID),
        revisionId: requireRevisionId(3),
        contentChecksum: checksum(),
      },
    });

    expect(assessment.policy).toBe(OLD_ANALYSIS_RESULT_POLICY);
    expect(assessment.compatibilityClass).toBe("IF3_COMPATIBLE_CURRENT");
    expect(assessment.gate.authoritativeOutputAllowed).toBe(true);
    expect(assessment.consumerCapabilities.csv.exportable).toBe(true);
    expect(assessment.consumerCapabilities.print.formalPrintable).toBe(true);
    expect(assessment.writeTarget.eligible).toBe(false);
  });

  it("classifies stale IF3 resources without inventing freshness", () => {
    const assessment = classifyIf3Compatibility({
      resource: { ...validResource(), status: "STALE" },
      availabilityStatus: "STALE",
    });

    expect(assessment.compatibilityClass).toBe("STALE");
    expect(assessment.gate.authoritativeOutputAllowed).toBe(false);
    expect(assessment.consumerCapabilities.viewer.displayable).toBe(true);
    expect(assessment.consumerCapabilities.csv.exportable).toBe(false);
    expect(assessment.consumerCapabilities.print.formalPrintable).toBe(false);
    expect(assessment.writeTarget.eligible).toBe(false);
  });

  it("quarantines legacy raw results with insufficient provenance", () => {
    const assessment = classifyIf3Compatibility({
      rawResult: legacyRawResult(),
    });

    expect(assessment.compatibilityClass).toBe("LEGACY_INSUFFICIENT_PROVENANCE");
    expect(assessment.gate.authoritativeOutputAllowed).toBe(false);
    expect(assessment.consumerCapabilities.report.exportable).toBe(false);
    expect(assessment.consumerCapabilities.viewer.displayable).toBe(true);
    expect(assessment.writeTarget.eligible).toBe(false);
    expect(assessment.writeTarget.missingFields.length).toBeGreaterThan(0);
    expect(assessment.diagnostics.some((item) => item.code === "MISSING_PROVENANCE")).toBe(true);
    expect(assessment.diagnostics.some((item) => item.code === "RAW_ANALYSIS_RESULT_REJECTED")).toBe(
      true,
    );
  });

  it("allows READ_OLD and WRITE_TARGET eligibility only with explicit complete metadata", () => {
    const incomplete = evaluateWriteTargetEligibility({
      sourceDocumentId: SOURCE_DOCUMENT_ID,
      solverName: "scipy_sparse",
    });
    expect(incomplete.eligible).toBe(false);
    expect(incomplete.missingFields).toContain("provenanceCreatedAt");
    expect(incomplete.diagnostics[0]?.message).toContain("Provenance is not invented");

    const complete = evaluateWriteTargetEligibility(completeWriteTargetMetadata());
    expect(complete.eligible).toBe(true);

    const assessment = classifyIf3Compatibility({
      rawResult: legacyRawResult(),
      writeTargetMetadata: completeWriteTargetMetadata(),
    });
    expect(assessment.compatibilityClass).toBe("LEGACY_SAFELY_CONSUMABLE");
    expect(assessment.gate.authoritativeOutputAllowed).toBe(false);
    expect(assessment.writeTarget.eligible).toBe(true);
    expect(assessment.consumerCapabilities.csv.exportable).toBe(false);
  });

  it("does not invent provenance for legacy timeHistory transition", () => {
    const assessment = classifyIf3Compatibility({
      legacyTimeHistory: legacyTimeHistory(),
    });

    expect(assessment.compatibilityClass).toBe("LEGACY_INSUFFICIENT_PROVENANCE");
    expect(assessment.gate.authoritativeOutputAllowed).toBe(false);
    expect(assessment.gate.state).toBe("INVALID");
    expect(assessment.consumerCapabilities.viewer.displayable).toBe(true);
    expect(assessment.consumerCapabilities.print.formalPrintable).toBe(false);
    expect(assessment.writeTarget.eligible).toBe(false);
    expect(
      assessment.diagnostics.some((item) => item.code === "LEGACY_TIME_HISTORY_COMPATIBILITY"),
    ).toBe(true);
  });

  it("keeps MISSING gate state for legacy timeHistory with complete WRITE_TARGET metadata", () => {
    const assessment = classifyIf3Compatibility({
      legacyTimeHistory: legacyTimeHistory(),
      writeTargetMetadata: completeWriteTargetMetadata(),
    });

    expect(assessment.compatibilityClass).toBe("LEGACY_SAFELY_CONSUMABLE");
    expect(assessment.gate.authoritativeOutputAllowed).toBe(false);
    expect(assessment.gate.state).toBe("MISSING");
  });

  it("does not mark incomplete SUCCEEDED resources as IF3_COMPATIBLE_CURRENT", () => {
    const resource = validResource();
    const assessment = classifyIf3Compatibility({
      resource,
      availabilityStatus: "VALID",
      sourceDocument: {
        documentId: uuid("6ba7b810-9dad-11d1-80b4-00c04fd430c9"),
        revisionId: requireRevisionId(99),
        contentChecksum: checksum("f".repeat(64)),
      },
    });

    expect(assessment.compatibilityClass).not.toBe("IF3_COMPATIBLE_CURRENT");
    expect(assessment.gate.authoritativeOutputAllowed).toBe(false);
    expect(assessment.diagnostics.length).toBeGreaterThan(0);
  });

  it("flags missing required result members without inventing payload rows", () => {
    const resource = validResource();
    const assessment = classifyIf3Compatibility({
      resource: {
        ...resource,
        resultKinds: ["nodeDisplacement"],
        payload: {
          nodeDisplacement: resource.payload.nodeDisplacement,
        },
      },
      availabilityStatus: "VALID",
    });

    expect(assessment.compatibilityClass).toBe("MISSING_REQUIRED_MEMBERS");
    expect(assessment.gate.authoritativeOutputAllowed).toBe(false);
    expect(assessment.diagnostics.some((item) => item.code === "UNSUPPORTED_RESULT_KIND")).toBe(
      true,
    );
  });

  it("hard-blocks malformed unsupported candidates", () => {
    const assessment = classifyIf3Compatibility({
      rawResult: {
        ...legacyRawResult(),
        displacements: null as unknown as AnalysisResult["displacements"],
      },
    });

    expect(assessment.compatibilityClass).toBe("MALFORMED_UNSUPPORTED");
    expect(assessment.consumerCapabilities.viewer.readable).toBe(false);
    expect(assessment.consumerCapabilities.viewer.hardBlockAuthoritative).toBe(true);
    expect(assessment.gate.authoritativeOutputAllowed).toBe(false);
  });
});
