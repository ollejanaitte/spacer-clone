import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { openResultPdfReport } from "../../exports/resultPdfReport";
import type { AnalysisResult } from "../../types";
import { denyLegacyOpenResultPdfReport, legacyPdfBypassBlockedMessage } from "../legacyPdfBypassGuard";

function minimalAnalysisResult(): AnalysisResult {
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

describe("legacyPdfBypassGuard", () => {
  it("denyLegacyOpenResultPdfReport throws with a clear message", () => {
    expect(() => denyLegacyOpenResultPdfReport()).toThrow(legacyPdfBypassBlockedMessage());
  });

  it("openResultPdfReport throws instead of opening a legacy PDF window", () => {
    const project = createDefaultProject();
    expect(() => openResultPdfReport(project, minimalAnalysisResult(), "LC_DEAD")).toThrow(
      legacyPdfBypassBlockedMessage(),
    );
  });
});
