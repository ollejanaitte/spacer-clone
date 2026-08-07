# Versioning / Migration Contract — Common Bridge Data Model

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1

## 1. Schema versioning

- `schemaVersion` is REQUIRED at the Common Bridge Data Model root.
- Canonical version scheme: SemVer `MAJOR.MINOR.PATCH`.
- Canonical current value: **1.0.0**.
- `schemaVersion` MUST survive round-trip unchanged.
- Unsupported major schema version => validation rejection.

## 2. Version rules

1. Breaking changes require a MAJOR version bump and a migration record.
2. Additive, backward-compatible additions use MINOR/PATCH and require no migration.
3. `additionalProperties` policy per schema element is explicit
   (see `serialization_contract.md` / P5-2 schema).
4. Unknown optional fields are preserved where the envelope allows
   (unknown-field-store pattern from the existing contract family).

## 3. Migration foundation

- A migration foundation (registry of version → version migrations) is provided.
- Real migrations are implemented only when needed; P5 introduces the foundation
  and the schema version, not speculative migrations.
- Migration records follow the existing `migration-record.schema.json` contract.

## 4. Backward compatibility

- Adding the Common Bridge Data Model MUST NOT break existing project save/load,
  LINER, SPACER/frame, substructure, or existing Apollo features.
- Existing project schemas are not changed in P5 (no new required fields).
- If a future change would require a breaking migration, Phase 5 requires a stop
  and design review before proceeding.

## 5. Schema/type parity

- The canonical JSON Schema and canonical TypeScript types MUST agree semantically
  (P5-4 master check: schema/type semantic parity).
- The JSON Schema is generated from the zod runtime schema (existing contract
  pipeline), so parity is enforced by construction and verified by the drift test.

## 6. Versioning carry-forward

- `COMMON_MODEL_SCHEMA_VERSION` is recorded in `final_report.txt`.
- Reference fixture records its `schemaVersion`.
- Fingerprint stability across schema version changes is documented
  (see `serialization_contract.md`).
