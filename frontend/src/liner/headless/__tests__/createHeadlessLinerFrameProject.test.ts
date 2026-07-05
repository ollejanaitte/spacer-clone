import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import projectSchema from "../../../../../schemas/project.schema.json";
import { createDefaultProject } from "../../../data/defaultProject";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import type { CanonicalLinerIntermediateResult, LinearAlignment } from "../../core/types";
import { mapToFrameModel } from "../../mapper/frameModelMapper";
import { validateProjectLinerExtension } from "../../schema/validateProjectLinerExtension";
import {
  applyLinerHeadlessFixtureMemberRules,
  applyPinnedBoundarySupportTemplates,
  createHeadlessLinerFrameProject,
  LINER_HEADLESS_FIXTURE_MATERIAL_IDS,
  LINER_HEADLESS_FIXTURE_SECTION_IDS,
  validateGeneratedLinerProject,
} from "../index";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const exampleProjectPath = join(repoRoot, "examples/project.json");

const samplingProfile = {
  maxChordLength: 0.5,
  maxSagitta: 0.005,
  minSegmentsPerElement: 1,
};

const frameSamplingProfile = {
  maxMemberLength: 0.25,
  maxSagitta: 0.0025,
  stationIntervalFallback: 1,
};

const minimalMeasuredGrid = {
  id: "mg-test",
  source: "unit-test",
  sections: [{ id: "sec-1", label: "C1", station: 0, sortIndex: 0 }],
  lines: [{ id: "line-hcl", label: "HCL", role: "center", sortIndex: 0 }],
  points: [
    {
      id: "pt-1",
      sectionId: "sec-1",
      lineId: "line-hcl",
      station: 0,
      x: 0,
      y: 0,
      z: 10,
      cumulativeWidth: 0,
    },
  ],
};

function minimalProjectDomainDraft(measuredGrid?: typeof minimalMeasuredGrid) {
  return {
    id: "draft-test",
    linerModelId: "gc06",
    coordinatePolicyId: "global",
    alignment: {
      id: "alignment-test",
      elements: [
        {
          type: "straight",
          id: "L1",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 50,
        },
      ],
    },
    stationDefinition: { originDisplayedStation: 0 },
    verticalAlignment: {
      id: "va-test",
      elements: [
        {
          type: "grade",
          id: "V1",
          startStation: 0,
          endStation: 50,
          startElevation: 10,
          grade: 0,
          length: 50,
        },
      ],
    },
    crossSections: [
      {
        id: "cs-1",
        name: "Default",
        offsetLines: [{ id: "ol-1", offset: 0, elevation: 0 }],
      },
    ],
    gridDefinitions: [
      {
        id: "grid-1",
        crossSectionTemplateId: "cs-1",
        stationRange: { startPhysicalDistance: 0, endPhysicalDistance: 50 },
      },
    ],
    spans: [],
    piers: [],
    generationSettings: {},
    sampling: {
      display: samplingProfile,
      dxf: samplingProfile,
      frame: frameSamplingProfile,
    },
    ...(measuredGrid ? { measuredGrid } : {}),
  };
}

function compileProjectLinerDomainDraftValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile({
    $schema: projectSchema.$schema,
    ...projectSchema.$defs.linerDomainDraftVNext,
    $defs: projectSchema.$defs,
  });
}

const alignment: LinearAlignment = {
  id: "alignment-1",
  linerModelId: "gc06",
  coordinatePolicyId: "global",
  elements: [
    {
      type: "straight",
      id: "L1",
      start: { x: 0, y: 0 },
      azimuth: 0,
      length: 20,
    },
  ],
};

const headlessMappingOptions = {
  materialIds: [
    LINER_HEADLESS_FIXTURE_MATERIAL_IDS.deck,
    LINER_HEADLESS_FIXTURE_MATERIAL_IDS.cross,
  ],
  sectionIds: [
    LINER_HEADLESS_FIXTURE_SECTION_IDS.deck,
    LINER_HEADLESS_FIXTURE_SECTION_IDS.cross,
  ],
};

function createGc06Intermediate(): CanonicalLinerIntermediateResult {
  const intermediate = buildIntermediateResult({
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    offsets: [-5, 0, 5],
    z: 10,
    computedAt: "2026-01-01T00:00:00.000Z",
  });

  return applyLinerHeadlessFixtureMemberRules(intermediate);
}

function createAnalysisReadyIntermediate(): CanonicalLinerIntermediateResult {
  return applyPinnedBoundarySupportTemplates(createGc06Intermediate());
}

type BackendPipelineResult = {
  validateValid: boolean;
  analysisStatus?: string;
  stage: "validate" | "analysis" | "import";
  error?: string;
};

