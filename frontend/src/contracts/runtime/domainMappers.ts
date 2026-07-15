import type { CommonEnvelope } from "../commonEnvelope";
import type { DocumentKind } from "../documentKind";
import { isDocumentKind } from "../documentKind";
import { parseContentChecksum, type ContentChecksum } from "../contentChecksum";
import type { CoordinateContext } from "../coordinateContext";
import type { DocumentReference } from "../documentReference";
import type { BridgeFrameAnalysisDocument, TransferBinding } from "../bridgeFrameAnalysisDocument";
import { BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND } from "../bridgeFrameAnalysisDocument";
import type {
  PackageArtifactReference,
  PolicyReference,
  TransferRecordArtifactReference,
} from "../artifactReference";
import type { CapabilityBlock } from "../capabilityBlock";
import type { EngineeringProject } from "../engineeringProject";
import type { Polyline3, Polygon3 } from "../geometryPrimitives";
import type {
  CapabilityAssessmentSummary,
  PackageCapabilityEntry,
} from "../packageCapability";
import type { RoadDesignDocument } from "../roadDesignDocument";
import { ROAD_DESIGN_DOCUMENT_KIND } from "../roadDesignDocument";
import type { RoadToFrameTransferPackage, TransferPackageGeometry } from "../roadToFrameTransferPackage";
import type { EntityMappingEntry, TransferCapabilityAssessmentEntry, TransferDecisionEntry, TransferRecord } from "../transferRecord";
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
import type { BridgeFrameAnalysisDocumentValue } from "./schemas/bridgeFrameAnalysisDocument";
import type { CapabilityBlockValue } from "./schemas/capabilityBlock";
import type {
  AnalysisSettingsValue,
  LoadDefinitionEntryValue,
  RoadAlignmentEntryValue,
  RoadBridgeEntryValue,
  RoadCrossSectionEntryValue,
  RoadProfileEntryValue,
  RoadStationingValue,
  StructuralModelValue,
  TransferBindingValue,
} from "./schemas/domainSkeleton";
import type { RoadDesignDocumentValue } from "./schemas/roadDesignDocument";
import type { RoadToFrameTransferPackageValue } from "./schemas/roadToFrameTransferPackage";
import type { TransferRecordValue } from "./schemas/transferRecord";
import type { TransferPackageGeometryValue } from "./schemas/transferGeometry";
import type {
  PackageArtifactReferenceValue,
  PolicyReferenceValue,
  TransferRecordArtifactReferenceValue,
} from "./schemas/artifactReference";
import type {
  CapabilityAssessmentSummaryValue,
  PackageCapabilityEntryValue,
} from "./schemas/packageCapability";
import type { Polyline3Value, Polygon3Value } from "./schemas/geometryPrimitives";
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

