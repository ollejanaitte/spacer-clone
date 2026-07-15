import {
  validateCoordinateContext,
  type CoordinateContext,
  type ValidateCoordinateContextOptions,
} from "../coordinateContext";
import { validateProvenance, type Provenance } from "../provenance";
import { validateRevisionMetadata, type RevisionMetadata } from "../revision";
import { validateSchemaIdentity, type SchemaIdentity } from "../schemaIdentity";
import { validateStableEntityId, type StableEntityId } from "../stableEntityId";
import {
  validateUnitContext,
  type UnitContext,
  type ValidateUnitContextOptions,
} from "../unitContext";
import type { UuidString } from "../uuid";
import type { ValidationResult } from "../validation";
import {
  domainMapFailureToParseFailure,
  mapCoordinateContextValue,
  mapProvenanceValue,
  mapRevisionMetadataValue,
  mapSchemaIdentityValue,
  mapStableEntityIdValue,
  mapUnitContextValue,
  mapUuidValue,
  mapValidationResultValue,
} from "./domainMappers";
import { parseContractValue, type ContractParseResult } from "./parseContract";
import {
  coordinateContextSchema,
  provenanceSchema,
  revisionMetadataSchema,
  schemaIdentitySchema,
  stableEntityIdSchema,
  unitContextSchema,
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
