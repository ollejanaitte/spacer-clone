# Apollo Phase 1 設計機能拡張 再凍結 — ローカル検証レポート

**Status:** STOPPED — LV-01 re-run 2026-08-01 19:32:32 JST: FAIL (local `main` behind `origin/main`; verification branch not descendant of current `origin/main`)
**Target branch:** `docs/apollo-refreeze-local-verification`

Active verification proceeds on branch `docs/apollo-refreeze-local-verification`
(HEAD `ef93b735c23dc3b88d473a07a9440824b8e7a198` at LV-01 re-run)
bootstrapped from integrated `origin/main` SHA `86e81d35ba36c1ddeb774286676d62a8f03e9085`
(at branch bootstrap; frozen snapshot). `origin/main` is `f0983878ccbb816f591214b6242c3688ecb5a060`
(LV-01 re-run baseline). Prior Phase 2–4 results below are preserved unchanged.

## Re-baseline (safe resume)

| Field | Value |
|-------|-------|
| Re-baseline timestamp | 2026-08-01 19:24:00 JST |
| LV-01 re-run timestamp | 2026-08-01 19:32:32 JST |
| Branch | `docs/apollo-refreeze-local-verification` |
| HEAD at LV-01 re-run | `ef93b735c23dc3b88d473a07a9440824b8e7a198` |
| Local `main` at LV-01 re-run | `86e81d35ba36c1ddeb774286676d62a8f03e9085` |
| `origin/main` at prior LV-01 | `86e81d35ba36c1ddeb774286676d62a8f03e9085` |
| `origin/main` current (LV-01 baseline) | `f0983878ccbb816f591214b6242c3688ecb5a060` |
| LV-01 status | FAIL — local `main` ≠ `origin/main`; `git merge-base HEAD origin/main` is `86e81d35…`, not current `origin/main` |
| Action | Sync local `main` to `origin/main` and reconcile branch ancestry before further verification |

## Baseline

| Field | Value |
|-------|-------|
| Execution timestamp (Phase 1) | 2026-08-01 18:40:14 JST |
| Execution timestamp (Phase 2) | 2026-08-01 18:42:00 JST |
| Execution timestamp (Phase 3) | 2026-08-01 18:43:26 JST |
| Execution timestamp (Phase 4 bundle 1) | 2026-08-01 18:51:14 JST |
| Execution timestamp (Phase 4 bundle 2) | 2026-08-01 18:52:38 JST |
| Execution timestamp (Phase 4 bundle 3) | 2026-08-01 18:56:31 JST |
| Execution timestamp (Phase 4 bundle 4) | 2026-08-01 18:57:44 JST |
| Execution timestamp (Phase 4 static check bundle 1) | 2026-08-01 18:59:09 JST |
| Execution timestamp (Phase 4 static check bundle 2) | 2026-08-01 19:00:33 JST |
| Execution timestamp (Phase 4 static check bundle 3) | 2026-08-01 19:01:41 JST |
| OS | Zorin OS 17.3 (jammy; Ubuntu-based) |
| Working path | `/home/masaharu/Projects/spacer-clone` |
| Remote | `origin` → `https://github.com/ollejanaitte/spacer-clone.git` |
| Branch | `docs/apollo-refreeze-local-verification` |
| HEAD SHA (Phase 3 start; frozen snapshot) | `18cfdcd87b034c1a5bec2ea64a40398408ad4470` |
| Origin branch SHA (Phase 3 start; frozen snapshot) | `18cfdcd87b034c1a5bec2ea64a40398408ad4470` |
| Origin/main SHA (at prior LV-01) | `86e81d35ba36c1ddeb774286676d62a8f03e9085` |
| Origin/main SHA (current; re-baseline) | `f0983878ccbb816f591214b6242c3688ecb5a060` |
| Design freeze baseline (documented) | `1fbcb3ea804f965b8f262284573f4f4d42dc2411` |

### Tool versions

| Tool | Version |
|------|---------|
| git | 2.34.1 |
| node | v24.5.0 |
| npm | 10.9.8 |
| gh | 2.4.0+dfsg1 |
| python3 | 3.10.12 |
| pytest | 9.1.1 |
| kernel | Linux 6.8.0-136-generic (x86_64) |

### Recorded discovery commands (Phase 1)

```text
pwd
# /home/masaharu/Projects/spacer-clone

git remote -v
# origin  https://github.com/ollejanaitte/spacer-clone.git (fetch)
# origin  https://github.com/ollejanaitte/spacer-clone.git (push)

git status --short --branch
# ## docs/apollo-refreeze-local-verification...origin/docs/apollo-refreeze-local-verification

git branch --show-current
# docs/apollo-refreeze-local-verification

git rev-parse HEAD
# f147efa3b9ea108320848ccf2bb80f7b5790f7af

git rev-parse origin/main
# 86e81d35ba36c1ddeb774286676d62a8f03e9085

git log --oneline --decorate -10
# f147efa (HEAD -> docs/apollo-refreeze-local-verification, origin/docs/apollo-refreeze-local-verification) docs(apollo): initialize local verification branch
# 86e81d3 (origin/main, origin/HEAD, main) Merge remote-tracking branch 'origin/main' into main
# 9e032b0 (origin/docs/apollo-phase1-design-expansion-refreeze, docs/apollo-phase1-design-expansion-refreeze) docs(apollo): record refreeze verification baseline
# c58d49a Docs/apollo phase1 design expansion refreeze (#239)
# 204f322 docs(apollo): record github scope verification and local handoff
# 1a4f428 docs(apollo): add manual traceability matrix for design expansion
# 091a55e docs(apollo): define phase1 design expansion implementation sequence
# 553fa52 docs(apollo): freeze phase1 design expansion scope and architecture
# 5864c7b docs(apollo): link local verification plan
# e514a33 docs(apollo): record required local verification plan

uname -a
# Linux masaharu-DAIV-NG5500 6.8.0-136-generic #136~22.04.1-Ubuntu SMP PREEMPT_DYNAMIC Fri Jul  3 16:29:11 UTC  x86_64 x86_64 x86_64 GNU/Linux

cat /etc/os-release
# PRETTY_NAME="Zorin OS 17.3"
# VERSION="17.3"
# VERSION_CODENAME=jammy

node --version    # v24.5.0
npm --version     # 10.9.8
python3 --version # Python 3.10.12
pytest --version  # pytest 9.1.1
```

### Repository metadata

| Item | Finding |
|------|---------|
| Root `package.json` | Not present |
| Frontend `package.json` | Present at `frontend/package.json` (version `0.3.0-preview`) |
| GitHub Actions workflows | Not present (no `.github/workflows/` on this branch) |
| Frontend scripts (from `package.json`) | `typecheck`, `lint`, `test`, `test:regression`, `test:all`, `build`, `dev:apollo`, `electron:dev:apollo`, `test:e2e` |

