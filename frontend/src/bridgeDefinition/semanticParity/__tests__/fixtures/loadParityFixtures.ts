import type { ProjectModel } from "../../../../types";
import { project, baseMembers, baseNodes } from "./semanticParityFixtures";

function withLoads(
  overrides: Partial<ProjectModel> = {},
): ProjectModel {
  return project(baseNodes, baseMembers, {
    supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
    loadCases: [{ id: "lc-1", name: "Dead Load", type: "static" }],
    nodalLoads: [
      {
        id: "nl-1",
        loadCaseId: "lc-1",
        nodeId: "n-b",
        fx: 0,
        fy: 0,
        fz: -10,
        mx: 0,
        my: 0,
        mz: 0,
      },
    ],
    memberLoads: [
      {
        id: "ml-1",
        loadCaseId: "lc-1",
        memberId: "m-a",
        coordinateSystem: "global",
        type: "uniform",
        wx: 0,
        wy: 0,
        wz: -2,
      },
    ],
    ...overrides,
  });
}

export const equivalentLoadCasesDifferentIds = {
  left: withLoads({
    loadCases: [{ id: "case-left", name: "Dead Load", type: "static" }],
    nodalLoads: [
      {
        id: "nl-left",
        loadCaseId: "case-left",
        nodeId: "n-b",
        fx: 0,
        fy: 0,
        fz: -10,
        mx: 0,
        my: 0,
        mz: 0,
      },
    ],
    memberLoads: [
      {
        id: "ml-left",
        loadCaseId: "case-left",
        memberId: "m-a",
        coordinateSystem: "global",
        type: "uniform",
        wx: 0,
        wy: 0,
        wz: -2,
      },
    ],
  }),
  right: withLoads({
    loadCases: [{ id: "case-right", name: "Dead Load", type: "static" }],
    nodalLoads: [
      {
        id: "nl-right",
        loadCaseId: "case-right",
        nodeId: "n-b",
        fx: 0,
        fy: 0,
        fz: -10,
        mx: 0,
        my: 0,
        mz: 0,
      },
    ],
    memberLoads: [
      {
        id: "ml-right",
        loadCaseId: "case-right",
        memberId: "m-a",
        coordinateSystem: "global",
        type: "uniform",
        wx: 0,
        wy: 0,
        wz: -2,
      },
    ],
  }),
};

export const reorderedLoadArrays = {
  left: withLoads(),
  right: withLoads({
    loadCases: [{ id: "lc-1", name: "Dead Load", type: "static" }],
    nodalLoads: [
      {
        id: "nl-1",
        loadCaseId: "lc-1",
        nodeId: "n-b",
        fx: 0,
        fy: 0,
        fz: -10,
        mx: 0,
        my: 0,
        mz: 0,
      },
    ],
    memberLoads: [
      {
        id: "ml-1",
        loadCaseId: "lc-1",
        memberId: "m-a",
        coordinateSystem: "global",
        type: "uniform",
        wx: 0,
        wy: 0,
        wz: -2,
      },
    ],
  }),
};

export function nodalLoadMismatchByNodeFixture() {
  const base = withLoads();
  return {
    left: base,
    right: withLoads({
      nodalLoads: [
        {
          id: "nl-2",
          loadCaseId: "lc-1",
          nodeId: "n-c",
          fx: 0,
          fy: 0,
          fz: -10,
          mx: 0,
          my: 0,
          mz: 0,
        },
      ],
    }),
  };
}

export function nodalLoadMismatchByVectorFixture() {
  const base = withLoads();
  return {
    left: base,
    right: withLoads({
      nodalLoads: [
        {
          id: "nl-2",
          loadCaseId: "lc-1",
          nodeId: "n-b",
          fx: 0,
          fy: 0,
          fz: -12,
          mx: 0,
          my: 0,
          mz: 0,
        },
      ],
    }),
  };
}

export function memberLoadMismatchByMemberFixture() {
  const base = withLoads();
  return {
    left: base,
    right: withLoads({
      memberLoads: [
        {
          id: "ml-2",
          loadCaseId: "lc-1",
          memberId: "m-b",
          coordinateSystem: "global",
          type: "uniform",
          wx: 0,
          wy: 0,
          wz: -2,
        },
      ],
    }),
  };
}

