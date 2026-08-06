# Source Status, Conflicts, and Open Questions

## 1. Purpose

Summarize the source status of all documents in Phase 1, record any conflicts,
and list items requiring human confirmation.

## 2. Source status summary

| Source | Status | Integrity | Identity | Revision | Bridge info |
|--------|--------|-----------|----------|----------|-------------|
| Apollo User Manual | SOURCE_CONFIRMED | CONFIRMED | CONFIRMED | REVISION_NOT_FOUND | N/A |
| Design Drawing | SOURCE_CONFIRMED | CONFIRMED | CONFIRMED | REVISION_NOT_FOUND | CONFIRMED |
| Design Calculation | SOURCE_CONFIRMED | CONFIRMED | CONFIRMED | REVISION_NOT_FOUND | CONFIRMED |

## 3. Same-project set judgment

SAME_PROJECT_SET_REVISION_UNCERTAIN

All three documents share the same business name, client, date, and bridge.
No revision evidence was found. The set is treated as a single self-consistent
release, but revision uncertainty is recorded.

## 4. Conflicts

No substantive conflicts were found. All numeric bridge conditions match between
calculation and drawing. The only notation variation is:

| Field | Calc | Drawing | Assessment |
|-------|------|---------|------------|
| Far abutment label | A2 | AR2 | Same physical abutment; notation variation (A=abutment, R=ramp) |
| Bridge name | 金沢IC Aランプ橋 | 旭高架橋 Aランプ PU15-AR2 | Same bridge; different naming convention |

## 5. Open questions

| # | Question | Affected item | Phase 2 action |
|---|----------|---------------|----------------|
| 1 | Is the revision number truly absent, or is it embedded in the drawing title block image (not text-extractable)? | Drawing revision | OCR check on title block image |
| 2 | Is the 架設計画図 (sheet 141) fully present? Text extraction shows only "141" | Drawing PDF page 143 | Visual inspection of PDF page 143 |
| 3 | Do the cross-section detail dimensions in drawings match the section properties in the calculation? | Ch3.2.2 ↔ drawing sheets 13-16 | Phase 2 dimension extraction |
| 4 | Are the bolt quantities and specifications in the calculation consistent with the drawing details? | Ch3.2.4 ↔ drawing sheets 21-38 | Phase 2 detail comparison |
| 5 | Does the calculation book's 格子解析データ match the analysis model geometry? | Ch3.1.6, Ch4.1.5 | Phase 2 structured data extraction |
| 6 | Is the 道路橋伸縮装置便覧 (昭和45年4月) referenced in the calc body related to Ch5.4? | calc_pdf_p2216 | Phase 2 verification |

## 6. Verdict

SOURCE_CONFLICT_REGISTER_VERDICT: PASS
HUMAN_CONFIRMATION_REGISTER_VERDICT: PASS