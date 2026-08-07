import type {
  ComparisonResult,
  ComparisonVerdict,
  RejectedReason,
  R1CoordinateSystem,
  R1Unit,
  TolerancePolicy,
} from "./types";
import { areUnitsComparable } from "./units";

const EPSILON = Number.EPSILON;

function reject(reason: RejectedReason, expected: number, actual: number): ComparisonResult {
  return {
    verdict: "REJECTED",
    rejectedReason: reason,
    expected,
    actual,
    difference: actual - expected,
    reason: `comparison rejected: ${reason}`,
  };
}

export function isFiniteTolerance(policy: TolerancePolicy): boolean {
  if (policy.absolute !== undefined && !Number.isFinite(policy.absolute)) return false;
  if (policy.relative !== undefined && !Number.isFinite(policy.relative)) return false;
  if (policy.absolute !== undefined && policy.absolute < 0) return false;
  if (policy.relative !== undefined && policy.relative < 0) return false;
  return true;
}

export function compareWithPolicy(
  expected: number,
  actual: number,
  policy: TolerancePolicy,
): ComparisonResult {
  if (!Number.isFinite(expected)) {
    return Number.isNaN(expected) ? reject("nan", expected, actual) : reject("infinity", expected, actual);
  }
  if (!Number.isFinite(actual)) {
    return Number.isNaN(actual) ? reject("nan", expected, actual) : reject("infinity", expected, actual);
  }
  if (!isFiniteTolerance(policy)) {
    return reject("nan", expected, actual);
  }

  const difference = actual - expected;

  if (policy.exact === true) {
    return difference === 0
      ? { verdict: "PASS", expected, actual, difference }
      : { verdict: "FAIL", expected, actual, difference };
  }

  const absolute = policy.absolute;
  const relative = policy.relative;

  if (absolute === undefined && relative === undefined) {
    return {
      verdict: "REJECTED",
      rejectedReason: "nan",
      expected,
      actual,
      difference,
      reason: "comparison rejected: no tolerance defined",
    };
  }

  const absDifference = Math.abs(difference);
  const passesAbsolute = absolute !== undefined && absDifference <= absolute;
  const denominator = Math.max(Math.abs(expected), EPSILON);
  const relativeError = absDifference / denominator;
  const passesRelative = relative !== undefined && relativeError <= relative;

  return passesAbsolute || passesRelative
    ? { verdict: "PASS", expected, actual, difference, relativeError }
    : { verdict: "FAIL", expected, actual, difference, relativeError };
}

export function compareWithPolicyAndUnits(
  expected: number,
  actual: number,
  policy: TolerancePolicy,
  expectedUnit: R1Unit,
  actualUnit: R1Unit,
): ComparisonResult {
  if (!areUnitsComparable(expectedUnit, actualUnit)) {
    return reject("unit_mismatch", expected, actual);
  }
  return compareWithPolicy(expected, actual, policy);
}

export function compareWithPolicyAndSystems(
  expected: number,
  actual: number,
  policy: TolerancePolicy,
  expectedSystem: R1CoordinateSystem,
  actualSystem: R1CoordinateSystem,
): ComparisonResult {
  if (expectedSystem !== actualSystem) {
    return reject("coordinate_system_mismatch", expected, actual);
  }
  return compareWithPolicy(expected, actual, policy);
}

export function allPassed(results: ComparisonResult[]): boolean {
  return results.length > 0 && results.every((result) => result.verdict === "PASS");
}

export function verdictOf(results: ComparisonResult[]): ComparisonVerdict {
  if (results.length === 0) return "REJECTED";
  if (results.some((result) => result.verdict === "REJECTED")) return "REJECTED";
  return results.every((result) => result.verdict === "PASS") ? "PASS" : "FAIL";
}
