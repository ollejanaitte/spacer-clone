# Independent Review Checklist — GOLD-SP-001 / GOLD-SP-002

**Status:** Development procedural checks partial; human release review `PENDING` / `NOT_APPROVED`
**Date:** 2026-08-02

Human reviewer must complete release items **without** using `computeGirderSectionProperties` or any Apollo production path to mint release Golden expected values.

## A. Input integrity

- [x] FIX-SP-001 / FIX-SP-002 inputs match `fixture_manifest.json` (Cursor procedural)
- [x] Input SHA256 matches development `SHA256SUMS.txt` canonical_inputs (Cursor procedural)
- [x] Units are SI (m) (Cursor procedural)
- [x] webHeight definition matches scope (no flange/web double-count) (Cursor procedural)

## B. Derivation independence (release)

- [ ] Expected values derived by hand / independent spreadsheet / independent tool (**HUMAN PENDING**)
- [x] Development Decimal artifact saved with checksum (`development_reference/`) — **not a release Golden**
- [ ] Deriver ≠ sole approver **or** independent procedure + tool separation documented (Phase B §2) (**HUMAN PENDING**)
- [x] Development reference did not copy from `sectionProperties.ts` outputs into calculator (Cursor procedural; separate Decimal script)

## C. Numeric completeness

- [x] Component areas present (development reference)
- [x] First moment / centroid present (development reference)
- [x] Local Ix + parallel-axis terms present (development reference)
- [x] Total Ix present (development reference)
- [x] Top/bottom extreme distances present (development reference)
- [x] Top/bottom section moduli present (development reference)
- [x] Unit-length volume and full girder volume present (development reference)
- [x] Symmetric case: centroid = depth/2 and S_t = S_b documented (GOLD-SP-001 development)
- [x] Asymmetric case: centroid ≠ depth/2 and S_t ≠ S_b documented (GOLD-SP-002 development)

## D. Tolerance

- [x] Development A/R frozen before app comparison (`tolerance_and_rounding_freeze.md` §6)
- [ ] Official human sign-off / `NOT_FROZEN_FOR_RELEASE` → freeze for release (**HUMAN PENDING**)
- [x] Comparison rule recorded

## E. Authorization readiness (post-approval only)

- [ ] Approver name/date recorded (**PENDING**)
- [ ] DEC-ID issued for cell `geometric_section_properties` GRANTED (**PENDING — must remain NONE**)
- [ ] `08_numeric_authorization_gate.md` updated cell-by-cell (not bulk) (**NOT DONE — remain NOT_AUTHORIZED**)
- [x] Loads/analysis/verification cells remain NOT_AUTHORIZED (Cursor procedural confirmation)

## Reviewer sign-off — HUMAN FILL

| Field | Value |
|-------|-------|
| Reviewer | PENDING |
| Date | PENDING |
| Result | PENDING (`PASS` / `FAIL` / `INCOMPLETE`) |
| Notes | Development app parity PASS recorded; release approval not granted |
