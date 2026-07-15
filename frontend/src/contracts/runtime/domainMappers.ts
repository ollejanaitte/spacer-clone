import type { CommonEnvelope } from "../commonEnvelope";
import type { DocumentKind } from "../documentKind";
import { isDocumentKind } from "../documentKind";
import { parseContentChecksum, type ContentChecksum } from "../contentChecksum";
import type { CoordinateContext } from "../coordinateContext";
import type { DocumentReference } from "../documentReference";
import type { EngineeringProject } from "../engineeringProject";
import type { Extensions, ExtensionValue } from "../extensions";
import type { ImmutableResourceReference } from "../immutableResourceReference";
import type { MigrationRecord, MigrationIdMapping } from "../migrationRecord";
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
import type { UnknownFieldCollisionRecord, UnknownFieldEntry, UnknownFieldStore } from "../unknownFieldStore";
import type { ContractParseFailure } from "./parseContract";
import type { CommonEnvelopeValue } from "./schemas/commonEnvelope";
import type { ContentChecksumValue } from "./schemas/contentChecksum";
import type { CoordinateContextValue } from "./schemas/coordinateContext";
import type { DocumentReferenceValue } from "./schemas/documentReference";
import type { EngineeringProjectValue } from "./schemas/engineeringProject";
import type { ExtensionValueSchemaValue, ExtensionsValue } from "./schemas/extensions";
import type { ImmutableResourceReferenceValue } from "./schemas/immutableResourceReference";
import type { MigrationRecordValue } from "./schemas/migrationRecord";
import type { UnknownFieldStoreValue } from "./schemas/unknownFieldStore";
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
  if (parsed.issue !== undefined || parsed.uuid === undefined) {
    return domainMapFailure(parsed.issue !== undefined ? [parsed.issue] : []);
  }
  return { ok: true, data: parsed.uuid };
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

  if (issues.length > 0 || schemaId === undefined || schemaVersionResult.schemaVersion === undefined) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaId,
      schemaVersion: schemaVersionResult.schemaVersion,
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

  if (
    issues.length > 0 ||
    namespace === undefined ||
    idResult.uuid === undefined
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      namespace,
      id: idResult.uuid,
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

  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
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

  if (
    issues.length > 0 ||
    schemaVersionResult.schemaVersion === undefined ||
    documentIdResult.uuid === undefined ||
    revisionId === undefined ||
    !checksumMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaVersion: schemaVersionResult.schemaVersion,
      documentId: documentIdResult.uuid,
      revisionId,
      createdAt: value.createdAt,
      contentChecksum: checksumMapped.data,
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

  if (issues.length > 0 || schemaVersionResult.schemaVersion === undefined || contextIdResult.uuid === undefined) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      ...value,
      schemaVersion: schemaVersionResult.schemaVersion,
      contextId: contextIdResult.uuid,
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

  if (issues.length > 0 || schemaVersionResult.schemaVersion === undefined || contextIdResult.uuid === undefined) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      ...value,
      schemaVersion: schemaVersionResult.schemaVersion,
      contextId: contextIdResult.uuid,
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
  if (schemaVersionResult.issue !== undefined || schemaVersionResult.schemaVersion === undefined) {
    return domainMapFailure([schemaVersionResult.issue].filter((issue) => issue !== undefined));
  }

  return {
    ok: true,
    data: {
      schemaVersion: schemaVersionResult.schemaVersion,
      status: value.status,
      issues: value.issues,
      ...(value.evaluatedRevision !== undefined ? { evaluatedRevision: value.evaluatedRevision } : {}),
      ...(value.evaluatedChecksum !== undefined ? { evaluatedChecksum: value.evaluatedChecksum } : {}),
      ...(value.ruleSetVersion !== undefined ? { ruleSetVersion: value.ruleSetVersion } : {}),
    },
  };
}

export function mapContentChecksumValue(
  value: ContentChecksumValue,
  basePath = "",
): DomainMapResult<ContentChecksum> {
  const parsed = parseContentChecksum(value);
  if (parsed === undefined) {
    return domainMapFailure([
      createValidationIssue({
        code: "DOMAIN_CONTENT_CHECKSUM_INVALID",
        severity: "error",
        message: "Value could not be converted to a domain ContentChecksum.",
        path: basePath.length > 0 ? basePath : "/",
      }),
    ]);
  }
  return { ok: true, data: parsed };
}

function mapExtensionValue(value: ExtensionValueSchemaValue): ExtensionValue {
  if (value.json !== undefined) {
    return { json: value.json };
  }

  if (value.resourceRef === undefined) {
    return {};
  }

  const mapped = mapImmutableResourceReferenceValue(value.resourceRef);
  if (!mapped.ok) {
    return {};
  }

  return { resourceRef: mapped.data };
}

function mapExtensionsValue(value: ExtensionsValue): Extensions {
  const mapped: Record<string, ExtensionValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    mapped[key] = mapExtensionValue(entry);
  }
  return mapped;
}

