# Phase 2-I Extraction Schema and ID Contract

## 1. Purpose

Define the semantic classification system, value separation model, locator schema, and ID prefix conventions for Phase 2-I extraction.

## 2. Semantic Classes

Every extracted value is classified into one of the following semantic classes:

| Class | Description |
|-------|-------------|
| SOURCE_INPUT | Input parameter from design standards or project specifications |
| DERIVED_VALUE | Value computed from source inputs (intermediate calculation result) |
| ANALYSIS_INPUT | Input fed into structural analysis (loads, section properties) |
| ANALYSIS_RESULT | Output from structural analysis (forces, displacements) |
| DESIGN_INPUT | Input for member/cross-section design checks |
| DESIGN_RESULT | Result of design check (OK/NG, ratio, required section) |
| ADOPTED_VALUE | Final adopted design value |
| DRAWING_VALUE | Value shown on a drawing sheet |
| LIMIT_VALUE | Limit/criteria value from design standards |
| FORMULA_DEFINITION | Expression or equation definition |
| NUMERIC_SUBSTITUTION | Formula with values substituted |
| JUDGMENT_RESULT | Engineering judgment outcome (OK, NG, N/A) |
| REFERENCE_TEXT | Text reference to standard, code, or other section |
| IDENTIFIER | Member/section/node/load case label |
| DIMENSION | Geometric dimension (length, angle, radius) |
| COORDINATE | Node/point coordinate |
| MATERIAL_PROPERTY | Material strength, modulus, unit weight |
| SECTION_PROPERTY | Cross-section area, moment of inertia, section modulus |
| LOAD_VALUE | Magnitude of a load |
| LOAD_COMBINATION | Load combination definition |
| SUPPORT_CONDITION | Support type, spring constant, fixity |
| MEMBER_CONNECTIVITY | Joint-to-joint member connectivity |
| NOTE | Text note, remark, or design condition statement |
| TITLE_BLOCK_VALUE | Value from a title block (sheet number, scale, date) |
| UNKNOWN_REQUIRES_REVIEW | Value whose semantic class cannot be determined automatically |

## 3. Value Separation

Every extracted value is stored with the following fields:

| Field | Description |
|-------|-------------|
| raw_text | The extracted text as it appears in the source |
| raw_value | The numeric portion of raw_text (string form) |
| raw_unit | The unit string as it appears |
| normalized_value | Numeric value converted to SI base units (float) |
| normalized_unit | SI base unit string |
| normalization_rule | Reference to the normalization rule applied |
| displayed_rounding | Rounding/precision as displayed (e.g., "3SF", "0.1mm") |
| sign_convention | Sign convention used (e.g., "tension-positive", "compression-positive") |

## 4. Calculation Locator

Every extracted element from the calculation book is located by:

| Field | Description | Example |
|-------|-------------|---------|
| source_id | Source identifier | SRC-003 |
| pdf_page_number | PDF page number (1–2226) | 384 |
| printed_page_number | Printed page number (1–2221 or empty for front matter) | 379 |
| chapter_id | Chapter identifier | CAL-CH3 |
| section_id | Section identifier | CAL-SEC-3.2.3 |
| page_element_id | Element ID within the page | E001 |
| table_id/formula_id/figure_id/note_id | Type-specific ID | TBL-001, FML-001 |
| page_region_hint | Spatial region on the page | "top-left", "bottom-right" |
| source_anchor_id | Anchor point for cross-referencing | ANC-P000384-001 |

## 5. Drawing Locator

Every extracted element from the drawing set is located by:

| Field | Description | Example |
|-------|-------------|---------|
| source_id | Source identifier | SRC-002 |
| pdf_page_number | PDF page number (3–143) | 24 |
| drawing_sheet_number | Drawing sheet number (1–141) | 22 |
| drawing_group | Drawing group name | main_girder_AG1 |
| view_id | View/section identifier | V01 |
| detail_id | Detail callout identifier | D01 |
| title_block_id | Title block field identifier | TB-001 |
| annotation_id | Annotation/note identifier | NOTE-001 |
| dimension_id | Dimension line identifier | DIM-001 |
| source_anchor_id | Anchor point for cross-referencing | ANC-S022-001 |

## 6. ID Examples

### 6.1 Calculation IDs

| ID Pattern | Example | Description |
|------------|---------|-------------|
| CAL-P###### | CAL-P000001 | Calculation page |
| CAL-SEC-M.m.m | CAL-SEC-3.2.3 | Calculation section |
| CAL-TBL-P######-NNN | CAL-TBL-P000010-001 | Table on a page |
| CAL-FML-P######-NNN | CAL-FML-P000020-001 | Formula on a page |
| CAL-VAL-P######-NNN | CAL-VAL-P000020-001 | Individual value on a page |
| CAL-FIG-P######-NNN | CAL-FIG-P000021-001 | Figure on a page |

### 6.2 Drawing IDs

| ID Pattern | Example | Description |
|------------|---------|-------------|
| DWG-SNNN | DWG-S001 | Drawing sheet |
| DWG-SNNN-VNN | DWG-S021-V01 | View on a sheet |
| DWG-SNNN-DIM-NNN | DWG-S021-DIM-001 | Dimension on a sheet |
| DWG-SNNN-NOTE-NNN | DWG-S021-NOTE-001 | Note on a sheet |

### 6.3 Entity IDs

| ID Pattern | Example | Description |
|------------|---------|-------------|
| ENT-{TYPE}-{NAME} | ENT-GIRDER-AG1 | Structural entity |
| ENT-{TYPE}-{NAME} | ENT-SUPPORT-PU15 | Support entity |

### 6.4 Issue IDs

| ID Pattern | Example | Description |
|------------|---------|-------------|
| ISSUE-P2I-###### | ISSUE-P2I-000001 | Phase 2-I extraction issue |

## 7. ID Schema Verdict

```text
PHASE2_I_ID_SCHEMA_DEFINED: YES
PHASE2_I_SEMANTIC_CLASSES: 26
PHASE2_I_LOCATOR_FIELDS_CALC: 10
PHASE2_I_LOCATOR_FIELDS_DWG: 10
PHASE2_I_VALUE_FIELDS: 7
PHASE2_I_ID_REGISTRY_CSV: CREATED
PHASE2_I_ID_SCHEMA_VERDICT: DEFINED
```