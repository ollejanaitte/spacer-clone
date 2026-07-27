# Apollo Evidence Acquisition Enablement Final Report

**Integration stage:** EA-06 Final Evidence Gate Reassessment
**Report date:** 2026-07-27
**Design-standards authority:** `docs/apollo/design-standards/` (DS-00..DS-09 unchanged)
**Evidence-collection authority:** `docs/apollo/evidence-collection/`

## 1. Executive Summary

EA-00 through EA-05 completed evidence-acquisition enablement: inventory reconciliation, executable harness, analytical golden tooling, external run package, parity harness, and synthetic dry run. EA-06 integrates those results without rewriting DS-00..09 decisions. All 76 canonical snapshot blockers remain open (`45 BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`, `31 NOT_APPROVED`; resolved `0`). External Analyzer, reference-software Golden, and actual SPACER numeric parity evidence remain unavailable. DS-02..05 numerics remain source-blocked.

```text
EA00_BASELINE_VERDICT: COMPLETE
EA01_EVIDENCE_HARNESS_VERDICT: COMPLETE
EA02_ANALYTICAL_GOLDEN_PACKAGE_VERDICT: COMPLETE
EA03_EXTERNAL_RUN_PACKAGE_VERDICT: COMPLETE
EA04_PARITY_HARNESS_VERDICT: COMPLETE
EA05_DRY_RUN_VERDICT: COMPLETE
EA06_FINAL_GATE_VERDICT: COMPLETE
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
DIRECT_MAIN_GOVERNANCE_VERDICT: PASS
GITHUB_REFLECTION_VERDICT: PASS_AT_TERMINAL_RECEIPT
OVERALL_VERDICT: EVIDENCE_ACQUISITION_READY_EXTERNAL_RUN_REQUIRED
```

## 2. Role Execution

**Supervisor:** Codex GPT-5.6sol
**Worker:** Cursor Agent (EA-06 integration worker)
**Cursor Agent Models Used:** Composer 2.5 (integration); prior stages used Composer 2.5 and Grok 4.5 independent reviewers
**Delegated Tasks:** EA-06 register integration, gate reassessment, navigation updates, consistency validation
**Independent Review:** EA-01..05 adversarial audits (Grok 4.5 / Codex); EA-05 spot audits rejected false-PASS proposals including manifest self-reference, DR-08 expected-echo, weak mutation detection, and execution_register_sha256 binding defects (all repaired at EA-05 checkpoint)
**Rejected Proposals:** Synthetic dry-run PASS promoted to machine evidence; tooling COMPLETE promoted to GOLD approval; repository solver/IF3/manual treated as external Analyzer evidence; tolerance mutation after mismatch; circular Golden from Apollo output alone

## 3. Repository Baseline

| Field | Value |
|---|---|
| Repository | `/home/masaharu/Projects/spacer-clone-main` |
| Branch | `main` |
| Starting SHA (DS baseline) | `7386bdf8be5b11cb38d445e32ddce16464fdb3c1` |
| EA-00 checkpoint | `fa3c9d0afe5a59860a2bc28c740c3466b464279e` |
| EA-01 checkpoint | `46f11c139df5ab0c8184e11e36eae22c2eaa4e19` |
| EA-01 correction | `60b44f3f2605a4d5b62cd93cf9e4a6727192d339` |
| EA-02 checkpoint | `f3945c7a47318c2c4ed45de2a4936b64917d09e9` |
| EA-03 checkpoint | `c8d601e8593069e9f28341e34c3d654f084ef2c4` |
| EA-04 checkpoint | `a00104e2cd9ce1ec14a334ab3a2be2f148ab5696` |
| EA-05 checkpoint | `482eabcdbd293629e8d1a57f168f5306549626cf` |
| Final SHA (EA-06 / HEAD) | `SELF_PENDING_FINAL_COMMIT` |
| Final origin/main | `SELF_PENDING_FINAL_COMMIT` |
| HEAD == origin/main | PASS_AT_TERMINAL_RECEIPT (pending terminal receipt; cryptographic self-reference resolved at commit receipt; SHA not invented) |
| Working Tree Clean | PASS_AT_TERMINAL_RECEIPT (pending terminal receipt; working tree not claimed clean before receipt) |
| Branch Creation | None |
| Worktree Creation | None |
| New spacer-clone Directory | None |

## 4. Evidence Baseline

| Category | Count | Status |
|---|---:|---|
| Analyzer blockers (AN-BLK-001..010) | 10 | All `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| Golden blockers (GOLD-BLK-001..008) | 8 | All `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| Parity blockers (PAR-BLK-001..008) | 8 | All `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| Golden cases (GOLD-001..016) | 16 | All `NOT_APPROVED` |
| Parity cases (PAR-001..015) | 15 | All `NOT_APPROVED` |
| External identities (EXT-ID-001..003) | 3 | All `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| DS-02..05 source/numeric packages | 8+ | Source-blocked |
| Snapshot total | 76 | 45 blocked + 31 not approved |
| Executable now (tooling) | EA-01..05 pipelines | OPERATIONAL/COMPLETE |
| External dependency | Analyzer/SPACER/STATICS + licensed standards | Unavailable / blocked |
| Resolved canonical blockers | 0 | No promotion |
| Remaining | 76 | See [unresolved_evidence_register.csv](unresolved_evidence_register.csv) |

## 5. Evidence Harness

**Implemented:** EA-01 stdlib evidence harness (`scripts/apollo/evidence/`)
**Scripts:** `evidence_core.py`, `validate_evidence_bundle.py`, workspace capture, stale detection, repeated-run comparison
**Manifest Schema:** `apollo.evidence.bundle.v1` — [evidence_bundle_schema.json](01_harness/evidence_bundle_schema.json)
**Stale Detection:** Recomputed from bound manifests; forged stale flags rejected (adversarial repair R-04)
**Reproducibility:** Deterministic/nondeterministic classification; three-run comparison hooks
**Tests:** 32 targeted harness tests; 200 total evidence tests PASS
**Checkpoint SHA:** `46f11c139df5ab0c8184e11e36eae22c2eaa4e19` (+ correction `60b44f3f2605a4d5b62cd93cf9e4a6727192d339`)

