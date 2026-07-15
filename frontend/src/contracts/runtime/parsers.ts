import { validateCommonEnvelope, type CommonEnvelope, type ValidateCommonEnvelopeOptions } from "../commonEnvelope";
import { validateContentChecksum, type ContentChecksum } from "../contentChecksum";
import {
  validateCoordinateContext,
  type CoordinateContext,
  type ValidateCoordinateContextOptions,
} from "../coordinateContext";
import {
  validateDocumentReference,
  type DocumentReference,
} from "../documentReference";
import { validateEngineeringProject, type EngineeringProject } from "../engineeringProject";
import { deepFreeze } from "../deepFreeze";
import { validateBridgeFrameAnalysisDocument, type BridgeFrameAnalysisDocument } from "../bridgeFrameAnalysisDocument";
import { validateRoadDesignDocument, type RoadDesignDocument } from "../roadDesignDocument";
import { validateRoadToFrameTransferPackage, type RoadToFrameTransferPackage } from "../roadToFrameTransferPackage";
import { validateTransferRecord, type TransferRecord } from "../transferRecord";
import { validateMigrationRecord, type MigrationRecord } from "../migrationRecord";
import { validateProvenance, type Provenance } from "../provenance";
import { validateRevisionMetadata, type RevisionMetadata } from "../revision";
import { validateSchemaIdentity, type SchemaIdentity } from "../schemaIdentity";
import { validateStableEntityId, type StableEntityId } from "../stableEntityId";
import {
  validateUnitContext,
  type UnitContext,
  type ValidateUnitContextOptions,
} from "../unitContext";
import { validateUnknownFieldStore, type UnknownFieldStore } from "../unknownFieldStore";
import type { UuidString } from "../uuid";
import type { ValidationResult } from "../validation";
import {
  domainMapFailureToParseFailure,
  mapCommonEnvelopeValue,
  mapContentChecksumValue,
  mapCoordinateContextValue,
  mapDocumentReferenceValue,
  mapBridgeFrameAnalysisDocumentValue,
  mapEngineeringProjectValue,
  mapMigrationRecordValue,
  mapProvenanceValue,
  mapRevisionMetadataValue,
  mapRoadDesignDocumentValue,
  mapRoadToFrameTransferPackageValue,
  mapTransferRecordValue,
  mapSchemaIdentityValue,
  mapStableEntityIdValue,
  mapUnitContextValue,
  mapUnknownFieldStoreValue,
  mapUuidValue,
  mapValidationResultValue,
} from "./domainMappers";
import { parseContractValue, type ContractParseResult } from "./parseContract";
import {
  bridgeFrameAnalysisDocumentSchema,
  commonEnvelopeSchema,
  contentChecksumSchema,
  coordinateContextSchema,
  documentReferenceSchema,
  engineeringProjectSchema,
  migrationRecordSchema,
  provenanceSchema,
  revisionMetadataSchema,
  roadDesignDocumentSchema,
  roadToFrameTransferPackageSchema,
  transferRecordSchema,
  schemaIdentitySchema,
  stableEntityIdSchema,
  unitContextSchema,
  unknownFieldStoreSchema,
  uuidValueSchema,
  validationResultSchema,
} from "./schemas";

function finalizeSemanticParse<T>(
  mapped: { ok: true; data: T },
  semanticResult: ValidationResult,
): ContractParseResult<T> {
  if (semanticResult.status === "invalid") {
    return { success: false, validation: semanticResult };
  }
  return { success: true, data: mapped.data, validation: semanticResult };
}

