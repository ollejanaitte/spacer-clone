# Source Access and Integrity Recheck

## 1. Purpose

Recheck accessibility, SHA256, and page count for all three source originals.
Confirm Phase 0 manifest values.

## 2. Recheck method

- Locate each PDF file by logical filename
- Compute SHA256 using `sha256sum`
- Obtain page count using `pdfinfo`
- Compare against expected values from Phase 0 manifest
- Record source status

## 3. Results

All three PDFs are accessible at the expected external locations. SHA256 and
page counts match Phase 0 manifest values. No changes detected.

| Source | Expected SHA256 | Observed SHA256 | Hash | Pages | Page status |
|--------|----------------|----------------|------|-------|-------------|
| Apollo User Manual | f91b41f4760d6fe9a0f7d047b52b46d241f93b3ef43a0c186bebc7b14cc0a690 | f91b41f4760d6fe9a0f7d047b52b46d241f93b3ef43a0c186bebc7b14cc0a690 | MATCH | 30 | MATCH |
| Design Drawing | 77718e39bfb016c8a7827c4ead8c7666a256f6cb03083b423ac9793fdf3f5de8 | 77718e39bfb016c8a7827c4ead8c7666a256f6cb03083b423ac9793fdf3f5de8 | MATCH | 143 | MATCH |
| Design Calculation | da6ab701d18f805b63a262aebb19acb8294dd81a4baec4cc57a46e1abef75d8f | da6ab701d18f805b63a262aebb19acb8294dd81a4baec4cc57a46e1abef75d8f | MATCH | 2226 | MATCH |

## 4. Source status

All three sources: SOURCE_CONFIRMED. No integrity issues.

## 5. File details

- Apollo User Manual: A4, 30 pages, 2002-04-23, Author: 長崎富彦, Distiller 4.05
- Design Drawing: A3, 143 pages, 2026-08-06 (PDF creation, original 令和5年3月), Distiller 26.0
- Design Calculation: A4, 2226 pages, 2026-08-06 (PDF creation, original 令和5年3月), Distiller 26.0

## 6. Verdict

SOURCE_INTEGRITY_RECHECK: PASS