export function mapImmutableResourceReferenceValue(
  value: ImmutableResourceReferenceValue,
  basePath = "",
): DomainMapResult<ImmutableResourceReference> {
  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );
  if (!checksumMapped.ok) {
    return checksumMapped;
  }

  return {
    ok: true,
    data: {
      uri: value.uri,
      contentChecksum: checksumMapped.data,
      ...(value.mediaType !== undefined ? { mediaType: value.mediaType } : {}),
    },
  };
}

function mapUnknownFieldEntryValue(
  value: UnknownFieldStoreValue["entries"][number],
  basePath: string,
): DomainMapResult<UnknownFieldEntry> {
  const rawPayloadMapped = mapImmutableResourceReferenceValue(
    value.rawPayloadRef,
    joinFieldPath(basePath, "rawPayloadRef"),
  );
  if (!rawPayloadMapped.ok) {
    return rawPayloadMapped;
  }

  return {
    ok: true,
    data: {
      jsonPointer: value.jsonPointer,
      criticality: value.criticality,
      rawPayloadRef: rawPayloadMapped.data,
      ...(value.sourcePointer !== undefined ? { sourcePointer: value.sourcePointer } : {}),
    },
  };
}

function mapUnknownFieldCollisionRecordValue(
  value: NonNullable<UnknownFieldStoreValue["collisionRecords"]>[number],
  basePath: string,
): DomainMapResult<UnknownFieldCollisionRecord> {
  const rawPayloadMapped = mapImmutableResourceReferenceValue(
    value.rawPayloadRef,
    joinFieldPath(basePath, "rawPayloadRef"),
  );
  if (!rawPayloadMapped.ok) {
    return rawPayloadMapped;
  }

  return {
    ok: true,
    data: {
      jsonPointer: value.jsonPointer,
      knownFieldPath: value.knownFieldPath,
      rawPayloadRef: rawPayloadMapped.data,
    },
  };
}

export function mapDocumentReferenceValue(
  value: DocumentReferenceValue,
  basePath = "",
): DomainMapResult<DocumentReference> {
  const issues: ValidationIssue[] = [];

  const documentIdResult = requireUuidField(
    value.documentId,
    joinFieldPath(basePath, "documentId"),
    "DOMAIN_DOCUMENT_REFERENCE_ID_INVALID",
    "documentId could not be converted to a domain UuidString.",
  );
  if (documentIdResult.issue !== undefined) {
    issues.push(documentIdResult.issue);
  }

  const revisionId = asRevisionId(value.revisionId);
  if (revisionId === undefined) {
    issues.push(
      createValidationIssue({
        code: "DOMAIN_DOCUMENT_REFERENCE_REVISION_INVALID",
        severity: "error",
        message: "revisionId could not be converted to a domain RevisionId.",
        path: joinFieldPath(basePath, "revisionId"),
      }),
    );
  }

  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
    return domainMapFailure(issues);
  }

  if (
    issues.length > 0 ||
    documentIdResult.uuid === undefined ||
    revisionId === undefined ||
    !checksumMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      documentKind: value.documentKind,
      documentId: documentIdResult.uuid,
      revisionId,
      contentChecksum: checksumMapped.data,
      ...(value.uri !== undefined ? { uri: value.uri } : {}),
      ...(value.embeddedResourceKey !== undefined
        ? { embeddedResourceKey: value.embeddedResourceKey }
        : {}),
      ...(value.mediaType !== undefined ? { mediaType: value.mediaType } : {}),
    },
  };
}

