# 07 — Current UI Problem Mapping

**BASE_MAIN_SHA:** `98ad5be376223be03449da835aec9a60f40e1cd9`  
Maps user requirements 1–8 to current code evidence. Solutions are deferred to P0-B/D.

| # | User problem | Current behavior (evidence) | Likely redesign theme |
|---|--------------|----------------------------|------------------------|
| 1 | Header: mode / status / actions indistinguishable | Six identical `<button>`s in `apollo-unit2-header-actions` (`ApolloPhase1Shell.tsx` ~L2286–2292). Shared CSS `.apollo-unit2-header-actions button` (`styles.css` ~L5783–5794). No active-mode class; no visual grouping. | Role-separated header: mode switcher vs file actions vs exit vs help; save state explicit |
| 2 | Large「非数値入力モード／開発検証版」 | Large provisional banner `apollo-provisional-banner` (~L2296–2300) with strong title「非数値入力モード」. Plus repeated `AuthorizationBanner` (~18 call sites) with L1「開発確認用・未検証」「正式認可なし」. Formal tokens remain NOT_GRANTED / PROHIBITED. | Compact status + fold details; **do not** change formal authorization |
| 3 | 6-step bar duplicates G01–G15 progress | On basics: `STEP_DEFINITIONS` stepbar (`renderStepBar`) **and** Guided progress list G01–G15 **and** WF progress/cards. | Integrate into one visual progress navigator (preserve G## / WF meanings) |
| 4 | Guided「戻る」「保存して次へ」not fixed | `apollo-guided-nav` footer in document flow (`GuidedModeShell.tsx` ~L155–183). CSS has flex only — **no sticky/fixed**. | Sticky action bar at viewport bottom |
| 5 | Right technical summary vs 3D priority | Layout `apollo-unit2-layout` places Viewer in `apollo-unit2-visual-panel`, but left column stacks Guided+WF×15+~12 panels so viewer is easily scrolled away. Technical info is scattered (`TechnicalDetails`, Guided aside), not a dedicated inspector. | 2-pane: input + primary Viewer; tech details collapsed |
| 6 | WF-01..15 full vertical list | `WorkflowControlScreen` maps all `model.steps` to `WorkflowStepCard` in `.apollo-wf-step-list` (single column). Confirmed by unit tests (15 in order). | Master-detail or slideshow; keep WF meanings |
| 7 | desktop / tablet / mobile policy unclear | Apollo media queries only at 1200 / 900 / 800 (`styles.css`). ≤1200 collapses 2-col layout to 1-col. No explicit tablet policy or mobile input/3D tabs. | Define responsive policy (P0-B/D) |
| 8 | Beginner Guided vs expert list/Workflow roles blur | Default guided; on basics, Guided **and** Workflow **and** all expert panels co-mount. List mode drops Guided/WF but keeps full editor. Responsibilities not separated in IA. | Mode responsibility matrix (P0-B) |

## UI change breakage risks (preview)

| Change area | Risks |
|-------------|-------|
| Header regroup | Shell unit tests; JP3 screenshots; button label scan |
| Auth banner compact | E2E auth visibility assertions; catalog tests; many panel mounts |
| Progress merge | Guided unit + JP3C G01–G15 jumps; stepbar tests |
| Sticky footer | Guided nav testids; mobile layout E2E |
| Viewer layout | Shell viewer mock tests; WF-11 navigate; screenshot a11y |
| WF master-detail | Step4A E2E; WorkflowControlScreen unit; a11y badge tests |

## Features that must keep working after UI change

- Save / open / workspace / dirty guard
- Sample load / reapply transaction
- Workflow status derivation (STALE/COMPLETE/…)
- Guided G01–G15 adjacency and detail escape
- Viewer ↔ STL same data source
- Japanese L1 catalog / residual English gate
- Formal authorization NOT_GRANTED / PROHIBITED display truth
