import { describe, expect, it } from "vitest";
import { createEmptyImporterProject } from "./factory";
import { IMPORTER_SCHEMA_VERSION } from "./version";

describe("createEmptyImporterProject", () => {
  it("initializes importer project defaults", () => {
    const project = createEmptyImporterProject("My Project");

    expect(project.liner.importerSchemaVersion).toBe(IMPORTER_SCHEMA_VERSION);
    expect(project.name).toBe("My Project");
    expect(project.bridges).toEqual([]);
    expect(project.sourcePdfRefs).toEqual([]);
    expect(project.savedSnapshots).toEqual([]);
    expect(project.renderability).toMatchObject({
      crossSection: "blocked",
      planPreview: "blocked",
      export: "blocked",
    });
    expect(project.coordinateSystem.horizontal.datum).toBe("JGD2011");
    expect(project.coordinateSystem.vertical.heightDatum).toBe("T.P.");
  });
});
