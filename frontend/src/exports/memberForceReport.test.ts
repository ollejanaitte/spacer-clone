import { describe, expect, it } from "vitest";
import { buildMemberForceReportCsv } from "./memberForceReport";
import type { AnalysisResult } from "../types";

function createMockResult(): AnalysisResult {
  return {
    projectId: "test",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "",
      finishedAt: "",
      durationMs: 100,
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
    memberEndForces: [
      {
        loadCaseId: "LC1",
        memberId: "M1",
        coordinateSystem: "local",
        i: { fx: -10, fy: -5, fz: 3, mx: 1, my: -20, mz: 15 },
        j: { fx: 10, fy: 5, fz: -3, mx: -1, my: 20, mz: -15 },
      },
    ],
    warnings: [],
    errors: [],
  };
}

describe("buildMemberForceReportCsv", () => {
  it("generates CSV with headers and data rows", () => {
    const csv = buildMemberForceReportCsv(createMockResult());
    const lines = csv.trim().split("\r\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain("load_case");
    expect(lines[0]).toContain("member_id");
    expect(lines[0]).toContain("i_fx");
    expect(lines[0]).toContain("j_mz");
  });

  it("contains correct force values", () => {
    const csv = buildMemberForceReportCsv(createMockResult());
    const lines = csv.trim().split("\r\n");
    const dataRow = lines[1];
    expect(dataRow).toContain("LC1");
    expect(dataRow).toContain("M1");
    expect(dataRow).toContain("local");
    expect(dataRow).toContain("10");
    expect(dataRow).toContain("-10");
  });

  it("returns empty when no member end forces", () => {
    const result = createMockResult();
    result.memberEndForces = [];
    const csv = buildMemberForceReportCsv(result);
    const lines = csv.trim().split("\r\n");
    expect(lines.length).toBe(1);
  });
});
