import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  assignLabelPriority,
  cullOverlappingLabels,
  type LabelCandidate,
  type LabelPriority,
} from "./labelCollisionAvoidance";

function makeCandidate(
  x: number,
  y: number,
  z: number,
  priority: LabelPriority = "node",
  ownerId?: string,
): LabelCandidate {
  const obj = new THREE.Object3D();
  obj.position.set(x, y, z);
  return { object: obj, priority, ownerId };
}

function makeCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

describe("assignLabelPriority", () => {
  it("sets priority rank on userData", () => {
    const obj = new THREE.Object3D();
    assignLabelPriority(obj, "selected", "N1", "node");
    expect(obj.userData.labelPriority).toBe("selected");
    expect(obj.userData.labelPriorityRank).toBe(0);
    expect(obj.userData.ownerId).toBe("N1");
    expect(obj.userData.ownerType).toBe("node");
  });
});

describe("cullOverlappingLabels", () => {
  it("returns empty set when no candidates", () => {
    const hidden = cullOverlappingLabels([], makeCamera(), { width: 800, height: 600 });
    expect(hidden.size).toBe(0);
  });

  it("does not hide non-overlapping labels", () => {
    const candidates = [
      makeCandidate(-5, 0, 0, "node"),
      makeCandidate(5, 0, 0, "node"),
      makeCandidate(0, 5, 0, "node"),
    ];
    const hidden = cullOverlappingLabels(candidates, makeCamera(), { width: 800, height: 600 });
    expect(hidden.size).toBe(0);
  });

  it("hides lower priority when overlapping", () => {
    const high = makeCandidate(0, 0, 0, "selected", "N1");
    const low = makeCandidate(0.01, 0.01, 0, "member", "M1");
    const hidden = cullOverlappingLabels([high, low], makeCamera(), { width: 800, height: 600 });
    expect(hidden.has(low.object)).toBe(true);
    expect(hidden.has(high.object)).toBe(false);
  });

  it("always shows selected labels even when overlapping", () => {
    const sel1 = makeCandidate(0, 0, 0, "selected", "N1");
    const sel2 = makeCandidate(0.01, 0.01, 0, "selected", "N2");
    const hidden = cullOverlappingLabels([sel1, sel2], makeCamera(), { width: 800, height: 600 });
    expect(hidden.size).toBe(0);
  });

  it("hides labels behind camera", () => {
    const behind = makeCandidate(0, 0, 20, "node");
    const hidden = cullOverlappingLabels([behind], makeCamera(), { width: 800, height: 600 });
    expect(hidden.has(behind.object)).toBe(true);
  });

  it("forces display of selected owner even when overlapping", () => {
    const node1 = makeCandidate(0, 0, 0, "node", "N1");
    const node2 = makeCandidate(0.01, 0.01, 0, "member", "M1");
    const hidden = cullOverlappingLabels(
      [node1, node2],
      makeCamera(),
      { width: 800, height: 600 },
      "N1",
    );
    expect(hidden.has(node1.object)).toBe(false);
  });
});
