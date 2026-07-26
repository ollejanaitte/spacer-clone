# Terminology and Status Rules

**Authority:** DESIGN PLANNING / STEP 1

## Core distinctions

| Term | Means | Does NOT mean |
|------|-------|---------------|
| **READY** (package) | Gap-analysis candidate subset (69 rows) | Implemented, tested, or authorized for production |
| **implemented** | Code/schema exists in repo | READY or authorized |
| **authorized** | Supervisor explicit go-ahead | Automatic from READY or Step 1 COMPLETE |

## Handoff acceptance verdicts (Step 1 P02)

| Verdict | Use when |
|---------|----------|
| `ACCEPT` | Package suitable as Step 1 input frame without material actions |
| `ACCEPT_WITH_ACTIONS` | Usable with documented follow-up actions (non-blocking) |
| `REJECT` | Unsuitable; Step 1 may proceed to NOGO at P09 |

## Step 1 completion verdicts (P09)

| Verdict | Meaning |
|---------|---------|
| `COMPLETE` | All gates passed; artifacts in place |
| `COMPLETE_WITH_BLOCKERS` | Complete with documented, supervisor-approved deferrals |
| `NOGO` | Step 1 cannot conclude satisfactorily (e.g. REJECT handoff) |

## Item disposition statuses

| Status | Meaning |
|--------|---------|
| `OPEN` | Unresolved; needs work or external input |
| `BLOCKER` | Prevents downstream progress until resolved |
| `UNKNOWN` | Insufficient evidence; not yet classifiable |
| `DECISION_REQUIRED` | Human/supervisor decision needed |
| `INFERENCE` | Conclusion drawn without direct source; must cite reasoning |

## Package DRAFT vs PASSED/ACCEPTED wording

The handoff `PACKAGE_INFO.md` currently states:

```text
Status: DRAFT (Composer 2.5 — Grok 検収前)
```

**Step 1 interpretation rules (do not rewrite package):**

1. **DRAFT** in package metadata = packaging/review lifecycle label at handoff build time, **not** Step 1 rejection by itself.
2. Step 1 **acceptance** is determined in P02 using `ACCEPT` / `ACCEPT_WITH_ACTIONS` / `REJECT` — independent of the word DRAFT in package headers.
3. Package frozen verdicts (e.g. `APOLLO_RESEARCH_SCOPE_VERDICT: COMPLETE`, `APOLLO_READY_SUBSET_TO_OSS_GAP_ANALYSIS_VERDICT: READY`, `APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY`) are **historical research inputs**; Step 1 re-validates meaning in context but does not edit source files.
4. If package says PASSED/ACCEPTED in future revisions, same rule applies: Step 1 acceptance is recorded only in Step 1 artifacts under `docs/apollo/step1/`.

## Feature catalog statuses (reference)

From handoff package buckets (frozen reference):

| Bucket | Count (reference) |
|--------|------------------:|
| Stage 4 features | 281 |
| READY | 69 |
| OPEN | 32 |
| JIS SOURCE GAP | 34 |
| APOLLO RETURN remaining | 4 |
| UNKNOWN | 15 |

Counts are verified at intake; discrepancies trigger `DECISION_REQUIRED`.