function mapUuidArrayValue(
  values: readonly string[],
  basePath: string,
  code: string,
  message: string,
): { uuids: UuidString[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const uuids: UuidString[] = [];

  values.forEach((value, index) => {
    const parsed = requireUuidField(value, joinIndexedPath(basePath, index), code, message);
    if (parsed.issue !== undefined) {
      issues.push(parsed.issue);
      return;
    }
    if (parsed.uuid !== undefined) {
      uuids.push(parsed.uuid);
    }
  });

  return { uuids, issues };
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

function mapCapabilityBlockValue(value: CapabilityBlockValue): CapabilityBlock {
  return { state: value.state };
}

function mapRoadAlignmentEntries(
  entries: readonly RoadAlignmentEntryValue[],
  basePath: string,
  issues: ValidationIssue[],
) {
  return entries.map((entry, index) => {
    const entryPath = joinIndexedPath(basePath, index);
    const entityId = requireUuidField(
      entry.entityId,
      joinFieldPath(entryPath, "entityId"),
      "DOMAIN_ROAD_ENTITY_ID_INVALID",
      "entityId could not be converted to a domain UuidString.",
    );
    const coordinateContextId = requireUuidField(
      entry.coordinateContextId,
      joinFieldPath(entryPath, "coordinateContextId"),
      "DOMAIN_ROAD_COORDINATE_CONTEXT_ID_INVALID",
      "coordinateContextId could not be converted to a domain UuidString.",
    );
    if (entityId.issue !== undefined) {
      issues.push(entityId.issue);
    }
    if (coordinateContextId.issue !== undefined) {
      issues.push(coordinateContextId.issue);
    }
    return {
      entityId: entityId.uuid!,
      coordinateContextId: coordinateContextId.uuid!,
      label: entry.label,
    };
  });
}

function mapRoadStationingValue(
  value: RoadStationingValue,
  basePath: string,
  issues: ValidationIssue[],
) {
  return {
    entries: value.entries.map((entry, index) => {
      const entryPath = joinIndexedPath(joinFieldPath(basePath, "entries"), index);
      const entityId = requireUuidField(
        entry.entityId,
        joinFieldPath(entryPath, "entityId"),
        "DOMAIN_ROAD_ENTITY_ID_INVALID",
        "entityId could not be converted to a domain UuidString.",
      );
      const alignmentId = requireUuidField(
        entry.alignmentId,
        joinFieldPath(entryPath, "alignmentId"),
        "DOMAIN_ROAD_ALIGNMENT_ID_INVALID",
        "alignmentId could not be converted to a domain UuidString.",
      );
      if (entityId.issue !== undefined) {
        issues.push(entityId.issue);
      }
      if (alignmentId.issue !== undefined) {
        issues.push(alignmentId.issue);
      }
      return {
        entityId: entityId.uuid!,
        alignmentId: alignmentId.uuid!,
        originStation: entry.originStation,
      };
    }),
  };
}

function mapRoadProfileEntries(
  entries: readonly RoadProfileEntryValue[],
  basePath: string,
  issues: ValidationIssue[],
) {
  return entries.map((entry, index) => {
    const entryPath = joinIndexedPath(basePath, index);
    const entityId = requireUuidField(
      entry.entityId,
      joinFieldPath(entryPath, "entityId"),
      "DOMAIN_ROAD_ENTITY_ID_INVALID",
      "entityId could not be converted to a domain UuidString.",
    );
    const alignmentId = requireUuidField(
      entry.alignmentId,
      joinFieldPath(entryPath, "alignmentId"),
      "DOMAIN_ROAD_ALIGNMENT_ID_INVALID",
      "alignmentId could not be converted to a domain UuidString.",
    );
    if (entityId.issue !== undefined) {
      issues.push(entityId.issue);
    }
    if (alignmentId.issue !== undefined) {
      issues.push(alignmentId.issue);
    }
    return {
      entityId: entityId.uuid!,
      alignmentId: alignmentId.uuid!,
      label: entry.label,
    };
  });
}

function mapRoadCrossSectionEntries(
  entries: readonly RoadCrossSectionEntryValue[],
  basePath: string,
  issues: ValidationIssue[],
) {
  return entries.map((entry, index) => {
    const entryPath = joinIndexedPath(basePath, index);
    const entityId = requireUuidField(
      entry.entityId,
      joinFieldPath(entryPath, "entityId"),
      "DOMAIN_ROAD_ENTITY_ID_INVALID",
      "entityId could not be converted to a domain UuidString.",
    );
    const profileId = requireUuidField(
      entry.profileId,
      joinFieldPath(entryPath, "profileId"),
      "DOMAIN_ROAD_PROFILE_ID_INVALID",
      "profileId could not be converted to a domain UuidString.",
    );
    if (entityId.issue !== undefined) {
      issues.push(entityId.issue);
    }
    if (profileId.issue !== undefined) {
      issues.push(profileId.issue);
    }
    return {
      entityId: entityId.uuid!,
      profileId: profileId.uuid!,
      label: entry.label,
    };
  });
}

function mapRoadBridgeEntries(
  entries: readonly RoadBridgeEntryValue[],
  basePath: string,
  issues: ValidationIssue[],
) {
  return entries.map((entry, index) => {
    const entryPath = joinIndexedPath(basePath, index);
    const entityId = requireUuidField(
      entry.entityId,
      joinFieldPath(entryPath, "entityId"),
      "DOMAIN_ROAD_ENTITY_ID_INVALID",
      "entityId could not be converted to a domain UuidString.",
    );
    const alignmentId = requireUuidField(
      entry.alignmentId,
      joinFieldPath(entryPath, "alignmentId"),
      "DOMAIN_ROAD_ALIGNMENT_ID_INVALID",
      "alignmentId could not be converted to a domain UuidString.",
    );
    if (entityId.issue !== undefined) {
      issues.push(entityId.issue);
    }
    if (alignmentId.issue !== undefined) {
      issues.push(alignmentId.issue);
    }
    return {
      entityId: entityId.uuid!,
      alignmentId: alignmentId.uuid!,
      label: entry.label,
    };
  });
}

function mapStructuralModelValue(
  value: StructuralModelValue,
  basePath: string,
  issues: ValidationIssue[],
) {
  const mapEntityId = (id: string, fieldPath: string) =>
    requireUuidField(
      id,
      fieldPath,
      "DOMAIN_FRAME_ENTITY_ID_INVALID",
      "entityId could not be converted to a domain UuidString.",
    );

  return {
    nodes: value.nodes.map((node, index) => {
      const nodePath = joinIndexedPath(joinFieldPath(basePath, "nodes"), index);
      const entityId = mapEntityId(node.entityId, joinFieldPath(nodePath, "entityId"));
      const coordinateContextId = requireUuidField(
        node.coordinateContextId,
        joinFieldPath(nodePath, "coordinateContextId"),
        "DOMAIN_FRAME_COORDINATE_CONTEXT_ID_INVALID",
        "coordinateContextId could not be converted to a domain UuidString.",
      );
      if (entityId.issue !== undefined) {
        issues.push(entityId.issue);
      }
      if (coordinateContextId.issue !== undefined) {
        issues.push(coordinateContextId.issue);
      }
      return {
        entityId: entityId.uuid!,
        coordinateContextId: coordinateContextId.uuid!,
        x: node.x,
        y: node.y,
        z: node.z,
      };
    }),
    materials: value.materials.map((material, index) => {
      const materialPath = joinIndexedPath(joinFieldPath(basePath, "materials"), index);
      const entityId = mapEntityId(material.entityId, joinFieldPath(materialPath, "entityId"));
      if (entityId.issue !== undefined) {
        issues.push(entityId.issue);
      }
      return { entityId: entityId.uuid!, label: material.label };
    }),
    sections: value.sections.map((section, index) => {
      const sectionPath = joinIndexedPath(joinFieldPath(basePath, "sections"), index);
      const entityId = mapEntityId(section.entityId, joinFieldPath(sectionPath, "entityId"));
      if (entityId.issue !== undefined) {
        issues.push(entityId.issue);
      }
      return { entityId: entityId.uuid!, label: section.label };
    }),
    members: value.members.map((member, index) => {
      const memberPath = joinIndexedPath(joinFieldPath(basePath, "members"), index);
      const entityId = mapEntityId(member.entityId, joinFieldPath(memberPath, "entityId"));
      const nodeIId = requireUuidField(
        member.nodeIId,
        joinFieldPath(memberPath, "nodeIId"),
        "DOMAIN_FRAME_NODE_ID_INVALID",
        "nodeIId could not be converted to a domain UuidString.",
      );
      const nodeJId = requireUuidField(
        member.nodeJId,
        joinFieldPath(memberPath, "nodeJId"),
        "DOMAIN_FRAME_NODE_ID_INVALID",
        "nodeJId could not be converted to a domain UuidString.",
      );
      const materialId = requireUuidField(
        member.materialId,
        joinFieldPath(memberPath, "materialId"),
        "DOMAIN_FRAME_MATERIAL_ID_INVALID",
        "materialId could not be converted to a domain UuidString.",
      );
      const sectionId = requireUuidField(
        member.sectionId,
        joinFieldPath(memberPath, "sectionId"),
        "DOMAIN_FRAME_SECTION_ID_INVALID",
        "sectionId could not be converted to a domain UuidString.",
      );
      [entityId, nodeIId, nodeJId, materialId, sectionId].forEach((result) => {
        if (result.issue !== undefined) {
          issues.push(result.issue);
        }
      });
      return {
        entityId: entityId.uuid!,
        nodeIId: nodeIId.uuid!,
        nodeJId: nodeJId.uuid!,
        materialId: materialId.uuid!,
        sectionId: sectionId.uuid!,
      };
    }),
    supports: value.supports.map((support, index) => {
      const supportPath = joinIndexedPath(joinFieldPath(basePath, "supports"), index);
      const entityId = mapEntityId(support.entityId, joinFieldPath(supportPath, "entityId"));
      const nodeId = requireUuidField(
        support.nodeId,
        joinFieldPath(supportPath, "nodeId"),
        "DOMAIN_FRAME_NODE_ID_INVALID",
        "nodeId could not be converted to a domain UuidString.",
      );
      if (entityId.issue !== undefined) {
        issues.push(entityId.issue);
      }
      if (nodeId.issue !== undefined) {
        issues.push(nodeId.issue);
      }
      return { entityId: entityId.uuid!, nodeId: nodeId.uuid!, label: support.label };
    }),
  };
}

function mapLoadDefinitionEntries(
  entries: readonly LoadDefinitionEntryValue[],
  basePath: string,
  issues: ValidationIssue[],
) {
  return entries.map((entry, index) => {
    const entryPath = joinIndexedPath(basePath, index);
    const entityId = requireUuidField(
      entry.entityId,
      joinFieldPath(entryPath, "entityId"),
      "DOMAIN_FRAME_ENTITY_ID_INVALID",
      "entityId could not be converted to a domain UuidString.",
    );
    if (entityId.issue !== undefined) {
      issues.push(entityId.issue);
    }
    return {
      entityId: entityId.uuid!,
      label: entry.label,
      loadKind: entry.loadKind,
    };
  });
}

function mapAnalysisSettingsValue(
  value: AnalysisSettingsValue,
  basePath: string,
  issues: ValidationIssue[],
) {
  const settingsId = requireUuidField(
    value.settingsId,
    joinFieldPath(basePath, "settingsId"),
    "DOMAIN_FRAME_SETTINGS_ID_INVALID",
    "settingsId could not be converted to a domain UuidString.",
  );
  if (settingsId.issue !== undefined) {
    issues.push(settingsId.issue);
  }
  return {
    settingsId: settingsId.uuid!,
    solverFamily: value.solverFamily,
    settingsVersion: value.settingsVersion,
  };
}

function mapTransferBindings(
  bindings: readonly TransferBindingValue[],
  basePath: string,
  issues: ValidationIssue[],
): TransferBinding[] {
  const mappedBindings: TransferBinding[] = [];

  bindings.forEach((binding, index) => {
    const bindingPath = joinIndexedPath(basePath, index);
    const bindingId = requireUuidField(
      binding.bindingId,
      joinFieldPath(bindingPath, "bindingId"),
      "DOMAIN_FRAME_BINDING_ID_INVALID",
      "bindingId could not be converted to a domain UuidString.",
    );
    const sourceMapped = mapDocumentReferenceValue(
      binding.sourceDocumentRef,
      joinFieldPath(bindingPath, "sourceDocumentRef"),
    );
    const targetEntityId = requireUuidField(
      binding.targetEntityId,
      joinFieldPath(bindingPath, "targetEntityId"),
      "DOMAIN_FRAME_TARGET_ENTITY_ID_INVALID",
      "targetEntityId could not be converted to a domain UuidString.",
    );
    const sourceEntityId = requireUuidField(
      binding.sourceEntityId,
      joinFieldPath(bindingPath, "sourceEntityId"),
      "DOMAIN_FRAME_SOURCE_ENTITY_ID_INVALID",
      "sourceEntityId could not be converted to a domain UuidString.",
    );
    if (bindingId.issue !== undefined) {
      issues.push(bindingId.issue);
    }
    if (!sourceMapped.ok) {
      issues.push(...sourceMapped.validation.issues);
    }
    if (targetEntityId.issue !== undefined) {
      issues.push(targetEntityId.issue);
    }
    if (sourceEntityId.issue !== undefined) {
      issues.push(sourceEntityId.issue);
    }
    if (
      bindingId.uuid === undefined ||
      !sourceMapped.ok ||
      targetEntityId.uuid === undefined ||
      sourceEntityId.uuid === undefined
    ) {
      return;
    }

    mappedBindings.push({
      bindingId: bindingId.uuid,
      sourceDocumentRef: sourceMapped.data,
      mappingProvenance: binding.mappingProvenance,
      targetEntityKind: binding.targetEntityKind,
      targetEntityId: targetEntityId.uuid,
      sourceEntityId: sourceEntityId.uuid,
    });
  });

  return mappedBindings;
}

function mapDocumentReferenceArray(
  refs: readonly DocumentReferenceValue[] | undefined,
  basePath: string,
  issues: ValidationIssue[],
): DocumentReference[] {
  if (refs === undefined) {
    return [];
  }

  const mappedRefs: DocumentReference[] = [];
  refs.forEach((ref, index) => {
    const mapped = mapDocumentReferenceValue(ref, joinIndexedPath(basePath, index));
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      mappedRefs.push(mapped.data);
    }
  });
  return mappedRefs;
}

function mapImmutableResourceReferenceArray(
  refs: readonly ImmutableResourceReferenceValue[] | undefined,
  basePath: string,
  issues: ValidationIssue[],
): ImmutableResourceReference[] {
  if (refs === undefined) {
    return [];
  }

  return refs.map((ref, index) => {
    const mapped = mapImmutableResourceReferenceValue(ref, joinIndexedPath(basePath, index));
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
      return {
        uri: ref.uri,
        contentChecksum: {
          algorithm: ref.contentChecksum.algorithm,
          hexDigest: ref.contentChecksum.hexDigest,
        },
      };
    }
    return mapped.data;
  });
}

