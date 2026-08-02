// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";
import { buildApolloVisualizationModelOrThrow } from "../visualization";
import {
  downloadApolloBinaryStlBundle,
  exportApolloBinaryStl,
  parseBinaryStl,
  validateApolloBinaryStlTriangles,
} from "../export";
import { fillContinuousBridgeStructureInput } from "../testing/bridgeStructureFixtures";

describe("Apollo binary STL export", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("exports a valid binary STL with consistent byte length and non-zero triangles", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const result = exportApolloBinaryStl(model);
    const parsed = parseBinaryStl(result.bytes);

    expect(result.bytes.byteLength).toBe(84 + parsed.triangleCount * 50);
    expect(result.bytes.slice(0, 80)).toHaveLength(80);
    expect(parsed.triangleCount).toBeGreaterThan(0);
    expect(validateApolloBinaryStlTriangles(parsed.triangles)).toEqual({
      invalidCoordinateCount: 0,
      zeroAreaCount: 0,
    });
  });

  it("converts Apollo model coordinates from meters to millimeters with the frozen axis convention", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const result = exportApolloBinaryStl(model);

    expect(result.boundingBoxMm.min[0]).toBeCloseTo(-300, 0);
    expect(result.boundingBoxMm.max[0]).toBeCloseTo(200300, 0);
    expect(result.boundingBoxMm.min[1]).toBeCloseTo(-5000, 0);
    expect(result.boundingBoxMm.max[1]).toBeCloseTo(5000, 0);
    expect(result.boundingBoxMm.min[2]).toBeCloseTo(-2000, 0);
    expect(result.boundingBoxMm.max[2]).toBeCloseTo(240, 0);
    expect(result.manifest.axisConvention).toBe("x-longitudinal-y-transverse-z-up");
    expect(result.manifest.sourceUnit).toBe("m");
    expect(result.manifest.exportUnit).toBe("mm");
  });

  it("applies origin shift in millimeters", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const base = exportApolloBinaryStl(model);
    const shifted = exportApolloBinaryStl(model, { originShiftMm: [1000, 2000, 3000] });

    expect(shifted.boundingBoxMm.min[0]).toBeCloseTo(base.boundingBoxMm.min[0] - 1000, 1);
    expect(shifted.boundingBoxMm.min[1]).toBeCloseTo(base.boundingBoxMm.min[1] - 2000, 1);
    expect(shifted.boundingBoxMm.min[2]).toBeCloseTo(base.boundingBoxMm.min[2] - 3000, 1);
    expect(shifted.manifest.originShiftMm).toEqual([1000, 2000, 3000]);
  });

  it("filters by export groups for girder-only and deck-only exports", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });

    const girders = exportApolloBinaryStl(model, {
      includedGroups: ["girders"],
      includeCrossBeams: false,
      includeBracing: false,
      includeDeck: false,
      includeBearings: false,
    });
    expect(girders.manifest.entityCounts.girders).toBeGreaterThan(0);
    expect(girders.manifest.entityCounts.deck).toBe(0);
    expect(girders.manifest.includedGroups).toEqual(["girders"]);

    const deck = exportApolloBinaryStl(model, {
      includedGroups: ["deck"],
      includeGirders: false,
      includeCrossBeams: false,
      includeBracing: false,
      includeBearings: false,
    });
    expect(deck.manifest.entityCounts.deck).toBeGreaterThan(0);
    expect(deck.manifest.entityCounts.girders).toBe(0);
    expect(deck.boundingBoxMm.max[2] - deck.boundingBoxMm.min[2]).toBeCloseTo(240, 0);
  });

  it("produces deterministic binary bytes for the same model and options", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const first = exportApolloBinaryStl(model);
    const second = exportApolloBinaryStl(model);

    expect(Array.from(first.bytes)).toEqual(Array.from(second.bytes));
    expect(first.digest).toBe(second.digest);
  });

  it("rejects empty exports", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const emptyModel = {
      ...model,
      solidGeometryParameters: [],
    };

    expect(() => exportApolloBinaryStl(emptyModel)).toThrow(/requires at least one exportable solid/i);
  });

  it("warns and skips unsupported geometry kinds when other solids remain exportable", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const invalidModel = {
      ...model,
      solidGeometryParameters: [
        ...model.solidGeometryParameters,
        ({
          ...model.solidGeometryParameters[0]!,
          id: "solid:unsupported:test",
          kind: "unsupported_kind",
        } as unknown as typeof model.solidGeometryParameters[number]),
      ],
    };

    const result = exportApolloBinaryStl(invalidModel);
    expect(result.warnings.some((warning) => warning.includes("unsupported solid kind"))).toBe(true);
  });

  it("rejects when geometry dimensions are invalid after filtering", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const invalidModel = {
      ...model,
      solidGeometryParameters: model.solidGeometryParameters
        .filter((solid) => solid.kind === "deck")
        .map((solid) => ({
          ...solid,
          dimensionsM: {
            ...solid.dimensionsM,
            thickness: 0,
          },
        })),
    };

    expect(() =>
      exportApolloBinaryStl(invalidModel, {
        includedGroups: ["deck"],
        includeGirders: false,
        includeCrossBeams: false,
        includeBracing: false,
        includeBearings: false,
      }),
    ).toThrow(/did not produce any supported geometry|requires at least one exportable solid/i);
  });

  it("reports degenerate triangles via the validation helper", () => {
    const validation = validateApolloBinaryStlTriangles([
      {
        normal: [0, 0, 1],
        vertices: [
          [0, 0, 0],
          [1, 0, 0],
          [1, 0, 0],
        ],
        attributeByteCount: 0,
      },
    ]);

    expect(validation.zeroAreaCount).toBe(1);
    expect(validation.invalidCoordinateCount).toBe(0);
  });

  it("builds a manifest with deterministic counts, bbox, and digest", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const result = exportApolloBinaryStl(model);

    expect(result.manifest.schemaVersion).toBe("1.0.0");
    expect(result.manifest.projectId).toBe(model.sourceProjectId);
    expect(result.manifest.projectName).toBe(model.sourceProjectName);
    expect(result.manifest.triangleCount).toBe(result.triangleCount);
    expect(result.manifest.boundingBoxMm).toEqual(result.boundingBoxMm);
    expect(result.manifest.digest).toBe(result.digest);
  });

  it("downloads STL and manifest blobs in the browser path", () => {
    vi.useFakeTimers();
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:apollo-stl");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const result = downloadApolloBinaryStlBundle(model);
    vi.runAllTimers();

    expect(result.stlFileName.endsWith(".stl")).toBe(true);
    expect(result.manifestFileName.endsWith(".apollo.json")).toBe(true);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);
  });

  it("exports stiffeners as girders-grouped boxes with a dedicated entity count", () => {
    let project = fillContinuousBridgeStructureInput(createDefaultProject());
    project = withBridgeStructureField(project, "stiffenerSpacing", 25);
    const regen = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;

    const model = buildApolloVisualizationModelOrThrow({ project: regen.project });
    const result = exportApolloBinaryStl(model, {
      includedGroups: ["girders"],
      includeCrossBeams: false,
      includeBracing: false,
      includeDeck: false,
      includeBearings: false,
    });
    expect(result.manifest.entityCounts.stiffeners).toBe(36);
    expect(result.manifest.entityCounts.markers).toBe(0);
    expect(validateApolloBinaryStlTriangles(parseBinaryStl(result.bytes).triangles)).toEqual({
      invalidCoordinateCount: 0,
      zeroAreaCount: 0,
    });
  });
});
