# 01 — English exposure audit (JP1-A)

## Scope

Code-literal audit of Apollo user-facing surfaces on main `c5ca3b33` after Step 5-R.

Sources:

- `frontend/src/apollo/ApolloPhase1Shell.tsx`
- `frontend/src/apollo/components/*`
- `frontend/src/apollo/guided/*`
- `frontend/src/apollo/workflow/*` (status labels + diagnostic codes when shown)

## Method

1. Grep for English authorization banners, status tokens, dual JP/EN labels, Guided primaryFields, aria-labels.
2. Classify each as L1 user-visible vs L3 technical-only.
3. Recommend TRANSLATE_TO_JA / KEEP_TECHNICAL / ALLOWLIST / REVIEW.

DOM screenshots are deferred to JP3 E2E (`jp3_e2e_plan.md`). JP1-A is source-complete for design.

## Headline counts

| Class | Count (inventory rows) |
|-------|------------------------|
| Inventory rows | 100 |
| USER_VISIBLE (user_visible=YES) | 85 |
| TECHNICAL_ONLY (technical_only=YES) | 15 |
| Mixed JA+EN (evidence_class=MIXED_JA_EN) | 29 |
| TRANSLATE_TO_JA | 61 |
| KEEP_TECHNICAL | 19 |
| ALLOWLIST | 13 |
| REVIEW (unresolved) | 7 |

## Top affected screens

1. Bridge structure input panel — authorization banners, designStatus, STALE/GENERATION_CURRENT
2. Cross-frame attachment panel — IMPLEMENTED/PLANNED, NOT_GRANTED banner
3. Guided Mode shell — G01–G15 IDs, primaryFields English keys, `WF anchor`
4. Pavement / appurtenance / haunch panels — USER_PROVIDED_UNVERIFIED, UNVERIFIED DEVELOPMENT banners
5. Quantity / load / analysis / output panels — English development banners
6. Sample reapply dialog — UNVERIFIED_DEVELOPMENT_ONLY / DEC codes in body
7. Workflow progress / badges — some labels already JA; codes remain EN
8. 3D / STL export — preset keys, “Apollo Visualization Model”
9. Aria labels — `Apollo guided steps`, `provisional-status-banner`
10. Member dual labels — `対傾構 / Sway`, `横桁 / Cross beam`, laterals

## Findings (patterns)

### A. Authorization banners (HIGH)

Repeated English blocks:

- `UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION`
- `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`
- `UNVERIFIED DEVELOPMENT ONLY — HUMAN ENGINEERING REVIEW REQUIRED`

**Action:** L1 Japanese authorization glossary; keep English tokens in L3 technical details.

### B. Generation / STALE (HIGH)

- `GENERATION_CURRENT` / `STALE` / `INPUT_ONLY` shown inline in provenance lines.
- Workflow already maps STALE→「要再生成」 in `STATUS_GROUP_LABELS`, but panels still show raw English.

**Action:** Unify on glossary; never translate STALE as merely「古い」.

### C. Guided Mode (HIGH)

- Slide jump buttons show `G01`…`G15` (allowlist as IDs).
- `primaryFields` often English keys (`crossBeamSpacing`, `upperAttachmentDepthFromGirderTop`).
- `WF anchor: WF-02` English.

**Action:** L1 Japanese field names; keep keys in L3.

### D. Member / topology (MED)

- Dual labels `対傾構 / Sway`, `横桁 / Cross beam`, `上横構 / Upper Lateral` — good JP present, EN tail is noise for general users.
- Cross vs frame confusion risk if only English shown.

**Action:** L1 Japanese-only; English in L3.

### E. Status glossary conflicts (MED)

Current `STATUS_GROUP_LABELS.BLOCKED = "中断"` conflicts with required JP1 wording「先に必要な作業があります」.

`NOT_AUTHORIZED = "未認可"` vs required「正式認可なし」.

**Action:** JP1-B must ADOPT corrected labels (do not change code in JP1).

### F. Safe English allowlist

Apollo, STL, CSV, JSON, DXF, SVG, ID, URL, SI units (m, mm, kN), schemaVersion, G01–G15, WF-xx, DEC-S5-xxxx (technical), Three.js (dev-only).

## Deliverables

- `ui_text_inventory.csv`
- `screen_inventory.csv`
- `technical_only_allowlist.csv`
- `unresolved_terms.csv`

## Verdict (JP1-A)

`JP1_A_ENGLISH_EXPOSURE_AUDIT: PASS` (design inventory complete; no application code changed).
