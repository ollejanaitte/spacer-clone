import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteJsonNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return true;
  }

  if (valueType === "number") {
    return isFiniteJsonNumber(value);
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonValue(entry));
  }

  if (isPlainObject(value)) {
    return Object.values(value).every((entry) => isJsonValue(entry));
  }

  return false;
}

export function validateJsonValue(value: unknown, path = ""): ValidationResult {
  const issues: ValidationIssue[] = [];
  const basePath = path.length > 0 ? path : "";

  if (isJsonValue(value)) {
    return createValidationResult(issues);
  }

  issues.push(
    createValidationIssue({
      code: "JSON_VALUE_INVALID",
      severity: "error",
      message:
        "Value must be a recursive JSON value (null, string, boolean, finite number, array, or object).",
      path: basePath,
    }),
  );

  return createValidationResult(issues);
}
