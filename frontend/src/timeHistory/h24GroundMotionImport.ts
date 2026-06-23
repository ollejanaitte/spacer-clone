// H24 road bridge ground motion importer for the Time History preview UI.
//
// This module parses the H24-style ground motion file format used by
// the Japan Road Association "Specifications for Highway Bridges, H24
// edition" (道路橋示方書・同解説, Heisei 24) for dynamic analysis.
// Each file has the time column as the first column, followed by
// multiple acceleration waveforms recorded at the same time grid.
//
// The importer supports:
// - file import and textarea paste import (the caller passes a string)
// - comma, tab, and multiple-space separators
// - Excel-style table paste (mixed whitespace)
// - empty lines and `#` comment lines
// - 9 waveform columns: Ⅱ-Ⅰ-１ .. Ⅱ-Ⅲ-３
// - optional header row whose first column is "時間", "時間（秒）",
//   "time", or "Time"
//
// Unit is always gal (cm/s^2). The backend converts gal to m/s^2
// during analysis; the importer never performs unit conversion.

import type { GroundMotionUnit } from "../types/timeHistory";

export const H24_WAVEFORM_NAMES = [
  "Ⅱ-Ⅰ-１",
  "Ⅱ-Ⅰ-２",
  "Ⅱ-Ⅰ-３",
  "Ⅱ-Ⅱ-１",
  "Ⅱ-Ⅱ-２",
  "Ⅱ-Ⅱ-３",
  "Ⅱ-Ⅲ-１",
  "Ⅱ-Ⅲ-２",
  "Ⅱ-Ⅲ-３",
] as const;

export type H24WaveformName = (typeof H24_WAVEFORM_NAMES)[number];

export type H24WaveformSeries = {
  /** Waveform name (column header). */
  name: string;
  /** Acceleration samples in gal. */
  samples: number[];
};

export type H24ParseSuccess = {
  kind: "ok";
  /** Estimated time step in seconds. */
  timeStep: number;
  /** Duration in seconds (time of the last sample). */
  duration: number;
  /** All detected waveform series in column order. */
  waveforms: H24WaveformSeries[];
  /** Source file name (echoed back to the caller). */
  fileName?: string;
  /** Number of numeric samples per waveform. */
  sampleCount: number;
  /** Unit of the parsed samples. Always "gal" for the H24 format. */
  unit: GroundMotionUnit;
};

export type H24ParseError =
  | { kind: "error"; code: "empty-file" }
  | { kind: "error"; code: "no-numeric-samples" }
  | { kind: "error"; code: "non-finite-value"; line: number; column: number; token: string }
  | { kind: "error"; code: "inconsistent-time-step"; line: number; detail: string }
  | { kind: "error"; code: "missing-time-column"; detail: string };

export type H24ParseResult = H24ParseSuccess | H24ParseError;

export type H24ParseOptions = {
  /** Source file name echoed back in the success result. */
  fileName?: string;
  /** Time step tolerance in seconds (default 1e-9). */
  timeStepTolerance?: number;
};

const DEFAULT_TIME_STEP_TOLERANCE = 1e-9;
const ACCEPTED_TIME_HEADERS = new Set(["時間", "時間（秒）", "time", "Time"]);

/**
 * Parse the textual contents of an H24-style ground motion file.
 *
 * The parser tolerates mixed whitespace (single space, multiple
 * spaces, tab) and a leading header row. The first column must be a
 * time column; all remaining columns are acceleration waveforms.
 */
