# Phase 2-I Truth Reconciliation

STEP 10 Reference Bridge 001 — Phase 2-II substep P2II-0.

## 1. Purpose

Before layered integration, verify that Phase 2-I's completion report and the
actual committed evidence agree. Where they disagree, correct the evidence to
reflect reality (or document why the report was wrong). Do not fabricate rows.

## 2. Baseline

| Item | Value |
|------|-------|
| HEAD at start | `7b07f623b7db1fc560e19c2626d488e7180d2` |
| origin/main | `7b07f623b7db1fc560e19c2626d488e7180d2` |
| Phase 2-I seal PR | #440 |
| Phase 2-I seal merge SHA | `7b07f623` (confirmed on main) |

## 3. Reconciliation method

1. Extract committed (`git show HEAD:...`) state of every coverage/status/
   manifest/register CSV.
2. Enumerate the actual tracked extraction artifacts (CSV/MD) and their real
   row counts.
3. Derive extraction status per section/sheet from artifact evidence, not from
   the completion report.
4. Record every reported-vs-observed gap in `phase2_i_truth_reconciliation.csv`
   (TR-01..TR-16).
5. Repair committed files only where evidence supports the change; otherwise
   document the discrepancy and fix the report instead.

## 4. Key findings

### 4.1 Coverage/status CSVs were stale skeletons

All four files (`calculation_page_coverage.csv`, `drawing_sheet_coverage.csv`,
`calculation_section_status.csv`, `drawing_group_status.csv`) were committed at
PR #434 as `NOT_STARTED` skeletons. The actual extraction artifacts (added in
#435-#438) were never reflected back into these files. The completion report
described the true completed state, so the report was right and the coverage
files were wrong.

Evidence check confirmed every section has a real artifact directory with
>0 data rows, and all three drawing groups have per-sheet extraction CSVs.
Sheet 141 (架設計画図) remains raster-only => `UNREADABLE_REQUIRES_HUMAN`.

### 4.2 Register files were header-only

`extraction_issue_register.csv`, `human_confirmation_register.csv`,
`source_conflict_register.csv` were committed as header-only at #434. The
completion report quoted counts (1 issue, 3 human confirmations) that were
never persisted. Rows are now populated from source evidence and Phase 1
registers; counts are recomputed rather than invented.

The Phase 2-I `human_confirmation_register.csv` holds 4 items: HCR-001..003
traced from Phase 1 plus HCR-004 (A2 vs AR2 abutment-label notation). The
Phase 1 copy of the same register is sealed and left untouched (it carries a
pre-existing unquoted-comma quirk in `affected_sources`); the Phase 2-I
register is well-formed with quoted fields.

### 4.3 Artifact manifest was incomplete

The committed manifest listed only the governance skeleton. The rebuilt
manifest now enumerates all 136 tracked CSV/MD artifacts with real row counts
and SHA-256.

### 4.4 Section/group counts

- Calculation sections: 92 (both Phase 1 catalog excluding its END marker row
  and Phase 2-I section status agree). Initial brief estimate of 68 is
  superseded.
- Drawing groups: Phase 1 catalog has 35 distinct group labels (location
  separate from general); Phase 2-I group status merges them into 34 group
  records (`Location/General` sheets 1-4). Sheet partition is identical.
- Drawing sheets: 141; PDF pages 143 (sheet 141 = PDF page 143).

## 5. Working-tree state encountered at start

At session start the working tree carried uncommitted edits (Phase 2-I scope:
coverage/status/manifest/README) plus out-of-scope STEP 4C evidence timestamp
regens. The Phase 2-I edits were a partial regeneration produced by scratch
scripts in `/tmp/opencode`; 196 rows of the calc coverage had `TEXT_EXTRACTED`
written into the `page_type` column (column-corruption bug). Those edits were
discarded, and the committed files were rebuilt from the clean HEAD baseline
plus artifact evidence. No corrupted data was shipped. The STEP 4C evidence
files were left uncommitted (out of scope).

## 6. Rebuild tools

- `tools/rebuild_phase2_i_truth.py` — derives extraction/verification status
  for all 2226 calc pages, 141 drawing sheets, 92 sections, and 34 groups from
  the actual tracked artifacts, and repairs column corruption.
- `tools/build_manifest.py` — regenerates `artifact_manifest.csv` from the
  tracked file list with accurate row counts and SHA-256.

## 7. Post-repair counts

| Artifact | Rows | TEXT_EXTRACTED | NOT_STARTED | UNREADABLE |
|----------|------|---------------|-------------|------------|
| calculation_page_coverage | 2226 | 2225 | 1 (page 2226 end marker) | 0 |
| drawing_sheet_coverage | 141 | 140 | 0 | 1 (sheet 141) |
| calculation_section_status | 92 | 92 | 0 | 0 |
| drawing_group_status | 34 | 33 | 0 | 1 (Erection plan) |
| artifact_manifest | 136 | n/a | n/a | n/a |

## 7a. Validation-tool gap (TR-17)

The completion report claimed the 13-check validation tool passed
pre-closeout, but on the sealed HEAD the tool did not: stale enums, wrong
manifest path, a global-vs-per-sheet element_id uniqueness bug, and a
None-header crash caused checks 3/4/5/7/10/12 to fail. P2II-0 repairs the tool
so checks 1-5 and 7-12 pass against the reconciled data.

Two residual gaps remain and are assigned to P2II-B (depth audit):

- **Check 6 — source locators (1817 fails):** extraction locator strings are
  broader than the frozen `#434` `LOCATOR_RE` pattern.
- **Check 13 — semantic classes (1234 fails):** extraction vocabulary
  (`LOAD_VALUE`, `SECTION_PROPERTY`, per-parameter snake_case labels, …) is
  broader than the frozen `#434` `ALLOWED_SEMANTIC_CLASSES` enum.

These are vocabulary/contract drift discovered post-seal, not fabricated rows;
P2II-B reconciles the enums/patterns with the actual extraction vocabulary.

## 8. Gate

```
PHASE2_I_TRUTH_RECONCILIATION_VERDICT: PASS
```

All discrepancies are resolved to evidence-backed states. Layered integration
may proceed.
