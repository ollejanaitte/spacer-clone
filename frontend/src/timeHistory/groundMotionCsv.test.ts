import { describe, expect, it } from "vitest";
import { parseGroundMotionCsv } from "./groundMotionCsv";

describe("parseGroundMotionCsv", () => {
  it("imports a one-column CSV with a header", () => {
    const text = [
      "acceleration",
      "0.0",
      "12.3",
      "-5.2",
    ].join("\n");
    const result = parseGroundMotionCsv(text, { existingTimeStep: 0.05 });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.columns).toBe(1);
    expect(result.samples).toEqual([0.0, 12.3, -5.2]);
    expect(result.timeStep).toBe(0.05);
    expect(result.sampleCount).toBe(3);
  });

  it("imports a one-column CSV without a header", () => {
    const text = ["0.0", "12.3", "-5.2"].join("\n");
    const result = parseGroundMotionCsv(text, { existingTimeStep: 0.01 });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.columns).toBe(1);
    expect(result.samples).toEqual([0.0, 12.3, -5.2]);
    expect(result.timeStep).toBe(0.01);
  });

  it("imports a two-column CSV and estimates the time step", () => {
    const text = [
      "time,acceleration",
      "0.00,0.0",
      "0.05,12.3",
      "0.10,-5.2",
    ].join("\n");
    const result = parseGroundMotionCsv(text);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.columns).toBe(2);
    expect(result.samples).toEqual([0.0, 12.3, -5.2]);
    expect(result.timeStep).toBeCloseTo(0.05, 9);
  });

  it("ignores empty lines and `#` comment lines", () => {
    const text = [
      "# header comment",
      "time,acceleration",
      "",
      "0.00,0.0",
      "  ",
      "# inline comment",
      "0.05,12.3",
      "0.10,-5.2",
    ].join("\n");
    const result = parseGroundMotionCsv(text);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.samples).toEqual([0.0, 12.3, -5.2]);
    expect(result.timeStep).toBeCloseTo(0.05, 9);
  });

  it("rejects non-numeric acceleration values", () => {
    const text = ["time,acceleration", "0.00,0.0", "0.05,NaN"].join("\n");
    const result = parseGroundMotionCsv(text);
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("non-finite-value");
  });

  it("rejects inconsistent time steps", () => {
    const text = [
      "time,acceleration",
      "0.00,0.0",
      "0.05,12.3",
      "0.20,-5.2",
    ].join("\n");
    const result = parseGroundMotionCsv(text);
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("inconsistent-time-step");
  });

  it("rejects an empty file", () => {
    const result = parseGroundMotionCsv("");
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("empty-file");
  });

  it("rejects a file with only comments", () => {
    const result = parseGroundMotionCsv("# only comment\n# more comments\n");
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("empty-file");
  });

  it("rejects a CSV with an unsupported column count", () => {
    const text = ["a,b,c", "1,2,3"].join("\n");
    const result = parseGroundMotionCsv(text);
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("unsupported-column-count");
  });

  it("rejects a header-only two-column CSV", () => {
    const text = ["time,acceleration"].join("\n");
    const result = parseGroundMotionCsv(text);
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("no-numeric-samples");
  });

  it("rejects a single-row two-column CSV without enough data to estimate dt", () => {
    const text = ["time,acceleration", "0.0,1.0"].join("\n");
    const result = parseGroundMotionCsv(text);
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("no-numeric-samples");
  });

  it("rejects non-finite numeric tokens in a one-column CSV", () => {
    const text = ["0.0", "12.3", "Infinity"].join("\n");
    const result = parseGroundMotionCsv(text, { existingTimeStep: 0.05 });
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("non-finite-value");
  });
});
