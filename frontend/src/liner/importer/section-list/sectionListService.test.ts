import { describe, expect, it } from "vitest";
import {
  addSection,
  bulkCreateSectionsByPdfPages,
  buildSectionListSummaries,
  duplicatePreviousSection,
  removeSection,
} from "./sectionListService";
import { createSampleBridge } from "../__tests__/fixtures/sampleProject";

describe("sectionListService", () => {
  it("adds, duplicates, bulk creates, and summarizes sections", () => {
    let bridge = createSampleBridge();
    expect(bridge.sections).toHaveLength(1);

    bridge = addSection(bridge);
    expect(bridge.sections).toHaveLength(2);

    bridge = duplicatePreviousSection(bridge);
    expect(bridge.sections).toHaveLength(3);

    bridge = bulkCreateSectionsByPdfPages(bridge, 1, 3);
    expect(bridge.sections.length).toBeGreaterThanOrEqual(3);

    bridge = removeSection(bridge, bridge.sections[0]!.id);
    const summaries = buildSectionListSummaries(bridge);
    expect(summaries.length).toBe(bridge.sections.length);
    expect(summaries[0]?.inputRate).toBeGreaterThanOrEqual(0);
  });
});