### Test location inventory (metadata only; not executed)

| Area | Location | Notes |
|------|----------|-------|
| Apollo (frontend) | `frontend/src/apollo/__tests__/` | 26 test files (vitest) |
| Apollo (navigation) | `frontend/src/App.apolloNavigation.test.tsx` | vitest |
| Apollo (evidence) | `scripts/apollo/evidence/tests/` | 7 pytest files |
| 3D viewer | `frontend/src/viewer/*.test.ts(x)` | 11+ vitest files (e.g. `Viewer3D.test.tsx`, `threeUtils.apolloVisualization.test.ts`) |
| IF3 (frontend) | `frontend/src/if3/__tests__/`, `frontend/src/results/if3*.test.ts`, `frontend/src/exports/if3*.test.ts`, `frontend/src/draft/if3DraftEligibility.test.ts` | vitest |
| IF3 (backend) | `backend/tests/test_if3_*.py`, `backend/tests/test_reports_if3_gate.py` | pytest |
| Backend (general) | `backend/tests/` | 30+ pytest files |

### Phase 1 environment checks

| Check | Result |
|-------|--------|
| Working tree clean at start | PASS |
| Branch checkout | PASS — `docs/apollo-refreeze-local-verification` |
| HEAD matches origin tracking branch | PASS — `f147efa3b9ea108320848ccf2bb80f7b5790f7af` |
| Required design documents present | PASS — all six files verified |
| Environment/tool discovery recorded | PASS — this section |
| Application tests executed | NOT_STARTED — deferred to LV-04/LV-05 |

### Required documents verified

- `docs/apollo/phase1_design_expansion_refreeze/README.md` — present
- `docs/apollo/phase1_design_expansion_refreeze/scope_and_architecture_freeze.md` — present
- `docs/apollo/phase1_design_expansion_refreeze/implementation_sequence.md` — present
- `docs/apollo/phase1_design_expansion_refreeze/manual_traceability.csv` — present
- `docs/apollo/phase1_design_expansion_refreeze/local_verification_plan.md` — present
- `docs/apollo/phase1_design_expansion_refreeze/github_scope_verification.md` — present

## LV verification results

| ID | Description | Status |
|----|-------------|--------|
| LV-01 | Git sync / worktree | FAIL — re-run 2026-08-01 19:32:32 JST (`main` behind `origin/main`; branch not descendant of current `origin/main`) |
| LV-02 | Existing Apollo document consistency | PASS |
| LV-03 | Implementation inventory | PASS |
| LV-04 | Regression tests | IN_PROGRESS (bundle 4/9 executed) |
| LV-05 | 3D display non-regression | NOT_STARTED |
| LV-06 | Manual traceability review | NOT_STARTED |
| LV-07 | Non-composite deck / anchorage | NOT_STARTED |
| LV-08 | Document quality | PARTIAL — Phase 2 doc/CSV/link checks complete; full LV-08 git checks deferred |

## Phase 2 documentation validation

Scope: README inventory, Markdown links, heading/code-block structure, CSV integrity,
and cross-document consistency checks only. No application tests executed.

### Recorded commands (Phase 2)

```text
# README-listed files vs directory inventory
python3 (glob + README backtick filename extraction)

# Markdown relative links
rg '\[.*\]\([^)]+\)' docs/apollo/phase1_design_expansion_refreeze/

# Backtick file references
python3 (resolve *.md / *.csv paths referenced in markdown)

# Heading structure and fenced-code balance
python3 (per-file h1–h6 skip detection; ``` pair count)

# manual_traceability.csv
python3 csv.reader column-count / duplicate trace_id / AP-DX-00..21 coverage

git diff --check
```

### Phase 2 checks

| Check | Result | Notes |
|-------|--------|-------|
| README 正本 files present | PASS | All four listed files exist |
| Unlisted companion docs | INFO | `README.md`, `github_scope_verification.md`, `local_verification_report.md` exist but are not in README 正本 list (expected) |
| Markdown relative links `[text](path)` | PASS | Zero relative links found; no broken targets |
| Backtick file references | PASS | All resolved paths exist (including `docs/apollo/step1/08_roadmap/implementation_roadmap.md`) |
| Heading structure (h1–h6 skips) | PASS | No skip violations in seven markdown files |
| Fenced code block balance | PASS | Even ``` count in all markdown files |
| CSV column count (9 columns) | FAIL → PASS | Rows MT-140 and MT-150 had 8 columns (missing `planned_module`); corrected |
| CSV duplicate trace_id | PASS | 50 data rows; no duplicates |
| CSV quoting | PASS | Quoted fields parse correctly; no visible anomalies |
| AP-DX-00..21 coverage in CSV | PASS | All 22 module IDs referenced; no duplicates per row; no gaps |
| Baseline SHA consistency | PASS | All refreeze docs use `1fbcb3ea804f965b8f262284573f4f4d42dc2411` |
| Branch name references | PASS | `docs/apollo-phase1-design-expansion-refreeze` in design/handoff docs; `docs/apollo-refreeze-local-verification` in verification report — distinct roles, not contradictory |
| Date consistency | PASS | 2026-08-01 across README, scope, implementation, github_scope |
| Absolute local paths | INFO | `/home/masaharu/Projects/spacer-clone` appears in handoff sections (`implementation_sequence.md`, `github_scope_verification.md`, this report) — intentional local-verification context |
| Local-only dependencies | PASS | No undocumented local-only tool paths beyond recorded environment |
| Application tests | NOT_STARTED | Out of Phase 2 scope |

### Phase 2 fixes applied

- `manual_traceability.csv`: restored missing `planned_module` column on MT-140 and MT-150 (values mirror `phase1_target`; `REFERENCE_ONLY` moved to `status` column).

### Phase 2 verdict

`PHASE2_DOC_VALIDATION_VERDICT: PASS` (after CSV column correction).

## Phase 3 test-command discovery

Scope: inspect repository scripts, configs, and test file layout only. No application
tests executed in this phase. Commands below are planned for LV-04/LV-05 execution;
none were run to produce PASS/FAIL counts here.

### Configuration inventory

| Item | Finding |
|------|---------|
| Root `package.json` | Not present |
| Frontend `package.json` | `frontend/package.json` — scripts: `typecheck`, `lint`, `test`, `test:regression`, `test:all`, `test:e2e`, `build`, `dev:apollo`, `electron:dev:apollo`, `app:dev:apollo`, `contracts:schema:generate`, `electron:test`, `test:parity-cli` |
| Vitest default config | `frontend/vitest.config.ts` — excludes `tests/e2e/**`, `regression.golden.test.ts` |
| Vitest regression config | `frontend/vitest.regression.config.ts` — includes only `regression.golden.test.ts` |
| Playwright default config | `frontend/playwright.config.ts` — `testDir: ./tests/e2e`, starts backend + Vite dev server |
| Playwright phase configs | `frontend/playwright.phase5-step3.config.ts`, `frontend/playwright.phase5-japanese.config.ts` |
| pytest project config | Not present (`pytest.ini`, `setup.cfg`, `pyproject.toml` absent) |
| GitHub Actions workflows | Not present (no `.github/workflows/`) |
| Backend test harness | `backend/tests/conftest.py` — loads `schemas/` and `examples/` from repo root |
| README canonical backend test | `python -m pytest backend/tests -q` (repo root) |

