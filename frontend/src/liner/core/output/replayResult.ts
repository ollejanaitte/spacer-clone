/**
 * O-OUTPUT / O-REPLAY view model (STEP-3 S3-UX06).
 *
 * TS mirror of the Step2 replay_runner result contract so the UI can render
 * Golden Master comparisons (PASS / KNOWN / DEFERRED / FAIL) with the same
 * semantics. Also provides small table helpers used by the output UI
 * (element / key-point / station / vertical / crossfall / bridge tables).
 *
 * No expected values are generated here; they come from project fixtures.
 */

export type ReplayVerdict = "PASS" | "KNOWN" | "DEFERRED" | "FAIL";

export interface ReplayComparison {
  field: string;
  expected: number;
  actual: number;
  tolerance: number;
  verdict: ReplayVerdict;
  reason?: string;
}

export interface ReplayResult {
  project: string;
  name: string;
  verdict: ReplayVerdict;
  comparisons: ReplayComparison[];
  errors: string[];
}

export type OutputTableRow = {
  /** stable id for table <-> diagram link (UX-P05). */
  rowId?: string;
  cells: (string | number)[];
};

export type OutputTable = {
  title: string;
  columns: string[];
  rows: OutputTableRow[];
};

/** Verdict color used by the O-REPLAY UI. */
export function verdictColor(verdict: ReplayVerdict): string {
  switch (verdict) {
    case "PASS":
      return "#16a34a";
    case "KNOWN":
      return "#0891b2";
    case "DEFERRED":
      return "#ca8a04";
    case "FAIL":
      return "#dc2626";
  }
}

/** Summary counts across a replay result set. */
export function replaySummary(results: ReplayResult[]): {
  pass: number;
  known: number;
  deferred: number;
  fail: number;
} {
  const summary = { pass: 0, known: 0, deferred: 0, fail: 0 };
  for (const result of results) {
    if (result.verdict === "PASS") summary.pass += 1;
    else if (result.verdict === "KNOWN") summary.known += 1;
    else if (result.verdict === "DEFERRED") summary.deferred += 1;
    else summary.fail += 1;
  }
  return summary;
}

/** True when the row has a FAIL comparison (for highlighting). */
export function rowHasFail(comparison: ReplayComparison): boolean {
  return comparison.verdict === "FAIL";
}
