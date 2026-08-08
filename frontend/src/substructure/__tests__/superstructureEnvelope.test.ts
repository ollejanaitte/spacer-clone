// Phase C1 (M3-02) 上部工簡易外形 3D ソリッド テスト
import { describe, it, expect } from "vitest";
import {
  buildSuperstructureEnvelope,
  summarizeEnvelope,
} from "../design/superstructureEnvelope";
import type { SuperstructureInput } from "../design/designTypes";

function input(supportId: string, seatZ: number, girder: number, deck: number): SuperstructureInput {
  return {
    supportId,
    girderBottomElevation: girder,
    deckElevation: deck,
    bearingSeats: [
      { bearingId: `${supportId}-B1`, bearingPosition: { x: 0, y: -3, z: seatZ } },
      { bearingId: `${supportId}-B2`, bearingPosition: { x: 0, y: 3, z: seatZ } },
    ],
  };
}

const A1 = input("A1", 5.0, 6.0, 8.0);
const P1 = input("P1", 5.2, 6.2, 8.2);
const A2 = input("A2", 5.4, 6.4, 8.4);

describe("buildSuperstructureEnvelope", () => {
  it("builds girder and deck solids spanning two supports", () => {
    const result = buildSuperstructureEnvelope({
      superstructures: [A1, P1],
      supportPositions: new Map([
        ["A1", { x: 0, y: 0, z: 0 }],
        ["P1", { x: 30, y: 0, z: 0 }],
      ]),
    });
    expect(result.ok).toBe(true);
    const solids = result.group!.solids;
    const ids = solids.map((s) => s.id);
    expect(ids).toContain("SUPERSTRUCTURE-GIRDER");
    expect(ids).toContain("SUPERSTRUCTURE-DECK");
    const girder = solids.find((s) => s.id === "SUPERSTRUCTURE-GIRDER")!;
    expect(girder.localSize.x).toBeCloseTo(30, 6);
    expect(girder.localSize.y).toBeCloseTo(6, 6);
    expect(girder.entity).toBe("superstructure");
  });

  it("produces the same result deterministically", () => {
    const a = buildSuperstructureEnvelope({
      superstructures: [A1, P1, A2],
      supportPositions: new Map([
        ["A1", { x: 0, y: 0, z: 0 }],
        ["P1", { x: 30, y: 0, z: 0 }],
        ["A2", { x: 90, y: 0, z: 0 }],
      ]),
    });
    const b = buildSuperstructureEnvelope({
      superstructures: [A1, P1, A2],
      supportPositions: new Map([
        ["A1", { x: 0, y: 0, z: 0 }],
        ["P1", { x: 30, y: 0, z: 0 }],
        ["A2", { x: 90, y: 0, z: 0 }],
      ]),
    });
    expect(a).toEqual(b);
  });

  it("fails closed without bearing data", () => {
    const result = buildSuperstructureEnvelope({
      superstructures: [{ supportId: "P1", bearingSeats: [] }],
      supportPositions: new Map([["P1", { x: 0, y: 0, z: 0 }]]),
    });
    expect(result.ok).toBe(false);
    expect(result.group).toBeNull();
  });

  it("fails closed with zero-width envelope", () => {
    const result = buildSuperstructureEnvelope({
      superstructures: [
        {
          supportId: "P1",
          bearingSeats: [{ bearingId: "B1", bearingPosition: { x: 0, y: 0, z: 5 } }],
        },
      ],
      supportPositions: new Map([["P1", { x: 0, y: 0, z: 0 }]]),
    });
    expect(result.ok).toBe(false);
  });
});

describe("summarizeEnvelope", () => {
  it("summarizes seat extents", () => {
    const summary = summarizeEnvelope(A1.bearingSeats!);
    expect(summary.count).toBe(2);
    expect(summary.minY).toBe(-3);
    expect(summary.maxY).toBe(3);
  });
});