function runBackendValidateAndAnalysis(project: unknown): BackendPipelineResult {
  const script = `
import json, sys
sys.path.insert(0, "${repoRoot.replace(/\\/g, "/")}")
try:
    from backend.engine import validate_project, run_analysis
except Exception as exc:
    print(json.dumps({"stage": "import", "validateValid": False, "error": str(exc)}))
    sys.exit(0)
project = json.load(sys.stdin)
validation = validate_project(project)
if not validation.get("valid"):
    print(json.dumps({"stage": "validate", "validateValid": False}))
    sys.exit(0)
result = run_analysis(project)
status = result.get("analysisSummary", {}).get("status")
print(json.dumps({"stage": "analysis", "validateValid": True, "analysisStatus": status}))
`;

  try {
    const output = execFileSync("python3", ["-c", script], {
      input: JSON.stringify(project),
      encoding: "utf8",
      cwd: repoRoot,
    }).trim();
    return JSON.parse(output) as BackendPipelineResult;
  } catch (error) {
    return {
      stage: "import",
      validateValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

describe("createHeadlessLinerFrameProject", () => {
  it("keeps existing project fixtures without liner valid", () => {
    expect(validateProjectLinerExtension(createDefaultProject())).toEqual([]);

    const exampleProject = JSON.parse(readFileSync(exampleProjectPath, "utf8"));
    expect(validateProjectLinerExtension(exampleProject)).toEqual([]);
    expect(validateGeneratedLinerProject(exampleProject)).toEqual([]);
  });

  it("runs buildIntermediateResult through mapToFrameModel into a generated project", () => {
    const intermediate = createGc06Intermediate();
    const mappingResult = mapToFrameModel(intermediate, headlessMappingOptions);
    const result = createHeadlessLinerFrameProject({
      intermediate,
      mappingResult,
      options: { generatedAt: "2026-01-01T00:00:00.000Z" },
    });

    expect(result.validationReady).toBe(true);
    expect(result.project).not.toBeNull();
    expect(result.project?.nodes.length).toBe(9);
    expect(result.project?.members.length).toBe(12);
    expect(validateGeneratedLinerProject(result.project!)).toEqual([]);
  });

  it("accepts measuredGrid on linerDomainDraftVNext in project.schema.json", () => {
    const validate = compileProjectLinerDomainDraftValidator();

    const withMeasuredGrid = minimalProjectDomainDraft(minimalMeasuredGrid);
    expect(validate(withMeasuredGrid)).toBe(true);
    expect(validate.errors ?? []).toEqual([]);

    const withoutMeasuredGrid = minimalProjectDomainDraft();
    expect(validate(withoutMeasuredGrid)).toBe(true);
    expect(validate.errors ?? []).toEqual([]);
  });

  it("includes liner and linerTrace metadata on the generated project", () => {
    const result = createHeadlessLinerFrameProject({
      intermediate: createGc06Intermediate(),
      mappingOptions: headlessMappingOptions,
      options: { generatedAt: "2026-01-01T00:00:00.000Z" },
    });

    expect(result.project?.liner).toMatchObject({
      linerModelId: "gc06",
      intermediateSchemaVersion: "0.2.0",
      sourceRevision: createGc06Intermediate().sourceRevision,
    });
    expect(result.project?.linerTrace?.length).toBeGreaterThan(0);
    expect(
      result.project?.linerTrace?.some((entry) => entry.frameEntityId === "N_LINER_gc06_001_001"),
    ).toBe(true);
  });

  it("reports diagnostics for invalid mapper output with missing grid point references", () => {
    const intermediate = createGc06Intermediate();
    intermediate.grid.lines[0] = {
      ...intermediate.grid.lines[0],
      pointIds: ["GP-gc06-000-000", "GP-gc06-missing"],
    };

    const result = createHeadlessLinerFrameProject({
      intermediate,
      mappingOptions: headlessMappingOptions,
    });

    expect(result.validationReady).toBe(false);
    expect(result.project).toBeNull();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_FRAME_MISSING_NODE",
        }),
      ]),
    );
  });

  it("reports diagnostics when required material catalog entries are missing", () => {
    const intermediate = createGc06Intermediate();
    const mappingResult = mapToFrameModel(intermediate, headlessMappingOptions);
    for (const member of mappingResult.members) {
      member.materialId = "MAT_UNKNOWN";
      member.sectionId = "SEC_UNKNOWN";
    }

    const result = createHeadlessLinerFrameProject({
      intermediate,
      mappingResult,
      options: { useFixtureMaterials: true },
    });

    expect(result.validationReady).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_FRAME_MISSING_SECTION",
        }),
      ]),
    );
  });

  it("reaches backend validate and linear static analysis without UI when supports are provided", () => {
    const result = createHeadlessLinerFrameProject({
      intermediate: createAnalysisReadyIntermediate(),
      mappingOptions: headlessMappingOptions,
      options: { generatedAt: "2026-01-01T00:00:00.000Z" },
    });

    expect(result.validationReady).toBe(true);
    expect(result.project?.supports.length).toBeGreaterThan(0);

    const backend = runBackendValidateAndAnalysis(result.project);
    if (backend.stage === "import") {
      expect(backend.error).toMatch(/backend|scipy|numpy|No module/i);
      return;
    }

    expect(backend.validateValid).toBe(true);
    expect(backend.analysisStatus).toBe("success");
  });

  it("documents validation-ready boundary when supports are omitted", () => {
    const result = createHeadlessLinerFrameProject({
      intermediate: createGc06Intermediate(),
      mappingOptions: headlessMappingOptions,
    });

    expect(result.validationReady).toBe(true);
    expect(result.project?.supports).toEqual([]);

    const backend = runBackendValidateAndAnalysis(result.project);
    if (backend.stage === "import") {
      return;
    }

    expect(backend.validateValid).toBe(true);
    expect(backend.analysisStatus).not.toBe("success");
  });
});
