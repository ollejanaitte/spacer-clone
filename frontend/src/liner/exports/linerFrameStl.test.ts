import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { buildLinerFrameStl } from "./linerFrameStl";

describe("buildLinerFrameStl", () => {
  it("exports project frame members as ASCII STL", () => {
    const stl = buildLinerFrameStl(createDefaultProject());

    expect(stl.startsWith("solid JSCAD")).toBe(true);
    expect(stl).toContain("facet normal");
    expect(stl).toContain("endsolid JSCAD");
  });

  it("returns an empty STL for projects without exportable members", () => {
    const project = { ...createDefaultProject(), members: [] };

    expect(buildLinerFrameStl(project)).toBe("solid LINER_FRAME\nendsolid LINER_FRAME\n");
  });
});
