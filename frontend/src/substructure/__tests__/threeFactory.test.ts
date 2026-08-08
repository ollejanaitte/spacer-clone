// Phase C1 (M2-01) threeFactory 純粋変換テスト
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  buildScene,
  boxGeometry,
  cylinderGeometry,
  computeSceneBounds,
  transformToMatrix4,
  swapToYUp,
  solidToMesh,
} from "../viewer3d/threeFactory";
import type { SolidGroup } from "../geometryBase";

function group(
  supportId: string,
  solids: SolidGroup["solids"],
  origin: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): SolidGroup {
  return {
    supportId,
    solids,
    transform: {
      origin,
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
      zAxis: { x: 0, y: 0, z: 1 },
      skewRad: 0,
    },
  };
}

describe("swapToYUp (Z-up → Y-up)", () => {
  it("maps (x,y,z) → (x,z,y)", () => {
    expect(swapToYUp({ x: 1, y: 2, z: 3 })).toEqual(new THREE.Vector3(1, 3, 2));
  });
});

describe("solidToMesh", () => {
  it("box node → BoxGeometry with localSize and localCenter offset", () => {
    const node = {
      id: "P1-COLUMN",
      kind: "box" as const,
      localCenter: { x: 0, y: 0, z: 3 },
      localSize: { x: 1.6, y: 1.2, z: 7.0 },
      entity: "pier" as const,
      material: "pier.column",
    };
    const { mesh } = solidToMesh(node);
    expect(mesh.name).toBe("P1-COLUMN");
    expect(mesh.userData.id).toBe("P1-COLUMN");
    const g = boxGeometry(node);
    const bb = new THREE.Box3().setFromBufferAttribute(
      (g as THREE.BufferGeometry).getAttribute("position") as THREE.BufferAttribute,
    );
    expect(bb.min.y).toBeCloseTo(-0.6, 6); // y = ±width/2
    expect(bb.max.y).toBeCloseTo(0.6, 6);
    expect(bb.min.z).toBeCloseTo(3 - 3.5, 6);
    expect(bb.max.z).toBeCloseTo(3 + 3.5, 6);
  });

  it("cylinder node → cylinder geometry axis along z", () => {
    const node = {
      id: "A1-PILE-01",
      kind: "cylinder" as const,
      localCenter: { x: 0, y: 0, z: -10 },
      localSize: { x: 1.2, y: 1.2, z: 18 },
      entity: "pile" as const,
      material: "foundation.boredPile",
    };
    const { mesh } = solidToMesh(node);
    expect(mesh.name).toBe("A1-PILE-01");
    const g = cylinderGeometry(node);
    const bb = new THREE.Box3().setFromBufferAttribute(
      (g as THREE.BufferGeometry).getAttribute("position") as THREE.BufferAttribute,
    );
    // 円柱半径 0.6、高さ 18（z 軸方向）
    expect(Math.abs(bb.min.x)).toBeCloseTo(0.6, 4);
    expect(bb.min.z).toBeCloseTo(-10 - 9, 4);
    expect(bb.max.z).toBeCloseTo(-10 + 9, 4);
  });
});

describe("buildScene", () => {
  const column = {
    id: "P1-COLUMN",
    kind: "box" as const,
    localCenter: { x: 0, y: 0, z: 3 },
    localSize: { x: 1.6, y: 1.2, z: 7.0 },
    entity: "pier" as const,
    material: "pier.column",
  };
  const pile = {
    id: "P1-PILE-01",
    kind: "cylinder" as const,
    localCenter: { x: 0, y: 0, z: -10 },
    localSize: { x: 1.2, y: 1.2, z: 18 },
    entity: "pile" as const,
    material: "foundation.boredPile",
  };

  it("creates exactly one mesh per solid (no duplicate scene nodes)", () => {
    const g1 = group("P1", [column, pile]);
    const { root, meshIndex } = buildScene([g1]);
    let meshCount = 0;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) meshCount += 1;
    });
    expect(meshCount).toBe(2);
    expect(meshIndex.size).toBe(2);
    expect(meshIndex.has("P1-COLUMN")).toBe(true);
    expect(meshIndex.has("P1-PILE-01")).toBe(true);
  });

  it("support group uses transform matrix (skew/placement)", () => {
    const g = {
      supportId: "P1",
      solids: [column],
      transform: {
        origin: { x: 100, y: 50, z: 10 },
        xAxis: { x: 1, y: 0, z: 0 },
        yAxis: { x: 0, y: 1, z: 0 },
        zAxis: { x: 0, y: 0, z: 1 },
        skewRad: 0,
      },
    };
    const { root } = buildScene([g]);
    const supportGroup = root.getObjectByName("P1")!;
    const pos = new THREE.Vector3();
    supportGroup.getWorldPosition(pos);
    // Y-up 表示: origin(x,y,z) → (x,z,y) = (100, 10, 50)
    expect(pos.x).toBeCloseTo(100, 6);
    expect(pos.y).toBeCloseTo(10, 6);
    expect(pos.z).toBeCloseTo(50, 6);
  });

  it("hiddenSupportIds hides support group", () => {
    const { root } = buildScene([group("P1", [column])], {
      hiddenSupportIds: new Set(["P1"]),
    });
    const sg = root.getObjectByName("P1")!;
    expect(sg.visible).toBe(false);
  });

  it("hiddenEntities excludes matching solids", () => {
    const g1 = group("P1", [column, pile]);
    const { root } = buildScene([g1], {
      hiddenEntities: new Set(["pile"]),
    });
    let pileCount = 0;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.userData.entity === "pile") pileCount += 1;
    });
    expect(pileCount).toBe(0);
  });

  it("selected support gets emissive highlight material", () => {
    const { root } = buildScene([group("P1", [column])], {
      selectedSupportId: "P1",
    });
    let highlighted = false;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity > 0) highlighted = true;
      }
    });
    expect(highlighted).toBe(true);
  });

  it("duplicate id in two groups does not double-mesh", () => {
    // 同一 id が別グループに存在 → meshIndex は後勝ちだがシーンには両方存在
    const g1 = group("P1", [column]);
    const g2 = group("P2", [{ ...column, id: "P1-COLUMN" }]);
    const { root } = buildScene([g1, g2]);
    let count = 0;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.name === "P1-COLUMN") count += 1;
    });
    expect(count).toBe(2);
  });
});

describe("transformToMatrix4", () => {
  it("produces translation from origin in Y-up", () => {
    const m = transformToMatrix4({
      origin: { x: 10, y: 20, z: 30 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
      zAxis: { x: 0, y: 0, z: 1 },
      skewRad: 0,
    });
    const t = new THREE.Vector3();
    m.decompose(t, new THREE.Quaternion(), new THREE.Vector3());
    expect(t.x).toBeCloseTo(10, 6);
    expect(t.y).toBeCloseTo(30, 6);
    expect(t.z).toBeCloseTo(20, 6);
  });
});

describe("computeSceneBounds", () => {
  it("returns non-empty box for a single column", () => {
    const g = group("P1", [
      {
        id: "P1-COLUMN",
        kind: "box" as const,
        localCenter: { x: 0, y: 0, z: 3 },
        localSize: { x: 1.6, y: 1.2, z: 7.0 },
        entity: "pier" as const,
        material: "pier.column",
      },
    ]);
    const box = computeSceneBounds([g]);
    expect(box.isEmpty()).toBe(false);
    expect(box.min.y).toBeLessThan(box.max.y);
  });
});