export function mapRoadDesignDocumentValue(
  value: RoadDesignDocumentValue,
  basePath = "",
): DomainMapResult<RoadDesignDocument> {
  const envelopeMapped = mapCommonEnvelopeValue(value, basePath);
  if (!envelopeMapped.ok) {
    return envelopeMapped;
  }

  const issues: ValidationIssue[] = [];
  const coordinateContexts: CoordinateContext[] = [];
  value.coordinateContexts.forEach((context, index) => {
    const mapped = mapCoordinateContextValue(
      context,
      joinIndexedPath(joinFieldPath(basePath, "coordinateContexts"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      coordinateContexts.push(mapped.data);
    }
  });

  const unitContextMapped = mapUnitContextValue(
    value.unitContext,
    joinFieldPath(basePath, "unitContext"),
  );
  if (!unitContextMapped.ok) {
    issues.push(...unitContextMapped.validation.issues);
  }

  const stableIdRegistry: StableEntityId[] = [];
  value.stableIdRegistry.forEach((entry, index) => {
    const mapped = mapStableEntityIdValue(
      entry,
      joinIndexedPath(joinFieldPath(basePath, "stableIdRegistry"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      stableIdRegistry.push(mapped.data);
    }
  });

  const validationMapped = mapDocumentReferenceValue(
    value.validation,
    joinFieldPath(basePath, "validation"),
  );
  if (!validationMapped.ok) {
    issues.push(...validationMapped.validation.issues);
  }

  const revisionMapped = mapRevisionMetadataValue(
    value.revision,
    joinFieldPath(basePath, "revision"),
  );
  if (!revisionMapped.ok) {
    issues.push(...revisionMapped.validation.issues);
  }

  const alignments = mapRoadAlignmentEntries(
    value.alignments,
    joinFieldPath(basePath, "alignments"),
    issues,
  );
  const stationing = mapRoadStationingValue(
    value.stationing,
    joinFieldPath(basePath, "stationing"),
    issues,
  );
  const profiles = mapRoadProfileEntries(
    value.profiles,
    joinFieldPath(basePath, "profiles"),
    issues,
  );
  const crossSections = mapRoadCrossSectionEntries(
    value.crossSections,
    joinFieldPath(basePath, "crossSections"),
    issues,
  );
  const bridges = mapRoadBridgeEntries(
    value.bridges,
    joinFieldPath(basePath, "bridges"),
    issues,
  );
  const sourceRefs = mapDocumentReferenceArray(
    value.sourceRefs,
    joinFieldPath(basePath, "sourceRefs"),
    issues,
  );
  const attachments = mapImmutableResourceReferenceArray(
    value.attachments,
    joinFieldPath(basePath, "attachments"),
    issues,
  );

  if (
    issues.length > 0 ||
    !unitContextMapped.ok ||
    !validationMapped.ok ||
    !revisionMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  const envelope = envelopeMapped.data;
  return {
    ok: true,
    data: {
      schemaId: envelope.schemaId,
      schemaVersion: envelope.schemaVersion,
      documentKind: ROAD_DESIGN_DOCUMENT_KIND,
      documentId: envelope.documentId,
      revisionId: envelope.revisionId,
      contentChecksum: envelope.contentChecksum,
      provenance: envelope.provenance,
      ...(envelope.extensions !== undefined ? { extensions: envelope.extensions } : {}),
      ...(envelope.unknownFieldStoreRef !== undefined
        ? { unknownFieldStoreRef: envelope.unknownFieldStoreRef }
        : {}),
      ...(envelope.migrationProvenanceRef !== undefined
        ? { migrationProvenanceRef: envelope.migrationProvenanceRef }
        : {}),
      coordinateContexts,
      unitContext: unitContextMapped.data,
      stableIdRegistry,
      alignments,
      stationing,
      profiles,
      crossSections,
      bridges,
      revision: revisionMapped.data,
      validation: validationMapped.data,
      ...(value.topologyCapability !== undefined
        ? { topologyCapability: mapCapabilityBlockValue(value.topologyCapability) }
        : {}),
      ...(value.bridgeGeometryCapability !== undefined
        ? { bridgeGeometryCapability: mapCapabilityBlockValue(value.bridgeGeometryCapability) }
        : {}),
      ...(value.ldistCapability !== undefined
        ? { ldistCapability: mapCapabilityBlockValue(value.ldistCapability) }
        : {}),
      ...(value.haunchCapability !== undefined
        ? { haunchCapability: mapCapabilityBlockValue(value.haunchCapability) }
        : {}),
      ...(value.hosoCapability !== undefined
        ? { hosoCapability: mapCapabilityBlockValue(value.hosoCapability) }
        : {}),
      ...(value.drawingCapability !== undefined
        ? { drawingCapability: mapCapabilityBlockValue(value.drawingCapability) }
        : {}),
      ...(sourceRefs.length > 0 ? { sourceRefs } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
    },
  };
}

export function mapBridgeFrameAnalysisDocumentValue(
  value: BridgeFrameAnalysisDocumentValue,
  basePath = "",
): DomainMapResult<BridgeFrameAnalysisDocument> {
  const envelopeMapped = mapCommonEnvelopeValue(value, basePath);
  if (!envelopeMapped.ok) {
    return envelopeMapped;
  }

  const issues: ValidationIssue[] = [];
  const coordinateContexts: CoordinateContext[] = [];
  value.coordinateContexts.forEach((context, index) => {
    const mapped = mapCoordinateContextValue(
      context,
      joinIndexedPath(joinFieldPath(basePath, "coordinateContexts"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
    } else {
      coordinateContexts.push(mapped.data);
    }
  });

  const unitContextMapped = mapUnitContextValue(
    value.unitContext,
    joinFieldPath(basePath, "unitContext"),
  );
  if (!unitContextMapped.ok) {
    issues.push(...unitContextMapped.validation.issues);
  }

  const validationMapped = mapDocumentReferenceValue(
    value.validation,
    joinFieldPath(basePath, "validation"),
  );
  if (!validationMapped.ok) {
    issues.push(...validationMapped.validation.issues);
  }

  const revisionMapped = mapRevisionMetadataValue(
    value.revision,
    joinFieldPath(basePath, "revision"),
  );
  if (!revisionMapped.ok) {
    issues.push(...revisionMapped.validation.issues);
  }

  const structuralModel = mapStructuralModelValue(
    value.structuralModel,
    joinFieldPath(basePath, "structuralModel"),
    issues,
  );
  const loadDefinitions = mapLoadDefinitionEntries(
    value.loadDefinitions,
    joinFieldPath(basePath, "loadDefinitions"),
    issues,
  );
  const analysisSettings = mapAnalysisSettingsValue(
    value.analysisSettings,
    joinFieldPath(basePath, "analysisSettings"),
    issues,
  );
  const transferBindings = mapTransferBindings(
    value.transferBindings,
    joinFieldPath(basePath, "transferBindings"),
    issues,
  );
  const persistedResultRefs = mapDocumentReferenceArray(
    value.persistedResultRefs,
    joinFieldPath(basePath, "persistedResultRefs"),
    issues,
  );
  const reportRefs = mapDocumentReferenceArray(
    value.reportRefs,
    joinFieldPath(basePath, "reportRefs"),
    issues,
  );
  const draftRefs = mapDocumentReferenceArray(
    value.draftRefs,
    joinFieldPath(basePath, "draftRefs"),
    issues,
  );
  const attachments = mapImmutableResourceReferenceArray(
    value.attachments,
    joinFieldPath(basePath, "attachments"),
    issues,
  );

  if (
    issues.length > 0 ||
    !unitContextMapped.ok ||
    !validationMapped.ok ||
    !revisionMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  const envelope = envelopeMapped.data;
  return {
    ok: true,
    data: {
      schemaId: envelope.schemaId,
      schemaVersion: envelope.schemaVersion,
      documentKind: BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND,
      documentId: envelope.documentId,
      revisionId: envelope.revisionId,
      contentChecksum: envelope.contentChecksum,
      provenance: envelope.provenance,
      ...(envelope.extensions !== undefined ? { extensions: envelope.extensions } : {}),
      ...(envelope.unknownFieldStoreRef !== undefined
        ? { unknownFieldStoreRef: envelope.unknownFieldStoreRef }
        : {}),
      ...(envelope.migrationProvenanceRef !== undefined
        ? { migrationProvenanceRef: envelope.migrationProvenanceRef }
        : {}),
      coordinateContexts,
      unitContext: unitContextMapped.data,
      structuralModel,
      loadDefinitions,
      analysisSettings,
      transferBindings,
      revision: revisionMapped.data,
      validation: validationMapped.data,
      ...(value.springsCapability !== undefined
        ? { springsCapability: mapCapabilityBlockValue(value.springsCapability) }
        : {}),
      ...(value.memberReleasesCapability !== undefined
        ? { memberReleasesCapability: mapCapabilityBlockValue(value.memberReleasesCapability) }
        : {}),
      ...(value.rigidOffsetsCapability !== undefined
        ? { rigidOffsetsCapability: mapCapabilityBlockValue(value.rigidOffsetsCapability) }
        : {}),
      ...(value.fixedLoadsCapability !== undefined
        ? { fixedLoadsCapability: mapCapabilityBlockValue(value.fixedLoadsCapability) }
        : {}),
      ...(value.influenceLiveLoadsCapability !== undefined
        ? {
            influenceLiveLoadsCapability: mapCapabilityBlockValue(
              value.influenceLiveLoadsCapability,
            ),
          }
        : {}),
      ...(value.staticCombinationsCapability !== undefined
        ? {
            staticCombinationsCapability: mapCapabilityBlockValue(
              value.staticCombinationsCapability,
            ),
          }
        : {}),
      ...(value.modalAnalysisCapability !== undefined
        ? { modalAnalysisCapability: mapCapabilityBlockValue(value.modalAnalysisCapability) }
        : {}),
      ...(value.responseSpectrumCapability !== undefined
        ? {
            responseSpectrumCapability: mapCapabilityBlockValue(value.responseSpectrumCapability),
          }
        : {}),
      ...(persistedResultRefs.length > 0 ? { persistedResultRefs } : {}),
      ...(reportRefs.length > 0 ? { reportRefs } : {}),
      ...(draftRefs.length > 0 ? { draftRefs } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
    },
  };
}

function mapPolyline3Value(value: Polyline3Value): Polyline3 {
  return {
    points: value.points.map((point) => ({ x: point.x, y: point.y, z: point.z })),
  };
}

function mapPolygon3Value(value: Polygon3Value): Polygon3 {
  return {
    vertices: value.vertices.map((vertex) => ({ x: vertex.x, y: vertex.y, z: vertex.z })),
  };
}

function mapPackageCapabilityEntryValue(value: PackageCapabilityEntryValue): PackageCapabilityEntry {
  return {
    capabilityId: value.capabilityId,
    status: value.status,
    ...(value.critical !== undefined ? { critical: value.critical } : {}),
  };
}

function mapCapabilityAssessmentSummaryValue(
  value: CapabilityAssessmentSummaryValue,
): CapabilityAssessmentSummary {
  return {
    mutationBlocked: value.mutationBlocked,
    ...(value.blockedCapabilityIds !== undefined
      ? { blockedCapabilityIds: value.blockedCapabilityIds }
      : {}),
  };
}

function mapPackageArtifactReferenceValue(
  value: PackageArtifactReferenceValue,
  basePath: string,
): DomainMapResult<PackageArtifactReference> {
  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  const packageIdResult = requireUuidField(
    value.packageId,
    joinFieldPath(basePath, "packageId"),
    "DOMAIN_PACKAGE_ID_INVALID",
    "packageId could not be converted to a domain UuidString.",
  );
  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );

  const issues: ValidationIssue[] = [];
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }
  if (packageIdResult.issue !== undefined) {
    issues.push(packageIdResult.issue);
  }
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
  }
  if (
    issues.length > 0 ||
    schemaVersionResult.schemaVersion === undefined ||
    packageIdResult.uuid === undefined ||
    !checksumMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      packageId: packageIdResult.uuid,
      schemaVersion: schemaVersionResult.schemaVersion,
      contentChecksum: checksumMapped.data,
    },
  };
}

function mapTransferRecordArtifactReferenceValue(
  value: TransferRecordArtifactReferenceValue,
  basePath: string,
): DomainMapResult<TransferRecordArtifactReference> {
  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  const recordIdResult = requireUuidField(
    value.recordId,
    joinFieldPath(basePath, "recordId"),
    "DOMAIN_RECORD_ID_INVALID",
    "recordId could not be converted to a domain UuidString.",
  );
  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );

  const issues: ValidationIssue[] = [];
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }
  if (recordIdResult.issue !== undefined) {
    issues.push(recordIdResult.issue);
  }
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
  }
  if (
    issues.length > 0 ||
    schemaVersionResult.schemaVersion === undefined ||
    recordIdResult.uuid === undefined ||
    !checksumMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      recordId: recordIdResult.uuid,
      schemaVersion: schemaVersionResult.schemaVersion,
      contentChecksum: checksumMapped.data,
    },
  };
}

function mapPolicyReferenceValue(
  value: PolicyReferenceValue,
  basePath: string,
): DomainMapResult<PolicyReference> {
  const schemaVersionResult = requireSchemaVersionField(
    value.schemaVersion,
    basePath,
    "DOMAIN_SCHEMA_VERSION_INVALID",
  );
  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );

  const issues: ValidationIssue[] = [];
  if (schemaVersionResult.issue !== undefined) {
    issues.push(schemaVersionResult.issue);
  }
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
  }
  if (issues.length > 0 || schemaVersionResult.schemaVersion === undefined || !checksumMapped.ok) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      policyId: value.policyId,
      schemaVersion: schemaVersionResult.schemaVersion,
      contentChecksum: checksumMapped.data,
    },
  };
}

