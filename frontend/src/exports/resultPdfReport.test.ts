import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import type { AnalysisResult } from "../types";
import { buildResultPdfReport, buildResultPdfReportHtml } from "./resultPdfReport";

describe("result PDF report export", () => {
  it("builds the MVP report sections from the result schema and existing view model", () => {
    const report = buildResultPdfReport(createDefaultProject(), sampleResult(), "LC1", "2026-06-06T00:00:00.000Z");

    expect(report.sections.map((section) => section.title)).toEqual([
      "Project Overview",
      "Analysis Conditions",
      "Node Displacements",
      "Support Reactions",
      "Member Forces",
    ]);
    expect(report.sections[2].blocks[0].rows[0]).toEqual(["N2", 0.001, -0.002, 0, 0, 0, 0, expect.any(Number)]);
    expect(report.sections[3].blocks[0].rows[0]).toEqual(["N1", 0, 10, 0, 0, 0, 4]);
    expect(report.sections[4].blocks[0].rows).toEqual([
      ["M1", "N", 1, -1],
      ["M1", "My", 3, -3],
      ["M1", "Mz", 4, -4],
    ]);
  });

  it("renders print-ready HTML and escapes project text", () => {
    const project = createDefaultProject();
    project.project.name = "<Report & Check>";

    const html = buildResultPdfReportHtml(buildResultPdfReport(project, sampleResult(), "LC1", "2026-06-06T00:00:00.000Z"));

    expect(html).toContain("&lt;Report &amp; Check&gt; Analysis Report");
    expect(html).toContain("window.print()");
    expect(html).toContain("Node Displacement Table");
    expect(html).toContain("Support Reaction Table");
    expect(html).toContain("Member Force Table");
  });
});

function sampleResult(): AnalysisResult {
  return {
    projectId: "default-project",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-06-06T00:00:00.000Z",
      finishedAt: "2026-06-06T00:00:00.100Z",
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
    reactions: [
      {
        loadCaseId: "LC1",
        nodeId: "N1",
        fx: 0,
        fy: 10,
        fz: 0,
        mx: 0,
        my: 0,
        mz: 4,
        constrainedDofs: ["ux", "uy", "uz", "rx", "ry", "rz"],
      },
    ],
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
