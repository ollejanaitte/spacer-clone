import { describe, expect, it } from "vitest";
import {
  aggregateTabDiagnostics,
  layoutMode,
  totalErrors,
  totalWarnings,
} from "../visual/navigation";

describe("navigation / layout", () => {
  it("layout mode from width", () => {
    expect(layoutMode(500)).toBe("narrow");
    expect(layoutMode(800)).toBe("medium");
    expect(layoutMode(1200)).toBe("wide");
  });

  it("aggregates per-tab counts", () => {
    const agg = aggregateTabDiagnostics({
      line: { errors: 2, warnings: 1 },
      vertical: { errors: 0, warnings: 3 },
    });
    expect(agg.line).toEqual({ errors: 2, warnings: 1 });
    expect(agg.vertical).toEqual({ errors: 0, warnings: 3 });
  });

  it("totals", () => {
    const counts = {
      line: { errors: 2, warnings: 1 },
      vertical: { errors: 3, warnings: 4 },
    };
    expect(totalErrors(counts)).toBe(5);
    expect(totalWarnings(counts)).toBe(5);
  });

  it("ignores negative counts", () => {
    const agg = aggregateTabDiagnostics({ line: { errors: -1, warnings: -2 } });
    expect(agg.line.errors).toBe(0);
  });
});
