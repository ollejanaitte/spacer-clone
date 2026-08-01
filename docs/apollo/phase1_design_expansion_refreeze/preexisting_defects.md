# Apollo Phase 1 Refreeze — Pre-existing Defects Register

**Status:** ACTIVE  
**Last updated:** 2026-08-01 19:47 JST  
**Investigation branch:** `docs/apollo-refreeze-local-verification`  
**Code baseline:** `origin/main` at `f0983878ccbb816f591214b6242c3688ecb5a060`

This register records application-test failures observed during local refreeze verification
that predate the verification branch and are unrelated to docs-only PRs #239 / #240.
Fixes belong on a separate implementation branch; this doc-only verification branch records
findings only.

---

## PD-001 — Apollo frontend suite-discoverability manifest stale

| Field | Value |
|-------|-------|
| **Defect ID** | PD-001 |
| **Classification** | `SEPARATE_DEFECT_REQUIRED` |
| **Failure class** | `PRE_EXISTING` |
| **Root-cause type** | Manifest update omission (not code regression; not intentional behavior drift) |
| **Stale manifest** | `EXPECTED_APOLLO_TEST_MODULES` in `frontend/src/apollo/__tests__/apolloSuite.test.ts` |
| **Failing test** | `apollo AP-00 test suite discoverability` → `includes every expected AP-00 test module under __tests__` |
| **LV-04 mapping** | LV-04 bundle 1 (Apollo frontend vitest) — `LV-04-B01-APOLLO-FE` |
| **Blocks refreeze readiness** | **YES** for full LV-04 Apollo frontend PASS and overall refreeze local-verification completion; **NO** for docs-only refreeze deliverables (#239) or unrelated LV bundles already PASS |

### Counts

| Metric | Value |
|--------|------:|
| Expected modules (manifest) | 26 |
| Discovered modules (filesystem) | 27 |
| Delta | +1 on disk, not in manifest |

### Drift detail

| Category | Items |
|----------|-------|
| **Missing from manifest** | `apolloStlExport.test.ts` |
| **Extra in manifest (file absent)** | *(none)* |

The discoverability test compares `readdirSync(__tests__)` against the hard-coded
`EXPECTED_APOLLO_TEST_MODULES` array. Vitest reports the received array contains
`apolloStlExport.test.ts` immediately before `apolloSuite.test.ts` (alphabetical order).

### Functional impact

- `apolloStlExport.test.ts` itself **passes** in isolation (11/11 tests, exit 0).
- All other Apollo frontend tests in the LV-04 bundle 1 run **pass** (187/188 total in bundle 1).
- Only the manifest parity assertion fails. STL export implementation and its tests are healthy;
  the AP-00 discoverability gate was not updated when the new test module landed.

### Origin / drift window

| Commit | Date (JST) | Change |
|--------|------------|--------|
| `f89fe11` | 2026-07-31 08:40:18 | `feat(apollo): add binary stl export and manifest (#225)` — **added** `apolloStlExport.test.ts` (192 lines); **did not** update `EXPECTED_APOLLO_TEST_MODULES` in `apolloSuite.test.ts` |
| `1fbcb3ea` | 2026-08-01 17:24:59 | Design-freeze baseline commit (after #225; defect already present) |
| `c58d49a` | 2026-08-01 18:15:51 | Docs-only PR #239 — no `frontend/` changes |
| `f0983878` | 2026-08-01 19:07:02 | Docs-only PR #240 — no `frontend/` changes |

`f89fe11` is an ancestor of `origin/main` and of documented design-freeze baseline
`1fbcb3ea804f965b8f262284573f4f4d42dc2411`. Drift introduced in a single commit when
STL export tests were added without updating the suite manifest established by
`15017f8` (`test(apollo): establish AP-00 validation and merge gates (#204)`).

### Relation to docs-only PRs #239 / #240

**Unrelated.** Both PRs touch only `docs/apollo/phase1_design_expansion_refreeze/` and
`final_report.txt`. `git diff origin/main -- frontend/` is empty on the verification branch.
The failure reproduces on `origin/main` and predates the refreeze documentation work.

### Classification rationale

| Question | Determination |
|----------|---------------|
| Code regression? | **No** — STL export code and `apolloStlExport.test.ts` pass; no functional breakage |
| Manifest update omission? | **Yes** — new test file added; `EXPECTED_APOLLO_TEST_MODULES` not amended |
| Intentional behavior drift? | **No** — AP-00 discoverability gate intent is explicit manifest parity; omission is accidental |
| Test-only fix sufficient? | **Yes** — add `"apolloStlExport.test.ts"` to `EXPECTED_APOLLO_TEST_MODULES` (sorted between `apolloSourceHygiene.test.ts` and `apolloSuite.test.ts`); expected count becomes 27 |
| `SEPARATE_DEFECT_REQUIRED`? | **Yes** — fix requires application-code edit on an implementation branch; out of scope for doc-only verification |
| Blocks refreeze readiness? | **Yes (partial)** — LV-04-B01 cannot be marked PASS until reconciled; does not invalidate PASS results for viewer, IF3, backend, static checks, or Phase C |

### Recommended fix (implementation branch — not applied here)

```text
# frontend/src/apollo/__tests__/apolloSuite.test.ts
# Insert into EXPECTED_APOLLO_TEST_MODULES (alphabetical):
  "apolloStlExport.test.ts",
```

Verify:

```bash
cd frontend && npm run test -- src/apollo/__tests__/apolloSuite.test.ts
cd frontend && npm run test -- src/apollo src/App.apolloNavigation.test.tsx
```

### Evidence (2026-08-01 19:47 JST)

```text
# Targeted manifest test — FAIL
cd frontend && npm run test -- src/apollo/__tests__/apolloSuite.test.ts
# Test Files  1 failed (1); Tests  1 failed | 1 passed (2); exit 1
# Assertion: received array includes apolloStlExport.test.ts not in expected list

# STL export tests — PASS
cd frontend && npm run test -- src/apollo/__tests__/apolloStlExport.test.ts
# Test Files  1 passed (1); Tests  11 passed (11); exit 0

# Filesystem inventory
ls frontend/src/apollo/__tests__/*.test.ts* | wc -l
# 27

# No frontend diff on verification branch vs origin/main
git diff origin/main -- frontend/
# (empty)
```

### LV-04 bundle 1 status

**FAIL** — unchanged. Do not mark PASS until PD-001 is resolved on an implementation branch
and bundle 1 is re-run.
