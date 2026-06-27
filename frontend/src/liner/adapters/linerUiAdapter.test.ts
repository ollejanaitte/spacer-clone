import { describe, expect, it } from "vitest";
import {
  addLinerStraightElement,
  createDefaultLinerDraft,
  removeLinerAlignmentElement,
  summarizeLinerDraft,
  updateLinerAlignmentMetadata,
  updateLinerDraftSettings,
  updateLinerStationDefinition,
  updateLinerStraightElement,
} from "./linerUiAdapter";

describe("linerUiAdapter", () => {
  it("creates a conservative local draft", () => {
    const draft = createDefaultLinerDraft();

    expect(draft.alignment.id).toBe("alignment-1");
    expect(draft.alignment.elements).toHaveLength(1);
    expect(draft.alignment.elements[0]?.type).toBe("straight");
    expect(draft.stationDefinition.interval).toBe(10);
  });

  it("updates metadata, station settings, draft settings, and straight elements immutably", () => {
    const draft = createDefaultLinerDraft();
    const metadata = updateLinerAlignmentMetadata(draft, { id: "alignment-2" });
    const station = updateLinerStationDefinition(metadata, { originDisplayedStation: 25 });
    const settings = updateLinerDraftSettings(station, { sampleInterval: 5, offsets: [-2, 0, 2] });
    const edited = updateLinerStraightElement(settings, "S1", { length: 75, startX: 10 });

    expect(draft.alignment.id).toBe("alignment-1");
    expect(metadata.alignment.id).toBe("alignment-2");
    expect(station.stationDefinition.originDisplayedStation).toBe(25);
    expect(settings.sampleInterval).toBe(5);
    expect(settings.offsets).toEqual([-2, 0, 2]);
    expect(edited.alignment.elements[0]).toMatchObject({
      id: "S1",
      length: 75,
      start: { x: 10, y: 0 },
    });
  });

  it("adds and removes straight elements while keeping at least one element", () => {
    const draft = createDefaultLinerDraft();
    const added = addLinerStraightElement(draft);
    const removed = removeLinerAlignmentElement(added, "S1");
    const retained = removeLinerAlignmentElement(removed, "S2");

    expect(added.alignment.elements.map((element) => element.id)).toEqual(["S1", "S2"]);
    expect(removed.alignment.elements.map((element) => element.id)).toEqual(["S2"]);
    expect(retained).toBe(removed);
  });

  it("summarizes raw draft values without geometry evaluation", () => {
    const draft = addLinerStraightElement(createDefaultLinerDraft());

    expect(summarizeLinerDraft(draft)).toEqual({
      elementCount: 2,
      offsetCount: 1,
      totalDeclaredLength: 150,
    });
  });
});
