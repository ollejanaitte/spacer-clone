import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../../data/defaultProject";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import type { LinearAlignment } from "../../core/types";
import { mapToFrameModel } from "../../mapper/frameModelMapper";
import {
  attachLinerMappingToProject,
  createLinerProjectExtension,
  ensureProjectLinerTraceArray,
  migrateProjectLinerExtension,
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
  validateProjectLinerExtension,
} from "../index";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const exampleProjectPath = join(repoRoot, "examples/project.json");

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

function createIntermediate() {
  return buildIntermediateResult({
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    offsets: [-5, 0, 5],
    z: 10,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
}

function minimalLinerMetadata() {
  return {
    schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
    sourceRevision: "abc123",
    linerModelId: "gc06",
    coordinatePolicyId: "global",
    intermediateSchemaVersion: "0.2.0" as const,
  };
}

function minimalTraceEntry() {
  return {
    frameEntityId: "N_LINER_gc06_000_000",
    frameEntityType: "node" as const,
    linerModelId: "gc06",
    coordinatePolicyId: "global",
    sourceRevision: "abc123",
    gridPointId: "GP-gc06-000-000",
  };
}

describe("validateProjectLinerExtension", () => {
  it("accepts existing project fixtures without liner fields", () => {
    const defaultProject = createDefaultProject();
    expect(validateProjectLinerExtension(defaultProject)).toEqual([]);

    const exampleProject = JSON.parse(readFileSync(exampleProjectPath, "utf8"));
    expect(validateProjectLinerExtension(exampleProject)).toEqual([]);
  });

  it("accepts minimal liner metadata", () => {
    expect(
      validateProjectLinerExtension({
        liner: minimalLinerMetadata(),
      }),
    ).toEqual([]);
  });

  it("accepts minimal linerTrace entries", () => {
    expect(
      validateProjectLinerExtension({
        linerTrace: [minimalTraceEntry()],
      }),
    ).toEqual([]);
  });

  it("rejects invalid linerTrace frameEntityType", () => {
    const diagnostics = validateProjectLinerExtension({
      linerTrace: [
        {
          ...minimalTraceEntry(),
          frameEntityType: "beam",
        },
      ],
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "LINER_SCHEMA_INVALID",
        path: "/linerTrace/0/frameEntityType",
      }),
    ]);
  });

  it("rejects missing frameEntityId or sourceRevision", () => {
    const missingEntityId = validateProjectLinerExtension({
      linerTrace: [
        {
          frameEntityType: "node",
          linerModelId: "gc06",
          coordinatePolicyId: "global",
          sourceRevision: "abc123",
        },
      ],
    });
    expect(missingEntityId).toEqual([
      expect.objectContaining({
        path: "/linerTrace/0/frameEntityId",
      }),
    ]);

    const missingSourceRevision = validateProjectLinerExtension({
      linerTrace: [
        {
          frameEntityId: "N_LINER_gc06_000_000",
          frameEntityType: "node",
          linerModelId: "gc06",
          coordinatePolicyId: "global",
        },
      ],
    });
    expect(missingSourceRevision).toEqual([
      expect.objectContaining({
        path: "/linerTrace/0/sourceRevision",
      }),
    ]);
  });
});

describe("createLinerProjectExtension", () => {
  it("converts P1-3 mapper output into additive schema extension data", () => {
    const intermediate = createIntermediate();
    const mappingResult = mapToFrameModel(intermediate, {
      materialIds: ["MAT1"],
      sectionIds: ["SEC1"],
    });
    const extension = createLinerProjectExtension(intermediate, mappingResult);

    expect(extension.liner).toMatchObject({
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      sourceRevision: intermediate.sourceRevision,
      linerModelId: "gc06",
      coordinatePolicyId: "global",
      intermediateSchemaVersion: "0.2.0",
      generatedAt: intermediate.computedAt,
      source: {
        alignmentId: "alignment-1",
        gridDefinitionId: expect.any(String),
      },
    });
    expect(extension.linerTrace.length).toBeGreaterThan(0);
    expect(validateProjectLinerExtension(extension)).toEqual([]);
  });
});

describe("attachLinerMappingToProject", () => {
  it("returns a new project object with liner fields attached", () => {
    const project = createDefaultProject();
    const intermediate = createIntermediate();
    const mappingResult = mapToFrameModel(intermediate);

    const attached = attachLinerMappingToProject(project, intermediate, mappingResult);

    expect(attached).not.toBe(project);
    expect(attached.liner).toBeDefined();
    expect(attached.linerTrace?.length).toBeGreaterThan(0);
    expect(project.liner).toBeUndefined();
    expect(validateProjectLinerExtension(attached)).toEqual([]);
  });

  it("preserves existing domainDraft on project.liner when attaching mapping metadata", () => {
    const domainDraft = {
      id: "draft-preserve",
      linerModelId: "gc06",
      coordinatePolicyId: "global",
      alignment: { id: "alignment-preserve", elements: [] },
      stationDefinition: { originDisplayedStation: 0 },
      verticalAlignment: { id: "va-preserve", elements: [] },
      crossSections: [{ id: "cs-preserve", name: "Default", offsetLines: [] }],
      gridDefinitions: [],
      spans: [],
      piers: [],
      generationSettings: {},
      sampling: {
        display: { maxChordLength: 1, maxSagitta: 0.01, minSegmentsPerElement: 1 },
        dxf: { maxChordLength: 0.5, maxSagitta: 0.005, minSegmentsPerElement: 1 },
        frame: { maxMemberLength: 2, maxSagitta: 0.01, stationIntervalFallback: 1 },
      },
    };
    const project = {
      ...createDefaultProject(),
      liner: {
        ...minimalLinerMetadata(),
        draftSchemaVersion: "0.2.0" as const,
        domainDraft,
      },
    } as any;
    const attached = attachLinerMappingToProject(project, createIntermediate(), mapToFrameModel(createIntermediate()));

    expect(attached.liner?.domainDraft).toEqual(domainDraft);
    expect(attached.liner?.draftSchemaVersion).toBe("0.2.0");
  });
});

describe("migrateProjectLinerExtension", () => {
  it("leaves projects without liner fields unchanged", () => {
    const project = createDefaultProject();
    const migrated = migrateProjectLinerExtension(project);
    expect(migrated).toBe(project);
    expect(migrated.liner).toBeUndefined();
    expect(migrated.linerTrace).toBeUndefined();
  });

  it("can add an empty linerTrace array when liner metadata exists", () => {
    const project = {
      ...createDefaultProject(),
      liner: minimalLinerMetadata(),
    };
    const normalized = ensureProjectLinerTraceArray(project);
    expect(normalized.linerTrace).toEqual([]);
    expect(validateProjectLinerExtension(normalized)).toEqual([]);
  });
});
