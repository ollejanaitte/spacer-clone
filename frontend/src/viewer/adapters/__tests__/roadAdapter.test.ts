import { describe, expect, it } from "vitest";
import {
  buildReferenceBusiness001RoadSample,
  RB001_BRIDGE_CANDIDATE,
  RB001_ORIGIN,
  REF_BUSINESS_001_ROAD_ID,
} from "../../../liner/samples/reference-business-001/roadAlignment";
import { totalAlignmentLength } from "../../../liner/core/geometry/horizontal";
import { computeRoadLayerBounds, computeTerrainLayerBounds } from "../../layers/layerContract";
import { buildRepresentativeGujoTerrainHeightfield, GUJO_FULL_BOUNDS } from "../realScene";
import {
  elevationAt,
  roadAlignmentToLayer,
  roadStationRange,
  sampleAlignment,
} from "../roadAdapter";

describe("roadAdapter (V-4 real road)", () => {
  const road = buildReferenceBusiness001RoadSample();

  it("maps the RB001 road sample into a RoadLayerData in the canonical frame", () => {
    const layer = roadAlignmentToLayer(road);
    expect(layer.kind).toBe("road");
    expect(layer.width).toBe(9.0);
    expect(layer.alignment.length).toBeGreaterThan(100);
    const first = layer.alignment[0];
    expect(first.x).toBeCloseTo(RB001_ORIGIN.x, 3);
    expect(first.y).toBeCloseTo(RB001_ORIGIN.y, 3);
    // The road runs the full 2450 m in EPSG:6674 canonical coordinates.
    // It curves (clothoid/arc) so the start->end chord is shorter than the
    // alignment length but still spans most of the 2450 m run.
    const last = layer.alignment[layer.alignment.length - 1];
    const span = Math.hypot(last.x - first.x, last.y - first.y);
    expect(span).toBeGreaterThan(totalAlignmentLength(road.horizontal) * 0.8);
  });

  it("samples a station span matching the alignment length", () => {
    const { points, length } = sampleAlignment(road.horizontal, road.vertical, { stepM: 10 });
    expect(length).toBeCloseTo(totalAlignmentLength(road.horizontal), 6);
    expect(points.length).toBe(Math.floor(length / 10) + 1);
    // monotonically increasing stations
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].x - points[i - 1].x).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it("applies the vertical profile to the centerline elevations", () => {
    const { points } = sampleAlignment(road.horizontal, road.vertical, { stepM: 10 });
    expect(points[0].z).toBeCloseTo(330, 3);
    const bridgeStartIndex = Math.floor(road.bridgeCandidate.startStation / 10);
    const bridgeEndIndex = Math.floor(road.bridgeCandidate.endStation / 10);
    const bridgeZ = points.slice(bridgeStartIndex, bridgeEndIndex + 1).map((p) => p.z);
    expect(Math.min(...bridgeZ)).toBeGreaterThanOrEqual(309 - 1e-6);
    // Vertical profile: G1 descent to 310@1000, parabolic 1000-1200 ending at
    // 309.5, then G2 climb (+1.5%) from 1200 -> 313.5@1500.
    expect(elevationAt(1200, road.vertical)).toBeGreaterThanOrEqual(309);
    expect(elevationAt(1200, road.vertical)).toBeLessThanOrEqual(310);
    expect(elevationAt(1500, road.vertical)).toBeCloseTo(313.5, 3);
  });

  it("keeps the road within the full Gujo terrain bounds (same coordinate system)", () => {
    const layer = roadAlignmentToLayer(road);
    const bounds = computeRoadLayerBounds(layer);
    const terrain = buildRepresentativeGujoTerrainHeightfield();
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
    expect(bounds.minX).toBeGreaterThanOrEqual(tb.minX);
    expect(bounds.maxX).toBeLessThanOrEqual(tb.maxX + 1e-6);
    expect(bounds.minY).toBeGreaterThanOrEqual(tb.minY);
    expect(bounds.maxY).toBeLessThanOrEqual(tb.maxY + 1e-6);
    // and the road spans the documented Gujo easting range
    expect(layer.alignment[0].x).toBeGreaterThanOrEqual(GUJO_FULL_BOUNDS.minX);
    expect(layer.alignment[layer.alignment.length - 1].x).toBeLessThanOrEqual(GUJO_FULL_BOUNDS.maxX);
  });

  it("exposes the bridge candidate station interval", () => {
    const range = roadStationRange(road);
    expect(range.start).toBe(0);
    expect(range.end).toBeCloseTo(totalAlignmentLength(road.horizontal), 6);
    expect(RB001_BRIDGE_CANDIDATE.startStation).toBe(1200);
    expect(RB001_BRIDGE_CANDIDATE.endStation).toBe(1500);
    expect(road.bridgeCandidate.nominalSpanM).toBe(50);
  });

  it("keeps the road id / metadata source", () => {
    expect(road.id).toBe(REF_BUSINESS_001_ROAD_ID);
  });
});