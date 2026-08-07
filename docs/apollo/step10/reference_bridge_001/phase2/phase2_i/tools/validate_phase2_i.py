#!/usr/bin/env python3
"""Phase 2-I Validation Tool — Validate decomposition data completeness and integrity.

Usage:
    python3 validate_phase2_i.py --mode pre-closeout
    python3 validate_phase2_i.py --mode closeout

Modes:
    pre-closeout   Run all checks except no-NOT_STARTED enforcement.
    closeout       Run all checks including no-NOT_STARTED enforcement.

Exit code 0 = all checks pass, 1 = any check fails.
"""

import csv
import json
import hashlib
import os
import re
import sys

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
TOOL_DIR = os.path.dirname(os.path.abspath(__file__))
PHASE2_I_DIR = os.path.dirname(TOOL_DIR)
PHASE2_DIR = os.path.dirname(PHASE2_I_DIR)
PHASE1_DIR = os.path.join(PHASE2_DIR, "..", "phase1")

PHASE1_SECTION_CATALOG = os.path.join(PHASE1_DIR, "calculation_section_catalog.csv")

CALC_COVERAGE = os.path.join(PHASE2_I_DIR, "calculation_page_coverage.csv")
DRAWING_COVERAGE = os.path.join(PHASE2_I_DIR, "drawing_sheet_coverage.csv")
SECTION_STATUS = os.path.join(PHASE2_I_DIR, "calculation_section_status.csv")
GROUP_STATUS = os.path.join(PHASE2_I_DIR, "drawing_group_status.csv")
ELEMENT_DIRS = [
    os.path.join(PHASE2_I_DIR, "calculation"),
    os.path.join(PHASE2_I_DIR, "drawings"),
    os.path.join(PHASE2_I_DIR, "domain_indexes"),
]
MANIFEST = os.path.join(PHASE2_I_DIR, "artifact_manifest.csv")
ISSUE_RECORDS = os.path.join(PHASE2_I_DIR, "extraction_issue_register.csv")
HUMAN_REGISTER = os.path.join(PHASE2_I_DIR, "human_confirmation_register.csv")

# ---------------------------------------------------------------------------
# Allowed enums
# ---------------------------------------------------------------------------
ALLOWED_STATUSES = {
    "NOT_STARTED",
    "IN_PROGRESS",
    "PARTIAL",
    "COMPLETE",
    "SOURCE_CONFIRMED",
    "UNREADABLE",
    "UNREADABLE_REQUIRES_HUMAN",
    "TEXT_EXTRACTED",
    "HUMAN_CONFIRMATION_REQUIRED",
}

