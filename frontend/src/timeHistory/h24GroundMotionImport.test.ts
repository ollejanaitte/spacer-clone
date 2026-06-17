import { describe, expect, it } from "vitest";
import {
  H24_WAVEFORM_NAMES,
  h24WaveformToSamples,
  parseH24GroundMotion,
  summarizeH24Waveform,
} from "./h24GroundMotionImport";

// A small, deterministic H24-style table used across the tests.
function buildH24Table(): string {
  const header = ["時間（秒）", ...H24_WAVEFORM_NAMES].join("\t");
  const rows: string[] = [header];
  // 5 samples at dt=0.01 s
  for (let index = 0; index < 5; index += 1) {
    const time = (index * 0.01).toFixed(2);
    const values = H24_WAVEFORM_NAMES.map((_, waveIndex) => (index * 10 + waveIndex).toFixed(2));
    rows.push([time, ...values].join("\t"));
  }
  return rows.join("\n");
}

describe("parseH24GroundMotion", () => {
  it("parses a tab-separated H24 table and detects 9 waveforms", () => {
    const result = parseH24GroundMotion(buildH24Table(), { fileName: "h24.tsv" });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.waveforms).toHaveLength(9);
    expect(result.waveforms.map((w) => w.name)).toEqual([...H24_WAVEFORM_NAMES]);
    expect(result.unit).toBe("gal");
    expect(result.timeStep).toBeCloseTo(0.01, 9);
    expect(result.duration).toBeCloseTo(0.04, 9);
    expect(result.sampleCount).toBe(5);
    expect(result.fileName).toBe("h24.tsv");
  });

  it("parses a whitespace-separated H24 table", () => {
    const header = ["時間", ...H24_WAVEFORM_NAMES].join("    ");
    const rows: string[] = [header];
    for (let index = 0; index < 4; index += 1) {
      const time = (index * 0.02).toFixed(2);
      const values = H24_WAVEFORM_NAMES.map((_, waveIndex) => String(index + waveIndex));
      rows.push([time, ...values].join(" "));
    }
    const result = parseH24GroundMotion(rows.join("\n"));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.waveforms).toHaveLength(9);
    expect(result.timeStep).toBeCloseTo(0.02, 9);
  });

  it("parses an H24 table with comma separators", () => {
    const header = ["時間（秒）", ...H24_WAVEFORM_NAMES].join(",");
    const rows: string[] = [header];
    for (let index = 0; index < 3; index += 1) {
      const time = (index * 0.01).toFixed(2);
      const values = H24_WAVEFORM_NAMES.map((_, waveIndex) => (index * 0.5 + waveIndex).toString());
      rows.push([time, ...values].join(","));
    }
    const result = parseH24GroundMotion(rows.join("\n"));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.waveforms).toHaveLength(9);
  });

  it("extracts Ⅱ-Ⅰ-１ samples correctly", () => {
    const result = parseH24GroundMotion(buildH24Table());
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    const target = result.waveforms.find((w) => w.name === "Ⅱ-Ⅰ-１");
    expect(target).toBeDefined();
    expect(target?.samples).toEqual([0, 10, 20, 30, 40]);
  });

  it("reports an error for non-finite tokens", () => {
    const header = ["時間", "wave-a", "wave-b"].join("\t");
    const rows = [header, "0.00\t1.0\t2.0", "0.01\tNaN\t3.0"].join("\n");
    const result = parseH24GroundMotion(rows);
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("non-finite-value");
    if (result.code !== "non-finite-value") return;
    expect(result.line).toBe(3);
    expect(result.column).toBe(2);
  });

  it("reports an error for inconsistent time steps", () => {
    const header = ["時間", "wave-a", "wave-b"].join("\t");
    const rows = [
      header,
      "0.00\t1.0\t2.0",
      "0.01\t1.5\t2.5",
      "0.10\t2.0\t3.0", // inconsistent
    ].join("\n");
    const result = parseH24GroundMotion(rows);
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("inconsistent-time-step");
    if (result.code !== "inconsistent-time-step") return;
    expect(result.line).toBe(4);
  });

  it("reports an error for an empty file", () => {
    const result = parseH24GroundMotion("");
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.code).toBe("empty-file");
  });

  it("ignores empty lines and # comment lines", () => {
    const header = ["時間", "wave-a", "wave-b"].join("\t");
    const rows = [
      "# comment line",
      "",
      header,
      "",
      "0.00\t1.0\t2.0",
      "0.01\t1.5\t2.5",
    ].join("\n");
    const result = parseH24GroundMotion(rows);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.waveforms).toHaveLength(2);
    expect(result.sampleCount).toBe(2);
  });
});

describe("summarizeH24Waveform", () => {
  it("returns max, min, absMax, sampleCount, timeStep, duration", () => {
    const summary = summarizeH24Waveform(
      { name: "Ⅱ-Ⅰ-１", samples: [-3, 1, 5, -8, 2] },
      0.01,
      0.04,
    );
    expect(summary.name).toBe("Ⅱ-Ⅰ-１");
    expect(summary.sampleCount).toBe(5);
    expect(summary.timeStep).toBe(0.01);
    expect(summary.duration).toBe(0.04);
    expect(summary.max).toBe(5);
    expect(summary.min).toBe(-8);
    expect(summary.absMax).toBe(8);
  });
});

describe("h24WaveformToSamples", () => {
  it("returns a copy of the samples array", () => {
    const original = { name: "Ⅱ-Ⅰ-１", samples: [1, 2, 3] };
    const samples = h24WaveformToSamples(original);
    expect(samples).toEqual([1, 2, 3]);
    // mutating the copy must not affect the original
    samples.push(4);
    expect(original.samples).toEqual([1, 2, 3]);
  });
});
