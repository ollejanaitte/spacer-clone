/**
 * Mountain Viaduct 500 — bridge geometry fixture (MOUNTAIN-SAMPLE P04).
 *
 * 400 m viaduct from STA.50 (A1) to STA.450 (A2):
 *   A1@50, P1..P7 @ 100..400, A2@450  (8 spans x 50 m, 7 piers, 2 abutments)
 *
 * All positions are station-based; X/Y/Z/heading/skew come from the existing
 * Bridge Geometry (frontend core + Step2 backend bridge_geometry) — piers are
 * never hand-placed in the 3D layer.
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import type { PierDraft, SpanDraft } from "../../schema/types";
import {
  BRIDGE_ABUTMENT_STATIONS,
  BRIDGE_PIER_STATIONS,
  BRIDGE_SPAN_PIER_PAIRS,
  BRIDGE_STATION_LAYOUT,
} from "./bridgeStations";

export function buildMountainPiers(): PierDraft[] {
  const piers: PierDraft[] = [
    {
      id: "A1",
      physicalDistance: BRIDGE_STATION_LAYOUT.A1,
      kind: "abutment",
      skewAngleRad: Math.PI / 2,
      bearingOffsets: [
        { transverseIndex: 0, offset: -3.25 },
        { transverseIndex: 1, offset: 3.25 },
      ],
    },
  ];
  for (const station of BRIDGE_PIER_STATIONS) {
    piers.push({
      id: pierIdForStation(station),
      physicalDistance: station,
      kind: "pier",
      skewAngleRad: Math.PI / 2,
      bearingOffsets: [
        { transverseIndex: 0, offset: -3.25 },
        { transverseIndex: 1, offset: 3.25 },
      ],
    });
  }
  piers.push({
    id: "A2",
    physicalDistance: BRIDGE_STATION_LAYOUT.A2,
    kind: "abutment",
    skewAngleRad: Math.PI / 2,
    bearingOffsets: [
      { transverseIndex: 0, offset: -3.25 },
      { transverseIndex: 1, offset: 3.25 },
    ],
  });
  return piers;
}

export function buildMountainSpans(): SpanDraft[] {
  const stations = [...BRIDGE_ABUTMENT_STATIONS, ...BRIDGE_PIER_STATIONS].sort(
    (a, b) => a - b,
  );
  return BRIDGE_SPAN_PIER_PAIRS.map(([startId, endId], index) => ({
    id: `SPAN-${index + 1}`,
    startPhysicalDistance: stations[index],
    endPhysicalDistance: stations[index + 1],
    pierIdStart: startId,
    pierIdEnd: endId,
  }));
}

export function pierIdForStation(station: number): string {
  const index = BRIDGE_PIER_STATIONS.indexOf(station);
  return index >= 0 ? `P${index + 1}` : `X${station}`;
}

/** Attach piers + spans to a draft. */
export function applyMountainBridge(
  draft: BuildIntermediateInput,
): BuildIntermediateInput {
  return {
    ...draft,
    piers: buildMountainPiers(),
    spans: buildMountainSpans(),
  };
}
