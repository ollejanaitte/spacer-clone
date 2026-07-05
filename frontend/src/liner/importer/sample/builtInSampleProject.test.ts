import { describe, expect, it } from "vitest";
import { buildBuiltInSampleProject } from "./builtInSampleDataset";
import {
  BUILT_IN_SAMPLE_BRIDGE_NAME,
  BUILT_IN_SAMPLE_PDF_FILENAME,
  BUILT_IN_SAMPLE_PROJECT_NAME,
} from "./builtInSampleConstants";
import { validateImporterProjectSchema } from "../storage/validateImporterProject";
import { importProjectJson, exportProjectJson } from "../storage/jsonImportExport";
import { IMPORTER_SCHEMA_VERSION } from "../version";

describe("buildBuiltInSampleProject", () => {
  it("builds a schema-valid sample project from the 001 PDF dataset", () => {
    const project = buildBuiltInSampleProject();

    expect(project.liner.importerSchemaVersion).toBe(IMPORTER_SCHEMA_VERSION);
    expect(project.name).toBe(BUILT_IN_SAMPLE_PROJECT_NAME);
    expect(project.sourcePdfRefs?.[0]?.fileName).toBe(BUILT_IN_SAMPLE_PDF_FILENAME);

    const bridge = project.bridges[0];
    expect(bridge?.name).toBe(BUILT_IN_SAMPLE_BRIDGE_NAME);
    expect(bridge?.sections.length).toBeGreaterThanOrEqual(4);
    expect(bridge?.girderLineSets[0]?.lines.length).toBe(15);

    const section = bridge?.sections[0];
    expect(section?.title).toBe("PH12(PE10)");
    expect(section?.azimuth.value?.notation).toBe("109-58-28.3");
    expect(section?.points.some((point) => point.lineLabel === "HL1")).toBe(true);
    expect(section?.points.some((point) => point.lineLabel === "HCL")).toBe(true);

    const schemaDiagnostics = validateImporterProjectSchema(project);
    expect(schemaDiagnostics.filter((entry) => entry.level === "error")).toEqual([]);
    expect(project.renderability).toBeDefined();
  });

  it("round-trips through importer JSON import/export", () => {
    const project = buildBuiltInSampleProject();
    const imported = importProjectJson(exportProjectJson(project));

    expect(imported.ok).toBe(true);
    expect(imported.project?.name).toBe(BUILT_IN_SAMPLE_PROJECT_NAME);
    expect(imported.project?.bridges[0]?.sections.length).toBe(4);
  });
});
