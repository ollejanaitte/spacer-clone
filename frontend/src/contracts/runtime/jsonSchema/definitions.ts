import type { ZodType } from "zod";
import { bridgeFrameAnalysisDocumentSchema } from "../schemas/bridgeFrameAnalysisDocument";
import { commonEnvelopeSchema } from "../schemas/commonEnvelope";
import { contentChecksumSchema } from "../schemas/contentChecksum";
import { coordinateContextSchema } from "../schemas/coordinateContext";
import { documentReferenceSchema } from "../schemas/documentReference";
import { engineeringProjectSchema } from "../schemas/engineeringProject";
import { immutableResourceReferenceSchema } from "../schemas/immutableResourceReference";
import { jsonValueSchema } from "../schemas/jsonValue";
import { migrationRecordSchema } from "../schemas/migrationRecord";
import { provenanceSchema } from "../schemas/provenance";
import { revisionMetadataSchema } from "../schemas/revision";
import { roadDesignDocumentSchema } from "../schemas/roadDesignDocument";
import { schemaIdentitySchema, uuidValueSchema } from "../schemas/schemaIdentity";
import { stableEntityIdSchema } from "../schemas/stableEntityId";
import { unitContextSchema } from "../schemas/unitContext";
import { unknownFieldStoreSchema } from "../schemas/unknownFieldStore";
import { validationResultSchema } from "../schemas/validationResult";

export interface ContractJsonSchemaDefinition {
  readonly slug: string;
  readonly schema: ZodType;
}

export const CONTRACT_JSON_SCHEMA_DEFINITIONS: readonly ContractJsonSchemaDefinition[] = [
  { slug: "uuid", schema: uuidValueSchema },
  { slug: "schema-identity", schema: schemaIdentitySchema },
  { slug: "stable-entity-id", schema: stableEntityIdSchema },
  { slug: "provenance", schema: provenanceSchema },
  { slug: "revision-metadata", schema: revisionMetadataSchema },
  { slug: "coordinate-context", schema: coordinateContextSchema },
  { slug: "unit-context", schema: unitContextSchema },
  { slug: "validation-result", schema: validationResultSchema },
  { slug: "content-checksum", schema: contentChecksumSchema },
  { slug: "json-value", schema: jsonValueSchema },
  { slug: "immutable-resource-reference", schema: immutableResourceReferenceSchema },
  { slug: "document-reference", schema: documentReferenceSchema },
  { slug: "common-envelope", schema: commonEnvelopeSchema },
  { slug: "engineering-project", schema: engineeringProjectSchema },
  { slug: "road-design-document", schema: roadDesignDocumentSchema },
  { slug: "bridge-frame-analysis-document", schema: bridgeFrameAnalysisDocumentSchema },
  { slug: "unknown-field-store", schema: unknownFieldStoreSchema },
  { slug: "migration-record", schema: migrationRecordSchema },
];

export function contractJsonSchemaPath(slug: string): string {
  return `schemas/contracts/v0.1/${slug}.schema.json`;
}
