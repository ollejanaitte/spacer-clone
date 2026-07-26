# Export Authority Rules — IF3 Gated Outputs (P07)

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0010  
**Base commit:** `a559871e3eb09e3c4e35b810d0a903be091dc4f2`

## Purpose

Define the **export authority matrix** for Frame analysis outputs: which export channels (JSON, CSV, PDF, PRINT) are permitted under each IF3 consumer availability state. **Fail-closed if unbound** — missing source binding blocks all authoritative export regardless of solver success.

Aligns with `if3_consumer_contracts.md`, `if3ExportGate.ts`, and DEC-S1-0006 (LIM-P03-001).

---

## Availability states (consumer gate)

Derived by `evaluateIf3ResultGate()` from `FrameAnalysisResultResource` + optional live source document check.

| State | Typical source | Meaning |
|-------|----------------|---------|
| **VALID** | `status: SUCCEEDED` + complete binding + checksum match | Current authoritative result |
| **STALE** | Staleness detector or `status: STALE` | Bound artifacts changed since run |
| **MISSING** | No resource / null `if3Result` | No normalized result available |
| **INVALID** | Validation failure | Shape, numeric, or binding validation failed |
| **UNBOUND** | `MISSING_SOURCE_BINDING` diagnostics | `sourceDocumentId` / version / checksum absent |
| **FAILED** | `status: FAILED` | Solver or run failure |
| **PARTIAL** | `status: PARTIAL` | Incomplete payload with known omissions |
| **UNSUPPORTED** | Schema/kind/version mismatch | Build cannot consume resource |
| **RUNNING** / **PENDING** | In-flight run | Run not complete |

**Note:** `UNBOUND` is a planning label for the binding-gap subset of **INVALID** / gate-blocked states when `MISSING_SOURCE_BINDING` is present. Repo gate uses `INVALID` or blocked `authoritativeOutputAllowed`; this matrix lists **UNBOUND** explicitly per Step 1 charter.

---

## Export authority matrix

`authoritativeOutputAllowed` is the single boolean gate. Below: **ALLOW** = authoritative export permitted; **BLOCK** = fail-closed; **DIAG** = diagnostics / non-authoritative preview only.

| Consumer state | JSON (`result.json`) | CSV (displacements/reactions/forces) | PDF report | PRINT catalog |
|----------------|----------------------|--------------------------------------|------------|---------------|
| **VALID** | ALLOW | ALLOW | ALLOW | ALLOW (when catalog ready) |
| **STALE** | BLOCK | BLOCK | BLOCK | BLOCK |
| **MISSING** | BLOCK | BLOCK | BLOCK | BLOCK |
| **INVALID** | BLOCK | BLOCK | BLOCK | BLOCK |
| **UNBOUND** | BLOCK | BLOCK | BLOCK | BLOCK |
| **FAILED** | BLOCK | BLOCK | BLOCK | BLOCK |
| **PARTIAL** | DIAG | DIAG | DIAG | BLOCK |
| **UNSUPPORTED** | BLOCK | BLOCK | BLOCK | BLOCK |
| **RUNNING** | BLOCK | BLOCK | BLOCK | BLOCK |
| **PENDING** | BLOCK | BLOCK | BLOCK | BLOCK |

### Fail-closed if unbound

When `if3` metadata is absent on `runAnalysis` (LIM-P03-001 default path):

- Normalizer sets `MISSING_SOURCE_BINDING` in `diagnostics`.
- Consumer state resolves to blocked (`INVALID` / unbound).
- **All authoritative exports BLOCK** even if raw `AnalysisResult` exists in memory.
- Legacy raw download paths must remain non-authoritative or guarded (`isRawOnlyAppExportState`).

**Rule:** PRINT does not independently bypass IF3 gates (`if3_consumer_contracts.md` PRINT boundary).

---

## Export channel definitions

| Channel | Implementation (OSS) | Authoritative artifact |
|---------|---------------------|------------------------|
| **JSON** | `if3ExportGate.ts` → `result.json` | `FrameAnalysisResultResource` envelope |
| **CSV** | `resultCsvExport.ts`, `memberForceReport.ts` | Tabular extracts from validated payload |
| **PDF** | `resultPdfReport.ts` | Report DTO from validated resource |
| **PRINT** | `if3PrintCatalog.ts`, `if3PrintDto.ts` | Physical layout only; eligibility from IF3 gate |

Raw `AnalysisResult` JSON download without IF3 normalization is **non-authoritative** compatibility only.

---

## Apollo consumption (read path)

Apollo Superstructure consumes results **read-only** via `AnalysisBinding.resultResourceRef`. Same gate semantics apply when Apollo triggers re-export to downstream shells:

| State | Apollo may display | Apollo may use in design decisions |
|-------|-------------------|----------------------------------|
| VALID | Yes | Yes (read-only) |
| STALE | Diagnostics + stale overlay | No — refresh required |
| MISSING / UNBOUND | Placeholder | No |
| INVALID / FAILED | Error diagnostics | No |
| PARTIAL | Partial with warnings | Only explicitly supported fields |

---

## Gate evaluation order

```text
1. resource == null?  → MISSING
2. isRawAnalysisResultCandidate?  → INVALID (not normalized)
3. validateFrameAnalysisResultResource()
4. resolveTransientIf3AvailabilityStatus()
5. source document checksum match?  → may downgrade VALID → STALE
6. MISSING_SOURCE_BINDING in diagnostics?  → UNBOUND (authoritative blocked)
7. evaluateIf3PrintCatalog() for PRINT-specific readiness
8. authoritativeOutputAllowed = (state == VALID) && catalog.ready
```

---

## OD8-04 visual release (separate gate)

Semantic IF3 export authority (this matrix) is distinct from **visual release** claims for PRINT/Viewer (LIM-P03-003). OD8-04 remains OPEN — semantic export may be ALLOW when VALID, but final visual parity claims remain blocked.

---

## Implementation prerequisites

| Prerequisite | ID | Effect if missing |
|--------------|-----|-------------------|
| Client `if3` binding on runAnalysis | LIM-P03-001 / BLK-S1-012 | Persistent UNBOUND in default UI |
| BFAD persistence operational | CAP-BFAD store | Cannot pin checksum |
| Target Standard ADOPTED numerics | BLK-S1-001 | Load magnitudes null; export may be scope-blocked |

---

## Related artifacts

| Artifact | Path |
|----------|------|
| IF3 binding design | `if3_binding_design.md` |
| Stale rules | `stale_and_reanalysis_rules.md` |
| Consumer contracts | `../../../road/phase6/if3/if3_consumer_contracts.md` |
| Frontend gate | `frontend/src/exports/if3ExportGate.ts` |
| Result gate | `frontend/src/results/if3ResultGate.ts` |
