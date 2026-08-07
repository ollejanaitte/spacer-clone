import { describe, it, expect } from "vitest";
import { defaultProject } from "../src/defaultProject";
import { serializeProject, parseProject } from "../src/projectIO";

describe("JSON入出力 (projectIO)", () => {
  it("保存 → 再読込みで一致する", () => {
    const p = defaultProject();
    const text = serializeProject(p);
    const round = parseProject(text);
    expect(round).toEqual(p);
  });

  it("不正JSONを拒否", () => {
    expect(() => parseProject("{ not json")).toThrow();
  });

  it("負の寸法を含むJSONを拒否", () => {
    const p = defaultProject() as any;
    p.supports[0].pier.column.width = -5;
    const text = serializeProject(p);
    expect(() => parseProject(text)).toThrow();
  });
});
