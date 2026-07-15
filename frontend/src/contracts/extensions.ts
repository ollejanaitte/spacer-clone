import type { ImmutableResourceReference } from "./immutableResourceReference";
import { validateImmutableResourceReference } from "./immutableResourceReference";
import { isJsonValue, validateJsonValue, type JsonValue } from "./jsonValue";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

/** Namespaced extension key: `vendor.namespace/key-name`. */
export const EXTENSION_KEY_PATTERN =
  /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+\/[a-zA-Z][a-zA-Z0-9._-]*$/;

export interface ExtensionValue {
  readonly json?: JsonValue;
  readonly resourceRef?: ImmutableResourceReference;
}

export type Extensions = Readonly<Record<string, ExtensionValue>>;

export function isExtensionKey(value: string): boolean {
  return EXTENSION_KEY_PATTERN.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateExtensions(
  extensions: Extensions | undefined,
  path = "",
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const basePath = path.length > 0 ? path : "";

  if (extensions === undefined) {
    return createValidationResult(issues);
  }

  if (!isPlainObject(extensions)) {
    issues.push(
      createValidationIssue({
        code: "EXTENSIONS_INVALID",
        severity: "error",
        message: "extensions must be an object when provided.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  for (const [key, entry] of Object.entries(extensions)) {
    const entryPath = `${basePath}/${key}`;

    if (!isExtensionKey(key)) {
      issues.push(
        createValidationIssue({
          code: "EXTENSION_KEY_INVALID",
          severity: "error",
          message: "Extension keys must use a namespaced vendor/key format.",
          path: entryPath,
        }),
      );
    }

    if (!isPlainObject(entry)) {
      issues.push(
        createValidationIssue({
          code: "EXTENSION_VALUE_INVALID",
          severity: "error",
          message: "Each extension entry must be an object.",
          path: entryPath,
        }),
      );
      continue;
    }

    const hasJson = entry.json !== undefined;
    const hasResourceRef = entry.resourceRef !== undefined;

    if (hasJson === hasResourceRef) {
      issues.push(
        createValidationIssue({
          code: "EXTENSION_VALUE_EXCLUSIVE",
          severity: "error",
          message: "Each extension entry must provide exactly one of json or resourceRef.",
          path: entryPath,
        }),
      );
    }

    if (hasJson) {
      if (!isJsonValue(entry.json)) {
        issues.push(
          createValidationIssue({
            code: "EXTENSION_JSON_INVALID",
            severity: "error",
            message:
              "Extension json must be a recursive JSON value (null, string, boolean, finite number, array, or object).",
            path: `${entryPath}/json`,
          }),
        );
      } else {
        issues.push(...validateJsonValue(entry.json, `${entryPath}/json`).issues);
      }
    }

    if (hasResourceRef && isPlainObject(entry)) {
      const resourceRef = (entry as ExtensionValue).resourceRef;
      if (resourceRef !== undefined) {
        issues.push(
          ...validateImmutableResourceReference(resourceRef, `${entryPath}/resourceRef`).issues,
        );
      }
    }
  }

  return createValidationResult(issues);
}
