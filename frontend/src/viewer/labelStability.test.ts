import { describe, expect, it } from "vitest";
import { labelSamplingStride, MAX_VISIBLE_MODEL_LABELS } from "./threeUtils";

describe("viewer label stability", () => {
  it.each([
    [10, 1],
    [200, 1],
    [1001, 5],
  ])("selects a bounded stride for %i labels", (count, expectedStride) => {
    expect(labelSamplingStride(count)).toBe(expectedStride);
    expect(Math.ceil(count / labelSamplingStride(count))).toBeLessThanOrEqual(MAX_VISIBLE_MODEL_LABELS);
  });

  it("remains deterministic through 100 label on/off rebuild decisions", () => {
    for (let toggle = 0; toggle < 100; toggle += 1) {
      const count = toggle % 2 === 0 ? 1200 : 0;
      const stride = labelSamplingStride(count);
      expect(stride).toBeGreaterThanOrEqual(1);
      if (count > 0) expect(Math.ceil(count / stride)).toBeLessThanOrEqual(MAX_VISIBLE_MODEL_LABELS);
    }
  });
});
