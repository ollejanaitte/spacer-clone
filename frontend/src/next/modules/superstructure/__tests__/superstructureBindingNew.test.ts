import { describe, expect, it } from "vitest";
import type { BridgeLayoutReference, RoadReference, SuperstructureDocument } from "../superstructureTypes";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../superstructureDocumentDomain";
import { buildSuperstructureFacts } from "../superstructureFacts";
import {
  buildSuperstructureGeometryInput,
  SUPER_BINDING_CODES,
} from "../superstructureBindingNew";
import { BridgeProjectAdapterError } from "../../../../bridgeProject/validation";

function bridgeRef(bridgeId = "BR-900"): BridgeLayoutReference {
  return { bridgeId, moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp-900" };
}

function roadRef(): RoadReference {
  return { moduleId: "road", alignmentId: "ALN-1", stationReferenceId: null, coordinatePolicyId: null };
}

function makeGirderConfig() {
  return {
    girderCount: 2,
    girderSpacingM: 8,
    girderLines: [] as never[],
    girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
  };
}

function makeDeckConfig() {
  return {
    deckId: "DECK-1",
    deckKind: "rc_non_composite" as const,
    thicknessM: 0.24,
    unitWeight: 24.5,
    overhangLeftM: 0.5,
    overhangRightM: 0.5,
    resolvedWidthM: 12.0,
  };
}

function makeDocument(projectId = "PROJ-1", bridgeId = "BR-900"): SuperstructureDocument {
  const built = buildSuperstructureDocument({
    projectId,
    bridgeLayoutReference: bridgeRef(bridgeId),
    roadReference: roadRef(),
    girderConfiguration: makeGirderConfig(),
    deckConfiguration: makeDeckConfig(),
  });
  if (!built.ok) throw new Error("build failed");
  return attachSuperstructureHandoffs(
    built.document,
    {
      handoffId: "SH-1",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      spans: [
        { spanId: "S1", index: 0, startSupportId: "A1", endSupportId: "P1", startStation: 0, endStation: 40, spanLength: 40, startSupportSkew: null, endSupportSkew: null },
        { spanId: "S2", index: 1, startSupportId: "P1", endSupportId: "A2", startStation: 40, endStation: 80, spanLength: 40, startSupportSkew: null, endSupportSkew: null },
      ],
    },
    {
      handoffId: "SH-2",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      supports: [
        { supportId: "A1", supportType: "abutment", label: "A1", station: 0, position: { domainX: 0, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "P1", supportType: "pier", label: "P1", station: 40, position: { domainX: 40, domainY: 0, elevation: 101 }, tangentAzimuthRad: 0, skewAngleRad: 0.1, terrainElevation: 97, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "A2", supportType: "abutment", label: "A2", station: 80, position: { domainX: 80, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "r", coordinateContextId: null },
      ],
    },
  );
}

describe("Superstructure facts adapter (WP-B)", () => {
  it("extracts shared facts from a valid document", () => {
    const result = buildSuperstructureFacts(makeDocument());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.bridgeId).toBe("BR-900");
    expect(result.facts.supports).toHaveLength(3);
    expect(result.facts.spans).toHaveLength(2);
    expect(result.facts.girderArrangement.map((g) => g.offsetM)).toEqual([-4, 4]);
    expect(result.facts.deckFacts?.widthM).toBe(12);
    expect(result.facts.spanSystem).toBe("continuous");
  });

  it("fails closed when handoffs are missing", () => {
    const built = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef("BR-900"),
      roadReference: roadRef(),
      girderConfiguration: makeGirderConfig(),
      deckConfiguration: makeDeckConfig(),
    });
    if (!built.ok) throw new Error("build failed");
    const result = buildSuperstructureFacts(built.document);
    expect(result.ok).toBe(false);
  });
});

describe("Superstructure geometry binding (WP-B)", () => {
  it("builds a numeric GeometryEngineInput from the document", () => {
    const input = buildSuperstructureGeometryInput(makeDocument());
    expect(input.bridgeId).toBe("BR-900");
    expect(input.alignmentIds).toEqual(["ALN-1"]);
    expect(input.supports).toHaveLength(3);
    expect(input.supports[0].stationM).toBe(0);
    expect(input.supports[2].stationM).toBe(80);
    expect(input.spanLengthsM).toEqual([40, 40]);
    expect(input.bridgeLengthM).toBe(80);
    expect(input.girderOffsetsM).toEqual({ G1: -4, G2: 4 });
    expect(input.girders).toHaveLength(2);
    expect(input.deckSpecs?.[0].widthM).toBe(12);
    expect(input.deckSpecs?.[0].thicknessM).toBe(0.24);
  });

  it("fails closed without Bridge Layout", () => {
    const doc = makeDocument();
    const noLayout = { ...doc, bridgeLayoutReference: null };
    expect(() => buildSuperstructureGeometryInput(noLayout)).toThrow(BridgeProjectAdapterError);
  });

  it("fails closed without supports", () => {
    const doc = makeDocument();
    const noSupports = { ...doc, supportReferences: null };
    try {
      buildSuperstructureGeometryInput(noSupports);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(BridgeProjectAdapterError);
      expect((error as BridgeProjectAdapterError).code).toBe(SUPER_BINDING_CODES.MISSING_SUPPORT);
    }
  });

  it("fails closed on mixed station presence", () => {
    const doc = makeDocument();
    const supports = doc.supportReferences!.supports.map((s, i) => (i === 1 ? { ...s, station: Number.NaN } : s));
    const bad = { ...doc, supportReferences: { ...doc.supportReferences!, supports } };
    try {
      buildSuperstructureGeometryInput(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as BridgeProjectAdapterError).code).toBe(SUPER_BINDING_CODES.MISSING_STATION);
    }
  });

  it("fails closed when spans != supports - 1", () => {
    const doc = makeDocument();
    const spans = doc.spanReferences!.spans.slice(0, 1);
    const bad = { ...doc, spanReferences: { ...doc.spanReferences!, spans } };
    try {
      buildSuperstructureGeometryInput(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as BridgeProjectAdapterError).code).toBe(SUPER_BINDING_CODES.MISSING_SPAN);
    }
  });

  it("fails closed without girder offsets (never invented)", () => {
    const doc = makeDocument();
    const bad = {
      ...doc,
      girderConfiguration: {
        ...doc.girderConfiguration,
        girderLines: doc.girderConfiguration.girderLines.map((l) => ({ ...l, offsetFromCenterline: Number.NaN })),
      },
    };
    try {
      buildSuperstructureGeometryInput(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as BridgeProjectAdapterError).code).toBe(SUPER_BINDING_CODES.MISSING_GIRDER);
    }
  });
});
