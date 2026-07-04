import { describe, expect, it } from "vitest";
import { calculateSectionInputRate, parseAngleNotation, parseNumericInput } from "../utils/importerUtils";
import { createSampleSection } from "../__tests__/fixtures/sampleProject";

describe("sectionEditorHooks helpers", () => {
  it("parses numeric and angle inputs", () => {
    const numeric = parseNumericInput("12.345");
    expect(numeric?.value).toBe(12.345);

    const stars = parseNumericInput("********");
    expect(stars?.flags.notComputed).toBe(true);

    const angle = parseAngleNotation("109-58-28.3");
    expect(angle?.decimalDeg).toBeCloseTo(109.9745278, 4);
  });

  it("calculates section input rate", () => {
    const section = createSampleSection("bridge-1");
    const rate = calculateSectionInputRate(section);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(100);
  });
});
