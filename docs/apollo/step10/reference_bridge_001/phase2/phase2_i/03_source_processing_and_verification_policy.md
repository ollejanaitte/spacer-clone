# Phase 2-I Source Processing and Verification Policy

## 1. Purpose

Define the processing method hierarchy, verification standards, and quality gates for Phase 2-I extraction. All extraction must follow these rules to ensure consistency and auditability.

## 2. Text Layer Priority

### 2.1 Rule

All extraction **must** first attempt to use the PDF embedded text layer. The text layer provides character-level positioning with coordinate information and is the most reliable source for automated extraction.

### 2.2 Procedure

1. Extract all text items with their bounding boxes from the PDF text layer
2. Group text items by spatial proximity and formatting to identify tables, formulas, and paragraphs
3. Parse grouped text according to content type (table row, formula expression, note text)
4. Flag any text items with overlapping or ambiguous positioning for visual verification

### 2.3 Rationale

The embedded text layer preserves the original typesetting with character-level accuracy. It avoids the noise and error introduced by OCR.

## 3. Visual Verification

### 3.1 Mandatory Visual Verification

The following element types **require** visual verification after text-layer extraction:

| Element Type | Verification Check |
|--------------|-------------------|
| Tables | Row/column alignment, cell boundaries, header assignment |
| Title blocks | Field label-to-value mapping, completeness |
| Drawing dimensions | Dimension text against line length/position |
| Figures with embedded values | Value placement consistency |

### 3.2 Procedure

1. Open the source PDF page or drawing sheet
2. Compare extracted data against the visual source
3. Mark discrepancies with VERIFICATION_FAILED status
4. Confirm correct extractions with VISUAL_VERIFIED status

### 3.3 Documentation

All visual verification actions are recorded with:
- Verifier identifier
- Date of verification
- Elements verified (by element ID)
- Verification result (pass/fail/partial)

## 4. OCR Policy

### 4.1 When OCR Is Permitted

OCR is used **only** in these circumstances:

1. The PDF page or selected region has no embedded text layer
2. The embedded text is garbled, corrupted, or uses unrecognizable encoding
3. The content includes handwritten annotations, calculations, or marks
4. The content is a scanned image embedded in the PDF without a text layer

### 4.2 When OCR Is Prohibited

OCR is **not** applied:

- Indiscriminately across all 2226 pages
- To pages with a valid embedded text layer (text layer takes priority)
- To areas where text layer extraction produced clean results

### 4.3 OCR Quality Requirements

When OCR is used:
- Minimum confidence threshold: 90% per character
- Post-OCR manual verification is mandatory
- Low-confidence characters are flagged for human review

## 5. Prohibited Operations

### 5.1 No Value Reconstruction from Formulas

Extracted values must be **what is written in the source**, not what would result from recomputing the formula.

Example: A page shows `M = wL²/8 = 10 × 20²/8 = 500 kN·m`. Extract the intermediate substitution `10 × 20²/8` and the result `500 kN·m` as written. Do NOT recompute `10 × 20²/8` to verify `500`.

### 5.2 No Dimension Back-Calculation from Lines

Extracted dimensions must be the **dimension text as written**, not measured from drawn geometry.

Example: A dimension line has text "12000". Extract "12000". Do NOT measure the line length in the PDF and compare.

### 5.3 No Indiscriminate OCR

See Section 4.2.

## 6. UNREADABLE_REQUIRES_HUMAN

### 6.1 When to Apply

A page or element is marked UNREADABLE_REQUIRES_HUMAN when:

1. The text layer is absent and OCR produces unusable output
2. The content is handwritten and illegible
3. The page is damaged, blurred, or otherwise visually degraded
4. Embedded text is present but contains obvious character-level errors that automated correction cannot resolve

### 6.2 Required Action

- Flag the page/element in the coverage CSV
- Add an entry to the human confirmation register
- Do NOT attempt automated extraction

## 7. Verification Workflow

```
Text Layer Extraction
        │
        ▼
   [Text Present?] ──NO──▶ [OCR Feasible?] ──YES──▶ OCR
        │                          │                      │
       YES                         NO                     │
        │                          │                      │
        ▼                          ▼                      ▼
  Text Extracted          UNREADABLE_REQUIRES_HUMAN   OCR Result
        │                                                  │
        ▼                                                  ▼
  [Table/Title Block/Dimension?] ──YES──▶ Visual Verification
        │                                          │
        │                                         PASS? ──NO──▶ Flag + Human Review
        │                                          │
        ▼                                          ▼
  Stage Complete                            VISUAL_VERIFIED
```

## 8. Policy Verdict

```text
PHASE2_I_TEXT_LAYER_PRIORITY: ENFORCED
PHASE2_I_VISUAL_VERIFICATION: MANDATORY_FOR_TABLES_TITLEBLOCKS_DIMENSIONS
PHASE2_I_OCR_RESTRICTED: YES_EMBEDDED_TEXT_ABSENT_ONLY
PHASE2_I_NO_INDISCRIMINATE_OCR: ENFORCED
PHASE2_I_NO_VALUE_RECONSTRUCTION: ENFORCED
PHASE2_I_NO_DIMENSION_BACK_CALCULATION: ENFORCED
PHASE2_I_UNREADABLE_REQUIRES_HUMAN: DEFINED
PHASE2_I_PROCESSING_POLICY_VERDICT: DEFINED
```