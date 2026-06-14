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

  it("adds eigen modes, effective mass summary, response spectrum conditions, and SRSS displacement sections for dynamic results", () => {
    const project = createDefaultProject();
    project.analysisSettings.responseSpectrum = {
      massCaseId: "mass-1",
      modeCount: 2,
      spectrumCaseId: "spec-1",
      direction: "X",
      dampingRatio: 0.05,
      targetCumulativeMassRatio: 0.9,
      spectrumPoints: [
        { period: 0, value: 1 },
        { period: 0.1, value: 1 },
        { period: 1, value: 1 },
      ],
    };

    const result = dynamicSampleResult();
    const report = buildResultPdfReport(project, result, "", "2026-06-06T00:00:00.000Z");

    const titles = report.sections.map((section) => section.title);
    expect(titles).toContain("Eigen Modes");
    expect(titles).toContain("Effective Mass Summary");
    expect(titles).toContain("Response Spectrum Conditions");
    expect(titles).toContain("SRSS Displacements");

    const eigenTable = report.sections.find((section) => section.title === "Eigen Modes")?.blocks[0];
    expect(eigenTable?.title).toBe("Eigen Modes Table");
    expect(eigenTable?.rows[0]?.[0]).toBe(1);
    expect(eigenTable?.rows[0]?.[4]).toBeCloseTo(0.05924, 4);

    const summaryTable = report.sections.find((section) => section.title === "Effective Mass Summary")?.blocks[0];
    expect(summaryTable?.rows[0]?.[0]).toBe("X");
    expect(summaryTable?.rows[0]?.[3]).toBe(2);

    const conditionsTable = report.sections.find((section) => section.title === "Response Spectrum Conditions")?.blocks[0];
    const conditionRows = Object.fromEntries(
      (conditionsTable?.rows ?? []).map((row) => [String(row[0]), row[1]]),
    );
    expect(conditionRows["Spectrum case id"]).toBe("spec-1");
    expect(conditionRows["Direction"]).toBe("X");
    expect(conditionRows["Damping ratio (h)"]).toBe(0.05);
    expect(conditionRows["Combination method"]).toBe("SRSS");
    expect(conditionRows["Spectrum point count"]).toBe("3");

    const srssTable = report.sections.find((section) => section.title === "SRSS Displacements")?.blocks[0];
    expect(srssTable?.rows[0]?.[0]).toBe("N1");
    expect(srssTable?.rows[1]?.[0]).toBe("N2");
    expect(srssTable?.rows[1]?.[1]).toBeCloseTo(0.00123, 5);
  });

  it("renders dynamic analysis sections in the printable HTML", () => {
    const project = createDefaultProject();
    project.analysisSettings.responseSpectrum = {
      massCaseId: "mass-1",
      modeCount: 2,
      spectrumCaseId: "spec-1",
      direction: "X",
      dampingRatio: 0.05,
      targetCumulativeMassRatio: 0.9,
      spectrumPoints: [
        { period: 0, value: 1 },
        { period: 0.1, value: 1 },
        { period: 1, value: 1 },
      ],
    };

    const html = buildResultPdfReportHtml(
      buildResultPdfReport(project, dynamicSampleResult(), "", "2026-06-06T00:00:00.000Z"),
    );

    expect(html).toContain("Eigen Modes");
    expect(html).toContain("Effective Mass");
    expect(html).toContain("Response Spectrum Conditions");
    expect(html).toContain("SRSS Displacements");
    expect(html).toContain("Eigen Modes Table");
    expect(html).toContain("Effective Mass Summary Table");
    expect(html).toContain("Response Spectrum Conditions Table");
    expect(html).toContain("SRSS Displacement Table");
  });

  it("does not add dynamic sections when the result is purely static", () => {
    const report = buildResultPdfReport(createDefaultProject(), sampleResult(), "LC1", "2026-06-06T00:00:00.000Z");
    const titles = report.sections.map((section) => section.title);
    expect(titles).not.toContain("Eigen Modes");
    expect(titles).not.toContain("Response Spectrum Conditions");
    expect(titles).not.toContain("SRSS Displacements");
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

function dynamicSampleResult(): AnalysisResult {
  return {
    projectId: "cantilever-eigen",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "response_spectrum",
      status: "success",
      startedAt: "2026-06-06T00:00:00.000Z",
      finishedAt: "2026-06-06T00:00:00.200Z",
      durationMs: 200,
      nodeCount: 2,
      memberCount: 1,
      loadCaseCount: 0,
      totalDof: 12,
      freeDof: 3,
      constrainedDof: 9,
      solver: "scipy_eigh",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    eigenResult: {
      massCaseId: "mass-1",
      normalization: "mass",
      totalMassByDirection: [
        { direction: "X", value: 0.05 },
        { direction: "Y", value: 0.05 },
        { direction: "Z", value: 0.05 },
      ],
      modes: [
        {
          modeNo: 1,
          eigenvalue: 28320,
          circularFrequency: 168.3,
          frequency: 26.78,
          period: 0.05924,
          modalMass: 1.0,
          participationFactors: [
            { direction: "X", value: 0.123 },
            { direction: "Y", value: 0.0 },
            { direction: "Z", value: 0.0 },
          ],
          effectiveMassRatios: [
            { direction: "X", value: 0.31 },
            { direction: "Y", value: 0.0 },
            { direction: "Z", value: 0.0 },
          ],
          effectiveMasses: [
            { direction: "X", value: 0.0155 },
            { direction: "Y", value: 0.0 },
            { direction: "Z", value: 0.0 },
          ],
          cumulativeEffectiveMassRatios: [
            { direction: "X", value: 0.31 },
            { direction: "Y", value: 0.0 },
            { direction: "Z", value: 0.0 },
          ],
          shape: [
            { nodeId: "N1", ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
            { nodeId: "N2", ux: 1, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
          ],
        },
        {
          modeNo: 2,
          eigenvalue: 175000,
          circularFrequency: 418.4,
          frequency: 66.6,
          period: 0.01502,
          modalMass: 1.0,
          participationFactors: [
            { direction: "X", value: 0.05 },
            { direction: "Y", value: 0.0 },
            { direction: "Z", value: 0.0 },
          ],
          effectiveMassRatios: [
            { direction: "X", value: 0.05 },
            { direction: "Y", value: 0.0 },
            { direction: "Z", value: 0.0 },
          ],
          cumulativeEffectiveMassRatios: [
            { direction: "X", value: 0.36 },
            { direction: "Y", value: 0.0 },
            { direction: "Z", value: 0.0 },
          ],
          shape: [
            { nodeId: "N1", ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
            { nodeId: "N2", ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
          ],
        },
      ],
    },
    responseSpectrumResult: {
      spectrumCaseId: "spec-1",
      direction: "X",
      dampingRatio: 0.05,
      combinationMethod: "SRSS",
      targetCumulativeMassRatio: 0.9,
      usedModes: [1, 2],
      modalResults: [
        {
          modeNo: 1,
          spectralAcceleration: 1.0,
          displacements: [
            { nodeId: "N2", ux: 0.00123, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
          ],
        },
      ],
      combinedResult: {
        method: "SRSS",
        displacements: [
          { nodeId: "N1", ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
          { nodeId: "N2", ux: 0.00123, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
        ],
      },
    },
    warnings: [],
    errors: [],
  };
}
