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
};
