import { describe, expect, it } from "vitest";
import { buildReactionLabel, formatForceLabel } from "./forceLabels";

describe("force labels", () => {
  it("preserves signs and suppresses negative zero", () => {
    expect(formatForceLabel("FX", 12.5)).toBe("FX=12.5");
    expect(formatForceLabel("FX", -12.5)).toBe("FX=-12.5");
    expect(formatForceLabel("FX", -1e-15)).toBe("FX=0");
  });

  it("guards non-finite values", () => {
    expect(formatForceLabel("FX", Number.NaN)).toBe("FX=--");
  });

  it("selects enabled reaction components in XYZ order", () => {
    expect(buildReactionLabel(
      { fx: 1, fy: -2, fz: 3 },
      { fx: true, fy: false, fz: true },
    )).toBe("RFX=1  RFZ=3");
  });
});
