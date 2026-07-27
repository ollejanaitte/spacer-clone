# Source Priority Policy — DS-00

**Authority:** DS-00 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Supersedes for integration:** Step 1 [source_precedence.md](../../step1/00_governance/source_precedence.md) **only where design-standard adoption, status, and evidence routing are concerned**. Step 1 source precedence remains authoritative for non–design-standard Step 1 planning artifacts.

---

## Current integration authority

| Rank | Path | Role | Mutability |
|------|------|------|------------|
| **0** | `docs/apollo/design-standards/` | **Single current integration authority** for design-standard governance, adoption status, blocker disposition, and evidence requirements | Amendable via `DEC-DS00-xxxx` only |
| 1 | `docs/apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/` | Immutable Rank-1 intake evidence | **Immutable** — preserve as historical evidence |
| 2 | Handoff traceability CSVs/MD inside package | Location memos, gap registers, crosswalks | **Immutable** |
| 3 | `docs/apollo/step1/02_standards_baseline/` | Pre–DS-00 planning synthesis (inventory, historical `NOT_SELECTED` record) | **Historical** — do not edit; live Target selection per DEC-DS00-0001 |
| 4 | `docs/apollo/step1/05_scope_boundary/phase1_scope_freeze.md` | Phase 1 archetype freeze (DEC-S1-0008) | **Historical planning** — `REFERENCE_ONLY` for archetype boundaries |
| 5 | `docs/apollo/ap00/02_scope_guards/` | Implementation fail-closed guards | **Orthogonal** — enforces numeric/scope gates in code paths |
| 6 | External research trees (`bridge-standards-research/`, `manual-research/`) | Repo-external PDF inventory and Stage5 findings | `REFERENCE_ONLY` — environment-dependent |
| 7 | Original standards PDFs (repo-external) | Primary evidence for clause/numeric adoption | Acquired per [copyright_and_evidence_policy.md](copyright_and_evidence_policy.md) |

---

## Authoritative vs derived copies

| Artifact | Classification | Canonical path |
|----------|----------------|----------------|
| Handoff package files | **Authoritative (immutable intake)** | `docs/apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/` |
| `PACKAGE_INFO.md` | **Authoritative (historical verdicts)** | [PACKAGE_INFO.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/PACKAGE_INFO.md) |
| `jis_source_gaps.csv` | **Authoritative (immutable intake — historical provenance)** | [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) |
| `jis_source_register.csv` | **Current integration (live governed disposition)** | [jis_source_register.csv](../02_jis/jis_source_register.csv) |
| `ready_requirements.csv` | **Authoritative (69 READY rows)** | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) |
| Step 1 `target_standard_decision.md` | **Derived historical record** (pre–DS-00) | [target_standard_decision.md](../../step1/02_standards_baseline/target_standard_decision.md) |
| Step 1 `numeric_value_governance.md` | **Derived historical policy** | [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) |
| Step 1 `standards_source_inventory.md` | **Derived inventory synthesis** | [standards_source_inventory.md](../../step1/02_standards_baseline/standards_source_inventory.md) |
| DS-00 governance tree | **Current integration authority** | `docs/apollo/design-standards/` |
| AP-00 `numeric_authority_model.md` | **Implementation guard spec** (must align with DS adoption model) | [numeric_authority_model.md](../../ap00/02_scope_guards/numeric_authority_model.md) |
| Evidence PNGs in handoff | **Derived location memos** | `docs/apollo/handoffs/.../evidence/images/` |

---

## Conflict resolution

1. **Design-standard adoption or status** — `docs/apollo/design-standards/` wins over Step 1 standards baseline and handoff `NOT_SELECTED` labels **only where DEC-DS00-0001 explicitly adopts Target Standard selection**.
2. **Handoff immutable text** — never rewritten. Conflicts are recorded in [decision_ledger.md](decision_ledger.md) and [ds00_evidence_baseline.md](ds00_evidence_baseline.md).
3. **Historical `NOT_SELECTED` in handoff / Step 1** — remains on disk as `REFERENCE_ONLY` evidence. Live integration uses DEC-DS00-0001 `ADOPTED` Target selection.
4. **Implementation guards (AP-00)** — code may still read `NOT_SELECTED` until AP-* PRs align `TargetStandardStatus` with DS-00; DS-00 documents the intended authority without modifying AP-00 files.
5. **Rank-6 external PDFs vs handoff edition strings** — edition verification is `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` until DS-01 records verified locators.

---

## Prohibited practices

| Practice | Rationale |
|----------|-----------|
| Copying 道示 / JIS / DDB text into DS documents | Copyright; use locators only ([copyright_and_evidence_policy.md](copyright_and_evidence_policy.md)) |
| Editing handoff, Step 1, AP-00, AP-01, or AP-11 artifacts to “fix” DS-00 conflicts | Preservation rule; amend DS-00 only |
| Treating bridge-standards-research paths as in-repo authority | Repo-external; cite as `REFERENCE_ONLY` |
| Substituting 道示 for missing JIS primaries | Immutable handoff [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) HOLD policy; live disposition in [jis_source_register.csv](../02_jis/jis_source_register.csv) |
| Promoting evidence PNG OCR to numeric authority | Location memos only per handoff |
| Inventing per-volume READY row splits without verified evidence | Use Rank-1 aggregate 69 only at DS-00 |

---

## DS-00 duplicate-authority control

```text
DS00_DUPLICATE_AUTHORITY_VERDICT: PASS_WITH_CONTROL
```

- **Current:** `docs/apollo/design-standards/` for integration.
- **Historical:** handoff + Step 1 baseline preserved unchanged.
- **Derived:** inventory matrices, applicability CSVs, AP-00 guard docs — cite canonical paths; do not restate standards content.

See [ds00_evidence_baseline.md](ds00_evidence_baseline.md) for audit summaries.