export function memberLoadMismatchByCoordinateSystemFixture() {
  const base = withLoads();
  return {
    left: base,
    right: withLoads({
      memberLoads: [
        {
          id: "ml-2",
          loadCaseId: "lc-1",
          memberId: "m-a",
          coordinateSystem: "local",
          type: "uniform",
          wx: 0,
          wy: 0,
          wz: -2,
        },
      ],
    }),
  };
}

export function missingLoadCaseFixture() {
  const base = withLoads();
  return {
    left: base,
    right: withLoads({
      loadCases: [{ id: "lc-2", name: "Live Load", type: "static" }],
      nodalLoads: [
        {
          id: "nl-2",
          loadCaseId: "lc-2",
          nodeId: "n-b",
          fx: 0,
          fy: 0,
          fz: -10,
          mx: 0,
          my: 0,
          mz: 0,
        },
      ],
      memberLoads: [],
    }),
  };
}

export function explicitZeroVsAbsentFixture() {
  const base = withLoads();
  return {
    left: withLoads({
      nodalLoads: [
        {
          id: "nl-zero",
          loadCaseId: "lc-1",
          nodeId: "n-b",
          fx: 0,
          fy: 0,
          fz: 0,
          mx: 0,
          my: 0,
          mz: 0,
        },
      ],
      memberLoads: [],
    }),
    right: withLoads({
      nodalLoads: [],
      memberLoads: [],
    }),
  };
}

export function duplicateLoadCaseSemanticKeyFixture() {
  const base = withLoads();
  return {
    left: withLoads({
      loadCases: [
        { id: "lc-1", name: "Dead Load", type: "static" },
        { id: "lc-dup", name: "Dead Load", type: "static" },
      ],
    }),
    right: base,
  };
}

export function duplicateSemanticCandidateFixture() {
  const base = withLoads();
  return {
    left: withLoads({
      nodalLoads: [
        {
          id: "nl-1",
          loadCaseId: "lc-1",
          nodeId: "n-b",
          fx: 0,
          fy: 0,
          fz: -10,
          mx: 0,
          my: 0,
          mz: 0,
        },
        {
          id: "nl-dup",
          loadCaseId: "lc-1",
          nodeId: "n-b",
          fx: 0,
          fy: 0,
          fz: -10,
          mx: 0,
          my: 0,
          mz: 0,
        },
      ],
      memberLoads: [],
    }),
    right: withLoads({
      nodalLoads: [
        {
          id: "nl-2",
          loadCaseId: "lc-1",
          nodeId: "n-b",
          fx: 0,
          fy: 0,
          fz: -10,
          mx: 0,
          my: 0,
          mz: 0,
        },
      ],
      memberLoads: [],
    }),
  };
}

export function nearEqualLoadToleranceFixture() {
  const base = withLoads();
  const epsilon = 1e-12;
  return {
    left: base,
    right: withLoads({
      nodalLoads: [
        {
          id: "nl-2",
          loadCaseId: "lc-1",
          nodeId: "n-b",
          fx: 0,
          fy: 0,
          fz: -10 + epsilon,
          mx: 0,
          my: 0,
          mz: 0,
        },
      ],
    }),
  };
}

export function selfWeightAsNodalLoadsFixture() {
  const nodes = baseNodes;
  const members = baseMembers;
  const loadCase = { id: "sw", name: "self_weight", type: "static" as const };
  const perNode = -5;
  return {
    left: project(nodes, members, {
      supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      loadCases: [loadCase],
      nodalLoads: nodes.map((node, index) => ({
        id: `nl-left-${index}`,
        loadCaseId: "sw",
        nodeId: node.id,
        fx: 0,
        fy: 0,
        fz: perNode,
        mx: 0,
        my: 0,
        mz: 0,
      })),
      memberLoads: [],
    }),
    right: project(nodes, members, {
      supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      loadCases: [{ id: "SW_CASE", name: "self_weight", type: "static" }],
      nodalLoads: nodes.map((node, index) => ({
        id: `nl-right-${index}`,
        loadCaseId: "SW_CASE",
        nodeId: node.id,
        fx: 0,
        fy: 0,
        fz: perNode,
        mx: 0,
        my: 0,
        mz: 0,
      })),
      memberLoads: [],
    }),
  };
}

export function loadsVsAbsentFixture() {
  return {
    left: withLoads(),
    right: project(baseNodes, baseMembers, {
      supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      loadCases: [],
      nodalLoads: [],
      memberLoads: [],
    }),
  };
}
