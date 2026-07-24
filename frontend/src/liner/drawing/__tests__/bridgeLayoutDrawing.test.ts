import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import type { CanonicalLinerIntermediateResult, LinearAlignment } from "../../core/types";
import {
  appendBridgeLayoutGeometry,
  appendBridgeLayoutModelAnnotations,
  bridgeLayoutBandRowLabels,
  bridgeLayoutGeometryPoints,
  hasBridgeLayout,
  sampleAlignmentAt,
} from "../builders/bridgeLayoutDrawing";
import { createEmptyDrawingLayer } from "../model/document";
import {
  createCrossSectionDrawingBuilder,
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
  createProfileDrawingBuilder,
} from "../builders/formalBuilders";
import { exportFormalDrawingDxf } from "../../dxf";
import { mapDrawingDocumentToDxf } from "../../dxf/mapper/mapDrawingDocumentToDxf";
import { buildPlanDrawingDocumentFromDraft } from "../../exports/formalDrawingFromDraft";

const bridgeAlignment: LinearAlignment = {
  id: "alignment-bridge",
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

function buildBridgeDraft() {
  return {
    alignment: bridgeAlignment,
    stationDefinition: {
      originDisplayedStation: 0,
      explicitStations: [0, 10, 20],
    },
    offsets: [-5, 0, 5],
    z: 10,
    crossSections: [
      {
        id: "CS-bridge",
        name: "Bridge",
        offsetLines: [
          { id: "OL-l", offset: -5, elevation: 0, role: "edge" as const },
          { id: "OL-c", offset: 0, elevation: 0, role: "lane" as const },
          { id: "OL-r", offset: 5, elevation: 0, role: "edge" as const },
        ],
      },
    ],
    verticalAlignment: {
      id: "VA-bridge",
      elements: [
        {
          type: "grade" as const,
          id: "VG-1",
          startStation: 0,
          endStation: 20,
          startElevation: 10,
          grade: 0,
          length: 20,
        },
      ],
    },
    crossSlopeIntervals: [
      {
        id: "CF-flat",
        startPhysicalDistance: 0,
        endPhysicalDistance: 20,
        mode: "flat" as const,
        leftSlopePercent: 0,
        rightSlopePercent: 0,
      },
    ],
    spans: [
      {
        id: "SP-1",
        startPhysicalDistance: 0,
        endPhysicalDistance: 20,
        pierIdStart: "P0",
        pierIdEnd: "P1",
      },
    ],
    piers: [
      { id: "P0", physicalDistance: 0, kind: "abutment" as const, skewAngleRad: 0 },
      {
        id: "P1",
        physicalDistance: 20,
        kind: "abutment" as const,
        skewAngleRad: Math.PI / 6,
      },
    ],
    computedAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildBridgeIntermediate() {
  return buildIntermediateResult(buildBridgeDraft());
}

function withBridgeSources(
  result: CanonicalLinerIntermediateResult,
  bridgeSources: Partial<Pick<CanonicalLinerIntermediateResult, "spans" | "piers" | "grid">>,
): CanonicalLinerIntermediateResult {
  return {
    ...result,
    ...bridgeSources,
  };
}

function collectPrimitiveIds(result: CanonicalLinerIntermediateResult): string[] {
  const layer = createEmptyDrawingLayer("test-layer");
  appendBridgeLayoutGeometry(layer, result);
  return layer.primitives.map((primitive) => primitive.id);
}

function expectNoDuplicateValues(values: readonly string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe("bridgeLayoutDrawing", () => {
  const result = buildBridgeIntermediate();

  it("emits nothing when Road result has no spans and no piers", () => {
    const emptyBridge = withBridgeSources(result, { spans: [], piers: [] });
    const layer = createEmptyDrawingLayer("test-layer");

    appendBridgeLayoutGeometry(layer, emptyBridge);

    expect(hasBridgeLayout(emptyBridge)).toBe(false);
    expect(layer.primitives).toHaveLength(0);
    expect(bridgeLayoutGeometryPoints(emptyBridge)).toEqual([]);
  });

  it("detects bridge layout from intermediate spans and piers", () => {
    expect(hasBridgeLayout(result)).toBe(true);
    expect(result.spans).toHaveLength(1);
    expect(result.piers).toHaveLength(2);
  });

  it("samples alignment with azimuth at pier stations", () => {
    const sample = sampleAlignmentAt(result, 10);
    expect(sample).not.toBeNull();
    expect(sample?.azimuth).toBeCloseTo(0, 6);
    expect(sample?.x).toBeCloseTo(10, 6);
  });

  it("emits one source-backed pier support line, center tick, label, and skew annotation", () => {
    const onePier = withBridgeSources(result, { spans: [], piers: [result.piers[0]!] });
    const geometryLayer = createEmptyDrawingLayer("test-geometry");
    const annotationLayer = createEmptyDrawingLayer("test-annotations");

    appendBridgeLayoutGeometry(geometryLayer, onePier);
    appendBridgeLayoutModelAnnotations(annotationLayer, onePier);

    expect(geometryLayer.primitives.map((primitive) => primitive.id)).toEqual([
      "plan-pier-support-P0",
      "plan-pier-center-tick-P0",
    ]);
    expect(annotationLayer.primitives.map((primitive) => primitive.id)).toEqual([
      "plan-pier-label-P0",
      "plan-pier-skew-P0",
    ]);
  });

  it("emits deterministic pier support lines and span dimension primitives", () => {
    const layer = createEmptyDrawingLayer("test-layer");
    appendBridgeLayoutGeometry(layer, result);
    const primitiveIds = layer.primitives.map((primitive) => primitive.id).sort();
    expect(primitiveIds).toEqual([
      "plan-pier-center-tick-P0",
      "plan-pier-center-tick-P1",
      "plan-pier-support-P0",
      "plan-pier-support-P1",
      "plan-span-dimension-SP-1",
      "plan-span-dimension-tick-SP-1-end",
      "plan-span-dimension-tick-SP-1-start",
    ]);
    expect(bridgeLayoutGeometryPoints(result).length).toBeGreaterThan(4);
  });

  it("sorts multiple piers and spans by source distance and stable id", () => {
    const multiSpan = withBridgeSources(result, {
      piers: [result.piers[1]!, result.piers[0]!],
      spans: [
        {
          ...result.spans[0]!,
          id: "SP-2",
          startPhysicalDistance: 10,
          endPhysicalDistance: 20,
        },
        {
          ...result.spans[0]!,
          id: "SP-1",
          startPhysicalDistance: 0,
          endPhysicalDistance: 10,
        },
      ],
    });

    expect(collectPrimitiveIds(multiSpan)).toEqual([
      "plan-pier-support-P0",
      "plan-pier-center-tick-P0",
      "plan-pier-support-P1",
      "plan-pier-center-tick-P1",
      "plan-span-dimension-SP-1",
      "plan-span-dimension-tick-SP-1-start",
      "plan-span-dimension-tick-SP-1-end",
      "plan-span-dimension-SP-2",
      "plan-span-dimension-tick-SP-2-start",
      "plan-span-dimension-tick-SP-2-end",
    ]);
  });

  it("fails closed for missing support points and invalid support point references", () => {
    const onePier = result.piers[0]!;
    const missingSupport = withBridgeSources(result, {
      spans: [],
      piers: [{ ...onePier, supportLinePointIds: [] }],
    });
    const invalidSupportReference = withBridgeSources(result, {
      spans: [],
      piers: [{ ...onePier, supportLinePointIds: [onePier.supportLinePointIds[0]!, "missing-point"] }],
    });

    expect(collectPrimitiveIds(missingSupport)).toEqual(["plan-pier-center-tick-P0"]);
    expect(collectPrimitiveIds(invalidSupportReference)).toEqual(["plan-pier-center-tick-P0"]);
  });

  it("fails closed for missing skew while keeping non-skew pier markers source-backed", () => {
    const skewMissing = withBridgeSources(result, {
      spans: [],
      piers: [{ ...result.piers[0]!, skewAngleRad: undefined as unknown as number }],
    });
    const geometryLayer = createEmptyDrawingLayer("test-geometry");
    const annotationLayer = createEmptyDrawingLayer("test-annotations");

    appendBridgeLayoutGeometry(geometryLayer, skewMissing);
    appendBridgeLayoutModelAnnotations(annotationLayer, skewMissing);

    expect(geometryLayer.primitives.map((primitive) => primitive.id)).toEqual([
      "plan-pier-center-tick-P0",
    ]);
    expect(annotationLayer.primitives.map((primitive) => primitive.id)).toEqual([
      "plan-pier-label-P0",
    ]);
  });

  it("skips invalid spans and prevents duplicate marker ids", () => {
    const duplicated = withBridgeSources(result, {
      piers: [result.piers[0]!, { ...result.piers[0]! }, result.piers[1]!],
      spans: [
        result.spans[0]!,
        { ...result.spans[0]! },
        {
          ...result.spans[0]!,
          id: "SP-zero",
          endPhysicalDistance: result.spans[0]!.startPhysicalDistance,
        },
      ],
    });
    const ids = collectPrimitiveIds(duplicated);

    expect(ids).not.toContain("plan-span-dimension-SP-zero");
    expectNoDuplicateValues(ids);
    expect(ids).toEqual([
      "plan-pier-support-P0",
      "plan-pier-center-tick-P0",
      "plan-pier-support-P1",
      "plan-pier-center-tick-P1",
      "plan-span-dimension-SP-1",
      "plan-span-dimension-tick-SP-1-start",
      "plan-span-dimension-tick-SP-1-end",
    ]);
  });

  it("exposes bridge layout band row labels in Japanese", () => {
    expect(bridgeLayoutBandRowLabels()).toEqual(["支承", "スパン", "交角"]);
  });
});

describe("formalBuilders bridge layout integration", () => {
  const result = buildBridgeIntermediate();
  const settings = createDrawingSettingsFromDraft(result, undefined);

  it("adds pier, span, and skew annotations to plan geometry and band viewports", () => {
    const output = createPlanDrawingBuilder().build({ result, settings });
    const planViewport = output.sheet.viewports[0]!;
    const bandViewport = output.sheet.viewports[1]!;
    const planPrimitiveIds = planViewport.layers
      .flatMap((layer) => layer.primitives)
      .map((primitive) => primitive.id);

    expect(planPrimitiveIds).toContain("plan-pier-support-P0");
    expect(planPrimitiveIds).toContain("plan-span-dimension-SP-1");
    expect(
      planPrimitiveIds.some((id) => id.startsWith("plan-pier-label-") || id.startsWith("plan-pier-skew-")),
    ).toBe(true);
    expect(planPrimitiveIds).toContain("plan-span-label-SP-1");

    const bandTexts = bandViewport.layers
      .flatMap((layer) => layer.primitives)
      .filter((primitive) => primitive.kind === "text")
      .map((primitive) => (primitive.kind === "text" ? primitive.value : ""));
    expect(bandTexts).toContain("支承");
    expect(bandTexts).toContain("スパン");
    expect(bandTexts).toContain("交角");
    expect(bandTexts).toContain("P0");
    expect(bandTexts).toContain("30.0");
  });

  it("keeps bridge layout in the formal plan layer without changing profile or cross-section surfaces", () => {
    const planOutput = createPlanDrawingBuilder().build({
      result: { ...result, structuralModel: { nodes: [] } } as CanonicalLinerIntermediateResult,
      settings,
    });
    const profileOutput = createProfileDrawingBuilder().build({ result, settings });
    const crossSectionOutput = createCrossSectionDrawingBuilder(result.sections[0]?.physicalDistance).build({
      result,
      settings,
    });
    const planPrimitiveIds = planOutput.sheet.viewports[0]!.layers
      .flatMap((layer) => layer.primitives)
      .map((primitive) => primitive.id);
    const profilePrimitiveIds = profileOutput.sheet.viewports[0]!.layers
      .flatMap((layer) => layer.primitives)
      .map((primitive) => primitive.id);
    const crossSectionPrimitiveIds = crossSectionOutput.sheet.viewports[0]!.layers
      .flatMap((layer) => layer.primitives)
      .map((primitive) => primitive.id);

    expect(planOutput.sheet.viewports[0]!.layers.map((layer) => layer.id)).toContain("plan-bridge-layer");
    expect(planPrimitiveIds.some((id) => id.startsWith("plan-station-text-"))).toBe(true);
    expect(planPrimitiveIds).toContain("plan-north");
    expect(planPrimitiveIds.some((id) => id.startsWith("plan-line-spacing-dimension-"))).toBe(true);
    expect(profilePrimitiveIds.some((id) => id.startsWith("plan-pier-") || id.startsWith("plan-span-"))).toBe(false);
    expect(crossSectionPrimitiveIds.some((id) => id.startsWith("plan-pier-") || id.startsWith("plan-span-"))).toBe(
      false,
    );
  });

  it("keeps bridge layout primitives on the formal DrawingDocument export path", () => {
    const document = buildPlanDrawingDocumentFromDraft(buildBridgeDraft());
    const primitiveIds = document.sheets[0]?.viewports[0]?.layers
      .flatMap((layer) => layer.primitives)
      .map((primitive) => primitive.id);
    expect(primitiveIds).toContain("plan-pier-support-P0");
    expect(primitiveIds).toContain("plan-span-label-SP-1");
    expect(exportFormalDrawingDxf("plan", document).entityCount).toBeGreaterThan(0);
  });

  it("keeps bridge marker semantics in DXF through the existing DrawingDocument mapper", () => {
    const document = buildPlanDrawingDocumentFromDraft(buildBridgeDraft());
    const mapped = mapDrawingDocumentToDxf(document);
    const bridgeLines = mapped.document.entities.filter(
      (entity) => entity.kind === "line" && entity.layer === "PLAN_STATION",
    );
    const bridgeText = mapped.document.entities.filter(
      (entity) =>
        entity.kind === "text"
        && ["P0", "P1", "L=20.00", "θ=0.0°", "θ=30.0°"].includes(entity.text),
    );
    const entityKeys = mapped.document.entities
      .filter((entity) => entity.layer === "PLAN_STATION" || bridgeText.includes(entity))
      .map((entity) => JSON.stringify(entity));

    expect(bridgeLines).toHaveLength(2);
    expect(bridgeText.map((entity) => entity.kind === "text" ? entity.text : "")).toEqual(
      expect.arrayContaining(["P0", "P1", "L=20.00", "θ=0.0°", "θ=30.0°"]),
    );
    expectNoDuplicateValues(entityKeys);
    for (const entity of mapped.document.entities) {
      expect(JSON.stringify(entity)).not.toMatch(/NaN|Infinity/);
    }
  });

  it("omits DXF support LINE entities when support source points are missing", () => {
    const missingSupport = withBridgeSources(result, {
      piers: result.piers.map((pier) => ({ ...pier, supportLinePointIds: [] })),
    });
    const output = createPlanDrawingBuilder().build({ result: missingSupport, settings });
    const mapped = mapDrawingDocumentToDxf({
      version: "0.1.0",
      sheets: [output.sheet],
      stationAxes: settings.stationAxes,
      diagnostics: output.diagnostics,
    });

    expect(
      mapped.document.entities.filter((entity) => entity.kind === "line" && entity.layer === "PLAN_STATION"),
    ).toHaveLength(0);
    expect(mapped.document.entities.some((entity) => entity.kind === "text" && entity.text === "L=20.00")).toBe(true);
  });
});
