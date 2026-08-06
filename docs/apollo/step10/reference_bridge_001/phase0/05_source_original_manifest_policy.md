# Source Original Manifest Policy

## 1. Purpose

Define the policy for storing, verifying, and tracking the external source
originals (PDFs) used as the basis for Reference Bridge 001 (RB-S10-001)
reproduction.

## 2. Core policy: Originals are NOT stored in GitHub

The source PDFs themselves are **never committed to the GitHub repository**.
GitHub stores only:

- Logical filename (environment-agnostic)
- SHA256 hash
- Page count
- Document role and bridge identifier
- Storage policy reference

## 3. Path handling

Absolute paths containing personal identifiers (e.g., `/home/masaharu/...`) are
**never recorded** in GitHub documents.

Use the logical locator `<EXTERNAL_SOURCE_ROOT>/` in all GitHub documents to
refer to the external storage location. The actual external root is managed
outside the repository.

## 4. Hash verification

- `sha256sum` (or equivalent) must be used to compute the observed hash.
- The observed hash must be compared against the expected hash.
- If they match → `hash_status: MATCH`
- If they differ → `hash_status: MISMATCH` (do not silently correct)
- If the source is not found → `hash_status: NOT_APPLICABLE` and `source_status: SOURCE_MISSING`

## 5. Page count verification

- `pdfinfo` (or equivalent) must be used to obtain the observed page count.
- Compare against the expected page count.
- Match → `page_count_status: MATCH`
- Mismatch → `page_count_status: MISMATCH`
- PDF page count may differ from the drawing catalog sheet count (e.g., 143 PDF pages vs. 141 葉) — both are recorded separately.

## 6. Change detection

If an observed SHA256 differs from a previously recorded value:

1. `hash_status` → `MISMATCH`
2. The document status → `SOURCE_CHANGED`
3. Reproduction is blocked until the change is reviewed by a human
4. The change must be recorded in a new source manifest row with the old hash
   retained for reference

## 7. Confidentiality and copyright

- The source PDFs are third-party copyrighted works (design documents by Aichi
  Prefecture / construction consultants).
- They are used for reference and reproduction verification only.
- No part of the PDF content is republished in the repository beyond
  identification metadata (hash, page count, structural type, span lengths).
- No full-text extraction, PDF-to-text conversion, or numeric data transcription
  is performed in Phase 0.

## 8. Missing or conflicting sources

Rules:

| Condition | Action |
|---|---|
| Source not found at expected location | `source_status: SOURCE_MISSING` |
| Hash mismatch | `source_status: SOURCE_CONFLICTING`; DO NOT correct silently |
| Expected metadata missing from PDF | `source_status: SOURCE_PARTIAL` |
| All checks pass | `source_status: SOURCE_CONFIRMED` |
| Human judgment required | `source_status: HUMAN_CONFIRMATION_REQUIRED` |

### Fail-closed rule

If any source original required for Phase 1 is missing or conflicting,
Phase 1 start readiness is automatically `HOLD_WITH_EXACT_REQUIREMENTS`.

## 9. Manifest format

The manifest is stored in `source_original_manifest.csv` with the following columns:

| Column | Description |
|---|---|
| `source_id` | Unique identifier for the source (e.g., `SRC-001`) |
| `logical_filename` | Environment-agnostic filename |
| `document_role` | Role in the reproduction (manual, drawing, calculation) |
| `expected_sha256` | Expected SHA256 from the prompt |
| `observed_sha256` | Actual SHA256 computed from the file |
| `hash_status` | MATCH, MISMATCH, or NOT_APPLICABLE |
| `expected_page_count` | Expected page count from the prompt |
| `observed_page_count` | Actual page count from pdfinfo |
| `page_count_status` | MATCH, MISMATCH, or NOT_APPLICABLE |
| `source_status` | SOURCE_CONFIRMED, SOURCE_PARTIAL, SOURCE_CONFLICTING, SOURCE_MISSING, or HUMAN_CONFIRMATION_REQUIRED |
| `bridge_identifier` | Which bridge this source belongs to |
| `revision_or_date` | Revision or date from the document |
| `github_storage_policy` | EXTERNAL_ONLY (never committed) |
| `notes` | Free-text notes |

## 10. Policy enforcement

This policy is enforced in Phase 0 by:

- `git diff --check` before each PR merge
- Manual inspection of the file list to ensure no PDF/DWG/DXF/RTF/MDB/image
  originals are staged
- CI checks (if available) to reject binary source files