function mapGeometryProvenanceValue(
  value: ProvenanceValue,
  basePath: string,
): DomainMapResult<Provenance> {
  const mapped = mapProvenanceValue(value);
  if (!mapped.ok) {
    return domainMapFailure(
      mapped.validation.issues.map((issue) => ({
        ...issue,
        path: joinFieldPath(basePath, issue.path.replace(/^\//, "")),
      })),
    );
  }
  return mapped;
}

function mapGeometryEntityBaseFields(
  value: {
    readonly entityId: string;
    readonly provenance: ProvenanceValue;
    readonly dependencyIds: readonly string[];
  },
  basePath: string,
): {
  readonly entityId?: UuidString;
  readonly provenance?: Provenance;
  readonly dependencyIds?: UuidString[];
  readonly issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  const entityIdResult = requireUuidField(
    value.entityId,
    joinFieldPath(basePath, "entityId"),
    "DOMAIN_ENTITY_ID_INVALID",
    "entityId could not be converted to a domain UuidString.",
  );
  if (entityIdResult.issue !== undefined) {
    issues.push(entityIdResult.issue);
  }

  const provenanceMapped = mapGeometryProvenanceValue(
    value.provenance,
    joinFieldPath(basePath, "provenance"),
  );
  if (!provenanceMapped.ok) {
    issues.push(...provenanceMapped.validation.issues);
  }

  const dependencyIdsMapped = mapUuidArrayValue(
    value.dependencyIds,
    joinFieldPath(basePath, "dependencyIds"),
    "DOMAIN_DEPENDENCY_ID_INVALID",
    "dependencyIds entry could not be converted to a domain UuidString.",
  );
  issues.push(...dependencyIdsMapped.issues);

  return {
    entityId: entityIdResult.uuid,
    provenance: provenanceMapped.ok ? provenanceMapped.data : undefined,
    dependencyIds: dependencyIdsMapped.issues.length === 0 ? dependencyIdsMapped.uuids : undefined,
    issues,
  };
}

function mapTransferPackageGeometryValue(
  value: TransferPackageGeometryValue,
  basePath: string,
): DomainMapResult<TransferPackageGeometry> {
  const issues: ValidationIssue[] = [];

  const alignmentRefs: TransferPackageGeometry["alignmentRefs"][number][] = [];
  value.alignmentRefs.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "alignmentRefs"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    const sourceAlignmentId = requireUuidField(
      entry.sourceAlignmentId,
      joinFieldPath(entryPath, "sourceAlignmentId"),
      "DOMAIN_SOURCE_ALIGNMENT_ID_INVALID",
      "sourceAlignmentId could not be converted to a domain UuidString.",
    );
    if (sourceAlignmentId.issue !== undefined) {
      issues.push(sourceAlignmentId.issue);
    }
    if (
      base.entityId !== undefined &&
      base.provenance !== undefined &&
      base.dependencyIds !== undefined &&
      sourceAlignmentId.uuid !== undefined
    ) {
      alignmentRefs.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        sourceAlignmentId: sourceAlignmentId.uuid,
        ...(entry.label !== undefined ? { label: entry.label } : {}),
      });
    }
  });

  const stationRefs: TransferPackageGeometry["stationRefs"][number][] = [];
  value.stationRefs.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "stationRefs"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    const alignmentRefId = requireUuidField(
      entry.alignmentRefId,
      joinFieldPath(entryPath, "alignmentRefId"),
      "DOMAIN_ALIGNMENT_REF_ID_INVALID",
      "alignmentRefId could not be converted to a domain UuidString.",
    );
    if (alignmentRefId.issue !== undefined) {
      issues.push(alignmentRefId.issue);
    }
    if (
      base.entityId !== undefined &&
      base.provenance !== undefined &&
      base.dependencyIds !== undefined &&
      alignmentRefId.uuid !== undefined
    ) {
      stationRefs.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        alignmentRefId: alignmentRefId.uuid,
        station: entry.station,
      });
    }
  });

  const substructures: TransferPackageGeometry["substructures"][number][] = [];
  value.substructures.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "substructures"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    if (base.entityId !== undefined && base.provenance !== undefined && base.dependencyIds !== undefined) {
      substructures.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        kind: entry.kind,
        ...(entry.point !== undefined ? { point: entry.point } : {}),
        ...(entry.polyline !== undefined ? { polyline: mapPolyline3Value(entry.polyline) } : {}),
      });
    }
  });

  const bearingLines: TransferPackageGeometry["bearingLines"][number][] = [];
  value.bearingLines.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "bearingLines"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    const substructureId = requireUuidField(
      entry.substructureId,
      joinFieldPath(entryPath, "substructureId"),
      "DOMAIN_SUBSTRUCTURE_ID_INVALID",
      "substructureId could not be converted to a domain UuidString.",
    );
    if (substructureId.issue !== undefined) {
      issues.push(substructureId.issue);
    }
    if (
      base.entityId !== undefined &&
      base.provenance !== undefined &&
      base.dependencyIds !== undefined &&
      substructureId.uuid !== undefined
    ) {
      bearingLines.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        polyline: mapPolyline3Value(entry.polyline),
        substructureId: substructureId.uuid,
      });
    }
  });

  const spans: TransferPackageGeometry["spans"][number][] = [];
  value.spans.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "spans"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    const startRefId = requireUuidField(
      entry.startRef.refId,
      joinFieldPath(entryPath, "startRef/refId"),
      "DOMAIN_SPAN_START_REF_ID_INVALID",
      "startRef.refId could not be converted to a domain UuidString.",
    );
    if (startRefId.issue !== undefined) {
      issues.push(startRefId.issue);
    }
    const endRefId = requireUuidField(
      entry.endRef.refId,
      joinFieldPath(entryPath, "endRef/refId"),
      "DOMAIN_SPAN_END_REF_ID_INVALID",
      "endRef.refId could not be converted to a domain UuidString.",
    );
    if (endRefId.issue !== undefined) {
      issues.push(endRefId.issue);
    }
    if (
      base.entityId !== undefined &&
      base.provenance !== undefined &&
      base.dependencyIds !== undefined &&
      startRefId.uuid !== undefined &&
      endRefId.uuid !== undefined
    ) {
      spans.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        startRef: { refKind: entry.startRef.refKind, refId: startRefId.uuid },
        endRef: { refKind: entry.endRef.refKind, refId: endRefId.uuid },
        length: entry.length,
      });
    }
  });

  const mainGirderCandidates: TransferPackageGeometry["mainGirderCandidates"][number][] = [];
  value.mainGirderCandidates.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "mainGirderCandidates"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    const spanIdsMapped = mapUuidArrayValue(
      entry.spanIds,
      joinFieldPath(entryPath, "spanIds"),
      "DOMAIN_SPAN_ID_INVALID",
      "spanIds entry could not be converted to a domain UuidString.",
    );
    issues.push(...spanIdsMapped.issues);
    if (
      base.entityId !== undefined &&
      base.provenance !== undefined &&
      base.dependencyIds !== undefined &&
      spanIdsMapped.issues.length === 0
    ) {
      mainGirderCandidates.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        polyline: mapPolyline3Value(entry.polyline),
        spanIds: spanIdsMapped.uuids,
      });
    }
  });

  const crossBeamCandidates: TransferPackageGeometry["crossBeamCandidates"][number][] = [];
  value.crossBeamCandidates.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "crossBeamCandidates"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    const mainGirderIdsMapped = mapUuidArrayValue(
      entry.mainGirderIds,
      joinFieldPath(entryPath, "mainGirderIds"),
      "DOMAIN_MAIN_GIRDER_ID_INVALID",
      "mainGirderIds entry could not be converted to a domain UuidString.",
    );
    issues.push(...mainGirderIdsMapped.issues);
    if (
      base.entityId !== undefined &&
      base.provenance !== undefined &&
      base.dependencyIds !== undefined &&
      mainGirderIdsMapped.issues.length === 0
    ) {
      crossBeamCandidates.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        polyline: mapPolyline3Value(entry.polyline),
        mainGirderIds: mainGirderIdsMapped.uuids,
      });
    }
  });

  const surfaceRegions: TransferPackageGeometry["surfaceRegions"][number][] = [];
  value.surfaceRegions.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "surfaceRegions"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    if (base.entityId !== undefined && base.provenance !== undefined && base.dependencyIds !== undefined) {
      surfaceRegions.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        polygon: mapPolygon3Value(entry.polygon),
        role: entry.role,
      });
    }
  });

  const roadRegions: TransferPackageGeometry["roadRegions"][number][] = [];
  value.roadRegions.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "roadRegions"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    if (base.entityId !== undefined && base.provenance !== undefined && base.dependencyIds !== undefined) {
      roadRegions.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        polygon: mapPolygon3Value(entry.polygon),
        role: entry.role,
      });
    }
  });

  const loadPlacementCandidates: TransferPackageGeometry["loadPlacementCandidates"][number][] = [];
  value.loadPlacementCandidates.forEach((entry, index) => {
    const entryPath = joinIndexedPath(joinFieldPath(basePath, "loadPlacementCandidates"), index);
    const base = mapGeometryEntityBaseFields(entry, entryPath);
    issues.push(...base.issues);
    const roadRegionIdsMapped = mapUuidArrayValue(
      entry.roadRegionIds,
      joinFieldPath(entryPath, "roadRegionIds"),
      "DOMAIN_ROAD_REGION_ID_INVALID",
      "roadRegionIds entry could not be converted to a domain UuidString.",
    );
    issues.push(...roadRegionIdsMapped.issues);
    if (
      base.entityId !== undefined &&
      base.provenance !== undefined &&
      base.dependencyIds !== undefined &&
      roadRegionIdsMapped.issues.length === 0
    ) {
      loadPlacementCandidates.push({
        entityId: base.entityId,
        provenance: base.provenance,
        dependencyIds: base.dependencyIds,
        ...(entry.polyline !== undefined ? { polyline: mapPolyline3Value(entry.polyline) } : {}),
        ...(entry.polygon !== undefined ? { polygon: mapPolygon3Value(entry.polygon) } : {}),
        roadRegionIds: roadRegionIdsMapped.uuids,
      });
    }
  });

  if (issues.length > 0) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      alignmentRefs,
      stationRefs,
      substructures,
      bearingLines,
      spans,
      mainGirderCandidates,
      crossBeamCandidates,
      surfaceRegions,
      roadRegions,
      loadPlacementCandidates,
    },
  };
}

