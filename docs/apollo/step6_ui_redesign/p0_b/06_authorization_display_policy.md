# 06 — Authorization Display Policy

**BASE_MAIN_SHA:** `ed14922aa9f1745df1ccd44d58f847d4d1574047`  
**AUTHORIZATION_POLICY:** UNCHANGED (values); presentation may change

## Frozen values

| Token | Value |
|-------|-------|
| `NUMERIC_DESIGN_AUTHORIZATION` | `NOT_GRANTED` |
| `DESIGN_OR_CONSTRUCTION_USE` | `PROHIBITED` |
| `FORMAL_RELEASE_READINESS` | `NO_GO_PENDING_HUMAN_VALIDATION` |

P0 / Step 6 UI must not alter these constants, evaluators, or fail-closed export gates.

## Current problem (from P0-A)

1. Large `apollo-provisional-banner` (“非数値入力モード”) competes with primary work.
2. `AuthorizationBanner` repeated on many panels (~18 files) with full L1 strings.
3. Literal “開発検証版” is not the catalog string; L1 uses「開発確認用・未検証」「正式認可なし」etc.

## Target presentation policy

| Layer | Content | Default |
|-------|---------|---------|
| L1 compact | Short JA status e.g.「開発確認用・未検証 — 正式認可なし — 設計・施工利用禁止」 | Always visible once globally |
| L2 optional | Short remediation / scope note | Optional under L1 if space |
| L3 | Exact tokens (`NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED`, …) | Collapsed `TechnicalDetails` |

## Placement rules

1. **One primary compact status** in Apollo chrome (shell), always available.
2. Panel-level banners may be reduced to a one-line note or omitted if global status is visible **and** E2E auth assertions are updated carefully — prefer keep a compact `AuthorizationBanner` on high-risk export/analysis panels until E2E plan (P0-D) confirms.
3. Do **not** remove L3 availability.
4. Do **not** soften wording to imply authorization was granted.
5. Large provisional banner (`apollo-provisional-banner`) should shrink to compact strip or merge into global status; calculation-unavailable message may move to disclosure or secondary line.

## Verification

- Existing E2E that assert NOT_GRANTED / PROHIBITED / unverified wording must still pass (adjust selectors if DOM moves, not meaning).
- Catalog unit tests for authorization messages remain PASS.
- Residual English L1 scan remains PASS.

## Explicit non-goals

- Changing `featureFlag` semantics that gate numeric execution (beyond display)
- Advancing formal release readiness
- Removing watermarks from formal export HTML where fail-closed requires them (export path untouched)