export function mapCommonEnvelopeValue(
  value: CommonEnvelopeValue,
  basePath = "",
): DomainMapResult<CommonEnvelope> {
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

  const documentIdResult = requireUuidField(
    value.documentId,
    joinFieldPath(basePath, "documentId"),
    "DOMAIN_DOCUMENT_ID_INVALID",
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

  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
  }

  if (!isDocumentKind(value.documentKind)) {
    issues.push(
      createValidationIssue({
        code: "DOMAIN_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: "documentKind could not be converted to a domain DocumentKind.",
        path: joinFieldPath(basePath, "documentKind"),
      }),
    );
  }

  let unknownFieldStoreRef: DocumentReference | undefined;
  if (value.unknownFieldStoreRef !== undefined) {
    const mapped = mapDocumentReferenceValue(
      value.unknownFieldStoreRef,
      joinFieldPath(basePath, "unknownFieldStoreRef"),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      unknownFieldStoreRef = mapped.data;
    }
  }

  let migrationProvenanceRef: DocumentReference | undefined;
  if (value.migrationProvenanceRef !== undefined) {
    const mapped = mapDocumentReferenceValue(
      value.migrationProvenanceRef,
      joinFieldPath(basePath, "migrationProvenanceRef"),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      migrationProvenanceRef = mapped.data;
    }
  }

  if (
    issues.length > 0 ||
    schemaId === undefined ||
    schemaVersionResult.schemaVersion === undefined ||
    documentIdResult.uuid === undefined ||
    revisionId === undefined ||
    !checksumMapped.ok ||
    !isDocumentKind(value.documentKind)
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaId,
      schemaVersion: schemaVersionResult.schemaVersion,
      documentId: documentIdResult.uuid,
      documentKind: value.documentKind,
      revisionId,
      contentChecksum: checksumMapped.data,
      provenance: value.provenance,
      ...(value.extensions !== undefined ? { extensions: mapExtensionsValue(value.extensions) } : {}),
      ...(unknownFieldStoreRef !== undefined ? { unknownFieldStoreRef } : {}),
      ...(migrationProvenanceRef !== undefined ? { migrationProvenanceRef } : {}),
    },
  };
}

