# Step 5 Final Audit C — GUI / Playwright Report

Date: 2026-08-04  
App: live Apollo on `http://127.0.0.1:4173` + backend `8000` (`/health` ok)  
Spec: `frontend/tests/e2e/apollo-step5-final-gui.spec.ts`

## Result

| Case | Verdict |
|------|---------|
| E2E-S5-FINAL-001 Complete sample | PASS |
| E2E-S5-FINAL-002 Guided Mode G01–G15 | PASS |
| E2E-S5-FINAL-003/004 Pavement + markings | PASS |
| E2E-S5-FINAL-005/006 Appurtenance + haunch | PASS |
| E2E-S5-FINAL-007/008 Bracing + L-angle UI | PASS (IMPLEMENTATION_CONFIRMED labels; geometry via evidence harvest) |
| E2E-S5-FINAL-009 STALE + regenerate | PASS |
| E2E-S5-FINAL-010 Workspace save + serialize | PASS |
| E2E-S5-FINAL-011 Reapply / clear / reapply | PASS |
| E2E-S5-FINAL-012 Mobile / keyboard | PASS |
| E2E-S5-FINAL-013 Authorization copy | PASS |
| E2E-S5-FINAL-014 Console regression | PASS (0 serious errors) |

Playwright: **11 passed**

## 3D judgment classes

| Topic | Class |
|-------|-------|
| Sample → 3D pipeline | IMPLEMENTATION_CONFIRMED |
| Pavement / markings visibility path | IMPLEMENTATION_CONFIRMED |
| Appurtenance / haunch presence | IMPLEMENTATION_CONFIRMED |
| Dual JP/EN bracing labels | VISUALLY_CONFIRMED (UI text) |
| 対傾構 position vs user concern | USER_CONCERN_PARTIAL — labels only; topology unchanged (ER-001) |
| L-angle not cylinder | IMPLEMENTATION_CONFIRMED (sectionType=1 two-plate) |
| Engineering correctness | ENGINEERING_CORRECTNESS_NOT_AUTHORIZED |

## Evidence

Under `docs/apollo/step5_implementation/final_audit/evidence/`:
- PNG folders: sample, guided, pavement, markings, appurtenance, haunch, bracing, angle, stale, mobile
- `scene-entity-inventory.json`, `stl-summary.json`, `quantity-summary.json`, `load-summary.json`, `analysis-summary.json`, `serialized-project.json`
- `console-report.txt`, `playwright-results.json`

## Audit D decision

No blocking application defect requiring corrective PR:
- Missing re-apply confirm modal (DEC-S5-0002) remains a known UX limitation, not a data-loss bug in observed clear/reapply path
- Topology / L-angle formal adoption require human gates (ER-001/002), not inventable code fixes
