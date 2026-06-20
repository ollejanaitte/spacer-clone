import { describe, expect, it } from "vitest";
import {
  evaluateMetric,
  extractDisplacementMetrics,
  extractReactionMetrics,
  extractMemberForceMetrics,
  buildVerificationReportCsv,
  buildVerificationSummaryCsv,
  type VerificationReport,
} from "./verificationReport";
import type { AnalysisResult } from "../types";

const TOLERANCE = { relative: 1e-4, absolute: 1e-10 };

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

describe("evaluateMetric", () => {
  it("passes when within tolerance", () => {
    const metric = evaluateMetric(10.0, 10.0001, TOLERANCE);
    expect(metric).not.toBeNull();
    expect(metric!.passed).toBe(true);
  });

  it("fails when outside tolerance", () => {
    const metric = evaluateMetric(10.0, 11.0, TOLERANCE);
    expect(metric).not.toBeNull();
    expect(metric!.passed).toBe(false);
  });

  it("returns null for null values", () => {
    expect(evaluateMetric(null, 10.0, TOLERANCE)).toBeNull();
    expect(evaluateMetric(10.0, null, TOLERANCE)).toBeNull();
  });
});

describe("extractDisplacementMetrics", () => {
  it("extracts displacement metrics correctly", () => {
    const result = createMockResult();
    const expected = { N2: { uy: -0.010406504 } };
    const metrics = extractDisplacementMetrics(result, expected, TOLERANCE);
    expect(metrics.length).toBe(1);
    expect(metrics[0].indicator).toBe("displacement.N2.uy");
    expect(metrics[0].passed).toBe(true);
  });

  it("returns empty for no matching nodes", () => {
    const result = createMockResult();
    const expected = { N99: { uy: -0.01 } };
    const metrics = extractDisplacementMetrics(result, expected, TOLERANCE);
    expect(metrics.length).toBe(0);
  });
});

describe("extractReactionMetrics", () => {
  it("extracts reaction metrics correctly", () => {
    const result = createMockResult();
    const expected = { N1: { fy: 10.0, mz: 40.0 } };
    const metrics = extractReactionMetrics(result, expected, TOLERANCE);
    expect(metrics.length).toBe(2);
    expect(metrics.every((m) => m.passed)).toBe(true);
  });
});

describe("extractMemberForceMetrics", () => {
  it("extracts max absolute member force metrics", () => {
    const result = createMockResult();
    const expected = { maxAbsMemberForce: { Mz: 40.0 } };
    const metrics = extractMemberForceMetrics(result, expected, TOLERANCE);
    expect(metrics.length).toBe(1);
    expect(metrics[0].indicator).toBe("memberForce.maxAbs.Mz");
    expect(metrics[0].passed).toBe(true);
  });
});

describe("CSV generation", () => {
  it("builds verification report CSV", () => {
    const report: VerificationReport = {
      generatedAt: "2026-06-20T00:00:00Z",
      models: [
        {
          name: "Cantilever",
          category: "beam",
          passed: true,
          metrics: [
            {
              model: "Cantilever",
              category: "beam",
              indicator: "displacement.N2.uy",
              expected: -0.01,
              actual: -0.010001,
              difference: -0.000001,
              errorRate: 0.0001,
              passed: true,
            },
          ],
        },
      ],
      summary: {
        totalModels: 1,
        passedModels: 1,
        failedModels: 0,
        totalMetrics: 1,
        passedMetrics: 1,
        failedMetrics: 0,
      },
    };

    const csv = buildVerificationReportCsv(report);
    expect(csv).toContain("model,category,indicator");
    expect(csv).toContain("Cantilever");
    expect(csv).toContain("displacement.N2.uy");
  });

  it("builds verification summary CSV", () => {
    const report: VerificationReport = {
      generatedAt: "2026-06-20T00:00:00Z",
      models: [
        {
          name: "Cantilever",
          category: "beam",
          passed: true,
          metrics: [],
        },
      ],
      summary: {
        totalModels: 1,
        passedModels: 1,
        failedModels: 0,
        totalMetrics: 0,
        passedMetrics: 0,
        failedMetrics: 0,
      },
    };

    const csv = buildVerificationSummaryCsv(report);
    expect(csv).toContain("model,category,passed");
    expect(csv).toContain("Cantilever");
  });
});
