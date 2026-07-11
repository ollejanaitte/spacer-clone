import type { AnalysisResult, EigenModeResult } from "../../../../types";

function baseSummary(analysisType: AnalysisResult["analysisSummary"]["analysisType"], status: AnalysisResult["analysisSummary"]["status"]): AnalysisResult["analysisSummary"] {
  return {
    analysisType,
    status,
    startedAt: "2026-07-11T00:00:00.000Z",
    finishedAt: "2026-07-11T00:00:00.000Z",
    durationMs: 0,
    nodeCount: 2,
    memberCount: 1,
    loadCaseCount: 1,
    totalDof: 12,
    freeDof: 6,
    constrainedDof: 6,
    solver: analysisType === "eigen" ? "scipy_eigh" : "scipy_sparse",
  } as const;
}

function baseStaticResult(): AnalysisResult {
  const result: AnalysisResult = {
    projectId: "p",
    schemaVersion: "1.0.0",
    analysisSummary: baseSummary("linear_static", "success"),
    displacements: [
      { loadCaseId: "LC1", nodeId: "A", ux: 1, uy: 2, uz: 3, rx: 4, ry: 5, rz: 6 },
      { loadCaseId: "LC1", nodeId: "B", ux: -1, uy: -2, uz: -3, rx: -4, ry: -5, rz: -6 },
    ],
    reactions: [
      { loadCaseId: "LC1", nodeId: "A", fx: 10, fy: 20, fz: 30, mx: 40, my: 50, mz: 60, constrainedDofs: [] },
    ],
    memberEndForces: [
      { loadCaseId: "LC1", memberId: "M1", coordinateSystem: "local", i: { fx: 1, fy: 2, fz: 3, mx: 4, my: 5, mz: 6 }, j: { fx: -1, fy: -2, fz: -3, mx: -4, my: -5, mz: -6 } },
    ],
    warnings: [],
    errors: [],
  };
  return result;
}

function eigenMode(modeNo: number, sign = 1, nodeIds = ["A", "B"]): EigenModeResult {
  return {
    modeNo,
    eigenvalue: modeNo,
    circularFrequency: modeNo * 2,
    frequency: modeNo * 3,
    period: 1 / modeNo,
    modalMass: 10 * modeNo,
    participationFactors: [
      { direction: "X", value: sign * modeNo },
      { direction: "Y", value: sign * modeNo * 2 },
    ],
    effectiveMassRatios: [
      { direction: "X", value: 0.1 * modeNo },
      { direction: "Y", value: 0.2 * modeNo },
    ],
    shape: nodeIds.map((nodeId, index) => ({
      nodeId,
      ux: sign * (modeNo + index + 1),
      uy: sign * (modeNo + index + 2),
      uz: sign * (modeNo + index + 3),
      rx: sign * (modeNo * 2 + index + 4),
      ry: sign * (modeNo * 2 + index + 5),
      rz: sign * (modeNo * 2 + index + 6),
    })),
  };
}

function baseEigenResult(): AnalysisResult {
  const result: AnalysisResult = {
    projectId: "p",
    schemaVersion: "1.0.0",
    analysisSummary: baseSummary("eigen", "success"),
    displacements: [],
    reactions: [],
    memberEndForces: [],
    eigenResult: {
      massCaseId: "MASS",
      normalization: "mass",
      modes: [eigenMode(1), eigenMode(2)],
    },
    warnings: [],
    errors: [],
  };
  return result;
}

export const staticParityFixtures: { left: AnalysisResult; right: AnalysisResult; reversedMember: AnalysisResult } = {
  left: baseStaticResult(),
  right: baseStaticResult(),
  reversedMember: {
    ...baseStaticResult(),
    memberEndForces: [
      { loadCaseId: "LC1", memberId: "M1", coordinateSystem: "local", i: { fx: -1, fy: -2, fz: -3, mx: -4, my: -5, mz: -6 }, j: { fx: 1, fy: 2, fz: 3, mx: 4, my: 5, mz: 6 } },
    ],
  },
} as const;

export const eigenParityFixtures: {
  left: AnalysisResult;
  right: AnalysisResult;
  modeReversed: AnalysisResult;
  signFlipped: AnalysisResult;
  permuted: AnalysisResult;
  missingFailedInvalid: {
    missing: AnalysisResult;
    failed: AnalysisResult;
    invalid: AnalysisResult;
  };
} = {
  left: baseEigenResult(),
  right: baseEigenResult(),
  modeReversed: {
    ...baseEigenResult(),
    eigenResult: {
      massCaseId: "MASS",
      normalization: "mass",
      modes: [eigenMode(2), eigenMode(1)],
    },
  } as AnalysisResult,
  signFlipped: {
    ...baseEigenResult(),
    eigenResult: {
      massCaseId: "MASS",
      normalization: "mass",
      modes: [eigenMode(1, -1), eigenMode(2, -1)],
    },
  } as AnalysisResult,
  permuted: {
    ...baseEigenResult(),
    eigenResult: {
      massCaseId: "MASS",
      normalization: "mass",
      modes: [eigenMode(2), eigenMode(1)],
    },
  } as AnalysisResult,
  missingFailedInvalid: {
    missing: { ...baseEigenResult(), eigenResult: undefined } as AnalysisResult,
    failed: { ...baseEigenResult(), analysisSummary: baseSummary("eigen", "failed") } as AnalysisResult,
    invalid: { ...baseEigenResult(), errors: [{ code: "E", message: "e", path: null, entityType: null, entityId: null }] } as AnalysisResult,
  },
};
