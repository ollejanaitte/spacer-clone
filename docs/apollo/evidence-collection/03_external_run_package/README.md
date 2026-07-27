# EA-03 External Run Package

**Work item:** EA-03 (STAGE-02 external identity and Analyzer machine evidence tooling)
**Package version:** `1.0.0`
**Schema version:** `apollo.external_run.package.v1`
**Evidence bundle schema:** `apollo.evidence.bundle.v1` (EA-01 harness)

## Purpose

EA-03 delivers a fail-closed external run package for DS-06 Analyzer identity capture, license and machine preflight, probe execution planning, three-run reproducibility acquisition, and checksum-bound evidence import/verification. This package provides operator templates, runbooks, probe catalogs tracing canonical AN-PRB and AN-ERR cases, and stdlib-only tooling built on EA-01 `evidence_core.py`.

This deliverable does **not** claim actual external Analyzer, SPACER, or STATICS execution. Supervisor read-only preflight on the validation host found no Analyzer/SPACER/STATICS executable or service in `PATH`, `/opt`, `/usr/local`, or the repository. Host: Linux `x86_64`, locale `C.UTF-8`. Manual SHA-256 `e08681a290904c13c702ed864e0753d85e5c43201a5881c48766c0417aa7d012` for `マニュアル/SPACER操作マニュアル.pdf` is reference-only and must not be used as product identity evidence.

## Scope boundary

| In scope | Out of scope |
|---|---|
| Operator templates with `REQUIRED_OPERATOR_INPUT` markers | Closing AN-BLK-001..010 in canonical registers |
| Probe/error catalogs tracing AN-PRB-001..022 and AN-ERR-001..016 | Modifying `design-standards/` registers |
| Package prepare/import/verify/summarize tooling | Inventing product version, command, or native format |
| EA-01 evidence bundle import for repeat runs and probes | License key or secret capture |
| Three isolated repeat slot verification | Promoting blockers to closed |

## Repository layout

```text
docs/apollo/evidence-collection/03_external_run_package/
  README.md                          # this document
  analyzer_identity_capture.md       # AN-ID-004 capture procedure
  spacer_identity_capture.md         # AN-ID-005 and AN-ID-006 capture procedure
  license_preflight.md               # entitlement preflight without key capture
  machine_preflight.md               # OS/arch/locale and discovery record
  execution_runbook.md               # isolated probe execution workflow
  reproducibility_runbook.md         # three-run serial reproducibility
  positive_probe_catalog.csv         # AN-PRB-001..022 trace (no status promotion)
  negative_probe_catalog.csv         # AN-ERR-001..016 trace (no status promotion)
  evidence_acceptance_checklist.csv  # acceptance gates per artifact class
  expected_artifact_catalog.csv      # required bundle artifacts
  external_run_blockers.csv          # STAGE-02 blocker snapshot
  external_run_package_review.md     # validation execution record
  templates/                         # machine-readable operator templates
  input_bundle/                      # fixture manifest template

scripts/apollo/evidence/
  external_run_package_core.py
  prepare_external_run_bundle.py
  import_external_run_bundle.py
  verify_external_run_bundle.py
  summarize_external_run_bundle.py
  tests/test_external_run_package.py
```

## Verdicts

```text
EXTERNAL_RUN_PACKAGE_VERDICT: COMPLETE
EXTERNAL_RUN_EXECUTION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
```

Package tooling validation passes against structure and canonical catalog coverage. External execution remains blocked until an authorized operator captures version/build/architecture/executable SHA, freezes one identity bundle, records verbatim vendor-supported invocation, and imports checksum-bound EA-01 evidence bundles from an authorized host.

## Operator workflow

1. Run `prepare_external_run_bundle.py --output <exclusive-dir>` to create a skeleton package.
2. Fill templates under `templates/`; never invent version, command, or native format.
3. Complete `machine_preflight.md` and `license_preflight.md` gates on an authorized host.
4. Capture identities per `analyzer_identity_capture.md` and `spacer_identity_capture.md`.
5. Bind fixtures in `input_bundle/fixture_checksum_manifest.json` with SHA-256.
6. Execute probes per `execution_runbook.md` using EA-01 harness in isolated directories.
7. Import artifacts with `import_external_run_bundle.py` (read-only copies, content hashes recorded).
8. Verify with `verify_external_run_bundle.py`; summarize with `summarize_external_run_bundle.py`.

## Non-promotion statement

Successful EA-03 unit tests validate tooling only using synthetic temporary packages labeled `NOT_MACHINE_EVIDENCE`. No AN-BLK, EXT-ID, GOLD-BLK, PAR-BLK, or numeric-release gate status was changed. Canonical register rows remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`.

## Traceability

| EA-00 / DS-06 need | EA-03 component |
|---|---|
| External identity capture (EXT-ID-001..003) | `analyzer_identity_capture.md`, `spacer_identity_capture.md`, `software_identity.template.json` |
| License and machine preflight | `license_preflight.md`, `machine_preflight.md` |
| Probe matrix AN-PRB-001..022 | `positive_probe_catalog.csv`, `execution_runbook.md` |
| Error matrix AN-ERR-001..016 | `negative_probe_catalog.csv` |
| Three-run reproducibility AN-PRB-015 / AN-BLK-008 | `reproducibility_runbook.md`, repeat run slots |
| EA-01 isolated run bundles | `import_external_run_bundle.py`, EA-01 `evidence_core.py` |
