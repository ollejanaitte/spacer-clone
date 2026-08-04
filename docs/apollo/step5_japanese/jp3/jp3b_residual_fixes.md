# JP3-B residual localization

**Base:** JP3-A merge `9e2ce45be7781a94a988e5a99fa68155a02ec3b8`  
**Before (JP3-A unique leaf L1):** 256  
**After (JP3-B unique leaf L1):** 0  

## Approach

- Extended centralized catalogs (`STATUS`, `DIAGNOSTIC`, `BUTTON`, `WORKFLOW_GROUP`)
- Wired `get*Label` / `TechnicalDetails` for enums, provenance, case IDs
- Japanized workflow criteria, diagnostics, panel chrome, viewer chrome
- Exact allowlist only (units, brand, opaque IDs, chapter/case codes)

## Major fix themes

| Theme | Examples |
|-------|----------|
| Chrome | Undo/Redo → 元に戻す/やり直す; kicker; default draft name |
| Workflow | group labels; completion criteria; diagnostic L1 catalog |
| Status | badges, quantity/unit-weight, load status via `getStatusLabel` |
| Inputs | appurtenance/haunch aria & legends; CRS warnings |
| Outputs | analysis/quantity/report/GA/output buttons & provenance → JA + L3 |
| Viewer | GPU/WebGL/立体/aria viewport |
| Auth wording | formal OK/NG → 正式な合否判定; NOT_GRANTED unchanged |

## Tests

- Apollo Vitest: 469/469 PASS
- Live DOM audit Playwright: PASS (`leaf_unique_l1=0`)
- typecheck: PASS (run in package)

## Non-goals

- Schema / enum / checksum / formal authorization unchanged
- Step 4-D–H not started