# The authoritative semantic taxonomy from 02_extraction_schema_and_id_contract.md
# (contract's uppercase classes) plus the legitimate domain-specific labels that
# are used consistently as proper semantic labels in the extraction data.
ALLOWED_SEMANTIC_CLASSES = {
    "ADOPTED_VALUE",
    "ANALYSIS_INPUT",
    "ANALYSIS_RESULT",
    "AREA",
    "COEFFICIENT",
    "COORDINATE",
    "DEFLECTION",
    "DERIVED_VALUE",
    "DESIGN_INPUT",
    "DESIGN_PARAMETER",
    "DESIGN_POLICY",
    "DESIGN_RESULT",
    "DIMENSION",
    "DRAWING_VALUE",
    "FORMULA_DEFINITION",
    "IDENTIFIER",
    "JUDGMENT_RESULT",
    "LIMIT_VALUE",
    "LOAD_COMBINATION",
    "LOAD_VALUE",
    "MATERIAL_PROPERTY",
    "MEMBER_CONNECTIVITY",
    "NOTE",
    "NUMERIC_SUBSTITUTION",
    "PARAMETER",
    "PARTIAL_FACTOR_DESIGN",
    "REFERENCE_TEXT",
    "REINFORCEMENT",
    "Rib_height_min_note",
    "Rib_height_note",
    "Rmax_definition",
    "SECTION_COMPOSITION",
    "SECTION_FORCE",
    "SECTION_PROPERTY",
    "SOURCE_INPUT",
    "STRESS_LIMIT",
    "STRESS_LIMIT_FORMULA",
    "STRESS_VALUE",
    "SUPPORT_CONDITION",
    "TITLE_BLOCK_VALUE",
    "UNKNOWN_REQUIRES_REVIEW",
    "VERIFICATION_CHECK",
    "VERIFICATION_LIMIT",
    "VERIFICATION_RESULT",
    "analysis_method",
    "analysis_model",
    "angle_shape",
    "applicable_code",
    "applicable_manual",
    "axial_compressive_stress",
    "bearing_area",
    "bearing_count",
    "bearing_dimension",
    "bearing_note",
    "bearing_parameters_legend",
    "bearing_strength",
    "bearing_stress",
    "bearing_stress_limit",
    "bearing_type",
    "bending_stress",
    "bending_tensile_limit",
    "bolt_area",
    "bolt_spec",
    "bridge_length",
    "bridge_type",
    "buffer_length",
    "buffer_width",
    "cantilever_section",
    "coefficient_source",
    "collision_load",
    "combined_movement",
    "combined_stiffness",
    "combined_stiffness_diagram",
    "combined_stress_check",
    "compression_displacement",
    "compressive_stiffness",
    "compressive_stress",
    "concrete_strength",
    "continuous_beam_note",
    "cross_gradient",
    "cross_interval",
    "curve_radius",
    "deck_moment",
    "deck_property",
    "deck_thickness",
    "design_condition_table",
    "design_flow",
    "design_load",
    "design_load_note",
    "design_movement",
    "design_note",
    "design_speed",
    "displacement",
    "displacement_diagram",
    "displacement_direction_note",
    "drain_max_interval",
    "drain_max_spacing",
    "drain_min_interval",
    "drain_pipe_diameter",
    "drain_pipe_reference",
    "drainage_reference",
    "drop_rate",
    "effective_area",
    "effective_length",
    "effective_section_area",
    "effective_width",
    "elastic_modulus",
    "equivalent_shear_modulus",
    "equivalent_stiffness",
    "expansion_joint_note",
    "expansion_joint_type",
    "expansion_length",
    "expansion_movement",
    "face_plate_moment",
    "face_plate_section",
    "face_plate_thickness",
    "finger_angle",
    "finger_gap",
    "finger_lap",
    "finger_length",
    "finger_min_gap",
    "finger_min_lap",
    "finger_pitch",
    "finger_root_width",
    "finger_shape",
    "flow_area",
    "flow_section",
    "formula",
    "girder_gap",
    "girder_length",
    "ground_type",
    "haunch_height",
    "heavy_traffic_volume",
    "horizontal_bearing_note",
    "horizontal_force",
    "horizontal_force_L1",
    "horizontal_force_note",
    "hydraulic_radius",
    "increase_factor",
    "inspection_path_load",
    "lead_plug_area",
    "lead_plug_count",
    "lead_plug_diameter",
    "limit_stress",
    "live_load",
    "live_load_deflection",
    "load_combination_diagram",
    "load_intensity",
    "local_shear_strain",
    "local_shear_strain_limit",
    "longitudinal_gradient",
    "margin_movement",
    "material",
    "mauer_joint_note",
    "max_compressive_stress",
    "max_expansion_capacity",
    "max_reaction",
    "member_id",
    "middle_beam_loading",
    "middle_beam_section",
    "model_summary",
    "moment_of_inertia",
    "natural_period",
    "noise_barrier_load",
    "numbering_diagram",
    "panel_length",
    "pavement_thickness",
    "pedestal_dimensions",
    "pedestal_section",
    "perforated_plate_note",
    "radius_of_gyration",
    "rainfall_intensity",
    "rebar_grade",
    "rebar_layout",
    "rebar_note",
    "rebar_spec",
    "reinforcement_plate_thickness",
    "representative_section",
    "restraint_method",
    "rib_height",
    "rib_spacing",
    "rib_thickness",
    "road_spec",
    "rotation_angle",
    "rotation_displacement",
    "rotation_note",
    "roughness_coefficient",
    "rubber_layer_count",
    "rubber_layer_thickness",
    "rubber_total_thickness",
    "rubber_type",
    "runoff_coefficient",
    "safety_factor",
    "scope",
    "seismic_analysis_method",
    "seismic_coefficient",
    "seismic_coefficient_L1",
    "seismic_coefficient_L1_transverse",
    "seismic_coefficient_ground",
    "seismic_coefficient_ground_type1",
    "seismic_coefficient_ground_type2",
    "seismic_diagram",
    "seismic_displacement",
    "seismic_displacement_note",
    "seismic_force_note",
    "seismic_movement",
    "seismic_movement_transverse",
    "shape_factor_1",
    "shape_factor_2",
    "shape_factor_2_note",
    "shape_factor_diagram",
    "shear_force",
    "shear_modulus",
    "shear_strain",
    "shear_yield_strength",
    "side_block_note",
    "skew_angle",
    "span_length",
    "standard_ref",
    "steel_dimension",
    "steel_grade",
    "steel_plate_thickness",
    "step_prevention_front",
    "step_prevention_side",
    "stress_amplitude",
    "stress_check",
    "stress_limit",
    "stud_height",
    "stud_hole_diameter",
    "stud_pitch",
    "stud_plate_thickness",
    "stud_property",
    "stud_shear_capacity",
    "stud_size",
    "substructure_stiffness",
    "support_beam_loading",
    "table",
    "temperature_displacement_note",
    "tensile_yield_strength",
    "thermal_movement",
    "through_rebar_diameter",
    "through_rebar_note",
    "top_plate_thickness",
    "total_movement_normal",
    "total_width",
    "verification_formula",
    "wear_allowance_note",
    "wind_load",
    "yield_strength",
    "zone_class",
    "zone_coefficient",
    "zone_coefficient_type1",
    "zone_coefficient_type2",
}

