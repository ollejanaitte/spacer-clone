# Phase 5 Completion Gate

**Date:** 2026-07-22
**Status:** AUTHORITATIVE
**Phase:** Road Formal Drawing Completion and JIP-LINER Parity

## Global Gates

Phase 5 is COMPLETE only when all gates below pass:

- P5-D01..P5-D05 are merged by squash PR.
- `main = origin/main`.
- Worktree is clean; no `.tmp/parity-cli` exception remains on the current baseline.
- No source/test changes outside the approved D-step scope.
- `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` remains `0.1.0` unless separately approved.
- No saved `DrawingDocument` appears in project JSON.
- `DrawingSettings` reload regenerates deterministic runtime drawings.
- Preview/print/DXF use the same `DrawingDocument` source.
- AC-RD-01..20 are either PASS or explicitly deferred before implementation; no hidden N/A.
- Local typecheck and tests pass. GitHub checks are recorded as "未設定" if absent.
- Parity CLI build and parity CLI tests pass without tracked or untracked generated diffs.

## Per-Step Gates

### P5-D01 Formal Drawing Specification Reconciliation and Fixture Gate

Completion criteria:

- Evidence matrix maps every gap-analysis row to implemented/deferred/P5-D02+ work.
- JIP §8 adoption table is reflected in unit/regression fixture names.
- AC-RD-01..20 are mapped to tests or manual evidence.
- No behavior expansion except adding missing test fixtures or diagnostics needed to expose current state.

### P5-D02 JIP §8 Drawing Semantics Completion

Completion criteria:

- Supported line drawing, section drawing, skew angle, coordinate table, line dimensions, and section dimensions pass unit/regression tests.
- Unsupported branch/merge or unavailable geometry fails closed with diagnostic.
- Plan/profile/cross-section visual primitives are deterministic and ID-stable.

### P5-D03 Preview / Print / DXF Parity and CAD Gate

Completion criteria:

- Plan Type A, Plan Type B, profile/band, and cross-section DXF export from workspace pass E2E.
- DXF uses `AC1021` unless separately approved.
- Layer/sheet preset behavior is tested for supported `common` preset.
- Preview/print/DXF parity tests prove shared runtime document source.
- No CAD standard or regional compliance claim is made.

### P5-D04 Persistence, Reload, Migration, and Fail-Closed Hardening

Completion criteria:

- Project save/load persists drawing settings and does not persist drawing documents.
- Reload regenerates matching drawing signatures.
- Legacy scalar/crossfall behavior is read-old and does not silently overwrite template elevations.
- Error-level drawing/DXF diagnostics block export completion.
- Source revision/staleness policy is tested.

### P5-D05 Visual E2E and Phase 5 Final Verification

Completion criteria:

- AC-RD-16..20 visual gates are checked at 1366x768 and 1920x1080.
- Phase 1..4 relevant regression and Phase 5 E2E pass locally.
- Final verification document records commands, results, known limitations, GitHub check status, and final verdict.

## Required Quality Commands

Run at least:

```bash
cd frontend && npm run typecheck
cd frontend && npm run test
cd frontend && npm run test:regression
cd frontend && npm run test:e2e
```

For docs-only freeze PR, run at minimum:

```bash
cd frontend && npm run typecheck
cd frontend && npm run test
```

## Stop Conditions

Stop immediately and report without repair when:

- Typecheck or tests fail.
- Unexpected files are staged.
- Git status shows unrelated changes outside declared scope.
- A schema/payload version bump appears without approval.
- Implementation attempts to start before this freeze is merged.

```
PHASE5_COMPLETION_GATE_VERDICT: APPROVED
```
