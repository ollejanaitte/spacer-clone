import { describe, expect, it } from "vitest";
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
} from "../../contracts";
import { createDefaultProject } from "../../data/defaultProject";
import {
  buildAppIf3ExportGateInput,
  evaluateIf3ExportGate,
} from "../../exports/if3ExportGate";
import { buildRunAnalysisIf3Metadata } from "../buildRunAnalysisIf3Metadata";
import { resolveProjectModelSourceDocument } from "../projectModelSourceBinding";

const RESULT_ID = "550e8400-e29b-41d4-a716-446655440000";
const RUN_ID = "550e8400-e29b-41d4-a716-446655440001";
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

function projectBoundResource(project = createDefaultProject()): FrameAnalysisResultResource {
  const binding = resolveProjectModelSourceDocument(project);
  const metadata = buildRunAnalysisIf3Metadata(project);
  return {
    schemaId: FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
    schemaVersion: FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_VERSION,
    resultId: uuid(RESULT_ID),
    analysisRunId: uuid(RUN_ID),
    sourceDocumentId: binding.documentId,
    sourceDocumentVersion: requireRevisionId(binding.revisionId),
    sourceContentChecksum: binding.contentChecksum,
    status: "SUCCEEDED",
    generatedAt: "2026-07-25T10:00:00.000Z",
    solverName: metadata.solverName,
    solverVersion: metadata.solverVersion,
    analysisSettingsChecksum: checksum("b".repeat(64)),
    loadContext: {
      entries: [
        {
          kind: "loadCase",
          id: uuid(LOAD_CONTEXT_ID),
          label: project.loadCases[0]?.name ?? "LC1",
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
            values: { ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
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
            values: { fx: 0, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 },
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
              "i.fx": 0,
              "i.fy": 0,
              "i.fz": 0,
              "i.mx": 0,
              "i.my": 0,
              "i.mz": 0,
              "j.fx": 0,
              "j.fy": 0,
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

describe("buildAppIf3ExportGateInput source binding", () => {
  it("attaches the current project sourceDocument binding", () => {
    const project = createDefaultProject();
    const input = buildAppIf3ExportGateInput({
      if3Result: projectBoundResource(project),
      project,
      activeLoadCase: project.loadCases[0]?.id ?? "",
      availabilityStatus: "VALID",
    });

    expect(input.sourceDocument).toEqual(resolveProjectModelSourceDocument(project));
  });

  it("allows authoritative export when source binding matches a VALID resource", () => {
    const project = createDefaultProject();
    const gate = evaluateIf3ExportGate(
      buildAppIf3ExportGateInput({
        if3Result: projectBoundResource(project),
        project,
        activeLoadCase: project.loadCases[0]?.id ?? "",
        availabilityStatus: "VALID",
      }),
    );

    expect(gate.authoritativeOutputAllowed).toBe(true);
  });

  it("blocks authoritative export after project content changes with the same if3Result", () => {
    const project = createDefaultProject();
    const if3Result = projectBoundResource(project);
    project.project = {
      ...project.project,
      description: "edited after analysis",
    };

    const gate = evaluateIf3ExportGate(
      buildAppIf3ExportGateInput({
        if3Result,
        project,
        activeLoadCase: project.loadCases[0]?.id ?? "",
        availabilityStatus: "VALID",
      }),
    );

    expect(gate.authoritativeOutputAllowed).toBe(false);
    expect(gate.diagnostics.map((item) => item.code)).toContain(
      "FRAME_RESULT_SOURCE_CHECKSUM_MISMATCH",
    );
  });
});
