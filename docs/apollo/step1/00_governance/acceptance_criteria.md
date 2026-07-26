# Acceptance Criteria

**Authority:** DESIGN PLANNING / STEP 1

## Per-PR gates (P00–P09)

| PR | Gate | Pass condition |
|----|------|----------------|
| **P00** | Charter & governance bootstrap | Governance docs exist; package integrity verified (126 files, 124 SHA256 OK); decision log initialized; no handoff mutation |
| **P01** | Source register | All Step 1 input sources catalogued with rank, path, availability, and traceability links |
| **P02** | Handoff acceptance | Verdict recorded: `ACCEPT` / `ACCEPT_WITH_ACTIONS` / `REJECT`; actions tracked if applicable |
| **P03** | Feature reconciliation | 281 feature rows reconciled against repo scope; conflicts and aliases documented |
| **P04** | READY 69 analysis | Each READY row assessed for gap-analysis suitability; no conflation with implementation authorization |
| **P05** | Open items register | OPEN / BLOCKER / UNKNOWN items from package cross-referenced; disposition recorded |
| **P06** | Interface boundaries | Data flow and frame-analysis boundary documented per handoff guides |
| **P07** | Validation alignment | Test/validation strategy aligned with `validation_rules_ready.csv` and handoff plans |
| **P08** | Gap analysis workplan | Stage 6 workplan actionable; dependencies and exclusions explicit |
| **P09** | Step 1 completion | All P00–P08 merged; completion verdict issued; implementation-readiness verdict issued separately |

## Overall Step 1 completion criteria

Step 1 is **COMPLETE** when all of the following hold:

1. P00–P09 PRs merged to `main` in sequence
2. Governance artifacts under `docs/apollo/step1/00_governance/` are current
3. Handoff package remains unmodified (integrity re-checkable via SHA256SUMS)
4. All `DECISION_REQUIRED` items from Step 1 are resolved or explicitly deferred with supervisor approval
5. `merge_ledger.md` records every Step 1 PR with merge SHA

Step 1 may be **COMPLETE_WITH_BLOCKERS** if non-blocking deferrals are documented and supervisor approves.

Step 1 **NOGO** if handoff acceptance is `REJECT` or critical blockers remain unresolved at P09.

## Implementation readiness (separate verdict)

Implementation readiness is **not** implied by Step 1 COMPLETE. P09 must emit an explicit verdict:

| Verdict | Meaning |
|---------|---------|
| `READY` | Supervisor authorizes proceeding to implementation planning / Step 2 |
| `READY_WITH_BLOCKERS` | Proceed with documented constraints |
| `NOGO` | Do not proceed to implementation |

Factors include (non-exhaustive): handoff acceptance outcome, OPEN/BLOCKER disposition, JIS source gaps, design-freeze status per package (`APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY` at intake).
