# Step 1-A — Evidence / Golden / Authorization Package

**Authority:** APOLLO_STEP_1A_EVIDENCE_GOLDEN_AUTHORIZATION  
**Date:** 2026-08-02  
**Path:** B (human-approved evidence absent)  
**Does NOT grant:** `NUMERIC_DESIGN_AUTHORIZATION` / cell `GRANTED`

## Purpose

Prepare the first numeric cell evidence package for **main girder pure-geometry section properties**, without fabricating independent human Golden values or approvals.

## Relation to existing authority

This package **does not create a new top-level authority**. It operationalizes:

| Existing authority | Role |
|--------------------|------|
| `docs/apollo/phase_a_integrated_freeze/08_numeric_authorization_gate.md` | Cell-level GRANTED gate |
| `docs/apollo/phase_b_release_preparation/06_first_numeric_release_candidate.md` | FIRST_RELEASE_CANDIDATE = A |
| `docs/apollo/phase_b_release_preparation/05_golden_validation_execution_plan.md` | GOLD-MG independence rules |
| `docs/apollo/design-standards/07_golden/` | Golden governance vocabulary |
| `docs/apollo/phase_b_release_preparation/07_user_action_required.md` | Human actions UA-P5-01 etc. |

## Mapping

| Step 1-A ID | Phase B / DS alias | Case |
|-------------|--------------------|------|
| GOLD-SP-001 | GOLD-MG-003S | Symmetric I-section |
| GOLD-SP-002 | GOLD-MG-003A | Asymmetric I-section |
| GOLD-AN-001 (future) | GOLD-MG-001 | SS beam + UDL |
| GOLD-AN-002 (future) | GOLD-MG-002 | SS beam + center point load |

## Files

| File | Content |
|------|---------|
| `scope_and_authority.md` | Scope, authority, fail-closed |
| `source_adoption_matrix.csv` | Source adoption status (no invented ADOPTED) |
| `golden_case_register.csv` | Case register |
| `GOLD-SP-001.md` / `GOLD-SP-002.md` | Candidate worksheets (expected values PENDING_HUMAN) |
| `fixture_manifest.json` | Input fixtures + checksums |
| `tolerance_and_rounding_freeze.md` | Proposed freeze (pending human sign-off) |
| `independent_review_checklist.md` | Reviewer checklist |
| `approval_register.csv` | Approval rows (all NOT_APPROVED) |
| `human_action_required.md` | Exact fields humans must fill |
| `decision_log.md` | Step 1-A decisions (no GRANTED) |
| `step1a_completion_gate.md` | Gate verdicts |

## Current verdicts

```
STEP_1A_EVIDENCE_PACKAGE_VERDICT: COMPLETE_CANDIDATE_ONLY
STEP_1A_GOLDEN_CANDIDATE_VERDICT: READY_FOR_HUMAN_DERIVATION
STEP_1A_INDEPENDENT_HUMAN_EVIDENCE_VERDICT: MISSING
STEP_1A_GOLDEN_APPROVAL_VERDICT: NOT_APPROVED
STEP_1A_SECTION_PROPERTIES_AUTHORIZATION: NOT_AUTHORIZED
STEP_1B_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
```

## Prohibitions

- Do not copy values from `frontend/src/apollo/bridgeStructure/sectionProperties.ts` into Golden expected fields and call them independent.
- Do not invent approver names, DEC-IDs for GRANTED, or ADOPTED primary-source claims.
- Do not start Step 1-B application-code authorization integration until this package reaches PATH A conditions.
