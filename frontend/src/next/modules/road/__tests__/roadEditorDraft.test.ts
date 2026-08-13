import { describe, expect, it } from "vitest";
import {
  buildCanonicalRoadData,
  finalizeCanonicalRoadData,
  type CanonicalRoadData,
} from "../roadDataSchema";
import {
  buildDomainDraftFromLinerDraft,
  commitRoadEditorDraft,
  editorDraftChecksum,
  loadRoadEditorDraft,
} from "../roadEditorDraft";
import type { LinerDomainDraftVNext } from "../../../../liner/schema/types";
import type { BuildIntermediateInput } from "../../../../liner/core/pipeline/pipeline";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";

function makeDomainDraft(): LinerDomainDraftVNext {
  return {
    id: "AL-1",
    linerModelId: "road",
    coordinatePolicyId: null as unknown as string,
    alignments: [
      {
        id: "AL-1",
        name: "Test Road",
        enabled: true,
        sortIndex: 0,
        alignment: {
          id: "AL-1",
          elements: [
            { type: "straight", id: "E1", start: { x: 0, y: 0 }, azimuth: 0, length: 100 },
          ],
        },
        stationDefinition: { originDisplayedStation: 0, interval: 20 },
        verticalAlignment: { id: "VA-1", elements: [] },
        crossSections: [],
        gridDefinitions: [],
        spans: [],
        piers: [],
      },
    ],
    generationSettings: {},
    sampling: {
      display: { maxChordLength: 0.5, maxSagitta: 0.01, minSegmentsPerElement: 4 },
      dxf: { maxChordLength: 0.1, maxSagitta: 0.005, minSegmentsPerElement: 4 },
      frame: { maxMemberLength: 0.25, maxSagitta: 0.005, stationIntervalFallback: 0.25 },
    },
  };
}

function makeCanonical(): CanonicalRoadData {
  return buildCanonicalRoadData(makeDomainDraft(), { source: "new" });
}

describe("roadEditorDraft bridge (Phase 7.3 WP-B..F)", () => {
  it("loads an editor draft from canonical roadData", () => {
    const result = loadRoadEditorDraft(makeCanonical());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.alignment.elements).toHaveLength(1);
      expect(result.draft.alignment.elements[0]!.type).toBe("straight");
    }
  });

  it("round-trips a default editor draft through canonical commit", () => {
    const draft = createDefaultLinerDraft();
    const committed = commitRoadEditorDraft(draft, { source: "liner" });
    expect(committed.ok).toBe(true);
    expect(committed.canonical).toBeDefined();
    if (committed.ok && committed.canonical) {
      // Canonical must be finalizable (checksum valid).
      expect(finalizeCanonicalRoadData(committed.canonical)).not.toBeNull();
      // And loadable back to an editor draft.
      const reloaded = loadRoadEditorDraft(committed.canonical);
      expect(reloaded.ok).toBe(true);
    }
  });

  it("is deterministic: same draft -> same checksum", () => {
    const draft = createDefaultLinerDraft();
    expect(editorDraftChecksum(draft)).toBe(editorDraftChecksum(draft));
  });

  it("buildDomainDraftFromLinerDraft preserves active alignment id", () => {
    const draft = createDefaultLinerDraft();
    const domain = buildDomainDraftFromLinerDraft(draft);
    expect(domain.alignments.length).toBeGreaterThanOrEqual(1);
    expect(domain.activeAlignmentId).toBe(draft.activeAlignmentId);
  });

  it("editor changes propagate to the canonical checksum (atomic commit)", () => {
    const draft = createDefaultLinerDraft();
    const before = editorDraftChecksum(draft);
    const changed: BuildIntermediateInput = {
      ...draft,
      alignment: {
        ...draft.alignment,
        elements: [
          ...draft.alignment.elements,
          {
            type: "arc",
            id: "E-NEW",
            start: { x: 100, y: 0 },
            azimuth: 0,
            radius: 50,
            turn: "left",
            length: 50,
          },
        ],
      },
    };
    expect(editorDraftChecksum(changed)).not.toBe(before);
  });
});
