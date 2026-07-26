import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
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
  buildAppIf3ExportGateInput,
  buildIf3MemberForceReportCsv,
  buildIf3ResultCsvExports,
  buildIf3ResultPdfReport,
  canAuthorizeAppResultExport,
  If3ExportBlockedError,
  isRawOnlyAppExportState,
  rejectRawAnalysisResultForExport,
} from "./if3ExportGate";
import { resolveTransientIf3AvailabilityStatus } from "../results/if3ResultGate";

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
        rows: [
          {
            rowId: uuid("550e8400-e29b-41d4-a716-446655440004"),
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
            entityId: uuid("550e8400-e29b-41d4-a716-446655440005"),
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
    displacements: [
      {
        loadCaseId: "LC1",
        nodeId: "N2",
        ux: 0.001,
        uy: -0.002,
        uz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
      },
    ],
    reactions: [],
    memberEndForces: [
      {
        loadCaseId: "LC1",
        memberId: "M1",
        coordinateSystem: "local",
        i: { fx: 1, fy: 2, fz: 0, mx: 0, my: 3, mz: 4 },
        j: { fx: -1, fy: -2, fz: 0, mx: 0, my: -3, mz: -4 },
      },
    ],
    warnings: [],
    errors: [],
  };
}

describe("if3ExportGate", () => {
  const gateInput = {
    resource: validResource(),
    availabilityStatus: "VALID" as const,
    sourceDocument: validSourceDocument(),
    project: createDefaultProject(),
    activeLoadCase: "LC1",
  };

  it("builds authoritative CSV exports for VALID IF3 resources", () => {
    const exports = buildIf3ResultCsvExports(gateInput);
    expect(exports["displacements.csv"]).toContain("LC1");
    expect(exports["member_section_forces.csv"]).toContain("member_id");
    expect(JSON.parse(exports["result.json"])).toMatchObject({
      schemaId: FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
      resultId: RESULT_ID,
    });
  });

  it("builds authoritative PDF and member-force reports for VALID IF3 resources", () => {
    const report = buildIf3ResultPdfReport({
      ...gateInput,
      generatedAt: "2026-07-25T10:00:00.000Z",
    });
    expect(report.sections.length).toBeGreaterThan(0);

    const memberForceCsv = buildIf3MemberForceReportCsv(gateInput);
    expect(memberForceCsv).toContain("load_case");
  });

  it.each(["STALE", "MISSING", "INVALID", "UNSUPPORTED", "FAILED", "PARTIAL"] as const)(
    "blocks authoritative exports for %s availability",
    (availabilityStatus) => {
      expect(() =>
        buildIf3ResultCsvExports({
          ...gateInput,
          availabilityStatus,
        }),
      ).toThrow(If3ExportBlockedError);
    },
  );

  it("blocks exports when a required PRINT catalog member is missing", () => {
    const resource = validResource();
    const incompleteResource = {
      ...resource,
      resultKinds: ["nodeDisplacement", "supportReaction"] as const,
      payload: {
        nodeDisplacement: resource.payload.nodeDisplacement,
        supportReaction: resource.payload.supportReaction,
      },
    };

    try {
      buildIf3ResultCsvExports({
        ...gateInput,
        resource: incompleteResource,
      });
      throw new Error("Expected IF3 PRINT catalog to block export.");
    } catch (error) {
      expect(error).toBeInstanceOf(If3ExportBlockedError);
      expect(
        (error as If3ExportBlockedError).gate.diagnostics.map(
          (item) => item.code,
        ),
      ).toContain("PRINT_CATALOG_REQUIRED_RESULT_MISSING");
    }
  });

  it("blocks exports for declared unsupported PRINT result kinds", () => {
    const resource = validResource();
    const unsupportedResource = {
      ...resource,
      resultKinds: [...(resource.resultKinds ?? []), "modal"] as const,
      payload: {
        ...resource.payload,
        modal: {
          schemaVersion: requireSchemaVersion("0.1.0"),
          rows: [],
        },
      },
    };

    try {
      buildIf3ResultPdfReport({
        ...gateInput,
        resource: unsupportedResource,
      });
      throw new Error("Expected unsupported PRINT result kind to block export.");
    } catch (error) {
      expect(error).toBeInstanceOf(If3ExportBlockedError);
      expect(
        (error as If3ExportBlockedError).gate.diagnostics.map(
          (item) => item.code,
        ),
      ).toContain("PRINT_CATALOG_RESULT_KIND_UNSUPPORTED");
    }
  });

  it("rejects raw AnalysisResult on authoritative export paths", () => {
    const gate = rejectRawAnalysisResultForExport(rawAnalysisResult());
    expect(gate.authoritativeOutputAllowed).toBe(false);
    expect(gate.diagnostics.map((item) => item.code)).toContain("RAW_ANALYSIS_RESULT_REJECTED");

    expect(() =>
      buildIf3ResultCsvExports({
        ...gateInput,
        resource: rawAnalysisResult() as unknown as FrameAnalysisResultResource,
      }),
    ).toThrow(If3ExportBlockedError);
  });

  it("blocks App raw-only export state without an IF3 resource", () => {
    expect(isRawOnlyAppExportState({ rawResult: rawAnalysisResult(), if3Result: null })).toBe(true);
    expect(canAuthorizeAppResultExport(null)).toBe(false);
    expect(
      canAuthorizeAppResultExport({
        ...validResource(),
        status: "UNSUPPORTED",
      } as FrameAnalysisResultResource),
    ).toBe(false);
  });

  it("maps transient SUCCEEDED resources to VALID availability for App export gate input", () => {
    const resource = validResource();
    expect(resolveTransientIf3AvailabilityStatus(resource)).toBe("VALID");
    expect(
      buildAppIf3ExportGateInput({
        if3Result: resource,
        project: createDefaultProject(),
        activeLoadCase: "LC1",
      }).availabilityStatus,
    ).toBe("VALID");
  });

  it("does not mutate export gate inputs", () => {
    const resource = validResource();
    const sourceDocument = validSourceDocument();
    const project = createDefaultProject();
    const resourceSnapshot = structuredClone(resource);
    const sourceSnapshot = structuredClone(sourceDocument);
    const projectSnapshot = structuredClone(project);

    buildIf3ResultCsvExports({
      resource,
      availabilityStatus: "VALID",
      sourceDocument,
      project,
      activeLoadCase: "LC1",
    });

    expect(resource).toEqual(resourceSnapshot);
    expect(sourceDocument).toEqual(sourceSnapshot);
    expect(project).toEqual(projectSnapshot);
  });
});