### Test file counts (inventory only)

| Area | Path pattern | Count |
|------|--------------|------:|
| Apollo frontend vitest | `frontend/src/apollo/__tests__/*.test.ts(x)` | 27 |
| Apollo navigation vitest | `frontend/src/App.apolloNavigation.test.tsx` | 1 |
| 3D viewer vitest | `frontend/src/viewer/*.test.ts(x)` | 22 |
| IF3 frontend vitest | `frontend/src/if3/__tests__/`, `src/results/if3*.test.ts`, `src/exports/if3*.test.ts`, `src/draft/if3DraftEligibility.test.ts`, `src/api/client.if3.test.ts` | 9 |
| IF3 backend pytest | `backend/tests/test_if3_*.py`, `backend/tests/test_reports_if3_gate.py` | 7 |
| Backend general pytest | `backend/tests/test_*.py` (excl. `conftest.py`) | 37 |
| Apollo evidence pytest | `scripts/apollo/evidence/tests/test_*.py` | 7 |
| Playwright e2e | `frontend/tests/e2e/*.spec.ts` | 16 |
| Schema pytest (backend) | `backend/tests/test_*_schema.py` | 5 |

### Planned commands by area

Working directory is repo root unless noted. Prerequisites for execution (not run in
Phase 3): `cd frontend && npm ci`; Python deps available (`python3` or `.venv/bin/python`
per local setup; Playwright configs reference `.venv/bin/python`).

#### Apollo frontend

| Planned command | Maps to |
|-----------------|---------|
| `cd frontend && npm run test -- src/apollo` | 27 vitest files under `frontend/src/apollo/__tests__/`; default `vitest.config.ts` |
| `cd frontend && npm run test -- src/App.apolloNavigation.test.tsx` | Apollo route/navigation coverage (`App.apolloNavigation.test.tsx`) |
| `node scripts/check_apollo_source_hygiene.mjs frontend/src/apollo` | `scripts/check_apollo_source_hygiene.mjs`; also exercised by `apolloSourceHygiene.test.ts` inside Apollo suite |

#### Main viewer / 3D

| Planned command | Maps to |
|-----------------|---------|
| `cd frontend && npm run test -- src/viewer` | 22 vitest files including `Viewer3D.test.tsx`, `threeUtils.apolloVisualization.test.ts`, `SceneBuilder.apolloVisualization.test.ts` |

#### IF3 frontend

| Planned command | Maps to |
|-----------------|---------|
| `cd frontend && npm run test -- src/if3 src/results/if3 src/exports/if3 src/draft/if3DraftEligibility.test.ts src/api/client.if3.test.ts` | 9 IF3-related vitest modules across `if3/`, `results/`, `exports/`, `draft/`, `api/` |

#### IF3 backend / API

| Planned command | Maps to |
|-----------------|---------|
| `python3 -m pytest backend/tests/test_if3_api.py backend/tests/test_if3_normalizer.py backend/tests/test_if3_persistence.py backend/tests/test_if3_ref_persistence.py backend/tests/test_if3_legacy_compatibility.py backend/tests/test_if3_availability.py backend/tests/test_reports_if3_gate.py -q` | 7 IF3 pytest modules named in inventory |

#### Backend general

| Planned command | Maps to |
|-----------------|---------|
| `python3 -m pytest backend/tests -q` | All 37 `backend/tests/test_*.py` modules; documented in root `README.md` Development section |
| `python3 -m pytest scripts/apollo/evidence/tests -q` | 7 Apollo evidence harness pytest modules (`test_harness.py`, `test_analytical_golden.py`, etc.) |

#### Schema / doc checks

| Planned command | Maps to |
|-----------------|---------|
| `python3 -m pytest backend/tests/test_project_schema.py backend/tests/test_result_schema.py backend/tests/test_bridge_definition_schema.py backend/tests/test_engine_result_schema.py backend/tests/test_time_history_schema.py -q` | Backend JSON Schema validation tests; fixtures via `backend/tests/conftest.py` → `schemas/`, `examples/` |
| `cd frontend && npm run test -- src/contracts/runtime/__tests__/contractJsonSchema.test.ts` | Frontend contract schema parity against `schemas/contracts/v0.1/` |
| `cd frontend && npm run contracts:schema:generate` | `frontend/scripts/generate-contract-schemas.mjs`; generation helper (compare mode is in `contractJsonSchema.test.ts` with `CONTRACTS_GENERATE_SCHEMAS=1`) |
| `git diff --check` | LV-08 whitespace check per `local_verification_plan.md` |
| Phase 2 doc validation scripts (ad-hoc `python3` / `rg`) | Refreeze markdown/CSV checks documented in Phase 2 section — no `package.json` script |

Apollo evidence validators under `scripts/apollo/evidence/validate_*.py` exist but
require bundle/fixture inputs; they are not standalone CI smoke commands.

#### Typecheck

| Planned command | Maps to |
|-----------------|---------|
| `cd frontend && npm run typecheck` | `tsc -b --pretty false` in `frontend/package.json` |

#### Lint

| Planned command | Maps to |
|-----------------|---------|
| `cd frontend && npm run lint` | `tsc -b` + `scripts/check_frontend_source_hygiene.mjs src` + `scripts/check_frontend_japanese_strings.mjs src` per `frontend/package.json` |

#### Build

| Planned command | Maps to |
|-----------------|---------|
| `cd frontend && npm run build` | `tsc -b && vite build` in `frontend/package.json`; documented in `README.md` and Apollo merge gates |

#### E2E / manual (LV-05)

| Planned command | Maps to |
|-----------------|---------|
| `cd frontend && npm run test:e2e` | Playwright suite in `frontend/tests/e2e/` (16 specs); `playwright.config.ts` starts uvicorn + Vite |
| `cd frontend && npx playwright test --config playwright.phase5-step3.config.ts` | Targeted `phase5-step3-dxf-export.spec.ts` per `playwright.phase5-step3.config.ts` |
| `cd frontend && npx playwright test --config playwright.phase5-japanese.config.ts` | Targeted `phase5-japanese-drawing-remediation.spec.ts` per `playwright.phase5-japanese.config.ts` |
| `python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000` | Backend for manual / smoke runs; documented in `README.md` and `docs/apollo/pr5-smoke/README.md` |
| `cd frontend && npm run dev:apollo -- --host 127.0.0.1 --strictPort` | Apollo Vite dev server; PR5 smoke and LV-05 3D display checks |
| `cd frontend && npm run electron:dev:apollo` | Apollo Electron shell; `frontend/package.json` |
| `cd frontend && npm run app:dev:apollo` | Backend uvicorn + Apollo Electron concurrently; `frontend/package.json` |
| `./start-ubuntu.sh --apollo` | Repo launcher script for Apollo mode on Ubuntu/WSL (`README.md`) |

