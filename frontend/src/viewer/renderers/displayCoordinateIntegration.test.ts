import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDefaultProject } from "../../data/defaultProject";
import type { AnalysisResult } from "../../types";
import { defaultScales, defaultVisibility } from "../types";
import { renderDeformedShape } from "./DeformedShapeRenderer";
import { renderLoads } from "./LoadRenderer";
import { renderResultDiagrams } from "./ResultDiagramRenderer";

describe("3D display coordinate integration", () => {
  it("applies the SPACER display transform to deformed coordinates only", () => {
    const project = createDefaultProject();
    const node = project.nodes[0];
    const result = staticResult(node.id, { ux: 1, uy: 2, uz: 3 });

    const off = renderDeformedShape(project, result, "LC_DEAD", 1, "SRSS", {
      ...defaultScales,
      deformationScale: 1,
    }, "off");
    const on = renderDeformedShape(project, result, "LC_DEAD", 1, "SRSS", {
      ...defaultScales,
      deformationScale: 1,
    }, "on");

    const offNode = off.find((object): object is THREE.Mesh => object instanceof THREE.Mesh);
    const onNode = on.find((object): object is THREE.Mesh => object instanceof THREE.Mesh);
    expect(offNode?.position.toArray()).toEqual([node.x + 1, node.y + 2, node.z + 3]);
    expect(onNode?.position.toArray()).toEqual([node.x + 1, node.z + 3, node.y + 2]);
    expect(project.nodes[0]).toMatchObject(node);
    expect(result.displacements[0]).toMatchObject({ ux: 1, uy: 2, uz: 3 });
  });

  it("applies the same SPACER transform to nodal load directions", () => {
    const project = createDefaultProject();
    project.nodalLoads = [{
      id: "L1",
      loadCaseId: "LC_DEAD",
      nodeId: project.nodes[0].id,
      fx: 0,
      fy: -10,
      fz: 0,
      mx: 0,
      my: 0,
      mz: 0,
    }];

    const offArrow = renderLoads(project, "LC_DEAD", defaultScales, "off")
      .find((object): object is THREE.ArrowHelper => object instanceof THREE.ArrowHelper);
    const onArrow = renderLoads(project, "LC_DEAD", defaultScales, "on")
      .find((object): object is THREE.ArrowHelper => object instanceof THREE.ArrowHelper);

    expect(arrowDirection(offArrow).toArray()).toEqual([0, -1, 0]);
    expect(arrowDirection(onArrow).toArray()).toEqual([0, 0, -1]);
  });

  it("applies the same SPACER transform to support reaction directions", () => {
    const project = createDefaultProject();
    const nodeId = project.supports[0].nodeId;
    const result = staticResult(nodeId, { ux: 0, uy: 0, uz: 0 });
    result.reactions = [{
      loadCaseId: "LC_DEAD",
      nodeId,
      fx: 0,
      fy: 12,
      fz: 0,
      mx: 0,
      my: 0,
      mz: 0,
      constrainedDofs: ["uy"],
    }];
    const visibility = { ...defaultVisibility, reactions: true };

    const offArrow = renderResultDiagrams(
      project, result, "LC_DEAD", "SRSS", visibility, defaultScales, "off",
    ).find((object): object is THREE.ArrowHelper => object instanceof THREE.ArrowHelper);
    const onArrow = renderResultDiagrams(
      project, result, "LC_DEAD", "SRSS", visibility, defaultScales, "on",
    ).find((object): object is THREE.ArrowHelper => object instanceof THREE.ArrowHelper);

    expect(arrowDirection(offArrow).toArray()).toEqual([0, 1, 0]);
    expect(arrowDirection(onArrow).toArray()).toEqual([0, 0, 1]);
  });

  it("creates selected reaction and axial-force value labels", () => {
    const project = createDefaultProject();
    const nodeId = project.supports[0].nodeId;
    const result = staticResult(nodeId, { ux: 0, uy: 0, uz: 0 });
    result.reactions = [{
      loadCaseId: "LC_DEAD",
      nodeId,
      fx: 1,
      fy: -2,
      fz: 3,
      mx: 0,
      my: 0,
      mz: 0,
      constrainedDofs: ["ux", "uy", "uz"],
    }];
    result.memberEndForces = [{
      loadCaseId: "LC_DEAD",
      memberId: project.members[0].id,
      coordinateSystem: "local",
      i: { fx: 10, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 },
      j: { fx: 10, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 },
    }];
    const objects = renderResultDiagrams(
      project,
      result,
      "LC_DEAD",
      "SRSS",
      {
        ...defaultVisibility,
        reactionLabels: true,
        reactionLabelFx: true,
        reactionLabelFy: false,
        reactionLabelFz: true,
        axialForceLabels: true,
      },
      defaultScales,
      "on",
    );

    expect(objects.find((object) => object.userData.type === "reaction-label")?.userData.text)
      .toBe("RFX=1 kN  RFZ=3 kN");
    const axialLabels = objects.filter((object) => object.userData.type === "axial-force-label");
    expect(axialLabels).toHaveLength(2);
    expect(axialLabels.map((object) => object.userData.text)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("FX=10"),
        expect.stringContaining("FX=-10"),
      ]),
    );
  });
});

function arrowDirection(arrow: THREE.ArrowHelper | undefined): THREE.Vector3 {
  expect(arrow).toBeDefined();
  return new THREE.Vector3(0, 1, 0)
    .applyQuaternion(arrow!.quaternion)
    .round();
}

function staticResult(
  nodeId: string,
  displacement: { ux: number; uy: number; uz: number },
): AnalysisResult {
  return {
    projectId: "p",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-06-18T00:00:00Z",
      finishedAt: "2026-06-18T00:00:00Z",
      durationMs: 0,
      nodeCount: 1,
      memberCount: 0,
      loadCaseCount: 1,
      totalDof: 6,
      freeDof: 6,
      constrainedDof: 0,
      solver: "scipy_sparse",
    },
    displacements: [{
      loadCaseId: "LC_DEAD",
      nodeId,
      ...displacement,
      rx: 4,
      ry: 5,
      rz: 6,
    }],
    reactions: [],
    memberEndForces: [],
    warnings: [],
    errors: [],
  };
}
// @vitest-environment jsdom
