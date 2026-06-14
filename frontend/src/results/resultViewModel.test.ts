import { describe, expect, it } from "vitest";
import type { AnalysisResult, EndForce } from "../types";
import { buildResultViewModel } from "./resultViewModel";

describe("buildResultViewModel member-force diagrams", () => {
  it("normalizes connected element end forces into a continuous simple-beam moment diagram", () => {
    const result = staticResult([
      {
        loadCaseId: "LC1",
        memberId: "M1",
        coordinateSystem: "local",
        i: endForce({ mz: 0 }),
        j: endForce({ mz: 10 }),
      },
      {
        loadCaseId: "LC1",
        memberId: "M2",
        coordinateSystem: "local",
        i: endForce({ mz: -10 }),
        j: endForce({ mz: 0 }),
      },
    ]);

    const moments = buildResultViewModel(result, "LC1")?.memberForces.items.filter(
      (item) => item.component === "Mz",
    );

    expect(moments?.map((item) => item.stations.map((station) => station.value))).toEqual([
      [0, 10],
      [10, 0],
    ]);
    expect(moments?.[0].stations[1].value).toBe(moments?.[1].stations[0].value);
  });
});

describe("buildResultViewModel response spectrum view model", () => {
  it("surfaces directionResults summary with combination and interpolation methods", () => {
    const result = responseSpectrumWithDirectionResults();
    const viewModel = buildResultViewModel(result, "")?.responseSpectrum;
    expect(viewModel).not.toBeNull();
    expect(viewModel?.combinationMethod).toBe("CQC");
    expect(viewModel?.interpolationMethod).toBe("logLog");
    expect(viewModel?.directionResults).toEqual([
      {
        direction: "X",
        combinationMethod: "CQC",
        interpolationMethod: "logLog",
        usedModes: [1],
        modalResults: 1,
        combinedDisplacementCount: 1,
      },
    ]);
  });
});

describe("buildResultViewModel eigen result compatibility", () => {
  it("keeps old eigen results usable when E-1b optional fields are absent", () => {
    const viewModel = buildResultViewModel(oldEigenResult(), "")?.eigenModes;

    expect(viewModel?.totalMassX).toBeNull();
    expect(viewModel?.totalMassY).toBeNull();
    expect(viewModel?.totalMassZ).toBeNull();
    expect(viewModel?.modes[0]).toMatchObject({
      effectiveMassRatioX: 0.25,
      effectiveMassRatioY: 0,
      effectiveMassRatioZ: 0,
      effectiveMassX: null,
      effectiveMassY: null,
      effectiveMassZ: null,
      cumulativeEffectiveMassRatioX: null,
      cumulativeEffectiveMassRatioY: null,
      cumulativeEffectiveMassRatioZ: null,
    });
  });
});

function endForce(values: Partial<EndForce>): EndForce {
  return {
    fx: 0,
    fy: 0,
    fz: 0,
    mx: 0,
    my: 0,
    mz: 0,
    ...values,
  };
}

function staticResult(memberEndForces: AnalysisResult["memberEndForces"]): AnalysisResult {
  return {
    projectId: "simple-beam",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-06-06T00:00:00Z",
      finishedAt: "2026-06-06T00:00:00Z",
      durationMs: 0,
      nodeCount: 3,
      memberCount: 2,
      loadCaseCount: 1,
      totalDof: 18,
      freeDof: 7,
      constrainedDof: 11,
      solver: "scipy_sparse",
    },
    displacements: [],
    reactions: [],
    memberEndForces,
    warnings: [],
    errors: [],
  };
}

function oldEigenResult(): AnalysisResult {
  return {
    projectId: "old-eigen",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "eigen",
      status: "success",
      startedAt: "2026-06-06T00:00:00Z",
      finishedAt: "2026-06-06T00:00:00Z",
      durationMs: 0,
      nodeCount: 1,
      memberCount: 0,
      loadCaseCount: 0,
      totalDof: 6,
      freeDof: 3,
      constrainedDof: 3,
      solver: "scipy_eigh",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    eigenResult: {
      massCaseId: "mass-1",
      normalization: "mass",
      modes: [
        {
          modeNo: 1,
          eigenvalue: 4,
          circularFrequency: 2,
          frequency: 3,
          period: 4,
          modalMass: 1,
          participationFactors: [
            { direction: "X", value: 0.5 },
            { direction: "Y", value: 0 },
            { direction: "Z", value: 0 },
          ],
          effectiveMassRatios: [
            { direction: "X", value: 0.25 },
            { direction: "Y", value: 0 },
            { direction: "Z", value: 0 },
          ],
          shape: [
            {
              nodeId: "N1",
              ux: 1,
              uy: 0,
              uz: 0,
              rx: 0,
              ry: 0,
              rz: 0,
            },
          ],
        },
      ],
    },
    warnings: [],
    errors: [],
  };
}

function responseSpectrumWithDirectionResults(): AnalysisResult {
  return {
    projectId: "test-rs-dir",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "response_spectrum",
      status: "success",
      startedAt: "2026-01-01T00:00:00Z",
      finishedAt: "2026-01-01T00:00:01Z",
      durationMs: 1000,
      nodeCount: 1,
      memberCount: 0,
      loadCaseCount: 0,
      totalDof: 6,
      freeDof: 3,
      constrainedDof: 3,
      solver: "scipy_eigh",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    eigenResult: {
      massCaseId: "mass-1",
      normalization: "mass",
      modes: [
        {
          modeNo: 1,
          eigenvalue: 4,
          circularFrequency: 2,
          frequency: 3,
          period: 4,
          modalMass: 1,
          participationFactors: [
            { direction: "X", value: 0.5 },
            { direction: "Y", value: 0 },
            { direction: "Z", value: 0 },
          ],
          effectiveMassRatios: [
            { direction: "X", value: 0.25 },
            { direction: "Y", value: 0 },
            { direction: "Z", value: 0 },
          ],
          shape: [{ nodeId: "N1", ux: 1, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
        },
      ],
    },
    responseSpectrumResult: {
      spectrumCaseId: "spec-1",
      direction: "X",
      dampingRatio: 0.05,
      combinationMethod: "CQC",
      interpolationMethod: "logLog",
      targetCumulativeMassRatio: 0.9,
      usedModes: [1],
      modalResults: [
        {
          modeNo: 1,
          spectralAcceleration: 1,
          displacements: [{ nodeId: "N1", ux: 0.001, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
          reactions: [],
          memberSectionForces: [],
        },
      ],
      combinedResult: {
        method: "CQC",
        displacements: [{ nodeId: "N1", ux: 0.001, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
        reactions: [],
        memberSectionForces: [],
      },
      directionResults: [
        {
          direction: "X",
          combinationMethod: "CQC",
          interpolationMethod: "logLog",
          usedModes: [1],
          modalResults: [
            {
              modeNo: 1,
              spectralAcceleration: 1,
              displacements: [{ nodeId: "N1", ux: 0.001, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
              reactions: [],
              memberSectionForces: [],
            },
          ],
          combinedResult: {
            method: "CQC",
            displacements: [{ nodeId: "N1", ux: 0.001, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
            reactions: [],
            memberSectionForces: [],
          },
        },
      ],
    },
    warnings: [],
    errors: [],
  };
}