export function parseH24GroundMotion(text: string, options: H24ParseOptions = {}): H24ParseResult {
  const tolerance = options.timeStepTolerance ?? DEFAULT_TIME_STEP_TOLERANCE;
  const rawLines = text.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const raw of rawLines) {
    const line = raw.trim();
    if (line === "") continue;
    if (line.startsWith("#")) continue;
    dataLines.push(line);
  }
  if (dataLines.length === 0) {
    return { kind: "error", code: "empty-file" };
  }

  // Tokenize. Accept comma, tab, and any run of whitespace as a separator.
  const splitRow = (line: string): string[] => {
    if (line.includes(",")) {
      return line.split(",").map((token) => token.trim());
    }
    if (line.includes("\t")) {
      return line.split("\t").map((token) => token.trim());
    }
    // mixed whitespace: collapse runs of spaces / tabs
    return line.split(/\s+/).map((token) => token.trim()).filter((token) => token !== "");
  };

  const rows: string[][] = dataLines.map(splitRow);

  // Detect a leading header row: the first row contains at least one
  // non-numeric token (typically a label like the Japanese "時間" time header).
  const isNumericRow = (row: string[]): boolean => row.every((token) => Number.isFinite(Number(token)));
  const firstRowIsHeader = !isNumericRow(rows[0]);
  let headerRow: string[] | null = null;
  let dataRows: string[][];
  if (firstRowIsHeader) {
    headerRow = rows[0];
    dataRows = rows.slice(1);
  } else {
    dataRows = rows;
  }

  if (dataRows.length === 0) {
    return { kind: "error", code: "no-numeric-samples" };
  }

  // Validate the time column header when a header is present.
  if (headerRow) {
    const timeHeader = headerRow[0];
    if (!ACCEPTED_TIME_HEADERS.has(timeHeader)) {
      return {
        kind: "error",
        code: "missing-time-column",
        detail: `Expected first column header to be one of: ${[...ACCEPTED_TIME_HEADERS].join(", ")}. Got "${timeHeader}".`,
      };
    }
  }

  const columnCount = dataRows[0].length;
  if (columnCount < 2) {
    return {
      kind: "error",
      code: "missing-time-column",
      detail: `Expected at least 2 columns (time + 1 waveform). Got ${columnCount}.`,
    };
  }
  for (const row of dataRows) {
    if (row.length !== columnCount) {
      return {
        kind: "error",
        code: "inconsistent-time-step",
        line: 0,
        detail: `Inconsistent column count: expected ${columnCount}, got ${row.length}.`,
      };
    }
  }

  // Build the numeric rows.
  type NumericRow = { time: number; values: number[]; line: number };
  const numericRows: NumericRow[] = [];
  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index];
    const originalLine = firstRowIsHeader ? index + 2 : index + 1;
    const numbers: number[] = [];
    for (let column = 0; column < row.length; column += 1) {
      const value = Number(row[column]);
      if (!Number.isFinite(value)) {
        return {
          kind: "error",
          code: "non-finite-value",
          line: originalLine,
          column: column + 1,
          token: row[column],
        };
      }
      numbers.push(value);
    }
    numericRows.push({ time: numbers[0], values: numbers.slice(1), line: originalLine });
  }

  if (numericRows.length < 2) {
    return { kind: "error", code: "no-numeric-samples" };
  }

  // Validate uniform time step.
  const referenceStep = numericRows[1].time - numericRows[0].time;
  if (!Number.isFinite(referenceStep) || referenceStep <= 0) {
    return {
      kind: "error",
      code: "inconsistent-time-step",
      line: numericRows[1].line,
      detail: `Reference time step is not positive (${referenceStep}).`,
    };
  }
  for (let index = 1; index < numericRows.length; index += 1) {
    const step = numericRows[index].time - numericRows[index - 1].time;
    if (!Number.isFinite(step) || step <= 0) {
      return {
        kind: "error",
        code: "inconsistent-time-step",
        line: numericRows[index].line,
        detail: `Non-positive or non-finite time delta at sample ${index}.`,
      };
    }
    if (Math.abs(step - referenceStep) > tolerance) {
      return {
        kind: "error",
        code: "inconsistent-time-step",
        line: numericRows[index].line,
        detail: `Time step ${step.toExponential(3)} differs from reference ${referenceStep.toExponential(3)}.`,
      };
    }
  }

  const waveformCount = columnCount - 1;
  const waveforms: H24WaveformSeries[] = [];
  for (let waveIndex = 0; waveIndex < waveformCount; waveIndex += 1) {
    const headerName = headerRow?.[waveIndex + 1];
    const name =
      typeof headerName === "string" && headerName !== ""
        ? headerName
        : H24_WAVEFORM_NAMES[waveIndex] ?? `wave-${waveIndex + 1}`;
    const samples = numericRows.map((entry) => entry.values[waveIndex]);
    waveforms.push({ name, samples });
  }

  const lastTime = numericRows[numericRows.length - 1].time;
  const firstTime = numericRows[0].time;
  const duration = Math.max(0, lastTime - firstTime);
  const sampleCount = numericRows.length;
  return {
    kind: "ok",
    timeStep: referenceStep,
    duration,
    waveforms,
    sampleCount,
    unit: "gal",
    fileName: options.fileName,
  };
}

/**
 * Compute a small summary for a single waveform series. The summary
 * is intended for display in the H24 import UI and is intentionally
 * cheap: a single pass over the samples.
 */
export type H24WaveformSummary = {
  name: string;
  sampleCount: number;
  timeStep: number;
  duration: number;
  max: number;
  min: number;
  absMax: number;
};

export function summarizeH24Waveform(
  series: H24WaveformSeries,
  timeStep: number,
  duration: number,
): H24WaveformSummary {
  let max = -Infinity;
  let min = Infinity;
  for (const value of series.samples) {
    if (!Number.isFinite(value)) continue;
    if (value > max) max = value;
    if (value < min) min = value;
  }
  if (!Number.isFinite(max)) max = 0;
  if (!Number.isFinite(min)) min = 0;
  const absMax = Math.max(Math.abs(max), Math.abs(min));
  return {
    name: series.name,
    sampleCount: series.samples.length,
    timeStep,
    duration,
    max,
    min,
    absMax,
  };
}

/**
 * Convert a H24 waveform series into a plain `samples` array suitable
 * for a single `groundMotions[]` record. The caller is responsible
 * for assigning the resulting samples to the project ground motion.
 */
export function h24WaveformToSamples(series: H24WaveformSeries): number[] {
  return series.samples.slice();
}
