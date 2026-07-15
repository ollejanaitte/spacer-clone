export interface ContractJsonSchemaSemanticMetadata {
  readonly scope: "structural-only" | "structural-plus-semantic";
  readonly completeValidator: false;
  readonly runtimeRequired: boolean;
  readonly description: string;
  readonly runtimeRules?: readonly string[];
}

export const CONTRACT_JSON_SCHEMA_SEMANTIC_METADATA: Readonly<
  Record<string, ContractJsonSchemaSemanticMetadata>
> = {
  uuid: {
    scope: "structural-only",
    completeValidator: false,
    runtimeRequired: false,
    description:
      "This JSON Schema validates UUID string format only. It is not a complete contract validator.",
  },
  "schema-identity": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates field presence and SemVer surface form. Non-empty schemaId and SemVer semantics are enforced by runtime semantic validation.",
    runtimeRules: ["SCHEMA_ID_MISSING", "SCHEMA_VERSION_INVALID"],
  },
  "stable-entity-id": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates object shape and UUID format. Namespace, entity kind, and alias semantics are enforced by runtime semantic validation.",
    runtimeRules: [
      "STABLE_ID_NAMESPACE_MISSING",
      "STABLE_ID_INVALID",
      "STABLE_ID_ENTITY_KIND_MISSING",
      "DISPLAY_ALIAS_LABEL_MISSING",
    ],
  },
  provenance: {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates object shape and timestamp surface form. ISO-8601 UTC semantics and actor/tool requirements are enforced by runtime semantic validation.",
    runtimeRules: ["PROVENANCE_CREATED_AT_INVALID", "ACTOR_MISSING", "TOOL_PROVENANCE_MISSING"],
  },
  "revision-metadata": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates object shape and timestamp surface form. ISO-8601 UTC semantics and revision identifier rules are enforced by runtime semantic validation.",
    runtimeRules: ["REVISION_CREATED_AT_INVALID", "REVISION_ID_INVALID", "REVISION_DOCUMENT_ID_INVALID"],
  },
  "coordinate-context": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates structural fields only. Axis uniqueness, handedness consistency, transform matrix semantics, and datum rules require runtime semantic validation.",
    runtimeRules: [
      "COORDINATE_AXIS_DIRECTION_DUPLICATE",
      "COORDINATE_AXIS_ORDER_INVALID",
      "COORDINATE_VERTICAL_AXIS_INVALID",
      "COORDINATE_TRANSFORM_MATRIX_INVALID",
      "COORDINATE_DATUM_IDENTIFIER_MISSING",
    ],
  },
  "unit-context": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates structural fields only. Profile-specific unit requirements (generic, road, mechanical) are enforced by runtime semantic validation.",
    runtimeRules: [
      "UNIT_FORCE_INVALID",
      "UNIT_MOMENT_INVALID",
      "UNIT_MASS_INVALID",
      "UNIT_TEMPERATURE_INVALID",
      "UNIT_STRESS_INVALID",
    ],
  },
  "validation-result": {
    scope: "structural-only",
    completeValidator: false,
    runtimeRequired: false,
    description:
      "This JSON Schema validates ValidationResult document shape. Issue aggregation semantics are defined by Step 0A validation helpers, not by JSON Schema alone.",
  },
  "content-checksum": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates SHA-256 checksum object shape. Algorithm lock and lowercase hex digest semantics are enforced by runtime semantic validation.",
    runtimeRules: [
      "CONTENT_CHECKSUM_ALGORITHM_INVALID",
      "CONTENT_CHECKSUM_HEX_INVALID",
    ],
  },
  "document-reference": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates DocumentReference shape. Exact revision, checksum, and kind-specific reference rules are enforced by runtime semantic validation.",
    runtimeRules: [
      "DOCUMENT_REFERENCE_REVISION_INVALID",
      "DOCUMENT_REFERENCE_KIND_MISMATCH",
      "DOCUMENT_REFERENCE_DUPLICATE",
    ],
  },
  "common-envelope": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "Reusable base envelope shape for Road/Frame/Transfer contract families. Not a standalone document family; schemaId and documentKind are fixed per family at parse time. Contract version matrix, provenance, and extension rules require runtime semantic validation.",
    runtimeRules: [
      "COMMON_ENVELOPE_SCHEMA_ID_UNKNOWN",
      "CONTRACT_SCHEMA_VERSION_UNSUPPORTED",
      "CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED",
      "EXTENSION_KEY_INVALID",
      "EXTENSION_VALUE_EXCLUSIVE",
    ],
  },
  "engineering-project": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates EngineeringProject reference manifest shape. Reference kind alignment, duplicate rejection, version matrix, and forbidden embedded payloads require runtime semantic validation.",
    runtimeRules: [
      "ENGINEERING_PROJECT_SCHEMA_VERSION_UNSUPPORTED",
      "ENGINEERING_PROJECT_REVISION_DOCUMENT_ID_MISMATCH",
      "ENGINEERING_PROJECT_REVISION_CHECKSUM_MISMATCH",
      "DOCUMENT_REFERENCE_KIND_MISMATCH",
      "DOCUMENT_REFERENCE_DUPLICATE",
      "ENGINEERING_PROJECT_EMBEDDED_PAYLOAD_FORBIDDEN",
    ],
  },
  "unknown-field-store": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates UnknownFieldStore preservation metadata. JSON Pointer validity, immutable resource references, duplicate detection, and apply-blocking critical collision rules require runtime semantic validation.",
    runtimeRules: [
      "UNKNOWN_FIELD_ENTRY_POINTER_INVALID",
      "UNKNOWN_FIELD_ENTRY_POINTER_DUPLICATE",
      "UNKNOWN_FIELD_CRITICAL_COLLISION_BLOCKS_APPLY",
      "UNKNOWN_FIELD_STORE_SOURCE_VERSION_REQUIRED",
    ],
  },
  "migration-record": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates MigrationRecord audit shape. Exact target document references, mapping disposition rules, and status-dependent requirements require runtime semantic validation.",
    runtimeRules: [
      "MIGRATION_RECORD_RECORDED_AT_INVALID",
      "MIGRATION_RECORD_TARGET_REFS_REQUIRED",
      "MIGRATION_RECORD_TARGET_ID_REQUIRED",
      "CONTRACT_SCHEMA_VERSION_UNSUPPORTED",
    ],
  },
  "immutable-resource-reference": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "This JSON Schema validates immutable resource reference shape. URI and checksum semantics are enforced by runtime semantic validation.",
    runtimeRules: [
      "IMMUTABLE_RESOURCE_REFERENCE_URI_INVALID",
      "CONTENT_CHECKSUM_HEX_INVALID",
    ],
  },
  "json-value": {
    scope: "structural-plus-semantic",
    completeValidator: false,
    runtimeRequired: true,
    description:
      "Recursive JSON value schema rejecting undefined, functions, symbols, bigint, NaN, and Infinity.",
    runtimeRules: ["JSON_VALUE_INVALID"],
  },
};