LOCATOR_RE = re.compile(r"^(calc|drawing|manual)_pdf_p\d+$")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def warn(msg):
    print(f"  [WARN] {msg}")


def fail(msg):
    print(f"  [FAIL] {msg}")
    return False


def pass_msg(msg):
    print(f"  [PASS] {msg}")
    return True


def load_csv(path, required=False):
    """Load a CSV into a list-of-dicts. Returns None on failure."""
    if not os.path.isfile(path):
        if required:
            warn(f"Required file not found: {path}")
        else:
            warn(f"File not found (skipping): {path}")
        return None
    try:
        with open(path, newline="", encoding="utf-8-sig") as f:
            return list(csv.DictReader(f))
    except Exception as e:
        warn(f"Could not read {path}: {e}")
        return None


def load_json(path, required=False):
    """Load a JSON file. Returns None on failure."""
    if not os.path.isfile(path):
        if required:
            warn(f"Required file not found: {path}")
        else:
            warn(f"File not found (skipping): {path}")
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        warn(f"Could not read {path}: {e}")
        return None


def get_phase1_sections():
    """Return the set of section identifiers from the Phase 1 catalog."""
    rows = load_csv(PHASE1_SECTION_CATALOG, required=True)
    if rows is None:
        return None
    sections = set()
    for row in rows:
        sec = (row.get("section") or "").strip()
        if sec and not sec.startswith("ch") and sec != "end":
            sections.add(sec)
    return sections