## 6. Analytical Golden Package

**Cases:** GOLD-001..005 analytical tooling fixtures; catalog traces all 16 cases
**Independent Derivations:** `independent_analytical_review.py`; 26 quantities agree; no Apollo solver path
**Expected Values:** [expected_values.csv](02_analytical_golden/expected_values.csv); synthetic theory coefficients only
**Tolerance Freeze:** SHA-256 `4dd51a92df802a94fec4629858019afc451b90605e68ce56185aa083abbd910a`
**Comparison Results:** EA-02 validator PASS; DR-08 dry-run PASS (independent review path, not expected echo)
**Approved:** 0 — canonical `GOLD-001..016` remain `NOT_APPROVED`
**Blocked:** GOLD-BLK-001..008; package status `TOOLING_REVIEWED_NOT_GOLD_APPROVED`
**Checkpoint SHA:** `f3945c7a47318c2c4ed45de2a4936b64917d09e9`

## 7. External Run Package

**Analyzer Runbook:** [execution_runbook.md](03_external_run_package/execution_runbook.md)
**SPACER Runbook:** [spacer_identity_capture.md](03_external_run_package/spacer_identity_capture.md)
**License Requirements:** [license_preflight.md](03_external_run_package/license_preflight.md)
**Machine Requirements:** [machine_preflight.md](03_external_run_package/machine_preflight.md) — no Analyzer/SPACER/STATICS in PATH at preflight
**Input Bundle:** templates + fixture checksum manifest template
**Expected Outputs:** [expected_artifact_catalog.csv](03_external_run_package/expected_artifact_catalog.csv)
**Acceptance Criteria:** [evidence_acceptance_checklist.csv](03_external_run_package/evidence_acceptance_checklist.csv)
**Execution Status:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` (package `COMPLETE`)
**Checkpoint SHA:** `c8d601e8593069e9f28341e34c3d654f084ef2c4`

## 8. SPACER Parity Harness

**Normalization:** `parity_core.py` fail-closed raw→canonical with byte-SHA bindings
**Mapping:** Bijective entity/quantity maps; coordinate/DOF/I-J/sign/unit transforms
**Coordinates / I-J / Signs:** Orthonormal 3×3 groups; equilibrium worksheets required
**Units:** Per-side conversion keyed by canonical quantity
**Tolerance:** Pre-frozen register SHA-256 `7ea474a42ecf039868279ccd084d3cb7ebae6b92ca89858e610ac4229c0c3683`
**Mismatch Classification:** 14 classes; no magnitude-only guessing
**Tests:** 63 targeted parity tests; synthetic fixtures `NOT_ACTUAL_SPACER_PARITY`
**Checkpoint SHA:** `a00104e2cd9ce1ec14a334ab3a2be2f148ab5696`

## 9. Dry Run

**Synthetic Analyzer:** DR-01..DR-07 EA-01 paths PASS
**Deterministic / Nondeterministic:** DR-02/DR-03 PASS
**Error Cases:** DR-04..DR-07 nonzero/timeout/stale/malformed PASS
**Analytical Golden Pipeline:** DR-08 PASS (independent review binding)
**Parity Pipeline:** DR-09..DR-18 normalization/compare/classification PASS; DR-15 tolerance FAIL expected
**Evidence Bundle:** DR-19 validation PASS
**Report Generation:** DR-20 reports generated; actual parity remains blocked
**Dry Run Verdict:** HARNESS/ANALYTICAL_GOLDEN/PARITY pipelines OPERATIONAL; EXTERNAL_MACHINE and ACTUAL_SPACER blocked
**Artifact manifest SHA-256:** `9b08de3126f8c62eeb49f824a13bb1857750f50f9c32243b5850e3b864df5913`
**Checkpoint SHA:** `482eabcdbd293629e8d1a57f168f5306549626cf`

## 10. Numeric Release Gate

| Predicate | State | Notes |
|---|---|---|
| Source numerics (GATE-NR-01) | BLOCKED | DS-02..05 remain source-blocked |
| Analyzer machine evidence (GATE-NR-02) | BLOCKED | EA-03 package only |
| Analytical Golden approval (GATE-NR-03) | BLOCKED | Tooling reviewed; GOLD NOT_APPROVED |
| Reference Golden (GATE-NR-03) | BLOCKED | No fixed SPACER/reference capture |
| Golden reproducibility (GATE-NR-03) | BLOCKED | External runs required |
| SPACER semantic mapping (GATE-NR-04) | BLOCKED | No fixed native identity |
| SPACER actual numeric parity (GATE-NR-04) | BLOCKED | Synthetic only |
| Unresolved blockers (GATE-NR-05) | BLOCKED | 76 open |
| Independent review (GATE-NR-06) | PASS | Document freeze + EA audits |
| Full validation (GATE-NR-07) | PASS | Section 11 records latest EA-06 pre-commit validation; final git cleanliness is receipt-gated |
| **Release Verdict** | **BLOCKED** | Enablement complete; external run required |

## 11. Validation

Section 11 records the latest EA-06 pre-commit validation suite. `FINAL_REPOSITORY_CLEANLINESS_VERDICT`, `GITHUB_REFLECTION_VERDICT`, and repository-baseline `Working Tree Clean` / `HEAD == origin/main` fields remain `PASS_AT_TERMINAL_RECEIPT` until terminal commit receipt; this report does not claim a dirty working tree is clean.

```text
EVIDENCE_UNITTEST_DISCOVERY: PASS (200 tests)
TYPECHECK: PASS
LINT: PASS
FRONTEND_FULL_TESTS: PASS (240 files; 1902 tests)
FRONTEND_FULL_TESTS_RETRY_NOTE: Initial concurrent validation run timed out in the parity CLI build hook at 10 seconds; the unchanged suite was rerun standalone and all 240 files / 1902 tests passed without changing code or timeout.
FRONTEND_REGRESSION: PASS (1 file; 6 tests)
BACKEND_FULL_TESTS: PASS (652 tests)
PRODUCTION_BUILD: PASS (3896 modules transformed)
GIT_DIFF_CHECK: PASS
MARKDOWN_LINK_CHECK: PASS (EA-06 integration scope)
CSV_PARSE_AND_SCHEMA_CHECK: PASS
JSON_MANIFEST_PARSE: PASS
DUPLICATE_ID_CHECK: PASS
BLOCKER_SNAPSHOT_COUNT_CHECK: PASS (76 = 45 + 31)
RESOLVED_BLOCKER_COUNT_CHECK: PASS (0)
ENABLEMENT_VS_CLOSURE_CHECK: PASS
SECTION12_REGISTER_NO_TRUNCATION_CHECK: PASS
TRACEABILITY_MATRIX_CHECK: PASS
EVIDENCE_COLLECTION_CSV_WIDTH_CHECK: PASS (21 files)
DESIGN_STANDARDS_CSV_WIDTH_CHECK: PASS (29 files)
```

**Checksum anchors:** dry manifest `9b08de3126f8c62eeb49f824a13bb1857750f50f9c32243b5850e3b864df5913`; analytical freeze `4dd51a92df802a94fec4629858019afc451b90605e68ce56185aa083abbd910a`; parity freeze `7ea474a42ecf039868279ccd084d3cb7ebae6b92ca89858e610ac4229c0c3683`

## 12. Remaining External Evidence

All 76 snapshot blockers individually listed below. External software versions are `MUST_BE_CAPTURED_AND_FROZEN` where not yet captured. Source: [unresolved_evidence_register.csv](unresolved_evidence_register.csv) (resolved from [current_blocker_snapshot.csv](00_inventory/current_blocker_snapshot.csv) and DS-06..08 source registers). Mechanical equality check: `python3 scripts/apollo/evidence/validate_report_section12_register.py`.

| ID | Software | Version | License | Machine | Input | Procedure | Output | Checksum | Acceptance | Numeric impact |
|---|---|---|---|---|---|---|---|---|---|---|
| BLK-S1-001 | PDF viewer evidence register and SHA-256 tool | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized R7 access | NOT_APPLICABLE_NOT_SPECIFIED | Per-volume title and colophon manifest inputs | Human-read authorized copies and cross-check official issuance metadata | Licensed per-volume title and colophon manifest with checksums and DS-01 evidence locators | SHA-256 manifest over all retained evidence artifacts | Every current facet has an exact identity edition locator checksum and recorded decision | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-002 | JIS source access PDF viewer and SHA-256 tool | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized JIS access | NOT_APPLICABLE_NOT_SPECIFIED | Per-row primary JIS packages JIS-001 through JIS-034 | Licensed source acquisition plus human identity and edition review | Per-row primary JIS packages and supervisor decisions linked to JIS-001 through JIS-034 | SHA-256 manifest over all retained evidence artifacts | Every applicable row has exact standard edition locator relation and decision | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-003 | PDF viewer evidence register and SHA-256 tool | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized supporting-manual access | NOT_APPLICABLE_NOT_SPECIFIED | Publisher preface evidence for each manual | Human-read authorized manual prefaces and record edition map | Publisher preface evidence and explicit Phase 1 citation-scope decision for each manual | SHA-256 manifest over all retained evidence artifacts | Every supporting manual has an edition relationship and approved limited role | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-004 | Authorized standards source evidence register and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized R7 access | NOT_APPLICABLE_NOT_SPECIFIED | Verified R7 clause/table package for each engineering quantity | Human visual source review then independent register transcription | Verified R7 clause/table package and adoption decision for every engineering quantity | SHA-256 manifest over all retained evidence artifacts | Every adopted engineering numeric has exact source locator unit applicability and decision | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-005 | Authorized JIS/R7 source evidence register and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized R7 and JIS access | NOT_APPLICABLE_NOT_SPECIFIED | MAT-DS03 blocked property row inventory from material_properties_register.csv | Clear JIS identities then human-review R7 material references | Per-property primary-source manifest for MAT-DS03 rows with edition locators units and SHA-256 | SHA-256 manifest over all retained evidence artifacts | Each in-scope property has source locator edition unit applicability and decision | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-006 | PDF viewer evidence register and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized source access | NOT_APPLICABLE_NOT_SPECIFIED | Adopted register row inventory from DS-02 through DS-05 | Review image-export pages manually without OCR-only promotion | Human-verified locator manifest linked to each adopted register row with page table clause locators and SHA-256 | SHA-256 manifest over all retained evidence artifacts | Every adopted record resolves to exact edition page table or clause evidence | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-007 | Document review facility and checksum tool | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized Apollo manual access if required | NOT_APPLICABLE_NOT_SPECIFIED | Historical Apollo edition labels and current target edition inventory | Supervisor workshop with frame team and lawful manual review | Signed historical-baseline decision with supporting Apollo manual edition evidence | SHA-256 manifest over all retained evidence artifacts | All historical labels have a documented non-normative relationship to the current target | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-008 | PDF viewer evidence register and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized source access | NOT_APPLICABLE_NOT_SPECIFIED | Cited image-export page inventory from DS registers | Manual page review and two-person locator confirmation | Per-citation visual review log or approved searchable replacement manifest with checksums | SHA-256 manifest over all retained evidence artifacts | Every cited image page is visually verified and checksum-bound | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-009 | Compliance record facility | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Organizational authority | NOT_APPLICABLE_NOT_SPECIFIED | Retained evidence extract inventory and publisher package license terms | Legal and organizational compliance review | Written receiving-organization compliance decision linked to package license terms | SHA-256 manifest over all retained evidence artifacts | Permitted storage access and redistribution scope is explicit for every retained extract | BLOCKS_EVIDENCE_DISTRIBUTION |
| DTR-06 | Browser PDF viewer evidence register and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized R7 access | NOT_APPLICABLE_NOT_SPECIFIED | R7 edition row inventory awaiting errata verification | Review official support pages and licensed publisher bulletins | Official per-volume errata manifest linked to edition rows with dated bulletin checksums | SHA-256 manifest over all retained evidence artifacts | Every volume has current dated errata state checksum and application decision | BLOCKS_NUMERIC_RELEASE |
| PKG-R7-V | PDF viewer independent calculation and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized R7 access | NOT_APPLICABLE_NOT_SPECIFIED | DS-05 verification register row inventory | Human visual confirmation and independent transcription review | Per-row R7 verification evidence package for DS-05 registers with clause table equation factor trace | SHA-256 manifest over all retained evidence artifacts | Every released verification row has complete clause table equation factor and comparison trace | BLOCKS_NUMERIC_RELEASE |
| PKG-DS03 | Authorized standards evidence and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized R7 and JIS access | NOT_APPLICABLE_NOT_SPECIFIED | DS-05 material-use row inventory requiring DS-03 closure | Acquire and approve BLK-S1-002 and BLK-S1-005 evidence then map rows | Closed DS-03 source packages linked to each DS-05 use with checksums | SHA-256 manifest over all retained evidence artifacts | Resistance calculations reference only adopted source-complete material rows | BLOCKS_NUMERIC_RELEASE |
| PKG-DS04 | Authorized standards evidence and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Authorized R7 access | NOT_APPLICABLE_NOT_SPECIFIED | DS-05 load-use row inventory requiring DS-04 closure | Acquire BLK-S1-004 evidence and independently review factor ownership | Closed DS-04 source packages linked to each DS-05 use with checksums | SHA-256 manifest over all retained evidence artifacts | Load-side factors and combinations are source-complete and applied exactly once | BLOCKS_NUMERIC_RELEASE |
| PKG-SCOPE-P1B | Document review and decision-signing facility | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Current Phase 1 scope artifacts and Step1 boundary conflict records | Review current scope artifacts without changing historical records | Signed supervisor Phase 1B member/check table and decision ID | SHA-256 manifest over all retained evidence artifacts | One unambiguous scope table governs every verification case | BLOCKS_NUMERIC_RELEASE |
| BLK-S1-011 | Selected Analyzer evidence register and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | AN-BLK-001 through AN-BLK-010 closure status and DS-06 probe inventory | Acquire authorized Analyzer documentation and supervised machine captures under DS-06 safe procedures | DS-06 machine-evidence closure manifest mapping every AN-BLK-001 through AN-BLK-010 acceptance | SHA-256 manifest over all retained evidence artifacts | All ten AN blocker packages pass and the canonical Analyzer relationship version and format are fixed | BLOCKS_NUMERIC_RELEASE |
| PKG-DS06 | Selected Analyzer mapping independent calculation and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | DS-05 response quantity inventory and accepted DS-06 probe artifacts | Close BLK-S1-011 and AN-BLK-001 through AN-BLK-010 then independently map DS-05 rows | Accepted DS-06 machine bundle linked to DS-05 response quantities with mapping worksheets | SHA-256 manifest over all retained evidence artifacts | Every DS-05 response quantity maps without ambiguity and retains load-case context | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-001 | Vendor-installed executable or service plus About or version command | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement if product requires it | Installed Analyzer SPACER STATICS on authorized machine | No model required for product identity and minimal copied model only for module identity | Use authorized machine and redact personal or license secrets without altering identity fields | Executable service and module metadata version output and installation manifest | SHA-256 of executable and retained identity artifacts | Each product module process and service is uniquely distinguished and every claimed relationship or non-equivalence is supported | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-002 | Identity fixed by AN-BLK-001 | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | Installed Analyzer SPACER STATICS on authorized machine | Checksum-fixed minimal valid model with provenance | Run copied fixture in a newly created isolated directory without modifying licensed installation | Raw stdout stderr exit plus recursive before-after file manifests and all native artifacts | SHA-256 of executable input and every retained artifact | Fresh output is parseable bound to current input and complete under documented success rules | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-003 | Repository API and IF3 plus identity fixed by AN-BLK-001 | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement for external runs | Installed Analyzer SPACER STATICS on authorized machine | Dimensioned minimal fixtures under supported unit and locale settings | Use supported locale settings and copied fixtures in authorized isolated workspaces | Repository requests raw and IF3 results native inputs outputs reports metadata and raw byte captures | SHA-256 of repository baseline executable inputs and outputs | Every input and result quantity has a bound unit conversion rule and locale changes are deterministic or rejected | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-004 | Identity fixed by AN-BLK-001 | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | Installed Analyzer SPACER STATICS on authorized machine | Positive unit-load and asymmetric member fixtures with hand equilibrium checks | Use non-production copied fixtures and independently review transformations before adoption | Native model and result artifacts plus coordinate displays and equilibrium worksheet | SHA-256 of executable all fixtures outputs and worksheet | All bases orders and signs are uniquely mapped and equilibrium closes within predeclared tolerance | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-005 | Identity fixed by AN-BLK-001 | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement plus vendor-approved unavailable-license test method | Installed Analyzer SPACER STATICS on authorized machine | Fixtures AN-PRB-001 through AN-PRB-006 and AN-PRB-011 | Coordinate license-failure tests with administrator and never tamper with license files | Per-probe process status logs license artifacts and file deltas | SHA-256 of executable fixtures and retained artifacts | Each failure class is distinguishable and cannot yield authoritative success | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-006 | Identity fixed by AN-BLK-001 plus repository ingestion service | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | Installed Analyzer SPACER STATICS on authorized machine | Genuine output set seeded stale set and controlled corrupt copies | Work only on copies in isolated directories and preserve originals read-only | Before-after manifests temp lock backup files and ingestion diagnostics | SHA-256 of executable inputs seeds genuine corrupt and final files | Only current checksum-bound complete output is selectable and corrupt output fails closed | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-007 | Identity fixed by AN-BLK-001 | MUST_BE_CAPTURED_AND_FROZEN | Named entitlement with documented concurrency limits | Installed Analyzer SPACER STATICS on authorized machine | Two distinct valid fixtures and approved long-running or failure fixture | Use administrator-approved non-production machine and vendor-supported termination only | Per-run process trees file manifests logs locks dumps and post-cleanup state | SHA-256 of executable inputs and all retained artifacts | No mixed output orphan process stale lock or publishable partial result remains | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-008 | Identity fixed by AN-BLK-001 | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | Installed Analyzer SPACER STATICS on authorized machine | One checksum-fixed representative valid fixture | Acquire in isolated directories and retain an immutable evidence bundle | Complete outputs logs manifests and normalized comparison record | SHA-256 of executable input and each output | Three runs satisfy predeclared exact-field and numeric-tolerance policy after only approved metadata normalization | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-009 | Selected external identity plus repository IF3 ingestion and export paths | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | Installed Analyzer SPACER STATICS on authorized machine | One checksum-fixed valid run with native output IF3 CSV PDF and mock-negative fixture | Use authorized native output copies and run exports in an isolated repository project without altering raw artifacts | Native outputs IF3 resource derived exports diagnostics and source binding record | SHA-256 of executable input native result IF3 CSV PDF and retained logs | IF3 binds the fresh native result while CSV PDF and mock data remain derived non-authoritative and omitted or rounded fields are declared | BLOCKS_NUMERIC_RELEASE |
| AN-BLK-010 | Selected external identity plus identified repository import adapter | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | Installed Analyzer SPACER STATICS on authorized machine | Checksum-fixed one-case fixture and asymmetric two-case one-combination fixture | Use copied non-production fixtures preserve native outputs read-only and independently review mappings | Native inputs outputs logs IF3 load contexts diagnostics and mapping worksheets | SHA-256 of executable fixtures native outputs imported resources and worksheets | Case mapping is one-to-one and combination is explicitly mapped with coefficients or rejected without flattening | BLOCKS_NUMERIC_RELEASE |
| GOLD-BLK-001 | Independent calculation medium and SHA-256 tool | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed models for GOLD-001 through GOLD-005 from examples/verification/beam/*.json and checksum-fixed axial model | Derive without invoking Apollo output then perform independent dimensional equilibrium and assumption review | One immutable derivation package per case with model derivation workbook signed conventions and expected SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | Every expected quantity follows from the fixed input with correct units signs ends and predeclared justified tolerance and two independent derivations agree for each expected quantity | BLOCKS_NUMERIC_RELEASE |
| GOLD-BLK-002 | Independent calculation and comparison specification | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Catalog quantity list from golden_case_catalog.csv for all numeric Goldens | Establish error budget before comparison and independently review without observing mismatch | Approved tolerance worksheet linked to each catalog quantity with per-quantity absolute relative zero threshold precision rounding and unit-conversion facets | SHA-256 manifest over all retained evidence artifacts | All tolerance facets are nonblank justified dimensionally and frozen before first comparison | BLOCKS_NUMERIC_RELEASE |
| GOLD-BLK-003 | Selected reference software plus checksum and comparison tools | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed native and repository models for GOLD-006 and GOLD-010 | Follow DS-06 safe machine-probe procedure and retain three isolated run bundles | Licensed immutable evidence bundle per case with executable input output SHA-256 manifests and three isolated run records | SHA-256 over executable inputs outputs and retained artifacts | Three runs reproduce under the approved policy and every value is traceable to fixed native output | BLOCKS_NUMERIC_RELEASE |
| GOLD-BLK-004 | Repository serializer and SHA-256 tool | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed canonical bridge analysis document from independently approved contract fixture | Generate from independently approved contract fixture and review canonicalization before execution | Canonical serialization package with semantic equality specification variable-field exclusions and parent Golden link | SHA-256 manifest over all retained evidence artifacts | Round trip preserves all governed semantics and expected artifact does not originate solely from implementation output | BLOCKS_NUMERIC_RELEASE |
| GOLD-BLK-005 | Selected reference software model mapping and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Lawful non-production four five and six main-girder bridge models | Acquire approved non-production models lawfully then run fixed reference identity per DS-06 | Three complete model/evidence bundles with native and repository representations and three-run licensed reference results | SHA-256 manifest over all retained evidence artifacts | Topology materials supports loads conventions and three-run results are complete and independently approved | BLOCKS_NUMERIC_RELEASE |
| GOLD-BLK-006 | Schema validator IF3 gate tests and SHA-256 tool | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | IF3 staleness export authority and repository schema contracts for GOLD-012 GOLD-013 and GOLD-014 | Derive expected rejection from schema or authority contract before running implementation and review independently | One immutable negative evidence package per case with source and expected rejection artifacts | SHA-256 manifest over all retained evidence artifacts | Named rejection occurs with no authoritative output and cannot be reclassified as a successful Golden | BLOCKS_NUMERIC_RELEASE |
| GOLD-BLK-007 | Licensed standards evidence independent calculation and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | Authorized access to applicable standards | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed design input and adopted DS-02 through DS-05 source values | Clear all predecessor source blockers then derive without Apollo output and independently review | Immutable source manifest input derivation expected quantities and verdict with SHA-256 | SHA-256 over executable inputs outputs and retained artifacts | Every numeric and equation traces to adopted source and the fixed case verdict follows independently | BLOCKS_NUMERIC_RELEASE |
| GOLD-BLK-008 | Repository export tools PDF inspection and checksum tools | SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed live source and valid IF3 result after approved parent numeric Golden | Run only after live-source authority passes then compare internal and displayed quantities against independent format expectations | Immutable source IF3 CSV PDF and lineage manifest with producer versions and SHA-256 | SHA-256 manifest over all retained evidence artifacts | No stale or raw bypass all required quantities present and internal versus rounded values are explicitly distinguished | BLOCKS_NUMERIC_RELEASE |
| PAR-BLK-001 | Installed product identity facility and SHA-256 tool | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Authorized machine access for DS-06 safe identity procedure | Apply DS-06 safe identity procedure on licensed machine | Authorized identity evidence bundle with version outputs installation manifest and SHA-256 | SHA-256 over executable inputs outputs and retained artifacts | Every product module process and relationship is uniquely fixed with checksums | Blocks all actual parity |
| PAR-BLK-002 | SPACER input facilities mapping tool and checksum tool | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed minimal and asymmetric native/Apollo model pairs | Export permitted native inputs and map fields before comparing results | Mapping specification with field dictionary round-trip proofs bijective identity records and SHA-256 manifests | SHA-256 over executable inputs outputs and retained artifacts | Bijective identities and round-trip mappings cover every required entity with no ambiguity | Blocks semantic and numeric parity |
| PAR-BLK-003 | SPACER STATICS full-result facilities independent calculation and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Positive-component asymmetric reversal probe fixtures with declared sign conventions | Run all DS-06 coordinate/sign probes on fixed identity | Probe bundle with transformation matrices permutations sign vectors equilibrium worksheet and SHA-256 manifests | SHA-256 over executable inputs outputs and retained artifacts | Transformations are predefined invertible and close equilibrium within approved tolerance | Blocks signed numeric parity |
| PAR-BLK-004 | SPACER STATICS native output mapping and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | One-case and asymmetric two-case one-combination native/Apollo models | Run fixed models and construct reviewed bijective mapping before numeric comparison | Native/Apollo evidence bundles with bijective case and combination mapping worksheets and SHA-256 manifests | SHA-256 over executable inputs outputs and retained artifacts | Cases map one-to-one and combinations retain components coefficients and semantics or are explicitly unsupported | Blocks load and result parity |
| PAR-BLK-005 | SPACER STATICS Apollo analyzer comparison and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Approved Golden and parity models with fixed SPACER identity and closed PAR-BLK-001 through PAR-BLK-004 PAR-BLK-006 PAR-BLK-007 predecessors | Acquire after PAR-BLK-001 through PAR-BLK-004 and DS-07 Golden gates close | Three isolated native run bundles Apollo result bundle source/output checksums and full coverage comparison manifest | SHA-256 manifest over all retained evidence artifacts | All identities components units transformations tolerances and coverage pass without skipped data | Blocks actual numeric parity |
| PAR-BLK-006 | Repository test runner and checksum tool | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Synthetic negative fixtures for missing extra duplicate malformed empty swapped operands and near-zero cases | Build a design-numeric-free evidence harness before release and independently validate against synthetic negative corpus | PAR-CMPVAL-BUNDLE-v1 versioned non-product comparator validation bundle with corpus manifest and SHA-256 | SHA-256 over executable inputs outputs and retained artifacts | No false PASS for asymmetric missing malformed empty or near-zero data and version is fixed | Blocks automated parity claim |
| PAR-BLK-007 | Authorized standards evidence SPACER STATICS and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | Authorized standards access plus named SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Immutable adopted DS-02/DS-03 source manifest rows for mapped materials and sections | Clear predecessor blockers then map fixed material and stiffness probes | Native/Apollo material and section mapping bundle with units formulation applicability proofs and SHA-256 manifests | SHA-256 over executable inputs outputs and retained artifacts | Every property is sourced and mapped with units formulation and applicability | Blocks material/stiffness/numeric parity |
| PAR-BLK-008 | SPACER report/drawing/file facilities Apollo exports visual and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed native and Apollo report drawing file inputs on fixed identities | Export on fixed identities retain permitted artifacts and compare only predeclared fields | Semantic field map with producer versions internal/display values layouts encoding newline rounding exclusions and SHA-256 manifests | SHA-256 over executable inputs outputs and retained artifacts | Field coverage producer identities precision rounding encoding and exclusions are explicit and approved | Blocks report drawing and file parity |
| EXT-ID-001 | Vendor-installed executable or service plus version facility | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement if required | Vendor-installed executable or service on authorized machine | No model required for identity capture | Use an authorized machine and redact secrets without altering identity fields | Executable or service metadata version output architecture publisher and installation manifest | SHA-256 manifest over all retained evidence artifacts | Identity and relationship evidence uniquely distinguish this subsystem from every other candidate | BLOCKS_NUMERIC_RELEASE |
| EXT-ID-002 | Vendor-installed SPACER executable or service plus version facility | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | Vendor-installed SPACER executable or service | No model required for identity capture | Use an authorized licensed machine and retain only permitted metadata | Product and module executables services version output publisher architecture and installation manifest | SHA-256 manifest over all retained evidence artifacts | Product shell and module identities are separately fixed and relationships are documented | BLOCKS_NUMERIC_RELEASE |
| EXT-ID-003 | Vendor-installed hosting executable or service plus module identity facility | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER STATICS entitlement | Vendor-installed hosting executable or service | Checksum-fixed minimal supported DAT model after identity capture | Use an authorized licensed machine and a copied non-production fixture | Hosting executable module metadata version output and permitted logs | SHA-256 manifest over all retained evidence artifacts | STATICS is uniquely mapped to its host product process version and callable boundary | BLOCKS_NUMERIC_RELEASE |
| GOLD-001 | sympy closed-form beam workbook or equivalent hand calculation plus sha256sum | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | examples/verification/beam/cantilever_tip_load.json checksum-fixed | Closed-form beam theory with independent dimensional and equilibrium review | GOLD-001-DERIV-PKG-v1 with signed N2 uy rz N1 fy mz quantities derivation workbook convention sheet and SHA-256 manifest over model plus derivation plus expected | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-001; closure requires two agreeing independent derivations per D-005 | BLOCKS_NUMERIC_RELEASE |
| GOLD-002 | sympy simply-supported center-load workbook or equivalent hand calculation plus sha256sum | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | examples/verification/beam/simple_beam_center_load.json checksum-fixed | Closed-form beam theory with independent dimensional and equilibrium review | GOLD-002-DERIV-PKG-v1 with signed N2 uy N1/N3 fy and member-end Mz quantities derivation workbook convention sheet and SHA-256 manifest over model plus derivation plus expected | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-001; closure requires two agreeing independent derivations per D-005 | BLOCKS_NUMERIC_RELEASE |
| GOLD-003 | sympy uniform-load beam workbook or equivalent hand calculation plus sha256sum | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | examples/verification/beam/simple_beam_uniform_load.json checksum-fixed | Closed-form beam theory with independent dimensional and equilibrium review | GOLD-003-DERIV-PKG-v1 with signed N2 uy N1/N3 fy and member-end Mz quantities derivation workbook convention sheet and SHA-256 manifest over model plus derivation plus expected | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-001; closure requires two agreeing independent derivations per D-005 | BLOCKS_NUMERIC_RELEASE |
| GOLD-004 | sympy axial bar workbook or equivalent hand calculation plus sha256sum | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed axial member model artifact to be bound before derivation | Axial bar closed form plus equilibrium | GOLD-004-DERIV-PKG-v1 with signed axial displacement reaction and I-J axial action quantities derivation workbook convention sheet and SHA-256 manifest over model plus derivation plus expected | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-001; closure requires two agreeing independent derivations per D-005 | BLOCKS_NUMERIC_RELEASE |
| GOLD-005 | sympy Saint-Venant torsion workbook or equivalent hand calculation plus sha256sum | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | examples/verification/beam/cantilever_torsion.json checksum-fixed | Saint-Venant torsion closed form plus equilibrium | GOLD-005-DERIV-PKG-v1 with signed N2 rx N1 mx and I-J torsional action quantities derivation workbook convention sheet and SHA-256 manifest over model plus derivation plus expected | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-001; closure requires two agreeing independent derivations per D-005 | BLOCKS_NUMERIC_RELEASE |
| GOLD-006 | SPACER identity to be fixed | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement for reference cases | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed native and repository models for symmetric planar grid | Fixed-version reference-software run | GOLD-006-REF-BUNDLE-v1 with fixed executable input native outputs SHA-256 manifests and three isolated run records | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-003 | BLOCKS_NUMERIC_RELEASE |
| GOLD-007 | SPACER identity to be fixed | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement for reference cases | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed four-main-girder bridge native and repository models | Fixed-version reference-software run | GOLD-007-REF-BUNDLE-v1 with native and repository representations SHA-256 manifests and three isolated run records | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-005 | BLOCKS_NUMERIC_RELEASE |
| GOLD-008 | SPACER identity to be fixed | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement for reference cases | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed five-main-girder bridge native and repository models | Fixed-version reference-software run | GOLD-008-REF-BUNDLE-v1 with native and repository representations SHA-256 manifests and three isolated run records | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-005 | BLOCKS_NUMERIC_RELEASE |
| GOLD-009 | SPACER identity to be fixed | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement for reference cases | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed six-main-girder bridge native and repository models | Fixed-version reference-software run | GOLD-009-REF-BUNDLE-v1 with native and repository representations SHA-256 manifests and three isolated run records | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-005 | BLOCKS_NUMERIC_RELEASE |
| GOLD-010 | Reference identity to be fixed | MUST_BE_CAPTURED_AND_FROZEN | Named valid entitlement for reference cases | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed minimal two-case one-combination native and repository models | Fixed-version reference-software run plus mapping review | GOLD-010-REF-BUNDLE-v1 with case combination mapping worksheets native outputs SHA-256 manifests and three isolated run records | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-003 | BLOCKS_NUMERIC_RELEASE |
| GOLD-011 | Repository serializer and SHA-256 tool | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed canonical bridge analysis document from independently approved contract fixture | Canonical serialization independent from runtime snapshot | GOLD-011-CANON-PKG-v1 with semantic equality specification variable-field exclusions parent Golden link and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-004 | BLOCKS_NUMERIC_RELEASE |
| GOLD-012 | Schema validator IF3 gate tests and SHA-256 tool | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed current source and stale IF3 result fixture for GOLD-012 | Contract-derived negative oracle | GOLD-012-NEG-PKG-v1 with STALE status diagnostics expected rejection artifacts and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-006 | BLOCKS_NUMERIC_RELEASE |
| GOLD-013 | Schema validator IF3 gate tests and SHA-256 tool | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed source result and export request fixture for GOLD-013 | Contract-derived negative oracle | GOLD-013-NEG-PKG-v1 with rejected authority state diagnostics and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-006 | BLOCKS_NUMERIC_RELEASE |
| GOLD-014 | Schema validator IF3 gate tests and SHA-256 tool | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed malformed analysis input fixture for GOLD-014 | Contract-derived negative oracle | GOLD-014-NEG-PKG-v1 with named failure status diagnostic path empty authoritative results record and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-006 | BLOCKS_NUMERIC_RELEASE |
| GOLD-015 | Licensed standards evidence independent calculation and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed design input and adopted DS-02 through DS-05 source values | Target-standard-sourced hand derivation independent of Apollo | GOLD-015-DVER-PKG-v1 with source manifest independent derivation expected quantities verdict and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-007 | BLOCKS_NUMERIC_RELEASE |
| GOLD-016 | Repository export tools PDF inspection and checksum tools | MUST_BE_CAPTURED_AND_FROZEN | NOT_APPLICABLE | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed live source and valid IF3 result after approved parent numeric Golden | Contract-derived export oracle with parent numeric Golden | GOLD-016-EXPORT-PKG-v1 with source IF3 CSV PDF lineage manifest producer versions and SHA-256 | SHA-256 over executable inputs outputs and retained artifacts | Independent approval with reproducibility_count target; primary_blocker GOLD-BLK-008 | BLOCKS_NUMERIC_RELEASE |
| PAR-001 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed minimal native model required | Predeclared field mapping required | PAR-001-SEM-PKG-v1 with native input transformation bundle field mapping worksheet and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-002 | BLOCKS_NUMERIC_RELEASE |
| PAR-002 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed asymmetric topology model required | Bijective identity map required | PAR-002-TOPO-PKG-v1 with native and Apollo topology bundle incidence mapping worksheet and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-002 | BLOCKS_NUMERIC_RELEASE |
| PAR-003 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed material model required | Bijective property map required | PAR-003-MAT-PKG-v1 with DS-03 source manifest native material bundle property map and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-007 | BLOCKS_NUMERIC_RELEASE |
| PAR-004 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed rotated-support model required | Bijective support map required | PAR-004-SUP-PKG-v1 with native support positive-probe bundle basis matrices and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-003 | BLOCKS_NUMERIC_RELEASE |
| PAR-005 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed asymmetric member model required | Bijective member/property map required | PAR-005-STIFF-PKG-v1 with native formulation probe bundle member property map and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-003 | BLOCKS_NUMERIC_RELEASE |
| PAR-006 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed one-case model required | Bijective case/entity map required | PAR-006-CASE-PKG-v1 with native load-case mapping bundle case identity worksheet and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-004 | BLOCKS_NUMERIC_RELEASE |
| PAR-007 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed asymmetric two-case combination required | Bijective combination map required | PAR-007-COMB-PKG-v1 with native combination mapping bundle coefficient worksheet and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-004 | BLOCKS_NUMERIC_RELEASE |
| PAR-008 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Approved Golden and parity model required | Approved identity map required | PAR-008-NUM-PKG-v1 with three isolated native run bundles Apollo result bundle and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-005 | BLOCKS_NUMERIC_RELEASE |
| PAR-009 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Positive displacement/rotation probe suite required | Bijective node/case map required | PAR-009-DISP-PKG-v1 with full-precision displacement bundle DOF component map and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-005 | BLOCKS_NUMERIC_RELEASE |
| PAR-010 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Asymmetric I-J positive component suite required | Bijective member/case map required | PAR-010-FORCE-PKG-v1 with full-precision member-force equilibrium bundle I-J component map and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-005 | BLOCKS_NUMERIC_RELEASE |
| PAR-011 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Asymmetric support positive component suite required | Bijective support/case map required | PAR-011-REACT-PKG-v1 with full-precision reaction equilibrium bundle support component map and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-005 | BLOCKS_NUMERIC_RELEASE |
| PAR-012 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | All positive component and reversal probes required | Bijective identity map required | PAR-012-SIGN-PKG-v1 with transformation equilibrium worksheet sign vector records and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-003 | BLOCKS_NUMERIC_RELEASE |
| PAR-013 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed native and Apollo report inputs required | Report field map required | PAR-013-RPT-PKG-v1 with native report producer rounding bundle field coverage map and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-008 | BLOCKS_NUMERIC_RELEASE |
| PAR-014 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed native and Apollo drawing inputs required | Drawing semantic map required | PAR-014-DRW-PKG-v1 with native drawing producer visual evidence bundle semantic map and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-008 | BLOCKS_NUMERIC_RELEASE |
| PAR-015 | SPACER | MUST_BE_CAPTURED_AND_FROZEN | Named valid SPACER entitlement | NOT_APPLICABLE_NOT_SPECIFIED | Checksum-fixed native files required | File/field map required | PAR-015-FILE-PKG-v1 with native file manifests schemas permitted samples byte map and SHA-256 manifest | SHA-256 over executable inputs outputs and retained artifacts | approval_status NOT_APPROVED; primary_blocker PAR-BLK-008 | BLOCKS_NUMERIC_RELEASE |

## 13. GitHub Reflection

| Stage | Commit SHA |
|---|---|
| Baseline (DS-09) | `7386bdf8be5b11cb38d445e32ddce16464fdb3c1` |
| EA-00 | `fa3c9d0afe5a59860a2bc28c740c3466b464279e` |
| EA-01 | `46f11c139df5ab0c8184e11e36eae22c2eaa4e19` |
| EA-01 correction | `60b44f3f2605a4d5b62cd93cf9e4a6727192d339` |
| EA-02 | `f3945c7a47318c2c4ed45de2a4936b64917d09e9` |
| EA-03 | `c8d601e8593069e9f28341e34c3d654f084ef2c4` |
| EA-04 | `a00104e2cd9ce1ec14a334ab3a2be2f148ab5696` |
| EA-05 | `482eabcdbd293629e8d1a57f168f5306549626cf` |
| EA-06 | `SELF_PENDING_FINAL_COMMIT` |
| Final HEAD | `SELF_PENDING_FINAL_COMMIT` |
| Final origin/main | `SELF_PENDING_FINAL_COMMIT` |

**Note:** EA-06/HEAD uses `SELF_PENDING_FINAL_COMMIT` because the terminal commit receipt resolves the cryptographic self-reference to this integration report and register set; inventing a SHA before that receipt would be false precision. `GITHUB_REFLECTION_VERDICT` and `FINAL_REPOSITORY_CLEANLINESS_VERDICT` remain `PASS_AT_TERMINAL_RECEIPT` until that receipt.

## 14. Final Verdict Tokens

```text
EVIDENCE_BASELINE_VERDICT: COMPLETE
EVIDENCE_HARNESS_VERDICT: COMPLETE
ANALYTICAL_GOLDEN_PACKAGE_VERDICT: COMPLETE
EXTERNAL_RUN_PACKAGE_VERDICT: COMPLETE
PARITY_HARNESS_VERDICT: COMPLETE
DRY_RUN_VERDICT: COMPLETE
HARNESS_DRY_PIPELINE_VERDICT: OPERATIONAL
ANALYTICAL_GOLDEN_DRY_PIPELINE_VERDICT: OPERATIONAL
PARITY_DRY_PIPELINE_VERDICT: OPERATIONAL
EXTERNAL_MACHINE_EVIDENCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
ANALYZER_MACHINE_EVIDENCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
REFERENCE_SOFTWARE_GOLDEN_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
SPACER_ACTUAL_NUMERIC_PARITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
NO_CIRCULAR_GOLDEN_VERDICT: PASS
NO_TOLERANCE_INFLATION_VERDICT: PASS
NO_EXCLUDED_MISMATCH_VERDICT: PASS
NO_STALE_ARTIFACT_VERDICT: PASS
NO_MANUAL_EDIT_VERDICT: PASS
NO_VERSION_MIXING_VERDICT: PASS
NO_UNSOURCED_NUMERICS_VERDICT: PASS
NO_NEW_BRANCH_VERDICT: PASS
NO_NEW_WORKTREE_VERDICT: PASS
NO_NEW_SPACER_CLONE_DIRECTORY_VERDICT: PASS
MAIN_ONLY_OPERATION_VERDICT: PASS
DOCUMENT_COMPLETION_VERDICT: COMPLETE
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
FINAL_REPOSITORY_CLEANLINESS_VERDICT: PASS_AT_TERMINAL_RECEIPT
GITHUB_REFLECTION_VERDICT: PASS_AT_TERMINAL_RECEIPT
OVERALL_VERDICT: EVIDENCE_ACQUISITION_READY_EXTERNAL_RUN_REQUIRED
```

**Non-promotion:** This report integrates EA-00..05 enablement evidence only. It does not close canonical DS-06..08 blockers, approve GOLD or PAR cases, or authorize numeric implementation.
