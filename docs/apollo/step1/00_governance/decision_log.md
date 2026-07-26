# Decision Log — Step 1

**Authority:** DESIGN PLANNING / STEP 1

| ID | Date | Decision | Rationale | Status | PR / SHA |
|----|------|----------|-----------|--------|----------|
| DEC-S1-0001 | 2026-07-27 | Adopt GitHub handoff package `APOLLO-FRAME-HANDOFF-20260726-001` as Step 1 input frame | PR #189 merged; package integrity verified (126 files, 124 SHA256 OK); immutable snapshot on `main` @ `0034786ef1848e69877b1e2357a453bad40059e5` | ACCEPTED | PR #189 @ `0034786` |
| DEC-S1-0002 | 2026-07-27 | Step 1 artifacts live under `docs/apollo/step1/`; handoff package never mutated | Separation of planning outputs from immutable research input; sandbox rule enforcement | ACCEPTED | P00 @ `1a534c9` |
| DEC-S1-0003 | 2026-07-27 | Handoff package mechanical and semantic acceptance: **ACCEPT_WITH_ACTIONS** | Re-verification 126 files, 124/124 SHA256 OK; bucket counts match; 10 tracked issues (0 CRITICAL); acceptance ≠ design freeze ≠ implementation authorization | ACCEPTED_WITH_ACTIONS | PR #191 @ `b0913a8` |
| DEC-S1-0004 | 2026-07-27 | P02 standards baseline: Target Standard remains **NOT_SELECTED**; material and numeric governance rules established | Local inventory (11 PDFs, Stage5B crosswalk) insufficient for unique Target edition; 34 JIS gaps HOLD; fail-closed adoption rules; DECISION_REQUIRED inputs DTR-01…06 listed | ACCEPTED_WITH_BLOCKERS | P02 (pending merge) |
