import { describe, expect, it } from "vitest";
import {
  displayedStationAtPhysicalDistance,
  generateStations,
} from "../station/stationRules";

describe("liner station generation", () => {
  it("generates start, interval, explicit, and end stations", () => {
    const result = generateStations(
      {
        originDisplayedStation: 0,
        interval: 10,
        explicitStations: [15],
      },
      25,
    );

    expect(result.issues).toHaveLength(0);
    expect(result.stations.map((station) => station.physicalDistance)).toEqual([
      0, 10, 15, 20, 25,
    ]);
    expect(result.stations.map((station) => station.id)).toEqual([
      "ST-000",
      "ST-001",
      "ST-002",
      "ST-003",
      "ST-004",
    ]);
  });

  it("merges duplicate explicit stations with a warning", () => {
    const result = generateStations(
      {
        originDisplayedStation: 0,
        interval: 10,
        explicitStations: [10],
      },
      20,
    );

    expect(result.stations.map((station) => station.physicalDistance)).toEqual([
      0, 10, 20,
    ]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          code: "LINER_STATION_DUPLICATE_EQUATION",
        }),
      ]),
    );
  });

  it("does not warn when explicit stations duplicate automatic start or end", () => {
    const result = generateStations(
      {
        originDisplayedStation: 0,
        explicitStations: [0, 15, 25],
      },
      25,
    );

    expect(result.stations.map((station) => station.physicalDistance)).toEqual([
      0, 15, 25,
    ]);
    expect(result.issues).toHaveLength(0);
  });

  it("still warns for duplicate explicit interior stations", () => {
    const result = generateStations(
      {
        originDisplayedStation: 0,
        explicitStations: [15, 15],
      },
      25,
    );

    expect(result.stations.map((station) => station.physicalDistance)).toEqual([
      0, 15, 25,
    ]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          code: "LINER_STATION_DUPLICATE_EQUATION",
          physicalDistance: 15,
        }),
      ]),
    );
  });

  it("applies station equations at and after the boundary", () => {
    const definition = {
      originDisplayedStation: 0,
      equations: [
        {
          id: "EQ1",
          physicalDistance: 100,
          type: "add_constant" as const,
          value: 100,
        },
      ],
    };

    expect(displayedStationAtPhysicalDistance(50, definition)).toBe(50);
    expect(displayedStationAtPhysicalDistance(100, definition, false)).toBe(100);
    expect(displayedStationAtPhysicalDistance(100, definition, true)).toBe(200);
    expect(displayedStationAtPhysicalDistance(150, definition)).toBe(250);
  });
});
