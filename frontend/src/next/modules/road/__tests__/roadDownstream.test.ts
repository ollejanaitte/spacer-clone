import { describe, expect, it } from "vitest";
import { buildCanonicalRoadData, type CanonicalRoadData } from "../roadDataSchema";
import { evaluateRoadChangeImpact } from "../roadDownstream";
import type { LinerDomainDraftVNext } from "../../../../liner/schema/types";

function makeDraft(lines: string[]): LinerDomainDraftVNext {
  return {
    id: "AL-1",
    linerModelId: "road",
    coordinatePolicyId: null as unknown as string,
    alignments: lines.map((lineId, i) => ({
      id: `AL-${i}`,
      name: `AL-${i}`,
      enabled: true,
      sortIndex: i,
      alignment: { id: `H-${i}`, elements: [] },
      stationDefinition: { originDisplayedStation: 0, interval: 20 },
      verticalAlignment: { id: `VA-${i}`, elements: [] },
      crossSections: [],
      gridDefinitions: [],
      spans: [],
      piers: [],
      lines: [{ id: lineId, label: lineId, offset: i * 3 }],
    })),
    generationSettings: {},
    sampling: {
      display: { maxChordLength: 0.5, maxSagitta: 0.01, minSegmentsPerElement: 4 },
      dxf: { maxChordLength: 0.1, maxSagitta: 0.005, minSegmentsPerElement: 4 },
      frame: { maxMemberLength: 0.25, maxSagitta: 0.005, stationIntervalFallback: 0.25 },
    },
  };
}

function makeCanonical(lines: string[]): CanonicalRoadData {
  return buildCanonicalRoadData(makeDraft(lines), { source: "new" });
}

describe("roadDownstream (Phase 7.3 WP-J)", () => {
  it("no_impact when checksum is unchanged", () => {
    const canonical = makeCanonical(["LINE-1"]);
    const impact = evaluateRoadChangeImpact({
      current: canonical,
      binding: { roadChecksum: canonical.contentChecksum, referencedLineIds: ["LINE-1"] },
    });
    expect(impact).toBe("no_impact");
  });

  it("stale when checksum changed and lines still exist", () => {
    const before = makeCanonical(["LINE-1"]);
    const after = makeCanonical(["LINE-1", "LINE-2"]);
    const impact = evaluateRoadChangeImpact({
      current: after,
      binding: { roadChecksum: before.contentChecksum, referencedLineIds: ["LINE-1"] },
    });
    expect(impact).toBe("stale");
  });

  it("invalid when a referenced line no longer exists (fail-closed)", () => {
    const before = makeCanonical(["LINE-1", "LINE-2"]);
    const after = makeCanonical(["LINE-1"]);
    const impact = evaluateRoadChangeImpact({
      current: after,
      binding: { roadChecksum: before.contentChecksum, referencedLineIds: ["LINE-2"] },
    });
    expect(impact).toBe("invalid");
  });
});
