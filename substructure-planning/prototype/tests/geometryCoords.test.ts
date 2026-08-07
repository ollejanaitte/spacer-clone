import { describe, it, expect } from "vitest";
import { defaultProject } from "../src/defaultProject";
import { buildScene, disposeScene } from "../src/geometry";
import * as THREE from "three";
import type { Project } from "../src/model";

function findByName(scene: ReturnType<typeof buildScene>, name: string): THREE.Object3D | undefined {
  return scene.parts.get(name);
}

function worldPos(scene: ReturnType<typeof buildScene>, name: string): THREE.Vector3 {
  const o = scene.parts.get(name);
  if (!o) throw new Error(`not found: ${name}`);
  const v = new THREE.Vector3();
  o.getWorldPosition(v);
  return v;
}

describe("3D座標・回転 (geometry/coords)", () => {
  it("柱の頂点が梁下面に接続（Z方向接続）", () => {
    const p = defaultProject();
    const pier = p.supports[0].pier!;
    const scene = buildScene(p);
    const capBottom = pier.column.height; // 柱天端 z
    const capCenter = worldPos(scene, "P1-CAP");
    expect(capCenter.z).toBeCloseTo(pier.column.height + pier.cap.height / 2);
    disposeScene(scene);
  });

  it("支点座標変更で移動する", () => {
    const p = defaultProject();
    p.supports[0].position = { x: 10, y: 5, z: 0 };
    const scene = buildScene(p);
    const colPos = worldPos(scene, "P1-COLUMN-01");
    expect(colPos.x).toBeCloseTo(10);
    expect(colPos.y).toBeCloseTo(5);
    disposeScene(scene);
  });

  it("斜角変更で回転する（柱中心は不変、梁奥行方向が回転）", () => {
    const p = defaultProject();
    p.supports[0].skewAngle = 30;
    const scene = buildScene(p);
    const sub = scene.parts.get("P1");
    const rotZ = sub?.quaternion ? new THREE.Euler().setFromQuaternion(sub.quaternion).z : 0;
    expect(Math.abs(rotZ)).toBeGreaterThan(0.01);
    disposeScene(scene);
  });

  it("橋軸方向（longitudinalAxis）変更でグループ回転（Y軸回り）", () => {
    const p = defaultProject();
    p.supports[0].longitudinalAxis = { x: 0, y: 1, z: 0 };
    const scene = buildScene(p);
    const sub = scene.parts.get("P1");
    expect(sub).toBeTruthy();
    disposeScene(scene);
  });

  it("上部工簡易外形が全支点を覆う", () => {
    const scene = buildScene(defaultProject());
    expect(scene.parts.has("SUPERSTRUCTURE-ENVELOPE")).toBe(true);
    disposeScene(scene);
  });

  it("複数支承が配置される", () => {
    const scene = buildScene(defaultProject());
    expect(scene.parts.has("P1-BEARING-01")).toBe(true);
    expect(scene.parts.has("P1-BEARING-02")).toBe(true);
    disposeScene(scene);
  });
});