#### Full regression bundles (LV-04)

| Planned command | Maps to |
|-----------------|---------|
| `cd frontend && npm run test` | Full default vitest run (`vitest run`; excludes e2e and golden regression) |
| `cd frontend && npm run test:regression` | Golden regression only (`vitest.regression.config.ts`) |
| `cd frontend && npm run test:all` | `npm run test` + `npm run test:regression` per `frontend/package.json` |

### Phase 3 verdict

`PHASE3_TEST_COMMAND_DISCOVERY_VERDICT: COMPLETE` — all planned commands traced to
existing `package.json` scripts, `README.md`, pytest modules, vitest configs, or
launcher scripts. Application tests remain NOT_STARTED until LV-04/LV-05 execution.

## LV-01 Git sync / worktree

**Execution timestamp (prior run):** 2026-08-01 18:45:04 JST — PASS at `origin/main` `86e81d35…` (superseded)
**Execution timestamp (re-run):** 2026-08-01 19:32:32 JST
**Verdict:** FAIL

Scope: `git fetch --all --prune`, repository sync, design-freeze baseline containment,
and verification-branch ancestry relative to `origin/main`. No application tests executed.
Worktree checked clean before and after the re-run.

### Recorded commands (re-run 2026-08-01 19:32:32 JST)

```text
# Pre-check
git status --short
# (empty — worktree clean)

git fetch --all --prune
# Fetching origin (exit 0)

git status --short --branch
# ## docs/apollo-refreeze-local-verification...origin/docs/apollo-refreeze-local-verification

git rev-parse HEAD
# ef93b735c23dc3b88d473a07a9440824b8e7a198

git rev-parse origin/main
# f0983878ccbb816f591214b6242c3688ecb5a060

git rev-parse main
# 86e81d35ba36c1ddeb774286676d62a8f03e9085

git rev-parse origin/docs/apollo-refreeze-local-verification
# ef93b735c23dc3b88d473a07a9440824b8e7a198

git merge-base HEAD origin/main
# 86e81d35ba36c1ddeb774286676d62a8f03e9085

git merge-base HEAD 1fbcb3ea804f965b8f262284573f4f4d42dc2411
# 1fbcb3ea804f965b8f262284573f4f4d42dc2411

git merge-base --is-ancestor 1fbcb3ea804f965b8f262284573f4f4d42dc2411 origin/main
# exit 0 (YES)

git merge-base --is-ancestor origin/main HEAD
# exit 1 (NO)

git log --oneline HEAD..origin/main
# f098387 Docs/apollo refreeze local verification (#240)

git branch --contains 1fbcb3ea804f965b8f262284573f4f4d42dc2411
#   docs/apollo-phase1-design-expansion-refreeze
# * docs/apollo-refreeze-local-verification
#   fix/apollo-3d-viewer
#   main

git branch -r --contains 1fbcb3ea804f965b8f262284573f4f4d42dc2411
#   origin/HEAD -> origin/main
#   origin/docs/apollo-phase1-design-expansion-refreeze
#   origin/docs/apollo-refreeze-local-verification
#   origin/fix/apollo-3d-viewer
#   origin/main

# Post-check
git status --short
# (empty — worktree clean)
```

### LV-01 checks (re-run)

| Check | Result | Evidence |
|-------|--------|----------|
| Worktree clean (pre-check) | PASS | `git status --short` empty before fetch |
| `git fetch --all --prune` | PASS | Exit 0; `origin` fetched |
| Local `main` SHA equals `origin/main` | FAIL | `main` `86e81d35…` ≠ `origin/main` `f0983878…` |
| `origin/main` contains documented design-freeze baseline | PASS | `git merge-base --is-ancestor 1fbcb3ea… origin/main` exit 0; `origin/main` in `git branch -r --contains` |
| Verification branch is descendant of current `origin/main` | FAIL | `git merge-base HEAD origin/main` is `86e81d35…`, not `f0983878…`; `origin/main` is not ancestor of HEAD |
| HEAD contains design-freeze baseline | PASS | `git merge-base HEAD 1fbcb3ea…` equals baseline SHA |
| HEAD matches origin tracking branch | PASS | HEAD `ef93b735…` equals `origin/docs/apollo-refreeze-local-verification` |
| Worktree clean (post-check) | PASS | `git status --short` empty after checks |

### LV-01 verdict

`LV01_GIT_SYNC_VERDICT: FAIL` — re-run 2026-08-01 19:32:32 JST against `origin/main`
`f0983878ccbb816f591214b6242c3688ecb5a060`. Local `main` remains at bootstrap SHA
`86e81d35…` (1 commit behind `origin/main`). Verification branch tip `ef93b735…` does not
contain `origin/main` tip `f098387` (`Docs/apollo refreeze local verification (#240)`).
Prior PASS at `86e81d35…` is superseded. Sync local `main` to `origin/main` and reconcile
branch ancestry before resuming LV-04 or other verification.

### Recorded commands (prior run 2026-08-01 18:45:04 JST — superseded)

```text
git fetch --all --prune
# Fetching origin (exit 0)

git status --short --branch
# ## docs/apollo-refreeze-local-verification...origin/docs/apollo-refreeze-local-verification

git rev-parse HEAD
# 96a1febf9524e23c47ea187a73d0bd02ba287469

git rev-parse origin/main
# 86e81d35ba36c1ddeb774286676d62a8f03e9085

git rev-parse main
# 86e81d35ba36c1ddeb774286676d62a8f03e9085

git merge-base HEAD origin/main
# 86e81d35ba36c1ddeb774286676d62a8f03e9085

git branch --contains 1fbcb3ea804f965b8f262284573f4f4d42dc2411
#   docs/apollo-phase1-design-expansion-refreeze
# * docs/apollo-refreeze-local-verification
#   fix/apollo-3d-viewer
#   main

git branch -r --contains 1fbcb3ea804f965b8f262284573f4f4d42dc2411
#   origin/HEAD -> origin/main
#   origin/docs/apollo-phase1-design-expansion-refreeze
#   origin/docs/apollo-refreeze-local-verification
#   origin/fix/apollo-3d-viewer
#   origin/main

git merge-base HEAD 1fbcb3ea804f965b8f262284573f4f4d42dc2411
# 1fbcb3ea804f965b8f262284573f4f4d42dc2411
```

