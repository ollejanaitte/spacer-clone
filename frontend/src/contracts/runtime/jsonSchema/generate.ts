import { z, type ZodType } from "zod";
import { contractSchemaId } from "../constants";
import { CONTRACT_JSON_SCHEMA_DEFINITIONS } from "./definitions";
import { CONTRACT_JSON_SCHEMA_SEMANTIC_METADATA } from "./semanticMetadata";

export interface GeneratedContractJsonSchema {
  readonly slug: string;
  readonly schemaId: string;
  readonly document: Record<string, unknown>;
}

/**
 * Pure JSON Schema generation for a registered shared contract Zod schema.
 * Stabilizes `$id`, preserves `title` and `contractVersion` from schema metadata.
 */
export function generateContractJsonSchema(
  slug: string,
  schema: ZodType,
): GeneratedContractJsonSchema {
  const schemaId = contractSchemaId(slug);
  const generated = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  const meta = schema.meta();

  const document: Record<string, unknown> = {
    ...generated,
    $id: schemaId,
  };

  if (typeof meta?.title === "string") {
    document.title = meta.title;
  }

  if (typeof meta?.contractVersion === "string") {
    document.contractVersion = meta.contractVersion;
  }

  const semanticMetadata = CONTRACT_JSON_SCHEMA_SEMANTIC_METADATA[slug];
  if (semanticMetadata !== undefined) {
    document["x-semantic-validation"] = semanticMetadata;
    document.$comment =
      "Structural JSON Schema only. Do not treat this document as a complete validator; runtime semantic validation is required where x-semantic-validation.runtimeRequired is true.";
  }

  delete document.id;

  return { slug, schemaId, document };
}

export function generateAllContractJsonSchemas(): readonly GeneratedContractJsonSchema[] {
  return CONTRACT_JSON_SCHEMA_DEFINITIONS.map(({ slug, schema }) =>
    generateContractJsonSchema(slug, schema),
  );
}
