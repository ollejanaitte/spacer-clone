# Verification Gates and Milestones

## 1. Final verification gates

Each gate must be passed before the next Phase can proceed.

| Gate ID | Gate Name | Description | Phase |
|---------|-----------|-------------|-------|
| REFERENCE_INPUT_PARITY | Reference input parity | Input data (bridge geometry, material properties, load conditions) matches the source originals within the agreed tolerance | 3 |
| GEOMETRY_PARITY | Geometry parity | 3D bridge geometry model matches the source general arrangement drawings and cross-section details | 6 |
| STRUCTURAL_MODEL_PARITY | Structural model parity | Structural analysis model (member definition, boundary conditions, load application) matches the source model description | 7 |
| ANALYSIS_RESULT_PARITY | Analysis result parity | Analysis results (member forces, displacements, reactions) match the source calculation values within agreed tolerance | 8 |
| DESIGN_CHECK_PARITY | Design check parity | Design check results (stress ratios, required section properties, adopted sections) match the source | 9 |
| REPORT_CONTENT_PARITY | Report content parity | Generated report content (chapters, tables, values) matches the source calculation book in information composition | 11 |
| REPORT_LAYOUT_PARITY | Report layout parity | Generated report layout (page structure, table formatting, section numbering) matches the source calculation book | 11 |
| DRAWING_GEOMETRY_PARITY | Drawing geometry parity | Generated drawing geometry (plan, elevation, cross-section, member details) matches the source drawing set | 12 |
| SAVE_RELOAD_PARITY | Save/Reload parity | Bridge data can be saved to a file and reloaded to produce identical results | 13 |
| REPRODUCIBILITY | Reproducibility | Full end-to-end reproduction from input to report and drawing output produces results consistent with the source | 13 |

## 2. Milestones

| Milestone | Name | Description | Gates to pass |
|-----------|------|-------------|---------------|
| A | Shape matches | The bridge geometry, structural model, and report/drawing layout match the source | REFERENCE_INPUT_PARITY, GEOMETRY_PARITY, STRUCTURAL_MODEL_PARITY |
| B | Numerics match | Analysis results and design check values match the source | ANALYSIS_RESULT_PARITY, DESIGN_CHECK_PARITY |
| C | Product matches | Generated report and drawing output match the source | REPORT_CONTENT_PARITY, REPORT_LAYOUT_PARITY, DRAWING_GEOMETRY_PARITY |
| D | Generalizable | The process can be applied to other bridge types (simple girder, existing continuous girder) | SAVE_RELOAD_PARITY, REPRODUCIBILITY |

## 3. Phase 0 gate status

At Phase 0, all gates are NOT_YET_EVALUATED. No gate is PASS.

| Gate | Phase 0 Status |
|------|----------------|
| REFERENCE_INPUT_PARITY | NOT_YET_EVALUATED |
| GEOMETRY_PARITY | NOT_YET_EVALUATED |
| STRUCTURAL_MODEL_PARITY | NOT_YET_EVALUATED |
| ANALYSIS_RESULT_PARITY | NOT_YET_EVALUATED |
| DESIGN_CHECK_PARITY | NOT_YET_EVALUATED |
| REPORT_CONTENT_PARITY | NOT_YET_EVALUATED |
| REPORT_LAYOUT_PARITY | NOT_YET_EVALUATED |
| DRAWING_GEOMETRY_PARITY | NOT_YET_EVALUATED |
| SAVE_RELOAD_PARITY | NOT_YET_EVALUATED |
| REPRODUCIBILITY | NOT_YET_EVALUATED |

## 4. Gate authority

- Each gate requires a written pass/fail report
- A gate cannot be passed by the same person who implemented the feature
- Numeric gates (ANALYSIS_RESULT_PARITY, DESIGN_CHECK_PARITY) require
  independent engineering review
- All gates must be PASS before Milestone D can be declared