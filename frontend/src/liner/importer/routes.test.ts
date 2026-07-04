import { describe, expect, it } from "vitest";
import {
  matchImporterRoute,
  resolveImporterExportRoutePath,
  resolveImporterSectionEditRoutePath,
  resolveImporterSectionListRoutePath,
} from "./routes";

describe("importer routes", () => {
  it("matches section list, editor, and export routes", () => {
    expect(matchImporterRoute("/pro/importer/p1/sections/b1")).toEqual({
      kind: "sectionList",
      projectId: "p1",
      bridgeId: "b1",
    });

    expect(matchImporterRoute("/pro/importer/p1/section-edit/b1/s1")).toEqual({
      kind: "sectionEdit",
      projectId: "p1",
      bridgeId: "b1",
      sectionId: "s1",
    });

    expect(resolveImporterSectionListRoutePath("p1", "b1")).toBe(
      "/pro/importer/p1/sections/b1",
    );
    expect(resolveImporterSectionEditRoutePath("p1", "b1", "s1")).toBe(
      "/pro/importer/p1/section-edit/b1/s1",
    );
    expect(resolveImporterExportRoutePath("p1", "b1")).toBe(
      "/pro/importer/p1/export/b1",
    );
  });
});
