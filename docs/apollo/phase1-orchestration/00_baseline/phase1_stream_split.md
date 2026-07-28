# ORCH-00 Phase 1 Stream Split

**Date:** Tuesday, July 28, 2026

## Decision

Apollo Phase 1 is formally split into two controlled streams:

- `Phase 1-NN`: non-numeric implementation stream
- `Phase 1-Numeric`: evidence-only stream

## Phase 1-NN

Allowed to proceed through a separate gate if it stays limited to:

- project shell
- navigation
- topology and metadata editing shells
- visualization shell
- adapter shell
- import/export shell
- result viewer shell without verified output
- provisional / unverified status
- feature flags
- numeric execution block
- result publication block
- audit trail shell
- validation message shell

## Phase 1-Numeric

Remains implementation-prohibited on Tuesday, July 28, 2026.

Allowed work is limited to:

- licensed source acquisition planning
- licensed Windows machine readiness
- Analyzer / SPACER / STATICS identity planning
- three-run planning
- Golden planning
- actual parity planning
- reassessment-readiness tracking

## Boundary

The separation line is simple:

- if a change could emit, verify, compare, or publish engineering numerics, it belongs to `Phase 1-Numeric`
- if a change only shapes UI, workflow, draft topology, guards, messaging, or audit without solver numerics, it may belong to `Phase 1-NN`

## Contamination controls

- no solver imports in Phase 1-NN route code
- no hardcoded engineering values presented as results
- no verified badge
- no authoritative export / publication
- fail-closed feature flags
- explicit provisional banner

## Verdict

```text
PHASE1_STREAM_SPLIT_VERDICT: PASS
```
