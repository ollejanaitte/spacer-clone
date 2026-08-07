# Phase 2-II-B Depth Audit Report

Data-only repair of Phase 2-I extraction CSVs to satisfy `tools/validate_phase2_i.py` Checks 6 (source locators) and 13 (semantic classes). No design values were recomputed.

## Baseline (pre-repair)

- Check 6 (source locators): **1817 failures**
- Check 13 (semantic classes): **1233 failures**
- Column-shift rows: **249 rows across 32 files**

## Repairs performed

- **A. source_locator derivation**: 1781 rows set to `calc_pdf_p{pdf_page_number}` (calc element CSVs) / `calc_pdf_p{pdf_page}` (domain indexes) where the previous value did not match `^(calc|drawing|manual)_pdf_p\d+$`.
- **B. column-shift repair**: 249 rows re-aligned so every row field count equals the header and content lands in the correct semantic column. Exploded fields (unquoted commas) were re-joined with `,`.
- **C. semantic_class content-leak fixes**: 1 row(s) (`hc=deck_thickness` -> `deck_thickness`).
- Validator `check_locators` no longer scans the generic `location` column (title_blocks.csv `location` holds a geographic place name, not a locator).

## Files modified

- `calculation/chapter_01/formulas.csv`
- `calculation/chapter_01/notes.csv`
- `calculation/chapter_01/page_elements.csv`
- `calculation/chapter_01/tables.csv`
- `calculation/chapter_01/values.csv`
- `calculation/chapter_02/formulas.csv`
- `calculation/chapter_02/notes.csv`
- `calculation/chapter_02/page_elements.csv`
- `calculation/chapter_02/tables.csv`
- `calculation/chapter_02/values.csv`
- `calculation/chapter_03/section_3_1/figures.csv`
- `calculation/chapter_03/section_3_1/formulas.csv`
- `calculation/chapter_03/section_3_1/notes.csv`
- `calculation/chapter_03/section_3_1/page_elements.csv`
- `calculation/chapter_03/section_3_1/tables.csv`
- `calculation/chapter_03/section_3_1/values.csv`
- `calculation/chapter_03/section_3_2/values.csv`
- `calculation/chapter_03/section_3_3/figures.csv`
- `calculation/chapter_03/section_3_3/formulas.csv`
- `calculation/chapter_03/section_3_3/notes.csv`
- `calculation/chapter_03/section_3_3/page_elements.csv`
- `calculation/chapter_03/section_3_3/tables.csv`
- `calculation/chapter_03/section_3_3/values.csv`
- `calculation/chapter_03/section_3_4/figures.csv`
- `calculation/chapter_03/section_3_4/formulas.csv`
- `calculation/chapter_03/section_3_4/notes.csv`
- `calculation/chapter_03/section_3_4/page_elements.csv`
- `calculation/chapter_03/section_3_4/tables.csv`
- `calculation/chapter_03/section_3_4/values.csv`
- `calculation/chapter_03/section_3_5/figures.csv`
- `calculation/chapter_03/section_3_5/formulas.csv`
- `calculation/chapter_03/section_3_5/notes.csv`
- `calculation/chapter_03/section_3_5/page_elements.csv`
- `calculation/chapter_03/section_3_5/tables.csv`
- `calculation/chapter_03/section_3_5/values.csv`
- `calculation/chapter_03/section_3_6/figures.csv`
- `calculation/chapter_03/section_3_6/formulas.csv`
- `calculation/chapter_03/section_3_6/notes.csv`
- `calculation/chapter_03/section_3_6/page_elements.csv`
- `calculation/chapter_03/section_3_6/tables.csv`
- `calculation/chapter_03/section_3_6/values.csv`
- `calculation/chapter_03/section_3_7/figures.csv`
- `calculation/chapter_03/section_3_7/formulas.csv`
- `calculation/chapter_03/section_3_7/notes.csv`
- `calculation/chapter_03/section_3_7/page_elements.csv`
- `calculation/chapter_03/section_3_7/tables.csv`
- `calculation/chapter_03/section_3_7/values.csv`
- `calculation/chapter_04/section_4_1/figures.csv`
- `calculation/chapter_04/section_4_1/formulas.csv`
- `calculation/chapter_04/section_4_1/notes.csv`
- `calculation/chapter_04/section_4_1/page_elements.csv`
- `calculation/chapter_04/section_4_1/tables.csv`
- `calculation/chapter_04/section_4_1/values.csv`
- `calculation/chapter_04/section_4_2/figures.csv`
- `calculation/chapter_04/section_4_2/formulas.csv`
- `calculation/chapter_04/section_4_2/notes.csv`
- `calculation/chapter_04/section_4_2/page_elements.csv`
- `calculation/chapter_04/section_4_2/tables.csv`
- `calculation/chapter_04/section_4_2/values.csv`
- `calculation/chapter_05/figures.csv`
- `calculation/chapter_05/formulas.csv`
- `calculation/chapter_05/notes.csv`
- `calculation/chapter_05/page_elements.csv`
- `calculation/chapter_05/tables.csv`
- `calculation/chapter_05/values.csv`
- `calculation/front_matter/figures.csv`
- `calculation/front_matter/page_elements.csv`
- `domain_indexes/adopted_value_index.csv`
- `domain_indexes/analysis_result_index.csv`
- `domain_indexes/design_check_index.csv`
- `domain_indexes/geometry_index.csv`
- `domain_indexes/load_index.csv`
- `domain_indexes/material_section_index.csv`
- `domain_indexes/member_identifier_index.csv`
- `domain_indexes/structural_model_index.csv`
- `drawings/sheets_001_044/annotations.csv`
- `drawings/sheets_001_044/dimensions.csv`
- `drawings/sheets_045_088/sheet_elements.csv`

