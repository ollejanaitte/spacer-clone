import type { CoordinateContext } from "../coordinateContext";
import type { Provenance } from "../provenance";
import type { RevisionMetadata } from "../revision";
import { asRevisionId, type RevisionId } from "../revision";
import {
  parseSchemaId,
  parseSchemaVersion,
  type SchemaIdentity,
  type SchemaVersion,
} from "../schemaIdentity";
import { parseStableIdNamespace, type StableEntityId } from "../stableEntityId";
import type { UnitContext } from "../unitContext";
import { parseUuid, type UuidString } from "../uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "../validation";
import type { ContractParseFailure } from "./parseContract";
import type { CoordinateContextValue } from "./schemas/coordinateContext";
import type { ProvenanceValue } from "./schemas/provenance";
import type { RevisionMetadataValue } from "./schemas/revision";
import type { SchemaIdentityValue } from "./schemas/schemaIdentity";
import type { StableEntityIdValue } from "./schemas/stableEntityId";
import type { UnitContextValue } from "./schemas/unitContext";
import type { ValidationResultValue } from "./schemas/validationResult";

export type DomainMapSuccess<T> = {
  readonly ok: true;
  readonly data: T;
};

export type DomainMapFailure = {
  readonly ok: false;
  readonly validation: ValidationResult;
};

export type DomainMapResult<T> = DomainMapSuccess<T> | DomainMapFailure;

function joinFieldPath(basePath: string, field: string): string {
  return basePath.length > 0 ? `${basePath}/${field}` : `/${field}`;
}

function joinIndexedPath(basePath: string, index: number): string {
  return `${basePath}/${index}`;
}

function domainMapFailure(issues: readonly ValidationIssue[]): DomainMapFailure {
  return { ok: false, validation: createValidationResult(issues) };
}

function toParseFailure(result: DomainMapFailure): ContractParseFailure {
  return { success: false, validation: result.validation };
}

export function domainMapFailureToParseFailure(result: DomainMapFailure): ContractParseFailure {
  return toParseFailure(result);
}

function requireSchemaVersionField(
  value: string,
  basePath: string,
  code: string,
): { schemaVersion?: SchemaVersion; issue?: ValidationIssue } {
  const schemaVersion = parseSchemaVersion(value);
  if (schemaVersion === undefined) {
    return {
      issue: createValidationIssue({
        code,
        severity: "error",
        message: "schemaVersion could not be converted to a domain SchemaVersion.",
        path: joinFieldPath(basePath, "schemaVersion"),
      }),
    };
  }
  return { schemaVersion };
}

function requireUuidField(
  value: string,
  fieldPath: string,
  code: string,
  message: string,
): { uuid?: UuidString; issue?: ValidationIssue } {
  const uuid = parseUuid(value);
  if (uuid === undefined) {
    return {
      issue: createValidationIssue({
        code,
        severity: "error",
        message,
        path: fieldPath,
      }),
    };
  }
  return { uuid };
}

export function mapUuidValue(value: string, basePath = ""): DomainMapResult<UuidString> {
  const parsed = requireUuidField(
    value,
    basePath.length > 0 ? basePath : "/",
    "DOMAIN_UUID_INVALID",
    "Value could not be converted to a domain UuidString.",
  );
  if (parsed.issue !== undefined) {
    return domainMapFailure([parsed.issue]);
  }
  return { ok: true, data: parsed.uuid! };
}

export function mapSchemaIdentityValue(
  value: SchemaIdentityValue,
  basePath = "",
): DomainMapResult<SchemaIdentity> {
  const issues: ValidationIssue[] = [];

  const schemaId = parseSchemaId(value.schemaId);
  if (schemaId === undefined) {
    issues.push(
      createValidationIssue({
        code: "DOMAIN_SCHEMA_ID_INVALID",
        severity: "error",
        message: "schemaId could not be converted to a domain SchemaId.",
        path: joinFieldPath(basePath, "schemaId"),
      }),
    );
  }

  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }

  if (issues.length > 0) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaId: schemaId!,
      schemaVersion: schemaVersionResult.schemaVersion!,
    },
  };
}

export function mapStableEntityIdValue(
  value: StableEntityIdValue,
  basePath = "",
): DomainMapResult<StableEntityId> {
  const issues: ValidationIssue[] = [];

  const namespace = parseStableIdNamespace(value.namespace);
  if (namespace === undefined) {
    issues.push(
      createValidationIssue({
        code: "DOMAIN_STABLE_ID_NAMESPACE_INVALID",
        severity: "error",
        message: "namespace could not be converted to a domain StableIdNamespace.",
        path: joinFieldPath(basePath, "namespace"),
      }),
    );
  }

  const idResult = requireUuidField(
    value.id,
    joinFieldPath(basePath, "id"),
    "DOMAIN_STABLE_ID_INVALID",
    "id could not be converted to a domain UuidString.",
  );
  if (idResult.issue !== undefined) {
    issues.push(idResult.issue);
  }

  if (issues.length > 0) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      namespace: namespace!,
      id: idResult.uuid!,
      entityKind: value.entityKind,
      ...(value.aliases !== undefined ? { aliases: value.aliases } : {}),
    },
  };
}

export function mapProvenanceValue(value: ProvenanceValue): DomainMapResult<Provenance> {
  return { ok: true, data: value };
}