export function parseUuidValue(value: unknown, path?: string): ContractParseResult<UuidString> {
  const basePath = path ?? "";
  const structural = parseContractValue(uuidValueSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapUuidValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  return { success: true, data: mapped.data, validation: structural.validation };
}

export function parseSchemaIdentityValue(
  value: unknown,
  path?: string,
): ContractParseResult<SchemaIdentity> {
  const basePath = path ?? "";
  const structural = parseContractValue(schemaIdentitySchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapSchemaIdentityValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateSchemaIdentity(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseStableEntityIdValue(
  value: unknown,
  path?: string,
): ContractParseResult<StableEntityId> {
  const basePath = path ?? "";
  const structural = parseContractValue(stableEntityIdSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapStableEntityIdValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateStableEntityId(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseProvenanceValue(
  value: unknown,
  path?: string,
): ContractParseResult<Provenance> {
  const basePath = path ?? "";
  const structural = parseContractValue(provenanceSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapProvenanceValue(structural.data);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateProvenance(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseRevisionMetadataValue(
  value: unknown,
  path?: string,
): ContractParseResult<RevisionMetadata> {
  const basePath = path ?? "";
  const structural = parseContractValue(revisionMetadataSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapRevisionMetadataValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateRevisionMetadata(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseCoordinateContextValue(
  value: unknown,
  path?: string,
  options: ValidateCoordinateContextOptions = {},
): ContractParseResult<CoordinateContext> {
  const basePath = path ?? "";
  const structural = parseContractValue(coordinateContextSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapCoordinateContextValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateCoordinateContext(mapped.data, basePath, options);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseUnitContextValue(
  value: unknown,
  path?: string,
  options: ValidateUnitContextOptions = {},
): ContractParseResult<UnitContext> {
  const basePath = path ?? "";
  const structural = parseContractValue(unitContextSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapUnitContextValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateUnitContext(mapped.data, basePath, options);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseValidationResultValue(
  value: unknown,
  path?: string,
): ContractParseResult<ValidationResult> {
  const basePath = path ?? "";
  const structural = parseContractValue(validationResultSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapValidationResultValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  return { success: true, data: mapped.data, validation: structural.validation };
}

export function parseContentChecksumValue(
  value: unknown,
  path?: string,
): ContractParseResult<ContentChecksum> {
  const basePath = path ?? "";
  const structural = parseContractValue(contentChecksumSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapContentChecksumValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateContentChecksum(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseDocumentReferenceValue(
  value: unknown,
  path?: string,
  expectedKind?: DocumentReference["documentKind"],
): ContractParseResult<DocumentReference> {
  const basePath = path ?? "";
  const structural = parseContractValue(documentReferenceSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapDocumentReferenceValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateDocumentReference(mapped.data, basePath, expectedKind);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseCommonEnvelopeValue(
  value: unknown,
  path?: string,
  options: ValidateCommonEnvelopeOptions = {},
): ContractParseResult<CommonEnvelope> {
  const basePath = path ?? "";
  const structural = parseContractValue(commonEnvelopeSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapCommonEnvelopeValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateCommonEnvelope(mapped.data, basePath, options);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseEngineeringProjectValue(
  value: unknown,
  path?: string,
): ContractParseResult<EngineeringProject> {
  const basePath = path ?? "";
  const structural = parseContractValue(engineeringProjectSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapEngineeringProjectValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateEngineeringProject(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseUnknownFieldStoreValue(
  value: unknown,
  path?: string,
): ContractParseResult<UnknownFieldStore> {
  const basePath = path ?? "";
  const structural = parseContractValue(unknownFieldStoreSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapUnknownFieldStoreValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateUnknownFieldStore(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseMigrationRecordValue(
  value: unknown,
  path?: string,
): ContractParseResult<MigrationRecord> {
  const basePath = path ?? "";
  const structural = parseContractValue(migrationRecordSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapMigrationRecordValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateMigrationRecord(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseRoadDesignDocumentValue(
  value: unknown,
  path?: string,
): ContractParseResult<RoadDesignDocument> {
  const basePath = path ?? "";
  const structural = parseContractValue(roadDesignDocumentSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapRoadDesignDocumentValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateRoadDesignDocument(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseBridgeFrameAnalysisDocumentValue(
  value: unknown,
  path?: string,
): ContractParseResult<BridgeFrameAnalysisDocument> {
  const basePath = path ?? "";
  const structural = parseContractValue(bridgeFrameAnalysisDocumentSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapBridgeFrameAnalysisDocumentValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateBridgeFrameAnalysisDocument(mapped.data, basePath);
  return finalizeSemanticParse(mapped, semanticResult);
}

export function parseRoadToFrameTransferPackageValue(
  value: unknown,
  path?: string,
): ContractParseResult<RoadToFrameTransferPackage> {
  const basePath = path ?? "";
  const structural = parseContractValue(roadToFrameTransferPackageSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapRoadToFrameTransferPackageValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateRoadToFrameTransferPackage(mapped.data, basePath);
  if (semanticResult.status === "invalid") {
    return { success: false, validation: semanticResult };
  }

  return {
    success: true,
    data: deepFreeze(mapped.data),
    validation: semanticResult,
  };
}

export function parseTransferRecordValue(
  value: unknown,
  path?: string,
): ContractParseResult<TransferRecord> {
  const basePath = path ?? "";
  const structural = parseContractValue(transferRecordSchema, value, { path: basePath });
  if (!structural.success) {
    return structural;
  }

  const mapped = mapTransferRecordValue(structural.data, basePath);
  if (!mapped.ok) {
    return domainMapFailureToParseFailure(mapped);
  }

  const semanticResult = validateTransferRecord(mapped.data, basePath);
  if (semanticResult.status === "invalid") {
    return { success: false, validation: semanticResult };
  }

  return {
    success: true,
    data: deepFreeze(mapped.data),
    validation: semanticResult,
  };
}
