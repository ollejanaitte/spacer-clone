# E2E report (Step 5-R R4)

Playwright: `frontend/tests/e2e/apollo-step5r-residual.spec.ts`

| ID | Case | Expected |
|----|------|----------|
| E2E-S5R-001 | Reapply cancel | Edited values preserved |
| E2E-S5R-002 | Reapply replace | Sample values + CURRENT |
| E2E-S5R-003 | Create new | Sample on new project path |
| E2E-S5R-004 | A11y Cancel/Esc | Initial focus Cancel; Esc closes |
| E2E-S5R-005 | True L cues | STL enabled; UNVERIFIED |
| E2E-S5R-006 | Attachment panel | V pattern + depths |
| E2E-S5R-007 | G09 | Attachment fields listed |
| E2E-S5R-008 | STALE | Depth edit → STALE → regenerate CURRENT |
| E2E-S5R-009 | Separation | 横桁 / 対傾構 in SDM summary |
| E2E-S5R-010 | Persistence | Workspace save |
| E2E-S5R-011 | Mobile/a11y | Dialog role + G09 |
| E2E-S5R-012 | Authorization | NOT_GRANTED / PROHIBITED |
| E2E-S5R-013 | Regression | Guided G15 pending; soft console |

Evidence screenshots: `evidence/{reapply,l-section,cross-frame,stale,mobile}/`
Unit evidence harvest: `step5r4EvidenceHarvest.test.ts`