Prior run checks (all PASS at `86e81d35…`): fetch, main==origin/main, baseline containment,
branch descendant of `origin/main`, HEAD baseline, clean worktree, HEAD==origin tracking branch.

## LV-02 Existing Apollo document consistency

**Execution timestamp:** 2026-08-01 18:50:00 JST
**Verdict:** PASS

Scope: cross-read refreeze documents against `docs/apollo/step1/08_roadmap/implementation_roadmap.md`,
`docs/apollo/ap00/`, `docs/apollo/ap01/`, `docs/apollo/ap11/`, Step 1 verdicts/scope freeze,
design-standards posture, and Apollo verification evidence paths cited by the refreeze plan.
No application tests executed.

### LV-02 target documents (existence)

| Path | Result |
|------|--------|
| `docs/apollo/step1/08_roadmap/implementation_roadmap.md` | PASS — present |
| `docs/apollo/ap00/` | PASS — present (governance, scope guards, validation) |
| `docs/apollo/ap01/` | PASS — present (BSDD contract final report) |
| `docs/apollo/ap11/` | PASS — present (IF3 binding final report) |
| `docs/apollo/step1/final/step1_verdicts.md` | PASS — present |
| `docs/apollo/step1/05_scope_boundary/phase1_scope_freeze.md` | PASS — present |
| `docs/apollo/design-standards/README.md` | PASS — present |
| `docs/apollo/pr5-smoke/README.md` | PASS — present (3D smoke summary) |
| `docs/apollo/operator-smoke/report.md` | PASS — present (operator UI evidence) |

Note: `docs/apollo/ap02/` … `ap10/`, `ap12/` … `ap18/` directories are not present;
AP-02..AP-18 scope remains in Step 1 roadmap and completion gate only (not a refreeze path error).

### Repository-path and branch wording

| Check | Result | Evidence |
|-------|--------|----------|
| Refreeze internal paths | PASS | `docs/apollo/phase1_design_expansion_refreeze/` paths resolve; `implementation_sequence.md` working path matches repo root |
| LV-02 cross-reference paths | PASS | `implementation_roadmap.md`, ap00/ap01/ap11 trees exist |
| Design vs verification branch names | PASS | `docs/apollo-phase1-design-expansion-refreeze` (design/handoff in `github_scope_verification.md`, `local_verification_plan.md`) vs `docs/apollo-refreeze-local-verification` (active verification) — distinct roles, not contradictory |
| Baseline SHA across refreeze set | PASS | All six refreeze docs use `1fbcb3ea804f965b8f262284573f4f4d42dc2411`; contained in `origin/main` (LV-01) |
| AP numbering | PASS | `implementation_sequence.md` §2 preserves AP-00..AP-18; AP-DX-00..21 is additive decomposition |

### Terminology consistency

| Topic | Result | Notes |
|-------|--------|-------|
| Implementation authorization | PASS | Refreeze README/scope: NOT GRANTED; aligns with Step 1 `IMPLEMENTATION_AUTHORIZATION: NOT_GRANTED` and ap00 `CONDITIONAL_GO` |
| Numeric authority vs check status | PASS | AP-00 `numeric_authority_model.md`: PLACEHOLDER/ADOPTED ladder; refreeze design-check `NOT_AUTHORIZED` — complementary layers (same as AP-14 scaffolding wording) |
| Non-composite deck | PASS | `compositeAction = false` (refreeze §3); `NON_COMPOSITE_RC_SLAB` / `rc_slab_non_composite` (roadmap AP-06); ASM-P1-003 (scope freeze) — consistent |
| Composite shear connector ban | PASS | Refreeze §3.2 `compositeShearConnector` forbidden; AP-06 non-scope and phase1 scope freeze OUT rows align |
| Blocker tokens | PASS | BLK-S1-001/004/005 referenced in roadmap; refreeze forbids adopted numerics and auto-fill — no conflict |
| Design-check status enum | PASS (after fix) | `scope_and_architecture_freeze.md` §5.5 full set; README item 4 previously omitted READY/RUNNING/WARNING/STALE/ERROR — corrected to match §5.5 |

### Scope consistency (refreeze vs Step 1 / AP-00)

| Check | Result | Notes |
|-------|--------|-------|
| Narrow archetype (straight, single span, skew 90°, plate girder, static linear) | PASS | Refreeze §2.1 matches `phase1_scope_freeze.md` frozen archetype and `phase1_scope_guard_contract.md` |
| Implicit Phase 1 expansion | PASS | Refreeze title and README state **設計機能拡張** explicitly; does not claim current implementation guards already allow expanded member design |
| Explicit design envelope expansion | INFO | Refreeze §2.1 / AP-DX series include stiffener, splice, bracing, fatigue **design data boundaries** that Step 1 `phase1_scope_freeze.md` and `ap00/forbidden_scope.md` list as OUT_OF_PHASE1 for **current implementation PRs** — reconciled by refreeze NOT GRANTING implementation authorization and AP-DX as future gated modules |
| AP-09 frame-generation boundary | INFO | Roadmap AP-09 non-scope excludes splice/bracing/stiffener **members** today; AP-DX-08 plans extension — documented as downstream AP-DX work depending on AP-09..AP-11, not as already-shipped scope |
| Fatigue / dynamic analysis | OPEN_QUESTION | Step 1 excludes fatigue/seismic from Phase 1 analysis scope; refreeze includes fatigue data boundary and AP-DX-18 — timing/governance unlock path not recorded in ap00/step1 (supervisor decision required before AP-DX-18) |

### 3D viewer state (documented repo evidence)

| Check | Result | Evidence |
|-------|--------|----------|
| “3D表示完了” / “完成済み3D表示” premise | PASS | Baseline ancestry includes `d3f1ec6` (`fix(apollo): expose solid bridge model in main viewer`) and `1fbcb3e` (`test(apollo): cover main viewer model handoff`) on `origin/main` |
| Apollo route 3D smoke | PASS | `docs/apollo/pr5-smoke/README.md`: route `/pro/apollo`, presets `full/girders/deck/visible`, STL downloads — `PR5_SMOKE_SUMMARY_VERDICT: PASS_PER_SOURCE_SUMMARY` |
| Operator sample load UI | PASS | `docs/apollo/operator-smoke/report.md`: sample loaded in guided mode (`17_sample_loaded.png`) |
| Display vs design data separation | PASS | Refreeze §5.2/§7/§11 matches roadmap separation of geometry shell vs authoritative numerics; no refreeze doc claims 3D mesh is analysis source of truth |
| LV-03 maintenance check | BLOCKED | `local_verification_plan.md` LV-03 requires confirming `d3f1ec6` / `1fbcb3e` fixes remain in code — deferred to LV-03 (code inventory), not validated in LV-02 |

