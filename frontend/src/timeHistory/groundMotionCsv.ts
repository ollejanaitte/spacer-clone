// Ground motion CSV parser for the Time History preview UI.
//
// This module is intentionally limited to the MVP. It only accepts
// comma-separated values, supports a single column of acceleration
// samples or a two-column "time,acceleration" layout, and tolerates an
// optional header row and `#`-prefixed comment lines.
//
// The parser does not mutate any project payload and does not perform
// any analysis. Callers receive either a fully validated
// { kind: "ok", timeStep, samples, ... } result or a discriminated
// { kind: "error", code } error that the UI can render as an i18n
// message.

export type GroundMotionCsvColumnCount = 1 | 2;

export type GroundMotionCsvParseSuccess = {
  kind: "ok";
  /** Estimated or explicit time step in seconds. */
  timeStep: number;
  /** Acceleration samples parsed from the CSV. */
  samples: number[];
  /** Number of columns detected in the CSV. */
  columns: GroundMotionCsvColumnCount;
  /** Optional source file name, echoed back to the caller. */
  fileName?: string;
  /** Number of numeric samples written to `samples`. */
  sampleCount: number;
};

export type GroundMotionCsvParseError =
  | { kind: "error"; code: "empty-file" }
  | { kind: "error"; code: "no-numeric-samples" }
  | { kind: "error"; code: "non-finite-value"; line: number; token: string }
  | { kind: "error"; code: "inconsistent-time-step"; line: number; detail: string }
  | { kind: "error"; code: "unsupported-column-count"; detail: string };

export type GroundMotionCsvParseResult = GroundMotionCsvParseSuccess | GroundMotionCsvParseError;

export type GroundMotionCsvParseOptions = {
  /** Existing time step to use as a reference when the CSV is a single column. */
  existingTimeStep?: number;
  /** Maximum number of columns accepted (default: 2). */
  maxColumns?: number;
  /** Tolerance for time step consistency in seconds (default: 1e-9). */
  timeStepTolerance?: number;
};

const DEFAULT_MAX_COLUMNS = 2;
const DEFAULT_TIME_STEP_TOLERANCE = 1e-9;

/**
 * Parse the textual contents of a ground motion CSV file.
 *
 * The parser accepts:
 *
 * 1. A single column of acceleration values, with an optional header
 *    row. The time step is inherited from `options.existingTimeStep`
 *    when present and the CSV does not carry a time column.
 * 2. A two-column "time,acceleration" layout, with an optional header
 *    row. The time step is estimated from the time column.
 *
 * Empty lines and lines beginning with `#` are ignored. All values must
 * be finite numbers. The time step in a two-column CSV must be uniform
 * within `timeStepTolerance`.
 */
export function parseGroundMotionCsv(
  text: string,
  options: GroundMotionCsvParseOptions = {},
): GroundMotionCsvParseResult {
  const maxColumns = options.maxColumns ?? DEFAULT_MAX_COLUMNS;
  const tolerance = options.timeStepTolerance ?? DEFAULT_TIME_STEP_TOLERANCE;

  const lines = text.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;
    if (line.startsWith("#")) continue;
    dataLines.push(line);
  }

  if (dataLines.length === 0) {
    return { kind: "error", code: "empty-file" };
  }

  const rows: string[][] = dataLines.map((line) => line.split(",").map((token) => token.trim()));
  const columnCount = rows[0].length;

  if (columnCount < 1 || columnCount > maxColumns) {
    return {
      kind: "error",
      code: "unsupported-column-count",
      detail: `Found ${columnCount} column(s); expected 1 or ${maxColumns}.`,
    };
  }

  for (const row of rows) {
    if (row.length !== columnCount) {
      return {
        kind: "error",
        code: "unsupported-column-count",
        detail: `Inconsistent column count: expected ${columnCount}, got ${row.length}.`,
      };
    }
  }

  // Detect an optional header row. A header row is any first row whose
  // tokens are not all finite numbers.
  const firstRowNumbers = rows[0].map((token) => Number(token));
  const firstRowIsNumeric = firstRowNumbers.every((value) => Number.isFinite(value));
  const dataRows = firstRowIsNumeric ? rows : rows.slice(1);

  if (dataRows.length === 0) {
    return { kind: "error", code: "no-numeric-samples" };
  }

  type NumericRow = { time: number; acceleration: number; line: number };
  const numericRows: NumericRow[] = [];
  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index];
    const originalLine = firstRowIsNumeric ? index + 1 : index + 2;
    const numbers = row.map((token) => Number(token));
    for (let column = 0; column < numbers.length; column += 1) {
      const value = numbers[column];
      if (!Number.isFinite(value)) {
        return {
          kind: "error",
          code: "non-finite-value",
          line: originalLine,
          token: row[column],
        };
      }
    }
    if (columnCount === 1) {
      numericRows.push({ time: index, acceleration: numbers[0], line: originalLine });
    } else {
      numericRows.push({ time: numbers[0], acceleration: numbers[1], line: originalLine });
    }
  }

  if (numericRows.length === 0) {
    return { kind: "error", code: "no-numeric-samples" };
  }

  const samples = numericRows.map((entry) => entry.acceleration);

  if (columnCount === 2) {
    if (numericRows.length < 2) {
      return { kind: "error", code: "no-numeric-samples" };
    }
    const referenceStep = numericRows[1].time - numericRows[0].time;
    if (!Number.isFinite(referenceStep) || referenceStep <= 0) {
      return {
        kind: "error",
        code: "inconsistent-time-step",
        line: numericRows[1].line,
        detail: `Reference time step is not positive or not finite.`,
      };
    }
    for (let index = 1; index < numericRows.length; index += 1) {
      const previous = numericRows[index - 1].time;
      const current = numericRows[index].time;
      const step = current - previous;
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
    return {
      kind: "ok",
      columns: 2,
      timeStep: referenceStep,
      samples,
      sampleCount: samples.length,
    };
  }

  // Single column: the existing time step is used as-is. The UI is
  // responsible for re-estimating the time step from a fresh CSV when
  // needed.
  const existing = options.existingTimeStep;
  const timeStep = typeof existing === "number" && Number.isFinite(existing) && existing > 0
    ? existing
    : 0;
  return {
    kind: "ok",
    columns: 1,
    timeStep,
    samples,
    sampleCount: samples.length,
  };
}

/**
 * Read a `File` object as UTF-8 text. Rejects with the original
 * `FileReader` error if the file cannot be read.
 */
export function readGroundMotionCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Unable to read file as text."));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("File read error."));
    };
    reader.readAsText(file);
  });
}
