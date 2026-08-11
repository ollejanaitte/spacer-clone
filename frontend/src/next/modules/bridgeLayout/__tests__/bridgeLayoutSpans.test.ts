import { describe, expect, it } from "vitest";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { createEmptyBridgeLayoutDocument } from "../bridgeLayoutTypes";
import type { BridgeLayoutDocument } from "../bridgeLayoutTypes";
import {
  addPier,
  removePier,
  updatePierStation,
} from "../bridgeLayoutPiers";
import { generateSpans, validateSpanConfiguration, describeSpans } from "../bridgeLayoutSpans";
import {
  computePierPlacementCandidate,
  defaultAutomaticSkew,
  refreshPierPlacements,
} from "../bridgeLayoutPlacement";
import { buildRoadAlignmentContextFromInputs } from "../bridgeLayoutDomain";

function makeRangeDoc(): BridgeLayoutDocument {
  const doc = createEmptyBridgeLayoutDocument();
  return {
    ...doc,
    bridgeId: "BR-500",
    name: "P1..Pn支間割",
    roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
    bridgeRange: { startStation: 100, endStation: 700, bridgeLength: 600 },
    abutments: {
      A1: { supportId: "A1", station: 100, skewAngleRad: null },
      A2: { supportId: "A2", station: 700, skewAngleRad: null },
    },
    piers: [],
    spans: [],
    skew: { signConvention: "counterclockwise-positive", angleRad: null },
    terrainReference: { moduleId: "terrain", surfaceReference: null, coordinateContextId: null },
    existingConditionsReference: { moduleId: "terrain", documentReferenceId: null },
  };
}

describe("Phase 4-03 Span generation", () => {
  it("generates no spans when there are no piers (A1-A2 single span)", () => {
    const doc = makeRangeDoc();
    const spans = generateSpans(doc);
    expect(spans).toHaveLength(1);
    expect(spans[0].startSupportId).toBe("A1");
    expect(spans[0].endSupportId).toBe("A2");
    expect(spans[0].length).toBe(600);
  });

  it("generates A1-P1-...-Pn-A2 spans in station order", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { supportId: "P1", station: 300 });
    doc = addPier(doc, { supportId: "P2", station: 500 });
    const withSpans = { ...doc, spans: generateSpans(doc) };
    expect(withSpans.spans).toHaveLength(3);
    expect(describeSpans(withSpans)).toEqual([
      { spanId: "S1", from: "A1", to: "P1", length: 200 },
      { spanId: "S2", from: "P1", to: "P2", length: 200 },
      { spanId: "S3", from: "P2", to: "A2", length: 200 },
    ]);
  });

  it("recomputes spans when a pier is added", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 400 });
    const oneSpan = generateSpans(doc);
    expect(oneSpan).toHaveLength(2);
    doc = addPier(doc, { station: 250 });
    const twoSpans = generateSpans(doc);
    expect(twoSpans).toHaveLength(3);
  });

  it("recomputes spans when a pier is removed", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { supportId: "P1", station: 300 });
    doc = addPier(doc, { supportId: "P2", station: 500 });
    expect(generateSpans(doc)).toHaveLength(3);
    doc = removePier(doc, "P1");
    expect(generateSpans(doc)).toHaveLength(2);
  });

  it("recomputes spans when a pier moves", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { supportId: "P1", station: 300 });
    doc = addPier(doc, { supportId: "P2", station: 500 });
    doc = updatePierStation(doc, "P1", 350);
    const spans = generateSpans(doc);
    expect(spans[0].length).toBe(250);
    expect(spans[1].length).toBe(150);
  });

  it("span length total equals bridgeLength", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 250 });
    doc = addPier(doc, { station: 400 });
    doc = addPier(doc, { station: 600 });
    const spans = generateSpans(doc);
    const total = spans.reduce((sum, s) => sum + s.length, 0);
    expect(total).toBeCloseTo(600, 6);
    const withSpans = { ...doc, spans };
    expect(validateSpanConfiguration({ document: withSpans })).toHaveLength(0);
  });

  it("detects zero/negative span and total mismatch", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 300 });
    doc = addPier(doc, { station: 500 });
    const spans = generateSpans(doc);
    // corrupt: negative length + total mismatch
    const bad = {
      ...doc,
      spans: [
        { ...spans[0], length: -5 },
        spans[1],
        { ...spans[2], length: 999 },
      ],
    };
    const issues = validateSpanConfiguration({ document: bad });
    expect(issues.some((i) => i.message.includes("length must be greater than 0"))).toBe(true);
    expect(issues.some((i) => i.message.includes("must equal bridgeLength"))).toBe(true);
  });

  it("detects span count mismatch and chain breaks", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 300 });
    const spans = generateSpans(doc);
    const brokenChain = { ...doc, spans: [spans[0], { ...spans[1], startSupportId: "P9" }] };
    const issues = validateSpanConfiguration({ document: brokenChain });
    expect(issues.some((i) => i.message.includes("chain broken"))).toBe(true);
  });
});