export function mapRoadToFrameTransferPackageValue(
  value: RoadToFrameTransferPackageValue,
  basePath = "",
): DomainMapResult<RoadToFrameTransferPackage> {
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

  const packageIdResult = requireUuidField(
    value.packageId,
    joinFieldPath(basePath, "packageId"),
    "DOMAIN_PACKAGE_ID_INVALID",
    "packageId could not be converted to a domain UuidString.",
  );
  if (packageIdResult.issue !== undefined) {
    issues.push(packageIdResult.issue);
  }

  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
  }

  const provenanceMapped = mapProvenanceValue(value.provenance);
  if (!provenanceMapped.ok) {
    issues.push(...provenanceMapped.validation.issues);
  }

  const sourceDocumentMapped = mapDocumentReferenceValue(
    value.sourceDocumentRef,
    joinFieldPath(basePath, "sourceDocumentRef"),
  );
  if (!sourceDocumentMapped.ok) {
    issues.push(...sourceDocumentMapped.validation.issues);
  }

  const coordinateContextMapped = mapCoordinateContextValue(
    value.coordinateContext,
    joinFieldPath(basePath, "coordinateContext"),
  );
  if (!coordinateContextMapped.ok) {
    issues.push(...coordinateContextMapped.validation.issues);
  }

  const unitContextMapped = mapUnitContextValue(
    value.unitContext,
    joinFieldPath(basePath, "unitContext"),
  );
  if (!unitContextMapped.ok) {
    issues.push(...unitContextMapped.validation.issues);
  }

  let validationRefMapped: DomainMapResult<DocumentReference> | undefined;
  if (value.validationRef !== undefined) {
    validationRefMapped = mapDocumentReferenceValue(
      value.validationRef,
      joinFieldPath(basePath, "validationRef"),
    );
    if (!validationRefMapped.ok) {
      issues.push(...validationRefMapped.validation.issues);
    }
  }

  let unknownFieldStoreRefMapped: DomainMapResult<DocumentReference> | undefined;
  if (value.unknownFieldStoreRef !== undefined) {
    unknownFieldStoreRefMapped = mapDocumentReferenceValue(
      value.unknownFieldStoreRef,
      joinFieldPath(basePath, "unknownFieldStoreRef"),
    );
    if (!unknownFieldStoreRefMapped.ok) {
      issues.push(...unknownFieldStoreRefMapped.validation.issues);
    }
  }

  let parentPackageRefMapped: DomainMapResult<PackageArtifactReference> | undefined;
  if (value.parentPackageRef !== undefined) {
    parentPackageRefMapped = mapPackageArtifactReferenceValue(
      value.parentPackageRef,
      joinFieldPath(basePath, "parentPackageRef"),
    );
    if (!parentPackageRefMapped.ok) {
      issues.push(...parentPackageRefMapped.validation.issues);
    }
  }

  const geometryMapped = mapTransferPackageGeometryValue(
    value.geometry,
    joinFieldPath(basePath, "geometry"),
  );
  if (!geometryMapped.ok) {
    issues.push(...geometryMapped.validation.issues);
  }

  const selectionMapped = mapUuidArrayValue(
    value.selection,
    joinFieldPath(basePath, "selection"),
    "DOMAIN_SELECTION_ID_INVALID",
    "selection entry could not be converted to a domain UuidString.",
  );
  issues.push(...selectionMapped.issues);

  if (
    issues.length > 0 ||
    schemaId === undefined ||
    schemaVersionResult.schemaVersion === undefined ||
    packageIdResult.uuid === undefined ||
    !checksumMapped.ok ||
    !provenanceMapped.ok ||
    !sourceDocumentMapped.ok ||
    !coordinateContextMapped.ok ||
    !unitContextMapped.ok ||
    !geometryMapped.ok ||
    selectionMapped.issues.length > 0
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaId,
      schemaVersion: schemaVersionResult.schemaVersion,
      documentKind: value.documentKind,
      packageId: packageIdResult.uuid,
      contentChecksum: checksumMapped.data,
      provenance: provenanceMapped.data,
      sourceDocumentRef: sourceDocumentMapped.data,
      coordinateContext: coordinateContextMapped.data,
      unitContext: unitContextMapped.data,
      capabilities: value.capabilities.map(mapPackageCapabilityEntryValue),
      selection: selectionMapped.uuids,
      geometry: geometryMapped.data,
      ...(value.capabilityAssessmentSummary !== undefined
        ? {
            capabilityAssessmentSummary: mapCapabilityAssessmentSummaryValue(
              value.capabilityAssessmentSummary,
            ),
          }
        : {}),
      ...(validationRefMapped?.ok === true ? { validationRef: validationRefMapped.data } : {}),
      ...(unknownFieldStoreRefMapped?.ok === true
        ? { unknownFieldStoreRef: unknownFieldStoreRefMapped.data }
        : {}),
      ...(parentPackageRefMapped?.ok === true
        ? { parentPackageRef: parentPackageRefMapped.data }
        : {}),
      ...(value.extensions !== undefined ? { extensions: mapExtensionsValue(value.extensions) } : {}),
    },
  };
}

