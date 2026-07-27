# Analyzer Identity Capture (AN-ID-004)

**Canonical register:** `docs/apollo/design-standards/06_analyzer/analyzer_identity_register.csv` row AN-ID-004
**Blocker:** AN-BLK-001 (identity facet)
**Status:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

## Objective

Capture authorized machine identity for the Historical APOLLO Analyzer on an operator-controlled host. Freeze one identity bundle with version, build, architecture, and executable SHA-256. Distinguish this identity from repository solver (AN-ID-001), SPACER product shell (AN-ID-005), and SPACER STATICS module (AN-ID-006).

## Required operator inputs

All fields marked `REQUIRED_OPERATOR_INPUT` in `templates/software_identity.template.json` must be filled on the authorized host:

| Field | Requirement |
|---|---|
| `product_version` | Vendor-reported version string; never invented |
| `build_id` | Vendor-reported build identifier |
| `architecture` | Machine architecture of the installed executable |
| `executable_path` | Resolved path to the identity executable or service binary |
| `executable_sha256` | SHA-256 of the executable bytes; not the manual reference SHA |
| `identity_capture_command` | Vendor-documented identity command captured verbatim |
| `identity_capture_stdout_sha256` | SHA-256 of stdout bytes from identity capture |
| `frozen_identity_bundle_id` | Operator-assigned UUID linking all three external identities |
| `relationship_notes` | Documented relationship to SPACER and repository solver |

## Prohibitions

- Do not use `examples/spacer-reference` sample version as identity evidence.
- Do not use manual PDF SHA-256 `e08681a290904c13c702ed864e0753d85e5c43201a5881c48766c0417aa7d012` as executable identity.
- Do not modify licensed program files.
- Do not capture license keys or secrets; redact to `[REDACTED]` per EA-01 environment policy.

## Capture procedure

1. Confirm `machine_preflight.md` and `license_preflight.md` gates on the authorized host.
2. Locate the vendor-installed executable or service using vendor documentation.
3. Record `identity_capture_command` verbatim before any probe execution.
4. Compute SHA-256 of the executable and identity-capture stdout.
5. Write `software_identities/AN-ID-004.json` using exclusive create; no overwrite.
6. Set `status` to `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` until composite AN-BLK-001 closure on canonical register.

## Acceptance

Identity evidence is acceptable only when executable SHA, version, build, and architecture are captured on the authorized host, bound to `frozen_identity_bundle_id`, and imported without post-import manual edit (verified by `import_manifest.json` content hashes).