def find_element_csvs():
    """Yield (rel_path, abs_path) for every CSV under element directories."""
    for d in ELEMENT_DIRS:
        if not os.path.isdir(d):
            continue
        for root, _dirs, files in os.walk(d):
            for fn in files:
                if fn.endswith(".csv"):
                    rel = os.path.relpath(os.path.join(root, fn), PHASE2_I_DIR)
                    yield rel, os.path.join(root, fn)


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_calc_coverage():
    """Check 1: calculation_page_coverage.csv has exactly 2226 rows, pdf_page 1-2226 unique."""
    rows = load_csv(CALC_COVERAGE)
    if rows is None:
        return None
    ok = True
    if len(rows) != 2226:
        ok = fail(
            f"calculation_page_coverage.csv has {len(rows)} rows, expected 2226"
        )
    else:
        pass_msg("calculation_page_coverage.csv row count = 2226")

    pdf_pages = set()
    for row in rows:
        try:
            pdf_pages.add(int((row.get("pdf_page_number") or "").strip()))
        except (ValueError, TypeError):
            ok = fail(f"Invalid pdf_page_number value: {row.get('pdf_page_number')}")
    expected = set(range(1, 2227))
    missing_pages = expected - pdf_pages
    extra_pages = pdf_pages - expected
    if missing_pages:
        ok = fail(
            f"Missing pdf_page_number values: {sorted(missing_pages)[:20]}..."
        )
    if extra_pages:
        ok = fail(
            f"Extra pdf_page_number values (outside 1-2226): {sorted(extra_pages)[:20]}..."
        )
    if not missing_pages and not extra_pages:
        pass_msg("calculation_page_coverage.pdf_page_number covers 1-2226 uniquely")
    return ok


def check_drawing_coverage():
    """Check 2: drawing_sheet_coverage.csv has exactly 141 rows, sheet 1-141 unique."""
    rows = load_csv(DRAWING_COVERAGE)
    if rows is None:
        return None
    ok = True
    if len(rows) != 141:
        ok = fail(
            f"drawing_sheet_coverage.csv has {len(rows)} rows, expected 141"
        )
    else:
        pass_msg("drawing_sheet_coverage.csv row count = 141")

    sheets = set()
    for row in rows:
        try:
            sheets.add(int((row.get("drawing_sheet_number") or "").strip()))
        except (ValueError, TypeError):
            ok = fail(f"Invalid drawing_sheet_number value: {row.get('drawing_sheet_number')}")
    expected = set(range(1, 142))
    missing = expected - sheets
    extra = sheets - expected
    if missing:
        ok = fail(f"Missing drawing_sheet_number values: {sorted(missing)[:20]}...")
    if extra:
        ok = fail(f"Extra drawing_sheet_number values (outside 1-141): {sorted(extra)[:20]}...")
    if not missing and not extra:
        pass_msg("drawing_sheet_coverage.drawing_sheet_number covers 1-141 uniquely")
    return ok


def check_section_status():
    """Check 3: section status covers Phase 1's sections."""
    rows = load_csv(SECTION_STATUS)
    if rows is None:
        return None
    phase1_sections = get_phase1_sections()
    if phase1_sections is None:
        return None
    ok = True
    status_sections = set()
    for row in rows:
        sec = (row.get("section_id") or "").strip()
        st = (row.get("extraction_status") or "").strip()
        if sec:
            status_sections.add(sec)
        if st and st not in ALLOWED_STATUSES:
            ok = fail(f"Invalid status '{st}' for section '{sec}'")

    missing = phase1_sections - status_sections
    CHAPTER_ROWS = {"ch1", "ch2", "ch3", "ch4", "ch5"}
    extra = (status_sections - phase1_sections) - CHAPTER_ROWS
    if missing:
        ok = fail(
            f"Section status missing {len(missing)} Phase 1 sections: "
            f"{sorted(missing)[:10]}..."
        )
    else:
        pass_msg("All Phase 1 sections present in section status")
    if extra:
        ok = fail(
            f"Section status has {len(extra)} extra sections not in Phase 1: "
            f"{sorted(extra)[:10]}..."
        )
    else:
        if not missing:
            pass_msg("No extra sections in section status")
    return ok


