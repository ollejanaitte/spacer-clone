import { describe, expect, it } from "vitest";
import {
  chooseEngineeringScale,
  finiteDomain,
  formatEngineeringValue,
  formatExponentialTick,
} from "./chartScale";

describe("time-history chart scaling", () => {
  it("uses micro scaling for 1e-5 displacement responses", () => {
    const scale = chooseEngineeringScale(1.08e-5);
    expect(scale).toEqual({ factor: 1e6, prefix: "μ" });
    expect(formatEngineeringValue(1.08e-5, scale)).toBe("10.8μ");
  });

  it("keeps acceleration near one in base units", () => {
    expect(chooseEngineeringScale(0.95)).toEqual({ factor: 1e3, prefix: "m" });
    expect(formatExponentialTick(0.95)).toBe("9.50e-1");
  });

  it("expands a constant finite domain", () => {
    const [min, max] = finiteDomain([1e-6, 1e-6]);
    expect(min).toBeLessThan(1e-6);
    expect(max).toBeGreaterThan(1e-6);
  });
});
