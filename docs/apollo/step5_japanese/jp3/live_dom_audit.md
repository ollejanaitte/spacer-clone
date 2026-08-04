# JP3-A Live DOM residual English audit

**Date:** 2026-08-04  
**Start main SHA:** `1e391d2c675e2f3a75b10d80f9150c6fde0dd051`  
**Scanner:** `frontend/tests/e2e/apollo-step5-jp3a-live-dom-audit.spec.ts`  
**Verdict:** `LIVE_DOM_SCAN_VERDICT: PASS` (inventory produced; residual fixes deferred to JP3-B)

## Method

1. Playwright opens Apollo entry → 新規作成 → sample apply → Guided G01/G05/G09/G12/G15 → reapply dialog → mobile 390×844.
2. Collects visible `innerText` from buttons/links/labels/legends/options/headings/status/alerts/`data-testid` nodes.
3. Collects `aria-label`, `title`, `placeholder`, `aria-description`.
4. Collects dialog content (visible/hidden).
5. Classifies Latin tokens against exact allowlist; marks nodes inside `TechnicalDetails` / `pre` / `code` / closed `<details>` as L3.
6. Screenshots each surface under `evidence/jp3a/`.

## Coverage

| Screen | Scanned | Notes |
|--------|---------|-------|
| Apollo entry / basics empty | YES | start → 新規作成 |
| Sample applied basics | YES | WF-02 COMPLETE |
| Guided G01, G05, G09, G12, G15 | YES | jump buttons |
| Technical details expanded | YES | first toggle |
| Sample reapply dialog | YES | pavement edit → reapply |
| Mobile basics | YES | 390×844 |
| Workflow strip | YES | collected as part of basics |
| Quantity / load / analysis / output chrome | YES | present on basics shell after sample |
| Viewer chrome | PARTIAL | labels via shell; WebGL canvas glyphs not OCR'd |
| Toast | PARTIAL | no toast fired in this harvest path |

## Counts (raw harvest)

| Metric | Value |
|--------|------:|
| Total classified Latin hits (incl. nested parents) | 2593 |
| L1 residual (raw harvest, nested) | 2476 |
| L3 technical-context hits | 117 |
| Deduped short unique L1 candidates (`residual_english_unique.csv`) | 256 |
| Attribute scan rows | 182 |

Nested parent nodes inflate L1 counts (same English appears in shell + child). **JP3-B prioritizes unique leaf texts.**

## Primary L1 fix themes for JP3-B

| Theme | Examples | Action |
|-------|----------|--------|
| Chrome verbs | `Undo` / `Redo` | Catalog + JA buttons |
| Shell kicker | `Apollo Phase 1-NN` | JA product subtitle; keep Apollo |
| Date locale | `Wednesday, July 29, 2026` | `ja-JP` date format |
| Default draft text | `Non-numeric Apollo workspace draft.` | Japanese default description |
| Missing catalog | `表示文言未登録` next to status groups | Wire missing status/group keys |
| Workflow group | visible `geometry` / `loads` | JA group labels via catalog |
| Workflow criteria | `valid`, `current`, `generatedAt`, `presence`, `PROVIDED` | JA criterion strings; enums → L3 |
| Diagnostics mix | `STUB`, `local CRS`, `binding`, `Step 4-D/E` | JA message; technical tokens → L3 |
| Appurtenance chrome | `type=CURB / side=LEFT`, `[info]` | JA labels; type/side → L3 or JA |
| Status strips | `INCOMPLETE/BLOCKED`, `NOT_AUTHORIZED`, `PENDING` | `getStatusLabel` / auth catalog |
| Analysis buttons | `Run GOLD-AN-001 (UDL)` | JA verb + allowlisted case id in L3/paren |
| Output chrome | `audit`, `preview`, `BUNDLE_EXPORT: STALE`, `NO SHEETS — BLOCKED…` | JA + status API; codes → L3 |
| GA provenance | `stale: true / checksum:` | Collapse to TechnicalDetails |
| Haunch aria | `主桁 girder-0 のハンチ有無` | Use 主桁1…; ids → L3 |
| Guided L3 affordance | `技術情報を表示（WF ID）` | JA only in L1 summary text |

## Explicit non-goals (this package)

- No application localization fixes (JP3-B)
- No schema / enum / checksum / formal authorization changes
- No Step 4-D–H implementation
- Viewer canvas OCR not performed (chrome/DOM only)

## Allowlist policy

Exact tokens only — see `allowlist_final.csv`. No regex wildcards for user-facing escape hatches.

## Screenshots

See `screenshot_index.md`.
