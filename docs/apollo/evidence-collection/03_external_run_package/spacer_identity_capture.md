# SPACER Identity Capture (AN-ID-005, AN-ID-006)

**Canonical register:** `docs/apollo/design-standards/06_analyzer/analyzer_identity_register.csv` rows AN-ID-005 and AN-ID-006
**Blockers:** AN-BLK-001 (SPACER and STATICS facets); PAR-BLK-001 dependency for STATICS
**Status:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

## Objective

Capture authorized machine identity for the SPACER product shell (AN-ID-005) and SPACER STATICS module (AN-ID-006) on a licensed operator host. Freeze product shell and module boundaries separately with version, build, architecture, hosting process, and executable SHA-256.

## Required operator inputs

Complete one `software_identities/AN-ID-005.json` and one `software_identities/AN-ID-006.json` from `templates/software_identity.template.json`:

| Identity | Additional fields |
|---|---|
| AN-ID-005 | Product executables, services, module list, publisher |
| AN-ID-006 | `hosting_process`, module metadata, relationship to AN-ID-005 shell |

Both identities must share the same `frozen_identity_bundle_id` as AN-ID-004 when captured in one session.

## Prohibitions

- Manual `マニュアル/SPACER操作マニュアル.pdf` SHA-256 `e08681a290904c13c702ed864e0753d85e5c43201a5881c48766c0417aa7d012` is reference-only; not executable identity evidence.
- Do not treat module name as standalone executable without hosting-process evidence.
- Do not use repository `examples/spacer-reference` version strings as machine identity.
- Do not capture license keys.

## Capture order (EA-00 STAGE-02)

1. AN-ID-005 SPACER product shell identity (WI-012 / EXT-ID-002).
2. AN-ID-006 STATICS module identity with copied non-production DAT fixture (WI-013 / EXT-ID-003).
3. AN-ID-004 Historical APOLLO Analyzer identity and relationship evidence (WI-011 / EXT-ID-001).

## STATICS minimal diagnostic

After product shell identity is fixed, run a vendor-documented module identity or minimal no-write diagnostic invocation. Record hosting executable, module version output, and permitted logs. Bind a checksum-fixed minimal supported DAT model in `input_bundle/` only after identity capture.

## Acceptance

Product shell and STATICS module are uniquely mapped with separate executable SHA-256 values, shared `frozen_identity_bundle_id`, and documented hosting relationship. Verification rejects reference-only manual SHA and version mixing across identities.
