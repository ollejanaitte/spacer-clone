import type { ZodType } from "zod";
import { coordinateContextSchema } from "../schemas/coordinateContext";
import { provenanceSchema } from "../schemas/provenance";
import { revisionMetadataSchema } from "../schemas/revision";
import { schemaIdentitySchema, uuidValueSchema } from "../schemas/schemaIdentity";
import { stableEntityIdSchema } from "../schemas/stableEntityId";
import { unitContextSchema } from "../schemas/unitContext";
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
];

export function contractJsonSchemaPath(slug: string): string {
  return `schemas/contracts/v0.1/${slug}.schema.json`;
}
