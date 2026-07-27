# SPACER Parity Scope — DS-08

**Authority:** DS-08 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Baseline:** `98778e9054c0003be9b7eedf3e53ab48ace222fe`

## Scope

DS-08 defines what may be compared and the evidence required for:

- input semantics, topology, materials, supports, stiffness, loads, and combinations;
- analysis numbers, displacements, member forces, reactions, and signs;
- reports, drawings, and physical files.

Semantic parity and numeric parity are independent gates. Numeric agreement cannot cure a semantic
mismatch; semantic agreement does not prove solver agreement. File/report/drawing similarity does
not prove analysis parity.

## Comparison algorithm IDs

| Algorithm ID | Applies to | Core acceptance |
|---|---|---|
| `DS08_SEMANTIC_SET_MAPPING_V1` | Input, topology, material, support, stiffness, load cases/combinations | Symmetric identity-set equality plus complete approved field mapping |
| `DS08_NUMERIC_COMPONENT_V1` | Analysis, displacement, member force, reaction, sign | Full component coverage plus the algorithm in `numeric_parity_spec.md` |
| `DS08_REPORT_DISPLAY_V1` | Reports | Field coverage, producer/precision/rounding lineage, and declared layout semantics |
| `DS08_DRAWING_SEMANTIC_VISUAL_V1` | Drawings | Predeclared geometry/annotation/legend semantics plus independent visual review |
| `DS08_FILE_SCHEMA_BYTE_V1` | Files | Declared exact-byte or parsed-schema mode, encoding/newline rules, and symmetric field coverage |

An output case that also claims numeric content must list the numeric blocker separately. File
schema/byte parity by itself neither depends on nor proves analysis numeric parity.

## Current evidence boundary

The repository contains an Apollo legacy/new-route semantic comparator and result-comparison code.
Those are `PROJECT_SPECIFIC` implementation references, not SPACER machine comparisons. The local
SPACER manual is `REFERENCE_ONLY`; `examples/spacer-reference/` has no qualifying native corpus.
The Viewer `SPACER_AXIS_SWAP` is display-only and does not transform persisted model or analysis
results.

Consequently the comparison specification can be complete, while every actual SPACER parity case
remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`.

## Exclusion control

A quantity may be excluded only before comparison with a reason, governing decision, and impact.
Unsupported is not equivalent to matched. Missing/duplicate/unmatched rows, empty comparison sets,
non-numeric values, and partial component sets cannot be skipped into PASS.

## Approval control

A non-BLOCKED case requires every primary, additional, and recursively declared blocker dependency
closed, an immutable evidence
manifest ID and SHA-256, a decision ID, approval timestamp, and a named approver distinct from the
proposer. `reviewer_and_approver` is the accountable approval identity for an APPROVED row. Role
labels and `REQUIRED` placeholders are permitted only while `approval_status=NOT_APPROVED`.
`primary_blocker_id` is not an evidence manifest.

A fail-closed comparison validation harness may be created and tested before product numeric release
solely as evidence acquisition. It may contain no design-standard values and grants no product
numeric authority. This non-product harness closes comparator-validation evidence without creating
a circular dependency on the DS-09 release decision.

## Verdicts

```text
DS08_PARITY_SCOPE_VERDICT: COMPLETE
DS08_SEMANTIC_PARITY_SPEC_VERDICT: COMPLETE
DS08_NUMERIC_PARITY_RULE_VERDICT: COMPLETE
DS08_SIGN_COORDINATE_MEMBER_END_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS08_TOLERANCE_VERDICT: COMPLETE
DS08_CASE_CATALOG_VERDICT: COMPLETE
DS08_REFERENCE_VERSION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS08_ACTUAL_NUMERIC_PARITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS08_DOCUMENT_COMPLETION_VERDICT: COMPLETE
```
