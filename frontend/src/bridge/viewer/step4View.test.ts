// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildFemGridPoints,
  buildGridPoints,
  computeTopViewBox,
  fitTopViewToBox,
  pickNearestGridPoint,
} from "./step4View";

describe("step4View.buildGridPoints", () => {
  it("xs × ys 個の格子点を z=0 で生成する", () => {
    const xs = [0, 10, 20];
    const ys = [-3, 0, 3];
    const pts = buildGridPoints(xs, ys);
    expect(pts).toHaveLength(9);
    expect(pts[0].position).toEqual([0, -3, 0]);
    expect(pts[8].position).toEqual([20, 3, 0]);
    expect(pts.every((p) => p.source === "preview")).toBe(true);
  });

  it("z を上書きできる", () => {
    const pts = buildGridPoints([0], [0], 1.5);
    expect(pts[0].position[2]).toBe(1.5);
  });
});

describe("step4View.buildFemGridPoints", () => {
  it("fem 節点を Step4GridPoint に変換する", () => {
    const fem = [
      [0, 0, 0],
      [10, 0, 0],
      [10, 3, 0],
    ] as const;
    const pts = buildFemGridPoints(fem);
    expect(pts).toHaveLength(3);
    expect(pts[0].id).toBe("fem-0");
    expect(pts.every((p) => p.source === "fem")).toBe(true);
  });
});

describe("step4View.computeTopViewBox", () => {
  it("xs/ys 範囲を含む bbox を返す", () => {
    const box = computeTopViewBox([0, 20], [-3, 3]);
    expect(box.min.x).toBe(0);
    expect(box.max.x).toBe(20);
    expect(box.min.y).toBe(-3);
    expect(box.max.y).toBe(3);
  });

  it("空入力では ±1 のデフォルトボックス", () => {
    const box = computeTopViewBox([], []);
    expect(box.isEmpty()).toBe(false);
    expect(box.min.x).toBe(-1);
    expect(box.max.x).toBe(1);
  });
});

describe("step4View.fitTopViewToBox", () => {
  it("カメラは +Z 方向から bbox 中心を見下ろし、up は +Y", () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    const controls = { target: new THREE.Vector3(), update: () => undefined };
    const box = new THREE.Box3(
      new THREE.Vector3(0, -3, 0),
      new THREE.Vector3(30, 3, 0),
    );
    fitTopViewToBox(camera, controls, box);
    expect(camera.position.x).toBeCloseTo(15);
    expect(camera.position.y).toBeCloseTo(0);
    expect(camera.position.z).toBeGreaterThan(15);
    expect(camera.up.x).toBe(0);
    expect(camera.up.y).toBe(1);
    expect(camera.up.z).toBe(0);
    expect(controls.target.x).toBeCloseTo(15);
  });
});

describe("step4View.pickNearestGridPoint", () => {
  function setupCamera(): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    cam.position.set(15, 0, 30);
    cam.up.set(0, 1, 0);
    cam.lookAt(15, 0, 0);
    cam.updateMatrixWorld();
    return cam;
  }

  it("しきい値内のとき最も近い格子点を返す", () => {
    const camera = setupCamera();
    const pts = buildGridPoints([0, 10, 20], [-3, 0, 3]);
    const target = pts.find((p) => p.position[0] === 10 && p.position[1] === 0)!;
    const ndc = new THREE.Vector2();
    {
      const v = new THREE.Vector3(...target.position);
      v.project(camera);
      ndc.set(v.x, v.y);
    }
    const raycaster = new THREE.Raycaster();
    const picked = pickNearestGridPoint(pts, raycaster, ndc, camera, 800, 600, 30);
    expect(picked).not.toBeNull();
    expect(picked?.id).toBe(target.id);
  });

  it("しきい値外なら null を返す", () => {
    const camera = setupCamera();
    const pts = buildGridPoints([0, 10], [-3, 0]);
    const ndc = new THREE.Vector2(2, 2); // 大きく外れた NDC
    const raycaster = new THREE.Raycaster();
    const picked = pickNearestGridPoint(pts, raycaster, ndc, camera, 800, 600, 10);
    expect(picked).toBeNull();
  });
});
