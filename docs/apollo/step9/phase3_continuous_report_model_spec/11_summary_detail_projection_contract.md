# 11 — Summary / Detail Projection Contract

> **Authority:** Phase 3-K (specification freeze)
> **Base:** Phase 2 `04_summary_report_spec.md` (17 summary items), `05_detailed_report_spec.md` (D1-D14 detail layer), `chapter_payload_matrix.csv` (summary_ok/detail_ok columns), Phase 2.5 `06`/`07`.
> **Judge:** Apollo architecture. No implementation.

## 1. Purpose

Define how a **single** `ReportModel` projects into a **summary** view and a **detail** view — same canonical CP-* chapters, same underlying values, no recomputation, no warning/authorization/STALE/PROHIBITED omission in summary.

## 2. Common core (shared by summary & detail)

| element | source | notes |
|---------|--------|-------|
| watermark + warnings | CP-20 (`warnings[]` + 5-line mandatory) | always emitted in both; `reportModel.ts:150-156` |
| authorization | CP-22 (NOT_GRANTED) + value-level NOT_AUTHORIZED | never ADOPTED; same in both |
| STALE | CP-21 flag; per-value `stale` | badge in both; value preserved |
| provenance | CP-25 (id + checksum prefixes in summary; full in detail) | same source |
| chapter identity | CP-* ids (canonical) | same set ordering in both |
| status codes | §06 status code set | identical codes in both |

## 3. Canonical chapter sets

### Summary (the 17 items, Phase 2 `04_summary_report_spec.md` §2)
CP-01, CP-02, CP-03, CP-04, CP-05, CP-06, CP-07, CP-09, CP-10, CP-11, CP-18, CP-19, CP-20, CP-21, CP-22, CP-23, CP-25.

### Summary-excluded (NOT in summary)
CP-08 (FORBIDDEN), CP-13 (NOT_AVAILABLE for CONTINUOUS), CP-14 (placeholder), CP-15 (FORBIDDEN), CP-16 (dev-note), CP-17 (detail-only), CP-24 (detail-only), CP-30..34 (FORBIDDEN).

### Detail (superset)
All emit-able chapters: the 17 summary chapters **plus** CP-13 (when SIMPLE dims complete), CP-14, CP-17, CP-24, CP-25 (full evidence). Plus per-element detail rows (D1-D14).

## 4. Detail projection (D1-D14, Phase 2 `05_detailed_report_spec.md` §2.2)

| No. | detail item | chapter | element | summary? |
|-----|-------------|---------|---------|----------|
| D1 | per-span detail (span id / length / station range) | CP-07 | SpanSummary[] | no (counts only) |
| D2 | per-support detail (id / station / role / fixity) | CP-10 | SupportSummary[] | no |
| D3 | girder lines (id / offset / segment spans) | CP-09 | GirderSummary[] | counts only |
| D4 | cross-member stations (station / girder interval) | CP-11 | CrossMemberSummary | counts only |
| D5 | member composition (stiffener/sway/lateral counts) | CP-17 | SDM entity list | no |
| D6 | alignment reference (alignment/grade/積載) | CP-08 | (future) | FORBIDDEN |
| D7 | persistence (sidecar key list) | CP-21 | importExport manifest | STALE flag only |
| D8 | 3D generation state (solids groups) | CP-18 | solids | count only |
| D9 | STL generation state (triangles/bbox/digest) | CP-18 | STL manifest | count only |
| D10 | validation detail (diagnostics rows) | CP-19 | issues[] | complete flag only |
| D11 | warning detail (warnings[] + STALE/NOT_AVAILABLE) | CP-20 | warnings[] | count only |
| D12 | not-implemented list (CP-08/13/15/16/30-34) | CP-23 | gap list | count only |
| D13 | evidence detail (source_path/checksum/revision/commit) | CP-25 | EvidenceSummary | id+prefix only |
| D14 | code/schema version | CP-03 | schemaVersions | id+version only |

## 5. Projection rules

| rule | summary | detail |
|------|---------|--------|
| R-1 inclusion of 17 chapters | yes | yes (+ CP-13/14/17/24 full) |
| R-2 watermark/warnings | full 5-line | full 5-line |
| R-3 STALE badge | yes (flag) | yes (flag + per-value stale) |
| R-4 authorization | NOT_GRANTED + value NOT_AUTHORIZED | same + DS-09 cells (CP-22) |
| R-5 PROHIBITED items | absent | absent |
| R-6 NOT_AVAILABLE items | placeholder | placeholder |
| R-7 numeric results (CP-3x) | absent | absent (NOT_AVAILABLE) |
| R-8 per-element arrays | counts | full lists |
| R-9 evidence | reportId + checksum prefix | full checksums + dataSources |
| R-10 legacy warning | yes (STALE/LEGACY tag) | yes (+ legacyStatus) |

## 6. Principles (Phase 4 must enforce)

1. **Summary never hides warnings** — full 5-line + CP-20 emitted in summary (Phase 2 §6).
2. **Summary never hides authorization** — NOT_GRANTED + NOT_AUTHORIZED present in summary.
3. **Summary never hides STALE** — STALE flag + badge in summary.
4. **PROHIBITED never rendered** in summary or detail (O-19..O-30 absent; status-only).
5. **No field recomputation** across projections — detail uses the same `value` as summary (counts derived from same arrays, not recomputed).
6. **Identical canonical CP-*** in summary and detail (no CH-* in output).
7. **No HTML/CSS/print layout** in Report Model (rendering is external; Phase 2 §5.1 R-20). Solids-existence count is data; thumbnail rendering is a renderer concern (Phase 2/6), **not** Report Model.
8. **Layout constraints (≤40 rows/page, header repetition, A4 landscape)** are renderer concerns, explicitly **out of Report Model scope** (Phase 2 `04_summary_report_spec.md` §8-10). Phase 4 must not embed page layout.
9. **Consistency** — summary status (STALE/NOT_AUTHORIZED/PROHIBITED/NOT_AVAILABLE) must equal detail status for the same source.

## 7. Phase 4 obligations

- Project summary from the **same** `ReportModel.chapters` (detail subset/superset relation), not two generators.
- CP-25 summary = reportId + resultChecksum prefix; detail = full evidence block.
- CP-18 summary = solids count + STL summary; detail = groups + full STL manifest.
- CP-19 summary = complete flag + count; detail = full `issues[]`.
- CP-23 summary = not-implemented count; detail = full gap list + resolved H-items.

## 8. Status

- Summary/detail projection contract: FROZEN.
- HEAD: aeeac3e (no code change).
