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
| P2II-0 | p2ii-0-truth-gate | Truth reconciliation, post-seal correction, Phase 2-I coverage/status/manifest repair |
| P2II-A | p2ii-a-unread | Unread / low-confidence resolution, drawing 141 transcription |
| P2II-B | p2ii-b-depth-sud | Phase 2-I depth audit + status repair |
| P2II-C | p2ii-c-layer-contract | Candidate layer contract, schema, enums, ID & normalization rules |
| P2II-D | p2ii-d-input-geometry | Input + Geometry candidate layers |
| P2II-E | p2ii-e-structural-model | Structural model candidate layer |
| P2II-F | p2ii-f-load-analysis | Load + Analysis candidate layers |
| P2II-G | p2ii-g-design-adopted | Design + Adopted design candidate layers |
| P2II-H | p2ii-h-report-drawing | Report + Drawing candidate layers |
| P2II-I | p2ii-i-traceability | Traceability + conflict integration |
| P2II-J | p2ii-j-closeout | Validation, manifest, Phase 3 handoff |
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