### Contradictions with implementation-complete claims

| Check | Result |
|-------|--------|
| Refreeze does not claim AP-DX or expanded design is implemented | PASS |
| Refreeze does not claim numeric release readiness | PASS — aligns with `docs/apollo/README.md` and evidence-collection BLOCKED posture |
| Refreeze does not overwrite AP-00..AP-18 numbering | PASS |

### LV-02 fixes applied

- `README.md`: design-check status list aligned with `scope_and_architecture_freeze.md` §5.5.

### LV-02 OPEN_QUESTIONS

1. **Governance unlock for AP-DX member-design modules** — When AP-DX-06..08/14/15/18 implementation is authorized, which decision log entry supersedes `ap00/forbidden_scope.md` OUT_OF_PHASE1 rows for stiffener/splice/bracing/fatigue? Not derivable from repository docs alone.
2. **Fatigue scope timing** — AP-DX-18 vs Step 1 Phase 1 analysis exclusion: supervisor gate criteria not recorded in repo.

### LV-02 verdict

`LV02_APOLLO_DOC_CONSISTENCY_VERDICT: PASS` — refreeze documents are path-accurate, terminology-aligned with AP-00/AP-01/AP-11 and Step 1 planning artifacts, and consistent with documented 3D viewer evidence. Explicit design-expansion scope beyond current implementation guards is acknowledged and blocked by NOT GRANTED implementation authorization; governance unlock path for AP-DX remains OPEN_QUESTION.

## Phase 4 LV-04 test execution (bundle 1 — Apollo frontend)

**Execution timestamp:** 2026-08-01 18:51:14 JST
**Verdict:** FAIL (1 test; pre-existing on `origin/main`, not introduced by doc branch)

Scope: first planned LV-04 bundle only (Apollo frontend vitest). No other test
categories executed. Doc branch `docs/apollo-refreeze-local-verification` has zero
diff vs `origin/main` under `frontend/` (docs-only commits since branch bootstrap).

### LV-04 bundle 1 result record

