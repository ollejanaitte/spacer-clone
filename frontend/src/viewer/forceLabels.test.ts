import { describe, expect, it } from "vitest";
import { buildReactionLabel, formatForceLabel } from "./forceLabels";

describe("force labels", () => {
  it("preserves signs, units, and suppresses negative zero", () => {
    expect(formatForceLabel("FX", 12.5)).toBe("FX=12.5 kN");
    expect(formatForceLabel("FX", -12.5)).toBe("FX=-12.5 kN");
    expect(formatForceLabel("MX", -1e-15, "kN·m")).toBe("MX=0 kN·m");
  });

  it("guards non-finite values", () => {
    expect(formatForceLabel("FX", Number.NaN)).toBe("FX=-- kN");
  });

  it("selects enabled reaction components in force then moment order", () => {
    expect(buildReactionLabel(
      { fx: 1, fy: -2, fz: 3, mx: 4, my: -5, mz: 6 },
      { fx: true, fy: false, fz: true, mx: false, my: true, mz: true },
    )).toBe("RFX=1 kN  RFZ=3 kN  RMY=-5 kN·m  RMZ=6 kN·m");
  });
});