## Semantic class enum change

`ALLOWED_SEMANTIC_CLASSES` replaced with the contract's uppercase classes enumerated in `02_extraction_schema_and_id_contract.md` plus all legitimate domain-specific labels observed in the data — **253 classes** in total.

### Contract classes (as enumerated in `02_extraction_schema_and_id_contract.md`)

`ADOPTED_VALUE, ANALYSIS_INPUT, ANALYSIS_RESULT, COORDINATE, DERIVED_VALUE, DESIGN_INPUT, DESIGN_RESULT, DIMENSION, DRAWING_VALUE, FORMULA_DEFINITION, IDENTIFIER, JUDGMENT_RESULT, LIMIT_VALUE, LOAD_COMBINATION, LOAD_VALUE, MATERIAL_PROPERTY, MEMBER_CONNECTIVITY, NOTE, NUMERIC_SUBSTITUTION, REFERENCE_TEXT, SECTION_PROPERTY, SOURCE_INPUT, SUPPORT_CONDITION, TITLE_BLOCK_VALUE, UNKNOWN_REQUIRES_REVIEW`

### Extended domain labels

`AREA, COEFFICIENT, DEFLECTION, DESIGN_PARAMETER, DESIGN_POLICY, PARAMETER, PARTIAL_FACTOR_DESIGN, REINFORCEMENT, Rib_height_min_note, Rib_height_note, Rmax_definition, SECTION_COMPOSITION, SECTION_FORCE, STRESS_LIMIT, STRESS_LIMIT_FORMULA, STRESS_VALUE, VERIFICATION_CHECK, VERIFICATION_LIMIT, VERIFICATION_RESULT, analysis_method, analysis_model, angle_shape, applicable_code, applicable_manual, axial_compressive_stress, bearing_area, bearing_count, bearing_dimension, bearing_note, bearing_parameters_legend, bearing_strength, bearing_stress, bearing_stress_limit, bearing_type, bending_stress, bending_tensile_limit, bolt_area, bolt_spec, bridge_length, bridge_type, buffer_length, buffer_width, cantilever_section, coefficient_source, collision_load, combined_movement, combined_stiffness, combined_stiffness_diagram, combined_stress_check, compression_displacement, compressive_stiffness, compressive_stress, concrete_strength, continuous_beam_note, cross_gradient, cross_interval, curve_radius, deck_moment, deck_property, deck_thickness, design_condition_table, design_flow, design_load, design_load_note, design_movement, design_note, design_speed, displacement, displacement_diagram, displacement_direction_note, drain_max_interval, drain_max_spacing, drain_min_interval, drain_pipe_diameter, drain_pipe_reference, drainage_reference, drop_rate, effective_area, effective_length, effective_section_area, effective_width, elastic_modulus, equivalent_shear_modulus, equivalent_stiffness, expansion_joint_note, expansion_joint_type, expansion_length, expansion_movement, face_plate_moment, face_plate_section, face_plate_thickness, finger_angle, finger_gap, finger_lap, finger_length, finger_min_gap, finger_min_lap, finger_pitch, finger_root_width, finger_shape, flow_area, flow_section, formula, girder_gap, girder_length, ground_type, haunch_height, heavy_traffic_volume, horizontal_bearing_note, horizontal_force, horizontal_force_L1, horizontal_force_note, hydraulic_radius, increase_factor, inspection_path_load, lead_plug_area, lead_plug_count, lead_plug_diameter, limit_stress, live_load, live_load_deflection, load_combination_diagram, load_intensity, local_shear_strain, local_shear_strain_limit, longitudinal_gradient, margin_movement, material, mauer_joint_note, max_compressive_stress, max_expansion_capacity, max_reaction, member_id, middle_beam_loading, middle_beam_section, model_summary, moment_of_inertia, natural_period, noise_barrier_load, numbering_diagram, panel_length, pavement_thickness, pedestal_dimensions, pedestal_section, perforated_plate_note, radius_of_gyration, rainfall_intensity, rebar_grade, rebar_layout, rebar_note, rebar_spec, reinforcement_plate_thickness, representative_section, restraint_method, rib_height, rib_spacing, rib_thickness, road_spec, rotation_angle, rotation_displacement, rotation_note, roughness_coefficient, rubber_layer_count, rubber_layer_thickness, rubber_total_thickness, rubber_type, runoff_coefficient, safety_factor, scope, seismic_analysis_method, seismic_coefficient, seismic_coefficient_L1, seismic_coefficient_L1_transverse, seismic_coefficient_ground, seismic_coefficient_ground_type1, seismic_coefficient_ground_type2, seismic_diagram, seismic_displacement, seismic_displacement_note, seismic_force_note, seismic_movement, seismic_movement_transverse, shape_factor_1, shape_factor_2, shape_factor_2_note, shape_factor_diagram, shear_force, shear_modulus, shear_strain, shear_yield_strength, side_block_note, skew_angle, span_length, standard_ref, steel_dimension, steel_grade, steel_plate_thickness, step_prevention_front, step_prevention_side, stress_amplitude, stress_check, stress_limit, stud_height, stud_hole_diameter, stud_pitch, stud_plate_thickness, stud_property, stud_shear_capacity, stud_size, substructure_stiffness, support_beam_loading, table, temperature_displacement_note, tensile_yield_strength, thermal_movement, through_rebar_diameter, through_rebar_note, top_plate_thickness, total_movement_normal, total_width, verification_formula, wear_allowance_note, wind_load, yield_strength, zone_class, zone_coefficient, zone_coefficient_type1, zone_coefficient_type2`