function mapEntityMappingValue(
  value: TransferRecordValue["entityMappings"][number],
  basePath: string,
): DomainMapResult<EntityMappingEntry> {
  const issues: ValidationIssue[] = [];

  const roadGeometryId = requireUuidField(
    value.roadGeometryId,
    joinFieldPath(basePath, "roadGeometryId"),
    "DOMAIN_ROAD_GEOMETRY_ID_INVALID",
    "roadGeometryId could not be converted to a domain UuidString.",
  );
  if (roadGeometryId.issue !== undefined) {
    issues.push(roadGeometryId.issue);
  }

  const frameEntityIdsMapped = mapUuidArrayValue(
    value.frameEntityIds,
    joinFieldPath(basePath, "frameEntityIds"),
    "DOMAIN_FRAME_ENTITY_ID_INVALID",
    "frameEntityIds entry could not be converted to a domain UuidString.",
  );
  issues.push(...frameEntityIdsMapped.issues);

  if (issues.length > 0 || roadGeometryId.uuid === undefined || frameEntityIdsMapped.issues.length > 0) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      roadGeometryId: roadGeometryId.uuid,
      frameEntityIds: frameEntityIdsMapped.uuids,
      disposition: value.disposition,
      ...(value.reason !== undefined ? { reason: value.reason } : {}),
    },
  };
}

