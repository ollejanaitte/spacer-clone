import { describe, expect, it } from "vitest";
import {
  generateVerificationReport,
  buildVerificationReportCsv,
  buildVerificationSummaryCsv,
  type VerificationMetadata,
} from "./verificationReport";
import type { AnalysisResult } from "../types";

function createCantileverResult(): AnalysisResult {
  return {
    projectId: "verify-cantilever",
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
    displacements: [
      { loadCaseId: "LC1", nodeId: "N1", ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
      { loadCaseId: "LC1", nodeId: "N2", ux: 0, uy: -0.0104065, uz: 0, rx: 0, ry: 0, rz: -0.0039024 },
    ],
    reactions: [
      { loadCaseId: "LC1", nodeId: "N1", fx: 0, fy: 10.0, fz: 0, mx: 0, my: 0, mz: 40.0, constrainedDofs: [] },
    ],
    memberEndForces: [
      {
        loadCaseId: "LC1",
        memberId: "M1",
        coordinateSystem: "local",
        i: { fx: 0, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 },
        j: { fx: 0, fy: 10.0, fz: 0, mx: 0, my: 0, mz: -40.0 },
      },
    ],
    warnings: [],
    errors: [],
  };
}

const cantileverMetadata: VerificationMetadata = {
  name: "Cantilever Tip Load",
  category: "beam",
  description: "Cantilever beam with concentrated load at free end.",
  modelPath: "cantilever_tip_load.json",
  expected: {
    displacements: {
      N2: { uy: -0.010406504, rz: -0.003902439 },
    },
    reactions: {
      N1: { fy: 10.0, mz: 40.0 },
    },
    maxAbsMemberForce: {
      Mz: 40.0,
    },
  },
  tolerance: {
    relative: 1e-4,
    absolute: 1e-10,
  },
};

describe("generateVerificationReport", () => {
  it("generates a passing report for cantilever", () => {
    const result = createCantileverResult();
    const report = generateVerificationReport(
      "Cantilever Tip Load",
      "beam",
      result,
      cantileverMetadata,
    );

    expect(report.name).toBe("Cantilever Tip Load");
    expect(report.category).toBe("beam");
    expect(report.passed).toBe(true);
    expect(report.metrics.length).toBeGreaterThan(0);
    expect(report.metrics.every((m) => m.passed)).toBe(true);
  });

  it("generates correct metric indicators", () => {
    const result = createCantileverResult();
    const report = generateVerificationReport(
      "Cantilever Tip Load",
      "beam",
      result,
      cantileverMetadata,
    );

    const indicators = report.metrics.map((m) => m.indicator);
    expect(indicators).toContain("displacement.N2.uy");
    expect(indicators).toContain("displacement.N2.rz");
    expect(indicators).toContain("reaction.N1.fy");
    expect(indicators).toContain("reaction.N1.mz");
    expect(indicators).toContain("memberForce.maxAbs.Mz");
  });
});

describe("buildVerificationReportCsv", () => {
  it("generates valid CSV", () => {
    const result = createCantileverResult();
    const report = generateVerificationReport(
      "Cantilever Tip Load",
      "beam",
      result,
      cantileverMetadata,
    );

    const csv = buildVerificationReportCsv({
      generatedAt: "2026-06-20T00:00:00Z",
      models: [report],
      summary: {
        totalModels: 1,
        passedModels: 1,
        failedModels: 0,
        totalMetrics: report.metrics.length,
        passedMetrics: report.metrics.filter((m) => m.passed).length,
        failedMetrics: report.metrics.filter((m) => !m.passed).length,
      },
    });

    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("model,category,indicator,expected,actual,difference,error_rate,passed");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[1]).toContain("Cantilever Tip Load");
  });
});

describe("buildVerificationSummaryCsv", () => {
  it("generates valid summary CSV", () => {
    const result = createCantileverResult();
    const report = generateVerificationReport(
      "Cantilever Tip Load",
      "beam",
      result,
      cantileverMetadata,
    );

    const csv = buildVerificationSummaryCsv({
      generatedAt: "2026-06-20T00:00:00Z",
      models: [report],
      summary: {
        totalModels: 1,
        passedModels: 1,
        failedModels: 0,
        totalMetrics: report.metrics.length,
        passedMetrics: report.metrics.filter((m) => m.passed).length,
        failedMetrics: report.metrics.filter((m) => !m.passed).length,
      },
    });

    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("model,category,passed,total_metrics,passed_metrics,failed_metrics");
    expect(lines[1]).toContain("Cantilever Tip Load");
    expect(lines[1]).toContain("true");
  });
});
