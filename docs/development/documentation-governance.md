# Documentation Governance

**Authority:** OPERATIONAL
**Status:** ACTIVE
**Governing decisions:** Stage 9 D9-13 documentation hierarchy; Stage 6–10 product/transfer ownership

This document states how documentation authority, status, moves, integration, and retention work in this repository. It does not restate Stage tables or product contracts.

## Authority Classes

| Class | Typical location | Allowed use |
| --- | --- | --- |
| CURRENT FACT | `docs/scoping/**` | Evidence of implementation at the stated scoping baseline. Do not rewrite as target design. |
| TARGET DECISION / PLAN | `docs/planning/stage6-10/**` | Accepted future ownership, contracts, acceptance, migration, sequence, and decision IDs. |
| ACTIVE REFERENCE | Durable road/frame design under product indexes | Semantic/implementation detail subordinate to the two baselines above. |
| OPERATIONAL | `docs/development/**`, quality/runtime guides | Contributor procedures; not product domain truth. |
| HISTORICAL | `docs/history/**` and phase/handover/PR/release evidence | Retained evidence. TODOs and proposals inside history are not automatic requirements. |
| FUTURE PROPOSAL | Untracked `docs/bridge-modeler-v2/**` | Excluded from editing and from current/target authority indexes. |
| LEGACY / DEPRECATED reference | Original MVP specs; legacy LINER integration/write paths | Useful evidence; superseded for target write/integration claims. |

Authority is temporal, not a single winner-takes-all ranking between the two baselines:

1. CURRENT FACT describes current behavior only.
2. TARGET DECISION / PLAN governs future behavior.
3. Neither overwrites the other: do not rewrite current facts from target design, and do not rewrite target decisions from current implementation.
4. Manuals and feature designs are semantic reference only unless an accepted Stage decision adopts them.
5. Historical evidence never overrides (1) or (2).
6. Future proposals never become authority by being moved or copied.

## Product and Transfer Boundaries

- Road Design Tool and Bridge Frame Analysis Tool are separate products with separate sources of truth (`RoadDesignDocument`, `BridgeFrameAnalysisDocument`).
- Road-to-Frame uses an explicit immutable versioned transfer package. The normative target contract remains [`../planning/stage6-10/road_to_frame_contract.md`](../planning/stage6-10/road_to_frame_contract.md).
- Direct mutation of the other product’s authoritative document is forbidden in the target design.
- Viewer is not formal Frame.DRAFT.
- Do not invent a second normative transfer contract under `docs/transfer/` (navigation/crosswalk only).

## Status Metadata (for new or moved active docs)

Active indexes and subordinate design documents should state, where practical:

- Title
- Authority: one of the classes above
- Status: `DECIDED` | `RECOMMENDED` | `OPEN` | `DEFERRED` | `DEPRECATED`
- Governing documents / decision IDs
- Last validated baseline (when known)
- Owner or review gate
- Supersedes / Superseded by

Do not mass-add metadata to frozen Stage 0–10 baselines; their READMEs already define authority.

## Move / Integration / Retention

- Prefer cross-reference over duplicated normative text.
- Every move records old path → new path, updates inbound Markdown links, and keeps a retention/redirect decision for high-inbound paths.
- Integrations must preserve unique constraints and provenance; if unique content cannot be preserved, stop and report.
- First-pass refactor: **no deletion**. `DELETE_CANDIDATE` is review-only until substitute, inbound-link scan, retention approval, and rollback source are recorded.
- Historical moves preserve factual text and dates; change only metadata, navigation, and links unless a later approved remediation says otherwise.
- Untracked `docs/bridge-modeler-v2/**` must not be edited, moved, adopted, or staged as authority.

## Link and Encoding Rules

- Prefer repository-relative Markdown links. Do not put machine-specific absolute home paths into active operational instructions.
- One H1 per active document; keep heading anchors unique in active docs.
- Mermaid/code fences must remain balanced; do not alter Stage diagram semantics unless expressing an accepted Stage 6–10 decision.
- TODO/TBD in active docs must be labeled `OPEN` or `DEFERRED` with owner/gate when remediated; historical markers stay historical.

## Related Documents

- [documentation-validation.md](documentation-validation.md)
- [../README.md](../README.md)
- [../architecture/README.md](../architecture/README.md)
- [../scoping/README.md](../scoping/README.md)
- [../planning/stage6-10/README.md](../planning/stage6-10/README.md)
- [../planning/stage6-10/stage9_asset_mapping.md](../planning/stage6-10/stage9_asset_mapping.md) (section 9.3 documentation disposition)