function mapTransferDecisionValue(
  value: TransferRecordValue["acceptedChanges"][number],
  basePath: string,
): DomainMapResult<TransferDecisionEntry> {
  const issues: ValidationIssue[] = [];

  const decisionId = requireUuidField(
    value.decisionId,
    joinFieldPath(basePath, "decisionId"),
    "DOMAIN_DECISION_ID_INVALID",
    "decisionId could not be converted to a domain UuidString.",
  );
  if (decisionId.issue !== undefined) {
    issues.push(decisionId.issue);
  }

  let entityIdMapped: { uuid?: UuidString; issue?: ValidationIssue } | undefined;
  if (value.entityId !== undefined) {
    entityIdMapped = requireUuidField(
      value.entityId,
      joinFieldPath(basePath, "entityId"),
      "DOMAIN_DECISION_ENTITY_ID_INVALID",
      "entityId could not be converted to a domain UuidString.",
    );
    if (entityIdMapped.issue !== undefined) {
      issues.push(entityIdMapped.issue);
    }
  }

  if (issues.length > 0 || decisionId.uuid === undefined) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      decisionId: decisionId.uuid,
      reason: value.reason,
      ...(entityIdMapped?.uuid !== undefined ? { entityId: entityIdMapped.uuid } : {}),
      ...(value.fieldPath !== undefined ? { fieldPath: value.fieldPath } : {}),
    },
  };
}

function mapTransferCapabilityAssessmentEntryValue(
  value: TransferRecordValue["capabilityAssessment"][number],
): TransferCapabilityAssessmentEntry {
  return {
    capabilityId: value.capabilityId,
    producerStatus: value.producerStatus,
    consumerStatus: value.consumerStatus,
    blocked: value.blocked,
    ...(value.reason !== undefined ? { reason: value.reason } : {}),
  };
}

