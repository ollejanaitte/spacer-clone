import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import type { CanonicalLinerIntermediateResult, LinearAlignment } from "../../core/types";
import { mapToFrameModel } from "../frameModelMapper";

const alignment: LinearAlignment = {
  id: "alignment-1",
  linerModelId: "gc06",
  coordinatePolicyId: "global",
  elements: [
    {
      type: "straight",
      id: "L1",
      start: { x: 0, y: 0 },
      azimuth: 0,
      length: 20,
    },
  ],
};

function createIntermediate(): CanonicalLinerIntermediateResult {
  const intermediate = buildIntermediateResult({
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    offsets: [-5, 0, 5],
    z: 10,
    computedAt: "2026-01-01T00:00:00.000Z",
  });

  return {
    ...intermediate,
    frameHints: {
      ...intermediate.frameHints,
      defaultMemberGroupKey: "deck",
      memberGroupRules: [
        {
          key: "deck",
          match: {},
          materialId: "MAT_DECK",
          sectionId: "SEC_DECK",
        },
        {
          key: "cross",
          match: { direction: "transverse" },
          materialId: "MAT_DECK",
          sectionId: "SEC_CROSS",
        },
      ],
    },
  };
}

describe("mapToFrameModel", () => {
  it("creates deterministic nodes, members, and liner trace from canonical intermediate result", () => {
    const result = mapToFrameModel(createIntermediate(), {
      materialIds: ["MAT_DECK"],
      sectionIds: ["SEC_DECK", "SEC_CROSS"],
    });

    expect(result.diagnostics.filter((diagnostic) => diagnostic.level === "error")).toHaveLength(0);
    expect(result.nodes).toHaveLength(9);
    expect(result.members).toHaveLength(12);
    expect(result.supports).toEqual([]);
    expect(result.nodes[4]).toEqual({
      id: "N_LINER_gc06_001_001",
      x: 10,
      y: 0,
      z: 10,
      label: "L1T1",
    });
    expect(result.members[0]).toMatchObject({
      id: "M_LINER_gc06_L_000_000",
      nodeI: "N_LINER_gc06_000_000",
      nodeJ: "N_LINER_gc06_001_000",
      direction: "longitudinal",
      memberGroupKey: "deck",
      materialId: "MAT_DECK",
      sectionId: "SEC_DECK",
    });
    expect(result.members.at(-1)).toMatchObject({
      id: "M_LINER_gc06_T_002_001",
      nodeI: "N_LINER_gc06_002_001",
      nodeJ: "N_LINER_gc06_002_002",
      direction: "transverse",
      memberGroupKey: "cross",
      sectionId: "SEC_CROSS",
    });
    expect(result.linerTrace.find((entry) => entry.frameEntityId === "N_LINER_gc06_001_001")).toMatchObject({
      frameEntityType: "node",
      gridPointId: "GP-gc06-001-001",
      sourceRevision: result.linerTrace[0].sourceRevision,
      physicalDistance: 10,
      displayedStation: 10,
      offset: 0,
    });
    expect(result.linerTrace.find((entry) => entry.frameEntityId === "M_LINER_gc06_T_002_001")).toMatchObject({
      frameEntityType: "member",
      gridLineId: "GL-gc06-T-002",
      memberDirection: "transverse",
      memberGroupKey: "cross",
    });
  });

  it("maps grid_full connectivity from longitudinal and transverse grid lines", () => {
    const result = mapToFrameModel(createIntermediate());
    const longitudinalMembers = result.members.filter((member) => member.direction === "longitudinal");
    const transverseMembers = result.members.filter((member) => member.direction === "transverse");

    expect(longitudinalMembers).toHaveLength(6);
    expect(transverseMembers).toHaveLength(6);
  });

  it("reports an error when a grid line references a missing grid point", () => {
    const intermediate = createIntermediate();
    intermediate.grid.lines[0] = {
      ...intermediate.grid.lines[0],
      pointIds: ["GP-gc06-000-000", "GP-gc06-missing"],
    };

    const result = mapToFrameModel(intermediate);

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_FRAME_MISSING_NODE",
          entityType: "gridLine",
          entityId: "GL-gc06-L-000",
        }),
      ]),
    );
  });

  it("reports a warning and skips zero length members", () => {
    const intermediate = createIntermediate();
    const point = intermediate.grid.points.find((candidate) => candidate.id === "GP-gc06-001-000");
    if (!point) throw new Error("fixture point missing");
    point.x = 0;
    point.y = -5;
    point.z = 10;

    const result = mapToFrameModel(intermediate);

    expect(result.members.find((member) => member.id === "M_LINER_gc06_L_000_000")).toBeUndefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          code: "LINER_FRAME_ZERO_LENGTH_MEMBER",
          entityId: "M_LINER_gc06_L_000_000",
        }),
      ]),
    );
  });

  it("creates supports from pier support templates", () => {
    const intermediate = createIntermediate();
    intermediate.piers = [
      {
        id: "P1",
        physicalDistance: 10,
        displayedStation: 10,
        skewAngleRad: 0,
        supportLinePointIds: ["GP-gc06-001-000", "GP-gc06-001-001", "GP-gc06-001-002"],
      },
    ];
    intermediate.frameHints = {
      ...intermediate.frameHints,
      supportTemplates: [
        {
          templateId: "pier-fixed",
          pierId: "P1",
          nodeRoles: ["main_girder"],
          dof: {
            ux: true,
            uy: true,
            uz: true,
            rx: false,
            ry: false,
            rz: false,
          },
          coordinateSystem: "local_pier",
        },
      ],
    };

    const result = mapToFrameModel(intermediate);

    expect(result.supports).toEqual([
      {
        id: "S_LINER_gc06_pier-fixed_N_LINER_gc06_001_001",
        nodeId: "N_LINER_gc06_001_001",
        ux: true,
        uy: true,
        uz: true,
        rx: false,
        ry: false,
        rz: false,
        coordinateSystem: "local_pier",
        templateId: "pier-fixed",
      },
      {
        id: "S_LINER_gc06_pier-fixed_N_LINER_gc06_001_002",
        nodeId: "N_LINER_gc06_001_002",
        ux: true,
        uy: true,
        uz: true,
        rx: false,
        ry: false,
        rz: false,
        coordinateSystem: "local_pier",
        templateId: "pier-fixed",
      },
    ]);
    expect(result.linerTrace.find((entry) => entry.frameEntityId === result.supports[0].id)).toMatchObject({
      frameEntityType: "support",
      gridPointId: "GP-gc06-001-001",
      pierId: "P1",
      supportTemplateId: "pier-fixed",
    });
  });
});
