# Phase 2-II Validation Summary (P2II-J)

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II closeout
> **Tool:** `tools/validate_phase2_ii.py` (Python 3.10, stdlib only)
> **Result:** `OVERALL: PASS` (exit code 0) — 17/17 checks green

## 1. Run

```
python3 tools/build_phase2_ii_manifest.py
python3 tools/validate_phase2_ii.py
python3 tools/compare_reported_counts.py
```

- Manifest built: `artifact_manifest.csv` (115 data rows).
- `validate_phase2_ii.py` → **OVERALL: PASS**, exit code 0.
- `compare_reported_counts.py` → **OVERALL: PASS**, exit code 0 (84 CSV artifacts compared, all match).

## 2. Per-check result

| Check | Verdict | Detail |
|-------|---------|--------|
| 1 | PASS | CSV parse under candidates/traceability/registers/contracts; 1 documented exception (see §3). |
| 2 | PASS | 4339 candidate_ids unique; 0 duplicates. |
| 3 | PASS | All candidate entity_ids resolve in entity registry (id_and_entity_contract + geometry/model entity registers); 0 unknown, 0 empty. |
| 4 | PASS | calculation_locator `calc_pdf_pNNN` / `calc_pdf_pNNN-NNN`; drawing_locator `DWG-SNNN[-VNN]`. |
| 5 | PASS | All 3688 distinct source_record_ids referenced by candidates resolve in `source_record_catalog.csv`; 0 missing. |
| 6 | PASS | All 4116 trace rows resolve: source_record_id in catalog, candidate_id in candidate set; 0 missing. |
| 7 | PASS | All semantic_class values from `candidate_enums.csv`. |
| 8 | PASS | All adoption_status in the 7 Phase 2-II values; 0 `APPROVED_GOLDEN_INPUT`. |
| 9 | PASS | parity_status / confidence / verification_status all from enums. |
| 10 | PASS | raw_value preserved for value-copy layers; 1 documented exception (see §3). |
| 11 | PASS | NOR-002 numeric conversions verified (raw/1000 == normalized); 1 documented exception (see §3). |
| 12 | PASS | CONF-P2II-001 in source_conflict_register; HCR-001/HCR-002 in human_confirmation_register; all candidate references resolve. |
| 13 | PASS | 91 drawing-sheet-141 candidates all carry `verification_status=PARTIAL` + `HCR-001`. |
| 14 | PASS | artifact_manifest.csv paths exist; CSV row counts and SHA-256 all match. |
| 15 | PASS | No .pdf/.png/.jpg/.jpeg/.gif/.glb/.dwg/.dxf under phase2_ii/. |
| 16 | PASS | No `APPROVED_GOLDEN_INPUT` anywhere in candidate CSVs. |
| 17 | PASS | final_report.txt "Phase 2-II CURRENT" candidate counts match actual CSV row counts. |

## 3. Documented exceptions (all registered)

The validator may PASS with documented exceptions when a genuine data gap is
registered in the appropriate register. Three exceptions are registered:

| Check | Item | Register entry | Detail |
|-------|------|----------------|--------|
| 1 | `contracts/candidate_enums.csv` | ISSUE-015 | `fatigue` description contains an unquoted comma producing an extra column on parse. Non-functional for enum reads. Phase 3 applies a trivial quoting fix (no content change). |
| 10 | `AN-032` | ISSUE-014 | raw_value `27.7` vs source `±27.7` — sign dropped during derivation. Phase 3 human confirm; do not guess the sign. |
| 11 | `GEO-076` | ISSUE-016 | Web-height range `2537-2657` mm copied into normalized_value without mm→m conversion (range cannot be divided as a single number). |

## 4. Scope clarifications (no data change)

- **Check 3 — entity registry.** The entity registry is the union of
  `id_and_entity_contract.md` §3 (candidate registry) and the layer entity
  registers `geometry_entity_register.csv` + `model_entity_register.csv`
  (22 distinct entities used by candidates, all registered).
- **Check 4 — range locators.** Multi-page source records (AG2 sections,
  field splice, weld verification) legitimately carry range locators
  `calc_pdf_p323-349`, `calc_pdf_p382-514`, `calc_pdf_p667-669` in the source
  catalogs; the validator accepts `calc_pdf_p\d+(-\d+)?`. Registered as
  ISSUE-013 (RESOLVED, accepted pattern).
- **Check 10 — value-copy layers.** raw_value parity is enforced for the
  value-copy layers (input / geometry / load / analysis / adopted_design).
  Design layer candidates intentionally carry verdicts (`OK`/`N/A`) or formula
  text; drawing dimension candidates carry enriched dimension strings; report
  candidates carry table/row labels. These are documented generator design
  decisions, not raw_value corruption.

## 5. Integrity findings from P2II-J

| Finding | Count | Handling |
|---------|-------|----------|
| Candidate_ids duplicate | 0 | `registers/duplicate_record_register.csv` (header only) |
| source_record_id duplicate | 0 | same register |
| Candidates without source linkage | 1 (`GEO-005`) | `registers/orphan_record_register.csv` ORPH-C-001 |
| Source records not referenced by any candidate/trace | 636 | `registers/orphan_record_register.csv` ORPH-S-0001..0636 |
| Drawing-141 PARTIAL items | 93 | `registers/unread_or_low_confidence_register.csv` |
| LOW-confidence records (non-PARTIAL) | 8 | same register |
| Conflicts registered | 1 (CONF-P2II-001) | `registers/source_conflict_register.csv` |
| Human confirmations registered | 4 (HCR-001..004) | `registers/human_confirmation_register.csv` |
| Issues registered | 16 (ISSUE-001..016) | `registers/issue_register.csv` |

## 6. Verdict

```
PHASE2_II_VALIDATION_OVERALL: PASS
PHASE2_II_VALIDATION_CHECKS_PASSED: 17 / 17
PHASE2_II_DOCUMENTED_EXCEPTIONS: 3 (ISSUE-014, ISSUE-015, ISSUE-016)
PHASE2_II_VALIDATOR_EXIT_CODE: 0
```
