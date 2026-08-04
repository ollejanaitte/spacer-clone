# Apollo Step 5-JP3 — Live UI Japanese closeout

Live DOM / attribute / screenshot audit and residual L1 English elimination.

| Package | Branch | Purpose |
|---------|--------|---------|
| JP3-A | `test/apollo-step5-jp3a-live-dom-audit` | Live DOM residual English audit |
| JP3-B | `fix/apollo-step5-jp3b-residual-localization` | Fix L1 residuals only |
| JP3-C | `test/apollo-step5-jp3c-full-gui-e2e` | Full GUI/E2E + mobile/a11y |
| JP3-D | `docs/apollo-step5-jp3-report-finalize` | Closeout + seal |

## Artifacts (JP3-A)

| File | Description |
|------|-------------|
| `live_dom_audit.md` | Audit narrative + classification |
| `residual_english_inventory.csv` | Full Playwright harvest (nested + leaf) |
| `residual_english_unique.csv` | Deduped short L1 candidates for JP3-B |
| `allowlist_final.csv` | Exact allowlist (no wildcards) |
| `screen_scan_matrix.csv` | Per-screen scan coverage |
| `attribute_scan.csv` | aria/title/placeholder hits |
| `screenshot_index.md` | Screenshot refs |
| `evidence/jp3a/*` | Screenshots + `scan_summary.json` |

## Scanner

`frontend/tests/e2e/apollo-step5-jp3a-live-dom-audit.spec.ts`

```bash
cd frontend && npx playwright test tests/e2e/apollo-step5-jp3a-live-dom-audit.spec.ts
```

## Rules

- L1 general UI: raw English = 0 (JP3-B target)
- L3 technical English: collapsed `TechnicalDetails` + exact allowlist only
- No wildcard allowlist
- Schema / enum / diagnostic codes / formal authorization unchanged