describe("Phase 4-03 Pier placement", () => {
  function buildCtx() {
    const mountain = createReferenceMountain();
    return {
      mountain,
      roadContext: buildRoadAlignmentContextFromInputs({
        horizontal: mountain.roadHorizontal,
        vertical: mountain.roadVertical,
        crossSections: [mountain.roadCrossSection],
      }),
    };
  }

  it("computes pier XYZ / elevation / tangent from the road module", () => {
    const { mountain } = buildCtx();
    const result = computePierPlacementCandidate({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
      station: 300,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.candidate.domainX).toBe("number");
    expect(typeof result.candidate.domainY).toBe("number");
    expect(typeof result.candidate.elevation).toBe("number");
    expect(typeof result.candidate.tangentAzimuthRad).toBe("number");
    expect(result.candidate.roadReferenceId).toBe("ROAD-MTN-1");
  });

  it("rejects non-finite pier station", () => {
    const { mountain } = buildCtx();
    const result = computePierPlacementCandidate({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
      station: Number.NaN,
    });
    expect(result.ok).toBe(false);
  });

  it("defaultAutomaticSkew is CCW-positive road-perpendicular", () => {
    // tangent azimuth 0 (east) -> perpendicular CCW = PI/2 (north)
    expect(defaultAutomaticSkew(0)).toBeCloseTo(Math.PI / 2, 6);
    // tangent azimuth PI/2 (north) -> CCW perpendicular = PI (west)
    expect(defaultAutomaticSkew(Math.PI / 2)).toBeCloseTo(Math.PI, 6);
    // normalized into (-PI, PI]
    const value = defaultAutomaticSkew(-Math.PI + 0.5);
    expect(value).toBeGreaterThan(-Math.PI);
    expect(value).toBeLessThanOrEqual(Math.PI);
  });

  it("refreshPierPlacements fills placement, terrain elevation and automatic skew", () => {
    const { mountain, roadContext } = buildCtx();
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 300 });
    doc = addPier(doc, { station: 500 });
    const refreshed = refreshPierPlacements(doc, roadContext, mountain.terrainGrid);
    expect(refreshed.piers[0].placement).toBeTruthy();
    expect(refreshed.piers[0].placement?.domainX).toBeGreaterThan(0);
    expect(refreshed.piers[0].skewSource).toBe("automatic");
    expect(refreshed.piers[0].skewAngleRad).not.toBeNull();
    expect(typeof refreshed.piers[0].placement?.terrainElevation).toBe("number");
    expect(refreshed.piers[0].placement?.coordinateContextId).toBe("COORD-JGD2011");
  });

  it("preserves user skew (skewSource=user) during refresh", () => {
    const { mountain, roadContext } = buildCtx();
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 300 });
    doc = { ...doc, piers: [{ ...doc.piers[0], skewAngleRad: 0.3, skewSource: "user" as const }] };
    const refreshed = refreshPierPlacements(doc, roadContext, mountain.terrainGrid);
    expect(refreshed.piers[0].skewAngleRad).toBeCloseTo(0.3, 6);
    expect(refreshed.piers[0].skewSource).toBe("user");
  });

  it("does not modify the document when road context is unavailable", () => {
    const { roadContext } = buildCtx();
    const badContext = { ...roadContext, ok: false as const };
    const doc = makeRangeDoc();
    const result = refreshPierPlacements(doc, badContext, null);
    expect(result).toBe(doc);
  });
});