| Field | Value |
|-------|-------|
| TEST_ID | LV-04-B01-APOLLO-FE |
| COMMAND | `cd frontend && npm run test -- src/apollo src/App.apolloNavigation.test.tsx` |
| START_TIME | 2026-08-01 18:51:14 JST |
| END_TIME | 2026-08-01 18:51:24 JST |
| EXIT_CODE | 1 |
| RESULT | FAIL |
| FAILURE_CLASS | PRE_EXISTING — `apolloStlExport.test.ts` present on `origin/main` (feat #225) but omitted from `EXPECTED_APOLLO_TEST_MODULES` in `apolloSuite.test.ts`; doc branch did not modify application code |
| AFFECTED_SCOPE | `frontend/src/apollo/__tests__/apolloSuite.test.ts` — 1 failed test in 1 file; 27 other Apollo test files passed; 187/188 tests passed overall |
| EVIDENCE | Vitest v4.1.8: `Test Files 1 failed \| 27 passed (28)`; `Tests 1 failed \| 187 passed (188)`; Duration 9.68s; failure: `includes every expected AP-00 test module under __tests__` — received array includes `apolloStlExport.test.ts` not in expected list |
| ACTION | Record only; do not fix in this doc-only task. Reconcile `apolloSuite.test.ts` manifest on an implementation branch before LV-04 can PASS for this bundle. Proceed to LV-04 bundle 2 (viewer/3D) only after supervisor approval |

### Phase 4 bundle 1 verdict

`LV04_B01_APOLLO_FE_VERDICT: FAIL` — Apollo frontend regression bundle exited 1 due to
stale suite-discoverability manifest; failure predates verification branch and is
attributable to `origin/main` code, not refreeze documentation edits.

## Phase 4 LV-04 test execution (bundle 2 — viewer / 3D) — SUPERSEDED

**Execution timestamp:** 2026-08-01 18:52:38 JST
**Verdict:** FAIL (SUPERSEDED — erroneous command; see corrected rerun below)

Scope: second planned LV-04 bundle only (viewer/3D vitest). No other test categories
executed. Doc branch `docs/apollo-refreeze-local-verification` has zero diff vs
`origin/main` under `frontend/` (docs-only commits since branch bootstrap).

**Command error:** This run accidentally appended an extra `.` argument after
`src/viewer`, broadening vitest scope to the full `frontend/` tree (263 test files)
instead of the Phase 3 planned viewer bundle (`cd frontend && npm run test -- src/viewer`).
The correct planned command has no trailing `.` path/filter.

### LV-04 bundle 2 result record (superseded)

| Field | Value |
|-------|-------|
| TEST_ID | LV-04-B02-VIEWER-3D |
| COMMAND | `cd frontend && npm run test -- src/viewer .` (ERRONEOUS — extra `.` argument) |
| START_TIME | 2026-08-01 18:52:38 JST |
| END_TIME | 2026-08-01 18:53:10 JST |
| EXIT_CODE | 1 |
| RESULT | FAIL (SUPERSEDED) |
| FAILURE_CLASS | PRE_EXISTING — `apolloSuite.test.ts` discoverability drift (`apolloStlExport.test.ts` on `origin/main` but omitted from `EXPECTED_APOLLO_TEST_MODULES`); doc branch did not modify application code; failure is outside `src/viewer/` |
| AFFECTED_SCOPE | `frontend/src/apollo/__tests__/apolloSuite.test.ts` — 1 failed test in 1 file; 22/22 viewer test files passed (228/228 viewer tests); 262/263 total test files passed; 2046/2047 total tests passed |
| EVIDENCE | Vitest v4.1.8: `Test Files 1 failed \| 262 passed (263)`; `Tests 1 failed \| 2046 passed (2047)`; Duration 30.51s; failure: `includes every expected AP-00 test module under __tests__` — received array includes `apolloStlExport.test.ts` not in expected list; erroneous `.` argument expanded scope beyond viewer bundle |
| ACTION | Superseded by corrected rerun below using Phase 3 planned command without trailing `.` |

### Phase 4 bundle 2 verdict (superseded)

`LV04_B02_VIEWER_3D_VERDICT: FAIL (SUPERSEDED)` — run used erroneous command with
extra `.` argument; failure is not attributable to viewer/3D bundle under the planned
command. Corrected rerun recorded below.

## Phase 4 LV-04 test execution (bundle 2 — viewer / 3D, corrected rerun)

**Execution timestamp:** 2026-08-01 18:55:15 JST
**Verdict:** PASS

Scope: second planned LV-04 bundle only (viewer/3D vitest per Phase 3 planned command).
No other test categories executed. Doc branch `docs/apollo-refreeze-local-verification`
has zero diff vs `origin/main` under `frontend/` (docs-only commits since branch bootstrap).

Verified command matches Phase 3 planned entry: `cd frontend && npm run test -- src/viewer`
(no trailing `.` path/filter). Supersedes the erroneous 2026-08-01 18:52:38 JST run that
accidentally appended an extra `.` argument and broadened scope.

### LV-04 bundle 2 result record (corrected — authoritative)

| Field | Value |
|-------|-------|
| TEST_ID | LV-04-B02-VIEWER-3D-CORRECTED |
| COMMAND | `cd frontend && npm run test -- src/viewer` |
| START_TIME | 2026-08-01 18:55:15 JST |
| END_TIME | 2026-08-01 18:55:18 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | 22/22 viewer test files passed (228/228 viewer tests) |
| EVIDENCE | Vitest v4.1.8: `Test Files 22 passed (22)`; `Tests 228 passed (228)`; Duration 3.19s |
| ACTION | Proceed to LV-04 bundle 3 (IF3 frontend) per Phase 3 planned commands |

### Phase 4 bundle 2 verdict (corrected — authoritative)

`LV04_B02_VIEWER_3D_VERDICT: PASS` — viewer/3D regression bundle exited 0 under the
Phase 3 planned command. Supersedes superseded FAIL record from erroneous command with
trailing `.` argument.

## Phase 4 LV-04 test execution (bundle 3 — IF3 frontend)

**Execution timestamp:** 2026-08-01 18:56:31 JST
**Verdict:** PASS

Scope: third planned LV-04 bundle only (IF3 frontend vitest per Phase 3 planned command).
No other test categories executed. Doc branch `docs/apollo-refreeze-local-verification`
has zero diff vs `origin/main` under `frontend/` (docs-only commits since branch bootstrap).

Verified command matches Phase 3 planned entry:
`cd frontend && npm run test -- src/if3 src/results/if3 src/exports/if3 src/draft/if3DraftEligibility.test.ts src/api/client.if3.test.ts`

### LV-04 bundle 3 result record

| Field | Value |
|-------|-------|
| TEST_ID | LV-04-B03-IF3-FE |
| COMMAND | `cd frontend && npm run test -- src/if3 src/results/if3 src/exports/if3 src/draft/if3DraftEligibility.test.ts src/api/client.if3.test.ts` |
| START_TIME | 2026-08-01 18:56:31 JST |
| END_TIME | 2026-08-01 18:56:33 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | 12/12 IF3 frontend test files passed (76/76 tests) |
| EVIDENCE | Vitest v4.1.8: `Test Files 12 passed (12)`; `Tests 76 passed (76)`; Duration 1.36s |
| ACTION | Proceed to LV-04 bundle 4 (IF3 backend) per Phase 3 planned commands |

### Phase 4 bundle 3 verdict

`LV04_B03_IF3_FE_VERDICT: PASS` — IF3 frontend regression bundle exited 0 under the
Phase 3 planned command.

## Phase 4 LV-04 test execution (bundle 4 — IF3 backend / API)

**Execution timestamp:** 2026-08-01 18:57:44 JST
**Verdict:** PASS

Scope: fourth planned LV-04 bundle only (IF3 backend/API pytest per Phase 3 planned
command). No other test categories executed. Doc branch `docs/apollo-refreeze-local-verification`
has zero diff vs `origin/main` under `backend/` (docs-only commits since branch bootstrap).

Verified command matches Phase 3 planned entry (no trailing `.` path argument):
`python3 -m pytest backend/tests/test_if3_api.py backend/tests/test_if3_normalizer.py backend/tests/test_if3_persistence.py backend/tests/test_if3_ref_persistence.py backend/tests/test_if3_legacy_compatibility.py backend/tests/test_if3_availability.py backend/tests/test_reports_if3_gate.py -q`

### LV-04 bundle 4 result record

| Field | Value |
|-------|-------|
| TEST_ID | LV-04-B04-IF3-BE |
| COMMAND | `python3 -m pytest backend/tests/test_if3_api.py backend/tests/test_if3_normalizer.py backend/tests/test_if3_persistence.py backend/tests/test_if3_ref_persistence.py backend/tests/test_if3_legacy_compatibility.py backend/tests/test_if3_availability.py backend/tests/test_reports_if3_gate.py -q` |
| START_TIME | 2026-08-01 18:57:44 JST |
| END_TIME | 2026-08-01 18:57:51 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | 7/7 IF3 backend test modules passed (123/123 tests) |
| EVIDENCE | pytest 9.1.1: `123 passed in 6.68s`; no failures or errors |
| ACTION | Proceed to LV-04 bundle 5 (backend general) per Phase 3 planned commands |

### Phase 4 bundle 4 verdict

`LV04_B04_IF3_BE_VERDICT: PASS` — IF3 backend/API regression bundle exited 0 under the
Phase 3 planned command.

## Phase 4 static check execution (bundle 1 — typecheck)

**Execution timestamp:** 2026-08-01 18:59:09 JST
**Verdict:** PASS

Scope: first planned static-check bundle only (frontend TypeScript typecheck). No lint,
build, or test commands executed. Doc branch `docs/apollo-refreeze-local-verification`
has zero diff vs `origin/main` under `frontend/` (docs-only commits since branch bootstrap).

Verified command matches Phase 3 planned entry: `cd frontend && npm run typecheck`
(`tsc -b --pretty false` in `frontend/package.json`).

### Static check bundle 1 result record

| Field | Value |
|-------|-------|
| TEST_ID | SC-B01-TYPECHECK |
| COMMAND | `cd frontend && npm run typecheck` |
| START_TIME | 2026-08-01 18:59:09 JST |
| END_TIME | 2026-08-01 18:59:24 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | Full frontend TypeScript project build (`tsc -b`); no errors reported |
| EVIDENCE | `tsc -b --pretty false` completed in ~15s; exit 0; no diagnostic output |
| ACTION | Proceed to static check bundle 2 (lint) per Phase 3 planned commands when authorized |

### Phase 4 static check bundle 1 verdict

`SC_B01_TYPECHECK_VERDICT: PASS` — frontend typecheck exited 0 under the Phase 3 planned
command.

## Phase 4 static check execution (bundle 2 — lint)

**Execution timestamp:** 2026-08-01 19:00:33 JST
**Verdict:** PASS

Scope: second planned static-check bundle only (frontend lint). No typecheck, build, or
test commands executed separately. Doc branch `docs/apollo-refreeze-local-verification`
has zero diff vs `origin/main` under `frontend/` (docs-only commits since branch bootstrap).

Verified command matches Phase 3 planned entry: `cd frontend && npm run lint .`
(`tsc -b` + `scripts/check_frontend_source_hygiene.mjs src` +
`scripts/check_frontend_japanese_strings.mjs src` per `frontend/package.json`).

### Static check bundle 2 result record

| Field | Value |
|-------|-------|
| TEST_ID | SC-B02-LINT |
| COMMAND | `cd frontend && npm run lint .` |
| START_TIME | 2026-08-01 19:00:33 JST |
| END_TIME | 2026-08-01 19:00:47 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | Full frontend lint pipeline (`tsc -b`, source hygiene, Japanese-string audit); no errors reported |
| EVIDENCE | `tsc -b --pretty false` completed; `Frontend source hygiene check passed.`; Japanese-string audit reported `Total: 3045 occurrence(s) across 134 file(s).` (informational); exit 0; duration ~14s |
| ACTION | Proceed to static check bundle 3 (build) per Phase 3 planned commands when authorized |

### Phase 4 static check bundle 2 verdict

`SC_B02_LINT_VERDICT: PASS` — frontend lint exited 0 under the Phase 3 planned command.

## Phase 4 static check execution (bundle 3 — build)

**Execution timestamp:** 2026-08-01 19:01:41 JST
**Verdict:** PASS

Scope: third planned static-check bundle only (frontend production build). No typecheck,
lint, or test commands executed separately. Doc branch `docs/apollo-refreeze-local-verification`
has zero diff vs `origin/main` under `frontend/` (docs-only commits since branch bootstrap).

Verified command matches Phase 3 planned entry: `cd frontend && npm run build`
(`tsc -b && vite build` in `frontend/package.json`).

### Static check bundle 3 result record

| Field | Value |
|-------|-------|
| TEST_ID | SC-B03-BUILD |
| COMMAND | `cd frontend && npm run build` |
| START_TIME | 2026-08-01 19:01:41 JST |
| END_TIME | 2026-08-01 19:02:07 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | Full frontend production build (`tsc -b && vite build`); `dist/` artifacts generated (index.html, CSS, JS bundles) |
| EVIDENCE | `tsc -b` completed; Vite v7.3.5: `3926 modules transformed`; built in 10.57s; `dist/index.html` 0.40 kB, `dist/assets/index-BkjMxd5x.css` 101.47 kB, `dist/assets/index-FCi1lvIH.js` 3,131.18 kB; chunk size >500 kB warning (informational only); exit 0; total duration ~26s |
| ACTION | Proceed to LV-03 implementation inventory if not yet done, then LV-04 bundle 5 (backend general) per Phase 3 planned commands |

### Phase 4 static check bundle 3 verdict

`SC_B03_BUILD_VERDICT: PASS` — frontend production build exited 0 under the Phase 3 planned
command.

## LV-03 implementation inventory

**Execution timestamp:** 2026-08-01 (docs-only; code inspection)
**Verdict:** PASS
**Artifact:** `implementation_inventory.md` (this directory)

### Method

- Inspected `frontend/src/apollo/`, `frontend/src/contracts/`, `frontend/src/bridgeDefinition/`,
  `frontend/src/if3/`, `frontend/src/results/`, `frontend/src/exports/`, `frontend/src/viewer/`,
  and `backend/engine/if3_*.py` via search and file reads.
- Classifications use enum: `IMPLEMENTED`, `PARTIALLY_IMPLEMENTED`, `SCAFFOLD_ONLY`, `PLANNED`,
  `BLOCKED`, `OUT_OF_SCOPE`, `UNKNOWN`.
- Did not infer implementation from refreeze docs or UI labels alone.

### Summary counts

| Classification | Count |
|----------------|------:|
| IMPLEMENTED | 5 |
| PARTIALLY_IMPLEMENTED | 11 |
| SCAFFOLD_ONLY | 1 |
| PLANNED | 5 |
| OUT_OF_SCOPE | 2 |

### Minimum target verdicts (abbreviated)

| Target | Classification |
|--------|----------------|
| Apollo route/workspace | IMPLEMENTED |
| BSDD contracts | PARTIALLY_IMPLEMENTED |
| Lifecycle/stale/validation | PARTIALLY_IMPLEMENTED |
| Bridge basic conditions | PARTIALLY_IMPLEMENTED |
| Span/support/girder geometry | PARTIALLY_IMPLEMENTED |
| Deck definition | PARTIALLY_IMPLEMENTED |
| Cross beam/floor system shell | PARTIALLY_IMPLEMENTED |
| Material/section registry | PARTIALLY_IMPLEMENTED |
| Load shell | SCAFFOLD_ONLY |
| Frame generation | PARTIALLY_IMPLEMENTED |
| IF3 binding | IMPLEMENTED |
| Result import | PARTIALLY_IMPLEMENTED |
| Export gates | IMPLEMENTED |
| 3D solid viewer | IMPLEMENTED |
| STL export | IMPLEMENTED |
| RC slab design shell | PLANNED |
| Girder design shell | PLANNED |
| Stiffener model | PLANNED |
| Splice model | PLANNED |
| Floor system/bracing model | PARTIALLY_IMPLEMENTED |
| Steel weight | PLANNED |
| Fatigue | OUT_OF_SCOPE |
| Drawing preview | OUT_OF_SCOPE |
| Report model/exports | PARTIALLY_IMPLEMENTED |

### Maintenance check (`d3f1ec6` / `1fbcb3e`)

| Check | Result |
|-------|--------|
| Main viewer Apollo solid handoff in `App.tsx` | PASS — `viewerDisplayModel`, `apolloVisualizationBuild`, conditional `apolloVisualizationModel` |
| Viewer controls / types | PASS — `Viewer3D.tsx`, `ViewerControls.tsx`, `viewer/types.ts` |
| Regression tests | PASS — `App.apolloNavigation.test.tsx`, `ViewerControls.test.tsx` |

Previously BLOCKED in LV-02; resolved in LV-03.

### Key findings

1. Apollo Phase 1 is an **input + visualization shell**; calculation and authoritative export are disabled in the Apollo route UI.
2. BSDD contracts, IF3 gates, and `BridgeDefinition` frame generation exist as **platform code** but are largely **not wired to Apollo UI**.
3. Cross-beam, bracing, and deck solids are **visualization heuristics**, not persisted design entities.
4. No premature AP-DX design modules (stiffener, splice, RC slab design, steel weight, fatigue) found in code.

`LV03_IMPLEMENTATION_INVENTORY_VERDICT: PASS`

## Next action

LV-01 re-run (2026-08-01 19:32:32 JST): FAIL. `origin/main` is
`f0983878ccbb816f591214b6242c3688ecb5a060`; local `main` is `86e81d35…` (behind by 1 commit).
Verification branch does not contain current `origin/main`. Sync local `main` to `origin/main`
and reconcile branch ancestry, then re-run LV-01 before resuming. Prior recorded results
preserved: LV-03 PASS; LV-04 bundle 1 FAIL (pre-existing); bundles 2–4 PASS; static checks
typecheck/lint/build PASS. After LV-01 PASS: LV-04 bundle 5 (backend general). LV-05 uses
manual/e2e commands from the E2E/manual table. Do not invent commands outside this inventory.
