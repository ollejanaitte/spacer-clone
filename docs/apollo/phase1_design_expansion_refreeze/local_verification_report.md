# Apollo Phase 1 設計機能拡張 再凍結 — ローカル検証レポート

**Status:** IN_PROGRESS  
**Target branch:** `docs/apollo-refreeze-local-verification`

Active verification proceeds on branch `docs/apollo-refreeze-local-verification`
(HEAD `dc8bfc9745fe9f7d0ff27d3cd306184388466048` at Phase 2 start) bootstrapped from
integrated `origin/main` SHA `86e81d35ba36c1ddeb774286676d62a8f03e9085`.

## Baseline

| Field | Value |
|-------|-------|
| Execution timestamp (Phase 1) | 2026-08-01 18:40:14 JST |
| Execution timestamp (Phase 2) | 2026-08-01 18:42:00 JST |
| Execution timestamp (Phase 3) | 2026-08-01 18:43:26 JST |
| OS | Zorin OS 17.3 (jammy; Ubuntu-based) |
| Working path | `/home/masaharu/Projects/spacer-clone` |
| Remote | `origin` → `https://github.com/ollejanaitte/spacer-clone.git` |
| Branch | `docs/apollo-refreeze-local-verification` |
| HEAD SHA (Phase 3 start) | `18cfdcd87b034c1a5bec2ea64a40398408ad4470` |
| Origin branch SHA (Phase 3 start) | `18cfdcd87b034c1a5bec2ea64a40398408ad4470` |
| Origin/main SHA | `86e81d35ba36c1ddeb774286676d62a8f03e9085` |
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
| LV-01 | Git sync / worktree | PASS |
| LV-02 | Existing Apollo document consistency | NOT_STARTED |
| LV-03 | Implementation inventory | NOT_STARTED |
| LV-04 | Regression tests | NOT_STARTED |
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

**Execution timestamp:** 2026-08-01 18:45:04 JST
**Verdict:** PASS

Scope: `git fetch --all --prune`, repository sync, design-freeze baseline containment,
and verification-branch ancestry relative to `origin/main`. No application tests executed.

### Recorded commands

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

### LV-01 checks

| Check | Result | Evidence |
|-------|--------|----------|
| `git fetch --all --prune` | PASS | Exit 0; `origin` fetched |
| Local `main` SHA equals `origin/main` | PASS | Both `86e81d35ba36c1ddeb774286676d62a8f03e9085` |
| `origin/main` contains documented design-freeze baseline | PASS | `origin/main` listed in `git branch -r --contains 1fbcb3ea804f965b8f262284573f4f4d42dc2411`; `git merge-base --is-ancestor` confirms |
| Verification branch is descendant of `origin/main` | PASS | `git merge-base HEAD origin/main` equals `origin/main` SHA |
| HEAD contains design-freeze baseline | PASS | `git merge-base HEAD 1fbcb3ea…` equals baseline SHA |
| Working tree clean | PASS | `git status --short` empty |
| HEAD matches origin tracking branch (pre-edit) | PASS | HEAD `96a1febf…` equals `origin/docs/apollo-refreeze-local-verification` |

### LV-01 verdict

`LV01_GIT_SYNC_VERDICT: PASS` — repository is synced; `origin/main` contains the
documented design-freeze baseline `1fbcb3ea804f965b8f262284573f4f4d42dc2411`; current
verification branch remains a descendant of `origin/main`.

## Next action

Proceed to LV-02 per `local_verification_plan.md` (existing Apollo document consistency),
then LV-03 implementation inventory. Execute LV-04 using the Phase 3 planned commands
above (record exit codes and counts). LV-05 uses manual/e2e commands from the E2E/manual
table. Do not invent commands outside this inventory.
