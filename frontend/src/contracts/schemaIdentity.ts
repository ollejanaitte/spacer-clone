import {
  createValidationIssue,
  createValidationResult,
  type ValidationResult,
} from "./validation";

export type SchemaId = string & { readonly __brand: "SchemaId" };
export type SchemaVersion = string & { readonly __brand: "SchemaVersion" };

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export interface SchemaIdentity {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
}

export function parseSchemaId(value: string): SchemaId | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }
  return value as SchemaId;
}

export function parseSchemaVersion(value: string): SchemaVersion | undefined {
  return isSemVerString(value) ? (value as SchemaVersion) : undefined;
}

export function requireSchemaId(value: string): SchemaId {
  const parsed = parseSchemaId(value);
  if (parsed === undefined) {
    throw new Error("schemaId must be a non-empty string.");
  }
  return parsed;
}

export function requireSchemaVersion(value: string): SchemaVersion {
  const parsed = parseSchemaVersion(value);
  if (parsed === undefined) {
    throw new Error("schemaVersion must be a valid SemVer string.");
  }
  return parsed;
}

/** @deprecated Use requireSchemaId for trusted constants or parseSchemaId for input. */
export function asSchemaId(value: string): SchemaId {
  return requireSchemaId(value);
}

/** @deprecated Use requireSchemaVersion for trusted constants or parseSchemaVersion for input. */
export function asSchemaVersion(value: string): SchemaVersion {
  return requireSchemaVersion(value);
}

export function isSemVerString(value: string): boolean {
  return SEMVER_PATTERN.test(value);
}

export function validateSchemaIdentity(
  identity: Partial<SchemaIdentity> | undefined,
  path = "",
): ValidationResult {
  const issues = [];
  const basePath = path.length > 0 ? path : "";

  if (identity === undefined) {
    issues.push(
      createValidationIssue({
        code: "SCHEMA_IDENTITY_MISSING",
        severity: "error",
        message: "Schema identity is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof identity.schemaId !== "string" || identity.schemaId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "SCHEMA_ID_MISSING",
        severity: "error",
        message: "schemaId must be a non-empty string.",
        path: `${basePath}/schemaId`,
      }),
    );
  }

  if (typeof identity.schemaVersion !== "string" || !isSemVerString(identity.schemaVersion)) {
    issues.push(
      createValidationIssue({
        code: "SCHEMA_VERSION_INVALID",
        severity: "error",
        message: "schemaVersion must be a valid SemVer string.",
        path: `${basePath}/schemaVersion`,
      }),
    );
  }

  return createValidationResult(issues);
}