export function mapRevisionMetadataValue(
  value: RevisionMetadataValue,
  basePath = "",
): DomainMapResult<RevisionMetadata> {
  const issues: ValidationIssue[] = [];

  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }

  const documentIdResult = requireUuidField(
    value.documentId,
    joinFieldPath(basePath, "documentId"),
    "DOMAIN_REVISION_DOCUMENT_ID_INVALID",
    "documentId could not be converted to a domain UuidString.",
  );
  if (documentIdResult.issue !== undefined) {
    issues.push(documentIdResult.issue);
  }

  const revisionId = asRevisionId(value.revisionId);
  if (revisionId === undefined) {
    issues.push(
      createValidationIssue({
        code: "DOMAIN_REVISION_ID_INVALID",
        severity: "error",
        message: "revisionId could not be converted to a domain RevisionId.",
        path: joinFieldPath(basePath, "revisionId"),
      }),
    );
  }

  let parentRevisionIds: readonly RevisionId[] | undefined;
  if (value.parentRevisionIds !== undefined) {
    const mappedParents: RevisionId[] = [];
    value.parentRevisionIds.forEach((parentId, index) => {
      const mapped = asRevisionId(parentId);
      if (mapped === undefined) {
        issues.push(
          createValidationIssue({
            code: "DOMAIN_REVISION_PARENT_ID_INVALID",
            severity: "error",
            message: "parentRevisionIds entry could not be converted to a domain RevisionId.",
            path: joinIndexedPath(joinFieldPath(basePath, "parentRevisionIds"), index),
          }),
        );
      } else {
        mappedParents.push(mapped);
      }
    });
    parentRevisionIds = mappedParents;
  }

  let baseRevisionId: RevisionId | undefined;
  if (value.baseRevisionId !== undefined) {
    const mapped = asRevisionId(value.baseRevisionId);
    if (mapped === undefined) {
      issues.push(
        createValidationIssue({
          code: "DOMAIN_REVISION_BASE_ID_INVALID",
          severity: "error",
          message: "baseRevisionId could not be converted to a domain RevisionId.",
          path: joinFieldPath(basePath, "baseRevisionId"),
        }),
      );
    } else {
      baseRevisionId = mapped;
    }
  }

  if (issues.length > 0) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaVersion: schemaVersionResult.schemaVersion!,
      documentId: documentIdResult.uuid!,
      revisionId: revisionId!,
      createdAt: value.createdAt,
      contentChecksum: value.contentChecksum,
      ...(parentRevisionIds !== undefined ? { parentRevisionIds } : {}),
      ...(baseRevisionId !== undefined ? { baseRevisionId } : {}),
      ...(value.sequence !== undefined ? { sequence: value.sequence } : {}),
      ...(value.actor !== undefined ? { actor: value.actor } : {}),
      ...(value.tool !== undefined ? { tool: value.tool } : {}),
      ...(value.reason !== undefined ? { reason: value.reason } : {}),
      ...(value.migrationRecordRef !== undefined
        ? { migrationRecordRef: value.migrationRecordRef }
        : {}),
    },
  };
}

export function mapCoordinateContextValue(
  value: CoordinateContextValue,
  basePath = "",
): DomainMapResult<CoordinateContext> {
  const issues: ValidationIssue[] = [];

  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }

  const contextIdResult = requireUuidField(
    value.contextId,
    joinFieldPath(basePath, "contextId"),
    "DOMAIN_CONTEXT_ID_INVALID",
    "contextId could not be converted to a domain UuidString.",
  );
  if (contextIdResult.issue !== undefined) {
    issues.push(contextIdResult.issue);
  }

  if (issues.length > 0) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      ...value,
      schemaVersion: schemaVersionResult.schemaVersion!,
      contextId: contextIdResult.uuid!,
    },
  };
}

export function mapUnitContextValue(
  value: UnitContextValue,
  basePath = "",
): DomainMapResult<UnitContext> {
  const issues: ValidationIssue[] = [];

  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }

  const contextIdResult = requireUuidField(
    value.contextId,
    joinFieldPath(basePath, "contextId"),
    "DOMAIN_CONTEXT_ID_INVALID",
    "contextId could not be converted to a domain UuidString.",
  );
  if (contextIdResult.issue !== undefined) {
    issues.push(contextIdResult.issue);
  }

  if (issues.length > 0) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      ...value,
      schemaVersion: schemaVersionResult.schemaVersion!,
      contextId: contextIdResult.uuid!,
    },
  };
}

export function mapValidationResultValue(
  value: ValidationResultValue,
  basePath = "",
): DomainMapResult<ValidationResult> {
  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  if (schemaVersionResult.issue !== undefined) {
    return domainMapFailure([schemaVersionResult.issue]);
  }

  return {
    ok: true,
    data: {
      schemaVersion: schemaVersionResult.schemaVersion!,
      status: value.status,
      issues: value.issues,
      ...(value.evaluatedRevision !== undefined ? { evaluatedRevision: value.evaluatedRevision } : {}),
      ...(value.evaluatedChecksum !== undefined ? { evaluatedChecksum: value.evaluatedChecksum } : {}),
      ...(value.ruleSetVersion !== undefined ? { ruleSetVersion: value.ruleSetVersion } : {}),
    },
  };
}
