# R1_P01_EXTRACTION_RULES

- **Date**: 2026-08-07
- **Phase**: R1-P01

## 1. Method priority

1. TEXT_EXTRACTION (pdftotext -layout) for tabular pages
2. TABLE_EXTRACTION (structured tables)
3. MANUAL_TRANSCRIPTION (human-reviewed from page)
4. INDEPENDENT_FORMULA (recomputation; classification INDEPENDENT_FORMULA)
5. OCR (last resort)

## 2. OCR rules

If OCR is used:
- record `extraction_method=OCR`
- confirm original page
- manual re-check required
- confidence downgraded (LOW unless cross-checked)
- review_status stays unapproved until verified
- OCR-only values are never frozen as golden

## 3. Verification per value

- source_page present and verified
- source_unit known
- normalized_unit known
- coordinate_system known
- expected_value_class known
- review_status known
- no NaN / Infinity
- negative zero normalized to 0

## 4. Prohibited

- Generating expected from current runtime output (self-referential)
- Interpolating values not in source
- Adopting values with unknown page / unit / coordinate system / sign / rounding / tolerance
- Committing PDF originals to GitHub
- Unverified OCR adoption

## 5. Recording

Every row records provenance; rows that fail fail-closed rules go to
`unresolved-values.csv` with the rejection reason.
