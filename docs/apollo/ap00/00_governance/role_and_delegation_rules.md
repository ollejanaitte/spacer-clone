# Role and Delegation Rules — AP-00 Implementation

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0001

## Roles

| Role | Agent / actor | Responsibility |
|------|---------------|----------------|
| **Supervisor** | Grok | Branch strategy approval; staging scope review; commit/push/PR/merge authorization; blocker disposition; final verdict on AP-* units |
| **Worker** | Composer 2.5 | Verification, documentation, and limited staging within declared sandbox; **does not** commit, push, open PR, or merge |

This mirrors Step 1 P00 role split ([step1_charter.md](../../step1/00_governance/step1_charter.md)) extended to implementation phase.

## Supervisor (Grok) duties

1. **Authorize** each AP-* PR unit before worker starts (scope, branch name, mutable paths)
2. **Review** staged file list — reject if `step1/`, `handoffs/`, or production paths appear
3. **Approve** commit messages, push, PR creation, and squash merge to `main`
4. **Enforce** CONDITIONAL_GO — block NOGO_NUMERICS violations and golden comparisons
5. **Record** blocker unlock decisions in Step 1 or AP-00 decision logs as appropriate
6. **Sync** `main` via fast-forward only before spawning dependent AP-* branches

## Worker (Composer 2.5) duties

1. **Verify** preconditions (HEAD, clean tree, correct branch) before edits
2. **Read** Step 1 sources; do not modify them
3. **Create** only files under authorized mutable paths
4. **Stage** explicit paths only (`git add <path>`); never `git add -A` or `git add .`
5. **Stop** after staging (or at declared stop point) and report `git diff --cached --name-status`
6. **Escalate** on ambiguity, unexpected git state, or scope conflict — do not improvise

## Delegation workflow

```text
Supervisor issues task brief (AP-*, branch, paths, stop condition)
        │
        ▼
Worker: verify git state → read sources → implement → stage → report → STOP
        │
        ▼
Supervisor: review staged paths → commit → push → PR → review → squash merge
        │
        ▼
Worker (next unit): ff-sync main → new branch → repeat
```

## Task brief minimum fields

| Field | Example |
|-------|---------|
| AP-* / PR unit | AP00-P00 |
| Branch | `docs/apollo-ap00-p00-governance` |
| Base commit | `7fadab8` |
| Mutable paths | `docs/apollo/ap00/`, `docs/apollo/README.md` |
| Forbidden paths | `step1/`, `handoffs/`, `frontend/`, `backend/` |
| Stop condition | Stage only; no commit |

## Logging

All worker assignments are recorded in [delegation_log.md](../logs/delegation_log.md) by the supervisor after task completion.

## Stop conditions (worker must halt)

- Unexpected files staged or modified outside sandbox
- `git status` shows changes under forbidden paths
- Precondition failure (dirty tree, wrong HEAD, wrong branch)
- Test/typecheck failure when quality gate applies to the PR unit
- Scope ambiguity not resolved by Step 1 or AP-00 governance docs

On stop: **do not** revert changes; report current state to supervisor.

## Escalation

Worker MUST NOT:

- Self-authorize production code changes
- Merge or push without explicit supervisor instruction
- Expand scope beyond task brief
- Modify Step 1 or handoff artifacts to "fix" planning gaps

Supervisor resolves escalations via decision log entry (DEC-AP00-*) if governance change is required.
