# 11 — Implementation Sequence

Do **not** ship Step 4 as one mega-PR. Each step: primary PR + report-only PR.

## Step 4-A — WorkflowState + control screen skeleton

- **Prereq:** P0 GO
- **Modules:** `apollo/workflow/*`, shell entry
- **Tests:** state machine unit; GUI smoke
- **Stop:** if STALE semantics conflict with OutputIntegration

## Step 4-B — Appurtenances + haunch canonical input/migration

- **Prereq:** 4-A or parallel after schema draft acceptance
- **Note:** Domain-first preferred if 4-A UI blocked; DEC allows 4-B start after P0 GO even if 4-A UI delayed, but workflow IDs must exist as stubs
- **Modules:** `bridgeStructure/types`, validation, generateBsdd haunch fill, migration
- **Tests:** schema/migration; Golden geometry fixtures (dev)

## Step 4-C — 3D / quantity / loads / analysis hookup for appurtenances+haunch

- **Prereq:** 4-B
- **Tests:** quantity parity; load trace; 3D solids regression

## Step 4-D — Splice assembly / filler / bolt patterns

- **Prereq:** 4-B stable IDs
- **Tests:** fail-closed without station; drawing G-06 update

## Step 4-E — Alignment binding + compatibility suite

- **Prereq:** LINER IDs readable; preferably before dense appurtenance coordinate work — **DEC-S4-0005: 4-E may run parallel to 4-C after 4-B** if curb coordinates need binding; if binding absent, use local CRS with WARNING

## Step 4-F — 3D dimension overlay + 2-point measure

- **Prereq:** entities from 4-B/D available
- **Tests:** screenshot evidence; no mesh-derived assertions

## Step 4-G — Report / drawings / schedule / ZIP reintegration

- **Prereq:** 4-C/D/E content
- **Tests:** bundle manifest; STALE guards

## Step 4-H — Workflow full integration + E2E + closeout

- **Prereq:** 4-A..G
- **Tests:** full E2E checklist extension

### Sequencing rationale

- Workflow skeleton early improves UX guidance but **must not** block domain schema (risk noted).
- Alignment binding early reduces wrong transverse placement of appurtenances.
- Splice separated (4-D) to limit PR size / migration risk.
