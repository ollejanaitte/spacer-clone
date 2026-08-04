# 03 — UI text architecture (JP1-C)

## Goal

Centralized, typed Japanese UI catalog for Apollo. No ad-hoc string translation in components.

## Invariants

- Internal enum / schema / diagnostic codes remain English
- Japanese is the default locale for L1/L2
- L3 technical details retain English tokens
- No network required for labels (offline catalog)
- Future locale extension possible (`locale` parameter; default `ja`)

## Candidate API (JP2)

```ts
getStatusLabel(status: WorkflowStatus): string
getMemberLabel(memberType: MemberType): string
getWorkflowStepLabel(stepId: WorkflowStepId): string
getButtonLabel(action: ButtonActionId): string
getDiagnosticMessage(code: string, params?: Record<string, unknown>): DiagnosticView
getAuthorizationMessage(key: AuthorizationMessageId): AuthorizationView
getTechnicalLabel(key: string): string // L3 only
getFieldLabel(fieldId: string): string
```

`DiagnosticView` / `AuthorizationView` shape:

```ts
{ l1: string; l2?: string; technical?: { enum?: string; code?: string; path?: string } }
```

## Catalog sources (design)

| Catalog CSV | Feeds |
|-------------|-------|
| status_message_catalog.csv | getStatusLabel / getDiagnosticMessage |
| button_label_catalog.csv | getButtonLabel |
| field_label_catalog.csv | getFieldLabel |
| warning_error_catalog.csv | warnings/errors |
| authorization_message_catalog.csv | banners |
| screen_translation_matrix.csv | JP2/JP3 coverage matrix |
| apollo_japanese_glossary.csv | term authority |

## Missing key / fallback

1. Prefer glossary `primary_ja` by `internal_key`
2. Else show Japanese generic:「表示文言未登録」+ collapse technical key in L3
3. Never invent free-form English in L1
4. Never silently show raw English enum in L1 (except allowlist)
5. Log missing key in development diagnostics only

## Message order

1. 状態 (L1)
2. 理由 (L2)
3. 次に行う操作 (L2)
4. 技術情報 (L3 collapsed)

## Anti-patterns

- Inline `status === "STALE" ? "古い" : …` in components
- Dual `対傾構 / Sway` in L1 (Sway → L3)
- Authorization English block as first visible paragraph
