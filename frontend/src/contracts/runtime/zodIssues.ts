import type { ZodIssue } from "zod";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "../validation";

const ZOD_CODE_MAP: Readonly<Record<string, string>> = {
  invalid_type: "ZOD_INVALID_TYPE",
  unrecognized_keys: "ZOD_UNRECOGNIZED_KEYS",
  invalid_format: "ZOD_INVALID_FORMAT",
  invalid_value: "ZOD_INVALID_VALUE",
  too_small: "ZOD_TOO_SMALL",
  too_big: "ZOD_TOO_BIG",
  invalid_union: "ZOD_INVALID_UNION",
  not_multiple_of: "ZOD_NOT_MULTIPLE_OF",
  custom: "ZOD_CUSTOM",
};

function formatIssuePath(segments: readonly PropertyKey[], basePath = ""): string {
  if (segments.length === 0) {
    return basePath;
  }

  const relative = segments
    .map((segment) => String(segment))
    .join("/")
    .replace(/^/, "/");

  if (basePath.length === 0) {
    return relative;
  }

  if (basePath.endsWith("/")) {
    return `${basePath.slice(0, -1)}${relative}`;
  }

  return `${basePath}${relative}`;
}

function stableZodCode(issue: ZodIssue): string {
  return ZOD_CODE_MAP[issue.code] ?? `ZOD_${issue.code.toUpperCase()}`;
}

export function zodIssueToValidationIssue(issue: ZodIssue, basePath = ""): ValidationIssue {
  return createValidationIssue({
    code: stableZodCode(issue),
    severity: "error",
    message: issue.message,
    path: formatIssuePath(issue.path, basePath),
  });
}

export function zodIssuesToValidationResult(
  issues: readonly ZodIssue[],
  basePath = "",
): ValidationResult {
  return createValidationResult(issues.map((issue) => zodIssueToValidationIssue(issue, basePath)));
}
