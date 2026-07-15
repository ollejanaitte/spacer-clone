import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";
import {
  generateUuid,
  isValidUuid,
  parseUuid,
  type UuidString,
} from "./uuid";

export type StableIdNamespace = string & { readonly __brand: "StableIdNamespace" };

export interface DisplayAlias {
  readonly label: string;
  readonly purpose?: string;
}

export interface StableEntityId {
  readonly namespace: StableIdNamespace;
  readonly id: UuidString;
  readonly entityKind: string;
  readonly aliases?: readonly DisplayAlias[];
}

export interface CreateStableEntityIdInput {
  namespace: string;
  entityKind: string;
  id?: string;
  aliases?: readonly DisplayAlias[];
}

export function parseStableIdNamespace(value: string): StableIdNamespace | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }
  return value as StableIdNamespace;
}

export function requireStableIdNamespace(value: string): StableIdNamespace {
  const parsed = parseStableIdNamespace(value);
  if (parsed === undefined) {
    throw new Error("namespace must be a non-empty string.");
  }
  return parsed;
}

/** @deprecated Use requireStableIdNamespace for trusted constants or parseStableIdNamespace for input. */
export function asStableIdNamespace(value: string): StableIdNamespace {
  return requireStableIdNamespace(value);
}

function validateDisplayAlias(
  aliasValue: unknown,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (aliasValue === null || typeof aliasValue !== "object" || Array.isArray(aliasValue)) {
    issues.push(
      createValidationIssue({
        code: "DISPLAY_ALIAS_INVALID",
        severity: "error",
        message: "Display alias must be an object with a non-empty label.",
        path,
      }),
    );
    return issues;
  }

  const alias = aliasValue as Record<string, unknown>;
  if (typeof alias.label !== "string" || alias.label.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "DISPLAY_ALIAS_LABEL_MISSING",
        severity: "error",
        message: "Display alias label must be a non-empty string.",
        path: `${path}/label`,
      }),
    );
  }

  if (alias.purpose !== undefined) {
    if (typeof alias.purpose !== "string" || alias.purpose.trim().length === 0) {
      issues.push(
        createValidationIssue({
          code: "DISPLAY_ALIAS_PURPOSE_INVALID",
          severity: "error",
          message: "Display alias purpose must be a non-empty string when provided.",
          path: `${path}/purpose`,
        }),
      );
    }
  }

  return issues;
}

export function createStableEntityId(input: CreateStableEntityIdInput): StableEntityId {
  const namespace = parseStableIdNamespace(input.namespace);
  if (namespace === undefined) {
    throw new Error("namespace must be a non-empty string.");
  }

  if (input.entityKind.trim().length === 0) {
    throw new Error("entityKind must be a non-empty string.");
  }

  const id = input.id !== undefined ? parseStableUuid(input.id) : generateUuid();
  if (id === undefined) {
    throw new Error("Stable entity id must be a valid UUID.");
  }

  if (input.aliases !== undefined) {
    for (const alias of input.aliases) {
      if (typeof alias.label !== "string" || alias.label.trim().length === 0) {
        throw new Error("Display alias label must be a non-empty string.");
      }
      if (alias.purpose !== undefined && alias.purpose.trim().length === 0) {
        throw new Error("Display alias purpose must be a non-empty string when provided.");
      }
    }
  }

  return {
    namespace,
    id,
    entityKind: input.entityKind,
    ...(input.aliases !== undefined && input.aliases.length > 0 ? { aliases: input.aliases } : {}),
  };
}

export function parseStableUuid(value: string): UuidString | undefined {
  return parseUuid(value);
}

export function getDisplayAliases(stableId: StableEntityId): readonly DisplayAlias[] {
  return stableId.aliases ?? [];
}

export function withDisplayAlias(
  stableId: StableEntityId,
  alias: DisplayAlias,
): StableEntityId {
  if (alias.label.trim().length === 0) {
    throw new Error("Display alias label must be a non-empty string.");
  }
  if (alias.purpose !== undefined && alias.purpose.trim().length === 0) {
    throw new Error("Display alias purpose must be a non-empty string when provided.");
  }

  const existing = stableId.aliases ?? [];
  return {
    ...stableId,
    aliases: [...existing, alias],
  };
}

export function stableEntityIdEquals(left: StableEntityId, right: StableEntityId): boolean {
  return left.namespace === right.namespace && left.id === right.id && left.entityKind === right.entityKind;
}

export interface StableEntityIdInput {
  readonly namespace?: unknown;
  readonly id?: unknown;
  readonly entityKind?: unknown;
  readonly aliases?: unknown;
}

export function validateStableEntityId(
  value: StableEntityIdInput | undefined,
  path = "",
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const basePath = path.length > 0 ? path : "";

  if (value === undefined) {
    issues.push(
      createValidationIssue({
        code: "STABLE_ENTITY_ID_MISSING",
        severity: "error",
        message: "Stable entity id is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof value.namespace !== "string" || value.namespace.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "STABLE_ID_NAMESPACE_MISSING",
        severity: "error",
        message: "namespace must be a non-empty string.",
        path: `${basePath}/namespace`,
      }),
    );
  }

  if (typeof value.id !== "string" || !isValidUuid(value.id)) {
    issues.push(
      createValidationIssue({
        code: "STABLE_ID_INVALID",
        severity: "error",
        message: "id must be a valid UUID and must not be an array index.",
        path: `${basePath}/id`,
      }),
    );
  }

  if (typeof value.entityKind !== "string" || value.entityKind.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "STABLE_ID_ENTITY_KIND_MISSING",
        severity: "error",
        message: "entityKind must be a non-empty string.",
        path: `${basePath}/entityKind`,
      }),
    );
  }

  if (value.aliases !== undefined) {
    if (!Array.isArray(value.aliases)) {
      issues.push(
        createValidationIssue({
          code: "DISPLAY_ALIAS_LIST_INVALID",
          severity: "error",
          message: "aliases must be an array when provided.",
          path: `${basePath}/aliases`,
        }),
      );
    } else {
      value.aliases.forEach((aliasValue, index) => {
        issues.push(...validateDisplayAlias(aliasValue, `${basePath}/aliases/${index}`));
      });
    }
  }

  return createValidationResult(issues);
}
