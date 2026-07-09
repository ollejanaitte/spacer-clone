import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { makeInitialBridgeProject } from "../../bridge/BridgeWizardState";
import { createBridgeDefinitionFromBridgeProject } from "../adapters/fromBridgeProject";
import { createBridgeDefinitionFromLinerBridge } from "../adapters/fromLinerBridge";
import type { LinerBridge } from "../../liner/importer/types";
import type { BridgeDefinition } from "../types";
import { BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL } from "../types";
import {
  createStructuralModelFromBridgeDefinition,
  validateBridgeDefinitionForStructuralModel,
} from "./structuralModelGenerator";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const projectSchema = JSON.parse(
  readFileSync(join(repoRoot, "schemas/project.schema.json"), "utf8"),
);

function compileProjectValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(projectSchema);
}

function createMinimalBridgeDefinition(): BridgeDefinition {
  return {
    schemaVersion: BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL,
    id: "bd-minimal",
    name: "Minimal Bridge Definition",
    source: { kind: "manual" },
    coordinatePolicy: {
      policyId: "test-policy",
      frame: "bridge-local",
      axisConvention: "x-longitudinal-y-transverse-z-up",
      units: { length: "m", angle: "deg" },
    },
    alignmentRefs: [],
    stations: [],
    spans: [
      {
        id: "span-1",
        index: 1,
        startStation: 0,
        endStation: 30,
        length: 30,
      },
    ],
    supports: [],
    superstructure: { kind: "slab_girder_grid" },
    girders: [],
    crossBeams: [],
    bearings: [],
    deck: { id: "deck-default", width: 10 },
    loads: [],
    generationSettings: {
      meshDivision: 4,
      meshDensity: "standard",
    },
    metadata: {},
  };
}

function createRichBridgeDefinition(): BridgeDefinition {
  return {
    ...createMinimalBridgeDefinition(),
    id: "bd-rich",
    name: "Rich Bridge Definition",
    stations: [
      { id: "st-0", station: 0, role: "origin" },
      { id: "st-15", station: 15, role: "pier" },
      { id: "st-30", station: 30 },
    ],
    spans: [
      {
        id: "span-1",
        index: 1,
        startStation: 0,
        endStation: 20,
        length: 20,
      },
      {
        id: "span-2",
        index: 2,
        startStation: 20,
        endStation: 45,
        length: 25,
      },
    ],
    supports: [
      {
        id: "support-start",
        station: 0,
        kind: "fixed",
        substructureKind: "abutment",
      },
      {
        id: "support-pier-1",
        station: 20,
        kind: "pinned",
        substructureKind: "pier",
      },
      {
        id: "support-end",
        station: 45,
        kind: "pinned",
        substructureKind: "abutment",
      },
    ],
    girders: [
      {
        id: "girder-g1",
        label: "G1",
        role: "main",
        offset: -3.5,
        spanIds: ["span-1", "span-2"],
        materialRefId: "mat-custom",
        sectionRefId: "sec-custom",
      },
      {
        id: "girder-g2",
        label: "G2",
        role: "main",
        offset: 3.5,
        spanIds: ["span-1", "span-2"],
        materialRefId: "mat-custom",
        sectionRefId: "sec-custom",
      },
    ],
    crossBeams: [
      { id: "cb-1", station: 10, girderIds: ["girder-g1", "girder-g2"] },
      { id: "cb-2", station: 30 },
    ],
    bearings: [
      { id: "bearing-1", supportId: "support-start", type: "fixed" },
      { id: "bearing-2", supportId: "support-pier-1", type: "elastomeric" },
    ],
    loads: [
      {
        id: "load-dl",
        caseId: "LC-DL",
        type: "distributed",
        magnitude: 10,
        direction: "-Y",
        target: { kind: "line", refId: "girder-g1" },
      },
      {
        id: "load-ll",
        caseId: "LC-LL",
        type: "vehicle",
        magnitude: 100,
        direction: "-Y",
        target: { kind: "deck", refId: "deck-default" },
        impactFactor: 0.2,
      },
      {
        id: "load-temp",
        caseId: "LC-TEMP",
        type: "temperature",
        magnitude: 1,
        direction: "X",
        target: { kind: "deck", refId: "deck-default" },
      },
    ],
    generationSettings: {
      meshDivision: 5,
      meshDensity: "fine",
      defaultMaterialId: "mat-steel",
      defaultSectionId: "sec-girder",
    },
  };
}

