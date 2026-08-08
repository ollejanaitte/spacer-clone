import { describe, expect, it } from "vitest";
import {
  replaySummary,
  rowHasFail,
  verdictColor,
} from "../output/replayResult";
import type { ReplayResult } from "../output/replayResult";

function result(verdict: ReplayResult["verdict"]): ReplayResult {
  return { project: "x", name: "x", verdict, comparisons: [], errors: [] };
}

describe("replayResult", () => {
  it("verdict colors", () => {
    expect(verdictColor("PASS")).toBe("#16a34a");
    expect(verdictColor("FAIL")).toBe("#dc2626");
    expect(verdictColor("KNOWN")).toBe("#0891b2");
    expect(verdictColor("DEFERRED")).toBe("#ca8a04");
  });

  it("summary counts", () => {
    const summary = replaySummary([
      result("PASS"),
      result("PASS"),
      result("KNOWN"),
      result("DEFERRED"),
      result("FAIL"),
    ]);
    expect(summary).toEqual({ pass: 2, known: 1, deferred: 1, fail: 1 });
  });

  it("rowHasFail", () => {
    expect(rowHasFail({ field: "x", expected: 1, actual: 2, tolerance: 0, verdict: "FAIL" })).toBe(true);
    expect(rowHasFail({ field: "x", expected: 1, actual: 1, tolerance: 0, verdict: "PASS" })).toBe(false);
  });
});
