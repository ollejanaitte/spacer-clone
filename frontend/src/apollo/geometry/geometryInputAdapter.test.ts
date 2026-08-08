import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CommonModelGeometryInputAdapter } from "./geometryInputAdapter";

const FIXTURE = resolve(
  process.cwd(),
  "../docs/apollo/step10/reference_bridge_001/phase5/fixtures/reference_bridge_001_common_model.json",
);

function loadFixture(): unknown {
  return JSON.parse(readFileSync(FIXTURE, "utf-8"));
}

describe("CommonModelGeometryInputAdapter (Phase 6-1B)", () => {
  it("extracts entity IDs from the Reference Bridge 001 fixture without geometry calculation", () => {
    const input = new CommonModelGeometryInputAdapter().adapt(loadFixture());
    expect(input.bridgeId.length).toBeGreaterThan(0);
    expect(input.sourceModelVersion).toBe("1.0.0");
    expect(input.alignmentIds).toContain("ALN-ACL");
    expect(input.supports.map((s) => s.id)).toEqual([
      "SUP-AR2",
      "SUP-PR1",
      "SUP-PR2",
      "SUP-PU15",
    ]);
    expect(input.girders.map((g) => g.id)).toEqual(["GIRDER-AG1", "GIRDER-AG2"]);
    expect(input.gridPointIds).toContain("GRID-1001");
    expect(input.gridPointIds).toContain("GRID-2027");
    expect(input.deckIds).toContain("DECK-01");
    expect(input.sectionIds.length).toBeGreaterThan(0);
  });

  it("preserves resolution states on entities", () => {
    const input = new CommonModelGeometryInputAdapter().adapt(loadFixture());
    for (const support of input.supports) {
      expect(support.state).toBe("CONFIRMED");
    }
    const gridPoint = input.gridPointIds;
    expect(gridPoint).toContain("GRID-1001");
  });

  it("propagates HCR / conflict / HOLD / NOT_AVAILABLE from the resolution registry", () => {
    const input = new CommonModelGeometryInputAdapter().adapt(loadFixture());
    const kinds = Object.fromEntries(input.unresolved.map((u) => [u.kind, u.id]));
    expect(kinds.CONFLICT).toBe("CONF-P2II-001");
    expect(kinds.HCR).toBe("HCR-001");
    expect(kinds.NOT_AVAILABLE).toBe("analysisReference");
    expect(input.unresolved.some((u) => u.kind === "HOLD")).toBe(true);
    const conflict = input.unresolved.find((u) => u.kind === "CONFLICT");
    expect(conflict?.affectedEntityIds.length).toBeGreaterThan(0);
  });

  it("never performs geometry calculation or invents numeric values", () => {
    const input = new CommonModelGeometryInputAdapter().adapt(loadFixture());
    // no adapter-computed coordinates; only extracted ids and preserved states
    for (const support of input.supports) {
      expect(support.stationM).toBeUndefined();
      expect(support.skewRad).toBeUndefined();
    }
    for (const girder of input.girders) {
      expect(girder.offsetM).toBeUndefined();
    }
  });

  it("handles an empty model without throwing", () => {
    const input = new CommonModelGeometryInputAdapter().adapt({});
    expect(input.alignmentIds).toEqual([]);
    expect(input.supports).toEqual([]);
    expect(input.unresolved).toEqual([]);
  });
});