function createMinimalLinerBridge(): LinerBridge {
  return {
    id: "liner-bridge-minimal",
    name: "Minimal LINER Bridge",
    girderLineSets: [],
    spans: [
      {
        id: "span-1",
        name: "Span 1",
        startStation: 0,
        endStation: 30,
      },
    ],
    sections: [],
  };
}

describe("createStructuralModelFromBridgeDefinition", () => {
  const validateProject = compileProjectValidator();

  it("generates a project from a minimal BridgeDefinition", () => {
    const bridgeDefinition = createMinimalBridgeDefinition();
    const result = createStructuralModelFromBridgeDefinition(bridgeDefinition);

    expect(result.project.nodes.length).toBeGreaterThan(0);
    expect(result.project.members.length).toBeGreaterThan(0);
    expect(result.project.materials.length).toBeGreaterThan(0);
    expect(result.project.sections.length).toBeGreaterThan(0);
    expect(result.project.loadCases.length).toBeGreaterThan(0);
    expect(result.project.analysisSettings.analysisType).toBe("linear_static");
    expect(validateProject(result.project)).toBe(true);
  });

  it("does not mutate the input BridgeDefinition", () => {
    const bridgeDefinition = createRichBridgeDefinition();
    const before = structuredClone(bridgeDefinition);

    createStructuralModelFromBridgeDefinition(bridgeDefinition, {
      projectId: "proj-custom",
      generatedAt: "2026-07-10T12:00:00.000Z",
    });

    expect(bridgeDefinition).toEqual(before);
  });

  it("applies id, generatedAt, and prefix options deterministically", () => {
    const bridgeDefinition = createMinimalBridgeDefinition();
    const generatedAt = "2026-07-10T12:00:00.000Z";

    const result = createStructuralModelFromBridgeDefinition(bridgeDefinition, {
      projectId: "proj-explicit",
      projectName: "Explicit Project Name",
      generatedAt,
      defaultMaterialId: "mat-opt",
      defaultSectionId: "sec-opt",
      nodeIdPrefix: "node-",
      memberIdPrefix: "mem-",
    });

    expect(result.project.project.id).toBe("proj-explicit");
    expect(result.project.project.name).toBe("Explicit Project Name");
    expect(result.project.project.createdAt).toBe(generatedAt);
    expect(result.project.project.updatedAt).toBe(generatedAt);
    expect(result.project.nodes[0]?.id).toBe("node-1");
    expect(result.project.members[0]?.id).toBe("mem-1");
    expect(result.project.materials[0]?.id).toBe("mat-opt");
    expect(result.project.sections[0]?.id).toBe("sec-opt");
  });

  it("generates nodes, members, and supports from stations, spans, and supports", () => {
    const bridgeDefinition = createRichBridgeDefinition();
    const result = createStructuralModelFromBridgeDefinition(bridgeDefinition);

    expect(result.project.nodes.length).toBeGreaterThan(0);
    expect(result.project.members.length).toBeGreaterThan(0);
    expect(result.project.supports.length).toBe(3);
    expect(result.project.supports[0]).toMatchObject({
      ux: true,
      uy: true,
      uz: true,
    });
    expect(result.project.memberLoads.length).toBeGreaterThan(0);
    expect(result.project.nodalLoads.length).toBeGreaterThan(0);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === "BD_SM_BEARING_REFLECTED"),
    ).toBe(true);
    expect(validateProject(result.project)).toBe(true);
  });

  it("generates centerline fallback members when girders are empty", () => {
    const bridgeDefinition = createMinimalBridgeDefinition();
    const result = createStructuralModelFromBridgeDefinition(bridgeDefinition);

    expect(result.project.members.length).toBe(4);
    expect(result.project.nodes.every((node) => node.y === 0)).toBe(true);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === "BD_SM_CENTERLINE_FALLBACK"),
    ).toBe(true);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === "BD_SM_NO_GIRDERS"),
    ).toBe(true);
  });

  it("records missing information as diagnostics warnings", () => {
    const bridgeDefinition = createMinimalBridgeDefinition();
    const validationDiagnostics = validateBridgeDefinitionForStructuralModel(bridgeDefinition);

    expect(
      validationDiagnostics.some((diagnostic) => diagnostic.code === "BD_SM_NO_STATIONS"),
    ).toBe(true);
    expect(
      validationDiagnostics.some((diagnostic) => diagnostic.code === "BD_SM_NO_SUPPORTS"),
    ).toBe(true);
    expect(
      validationDiagnostics.some((diagnostic) => diagnostic.code === "BD_SM_NO_GIRDERS"),
    ).toBe(true);

    const result = createStructuralModelFromBridgeDefinition(bridgeDefinition);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.severity === "warning"),
    ).toBe(true);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === "BD_SM_COORDINATE_POLICY"),
    ).toBe(true);
  });

  it("throws when fatal validation errors are present", () => {
    const bridgeDefinition = createMinimalBridgeDefinition();
    bridgeDefinition.spans = [];

    expect(() => createStructuralModelFromBridgeDefinition(bridgeDefinition)).toThrow(
      /spans is empty/,
    );

    const invalidMesh = createMinimalBridgeDefinition();
    invalidMesh.generationSettings.meshDivision = 0;

    expect(() => createStructuralModelFromBridgeDefinition(invalidMesh)).toThrow(
      /meshDivision must be >= 1/,
    );
  });

  it("warns about unsupported temperature loads", () => {
    const bridgeDefinition = createRichBridgeDefinition();
    const validationDiagnostics = validateBridgeDefinitionForStructuralModel(bridgeDefinition);

    expect(
      validationDiagnostics.some((diagnostic) => diagnostic.code === "BD_SM_UNSUPPORTED_LOAD_TYPE"),
    ).toBe(true);

    const result = createStructuralModelFromBridgeDefinition(bridgeDefinition);
    expect(result.project.loadCases.some((loadCase) => loadCase.id === "LC-TEMP")).toBe(false);
  });

  it("generates from BridgeProject adapter output", () => {
    const bridgeProject = makeInitialBridgeProject("Wizard Sample", "wizard-bridge-1");
    const bridgeDefinition = createBridgeDefinitionFromBridgeProject(bridgeProject, {
      generatedAt: "2026-07-10T00:00:00.000Z",
    });
    const result = createStructuralModelFromBridgeDefinition(bridgeDefinition);

    expect(result.project.nodes.length).toBeGreaterThan(0);
    expect(result.project.members.length).toBeGreaterThan(0);
    expect(validateProject(result.project)).toBe(true);
  });

  it("generates from LinerBridge adapter output", () => {
    const linerBridge = createMinimalLinerBridge();
    const bridgeDefinition = createBridgeDefinitionFromLinerBridge(linerBridge, {
      generatedAt: "2026-07-10T00:00:00.000Z",
    });
    const result = createStructuralModelFromBridgeDefinition(bridgeDefinition);

    expect(result.project.nodes.length).toBeGreaterThan(0);
    expect(result.project.members.length).toBeGreaterThan(0);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === "BD_SM_CENTERLINE_FALLBACK"),
    ).toBe(true);
    expect(validateProject(result.project)).toBe(true);
  });
});
