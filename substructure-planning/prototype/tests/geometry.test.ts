import { describe, it, expect } from "vitest";
import { defaultProject } from "../src/defaultProject";
import { buildScene, disposeScene, type SceneGraph } from "../src/geometry";
import type { Project } from "../src/model";

function idsOf(scene: SceneGraph): string[] {
  return Array.from(scene.parts.keys()).filter((k) => k !== "SUBSTRUCTURES" && k !== "ROOT");
}

describe("3Dジオメトリ生成 (geometry)", () => {
  it("正常プロジェクトからシーンが生成できる", () => {
    const scene = buildScene(defaultProject());
    expect(scene.root).toBeTruthy();
    expect(scene.parts.size).toBeGreaterThan(0);
    disposeScene(scene);
  });

  it("安定ID (P1-COLUMN-01 等) が存在", () => {
    const scene = buildScene(defaultProject());
    expect(scene.parts.has("P1-COLUMN-01")).toBe(true);
    expect(scene.parts.has("P1-CAP")).toBe(true);
    expect(scene.parts.has("P1-FOOTING")).toBe(true);
    expect(scene.parts.has("A1-BACKWALL")).toBe(true);
    expect(scene.parts.has("A1-WING-L")).toBe(true);
    expect(scene.parts.has("P1-PILE-01") || scene.parts.has("PILE-01")).toBe(true);
    expect(scene.parts.has("P1-BEARING-01")).toBe(true);
    disposeScene(scene);
  });

  it("寸法変更後の再生成でIDが維持される", () => {
    const p1 = defaultProject();
    const s1 = buildScene(p1);
    const ids1 = new Set(s1.parts.keys());
    disposeScene(s1);

    const p2 = JSON.parse(JSON.stringify(p1)) as Project;
    if (p2.supports[0].pier) p2.supports[0].pier.column.width = 3.0;
    const s2 = buildScene(p2);
    for (const id of ids1) {
      if (id !== "GROUND" && !id.includes("SUPERSTRUCTURE")) {
        expect(s2.parts.has(id), `IDが維持: ${id}`).toBe(true);
      }
    }
    disposeScene(s2);
  });

  it("斜角変更でシーン生成名は不変", () => {
    const p = defaultProject();
    p.supports[0].skewAngle = 15;
    const scene = buildScene(p);
    expect(scene.parts.has("P1-COLUMN-01")).toBe(true);
    disposeScene(scene);
  });
});