export function mapTransferRecordValue(
  value: TransferRecordValue,
  basePath = "",
): DomainMapResult<TransferRecord> {
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

  const recordIdResult = requireUuidField(
    value.recordId,
    joinFieldPath(basePath, "recordId"),
    "DOMAIN_RECORD_ID_INVALID",
    "recordId could not be converted to a domain UuidString.",
  );
  if (recordIdResult.issue !== undefined) {
    issues.push(recordIdResult.issue);
  }

  const checksumMapped = mapContentChecksumValue(
    value.contentChecksum,
    joinFieldPath(basePath, "contentChecksum"),
  );
  if (!checksumMapped.ok) {
    issues.push(...checksumMapped.validation.issues);
  }

  const packageRefMapped = mapPackageArtifactReferenceValue(
    value.packageRef,
    joinFieldPath(basePath, "packageRef"),
  );
  if (!packageRefMapped.ok) {
    issues.push(...packageRefMapped.validation.issues);
  }

  const sourceDocumentMapped = mapDocumentReferenceValue(
    value.sourceDocumentRef,
    joinFieldPath(basePath, "sourceDocumentRef"),
  );
  if (!sourceDocumentMapped.ok) {
    issues.push(...sourceDocumentMapped.validation.issues);
  }

  const targetBeforeMapped = mapDocumentReferenceValue(
    value.targetBefore,
    joinFieldPath(basePath, "targetBefore"),
  );
  if (!targetBeforeMapped.ok) {
    issues.push(...targetBeforeMapped.validation.issues);
  }

  let targetAfterMapped: DomainMapResult<DocumentReference> | undefined;
  if (value.targetAfter !== undefined) {
    targetAfterMapped = mapDocumentReferenceValue(
      value.targetAfter,
      joinFieldPath(basePath, "targetAfter"),
    );
    if (!targetAfterMapped.ok) {
      issues.push(...targetAfterMapped.validation.issues);
    }
  }

  let baselineRecordRefMapped: DomainMapResult<TransferRecordArtifactReference> | undefined;
  if (value.baselineRecordRef !== undefined) {
    baselineRecordRefMapped = mapTransferRecordArtifactReferenceValue(
      value.baselineRecordRef,
      joinFieldPath(basePath, "baselineRecordRef"),
    );
    if (!baselineRecordRefMapped.ok) {
      issues.push(...baselineRecordRefMapped.validation.issues);
    }
  }

  let rollbackOfMapped: DomainMapResult<TransferRecordArtifactReference> | undefined;
  if (value.rollbackOf !== undefined) {
    rollbackOfMapped = mapTransferRecordArtifactReferenceValue(
      value.rollbackOf,
      joinFieldPath(basePath, "rollbackOf"),
    );
    if (!rollbackOfMapped.ok) {
      issues.push(...rollbackOfMapped.validation.issues);
    }
  }

  let supersedesMapped: DomainMapResult<TransferRecordArtifactReference> | undefined;
  if (value.supersedes !== undefined) {
    supersedesMapped = mapTransferRecordArtifactReferenceValue(
      value.supersedes,
      joinFieldPath(basePath, "supersedes"),
    );
    if (!supersedesMapped.ok) {
      issues.push(...supersedesMapped.validation.issues);
    }
  }

  const coordinateTransformMapped = mapPolicyReferenceValue(
    value.coordinateTransform,
    joinFieldPath(basePath, "coordinateTransform"),
  );
  if (!coordinateTransformMapped.ok) {
    issues.push(...coordinateTransformMapped.validation.issues);
  }

  const applyProfileMapped = mapPolicyReferenceValue(
    value.applyProfile,
    joinFieldPath(basePath, "applyProfile"),
  );
  if (!applyProfileMapped.ok) {
    issues.push(...applyProfileMapped.validation.issues);
  }

  let validationRefMapped: DomainMapResult<DocumentReference> | undefined;
  if (value.validationRef !== undefined) {
    validationRefMapped = mapDocumentReferenceValue(
      value.validationRef,
      joinFieldPath(basePath, "validationRef"),
    );
    if (!validationRefMapped.ok) {
      issues.push(...validationRefMapped.validation.issues);
    }
  }

  let unknownFieldStoreRefMapped: DomainMapResult<DocumentReference> | undefined;
  if (value.unknownFieldStoreRef !== undefined) {
    unknownFieldStoreRefMapped = mapDocumentReferenceValue(
      value.unknownFieldStoreRef,
      joinFieldPath(basePath, "unknownFieldStoreRef"),
    );
    if (!unknownFieldStoreRefMapped.ok) {
      issues.push(...unknownFieldStoreRefMapped.validation.issues);
    }
  }

  const entityMappings: EntityMappingEntry[] = [];
  value.entityMappings.forEach((mapping, index) => {
    const mapped = mapEntityMappingValue(
      mapping,
      joinIndexedPath(joinFieldPath(basePath, "entityMappings"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
      return;
    }
    entityMappings.push(mapped.data);
  });

  const acceptedChanges: TransferDecisionEntry[] = [];
  value.acceptedChanges.forEach((decision, index) => {
    const mapped = mapTransferDecisionValue(
      decision,
      joinIndexedPath(joinFieldPath(basePath, "acceptedChanges"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
      return;
    }
    acceptedChanges.push(mapped.data);
  });

  const rejectedChanges: TransferDecisionEntry[] = [];
  value.rejectedChanges.forEach((decision, index) => {
    const mapped = mapTransferDecisionValue(
      decision,
      joinIndexedPath(joinFieldPath(basePath, "rejectedChanges"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
      return;
    }
    rejectedChanges.push(mapped.data);
  });

  const conflicts: TransferDecisionEntry[] = [];
  value.conflicts.forEach((decision, index) => {
    const mapped = mapTransferDecisionValue(
      decision,
      joinIndexedPath(joinFieldPath(basePath, "conflicts"), index),
    );
    if (!mapped.ok) {
      issues.push(...mapped.validation.issues);
      return;
    }
    conflicts.push(mapped.data);
  });

  if (
    issues.length > 0 ||
    schemaId === undefined ||
    schemaVersionResult.schemaVersion === undefined ||
    recordIdResult.uuid === undefined ||
    !checksumMapped.ok ||
    !packageRefMapped.ok ||
    !sourceDocumentMapped.ok ||
    !targetBeforeMapped.ok ||
    !coordinateTransformMapped.ok ||
    !applyProfileMapped.ok
  ) {
    return domainMapFailure(issues);
  }

  return {
    ok: true,
    data: {
      schemaId,
      schemaVersion: schemaVersionResult.schemaVersion,
      documentKind: value.documentKind,
      recordId: recordIdResult.uuid,
      contentChecksum: checksumMapped.data,
      packageRef: packageRefMapped.data,
      sourceDocumentRef: sourceDocumentMapped.data,
      targetBefore: targetBeforeMapped.data,
      ...(targetAfterMapped?.ok === true ? { targetAfter: targetAfterMapped.data } : {}),
      ...(baselineRecordRefMapped?.ok === true
        ? { baselineRecordRef: baselineRecordRefMapped.data }
        : {}),
      ...(rollbackOfMapped?.ok === true ? { rollbackOf: rollbackOfMapped.data } : {}),
      ...(supersedesMapped?.ok === true ? { supersedes: supersedesMapped.data } : {}),
      status: value.status,
      firstImport: value.firstImport,
      capabilityAssessment: value.capabilityAssessment.map(mapTransferCapabilityAssessmentEntryValue),
      entityMappings,
      acceptedChanges,
      rejectedChanges,
      conflicts,
      coordinateTransform: coordinateTransformMapped.data,
      applyProfile: applyProfileMapped.data,
      timestamp: value.timestamp,
      actor: value.actor,
      toolVersion: value.toolVersion,
      ...(validationRefMapped?.ok === true ? { validationRef: validationRefMapped.data } : {}),
      ...(unknownFieldStoreRefMapped?.ok === true
        ? { unknownFieldStoreRef: unknownFieldStoreRefMapped.data }
        : {}),
      ...(value.extensions !== undefined ? { extensions: mapExtensionsValue(value.extensions) } : {}),
    },
  };
}
