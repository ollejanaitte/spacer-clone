# Recommended Decision

This section provides the engineering recommendation. It is NOT a formal approval — the human reviewer must confirm via `09_engineering_review_decision_form.md`.

## Recommendation

| Decision | Recommended Option | Rationale |
|----------|-------------------|-----------|
| Formal name | 対傾構下弦材 (sway bracing bottom chord) | It is a member of the SwayBracing system, located at the bottom of the V, connecting the two girder webs |
| Canonical owner | SwayBracing → BraceMember | Reuses existing entity; maintains single source of truth |
| Topology | T-A (horizontal bottom chord at centerZ) | Structurally sound; centerZ = lowerZ consistency required |
| Connection Z | centerNodeDepthFromGirderTop (validate = lowerAttachmentDepth) | Consistent with V-frame center node |
| Section | S-A (same L-angle as diagonals) | Reuses existing `lateralAngleSection`; no schema change |
| Quantity | Q-A (sway bracing steel weight) | Consistent with diagonals; no double-count |
| Dead load | L-A (include in dead load) | Consistent with other secondary steel |
| STL | Exportable | Same as diagonal BraceMembers |
| Existing project | Regenerate on next generation (deterministic IDs) | No data migration needed |

## Rationale for T-A + S-A

- **Minimal change**: adds 1 BraceMember per bay, reuses existing section input
- **No schema change**: BraceMember array is unbounded
- **No double-count**: new entity is separate from CrossBeam
- **Consistent**: Viewer, STL, and quantity all derive from the same BraceMember entity
- **Backward compatible**: existing projects regenerate with the new member on next generation

## Scoring

| Option | Meaning | Schema | Quantity | Viewer | STL | Risk | Overall |
|--------|---------|--------|----------|--------|-----|------|---------|
| T-A | Add bottom chord @ centerZ | None | Low | Low | Low | Low | **RECOMMENDED** |
| T-B | Add bottom chord @ independent centerZ | None | Low | Low | Low | Low | Acceptable |
| T-C | Inclined bottom chord | None | Med | Med | Med | Med | Not preferred |
| T-D | No bottom chord | None | None | Limitation | Limitation | None | Current |