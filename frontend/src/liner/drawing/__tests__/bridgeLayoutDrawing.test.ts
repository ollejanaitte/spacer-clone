import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import type { LinearAlignment } from "../../core/types";
import {
  appendBridgeLayoutGeometry,
  bridgeLayoutBandRowLabels,
  bridgeLayoutGeometryPoints,
  hasBridgeLayout,
  sampleAlignmentAt,
} from "../builders/bridgeLayoutDrawing";
import { createEmptyDrawingLayer } from "../model/document";
import {
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
} from "../builders/formalBuilders";
import { exportFormalDrawingDxf } from "../../dxf";
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

describe("bridgeLayoutDrawing", () => {
  const result = buildBridgeIntermediate();

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

  it("keeps bridge layout primitives on the formal DrawingDocument export path", () => {
    const document = buildPlanDrawingDocumentFromDraft(buildBridgeDraft());
    const primitiveIds = document.sheets[0]?.viewports[0]?.layers
      .flatMap((layer) => layer.primitives)
      .map((primitive) => primitive.id);
    expect(primitiveIds).toContain("plan-pier-support-P0");
    expect(primitiveIds).toContain("plan-span-label-SP-1");
    expect(exportFormalDrawingDxf("plan", document).entityCount).toBeGreaterThan(0);
  });
});
