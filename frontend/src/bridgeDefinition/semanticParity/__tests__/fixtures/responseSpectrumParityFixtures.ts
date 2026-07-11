import type { AnalysisResult, ResponseSpectrumResult } from "../../../../types";

function baseResponseSpectrumResult(): ResponseSpectrumResult {
  return {
    spectrumCaseId: "spec-1",
    direction: "X",
    dampingRatio: 0.05,
    combinationMethod: "CQC",
    interpolationMethod: "linear",
    targetCumulativeMassRatio: 0.9,
    usedModes: [1, 2],
    modalResults: [
      {
        modeNo: 1,
        spectralAcceleration: 1.1,
        displacements: [{ nodeId: "N1", ux: 1, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
        reactions: [{ nodeId: "N1", fx: 2, fy: 0, fz: 0, mx: 0, my: 3, mz: 4 }],
        memberSectionForces: [
          { memberId: "M1", station: 0, component: "N", value: 5 },
          { memberId: "M1", station: 1, component: "My", value: 6 },
          { memberId: "M1", station: 1, component: "Mz", value: 7 },
        ],
      },
      {
        modeNo: 2,
        spectralAcceleration: 2.2,
        displacements: [{ nodeId: "N1", ux: 2, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
        reactions: [{ nodeId: "N1", fx: 4, fy: 0, fz: 0, mx: 0, my: 6, mz: 8 }],
        memberSectionForces: [
          { memberId: "M1", station: 0, component: "N", value: 10 },
          { memberId: "M1", station: 1, component: "My", value: 12 },
          { memberId: "M1", station: 1, component: "Mz", value: 14 },
        ],
      },
    ],
    combinedResult: {
      method: "CQC",
      displacements: [{ nodeId: "N1", ux: 3, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
      reactions: [{ nodeId: "N1", fx: 6, fy: 0, fz: 0, mx: 0, my: 9, mz: 12 }],
      memberSectionForces: [
        { memberId: "M1", station: 0, component: "N", value: 15 },
        { memberId: "M1", station: 1, component: "My", value: 18 },
        { memberId: "M1", station: 1, component: "Mz", value: 21 },
      ],
    },
    directionResults: [],
  };
}

function baseResult(): AnalysisResult {
  return {
    projectId: "p",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "response_spectrum",
      status: "success",
      startedAt: "2026-07-11T00:00:00.000Z",
      finishedAt: "2026-07-11T00:00:00.000Z",
      durationMs: 0,
      nodeCount: 1,
      memberCount: 1,
      loadCaseCount: 1,
      totalDof: 6,
      freeDof: 3,
      constrainedDof: 3,
      solver: "scipy_eigh",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    responseSpectrumResult: baseResponseSpectrumResult(),
    warnings: [],
    errors: [],
  };
}

export const responseSpectrumParityFixtures = {
  left: baseResult(),
  right: baseResult(),
  permuted: {
    ...baseResult(),
    responseSpectrumResult: {
      ...baseResponseSpectrumResult(),
      modalResults: [...baseResponseSpectrumResult().modalResults].reverse(),
    },
  } as AnalysisResult,
  missing: { ...baseResult(), responseSpectrumResult: undefined } as AnalysisResult,
  failed: { ...baseResult(), analysisSummary: { ...baseResult().analysisSummary, status: "failed" } } as AnalysisResult,
  invalid: {
    ...baseResult(),
    responseSpectrumResult: {
      ...baseResponseSpectrumResult(),
      combinedResult: {
        ...baseResponseSpectrumResult().combinedResult,
        displacements: [{ nodeId: "N1", ux: Number.NaN, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
      },
    },
  } as AnalysisResult,
  zero: {
    ...baseResult(),
    responseSpectrumResult: {
      ...baseResponseSpectrumResult(),
      combinedResult: {
        ...baseResponseSpectrumResult().combinedResult,
        displacements: [{ nodeId: "N1", ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
      },
    },
  } as AnalysisResult,
} as const;