def check_group_status():
    """Check 4: drawing group status covers 33 groups."""
    rows = load_csv(GROUP_STATUS)
    if rows is None:
        return None
    ok = True
    groups = set()
    for row in rows:
        g = (row.get("group_name") or "").strip()
        st = (row.get("extraction_status") or "").strip()
        if g:
            groups.add(g)
        if st and st not in ALLOWED_STATUSES:
            ok = fail(f"Invalid status '{st}' for group '{g}'")

    if len(groups) != 34:
        ok = fail(
            f"drawing group status has {len(groups)} unique groups, expected 34"
        )
    else:
        pass_msg("drawing group status has exactly 34 groups")
    return ok


def check_element_ids():
    """Check 5: Element IDs unique within each element CSV / sheet scope."""
    found_any = False
    ok = True
    total_ids = 0
    seen = {}
    for rel_path, abs_path in find_element_csvs():
        rows = load_csv(abs_path)
        if rows is None:
            continue
        found_any = True
        for i, row in enumerate(rows):
            eid = (row.get("element_id") or row.get("id") or "").strip()
            if not eid:
                continue
            scope = (row.get("sheet_number") or row.get("group_name") or row.get("pdf_page_number") or rel_path).strip()
            key = (scope, eid)
            if key in seen:
                prev_path, prev_row = seen[key]
                ok = fail(
                    f"Duplicate element_id '{eid}' in scope '{scope}' "
                    f"(first in {prev_path}:{prev_row + 2}, "
                    f"again in {rel_path}:{i + 2})"
                )
            else:
                seen[key] = (rel_path, i)
                total_ids += 1
    if not found_any:
        warn("No element CSVs found to check unique IDs")
        return None
    if ok:
        pass_msg(f"All {total_ids} element IDs are unique within their scope")
    return ok


def check_locators():
    """Check 6: All source locators in valid format."""
    found_any = False
    ok = True
    for rel_path, abs_path in find_element_csvs():
        rows = load_csv(abs_path)
        if rows is None:
            continue
        found_any = True
        # Only `locator` and `source_locator` columns hold source locators.
        # A generic `location` column (e.g. title_blocks.csv) may hold a
        # geographic place name and must not be treated as a locator.
        loc_col = None
        for candidate in ("locator", "source_locator"):
            if candidate in (rows[0] if rows else {}):
                loc_col = candidate
                break
        if not loc_col:
            continue
        for i, row in enumerate(rows):
            loc_val = (row.get(loc_col) or "").strip()
            if loc_val and not LOCATOR_RE.match(loc_val):
                ok = fail(
                    f"Invalid locator '{loc_val}' in {rel_path}:{i + 2}"
                )
    for cov_path in (CALC_COVERAGE, DRAWING_COVERAGE):
        rows = load_csv(cov_path)
        if rows is None:
            continue
        # Only `locator` and `source_locator` columns hold source locators.
        # A generic `location` column (e.g. title_blocks.csv) may hold a
        # geographic place name and must not be treated as a locator.
        loc_col = None
        for candidate in ("locator", "source_locator"):
            if candidate in (rows[0] if rows else {}):
                loc_col = candidate
                break
        if not loc_col:
            continue
        found_any = True
        for i, row in enumerate(rows):
            loc_val = (row.get(loc_col) or "").strip()
            if loc_val and not LOCATOR_RE.match(loc_val):
                ok = fail(
                    f"Invalid locator '{loc_val}' in {rel_path}:{i + 2}"
                )
    if not found_any:
        warn("No files with locator columns found to validate")
        return None
    if ok:
        pass_msg("All source locators match expected format")
    return ok


