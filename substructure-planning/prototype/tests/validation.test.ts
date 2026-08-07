import { describe, it, expect } from "vitest";
import { validateProject } from "../src/validation";
import { defaultProject } from "../src/defaultProject";
import { SCHEMA_VERSION } from "../src/model";

function clone(p: unknown): unknown {
  return JSON.parse(JSON.stringify(p));
}

describe("入力検証 (validation)", () => {
  it("正常データはエラーなし", () => {
    expect(validateProject(defaultProject())).toEqual([]);
  });

  it("負の寸法を拒否", () => {
    const p = clone(defaultProject()) as any;
    p.supports[0].pier.column.width = -1;
    const issues = validateProject(p);
    expect(issues.some((i) => i.code === "NONPOSITIVE" && i.path.includes("column.width"))).toBe(true);
  });

  it("ゼロ寸法を拒否", () => {
    const p = clone(defaultProject()) as any;
    p.supports[0].pier.footing.thickness = 0;
    const issues = validateProject(p);
    expect(issues.some((i) => i.code === "NONPOSITIVE")).toBe(true);
  });

  it("必須項目欠落を拒否", () => {
    const p = clone(defaultProject()) as any;
    delete p.supports;
    const issues = validateProject(p);
    expect(issues.some((i) => i.code === "INCOMPLETE")).toBe(true);
  });

  it("単位系不明を拒否", () => {
    const p = clone(defaultProject()) as any;
    p.unitSystem = "imperial";
    expect(validateProject(p).some((i) => i.code === "UNIT_SYSTEM")).toBe(true);
  });

  it("座標系不明を拒否", () => {
    const p = clone(defaultProject()) as any;
    p.coordinateSystem = "y-up-left-handed";
    expect(validateProject(p).some((i) => i.code === "COORDINATE_SYSTEM")).toBe(true);
  });

  it("未対応構造形式を拒否 (formType)", () => {
    const p = clone(defaultProject()) as any;
    p.supports[0].pier.formType = "two_column";
    expect(validateProject(p).some((i) => i.code === "UNSUPPORTED_FORM")).toBe(true);
  });

  it("未対応 supportType を拒否", () => {
    const p = clone(defaultProject()) as any;
    p.supports[0].supportType = "virtual_pier";
    expect(validateProject(p).some((i) => i.code === "UNSUPPORTED_FORM")).toBe(true);
  });

  it("schemaVersion 不一致を拒否", () => {
    const p = clone(defaultProject()) as any;
    p.schemaVersion = "999.0.0";
    expect(validateProject(p).some((i) => i.code === "SCHEMA_VERSION")).toBe(true);
  });
});
