import { describe, expect, it } from "vitest";
import { buildBridgeProjectAlignment, BridgeProjectAdapterError } from "../alignmentAdapter";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { BRIDGE_ABUTMENT_STATIONS, BRIDGE_PIER_STATIONS } from "../../liner/samples/mountain-viaduct-500/bridgeStations";
import { BP_CODES } from "../validation";
import type { Coordinate3dInput } from "../../liner/core/coordinate3d";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("buildBridgeProjectAlignment", () => {
  it("produces deterministic output for the same input", () => {
    const draft = buildMountainDraft();
    const first = buildBridgeProjectAlignment(draft);
    const second = buildBridgeProjectAlignment(deepClone(draft));
    expect(first).toEqual(second);
  });

  it("derives bridge extent from the mountain-viaduct-500 support stations", () => {
    const alignment = buildBridgeProjectAlignment(buildMountainDraft());
    expect(alignment.bridgeStartStationM.value).toBe(50);
    expect(alignment.bridgeEndStationM.value).toBe(450);
    expect(alignment.bridgeLengthM.value).toBe(400);
    expect(alignment.bridgeStartStationM.status).toBe("CONFIRMED");
    expect(alignment.bridgeLengthM.status).toBe("DERIVED");
  });

  it("samples every support station of the mountain sample", () => {
    const alignment = buildBridgeProjectAlignment(buildMountainDraft());
    const supportStations = alignment.stations
      .filter((station) => station.supportId !== undefined)
      .map((station) => station.stationM.value);
    const expected = [...BRIDGE_ABUTMENT_STATIONS, ...BRIDGE_PIER_STATIONS].sort((a, b) => a - b);
    expect(supportStations).toEqual(expected);
  });

  it("preserves station/XYZ/azimuth/grade/crossfall/width meaning on samples", () => {
    const alignment = buildBridgeProjectAlignment(buildMountainDraft());
    const a1 = alignment.stations.find((station) => station.supportId === "A1");
    expect(a1).toBeDefined();
    expect(a1!.stationM.status).toBe("CONFIRMED");
    for (const field of ["x", "y", "z"] as const) {
      expect(a1!.position[field].status).toBe("DERIVED");
      expect(a1!.position[field].unit).toBe("m");
      expect(Number.isFinite(a1!.position[field].value)).toBe(true);
    }
    expect(a1!.azimuthRad.status).toBe("DERIVED");
    expect(a1!.azimuthRad.unit).toBe("rad");
    expect(a1!.curvaturePerM.unit).toBe("1/m");
    expect(a1!.grade).toBeDefined();
    expect(Number.isFinite(a1!.grade!.value)).toBe(true);
    expect(a1!.crossfallPercent).toBeDefined();
    expect(a1!.crossfallPercent!.unit).toBe("%");
    expect(a1!.widthM).toBeDefined();
    expect(a1!.widthM!.unit).toBe("m");
  });

  it("does not promote DERIVED values to CONFIRMED", () => {
    const alignment = buildBridgeProjectAlignment(buildMountainDraft());
    const supportStation = alignment.stations.find((station) => station.supportId === "A1")!;
    expect(supportStation.position.x.status).not.toBe("CONFIRMED");
    expect(supportStation.azimuthRad.status).not.toBe("CONFIRMED");
    expect(supportStation.stationM.status).toBe("CONFIRMED"); // station is an input fact
  });

  it("fails closed when no support stations are available", () => {
    const empty = {
      alignment: buildMountainDraft().alignment,
      stationDefinition: buildMountainDraft().stationDefinition,
    };
    expect(() => buildBridgeProjectAlignment(empty as Coordinate3dInput)).toThrow(
      BridgeProjectAdapterError,
    );
  });

  it("fails closed on non-finite bridge extent", () => {
    const draft = buildMountainDraft();
    expect(() =>
      buildBridgeProjectAlignment(draft, { bridgeStartStationM: Number.NaN }),
    ).toThrowError(BridgeProjectAdapterError);
  });

  it("fails closed when bridgeStart >= bridgeEnd", () => {
    const draft = buildMountainDraft();
    expect(() =>
      buildBridgeProjectAlignment(draft, { bridgeStartStationM: 450, bridgeEndStationM: 50 }),
    ).toThrowError(BridgeProjectAdapterError);
  });

  it("fails closed when a station is outside the alignment", () => {
    const draft = buildMountainDraft();
    expect(() =>
      buildBridgeProjectAlignment(draft, { bridgeStartStationM: 0, bridgeEndStationM: 10 }),
    ).toThrowError(BridgeProjectAdapterError);
  });

  it("fails closed on invalid status shape (MISSING must carry a reason, not a value)", () => {
    expect(() =>
      buildBridgeProjectAlignment(buildMountainDraft(), {
        bridgeStartStationM: 50,
        bridgeEndStationM: 450,
      }),
    ).not.toThrow();
  });

  it("marks grade MISSING when there is no vertical profile", () => {
    const draft = buildMountainDraft();
    const noVertical = { ...draft, verticalAlignment: undefined };
    const alignment = buildBridgeProjectAlignment(noVertical as Coordinate3dInput, {
      bridgeStartStationM: 50,
      bridgeEndStationM: 450,
    });
    const a1 = alignment.stations.find((station) => station.supportId === "A1")!;
    expect(a1.grade).toBeDefined();
    expect(a1.grade!.status).toBe("MISSING");
    expect(a1.grade!.stateReason).toBeDefined();
  });

  it("uses an explicit support station list when provided", () => {
    const draft = buildMountainDraft();
    const alignment = buildBridgeProjectAlignment(draft, { supportStationsM: [100, 200, 300] });
    expect(alignment.bridgeStartStationM.value).toBe(100);
    expect(alignment.bridgeEndStationM.value).toBe(300);
    expect(alignment.bridgeLengthM.value).toBe(200);
  });

  it("BP_CODES are stable identifiers", () => {
    expect(BP_CODES.BRIDGE_EXTENT_MISSING).toBe("BP_BRIDGE_EXTENT_MISSING");
    expect(BP_CODES.NON_FINITE).toBe("BP_NON_FINITE");
  });
});
