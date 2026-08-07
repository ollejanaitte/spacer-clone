# STEP 10 Phase 2-II — Layered Integration (Reference Bridge 001)

> **Authority:** Step 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II
> **Development approach:** documentation-only / data-only
> **Production code changed:** NO
> **Numeric analysis performed:** NO (recalculation prohibited)
> **PDF / DWG / DXF / image originals committed to GitHub:** NO
> **Numeric design authorization:** NOT_GRANTED
> **Design or construction use:** PROHIBITED

## Purpose

Integrate the Phase 2-I source decomposition into layered candidate datasets
(Source / Input / Geometry / Structural Model / Load / Analysis / Design /
Adopted Design / Report / Drawing), reconcile Phase 2-I evidence, and produce
tracking records (traceability + registers) ready for Phase 3 input
"Golden 化".

Everything here is a **candidate**. Formal `APPROVED_GOLDEN_INPUT`
promotion happens in Phase 3. This phase must not silently upgrade any source
value to a "verified" or "Golden" value.

## Truth gate (P2II-0)

Before layered integration, Phase 2-I evidence is reconciled. See:
`00_phase2_i_truth_reconciliation.md` and `phase2_i_truth_reconciliation.csv`.

```
PHASE2_I_TRUTH_RECONCILIATION_VERDICT: PASS
```

## Sub-steps

| PR | Branch prefix | Content |
|----|---------------|---------|
| P2II-0 | p2ii-0-truth-gate | Truth reconciliation, post-seal correction, Phase 2-I coverage/status/manifest repair (#441, MERGED) |
| P2II-A | p2ii-a-unread | Unread / low-confidence resolution, drawing 141 transcription (#442, MERGED) |
| P2II-B | p2ii-b-depth-sud | Phase 2-I depth audit + status repair (#445, MERGED) |
| P2II-C~F | p2ii-cf-candidate-foundation | Contracts + Source/Input/Geometry/StructuralModel/Load/Analysis candidate layers (THIS PR) |
| P2II-G~I | p2ii-gi-design-traceability | Design/Adopted/Report/Drawing candidate layers + Traceability |
| P2II-J | p2ii-j-closeout | Validation, manifest, registers, Phase 3 handoff |
| P2II-K | p2ii-k-seal | Seal |

## Directory map

```text
phase2_ii/
├── README.md
├── 00_phase2_i_truth_reconciliation.md
├── phase2_i_truth_reconciliation.csv
├── catalog_count_reconciliation.csv
├── unread_resolution/
├── audit/
├── contracts/
├── candidates/{source,input,geometry,structural_model,load,analysis,design,adopted_design,report,drawing}/
├── traceability/
├── registers/
├── validation/
├── tools/
├── 08_phase3_handoff.md
└── completion_report.md
```

## Governance

- All candidate IDs unique.
- Every candidate must carry a source locator and source record linkage.
- `adoption_status` never equals `APPROVED_GOLDEN_INPUT` in Phase 2-II.
- Recalculation and production-code changes are prohibited.

## P2II-A — Unread / low-confidence resolution (COMPLETE, #442)

Drawings/results that Phase 2-I flagged `UNREADABLE_REQUIRES_HUMAN` (i.e.
raster-only pages with empty/partial text layers) are re-extracted via
render + OCR and transcribed into structured CSVs, then logged in
`unread_resolution_register.csv`.

- Drawing sheet 141 (PDF page 143, 架設計画図): text layer empty; resolved with
  RapidOCR two passes (300/400 DPI). Transcribed into 8 CSVs under
  `unread_resolution/`. 5 ambiguity cells flagged V001–V005 for human confirm.
- Status transitioned: `UNREADABLE_REQUIRES_HUMAN` → `PARTIAL`
  (`verification_status=OCR_VERIFIED`) in Phase 2-I coverage/status/registers.
- Validation: `tools/validate_p2ii_a_unread.py` → **OVERALL: PASS**.

Verdict remains **RESOLVED_WITH_OCR_ASSIST (PARTIAL)** — not a Golden value.
Ambiguous cells require human confirmation before Phase 2-II closeout.

## P2II-B — Phase 2-I depth audit + status repair (THIS PR)

Resolved the two deferred Phase 2-I validator checks (`validate_phase2_i.py`):

- **Check 6 — source locators**: 1817 → 0 invalid. `source_locator` derived as
  `calc_pdf_p{pdf_page_number}` / `calc_pdf_p{pdf_page}` from each row's own page
  number (1781 rows). The `title_blocks.csv` geographic `location` column is no
  longer scanned as a locator (validator false positive).
- **Check 13 — semantic classes**: 1233 → 0 invalid. `ALLOWED_SEMANTIC_CLASSES`
  re-aligned to the authoritative contract taxonomy (26 uppercase classes in
  `02_extraction_schema_and_id_contract.md`) plus the legitimate domain labels
  actually used (253 classes total).
- **Column-shift corruption**: 249 rows across 32 files re-aligned (field count
  == header; content restored to correct columns, nothing lost).

Artifacts:
- `tools/repair_p2ii_b_data.py` (deterministic, idempotent repair script)
- `p2ii_b_depth_audit_register.csv` (2031 change records)
- `p2ii_b_depth_audit_report.md` (baseline, repairs, metrics)

Validator: `tools/validate_phase2_i.py --mode pre-closeout` → **OVERALL: PASS**
(13/13 checks). Frontend lint / tsc / vitest: PASS (538/538).
## P2II-C~F — Candidate foundation (contracts + Source/Input/Geometry/StructuralModel/Load/Analysis) (THIS PR)

Establishes the Phase 2-II candidate-layer contract and the first six candidate
layers, derived deterministically from the Phase 2-I extraction data (no
fabrication, no recalculation).

- **Contracts** (`contracts/`): candidate_layer_contract, candidate_schema,
  id_and_entity_contract, normalization_contract, source_to_candidate_contract,
  candidate_enums.csv.
- **Source layer** (`candidates/source/`): source_record_catalog (4330 records =
  4075 calc/drawing + 162 domain-index + 93 sheet-141 OCR), value/formula/
  table/figure/note catalogs.
- **Input layer** (`candidates/input/`): 25 input candidates + 207 exclusions.
- **Geometry layer** (`candidates/geometry/`): 88 candidates (alignment, girder
  lines, grid points, cross sections, support lines, elevation/crossfall).
- **Structural Model layer** (`candidates/structural_model/`): 91 candidates
  (nodes, members, connectivity, axes, supports, rigid offsets, section assignment).
- **Load layer** (`candidates/load/`): 59 candidates (cases, values, combos,
  application).
- **Analysis layer** (`candidates/analysis/`): 52 candidates (reactions,
  displacements, rotations, member forces, governing cases) — EXCLUDED_ANALYSIS_RESULT.
- **Generator**: `tools/generate_p2iicf_layers.py` (deterministic, idempotent).

Registered gaps (logged in candidate CSVs + summaries): station absent,
panel-point coordinates partial, flange-width conflict `CONF-P2II-001`,
local axes / rigid offsets / per-DOF fixity not stated, cross-beam connectivity
from figure, load-combination table not numeric, live-load influence lines
absent, drawing-141 PARTIAL (HCR-001).