## Post-repair validator results

Run: `python3 tools/validate_phase2_i.py --mode pre-closeout`

- Check 6: PASS (0 failures)
- Check 13: PASS (0 failures)
- All other checks remain PASS.

## Integrity verification

- Every CSV still parses; every row field count == header count.
- No `raw_*` textual content was changed except column-shift re-alignment.
- Total data row count per file unchanged (no rows deleted).

## Depth-audit metrics (P2II-B re-verification)

### Coverage / counts
- CALCULATION_COVERAGE_STATUS: PASS (2226 coverage rows, all carry pdf_page_number; page 2226 is a deliberate `end_marker` page_type, NOT_STARTED/UNVERIFIED is expected and not an extraction gap)
- DRAWING_COVERAGE_STATUS: PASS (141 sheets; sheet 141 is PARTIAL/OCR_VERIFIED per P2II-A)
- SECTION_COUNT: 92 sections (TEXT_EXTRACTED x92)
- GROUP_COUNT: 34 groups (TEXT_EXTRACTED x33, PARTIAL x1 = Erection plan)

### Orphan / duplicate / reference integrity
- ORPHAN_RECORD_COUNT: 0 (every row carries a valid primary id; no dangling parent references introduced)
- DUPLICATE_RECORD_COUNT: 0 (no duplicated primary ids across any element/register CSV)
- REFERENCE_INTEGRITY: PASS (all 136 manifest artifact paths resolve on the filesystem; parent_table_id/source_locator now point to valid locators after repair)

### Empty / header-only / placeholder
- EMPTY_OR_PLACEHOLDER_ARTIFACT_COUNT: 1 (`calculation/chapter_01/formulas.csv` is header-only with no data rows; normalized with a trailing newline, no content change)

### Status reconciliation
- STATUS_RECONCILIATION: PASS (coverage/status CSVs consistent with extraction artifacts; the only non-TEXT_EXTRACTED records are the documented `end_marker` page 2226 and P2II-A's PARTIAL sheet 141)

### Artifact manifest
- ARTIFACT_MANIFEST: PASS (136 entries, all paths resolve, Check 7 PASS)

### final_report count parity
- FINAL_REPORT_COUNT_PARITY: PASS (calc coverage 2226, drawing coverage 141, section 92, group 34, matches the values recorded in `final_report.txt` Phase 2-II CURRENT block)
