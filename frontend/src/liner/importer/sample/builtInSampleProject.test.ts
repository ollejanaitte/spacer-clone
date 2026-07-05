import { describe, expect, it } from "vitest";
import {
  BUILT_IN_SAMPLE_ALIGNMENT_LENGTH,
  buildBuiltInSampleProject,
} from "./builtInSampleDataset";
import {
  BUILT_IN_SAMPLE_BRIDGE_NAME,
  BUILT_IN_SAMPLE_PDF_FILENAME,
  BUILT_IN_SAMPLE_PROJECT_NAME,
} from "./builtInSampleConstants";
import { validateImporterProjectSchema } from "../storage/validateImporterProject";
import { importProjectJson, exportProjectJson } from "../storage/jsonImportExport";
import { IMPORTER_SCHEMA_VERSION } from "../version";
import { convertImporterToPhase35Draft } from "../export/ImporterToPhase35Adapter";
import { POST_CONDITION_CODES } from "../export/normalize/postConditions";
import { validateBridge } from "../diagnostics/validateImporter";
import {
  IMPORTER_AZIMUTH_JUMP,
  IMPORTER_CUM_DISTANCE_CHAIN_INVALID,
} from "../diagnostics/diagnosticCodes";

describe("buildBuiltInSampleProject", () => {
  it("builds a schema-valid sample project from the 001 PDF dataset", () => {
    const project = buildBuiltInSampleProject();

    expect(project.liner.importerSchemaVersion).toBe(IMPORTER_SCHEMA_VERSION);
    expect(project.name).toBe(BUILT_IN_SAMPLE_PROJECT_NAME);
    expect(project.sourcePdfRefs?.[0]?.fileName).toBe(BUILT_IN_SAMPLE_PDF_FILENAME);

    const bridge = project.bridges[0];
    expect(bridge?.name).toBe(BUILT_IN_SAMPLE_BRIDGE_NAME);
    expect(bridge?.sections).toHaveLength(25);
    expect(bridge?.girderLineSets[0]?.lines).toHaveLength(9);

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
    expect(imported.project?.bridges[0]?.sections).toHaveLength(25);
  });

  it("uses PH12 HCL local origin and PH15 cumulative distance from PDF 小座標", () => {
    const project = buildBuiltInSampleProject();
    const bridge = project.bridges[0]!;
    const ph12 = bridge.sections.find((section) => section.title === "PH12(PE10)")!;
    const ph15 = bridge.sections.find((section) => section.title === "PH15(PE13)")!;
    const ph12Hcl = ph12.points.find((point) => point.lineLabel === "HCL")!;
    const ph15Hcl = ph15.points.find((point) => point.lineLabel === "HCL")!;

    expect(ph12Hcl.x.value).toBeCloseTo(0, 4);
    expect(ph12Hcl.y.value).toBeCloseTo(0, 4);
    expect(ph12Hcl.cumulativeWidth.value).toBeCloseTo(0, 4);
    expect(ph12Hcl.cumulativeDistance.value).toBeCloseTo(0, 4);
    expect(ph15Hcl.cumulativeDistance.value).toBeCloseTo(BUILT_IN_SAMPLE_ALIGNMENT_LENGTH, 4);
    expect(bridge.alignmentMetadata?.plan?.elements[0]?.length).toBeCloseTo(
      BUILT_IN_SAMPLE_ALIGNMENT_LENGTH,
      4,
    );
  });

  it("exports PDF-derived offsets to Phase 3.5 without lineIndex fallback", () => {
    const project = buildBuiltInSampleProject();
    const result = convertImporterToPhase35Draft(project);
    expect(result.draft).not.toBeNull();

    const offsets = result.draft!.crossSections[0]!.offsetLines.map((line) => line.offset);
    expect(offsets).toContain(7.5707);
    expect(offsets).toContain(-11.9577);
    expect(offsets).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);

    const endCoverageWarnings = result.diagnostics.filter(
      (diagnostic) => diagnostic.code === POST_CONDITION_CODES.PROFILE_END_COVERAGE_GAP,
    );
    expect(endCoverageWarnings).toHaveLength(0);
  });

  it("does not emit cumulative distance chain warnings", () => {
    const project = buildBuiltInSampleProject();
    const diagnostics = validateBridge(project.bridges[0]!);
    expect(
      diagnostics.filter((entry) => entry.code === IMPORTER_CUM_DISTANCE_CHAIN_INVALID),
    ).toEqual([]);
  });

  it("still reports azimuth jumps from PDF-derived section bearings (known limitation)", () => {
    const project = buildBuiltInSampleProject();
    const diagnostics = validateBridge(project.bridges[0]!);
    const azimuthJumps = diagnostics.filter((entry) => entry.code === IMPORTER_AZIMUTH_JUMP);
    expect(azimuthJumps).toHaveLength(2);
    expect(azimuthJumps.map((entry) => entry.message)).toEqual([
      "方位角急変: Page 53 → 54 (18.888°)",
      "方位角急変: Page 71 → 72 (22.388°)",
    ]);
  });
});