export function mapEngineeringProjectValue(
  value: EngineeringProjectValue,
  basePath = "",
): DomainMapResult<EngineeringProject> {
  const issues: ValidationIssue[] = [];

  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }

  const projectIdResult = requireUuidField(
    value.projectId,
    joinFieldPath(basePath, "projectId"),
    "DOMAIN_PROJECT_ID_INVALID",
    "projectId could not be converted to a domain UuidString.",
  );
  if (projectIdResult.issue !== undefined) {
    issues.push(projectIdResult.issue);
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

  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
    return domainMapFailure(issues);
  }

  let roadDesignRef: DocumentReference | null | undefined;
  if (value.roadDesignRef === null) {
    roadDesignRef = null;
  } else {
    const roadMapped = mapDocumentReferenceValue(
      value.roadDesignRef,
      joinFieldPath(basePath, "roadDesignRef"),
    );
    if (!roadMapped.ok) {
      issues.push(...roadMapped.validation.issues);
    } else {
      roadDesignRef = roadMapped.data;
    }
  }

  const frameAnalysisRefs: DocumentReference[] = [];
  value.frameAnalysisRefs.forEach((ref, index) => {
    const mapped = mapDocumentReferenceValue(
      ref,
      joinIndexedPath(joinFieldPath(basePath, "frameAnalysisRefs"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      frameAnalysisRefs.push(mapped.data);
    }
  });

  const transferRecordRefs: DocumentReference[] = [];
  value.transferRecordRefs.forEach((ref, index) => {
    const mapped = mapDocumentReferenceValue(
      ref,
      joinIndexedPath(joinFieldPath(basePath, "transferRecordRefs"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      transferRecordRefs.push(mapped.data);
    }
  });

  const revisionMetadataMapped = mapRevisionMetadataValue(
    value.projectRevisionMetadata,
    joinFieldPath(basePath, "projectRevisionMetadata"),
  );
  if (!revisionMetadataMapped.ok) {
    issues.push(...revisionMetadataMapped.validation.issues);
    return domainMapFailure(issues);
  }

  let unknownFieldStoreRef: DocumentReference | undefined;
  if (value.unknownFieldStoreRef !== undefined) {
    const mapped = mapDocumentReferenceValue(
      value.unknownFieldStoreRef,
      joinFieldPath(basePath, "unknownFieldStoreRef"),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      unknownFieldStoreRef = mapped.data;
    }
  }

  let migrationProvenanceRef: DocumentReference | undefined;
  if (value.migrationProvenanceRef !== undefined) {
    const mapped = mapDocumentReferenceValue(
      value.migrationProvenanceRef,
      joinFieldPath(basePath, "migrationProvenanceRef"),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      migrationProvenanceRef = mapped.data;
    }
  }

  if (
    issues.length > 0 ||
    schemaVersionResult.schemaVersion === undefined ||
    projectIdResult.uuid === undefined ||
    revisionId === undefined ||
    !checksumMapped.ok ||
    roadDesignRef === undefined
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaId: value.schemaId,
      schemaVersion: schemaVersionResult.schemaVersion,
      documentKind: value.documentKind,
      projectId: projectIdResult.uuid,
      revisionId,
      contentChecksum: checksumMapped.data,
      provenance: value.provenance,
      name: value.name,
      roadDesignRef,
      frameAnalysisRefs,
      transferRecordRefs,
      projectRevisionMetadata: revisionMetadataMapped.data,
      ...(value.extensions !== undefined ? { extensions: mapExtensionsValue(value.extensions) } : {}),
      ...(unknownFieldStoreRef !== undefined ? { unknownFieldStoreRef } : {}),
      ...(migrationProvenanceRef !== undefined ? { migrationProvenanceRef } : {}),
    },
  };
}

export function mapUnknownFieldStoreValue(
  value: UnknownFieldStoreValue,
  basePath = "",
): DomainMapResult<UnknownFieldStore> {
  const issues: ValidationIssue[] = [];

  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }

  const storeIdResult = requireUuidField(
    value.storeId,
    joinFieldPath(basePath, "storeId"),
    "DOMAIN_STORE_ID_INVALID",
    "storeId could not be converted to a domain UuidString.",
  );
  if (storeIdResult.issue !== undefined) {
    issues.push(storeIdResult.issue);
  }

  const sourceRawChecksumMapped = mapContentChecksumValue(
    value.sourceRawChecksum,
    joinFieldPath(basePath, "sourceRawChecksum"),
  );
  if (!sourceRawChecksumMapped.ok) {
    issues.push(...sourceRawChecksumMapped.validation.issues);
    return domainMapFailure(issues);
  }

  const entries: UnknownFieldEntry[] = [];
  value.entries.forEach((entry, index) => {
    const mapped = mapUnknownFieldEntryValue(
      entry,
      joinIndexedPath(joinFieldPath(basePath, "entries"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      entries.push(mapped.data);
    }
  });

  let rawPayloadRef: ImmutableResourceReference | undefined;
  if (value.rawPayloadRef !== undefined) {
    const mapped = mapImmutableResourceReferenceValue(
      value.rawPayloadRef,
      joinFieldPath(basePath, "rawPayloadRef"),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      rawPayloadRef = mapped.data;
    }
  }

  let collisionRecords: UnknownFieldCollisionRecord[] | undefined;
  if (value.collisionRecords !== undefined) {
    collisionRecords = [];
    value.collisionRecords.forEach((record, index) => {
      const mapped = mapUnknownFieldCollisionRecordValue(
        record,
        joinIndexedPath(joinFieldPath(basePath, "collisionRecords"), index),
      );
      if (!mapped.ok) {
        issues.push(...mapped.validation.issues);
      } else {
        collisionRecords?.push(mapped.data);
      }
    });
  }

  if (
    issues.length > 0 ||
    schemaVersionResult.schemaVersion === undefined ||
    storeIdResult.uuid === undefined ||
    !sourceRawChecksumMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaId: value.schemaId,
      schemaVersion: schemaVersionResult.schemaVersion,
      documentKind: value.documentKind,
      storeId: storeIdResult.uuid,
      sourceRawChecksum: sourceRawChecksumMapped.data,
      sourceVersionClassification: value.sourceVersionClassification,
      entries,
      ...(value.sourceVersion !== undefined ? { sourceVersion: value.sourceVersion } : {}),
      ...(rawPayloadRef !== undefined ? { rawPayloadRef } : {}),
      ...(collisionRecords !== undefined ? { collisionRecords } : {}),
    },
  };
}

export function mapMigrationRecordValue(
  value: MigrationRecordValue,
  basePath = "",
): DomainMapResult<MigrationRecord> {
  const issues: ValidationIssue[] = [];

  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }

  const migrationIdResult = requireUuidField(
    value.migrationId,
    joinFieldPath(basePath, "migrationId"),
    "DOMAIN_MIGRATION_ID_INVALID",
    "migrationId could not be converted to a domain UuidString.",
  );
  if (migrationIdResult.issue !== undefined) {
    issues.push(migrationIdResult.issue);
  }

  const sourceRawChecksumMapped = mapContentChecksumValue(
    value.sourceRawChecksum,
    joinFieldPath(basePath, "sourceRawChecksum"),
  );
  if (!sourceRawChecksumMapped.ok) {
    issues.push(...sourceRawChecksumMapped.validation.issues);
    return domainMapFailure(issues);
  }

  const sourceContentChecksumMapped = mapContentChecksumValue(
    value.sourceContentChecksum,
    joinFieldPath(basePath, "sourceContentChecksum"),
  );
  if (!sourceContentChecksumMapped.ok) {
    issues.push(...sourceContentChecksumMapped.validation.issues);
    return domainMapFailure(issues);
  }

  const targetRefs: DocumentReference[] = [];
  if (value.targetRefs !== undefined) {
    value.targetRefs.forEach((ref, index) => {
      const mapped = mapDocumentReferenceValue(
        ref,
        joinIndexedPath(joinFieldPath(basePath, "targetRefs"), index),
      );
      if (!mapped.ok) {
        issues.push(...mapped.validation.issues);
      } else {
        targetRefs.push(mapped.data);
      }
    });
  }

  const candidateTargetRefs: DocumentReference[] = [];
  if (value.candidateTargetRefs !== undefined) {
    value.candidateTargetRefs.forEach((ref, index) => {
      const mapped = mapDocumentReferenceValue(
        ref,
        joinIndexedPath(joinFieldPath(basePath, "candidateTargetRefs"), index),
      );
      if (!mapped.ok) {
        issues.push(...mapped.validation.issues);
      } else {
        candidateTargetRefs.push(mapped.data);
      }
    });
  }

  const idMappings: MigrationIdMapping[] = [];
  value.idMappings.forEach((mapping, index) => {
    const mappingPath = joinIndexedPath(joinFieldPath(basePath, "idMappings"), index);
    let targetId: UuidString | undefined;
    if (mapping.targetId !== undefined) {
      const parsedTargetId = parseUuid(mapping.targetId);
      if (parsedTargetId === undefined) {
        issues.push(
          createValidationIssue({
            code: "DOMAIN_MIGRATION_TARGET_ID_INVALID",
            severity: "error",
            message: "targetId could not be converted to a domain UuidString.",
            path: joinFieldPath(mappingPath, "targetId"),
          }),
        );
      } else {
        targetId = parsedTargetId;
      }
    }

    idMappings.push({
      sourceId: mapping.sourceId,
      disposition: mapping.disposition,
      ...(targetId !== undefined ? { targetId } : {}),
      ...(mapping.entityKind !== undefined ? { entityKind: mapping.entityKind } : {}),
    });
  });

  if (
    issues.length > 0 ||
    schemaVersionResult.schemaVersion === undefined ||
    migrationIdResult.uuid === undefined ||
    !sourceRawChecksumMapped.ok ||
    !sourceContentChecksumMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaId: value.schemaId,
      schemaVersion: schemaVersionResult.schemaVersion,
      documentKind: value.documentKind,
      migrationId: migrationIdResult.uuid,
      adapterId: value.adapterId,
      adapterVersion: value.adapterVersion,
      sourceRawChecksum: sourceRawChecksumMapped.data,
      sourceContentChecksum: sourceContentChecksumMapped.data,
      sourceVersion: value.sourceVersion,
      targetVersion: value.targetVersion,
      ...(targetRefs.length > 0 ? { targetRefs } : {}),
      ...(candidateTargetRefs.length > 0 ? { candidateTargetRefs } : {}),
      diagnostics: value.diagnostics,
      recordedAt: value.recordedAt,
      idMappings,
      status: value.status,
      ...(value.operator !== undefined ? { operator: value.operator } : {}),
    },
  };
}
