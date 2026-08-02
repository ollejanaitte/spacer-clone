# Independent Review Checklist — GOLD-SP-001 / GOLD-SP-002

**Status:** Template only (`NOT_APPROVED`)  
**Date:** 2026-08-02

Reviewer must complete **without** using `computeGirderSectionProperties` or any Apollo production path to mint expected values.

## A. Input integrity

- [ ] FIX-SP-001 / FIX-SP-002 inputs match `fixture_manifest.json`
- [ ] Input SHA256 matches `checksums.entries`
- [ ] Units are SI (m)
- [ ] webHeight definition matches scope (no flange/web double-count)

## B. Derivation independence

- [ ] Expected values derived by hand / independent spreadsheet / independent tool
- [ ] Derivation artifact saved with checksum
- [ ] Deriver ≠ sole approver **or** independent procedure + tool separation documented (Phase B §2)
- [ ] No copy from `sectionProperties.ts` outputs into expected fields

## C. Numeric completeness

- [ ] Component areas present
- [ ] First moment / centroid present
- [ ] Local Ix + parallel-axis terms present
- [ ] Total Ix present
- [ ] Top/bottom extreme distances present
- [ ] Top/bottom section moduli present
- [ ] Unit-length volume and full girder volume present
- [ ] Symmetric case: centroid ≈ depth/2 and S_t ≈ S_b documented
- [ ] Asymmetric case: centroid ≠ depth/2 and S_t ≠ S_b documented

## D. Tolerance

- [ ] A/R frozen before comparison (`tolerance_and_rounding_freeze.md` signed)
- [ ] Comparison rule recorded

## E. Authorization readiness (post-approval only)

- [ ] Approver name/date recorded
- [ ] DEC-ID issued for cell `geometric_section_properties` GRANTED
- [ ] `08_numeric_authorization_gate.md` updated cell-by-cell (not bulk)
- [ ] Loads/analysis/verification cells remain NOT_AUTHORIZED unless separately granted

## Reviewer sign-off — HUMAN FILL

| Field | Value |
|-------|-------|
| Reviewer | PENDING |
| Date | PENDING |
| Result | PENDING (`PASS` / `FAIL` / `INCOMPLETE`) |
| Notes | PENDING |
