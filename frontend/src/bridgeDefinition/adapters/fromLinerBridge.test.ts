import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import type { LinerBridge } from "../../liner/importer/types";
import { createSampleBridge } from "../../liner/importer/__tests__/fixtures/sampleProject";
import {
  createBridgeDefinitionFromLinerBridge,
  validateLinerBridgeForBridgeDefinition,
} from "./fromLinerBridge";
import { BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL } from "../types";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const bridgeDefinitionSchema = JSON.parse(
  readFileSync(join(repoRoot, "schemas/bridge-definition.schema.json"), "utf8"),
);

function compileBridgeDefinitionValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(bridgeDefinitionSchema);
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

function createLinerBridgeWithSubstructure(): LinerBridge {
  return {
    ...createMinimalLinerBridge(),
    id: "liner-bridge-substructure",
    name: "Substructure Bridge",
    girderLineSets: [
      {
        id: "gls-1",
        name: "Main set",
        referenceMode: "centerline-offset",
        appliesToSpanIds: ["span-1"],
        lines: [
          {
            id: "girder-g1",
            label: "G1",
            role: "girder",
            displayOrder: 0,
            nominalOffset: -5,
          },
          {
            id: "girder-g2",
            label: "G2",
            role: "center",
            displayOrder: 1,
            nominalOffset: 0,
          },
        ],
      },
    ],
    substructure: {
      supports: [
        {
          id: "support-start",
          kind: "abutment",
          station: 0,
          label: "Abutment A",
        },
        {
          id: "support-pier-1",
          kind: "pier",
          station: 15,
          skewAngleDeg: 5,
        },
        {
          id: "support-end",
          kind: "abutment",
          station: 30,
        },
      ],
      crossBeams: [
        { id: "cb-1", station: 10, label: "Cross beam 1" },
        { id: "cb-2", station: 20 },
      ],
      widthChangePoints: [
        {
          id: "wp-1",
          station: 0,
          leftOffset: 6,
          rightOffset: 6,
        },
      ],
    },
    bridgeType: "continuous",
    alignmentMetadata: {
      plan: {
        elements: [
          {
            type: "straight",
            id: "plan-1",
            start: { x: 0, y: 0 },
            azimuth: 0,
            length: 30,
          },
        ],
      },
    },
  };
}

