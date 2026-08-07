# Round-trip Validation Summary — P5-3

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 PR P5-3
> **Baseline main SHA:** `2340660f7616f9b46e2f39fbdd329f480e312e8f`

## Verdict

```
COMMON_MODEL_ROUNDTRIP_PARITY: PASS (21 checks)
REFERENCE_FIXTURE_VALIDATION: PASS
GOLDEN_TO_MODEL_MAPPING: PASS
UNEXPLAINED_UNMAPPED_COUNT: 0
SEMANTIC_FINGERPRINT_STABILITY: PASS
TRACEABILITY_PRESERVATION: PASS
CONFLICT_PRESERVATION: PASS
HCR_PRESERVATION: PASS
HOLD_PRESERVATION: PASS
ANALYSIS_EMPTY_STATE: PASS
UNIT_TESTS: 25/25 PASS (14 schema/type + 11 adapter/fixture/round-trip)
```

## Fixture

- `fixtures/reference_bridge_001_common_model.json` (schemaVersion 1.0.0)
- Semantic fingerprint: `fixtures/reference_bridge_001_common_model.fingerprint.txt`
- Validated against canonical JSON Schema + semantic rules: **PASS**

## Golden mapping (parity register)

`validation/golden_to_common_model_parity.csv` — 3,957 rows:

| Source | Records | Status |
|--------|---------|--------|
| Phase 3 Input Golden | 141 | 139 MAPPED, 2 HUMAN_TRACK |
| Phase 4 Model Golden | 67 | 65 MAPPED, 2 HUMAN_TRACK |
| Phase 4 Design Golden | 99 | 92 MAPPED, 7 CONFLICT |
| Phase 4 Report Golden | 1,591 | 1,591 MAPPED |
| Phase 4 Drawing Golden | 2,059 | 1,968 MAPPED, 91 HUMAN_TRACK |
| **Total** | **3,957** | 3,855 MAPPED / 95 HUMAN_TRACK / 7 CONFLICT |

UNEXPLAINED_UNMAPPED_COUNT: **0** (every Golden record is MAPPED*)

## Entity summary (fixture)

| Layer | Entities |
|-------|----------|
| alignments | 1 |
| bridgeGeometry (supports/girders/gridPoints/deck) | 4 + 2 + 4 + 1 |
| structuralModel (nodes/members) | 54 / 20 (incl. 50 HOLD panel nodes) |
| materials | 5 |
| sections | 3 |
| loads (loadCases) | 10 |
| analysisReference | NOT_AVAILABLE (0 results) |
| design | 100 |
| reportSpecification | 1,591 |
| drawingSpecification (sheets/items) | 141 / 1,918 |
| traceability | 3,957 links |
| resolutionRegistry (conflict/HCR/HOLD) | 1 / 1 / 1 |

Total Common entities: **3,853**

## Carry-forward preservation (after build → serialize → deserialize)

- HCR-001: `HUMAN_CONFIRMATION_REQUIRED`, state PENDING, 91 drawing + 2 phase3 records
- CONF-P2II-001: `CONFLICT`, candidates [680 mm, 700 mm], selected null, UNRESOLVED (7 records)
- Intermediate panel points (NODE-1002–1026, NODE-2002–2026): `HOLD_INSUFFICIENT_SOURCE` with explicit reason (150 hold values)
- Analysis Golden = 0: `analysisReference.status = NOT_AVAILABLE`

## Round-trip results

- serialize → deserialize → semantic parity: PASS (entity counts, entity IDs byte-for-byte, bridge ID, schema version, units, resolution states, traceability/report/drawing refs)
- canonical serialization deterministic: PASS
- semantic fingerprint reproducible across round-trip: PASS

## Adapter

`tools/build_common_model_fixture.py` (Golden adapter) reads Phase 3/4 Golden CSVs +
Phase 4 traceability + carry-forward registers mechanically. Shared mapping rules in
`tools/cbdm_mapping.py` (also regenerates `mapping/*.csv` registers). No Golden value
hard-coded; no Golden file modified.
