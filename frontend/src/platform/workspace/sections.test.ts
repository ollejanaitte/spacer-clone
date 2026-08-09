import { describe, expect, it } from "vitest";
import { isWorkspaceSection, WORKSPACE_SECTIONS } from "./sections";

describe("workspace sections", () => {
  it("exposes the ordered workspace sections", () => {
    expect(WORKSPACE_SECTIONS).toEqual([
      "overview",
      "road",
      "superstructure",
      "substructure",
      "analysis",
      "main3d",
      "deliverables",
      "data",
    ]);
  });

  it("recognizes valid sections", () => {
    expect(isWorkspaceSection("overview")).toBe(true);
    expect(isWorkspaceSection("road")).toBe(true);
    expect(isWorkspaceSection("data")).toBe(true);
    expect(isWorkspaceSection("bogus")).toBe(false);
  });
});
