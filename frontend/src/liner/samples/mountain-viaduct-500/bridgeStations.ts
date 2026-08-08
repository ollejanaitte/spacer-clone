/**
 * Bridge station layout helpers (MOUNTAIN-SAMPLE P01).
 *
 * The 400 m viaduct uses equal 50 m spans:
 *   A1@50, P1@100, P2@150, ..., P7@400, A2@450  (8 spans, 7 piers, 2 abutments)
 */
import type { BridgeStationLayout } from "./schema";

export const BRIDGE_STATION_LAYOUT: BridgeStationLayout = {
  A1: 50,
  P1: 100,
  P2: 150,
  P3: 200,
  P4: 250,
  P5: 300,
  P6: 350,
  P7: 400,
  A2: 450,
};

export const BRIDGE_PIER_STATIONS: number[] = [
  BRIDGE_STATION_LAYOUT.P1,
  BRIDGE_STATION_LAYOUT.P2,
  BRIDGE_STATION_LAYOUT.P3,
  BRIDGE_STATION_LAYOUT.P4,
  BRIDGE_STATION_LAYOUT.P5,
  BRIDGE_STATION_LAYOUT.P6,
  BRIDGE_STATION_LAYOUT.P7,
];

export const BRIDGE_ABUTMENT_STATIONS: number[] = [
  BRIDGE_STATION_LAYOUT.A1,
  BRIDGE_STATION_LAYOUT.A2,
];

/** Pairs of (start, end) pier ids for the 8 spans. */
export const BRIDGE_SPAN_PIER_PAIRS: Array<[string, string]> = [
  ["A1", "P1"],
  ["P1", "P2"],
  ["P2", "P3"],
  ["P3", "P4"],
  ["P4", "P5"],
  ["P5", "P6"],
  ["P6", "P7"],
  ["P7", "A2"],
];