describe("createBridgeDefinitionFromLinerBridge", () => {
  const validate = compileBridgeDefinitionValidator();

  it("creates a valid BridgeDefinition from a minimal LinerBridge", () => {
    const linerBridge = createMinimalLinerBridge();
    const result = createBridgeDefinitionFromLinerBridge(linerBridge);

    expect(result.schemaVersion).toBe(BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL);
    expect(result.id).toBe("liner-bridge-minimal");
    expect(result.name).toBe("Minimal LINER Bridge");
    expect(result.source).toEqual({
      kind: "liner",
      linerModelId: "liner-bridge-minimal",
      importerBridgeId: "liner-bridge-minimal",
    });
    expect(result.spans).toHaveLength(1);
    expect(result.spans[0]).toMatchObject({
      id: "span-1",
      index: 1,
      startStation: 0,
      endStation: 30,
      length: 30,
    });
    expect(result.supports).toEqual([]);
    expect(result.crossBeams).toEqual([]);
    expect(result.girders).toEqual([]);
    expect(result.bearings).toEqual([]);
    expect(result.loads).toEqual([]);
    expect(result.deck.width).toBeGreaterThan(0);
    expect(validate(result)).toBe(true);
  });

  it("does not mutate the input LinerBridge", () => {
    const linerBridge = createLinerBridgeWithSubstructure();
    const before = structuredClone(linerBridge);

    createBridgeDefinitionFromLinerBridge(linerBridge, {
      id: "bd-custom-id",
      name: "Custom Name",
      generatedAt: "2026-07-09T00:00:00.000Z",
    });

    expect(linerBridge).toEqual(before);
  });

  it("applies options.id, name, and generatedAt deterministically", () => {
    const linerBridge = createMinimalLinerBridge();
    const generatedAt = "2026-07-09T12:00:00.000Z";

    const result = createBridgeDefinitionFromLinerBridge(linerBridge, {
      id: "bd-explicit-id",
      name: "Explicit Bridge Name",
      generatedAt,
      coordinatePolicyId: "custom-policy",
      sourceDocumentId: "liner-project-doc-1",
    });

    expect(result.id).toBe("bd-explicit-id");
    expect(result.name).toBe("Explicit Bridge Name");
    expect(result.metadata.createdAt).toBe(generatedAt);
    expect(result.metadata.updatedAt).toBe(generatedAt);
    expect(result.coordinatePolicy.policyId).toBe("custom-policy");
    expect(result.source).toEqual({
      kind: "liner",
      linerModelId: "liner-project-doc-1",
      importerBridgeId: "liner-bridge-minimal",
    });
  });

  it("maps supports, spans, and crossBeams when present", () => {
    const linerBridge = createLinerBridgeWithSubstructure();
    const result = createBridgeDefinitionFromLinerBridge(linerBridge);

    expect(result.spans).toHaveLength(1);
    expect(result.supports).toHaveLength(3);
    expect(result.supports[1]).toMatchObject({
      id: "support-pier-1",
      station: 15,
      kind: "custom",
      substructureKind: "pier",
      skewAngleDeg: 5,
    });
    expect(result.crossBeams).toEqual([
      { id: "cb-1", station: 10 },
      { id: "cb-2", station: 20 },
    ]);
    expect(result.girders).toHaveLength(2);
    expect(result.girders[0]).toMatchObject({
      id: "girder-g1",
      role: "main",
      offset: -5,
      spanIds: ["span-1"],
    });
    expect(result.alignmentRefs).toEqual([
      {
        alignmentId: "liner-bridge-substructure-plan",
        originStation: 0,
        totalLength: 30,
      },
    ]);
    expect(result.deck.width).toBe(12);
    expect(validate(result)).toBe(true);
  });

  it("records missing information as warnings in metadata notes and empty defaults", () => {
    const linerBridge = createMinimalLinerBridge();
    const warnings = validateLinerBridgeForBridgeDefinition(linerBridge);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((warning) => warning.includes("substructure"))).toBe(true);
    expect(warnings.some((warning) => warning.includes("girderLineSets"))).toBe(true);

    const result = createBridgeDefinitionFromLinerBridge(linerBridge);
    expect(result.supports).toEqual([]);
    expect(result.crossBeams).toEqual([]);
    expect(result.girders).toEqual([]);
    expect(result.alignmentRefs).toEqual([]);
    expect(result.metadata.notes).toContain("Warnings:");
    expect(result.metadata.notes).toContain("substructure");
  });

  it("maps a richer sample bridge and passes JSON Schema validation", () => {
    const linerBridge = createSampleBridge();
    const result = createBridgeDefinitionFromLinerBridge(linerBridge, {
      sourceDocumentId: "sample-importer-project",
      generatedAt: "2026-07-09T00:00:00.000Z",
    });

    expect(result.spans.length).toBeGreaterThan(0);
    expect(result.girders.length).toBeGreaterThan(0);
    expect(result.stations.length).toBeGreaterThan(0);
    expect(validate(result)).toBe(true);
  });

  it("throws when spans are empty", () => {
    const linerBridge = createMinimalLinerBridge();
    linerBridge.spans = [];

    expect(() => createBridgeDefinitionFromLinerBridge(linerBridge)).toThrow(
      /spans must contain at least one span/,
    );
  });

  it("throws when no span has a positive length", () => {
    const linerBridge = createMinimalLinerBridge();
    linerBridge.spans = [
      {
        id: "span-invalid",
        name: "Invalid",
        startStation: 10,
        endStation: 10,
      },
    ];

    expect(() => createBridgeDefinitionFromLinerBridge(linerBridge)).toThrow(
      /no span could be mapped with a positive length/,
    );
  });
});
