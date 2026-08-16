import { describe, expect, it } from "vitest";
import { buildReferenceBusiness001RoadSample } from "../../../liner/samples/reference-business-001/roadAlignment";
import { computeBoxListBounds, computeTerrainLayerBounds } from "../../layers/layerContract";
import { buildRepresentativeGujoTerrainHeightfield } from "../realScene";
import { bridgeCandidateToLayers, deriveBridgeSupports, RB001_BRIDGE_ID } from "../bridgeAdapter";

describe("bridgeAdapter (V-5 real bridge)", () => {
  const road = buildReferenceBusiness001RoadSample();
  const terrain = buildRepresentativeGujoTerrainHeightfield();
  const bundle = bridgeCandidateToLayers({
    roadAlignment: road.horizontal,
    vertical: road.vertical,
    candidate: {
      startStation: road.bridgeCandidate.startStation,
      endStation: road.bridgeCandidate.endStation,
      nominalSpanM: road.bridgeCandidate.nominalSpanM,
    },
    terrainHeight: (x, y) => terrain.getElevation(x, y).z ?? 0,
  });

  it("derives a 5-span / 6-support bridge inside the STA.1200-1500 candidate", () => {
    const specs = deriveBridgeSupports(road.bridgeCandidate);
    // 5 spans × nominal 50 m = A1 + P1..P4 + A2 (6 supports), inside the
    // STA.1200-1500 candidate (east 50 m remains approach road).
    expect(specs).toHaveLength(6);
    expect(specs[0].supportId).toBe("A1");
    expect(specs[specs.length - 1].supportId).toBe("A2");
    expect(specs.filter((s) => s.kind === "pier")).toHaveLength(4);
    expect(specs.filter((s) => s.kind === "abutment")).toHaveLength(2);
    // every support station lies inside the bridge candidate interval
    for (const spec of specs) {
      expect(spec.station).toBeGreaterThanOrEqual(road.bridgeCandidate.startStation);
      expect(spec.station).toBeLessThanOrEqual(road.bridgeCandidate.endStation);
    }
    // support spacing is ~50 m
    for (let i = 1; i < specs.length; i += 1) {
      expect(specs[i].station - specs[i - 1].station).toBeCloseTo(50, 6);
    }
  });

  it("places supports on the road centerline (station-aligned points)", () => {
    expect(bundle.supports).toHaveLength(6);
    const a1 = bundle.supports[0];
    const a2 = bundle.supports[bundle.supports.length - 1];
    expect(a1.supportId).toBe("A1");
    expect(a2.supportId).toBe("A2");
    // deck elevations follow the vertical profile (rising eastward +1.5%)
    expect(a1.deckElevation).toBeGreaterThan(308);
    expect(a1.deckElevation).toBeLessThan(310);
    expect(a2.deckElevation).toBeGreaterThan(a1.deckElevation);
  });

  it("sizes piers from the terrain so columns reach the ground", () => {
    const supports = bundle.substructure.supports;
    expect(supports).toHaveLength(6);
    for (const support of supports) {
      const groundZ = terrain.getElevation(support.column.center.x, support.column.center.y).z;
      if (groundZ === null) continue;
      // column bottom reaches the terrain surface
      const columnBottom = support.column.center.z - support.column.size.z / 2;
      expect(columnBottom).toBeCloseTo(groundZ, 0);
      expect(support.column.size.z).toBeGreaterThan(0);
    }
  });

  it("keeps substructure positions within the terrain bounds", () => {
    const terrainLayer = {
      kind: "terrain" as const,
      width: terrain.width,
      height: terrain.height,
      cellSize: terrain.cellSize,
      originX: terrain.originX,
      originY: terrain.originY,
      heights: terrain.data,
    };
    const tb = computeTerrainLayerBounds(terrainLayer);
    const subBounds = computeBoxListBounds(
      bundle.substructure.supports.flatMap((s) =>
        [s.column, s.cap, s.foundation].filter((box): box is NonNullable<typeof box> => box !== null && box !== undefined),
      ),
    );
    expect(subBounds.minX).toBeGreaterThanOrEqual(tb.minX);
    expect(subBounds.maxX).toBeLessThanOrEqual(tb.maxX + 1e-6);
    expect(subBounds.minY).toBeGreaterThanOrEqual(tb.minY);
    expect(subBounds.maxY).toBeLessThanOrEqual(tb.maxY + 1e-6);
  });

  it("builds a 5-span continuous superstructure (girders + deck + cross beams)", () => {
    const sd = bundle.superstructure;
    expect(sd.girders).toHaveLength(2);
    expect(sd.deck).toBeDefined();
    expect((sd.crossBeams ?? []).length).toBeGreaterThan(1);
    const spanLen = sd.deck?.size.x ?? 0;
    // deck spans A1..A2 (5 spans × 50 m along the centerline chord ≈ 250 m)
    expect(spanLen).toBeGreaterThan(230);
    expect(spanLen).toBeLessThan(270);
  });

  it("places one bearing per girder on each support (2 × 6 = 12)", () => {
    expect(bundle.bearings.bearings).toHaveLength(12);
  });

  it("aligns the deck with the road centerline azimuth (yaw on the boxes)", () => {
    const sd = bundle.superstructure;
    const deck = sd.deck;
    expect(deck?.yawDeg).toBeDefined();
    const yaw = deck?.yawDeg ?? 0;
    expect(yaw).toBeLessThan(-30);
    expect(yaw).toBeGreaterThan(-90);
    for (const girder of sd.girders) {
      expect(girder.yawDeg).toBeCloseTo(yaw, 6);
    }
  });

  it("reports the bridge id", () => {
    expect(bundle.bridgeId).toBe(RB001_BRIDGE_ID);
  });
});