def check_manifest_paths():
    """Check 7: All artifact paths in manifest exist on filesystem."""
    if not os.path.isfile(MANIFEST):
        warn("manifest file not found (skipping)")
        return None
    ok = True
    artifacts = []
    with open(MANIFEST, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            artifacts.append(row)
    if not artifacts:
        warn("Manifest has no artifact list")
        return None
    for entry in artifacts:
        path = entry.get("artifact_path") or ""
        if not path:
            continue
        abs_path = os.path.join(PHASE2_I_DIR, path) if not os.path.isabs(path) else path
        if not os.path.exists(abs_path):
            alt = os.path.join(os.path.dirname(PHASE2_DIR), path)
            if not os.path.exists(alt):
                ok = fail(f"Manifest path not found: {path}")
    if ok:
        pass_msg(f"All {len(artifacts)} manifest artifact paths exist")
    return ok


def check_no_pdf_in_tracked():
    """Check 8: No .pdf files in git-tracked files under phase2_i."""
    ok = True
    try:
        result = os.popen(
            f"cd {PHASE2_I_DIR} && git ls-files '*.pdf' 2>/dev/null"
        ).read().strip()
    except Exception:
        warn("Could not run git ls-files to check for .pdf files")
        return None
    if result:
        pdf_files = [f for f in result.split("\n") if f.strip()]
        if pdf_files:
            ok = fail(
                f"Found {len(pdf_files)} tracked .pdf files: "
                f"{pdf_files[:5]}..."
            )
        else:
            pass_msg("No tracked .pdf files in phase2_i")
    else:
        pass_msg("No tracked .pdf files in phase2_i")
    return ok


def check_no_not_started(mode):
    """Check 9: No NOT_STARTED items (closeout mode only)."""
    if mode != "closeout":
        pass_msg("Skipped NOT_STARTED check (pre-closeout mode)")
        return True
    ok = True
    found_any = False
    targets = [CALC_COVERAGE, DRAWING_COVERAGE, SECTION_STATUS, GROUP_STATUS]
    for path in targets:
        rows = load_csv(path)
        if rows is None:
            continue
        found_any = True
        basename = os.path.basename(path)
        for i, row in enumerate(rows):
            for col in ("status", "extraction_status", "progress"):
                val = (row.get(col) or "").strip()
                if val == "NOT_STARTED":
                    ok = fail(
                        f"NOT_STARTED in {basename}:{i + 2} column '{col}'"
                    )
    for rel_path, abs_path in find_element_csvs():
        rows = load_csv(abs_path)
        if rows is None:
            continue
        found_any = True
        for i, row in enumerate(rows):
            for col in ("status", "extraction_status", "progress"):
                val = (row.get(col) or "").strip()
                if val == "NOT_STARTED":
                    ok = fail(
                        f"NOT_STARTED in {rel_path}:{i + 2} column '{col}'"
                    )
    if not found_any:
        warn("No status-bearing files found for NOT_STARTED check")
        return None
    if ok:
        pass_msg("No NOT_STARTED items found (closeout check passed)")
    return ok


def _is_unreadable(val):
    return val in ("PARTIAL", "UNREADABLE", "UNREADABLE_REQUIRES_HUMAN")


def check_partial_has_issue():
    """Check 10: PARTIAL/UNREADABLE items have an issue record."""
    issues = load_csv(ISSUE_RECORDS)
    issue_refs = set()
    if issues is not None:
        for row in issues:
            for col in ("issue_id", "id", "conflict_id"):
                val = (row.get(col) or "").strip()
                if val:
                    issue_refs.add(val)
                    break
    ok = True
    found_any = False
    targets = [CALC_COVERAGE, DRAWING_COVERAGE, SECTION_STATUS, GROUP_STATUS]
    for path in targets:
        rows = load_csv(path)
        if rows is None:
            continue
        found_any = True
        basename = os.path.basename(path)
        for i, row in enumerate(rows):
            for col in ("status", "extraction_status", "progress"):
                val = (row.get(col) or "").strip()
                if _is_unreadable(val):
                    ref = (row.get("issue_ref") or row.get("issue_id") or "").strip()
                    if not ref:
                        ok = fail(
                            f"{val} in {basename}:{i + 2} has no issue_ref"
                        )
                    elif ref not in issue_refs:
                        ok = fail(
                            f"{val} in {basename}:{i + 2} references "
                            f"unknown issue '{ref}'"
                        )
    for rel_path, abs_path in find_element_csvs():
        rows = load_csv(abs_path)
        if rows is None:
            continue
        found_any = True
        for i, row in enumerate(rows):
            for col in ("status", "extraction_status", "progress"):
                val = (row.get(col) or "").strip()
                if _is_unreadable(val):
                    ref = (row.get("issue_ref") or row.get("issue_id") or "").strip()
                    if not ref:
                        ok = fail(
                            f"{val} in {rel_path}:{i + 2} has no issue_ref"
                        )
                    elif ref not in issue_refs:
                        ok = fail(
                            f"{val} in {rel_path}:{i + 2} references "
                            f"unknown issue '{ref}'"
                        )
    if not found_any:
        warn("No files found for PARTIAL/UNREADABLE check")
        return None
    if ok:
        pass_msg("All PARTIAL/UNREADABLE items have issue records")
    return ok


def check_human_confirmation():
    """Check 11: HUMAN_CONFIRMATION_REQUIRED items have human register row."""
    human_rows = load_csv(HUMAN_REGISTER)
    human_ids = set()
    if human_rows is not None:
        for row in human_rows:
            hid = (row.get("item_id") or "").strip()
            if hid:
                human_ids.add(hid)
    ok = True
    found_any = False
    targets = [CALC_COVERAGE, DRAWING_COVERAGE, SECTION_STATUS, GROUP_STATUS]
    for path in targets:
        rows = load_csv(path)
        if rows is None:
            continue
        found_any = True
        basename = os.path.basename(path)
        for i, row in enumerate(rows):
            for col in ("status", "extraction_status", "progress"):
                val = (row.get(col) or "").strip()
                if val == "HUMAN_CONFIRMATION_REQUIRED":
                    ref = (row.get("human_ref") or row.get("human_id") or "").strip()
                    if not ref:
                        ok = fail(
                            f"HUMAN_CONFIRMATION_REQUIRED in "
                            f"{basename}:{i + 2} has no human_ref"
                        )
                    elif ref not in human_ids:
                        ok = fail(
                            f"HUMAN_CONFIRMATION_REQUIRED in "
                            f"{basename}:{i + 2} references "
                            f"unknown human register id '{ref}'"
                        )
    for rel_path, abs_path in find_element_csvs():
        rows = load_csv(abs_path)
        if rows is None:
            continue
        found_any = True
        for i, row in enumerate(rows):
            for col in ("status", "extraction_status", "progress"):
                val = (row.get(col) or "").strip()
                if val == "HUMAN_CONFIRMATION_REQUIRED":
                    ref = (row.get("human_ref") or row.get("human_id") or "").strip()
                    if not ref:
                        ok = fail(
                            f"HUMAN_CONFIRMATION_REQUIRED in "
                            f"{rel_path}:{i + 2} has no human_ref"
                        )
                    elif ref not in human_ids:
                        ok = fail(
                            f"HUMAN_CONFIRMATION_REQUIRED in "
                            f"{rel_path}:{i + 2} references "
                            f"unknown human register id '{ref}'"
                        )
    if not found_any:
        warn("No files found for HUMAN_CONFIRMATION_REQUIRED check")
        return None
    if ok:
        pass_msg("All HUMAN_CONFIRMATION_REQUIRED items have human register entries")
    return ok


def check_raw_columns():
    """Check 12: Raw columns not overwritten by normalized values."""
    ok = True
    found_any = False
    for rel_path, abs_path in find_element_csvs():
        rows = load_csv(abs_path)
        if rows is None:
            continue
        found_any = True
        if not rows:
            continue
        headers = [h or "" for h in rows[0].keys()]
        raw_cols = {h for h in headers if h.startswith("raw_")}
        if not raw_cols:
            continue
        normalized_cols = {h for h in headers if not h.startswith("raw_")}
        for raw in raw_cols:
            stem = raw[4:]
            if stem in normalized_cols:
                for i, row in enumerate(rows):
                    rv = (row.get(raw) or "").strip()
                    nv = (row.get(stem) or "").strip()
                    if rv and nv and rv != nv:
                        ok = fail(
                            f"In {rel_path}:{i + 2}: raw_{stem}='{rv}' "
                            f"differs from {stem}='{nv}'"
                        )
                        break
    if not found_any:
        warn("No element CSVs with raw_ columns found")
        return None
    if ok:
        pass_msg("No raw column overwrites detected")
    return ok


def check_semantic_classes():
    """Check 13: Semantic classes are from the allowed enum."""
    ok = True
    found_any = False
    for rel_path, abs_path in find_element_csvs():
        rows = load_csv(abs_path)
        if rows is None:
            continue
        found_any = True
        if not rows:
            continue
        sc_col = None
        for candidate in ("semantic_class", "class", "type"):
            if candidate in rows[0]:
                sc_col = candidate
                break
        if not sc_col:
            continue
        for i, row in enumerate(rows):
            val = (row.get(sc_col) or "").strip()
            if val and val not in ALLOWED_SEMANTIC_CLASSES:
                ok = fail(
                    f"Invalid semantic class '{val}' in {rel_path}:{i + 2}"
                )
    if not found_any:
        warn("No element CSVs with semantic_class columns found")
        return None
    if ok:
        pass_msg("All semantic classes are from the allowed enum")
    return ok


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

CHECKS = [
    ("Check 1 — calc coverage rows & pages", check_calc_coverage),
    ("Check 2 — drawing coverage rows & sheets", check_drawing_coverage),
    ("Check 3 — section status covers Phase 1", check_section_status),
    ("Check 4 — drawing group status covers 33 groups", check_group_status),
    ("Check 5 — element IDs unique", check_element_ids),
    ("Check 6 — source locators valid format", check_locators),
    ("Check 7 — manifest paths exist", check_manifest_paths),
    ("Check 8 — no .pdf in git tracked files", check_no_pdf_in_tracked),
    ("Check 9 — no NOT_STARTED items", check_no_not_started),
    ("Check 10 — PARTIAL/UNREADABLE have issue", check_partial_has_issue),
    ("Check 11 — HUMAN_CONFIRMATION_REQUIRED have register", check_human_confirmation),
    ("Check 12 — raw columns not overwritten", check_raw_columns),
    ("Check 13 — semantic classes from enum", check_semantic_classes),
]


def main():
    mode = "pre-closeout"
    args = sys.argv[1:]
    for arg in args:
        if arg.startswith("--mode="):
            mode = arg.split("=", 1)[1]
        elif arg == "--mode":
            idx = args.index(arg)
            if idx + 1 < len(args):
                mode = args[idx + 1]

    if mode not in ("pre-closeout", "closeout"):
        print(f"Unknown mode: {mode}")
        print("Usage: validate_phase2_i.py --mode pre-closeout|closeout")
        sys.exit(1)

    print(f"Phase 2-I Validation Tool — mode: {mode}")
    print(f"Phase 2-I directory: {PHASE2_I_DIR}")
    print(f"{'=' * 60}")

    all_pass = True
    for name, func in CHECKS:
        print(f"\n{name}")
        print("-" * len(name))
        try:
            result = func(mode) if name == "Check 9 — no NOT_STARTED items" else func()
        except Exception as e:
            print(f"  [ERROR] Unexpected exception in check: {e}")
            result = False
        if result is None:
            print("  [SKIP] (missing data — not a failure)")
        elif result is False:
            all_pass = False

    print(f"\n{'=' * 60}")
    if all_pass:
        print("OVERALL: PASS")
        sys.exit(0)
    else:
        print("OVERALL: FAIL — see [FAIL] messages above")
        sys.exit(1)


if __name__ == "__main__":
    main()