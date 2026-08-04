# 05 — Information Priority

**BASE_MAIN_SHA:** `ed14922aa9f1745df1ccd44d58f847d4d1574047`

## Priority layers (highest first)

| Tier | Content | Placement |
|------|---------|-----------|
| T0 | Mode identity (Guided / 一覧) + dirty/save + primary file actions | Header |
| T1 | Compact authorization status (L1 JA) | Header / thin strip under header |
| T2 | Current Guided progress (integrated G navigator) **or** Workflow selected step | Main chrome |
| T3 | Current input work surface / slide primary fields | Inspector pane |
| T4 | 3D Viewer | Viewer pane (desktop primary; mobile tab) |
| T5 | Recommended next action / blocking diagnostics (short) | Near CTA |
| T6 | Non-blocking diagnostics / secondary help | Folded or below fold |
| T7 | TechnicalDetails L3 (codes, tokens, checksums) | Collapsed disclosure |
| T8 | Developer flag matrix | Always last / collapsed |

## Guided Mode first viewport budget

1. Compact header (mode + actions + auth strip)
2. Integrated progress (current G + context)
3. Slide title + “この画面で決めること”
4. Primary fields / focused panel region
5. Viewer (desktop side / mobile tab)
6. Sticky footer: 戻る / 保存して次へ

**Exclude from first viewport:** full WF-01..15 card list; all expert analysis panels; expanded L3.

## Workflow first viewport budget

1. Header + auth strip
2. Progress summary (counts + recommended)
3. Step list (compact rows for all 15)
4. Selected step detail (status, primary CTA, top diagnostics)

**Exclude from first viewport:** 15 fully expanded card bodies; unrelated Unit2 tables unless navigated.

## Separation rules

- **General user:** Japanese L1 status, what to do next, visual 3D confirmation
- **Technical:** diagnosticCode, enum tokens, schema/revision — L3 only
- **Allowlisted IDs:** G01–G15, WF-01–WF-15 may appear as compact IDs in progress chrome
