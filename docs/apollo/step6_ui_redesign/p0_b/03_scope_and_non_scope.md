# 03 — Scope and Non-Scope

**STEP_ID:** `APOLLO_STEP_6_UI_P0_B`  
**BASE_MAIN_SHA:** `ed14922aa9f1745df1ccd44d58f847d4d1574047`

## In scope (Step 6 UI redesign program — implementation later)

| ID | Item |
|----|------|
| IN-01 | Header IA: mode switcher vs file actions vs help vs exit |
| IN-02 | Explicit save/dirty state in chrome |
| IN-03 | Compact authorization display + disclosure of details |
| IN-04 | Unified Guided progress navigator (integrate 6-step context with G01–G15) |
| IN-05 | Guided sticky footer actions |
| IN-06 | Desktop 2-pane input + primary Viewer |
| IN-07 | Tablet stacked layout policy |
| IN-08 | Mobile input / 3D tabs |
| IN-09 | Workflow master-detail (or slideshow) replacing full vertical expansion |
| IN-10 | Diagnostics priority / fold policy |
| IN-11 | General vs technical information separation (L1/L3) |
| IN-12 | Beginner Guided vs expert list/Workflow responsibility split in mounting/IA |
| IN-13 | Responsive + accessibility policies for the above |
| IN-14 | Test updates required by chrome/DOM changes (implementation steps) |

## Out of scope

| ID | Item |
|----|------|
| OUT-01 | Formal authorization grant / FORMAL_RELEASE_READINESS advancement |
| OUT-02 | WorkflowStateModel / evaluators / selectors / dependencies / capabilityRegistry logic |
| OUT-03 | G01–G15 meaning/order changes; WF-01..15 meaning/order changes |
| OUT-04 | Canonical bridgeStructure generation; visualization solids/builder algorithms |
| OUT-05 | STL / quantity / load / analysis / report numeric or schema changes |
| OUT-06 | Workspace save format / checksum / STALE fingerprint algorithm |
| OUT-07 | Creating a second ProjectModel or Viewer store for Guided or 3D |
| OUT-08 | Step 4-D〜4-H feature implementation |
| OUT-09 | Unrelated Pro/LINER UI redesign |
| OUT-10 | Package / lockfile / build tooling upgrades (unless forced by unrelated main) |
| OUT-11 | This P0-B PR itself implementing any UI |

## Counts

| Metric | Count |
|--------|-------|
| Requirements (UR-*) | 14 |
| In-scope themes (IN-*) | 14 |
| Out-of-scope items (OUT-*) | 11 |

## Open questions (do not block P0-B; resolve in P0-D / UI-1)

1. **OQ-UI-01:** Retire visual 6-step bar entirely, or map as chapter labels over G01–G15?
2. **OQ-UI-02:** Default Workflow home: list mode only, or reachable from Guided via “詳細工程” without full co-mount?
3. **OQ-UI-03:** Global single AuthorizationBanner vs compact shell status + per-panel optional note.
4. **OQ-UI-04:** Tablet breakpoint value (propose 1024px in P0-D).
5. **OQ-UI-05:** Align orphan testid `apollo-model-view-panel` vs `apollo-topology-view` in which UI PR?
