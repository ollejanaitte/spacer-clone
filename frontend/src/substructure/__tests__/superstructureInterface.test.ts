// Phase C1 (M3-02) 上部工 support-interface 接続 テスト
import { describe, it, expect } from "vitest";
import {
  parseSupportInterface,
  bearingSeatsToModel,
  interfaceToReactions,
  validateSuperstructureInput,
  type SupportInterfaceDoc,
} from "../design/superstructureInterface";

const SAMPLE = {
  schemaVersion: "0.1.0",
  projectId: "ref-bridge-001",
  bridgeId: "RB-S10-001",
  supportId: "PR1",
  supportType: "pier" as const,
  sourceApplication: "spacer-clone",
  sourceVersion: "0.3.0-preview",
  coordinateSystem: "x-longitudinal-y-transverse-z-up",
  unitSystem: "si",
  origin: { x: 0, y: 0, z: 0 },
  position: { x: 30, y: 0, z: 0 },
  bearingSeats: [
    { bearingId: "PR1-BRG-01", bearingPosition: { x: -1.2, y: -3.0, z: 8.2 }, bearingHeight: 0.2 },
    { bearingId: "PR1-BRG-02", bearingPosition: { x: -1.2, y: 3.0, z: 8.2 }, bearingHeight: 0.2 },
  ],
  reactionCases: [
    { caseId: "DL", caseKind: "permanent" as const, force: { x: 0, y: 0, z: -3325.5 } },
    { caseId: "LL-MAX", caseKind: "liveLoad" as const, force: { x: 0, y: 0, z: -1378.9 } },
  ],
  girderBottomElevation: 8.4,
  deckElevation: 10.0,
};

describe("parseSupportInterface", () => {
  it("parses a valid support-interface document", () => {
    const result = parseSupportInterface(JSON.stringify(SAMPLE));
    expect(result.ok).toBe(true);
    expect(result.value!.supportId).toBe("PR1");
    expect(result.value!.reactionCases).toHaveLength(2);
  });

  it("rejects invalid JSON", () => {
    const result = parseSupportInterface("{nope");
    expect(result.ok).toBe(false);
  });

  it("rejects wrong schemaVersion (fail-closed)", () => {
    const result = parseSupportInterface(
      JSON.stringify({ ...SAMPLE, schemaVersion: "9.9.9" }),
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.join("")).toContain("schemaVersion");
  });

  it("rejects missing supportId", () => {
    const result = parseSupportInterface(
      JSON.stringify({ ...SAMPLE, supportId: "" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("bearingSeatsToModel", () => {
  it("maps seats to model BearingSeat with stable IDs", () => {
    const seats = bearingSeatsToModel("PR1", SAMPLE.bearingSeats);
    expect(seats).toHaveLength(2);
    expect(seats[0].seatId).toBe("PR1-SEAT-01");
    expect(seats[0].bearing.id).toBe("PR1-BRG-01");
    expect(seats[0].bearing.height).toBe(0.2);
    expect(seats[0].position).toEqual({ x: -1.2, y: -3.0, z: 8.2 });
  });

  it("returns empty for no seats", () => {
    expect(bearingSeatsToModel("P1", undefined)).toEqual([]);
  });
});

describe("interfaceToReactions", () => {
  it("preserves reaction cases as input data", () => {
    const reactions = interfaceToReactions(SAMPLE as unknown as SupportInterfaceDoc);
    expect(reactions.supportId).toBe("PR1");
    expect(reactions.cases.map((c) => c.caseKind)).toEqual(["permanent", "liveLoad"]);
    expect(reactions.cases[0].force?.z).toBe(-3325.5);
  });
});

describe("validateSuperstructureInput", () => {
  it("passes a well-formed input", () => {
    expect(validateSuperstructureInput(SAMPLE)).toEqual([]);
  });

  it("flags missing supportId", () => {
    expect(validateSuperstructureInput({ ...SAMPLE, supportId: "" })).toHaveLength(1);
  });

  it("flags malformed bearing seats", () => {
    const issues = validateSuperstructureInput({
      ...SAMPLE,
      bearingSeats: [{ bearingId: "X" }] as never,
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("flags malformed reaction force", () => {
    const issues = validateSuperstructureInput({
      ...SAMPLE,
      reactionCases: [{ caseId: "DL", caseKind: "permanent", force: { x: 1 } }] as never,
    });
    expect(issues.length).toBeGreaterThan(0);
  });
});
