import { describe, expect, it } from "vitest";
import { renderCrossSection } from "../cross-section/CrossSectionRenderer";
import { createSampleSection } from "../__tests__/fixtures/sampleProject";

describe("CrossSectionRenderer", () => {
  it("renders drawable cross section points", () => {
    const section = createSampleSection("bridge-1");
    const result = renderCrossSection(section);
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.renderability.crossSection).not.toBe("blocked");
    expect(result.points.some((point) => point.kind === "normal")).toBe(true);
  });
});
