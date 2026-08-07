#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 2-II Candidate Layer Generator (PR-1: Source + Input + Geometry +
Structural Model + Load + Analysis candidate layers).

Authority: STEP 10 Reference Bridge 001 (RB-S10-001) - Phase 2-II.
Development approach: documentation-only / data-only.
Numeric analysis: NO (recalculation prohibited).

Reads the Phase 2-I source decomposition (element CSVs + curated domain
indexes + Phase 2-II-A unread-resolution records) and emits candidate CSVs
under `candidates/{source,input,geometry,structural_model,load,analysis}/`.

Python 3.10, stdlib only. Deterministic and idempotent.
"""

from __future__ import annotations

import csv
import glob
import os
import re
import sys
from collections import Counter

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
P2II = os.path.dirname(HERE)
P2I = os.path.join(os.path.dirname(P2II), "phase2_i")

CONTRACTS = os.path.join(P2II, "contracts")
CAND_DIR = os.path.join(P2II, "candidates")
OUT = {
    "source": os.path.join(CAND_DIR, "source"),
    "input": os.path.join(CAND_DIR, "input"),
    "geometry": os.path.join(CAND_DIR, "geometry"),
    "structural_model": os.path.join(CAND_DIR, "structural_model"),
    "load": os.path.join(CAND_DIR, "load"),
    "analysis": os.path.join(CAND_DIR, "analysis"),
}
UNREAD_DIR = os.path.join(P2II, "unread_resolution")

CANDIDATE_HEADER = [
    "candidate_id", "entity_id", "candidate_layer", "field_path_candidate",
    "semantic_class", "raw_value", "raw_unit", "normalized_value",
    "normalized_unit", "normalization_rule_id", "source_record_ids",
    "calculation_locator", "drawing_locator", "confidence",
    "verification_status", "parity_status", "adoption_status", "issue_id",
    "conflict_id", "human_confirmation_id", "phase3_action", "notes",
]

# ---------------------------------------------------------------------------
# Candidate enums (loaded from contracts/candidate_enums.csv)
# ---------------------------------------------------------------------------
SEMANTIC_CLASSES = set()
VERIFICATION_STATUSES = set()
PARITY_STATUSES = set()
ADOPTION_STATUSES = set()
CONFIDENCES = set()
PHASE3_ACTIONS = set()


def load_enums():
    path = os.path.join(CONTRACTS, "candidate_enums.csv")
    with open(path, encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            etype = row["enum_type"]
            val = row["enum_value"]
            if etype == "semantic_class":
                SEMANTIC_CLASSES.add(val)
            elif etype == "verification_status":
                VERIFICATION_STATUSES.add(val)
            elif etype == "parity_status":
                PARITY_STATUSES.add(val)
            elif etype == "adoption_status":
                ADOPTION_STATUSES.add(val)
            elif etype == "confidence":
                CONFIDENCES.add(val)
            elif etype == "phase3_action":
                PHASE3_ACTIONS.add(val)


# ---------------------------------------------------------------------------
# Source semantic-class -> candidate-enum mapping
# ---------------------------------------------------------------------------
SEM_MAP = {
    "AREA": "SECTION_PROPERTY",
    "COEFFICIENT": "DERIVED_VALUE",
    "DEFLECTION": "deflection",
    "DESIGN_PARAMETER": "DESIGN_INPUT",
    "DESIGN_POLICY": "NOTE",
    "PARTIAL_FACTOR_DESIGN": "DESIGN_INPUT",
    "REINFORCEMENT": "MATERIAL_PROPERTY",
    "SECTION_COMPOSITION": "SECTION_PROPERTY",
    "SECTION_FORCE": "member_force",
    "STRESS_LIMIT": "stress_limit",
    "STRESS_LIMIT_FORMULA": "FORMULA_DEFINITION",
    "STRESS_VALUE": "DESIGN_RESULT",
    "VERIFICATION_RESULT": "DESIGN_RESULT",
    "VERIFICATION_CHECK": "DESIGN_RESULT",
    "VERIFICATION_LIMIT": "stress_limit",
    "VERIFICATION_FORMULA": "FORMULA_DEFINITION",
    "analysis_method": "NOTE",
    "analysis_model": "NOTE",
    "angle_shape": "SECTION_PROPERTY",
    "axial_compressive_stress": "DESIGN_RESULT",
    "bearing_area": "SECTION_PROPERTY",
    "bearing_count": "DERIVED_VALUE",
    "bearing_dimension": "DIMENSION",
    "bearing_note": "NOTE",
    "bearing_parameters_legend": "NOTE",
    "bearing_strength": "MATERIAL_PROPERTY",
    "bearing_stress": "DESIGN_RESULT",
    "bearing_stress_limit": "stress_limit",
    "bending_stress": "bending_stress",
    "bending_tensile_limit": "stress_limit",
    "bolt_area": "SECTION_PROPERTY",
    "bolt_spec": "IDENTIFIER",
    "buffer_length": "DIMENSION",
    "buffer_width": "DIMENSION",
    "cantilever_section": "SECTION_PROPERTY",
    "coefficient_source": "REFERENCE_TEXT",
    "collision_load": "LOAD_VALUE",
    "combined_movement": "DERIVED_VALUE",
    "combined_stiffness": "MATERIAL_PROPERTY",
    "combined_stiffness_diagram": "figure",
    "combined_stress_check": "DESIGN_RESULT",
    "compression_displacement": "deflection",
    "compressive_stiffness": "MATERIAL_PROPERTY",
    "compressive_stress": "DESIGN_RESULT",
    "continuous_beam_note": "NOTE",
    "deck_moment": "member_force",
    "deck_property": "SECTION_PROPERTY",
    "design_condition_table": "table",
    "design_flow": "NOTE",
    "design_load": "LOAD_VALUE",
    "design_load_note": "NOTE",
    "design_movement": "DERIVED_VALUE",
    "design_note": "NOTE",
    "displacement": "deflection",
    "displacement_diagram": "figure",
    "displacement_direction_note": "NOTE",
    "drain_max_interval": "DIMENSION",
    "drain_max_spacing": "DIMENSION",
    "drain_min_interval": "DIMENSION",
    "drain_pipe_diameter": "DIMENSION",
    "drain_pipe_reference": "REFERENCE_TEXT",
    "drainage_reference": "REFERENCE_TEXT",
    "drop_rate": "DERIVED_VALUE",
    "effective_area": "SECTION_PROPERTY",
    "effective_length": "DIMENSION",
    "effective_section_area": "SECTION_PROPERTY",
    "equivalent_shear_modulus": "MATERIAL_PROPERTY",
    "equivalent_stiffness": "MATERIAL_PROPERTY",
    "expansion_joint_note": "NOTE",
    "expansion_joint_type": "IDENTIFIER",
    "expansion_length": "DIMENSION",
    "expansion_movement": "DERIVED_VALUE",
    "face_plate_moment": "member_force",
    "face_plate_section": "SECTION_PROPERTY",
    "face_plate_thickness": "DIMENSION",
    "finger_angle": "DIMENSION",
    "finger_gap": "DIMENSION",
    "finger_lap": "DIMENSION",
    "finger_length": "DIMENSION",
    "finger_min_gap": "DIMENSION",
    "finger_min_lap": "DIMENSION",
    "finger_pitch": "DIMENSION",
    "finger_root_width": "DIMENSION",
    "finger_shape": "SECTION_PROPERTY",
    "flow_area": "SECTION_PROPERTY",
    "flow_section": "SECTION_PROPERTY",
    "formula": "FORMULA_DEFINITION",
    "girder_gap": "DIMENSION",
    "ground_type": "SOURCE_INPUT",
    "haunch_height": "DIMENSION",
    "heavy_traffic_volume": "SOURCE_INPUT",
    "horizontal_bearing_note": "NOTE",
    "horizontal_force": "LOAD_VALUE",
    "horizontal_force_L1": "LOAD_VALUE",
    "horizontal_force_note": "NOTE",
    "hydraulic_radius": "SECTION_PROPERTY",
    "increase_factor": "DERIVED_VALUE",
    "inspection_path_load": "LOAD_VALUE",
    "lead_plug_area": "SECTION_PROPERTY",
    "lead_plug_count": "DERIVED_VALUE",
    "lead_plug_diameter": "DIMENSION",
    "limit_stress": "stress_limit",
    "live_load_deflection": "deflection",
    "load_combination_diagram": "figure",
    "load_intensity": "load_intensity",
    "local_shear_strain": "DESIGN_RESULT",
    "local_shear_strain_limit": "stress_limit",
    "margin_movement": "DERIVED_VALUE",
    "material": "MATERIAL_PROPERTY",
    "max_compressive_stress": "DESIGN_RESULT",
    "max_expansion_capacity": "DIMENSION",
    "max_reaction": "reaction",
    "middle_beam_loading": "LOAD_VALUE",
    "middle_beam_section": "SECTION_PROPERTY",
    "moment_of_inertia": "SECTION_PROPERTY",
    "natural_period": "DERIVED_VALUE",
    "noise_barrier_load": "LOAD_VALUE",
    "pavement_thickness": "DIMENSION",
    "pedestal_dimensions": "DIMENSION",
    "pedestal_section": "SECTION_PROPERTY",
    "perforated_plate_note": "NOTE",
    "radius_of_gyration": "SECTION_PROPERTY",
    "rainfall_intensity": "LOAD_VALUE",
    "rebar_grade": "MATERIAL_PROPERTY",
    "rebar_layout": "DIMENSION",
    "rebar_note": "NOTE",
    "rebar_spec": "IDENTIFIER",
    "reinforcement_plate_thickness": "DIMENSION",
    "representative_section": "SECTION_PROPERTY",
    "rib_height": "DIMENSION",
    "rib_spacing": "DIMENSION",
    "rib_thickness": "DIMENSION",
    "rotation_angle": "rotation",
    "rotation_displacement": "rotation",
    "rotation_note": "NOTE",
    "roughness_coefficient": "DERIVED_VALUE",
    "rubber_layer_count": "DERIVED_VALUE",
    "rubber_layer_thickness": "DIMENSION",
    "rubber_total_thickness": "DIMENSION",
    "rubber_type": "IDENTIFIER",
    "runoff_coefficient": "DERIVED_VALUE",
    "safety_factor": "DERIVED_VALUE",
    "scope": "NOTE",
    "seismic_analysis_method": "SOURCE_INPUT",
    "seismic_coefficient": "DERIVED_VALUE",
    "seismic_coefficient_L1": "SOURCE_INPUT",
    "seismic_coefficient_L1_transverse": "SOURCE_INPUT",
    "seismic_coefficient_ground": "SOURCE_INPUT",
    "seismic_coefficient_ground_type1": "SOURCE_INPUT",
    "seismic_coefficient_ground_type2": "SOURCE_INPUT",
    "seismic_diagram": "figure",
    "seismic_displacement": "deflection",
    "seismic_displacement_note": "NOTE",
    "seismic_force_note": "NOTE",
    "seismic_movement": "deflection",
    "seismic_movement_transverse": "deflection",
    "shape_factor_1": "SECTION_PROPERTY",
    "shape_factor_2": "SECTION_PROPERTY",
    "shape_factor_2_note": "NOTE",
    "shape_factor_diagram": "figure",
    "shear_force": "member_force",
    "shear_strain": "DESIGN_RESULT",
    "shear_yield_strength": "MATERIAL_PROPERTY",
    "side_block_note": "NOTE",
    "standard_ref": "REFERENCE_TEXT",
    "steel_dimension": "SECTION_PROPERTY",
    "steel_plate_thickness": "DIMENSION",
    "step_prevention_front": "DIMENSION",
    "step_prevention_side": "DIMENSION",
    "stress_amplitude": "DESIGN_RESULT",
    "stress_check": "DESIGN_RESULT",
    "stud_height": "DIMENSION",
    "stud_hole_diameter": "DIMENSION",
    "stud_pitch": "DIMENSION",
    "stud_plate_thickness": "DIMENSION",
    "stud_property": "SECTION_PROPERTY",
    "stud_shear_capacity": "DESIGN_RESULT",
    "stud_size": "DIMENSION",
    "substructure_stiffness": "MATERIAL_PROPERTY",
    "support_beam_loading": "LOAD_VALUE",
    "temperature_displacement_note": "NOTE",
    "tensile_yield_strength": "MATERIAL_PROPERTY",
    "thermal_movement": "deflection",
    "through_rebar_diameter": "DIMENSION",
    "through_rebar_note": "NOTE",
    "top_plate_thickness": "DIMENSION",
    "total_movement_normal": "deflection",
    "verification_formula": "FORMULA_DEFINITION",
    "wear_allowance_note": "NOTE",
    "wind_load": "LOAD_VALUE",
    "zone_class": "SOURCE_INPUT",
    "zone_coefficient": "DERIVED_VALUE",
    "zone_coefficient_type1": "DERIVED_VALUE",
    "zone_coefficient_type2": "DERIVED_VALUE",
}

# lowercase phase2_i classes that are already enum members (kept as-is)
_LOWER_PASS = {
    "road_spec", "design_speed", "live_load", "bridge_type", "bridge_length",
    "girder_length", "span_length", "total_width", "effective_width",
    "girder_spacing", "deck_overhang", "girder_height", "curve_radius",
    "skew_angle", "cross_gradient", "longitudinal_gradient", "deck_thickness",
    "steel_grade", "concrete_strength", "yield_strength", "shear_modulus",
    "elastic_modulus", "member_id", "panel_length", "cross_interval",
    "load_intensity", "reaction", "deflection", "rotation", "member_force",
    "bending_stress", "shear_stress", "combined_stress", "stress_limit",
    "check_ratio", "judgment", "applicable_code", "applicable_manual",
    "bearing_type", "restraint_method", "camber", "appurtenance",
    "text", "table", "figure",
}


def map_semantic(sc):
    """Return a candidate-enum semantic class for a source class string."""
    if not sc:
        return "UNKNOWN_REQUIRES_REVIEW"
    sc = sc.strip()
    if sc in SEMANTIC_CLASSES:
        return sc
    if sc in _LOWER_PASS:
        return sc
    if sc in SEM_MAP:
        return SEM_MAP[sc]
    low = sc.lower()
    if low in _LOWER_PASS:
        return low
    for key, val in SEM_MAP.items():
        if key.lower() == low:
            return val
    if "stress" in low or "strain" in low:
        return "DESIGN_RESULT"
    if "load" in low:
        return "LOAD_VALUE"
    if ("width" in low or "length" in low or "height" in low or
            "thickness" in low or "depth" in low or "dimension" in low):
        return "DIMENSION"
    if ("area" in low or "inertia" in low or "section" in low or
            "modulus" in low or "radius" in low):
        return "SECTION_PROPERTY"
    if ("strength" in low or "yield" in low or "grade" in low or
            "modulus" in low or "material" in low):
        return "MATERIAL_PROPERTY"
    if ("note" in low or "policy" in low or "method" in low or "model" in low or
            "legend" in low or "diagram" in low):
        return "NOTE"
    if ("coefficient" in low or "ratio" in low or "factor" in low or
            "coeff" in low):
        return "DERIVED_VALUE"
    if ("force" in low or "moment" in low or "shear" in low or "axial" in low or
            "reaction" in low):
        return "member_force"
    if ("displacement" in low or "deflection" in low or "movement" in low):
        return "deflection"
    return "UNKNOWN_REQUIRES_REVIEW"


# ---------------------------------------------------------------------------
# Normalization per normalization_contract.md
# ---------------------------------------------------------------------------
def _fmt(val):
    if val == int(val) and abs(val) < 1e15:
        return str(int(val))
    s = f"{val:.6f}".rstrip("0").rstrip(".")
    return s if s else "0"


def normalize(raw_value, raw_unit):
    """Return (normalized_value, normalized_unit, normalization_rule_id)."""
    rv = (raw_value or "").strip()
    ru = (raw_unit or "").strip()
    if rv == "":
        return "", "", "NONE"

    def is_num(s):
        try:
            float(s.replace(",", ""))
            return True
        except (ValueError, TypeError):
            return False

    if ru in ("mm",):
        if is_num(rv):
            try:
                val = float(rv.replace(",", "")) / 1000.0
                return _fmt(val), "m", "NOR-002"
            except (ValueError, TypeError):
                return rv, "m", "NOR-002"
        return rv, "m", "NOR-002"
    if ru in ("m",):
        return rv, "m", "NOR-001"
    if ru in ("kN",):
        return rv, "kN", "NOR-003"
    if ru in ("kN/m",):
        return rv, "kN/m", "NOR-004"
    if ru in ("kN/m2", "kN/m\u00b2"):
        return rv, "kN/m2", "NOR-005"
    if ru in ("kN/m3",):
        return rv, "kN/m3", "NOR-006"
    if ru in ("N/mm2", "N/mm\u00b2"):
        return rv, "N/mm2", "NOR-007"
    if ru in ("degree", "deg", "\u00b0", "\u5ea6"):
        return rv, "deg", "NOR-008"
    if ru in ("kNm", "kN\u00b7m", "kN\u30fbm", "kN-m"):
        return rv, "kN\u00b7m", "NOR-012"
    if ru in ("kN/mm",):
        return rv, "kN/mm", "NOR-013"
    if ru in ("%",):
        return rv, ru, "NOR-009"
    if ru in ("\u672c", "\u57fa", "\u500b", "\u53f0/\u65e5\uff65\u65b9\u5411",
              "\u53f0/\u65e5/\u8eca\u7dda", "\u5c64", "\u7b87\u6240", "\u679a",
              "\u5f3e"):
        return rv, ru, "NOR-010"
    if ru == "":
        if is_num(rv):
            return rv, "", "NOR-009"
        return rv, "", "NOR-011"
    return rv, ru, "NONE"


# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------
def read_csv(path):
    with open(path, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def write_csv(path, header, rows):
    with open(path, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=header, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: (row.get(k) if row.get(k) is not None else "")
                             for k in header})
    print(f"  wrote {len(rows):5d} rows -> "
          f"{os.path.relpath(path, P2II)}")


def sget(row, *keys):
    for k in keys:
        if k in row and row[k] is not None and str(row[k]).strip() != "":
            return str(row[k]).strip()
    return ""


_ID_COUNTERS = {"INP": 0, "GEO": 0, "SM": 0, "LD": 0, "AN": 0}


def next_id(prefix):
    _ID_COUNTERS[prefix] += 1
    return f"{prefix}-{_ID_COUNTERS[prefix]:03d}"


def make_candidate(candidate_id, entity_id, layer, field_path, sem, raw_value,
                   raw_unit, source_record_ids, calc_locator, drawing_locator,
                   confidence, verification_status, parity_status,
                   adoption_status, phase3_action, notes="", issue_id="",
                   conflict_id="", human_confirmation_id=""):
    nv, nu, nrule = normalize(raw_value, raw_unit)
    return {
        "candidate_id": candidate_id,
        "entity_id": entity_id,
        "candidate_layer": layer,
        "field_path_candidate": field_path,
        "semantic_class": sem,
        "raw_value": raw_value or "",
        "raw_unit": raw_unit or "",
        "normalized_value": nv,
        "normalized_unit": nu,
        "normalization_rule_id": nrule,
        "source_record_ids": source_record_ids or "",
        "calculation_locator": calc_locator or "",
        "drawing_locator": drawing_locator or "",
        "confidence": confidence,
        "verification_status": verification_status,
        "parity_status": parity_status,
        "adoption_status": adoption_status,
        "issue_id": issue_id,
        "conflict_id": conflict_id,
        "human_confirmation_id": human_confirmation_id,
        "phase3_action": phase3_action,
        "notes": notes or "",
    }


def calc_loc(pdf_page):
    if not pdf_page:
        return ""
    return f"calc_pdf_p{pdf_page}"


def dwg_loc(sheet):
    if not sheet:
        return ""
    sheet = str(sheet).strip()
    if sheet == "all":
        return "DWG-S001"
    try:
        return f"DWG-S{int(sheet):03d}"
    except (ValueError, TypeError):
        return f"DWG-S{sheet}"


def sheet_to_pdf(sheet):
    if not sheet:
        return ""
    sheet = str(sheet).strip()
    if sheet == "all":
        return "3"
    try:
        return str(int(sheet) + 2)
    except (ValueError, TypeError):
        return ""


# ===========================================================================
# 1. SOURCE LAYER
# ===========================================================================
def build_source_layer(log):
    """Build the six source catalogs from element CSVs + domain indexes +
    unread-resolution records."""
    src_catalog = []
    val_catalog = []
    fml_catalog = []
    tbl_catalog = []
    fig_catalog = []
    note_catalog = []

    calc_files = sorted(
        glob.glob(os.path.join(P2I, "calculation", "**", "*.csv"), recursive=True))
    draw_files = sorted(
        glob.glob(os.path.join(P2I, "drawings", "**", "*.csv"), recursive=True))
    idx_files = sorted(glob.glob(os.path.join(P2I, "domain_indexes", "*.csv")))
    unread_files = sorted(glob.glob(os.path.join(UNREAD_DIR, "*.csv")))

    drawing_seq = {}

    def next_dwg_seq(key, sheet):
        k = (key.split("/")[-1], sheet)
        drawing_seq[k] = drawing_seq.get(k, 0) + 1
        return drawing_seq[k]

    # ---------------- calculation element CSVs ----------------
    for path in calc_files:
        rel = os.path.relpath(path, P2I)
        base = os.path.basename(path)
        kind = base.replace(".csv", "")
        rows = read_csv(path)
        for i, r in enumerate(rows):
            rid = ""
            force_src = ("section_3_2" in rel.replace(os.sep, "/"))
            if force_src:
                rid = ""
            if kind == "values":
                rid = sget(r, "value_id")
                st = "value"
            elif kind == "tables":
                rid = sget(r, "table_id")
                st = "table"
            elif kind == "formulas":
                rid = sget(r, "formula_id")
                st = "formula"
            elif kind == "notes":
                rid = sget(r, "note_id")
                st = "note"
            elif kind == "figures":
                rid = sget(r, "figure_id")
                st = "figure"
            elif kind == "page_elements":
                rid = sget(r, "element_id")
                st = "page_element"
            else:
                rid = ""
                st = kind

            if not rid or force_src:
                stem = rel.replace(".csv", "").replace("/", "_").replace(".", "-")
                rid = f"SRC-{stem}-{i + 1:03d}"

            pdf = sget(r, "pdf_page_number", "pdf_page")
            printed = sget(r, "printed_page_number", "printed_page")
            ch = sget(r, "chapter_id")
            sec = sget(r, "section_id", "subsection")
            loc = sget(r, "source_locator") or calc_loc(pdf)
            sem = map_semantic(sget(r, "semantic_class"))
            conf = sget(r, "confidence") or "HIGH"
            vs = sget(r, "verification_status") or "UNVERIFIED"
            notes = ""
            if kind == "page_elements":
                notes = sget(r, "notes", "title_raw", "content_summary")
            elif kind == "figures":
                notes = sget(r, "notes", "description")
            elif kind == "values":
                notes = sget(r, "label_raw", "parameter")
            elif kind == "tables":
                notes = sget(r, "title_raw", "table_title")
            elif kind == "formulas":
                notes = sget(r, "formula_label_raw", "description")

            src_catalog.append({
                "source_record_id": rid,
                "source_type": st,
                "pdf_page_number": pdf,
                "printed_page_number": printed,
                "chapter_id": ch,
                "section_id": sec,
                "source_locator": loc,
                "semantic_class": sem,
                "confidence": conf,
                "verification_status": vs,
                "notes": notes,
            })

            if kind == "values":
                val_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": pdf,
                    "label_raw": sget(r, "label_raw", "parameter"),
                    "raw_value": sget(r, "raw_value", "value"),
                    "raw_unit": sget(r, "raw_unit", "unit"),
                    "normalized_value": sget(r, "normalized_value"),
                    "normalized_unit": sget(r, "normalized_unit"),
                    "semantic_class": sem,
                    "source_locator": loc,
                    "confidence": conf,
                    "verification_status": vs,
                })
            elif kind == "tables" and sget(r, "raw_value"):
                val_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": pdf,
                    "label_raw": sget(r, "title_raw", "table_title"),
                    "raw_value": sget(r, "raw_value"),
                    "raw_unit": sget(r, "raw_unit"),
                    "normalized_value": sget(r, "normalized_value"),
                    "normalized_unit": sget(r, "normalized_unit"),
                    "semantic_class": sem,
                    "source_locator": loc,
                    "confidence": conf,
                    "verification_status": vs,
                })

            if kind == "formulas":
                fml_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": pdf,
                    "formula_label_raw": sget(r, "formula_label_raw", "description", "symbol"),
                    "expression_raw": sget(r, "expression_raw", "equation"),
                    "variable_symbols": sget(r, "variable_symbols", "symbol"),
                    "referenced_standard_raw": sget(r, "referenced_standard_raw", "reference"),
                    "semantic_class": sem,
                    "source_locator": loc,
                    "confidence": conf,
                    "verification_status": vs,
                })

            if kind == "tables":
                tbl_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": pdf,
                    "title_raw": sget(r, "title_raw", "table_title"),
                    "row_key": sget(r, "row_key", "table_id"),
                    "column_key": sget(r, "column_key", "subsection"),
                    "cell_raw_text": sget(r, "cell_raw_text", "row_data"),
                    "raw_value": sget(r, "raw_value"),
                    "raw_unit": sget(r, "raw_unit"),
                    "normalized_value": sget(r, "normalized_value"),
                    "normalized_unit": sget(r, "normalized_unit"),
                    "semantic_class": sem,
                    "source_locator": loc,
                    "confidence": conf,
                    "verification_status": vs,
                })

            if kind == "figures":
                fig_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": pdf,
                    "title_raw": sget(r, "title_raw", "title"),
                    "figure_kind": sget(r, "figure_kind", "figure_type"),
                    "referenced_entities": sget(r, "referenced_entities"),
                    "source_locator": loc,
                    "confidence": conf,
                    "notes": sget(r, "notes", "description", "extraction_status"),
                })

            if kind == "notes":
                note_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": pdf,
                    "note_kind": sget(r, "note_kind", "category"),
                    "note_summary": sget(r, "note_summary", "note_text"),
                    "semantic_class": sem,
                    "source_locator": loc,
                    "confidence": conf,
                })

    # ---------------- drawing element CSVs ----------------
    draw_kinds = {
        "annotations": ("drawing_annotation", "NOTE"),
        "dimensions": ("drawing_dimension", "DIMENSION"),
        "members": ("drawing_member", "member_id"),
        "references": ("drawing_reference", "REFERENCE_TEXT"),
        "sheet_elements": ("drawing_sheet_element", "NOTE"),
        "tables": ("drawing_table", "table"),
        "title_blocks": ("drawing_title_block", "TITLE_BLOCK_VALUE"),
        "views": ("drawing_view", "figure"),
    }
    _PRE = {"annotations": "ANO", "references": "REF", "sheet_elements": "EL",
            "tables": "TBL", "title_blocks": "TB", "views": "VW"}

    for path in draw_files:
        rel = os.path.relpath(path, P2I)
        group = os.path.basename(os.path.dirname(path))
        base = os.path.basename(path)
        kind = base.replace(".csv", "")
        rows = read_csv(path)
        st, def_sem = draw_kinds.get(kind, ("drawing_element", "NOTE"))
        for i, r in enumerate(rows):
            sheet = sget(r, "sheet_number") or "all"
            seq = next_dwg_seq(f"{group}/{kind}", sheet)

            rid = ""
            if kind == "dimensions" and group == "sheets_001_044" and sget(r, "id"):
                sheet3 = "001" if sheet == "all" else f"{sheet:0>3}"
                rid = f"DWG-DIM-S{sheet3}-{sget(r, 'id'):0>3}"
            elif kind == "dimensions" and sget(r, "dimension_id"):
                m = re.search(r"(\d+)$", sget(r, "dimension_id"))
                num = m.group(1) if m else f"{seq:03d}"
                sheet3 = "001" if sheet == "all" else f"{sheet:0>3}"
                rid = f"DWG-DIM-S{sheet3}-{num:0>3}"
            elif kind == "dimensions":
                sheet3 = "001" if sheet == "all" else f"{sheet:0>3}"
                rid = f"DWG-DIM-S{sheet3}-{seq:03d}"
            elif kind == "members" and group == "sheets_001_044" and sget(r, "member_id"):
                mid = sget(r, "member_id").replace("-", "")
                rid = f"DWG-MEM-{mid}"
            elif kind == "members":
                rid = f"DWG-MEM-S{sheet:0>3}-{seq:03d}"
            else:
                rid = f"DWG-{_PRE.get(kind, 'EL')}-S{sheet:0>3}-{seq:03d}"

            pdf = sget(r, "pdf_page", "pdf_page_number") or sheet_to_pdf(sheet)
            sem = "DIMENSION" if kind == "dimensions" else map_semantic(def_sem)
            if kind == "members":
                sem = "member_id"
            conf = sget(r, "confidence") or "HIGH"
            if str(sheet) == "141":
                conf = "MEDIUM"
                vs = "PARTIAL"
            else:
                vs = sget(r, "verification_status") or "UNVERIFIED"
            loc = calc_loc(pdf)

            label = ""
            raw_val = ""
            raw_unit = ""
            notes = ""
            if kind == "dimensions":
                label = sget(r, "japanese_name", "label", "item")
                raw_val = sget(r, "value", "value_numeric")
                raw_unit = sget(r, "unit")
                notes = sget(r, "notes", "description")
            elif kind == "members":
                label = sget(r, "member_id", "part_name", "designation")
                notes = sget(r, "english_name", "size_description", "dimensions")
            elif kind == "annotations":
                label = sget(r, "japanese_text", "raw_text", "annotation_text")
                notes = sget(r, "english_text", "category")
            elif kind == "references":
                label = sget(r, "drawing_title", "ref_type", "reference_type")
                notes = sget(r, "notes", "description", "to_calc_section")
            elif kind == "sheet_elements":
                label = sget(r, "title", "title_prefix", "element_type")
                notes = sget(r, "content_preview", "raw_text", "notes")
            elif kind == "tables":
                label = sget(r, "table_name_jp", "table_title", "content_summary")
                notes = sget(r, "description", "entries", "content_json")
            elif kind == "title_blocks":
                label = sget(r, "bridge_name", "field_name", "field")
                notes = sget(r, "raw_value", "value", "location")
            elif kind == "views":
                label = sget(r, "view_name", "view_label", "view_title", "view_id")
                notes = sget(r, "view_type", "description")

            src_catalog.append({
                "source_record_id": rid,
                "source_type": st,
                "pdf_page_number": pdf,
                "printed_page_number": "",
                "chapter_id": "",
                "section_id": group,
                "source_locator": loc,
                "semantic_class": sem,
                "confidence": conf,
                "verification_status": vs,
                "notes": label,
            })

            if kind == "dimensions":
                val_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": pdf,
                    "label_raw": label,
                    "raw_value": raw_val,
                    "raw_unit": raw_unit,
                    "normalized_value": "",
                    "normalized_unit": "",
                    "semantic_class": "DIMENSION",
                    "source_locator": loc,
                    "confidence": conf,
                    "verification_status": vs,
                })
            if kind == "tables":
                tbl_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": pdf,
                    "title_raw": label,
                    "row_key": sget(r, "table_id", "table_name_jp"),
                    "column_key": "",
                    "cell_raw_text": notes,
                    "raw_value": "",
                    "raw_unit": "",
                    "normalized_value": "",
                    "normalized_unit": "",
                    "semantic_class": "table",
                    "source_locator": loc,
                    "confidence": conf,
                    "verification_status": vs,
                })

    # ---------------- domain indexes ----------------
    for path in idx_files:
        rows = read_csv(path)
        for r in rows:
            idx_id = sget(r, "index_id")
            record_id = sget(r, "record_id")
            sem = map_semantic(sget(r, "semantic_class"))
            loc = sget(r, "source_locator") or calc_loc(sget(r, "pdf_page"))
            pdf = sget(r, "pdf_page")
            src_catalog.append({
                "source_record_id": idx_id,
                "source_type": "domain_index",
                "pdf_page_number": pdf,
                "printed_page_number": "",
                "chapter_id": sget(r, "chapter_section"),
                "section_id": sget(r, "chapter_section"),
                "source_locator": loc,
                "semantic_class": sem,
                "confidence": "HIGH",
                "verification_status": "UNVERIFIED",
                "notes": f"domain_index -> {record_id}; {sget(r, 'description')}",
            })

    # ---------------- unread resolution (sheet 141 OCR) ----------------
    unread_meta = {
        "drawing_sheet_141_annotations": ("annotation_id", "NOTE"),
        "drawing_sheet_141_crane_capacity": ("row_id", "TABLE_VALUE"),
        "drawing_sheet_141_dimensions": ("dimension_id", "DIMENSION"),
        "drawing_sheet_141_elements": ("element_id", "NOTE"),
        "drawing_sheet_141_erection_blocks": ("block_id", "LOAD_VALUE"),
        "drawing_sheet_141_title_block": ("field_id", "TITLE_BLOCK_VALUE"),
        "drawing_sheet_141_verification_log": ("verification_id", "NOTE"),
        "drawing_sheet_141_views": ("view_id", "figure"),
    }
    for path in unread_files:
        base = os.path.basename(path).replace(".csv", "")
        if base not in unread_meta:
            continue
        id_col, def_sem = unread_meta[base]
        rows = read_csv(path)
        for r in rows:
            rid = sget(r, id_col)
            if not rid:
                rid = f"SRC-{base}-{rows.index(r) + 1:03d}"
            sem = (map_semantic(sget(r, "semantic_class"))
                   if sget(r, "semantic_class") else map_semantic(def_sem))
            conf = sget(r, "confidence") or "MEDIUM"
            src_catalog.append({
                "source_record_id": rid,
                "source_type": "drawing_unread_resolution",
                "pdf_page_number": "143",
                "printed_page_number": "",
                "chapter_id": "",
                "section_id": "drawing_sheet_141",
                "source_locator": "calc_pdf_p143",
                "semantic_class": sem,
                "confidence": conf,
                "verification_status": "PARTIAL",
                "notes": f"sheet141-OCR {base}; {sget(r, 'notes', 'description', 'label')}",
            })
            label = sget(r, "label", "value", "description", "title", "part_name")
            raw_val = sget(r, "value", "block_weight_t", "rated_capacity_t",
                           "boom_length_m", "working_radius_m")
            raw_unit = sget(r, "unit")
            if (base in ("drawing_sheet_141_dimensions",
                         "drawing_sheet_141_crane_capacity",
                         "drawing_sheet_141_erection_blocks",
                         "drawing_sheet_141_elements") and raw_val):
                val_catalog.append({
                    "source_record_id": rid,
                    "pdf_page_number": "143",
                    "label_raw": label,
                    "raw_value": raw_val,
                    "raw_unit": raw_unit or "",
                    "normalized_value": "",
                    "normalized_unit": "",
                    "semantic_class": sem,
                    "source_locator": "calc_pdf_p143",
                    "confidence": conf,
                    "verification_status": "PARTIAL",
                })

    # ---------------- write source catalogs ----------------
    write_csv(os.path.join(OUT["source"], "source_record_catalog.csv"),
              ["source_record_id", "source_type", "pdf_page_number",
               "printed_page_number", "chapter_id", "section_id",
               "source_locator", "semantic_class", "confidence",
               "verification_status", "notes"], src_catalog)
    write_csv(os.path.join(OUT["source"], "source_value_catalog.csv"),
              ["source_record_id", "pdf_page_number", "label_raw", "raw_value",
               "raw_unit", "normalized_value", "normalized_unit",
               "semantic_class", "source_locator", "confidence",
               "verification_status"], val_catalog)
    write_csv(os.path.join(OUT["source"], "source_formula_catalog.csv"),
              ["source_record_id", "pdf_page_number", "formula_label_raw",
               "expression_raw", "variable_symbols",
               "referenced_standard_raw", "semantic_class", "source_locator",
               "confidence", "verification_status"], fml_catalog)
    write_csv(os.path.join(OUT["source"], "source_table_catalog.csv"),
              ["source_record_id", "pdf_page_number", "title_raw", "row_key",
               "column_key", "cell_raw_text", "raw_value", "raw_unit",
               "normalized_value", "normalized_unit", "semantic_class",
               "source_locator", "confidence", "verification_status"],
              tbl_catalog)
    write_csv(os.path.join(OUT["source"], "source_figure_catalog.csv"),
              ["source_record_id", "pdf_page_number", "title_raw",
               "figure_kind", "referenced_entities", "source_locator",
               "confidence", "notes"], fig_catalog)
    write_csv(os.path.join(OUT["source"], "source_note_catalog.csv"),
              ["source_record_id", "pdf_page_number", "note_kind",
               "note_summary", "semantic_class", "source_locator",
               "confidence"], note_catalog)

    log["source_record_catalog"] = len(src_catalog)
    log["source_value_catalog"] = len(val_catalog)
    log["source_formula_catalog"] = len(fml_catalog)
    log["source_table_catalog"] = len(tbl_catalog)
    log["source_figure_catalog"] = len(fig_catalog)
    log["source_note_catalog"] = len(note_catalog)


# ===========================================================================
# 2. INPUT LAYER
# ===========================================================================
def build_input_layer(log):
    rows = []
    exclusions = []

    def inp(entity, field, sem, raw, unit, src_ids, calc_page,
            drawing_page=None, parity="CALC_ONLY", notes="",
            confidence="HIGH", vs="UNVERIFIED",
            phase3="GOLDEN_ELIGIBLE", adoption="CANDIDATE_ONLY",
            human_conf="", issue="", conflict=""):
        cid = next_id("INP")
        rows.append(make_candidate(
            cid, entity, "input", field, sem, raw, unit, src_ids,
            calc_loc(calc_page) if calc_page else "",
            dwg_loc(drawing_page) if drawing_page else "",
            confidence, vs, parity, adoption, phase3, notes=notes,
            human_confirmation_id=human_conf, issue_id=issue,
            conflict_id=conflict))

    # ---- road / design conditions (chapter_01) ----
    inp("ENT-LINE-ACL", "road_spec.road_spec", "road_spec", "A\u898f\u683c", "",
        "CH1-VAL-001", 7, notes="Road specification A\u898f\u683c per Chapter 1")
    inp("ENT-LINE-ACL", "road_spec.design_speed", "design_speed", "40", "km/h",
        "CH1-VAL-002", 7, notes="Design speed 40 km/h")
    inp("ENT-LINE-ACL", "live_load.standard", "live_load", "B\u6d3b\u8377\u91cd", "",
        "CH1-VAL-003,CH2-VAL-005,CAL-VAL-P00135-001,CAL-VAL-P00893-001", 7,
        notes="B-\u6d3b\u8377\u91cd per \u9053\u793a\u2160 8.2")
    inp("ENT-LINE-ACL", "bridge_type.type", "bridge_type",
        "\u92fc3\u5f91\u9593\u9023\u7d9a\u5c11\u6570\u91c9\u67f1\u6a4b(\u975e\u5408\u6210\u67f1,\u5408\u6210\u65ad\u9762\u62c5\u4fdd)",
        "", "CH1-VAL-004,CH5-VAL-003", 7,
        notes="Steel 3-span continuous plate girder bridge")
    inp("ENT-LINE-ACL", "bridge.bridge_length", "bridge_length", "134.001", "m",
        "CH1-VAL-005", 7, drawing_page="001", parity="BOTH",
        notes="Bridge length on ACL 134.001 m; drawing sheet 1 = 134001 mm")
    inp("ENT-GIRDER-AG1", "girder.girder_length_AG1", "girder_length",
        "133.151", "m", "CH1-VAL-006", 7, drawing_page="001", parity="BOTH",
        notes="Girder length AG1; drawing = 133151/132847 mm (AG1/AG2)")
    for i, (val, srcid) in enumerate([
            ("40.201", "CH1-VAL-007"), ("51.000", "CH1-VAL-008"),
            ("40.200", "CH1-VAL-009")], start=1):
        inp("ENT-LINE-ACL", f"bridge.span_length.{i}", "span_length", val, "m",
            srcid, 7, drawing_page="001", parity="BOTH",
            notes=f"Span length {i} on ACL; drawing = 40201/51000/40200 mm")
    inp("ENT-DECK", "bridge.total_width", "total_width", "8.010", "m",
        "CH1-VAL-010,CH2-VAL-001,DWG-DIM-S009-006", 7, drawing_page="009",
        parity="BOTH",
        notes="Deck total width; calc 8.010 m; drawing sheet 9 = 8031.7/8010.3/8010 mm")
    inp("ENT-LINE-ACL", "bridge.effective_width", "effective_width", "7.000",
        "m", "CH1-VAL-011", 7, notes="Effective roadway width")

    for grade, srcid in [("SM520", "CH1-VAL-026"), ("SM490Y", "CH1-VAL-027"),
                         ("SM400", "CH1-VAL-028")]:
        inp("ENT-GIRDER-AG1", f"material.steel_grade.{grade}", "steel_grade",
            grade, "", srcid, 7, notes=f"Steel grade {grade}")

    inp("ENT-DECK", "material.concrete_strength_composite_deck",
        "concrete_strength", "30", "N/mm2",
        "CH1-VAL-030,CH2-VAL-020,CAL-VAL-P01319-004", 7,
        notes="Concrete design strength composite deck 30 N/mm2")
    inp("ENT-DECK", "material.concrete_strength_wall_rail",
        "concrete_strength", "24", "N/mm2", "CH1-VAL-031", 7,
        notes="Concrete design strength wall rail 24 N/mm2")
    inp("ENT-DECK", "material.concrete_strength_wrapping",
        "concrete_strength", "30", "N/mm2", "CH1-VAL-032", 7,
        notes="Concrete design strength wrapping 30 N/mm2")

    inp("ENT-GIRDER-AG1", "material.elastic_modulus_steel", "elastic_modulus",
        "2.000000e+008", "kN/m2",
        "CAL-VAL-P00149-001,CAL-VAL-P01285-004", 149,
        notes="Steel Young's modulus E=2.0e8 kN/m2 (3.1.6) / 200000 N/mm2 (4.2.1)")
    inp("ENT-GIRDER-AG1", "material.shear_modulus_steel", "shear_modulus",
        "7.700000e+007", "kN/m2",
        "CAL-VAL-P00149-002,CAL-VAL-P01285-005", 149,
        notes="Steel shear modulus G=7.7e7 kN/m2 (3.1.6) / 77000 N/mm2 (4.2.1)")
    inp("ENT-GIRDER-AG1", "material.yield_strength_SM490Y", "yield_strength",
        "355", "N/mm2", "CH2-VAL-011,CAL-VAL-P01285-001", 18,
        notes="SM490Y yield point 355 N/mm2")

    inp("ENT-LINE-ACL", "code.applicable_code", "applicable_code",
        "\u9053\u8def\u6a4b\u793a\u65b9\u66f8 \u5e73\u621029\u5e7411\u6708\u7248", "",
        "CH5-VAL-001", 2027, notes="Applicable code \u9053\u793a 2017-11 edition")
    inp("ENT-LINE-ACL", "code.applicable_manual", "applicable_manual",
        "\u9053\u8def\u6a4b\u652f\u627f\u4fbf\u89a7 \u5e73\u621030\u5e7412\u6708\u7248", "",
        "CH5-VAL-002", 2027,
        notes="Applicable manual \u652f\u627f\u4fbf\u89a7 2018-12 edition")
    inp("ENT-LINE-ACL", "code.live_load_reference", "REFERENCE_TEXT",
        "\uff22\u6d3b\u8377\u91cd \u300c\u9053\u793a\u2160 8.2\u300d\u3088\u308a\u629c\u7c8b", "",
        "CAL-NOT-P00135-001", 135, notes="Live load reference \u9053\u793a\u2160 8.2")

    inp("ENT-DECK", "deck.deck_thickness", "deck_thickness", "230", "mm",
        "CH1-VAL-022,CH2-VAL-022,CAL-VAL-P00119-004,DWG-DIM-S009-007", 7,
        drawing_page="009", parity="BOTH",
        notes="Composite deck thickness 230 mm")
    inp("ENT-DECK", "deck.pavement_thickness", "DIMENSION", "80",
        "mm", "CH1-VAL-021,CAL-VAL-P00119-001,DWG-DIM-S009-008", 7,
        drawing_page="009", parity="BOTH",
        notes="Pavement thickness 80 mm")

    # ---- exclusions: derived / analysis / design-result values ----
    EXCLUDED_SEM = {
        "ANALYSIS_RESULT", "DERIVED_VALUE", "DESIGN_RESULT", "STRESS_VALUE",
        "VERIFICATION_RESULT", "SECTION_FORCE", "member_force", "reaction",
        "bending_stress", "shear_stress", "combined_stress", "check_ratio",
        "judgment", "deflection", "rotation",
    }
    seen = set()
    excl = 0
    src_val_path = os.path.join(OUT["source"], "source_value_catalog.csv")
    if os.path.exists(src_val_path):
        for r in read_csv(src_val_path):
            rid = r["source_record_id"]
            if rid in seen:
                continue
            seen.add(rid)
            sem = r["semantic_class"]
            if sem in EXCLUDED_SEM:
                excl += 1
                exclusions.append({
                    "exclusion_id": f"EXC-{excl:03d}",
                    "source_record_id": rid,
                    "semantic_class": sem,
                    "raw_value": r["raw_value"],
                    "exclusion_reason":
                        f"Derived/intermediate/analysis/design-result value ({sem}); excluded from input candidates",
                    "notes": f"label: {r['label_raw']}",
                })

    write_csv(os.path.join(OUT["input"], "input_candidate_register.csv"),
              CANDIDATE_HEADER, rows)
    write_csv(os.path.join(OUT["input"], "input_exclusion_register.csv"),
              ["exclusion_id", "source_record_id", "semantic_class",
               "raw_value", "exclusion_reason", "notes"], exclusions)
    log["input_candidate_register"] = len(rows)
    log["input_exclusion_register"] = len(exclusions)


# ===========================================================================
# 3. GEOMETRY LAYER
# ===========================================================================
def build_geometry_layer(log):
    align, girder, grid, cross, support, elev = [], [], [], [], [], []
    entity_reg = []

    # ---- alignment (ENT-LINE-ACL) ----
    align.append(make_candidate(
        next_id("GEO"), "ENT-LINE-ACL", "geometry", "alignment.bridge_length",
        "bridge_length", "134.001", "m", "CH1-VAL-005,DWG-DIM-S001-001",
        calc_loc(7), dwg_loc("001"), "HIGH", "UNVERIFIED", "BOTH",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Bridge length on ACL; drawing 134001 mm"))
    for i, (val, srcid) in enumerate([
            ("40.201", "CH1-VAL-007"), ("51.000", "CH1-VAL-008"),
            ("40.200", "CH1-VAL-009")], start=1):
        align.append(make_candidate(
            next_id("GEO"), "ENT-LINE-ACL", "geometry",
            f"alignment.span_length.{i}", "span_length", val, "m",
            f"{srcid},DWG-DIM-S001-003", calc_loc(7), dwg_loc("001"), "HIGH",
            "UNVERIFIED", "BOTH", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Span length {i}; drawing 40201/51000/40200 mm"))
    align.append(make_candidate(
        next_id("GEO"), "ENT-LINE-ACL", "geometry", "alignment.station",
        "UNKNOWN_REQUIRES_REVIEW", "", "", "", "", "", "UNKNOWN",
        "UNVERIFIED", "ONE_SOURCE_ONLY", "HUMAN_CONFIRMATION_REQUIRED",
        "HUMAN_VALIDATION",
        notes="Station value not extracted in Phase 2-I; requires human confirmation"))
    entity_reg.append({
        "entity_id": "ENT-LINE-ACL",
        "description": "Alignment center line (ACL)",
        "source_record_ids":
            "CH1-VAL-005,CH1-VAL-007,CH1-VAL-008,CH1-VAL-009,DWG-DIM-S001-001,DWG-DIM-S001-003",
    })

    # ---- girder lines (ENT-GIRDER-AG1 / AG2) ----
    girder.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG1", "geometry", "girder_line.ag1",
        "member_id", "AG1", "", "DWG-MEM-AG1,STRMOD-011", "", dwg_loc("021"),
        "HIGH", "UNVERIFIED", "DRAWING_ONLY", "CANDIDATE_ONLY",
        "GOLDEN_ELIGIBLE", notes="Main girder line AG1 (drawing sheets 21-29)"))
    girder.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG2", "geometry", "girder_line.ag2",
        "member_id", "AG2", "", "DWG-MEM-AG2,STRMOD-012", "", dwg_loc("030"),
        "HIGH", "UNVERIFIED", "DRAWING_ONLY", "CANDIDATE_ONLY",
        "GOLDEN_ELIGIBLE", notes="Main girder line AG2 (drawing sheets 30-38)"))
    girder.append(make_candidate(
        next_id("GEO"), "ENT-LINE-ACL", "geometry",
        "girder_line.girder_spacing", "girder_spacing", "4500", "mm",
        "DWG-DIM-S001-004,GEO-010", "", dwg_loc("001"), "HIGH", "UNVERIFIED",
        "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Main girder spacing 4500 mm (drawing)"))
    girder.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG1", "geometry",
        "girder_line.girder_height", "girder_height", "2700", "mm",
        "DWG-DIM-S001-005,SRC-calculation_chapter_03_section_3_2_values-010",
        "", dwg_loc("001"), "HIGH", "UNVERIFIED", "DRAWING_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Girder height 2700 mm (drawing sheet 1; section 3.2.1 reference_girder_height)"))
    girder.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG1", "geometry",
        "girder_line.panel_points_AG1", "COORDINATE", "", "",
        "CAL-TBL-P00141-001,CAL-TBL-P00141-002,CAL-TBL-P00141-003,CAL-TBL-P00141-004,CAL-FIG-P00142-001,STRMOD-004",
        calc_loc(141), "", "MEDIUM", "UNVERIFIED", "CALC_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="AG1 panel points 1001-1027; first/last node coordinates extracted"))
    girder.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG2", "geometry",
        "girder_line.panel_points_AG2", "COORDINATE", "", "",
        "CAL-TBL-P00141-005,CAL-TBL-P00141-006,CAL-TBL-P00141-007,CAL-TBL-P00141-008,CAL-FIG-P00142-001,STRMOD-005",
        calc_loc(141), "", "MEDIUM", "UNVERIFIED", "CALC_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="AG2 panel points 2001-2027; first/last node coordinates extracted"))
    entity_reg.append({
        "entity_id": "ENT-GIRDER-AG1",
        "description": "Main girder line AG1",
        "source_record_ids":
            "DWG-MEM-AG1,STRMOD-011,CAL-TBL-P00141-001,CAL-TBL-P00141-002,CAL-TBL-P00141-003,CAL-TBL-P00141-004",
    })
    entity_reg.append({
        "entity_id": "ENT-GIRDER-AG2",
        "description": "Main girder line AG2",
        "source_record_ids":
            "DWG-MEM-AG2,STRMOD-012,CAL-TBL-P00141-005,CAL-TBL-P00141-006,CAL-TBL-P00141-007,CAL-TBL-P00141-008",
    })

    # ---- grid points (panel point coordinates) ----
    grid_data = [
        ("1001", "X", "1.21766", "m", "CAL-TBL-P00141-001", "ENT-GIRDER-AG1"),
        ("1001", "Y", "1.47689", "m", "CAL-TBL-P00141-002", "ENT-GIRDER-AG1"),
        ("1027", "X", "132.76045", "m", "CAL-TBL-P00141-003", "ENT-GIRDER-AG1"),
        ("1027", "Y", "1.55372", "m", "CAL-TBL-P00141-004", "ENT-GIRDER-AG1"),
        ("2001", "X", "1.46395", "m", "CAL-TBL-P00141-005", "ENT-GIRDER-AG2"),
        ("2001", "Y", "-3.02859", "m", "CAL-TBL-P00141-006", "ENT-GIRDER-AG2"),
        ("2027", "X", "132.55077", "m", "CAL-TBL-P00141-007", "ENT-GIRDER-AG2"),
        ("2027", "Y", "-2.94155", "m", "CAL-TBL-P00141-008", "ENT-GIRDER-AG2"),
    ]
    for node, coord, val, unit, srcid, ent in grid_data:
        grid.append(make_candidate(
            next_id("GEO"), ent, "geometry",
            f"grid_point.{node}.{coord}", "COORDINATE", val, unit, srcid,
            calc_loc(141), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
            "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Panel point {node} {coord} coordinate"))
    for node in list(range(1002, 1027)) + list(range(2002, 2027)):
        ent = "ENT-GIRDER-AG1" if node < 2000 else "ENT-GIRDER-AG2"
        grid.append(make_candidate(
            next_id("GEO"), ent, "geometry",
            f"grid_point.{node}.coordinate", "UNKNOWN_REQUIRES_REVIEW", "", "",
            "CAL-FIG-P00142-001,STRMOD-003", calc_loc(142), "", "UNKNOWN",
            "UNVERIFIED", "CALC_ONLY", "HUMAN_CONFIRMATION_REQUIRED",
            "HUMAN_VALIDATION",
            notes=f"Panel point {node} coordinate not extracted in Phase 2-I"))

    # ---- cross section ----
    cross.append(make_candidate(
        next_id("GEO"), "ENT-DECK", "geometry", "cross_section.deck_total_width",
        "DIMENSION", "8010", "mm", "CAL-FIG-P00118-001,CH1-VAL-010,GEO-019",
        calc_loc(118), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Standard cross section 8010 x 7000 mm (deck total x effective)"))
    cross.append(make_candidate(
        next_id("GEO"), "ENT-DECK", "geometry", "cross_section.deck_thickness",
        "deck_thickness", "230", "mm",
        "CH1-VAL-022,CH2-VAL-022,CAL-VAL-P00119-004,DWG-DIM-S009-007",
        calc_loc(7), dwg_loc("009"), "HIGH", "UNVERIFIED", "BOTH",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Composite deck thickness 230 mm"))
    cross.append(make_candidate(
        next_id("GEO"), "ENT-DECK", "geometry", "cross_section.pavement_thickness",
        "DIMENSION", "80", "mm",
        "CH1-VAL-021,CAL-VAL-P00119-001,DWG-DIM-S009-008",
        calc_loc(7), dwg_loc("009"), "HIGH", "UNVERIFIED", "BOTH",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Pavement thickness 80 mm"))
    cross.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG1", "geometry",
        "cross_section.upper_flange_width", "DIMENSION", "620", "mm",
        "DWG-DIM-S013-010,ADV-001", "", dwg_loc("013"), "HIGH", "UNVERIFIED",
        "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Top flange width 620 mm (all sections)"))
    cross.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG1", "geometry",
        "cross_section.bottom_flange_width_calc", "DIMENSION", "680", "mm",
        "SRC-calculation_chapter_03_section_3_2_values-007,ADV-003",
        calc_loc(293), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
        "CONFLICT_REQUIRES_REVIEW", "REVIEW_CONFLICT",
        conflict_id="CONF-P2II-001",
        notes="CONFLICT: calc bottom flange width 680 mm vs drawing 700 mm"))
    cross.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG1", "geometry",
        "cross_section.bottom_flange_width_drawing", "DIMENSION", "700", "mm",
        "DWG-DIM-S013-014,GEO-016", "", dwg_loc("013"), "HIGH", "UNVERIFIED",
        "DRAWING_ONLY", "CONFLICT_REQUIRES_REVIEW", "REVIEW_CONFLICT",
        conflict_id="CONF-P2II-001",
        notes="CONFLICT: drawing bottom flange width 700 mm vs calc 680 mm"))
    cross.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG1", "geometry", "cross_section.web_height",
        "DIMENSION", "2537-2657", "mm", "DWG-DIM-S013-012,GEO-017", "",
        dwg_loc("013"), "HIGH", "UNVERIFIED", "DRAWING_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Web height range 2537-2657 mm across sections"))
    cross.append(make_candidate(
        next_id("GEO"), "ENT-GIRDER-AG1", "geometry", "cross_section.web_thickness",
        "DIMENSION", "14", "mm", "DWG-DIM-S013-013,ADV-002,GEO-018", "",
        dwg_loc("013"), "HIGH", "UNVERIFIED", "DRAWING_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Web thickness 14 mm (constant)"))
    entity_reg.append({
        "entity_id": "ENT-DECK",
        "description": "RC / composite deck",
        "source_record_ids":
            "CH1-VAL-010,CH1-VAL-022,CH2-VAL-022,CAL-VAL-P00119-004,CAL-FIG-P00118-001,DWG-DIM-S009-007",
    })

    # ---- support lines ----
    for ent, name, src, note in [
        ("ENT-SUPPORT-PU15", "PU15", "DWG-MEM-S1,MEMID-005",
         "Support line PU15 (S1); outer pier/abutment (drawing sheets 9-12)"),
        ("ENT-SUPPORT-PR1", "PR1", "DWG-MEM-PR1,MEMID-007",
         "Support line PR1; intermediate pier 1 (drawing sheets 9-12)"),
        ("ENT-SUPPORT-PR2", "PR2", "DWG-MEM-PR2,MEMID-008",
         "Support line PR2; intermediate pier 2 (drawing sheets 9-12)"),
        ("ENT-SUPPORT-AR2", "AR2", "DWG-MEM-S2,MEMID-006",
         "Support line AR2 (S2); outer abutment; calc label A2 (conflict CF-001)"),
    ]:
        support.append(make_candidate(
            next_id("GEO"), ent, "geometry", f"support_line.{name.lower()}",
            "SUPPORT_CONDITION", name, "", src, "", dwg_loc("009"), "HIGH",
            "UNVERIFIED", "DRAWING_ONLY", "CANDIDATE_ONLY",
            "GOLDEN_ELIGIBLE", notes=note))
        entity_reg.append({
            "entity_id": ent,
            "description": f"Support line {name}",
            "source_record_ids": src.split(",")[0],
        })

    # ---- elevation / crossfall ----
    for i, (val, srcid) in enumerate(
            [("6.000", "CH1-VAL-016"), ("0.100", "CH1-VAL-017")], start=1):
        elev.append(make_candidate(
            next_id("GEO"), "ENT-LINE-ACL", "geometry",
            f"elevation.longitudinal_gradient.{i}", "longitudinal_gradient",
            val, "%", srcid, calc_loc(7), "", "HIGH", "UNVERIFIED",
            "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Longitudinal gradient i{i}"))
    for i, (val, srcid) in enumerate(
            [("5.000", "CH1-VAL-018"), ("2.000", "CH1-VAL-019"),
             ("2.958", "CH1-VAL-020")], start=1):
        elev.append(make_candidate(
            next_id("GEO"), "ENT-LINE-ACL", "geometry",
            f"elevation.cross_gradient.{i}", "cross_gradient", val, "%", srcid,
            calc_loc(7), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
            "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Cross gradient i{i}"))
    elev.append(make_candidate(
        next_id("GEO"), "ENT-DECK", "geometry", "elevation.deck_elevation_DL",
        "DIMENSION", "10.00", "m", "S141-D11", "", dwg_loc("141"), "MEDIUM",
        "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        human_confirmation_id="HCR-001",
        notes="Deck level D.L. 10.00 m from sheet 141 OCR"))
    elev.append(make_candidate(
        next_id("GEO"), "ENT-LINE-ACL", "geometry", "elevation.ground_level_V",
        "DIMENSION", "15.250", "m", "S141-D08", "", dwg_loc("141"), "MEDIUM",
        "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        human_confirmation_id="HCR-001",
        notes="Construction base level V 15.250 m from sheet 141 OCR"))

    write_csv(os.path.join(OUT["geometry"], "alignment_candidate.csv"),
              CANDIDATE_HEADER, align)
    write_csv(os.path.join(OUT["geometry"], "girder_line_candidate.csv"),
              CANDIDATE_HEADER, girder)
    write_csv(os.path.join(OUT["geometry"], "grid_point_candidate.csv"),
              CANDIDATE_HEADER, grid)
    write_csv(os.path.join(OUT["geometry"], "cross_section_candidate.csv"),
              CANDIDATE_HEADER, cross)
    write_csv(os.path.join(OUT["geometry"], "support_line_candidate.csv"),
              CANDIDATE_HEADER, support)
    write_csv(os.path.join(OUT["geometry"], "elevation_crossfall_candidate.csv"),
              CANDIDATE_HEADER, elev)
    write_csv(os.path.join(OUT["geometry"], "geometry_entity_register.csv"),
              ["entity_id", "description", "source_record_ids"], entity_reg)

    for k, v in [("alignment_candidate", align),
                 ("girder_line_candidate", girder),
                 ("grid_point_candidate", grid),
                 ("cross_section_candidate", cross),
                 ("support_line_candidate", support),
                 ("elevation_crossfall_candidate", elev),
                 ("geometry_entity_register", entity_reg)]:
        log[k] = len(v)


# ===========================================================================
# 4. STRUCTURAL MODEL LAYER
# ===========================================================================
def build_structural_model_layer(log):
    nodes, members, conn, axes, restraints, rigid, sections = \
        [], [], [], [], [], [], []
    model_reg = []

    # ---- nodes 1001-1027 (AG1) and 2001-2027 (AG2) ----
    coord_map = {
        "1001": ("1.21766", "1.47689"),
        "1027": ("132.76045", "1.55372"),
        "2001": ("1.46395", "-3.02859"),
        "2027": ("132.55077", "-2.94155"),
    }
    for node in list(range(1001, 1028)) + list(range(2001, 2028)):
        ent = "ENT-GIRDER-AG1" if node < 2000 else "ENT-GIRDER-AG2"
        snode = str(node)
        if snode in coord_map:
            x, y = coord_map[snode]
            nodes.append(make_candidate(
                next_id("SM"), ent, "structural_model",
                f"node.{node}.coordinate", "COORDINATE", f"X={x} m, Y={y} m",
                "", "CAL-TBL-P00141-001,CAL-TBL-P00141-002,CAL-FIG-P00142-001,STRMOD-003",
                calc_loc(141), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
                "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                notes=f"Node {node} coordinate (X={x} m, Y={y} m)"))
        else:
            nodes.append(make_candidate(
                next_id("SM"), ent, "structural_model", f"node.{node}.coordinate",
                "UNKNOWN_REQUIRES_REVIEW", "", "", "CAL-FIG-P00142-001,STRMOD-003",
                calc_loc(142), "", "UNKNOWN", "UNVERIFIED", "CALC_ONLY",
                "HUMAN_CONFIRMATION_REQUIRED", "HUMAN_VALIDATION",
                notes=f"Node {node} coordinate not extracted in Phase 2-I"))
    model_reg.append({
        "entity_id": "ENT-LINE-ACL",
        "description": "Grid model: 54 nodes (1001-1027, 2001-2027), 52 beam elements, 27 support elements",
        "source_record_ids": "STRMOD-001,STRMOD-009,CAL-NOT-P00145-001",
    })

    # ---- members (from member_identifier_index) ----
    member_defs = [
        ("AG1", "ENT-GIRDER-AG1", "DWG-MEM-AG1,MEMID-001", "Main girder AG1"),
        ("AG2", "ENT-GIRDER-AG2", "DWG-MEM-AG2,MEMID-002", "Main girder AG2"),
        ("GE1", "ENT-XBEAM-GE1", "DWG-MEM-GE1,MEMID-003", "End cross beam GE1"),
        ("GE2", "ENT-XBEAM-GE2", "DWG-MEM-GE2,MEMID-004", "End cross beam GE2"),
        ("C1-C7", "ENT-XBEAM-C1C7", "DWG-MEM-C1C7,MEMID-009", "Intermediate cross beams C1-C7"),
        ("C8-C13", "ENT-XBEAM-C8C13", "DWG-MEM-C8C13,MEMID-010", "Intermediate cross beams C8-C13"),
        ("C14-C20", "ENT-XBEAM-C14C20", "DWG-MEM-C14C20,MEMID-011", "Intermediate cross beams C14-C20"),
        ("C21-C23", "ENT-XBEAM-C21C23", "DWG-MEM-C21C23,MEMID-012", "Intermediate cross beams C21-C23"),
        ("A-L1", "ENT-BRACE-AL1", "DWG-MEM-AL1,MEMID-013", "Lateral bracing A-L1"),
        ("A-L2", "ENT-BRACE-AL2", "DWG-MEM-AL2,MEMID-014", "Lateral bracing A-L2"),
        ("STUD", "ENT-STUD", "DWG-MEM-STUD,MEMID-015", "Head stud phi22"),
        ("V-STIFF", "ENT-STIFF-VSTIFF", "DWG-MEM-VSTIFF,MEMID-016", "Vertical stiffener"),
        ("JACK-STIFF", "ENT-STIFF-JACKSTIFF", "DWG-MEM-JACKSTIFF,MEMID-017", "Jack-up stiffener"),
        ("SOLE-PL", "ENT-SOLEPL", "DWG-MEM-SOLEPL,MEMID-018", "Sole plate"),
        ("NOSE", "ENT-NOSE", "DWG-MEM-NOSE,MEMID-019", "Nose section"),
        ("H-NO1", "ENT-NOSE-HNO1", "DWG-MEM-HNO1,MEMID-020", "Nose section H-NO1"),
        ("S1", "ENT-SUPPORT-PU15", "DWG-MEM-S1,MEMID-005", "Support S1 (PU15)"),
        ("S2", "ENT-SUPPORT-AR2", "DWG-MEM-S2,MEMID-006", "Support S2 (AR2)"),
        ("PR1", "ENT-SUPPORT-PR1", "DWG-MEM-PR1,MEMID-007", "Pier support PR1"),
        ("PR2", "ENT-SUPPORT-PR2", "DWG-MEM-PR2,MEMID-008", "Pier support PR2"),
    ]
    for name, ent, src, desc in member_defs:
        members.append(make_candidate(
            next_id("SM"), ent, "structural_model", f"member.{name}",
            "member_id", name, "", src, "", dwg_loc("011"), "HIGH",
            "UNVERIFIED", "DRAWING_ONLY", "CANDIDATE_ONLY",
            "GOLDEN_ELIGIBLE", notes=desc))
        model_reg.append({
            "entity_id": ent,
            "description": desc,
            "source_record_ids": src.split(",")[0],
        })

    # ---- connectivity (plane grid structure) ----
    conn.append(make_candidate(
        next_id("SM"), "ENT-LINE-ACL", "structural_model",
        "connectivity.plane_grid_topology", "MEMBER_CONNECTIVITY",
        "plane grid", "", "STRMOD-001,STRMOD-009,CAL-NOT-P00117-001,CAL-NOT-P00145-001",
        calc_loc(117), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Analysis model: plane grid structure; main girders + cross beams as frame"))
    conn.append(make_candidate(
        next_id("SM"), "ENT-GIRDER-AG1", "structural_model",
        "connectivity.ag1_node_chain", "MEMBER_CONNECTIVITY", "",
        "", "CAL-FIG-P00142-001,STRMOD-003", calc_loc(142), "", "MEDIUM",
        "UNVERIFIED", "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="AG1 girder connects panel points 1001-1027 (numbering diagram)"))
    conn.append(make_candidate(
        next_id("SM"), "ENT-GIRDER-AG2", "structural_model",
        "connectivity.ag2_node_chain", "MEMBER_CONNECTIVITY", "",
        "", "CAL-FIG-P00142-001,STRMOD-003", calc_loc(142), "", "MEDIUM",
        "UNVERIFIED", "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="AG2 girder connects panel points 2001-2027 (numbering diagram)"))
    conn.append(make_candidate(
        next_id("SM"), "ENT-LINE-ACL", "structural_model",
        "connectivity.cross_beam_node_pairs", "UNKNOWN_REQUIRES_REVIEW",
        "", "", "CAL-FIG-P00142-001,STRMOD-003", calc_loc(142), "",
        "UNKNOWN", "UNVERIFIED", "CALC_ONLY", "HUMAN_CONFIRMATION_REQUIRED",
        "HUMAN_VALIDATION",
        notes="Explicit cross-beam node-pair connectivity not extracted; see numbering diagram"))

    # ---- local axes ----
    axes.append(make_candidate(
        next_id("SM"), "ENT-GIRDER-AG1", "structural_model", "local_axis.ag1",
        "UNKNOWN_REQUIRES_REVIEW", "", "", "STRMOD-001,CAL-NOT-P00117-001",
        calc_loc(117), "", "UNKNOWN", "UNVERIFIED", "ONE_SOURCE_ONLY",
        "HUMAN_CONFIRMATION_REQUIRED", "HUMAN_VALIDATION",
        notes="Local axis convention not stated in source; requires human confirmation"))
    axes.append(make_candidate(
        next_id("SM"), "ENT-GIRDER-AG2", "structural_model", "local_axis.ag2",
        "UNKNOWN_REQUIRES_REVIEW", "", "", "STRMOD-001,CAL-NOT-P00117-001",
        calc_loc(117), "", "UNKNOWN", "UNVERIFIED", "ONE_SOURCE_ONLY",
        "HUMAN_CONFIRMATION_REQUIRED", "HUMAN_VALIDATION",
        notes="Local axis convention not stated in source; requires human confirmation"))
    axes.append(make_candidate(
        next_id("SM"), "ENT-XBEAM-C1C7", "structural_model",
        "local_axis.cross_beams", "UNKNOWN_REQUIRES_REVIEW", "", "",
        "STRMOD-001,CAL-NOT-P00117-001", calc_loc(117), "", "UNKNOWN",
        "UNVERIFIED", "ONE_SOURCE_ONLY", "HUMAN_CONFIRMATION_REQUIRED",
        "HUMAN_VALIDATION",
        notes="Local axis convention for cross beams not stated; requires human confirmation"))

    # ---- support restraints ----
    restraint_defs = [
        ("PU15", "ENT-SUPPORT-PU15", "085",
         "CH5-VAL-004,CH5-VAL-005,CH5-VAL-016,CH5-VAL-017,CH5-VAL-031",
         "Elastic-fixed bearing (E), side-block restraint; rubber layer te=32mm x5; Km=12.391 kN/mm"),
        ("PR1", "ENT-SUPPORT-PR1", "086",
         "CH5-VAL-018,CH5-VAL-019,CH5-VAL-032",
         "Elastic-fixed bearing (E); rubber layer te=37mm x5; Km=37.613 kN/mm"),
        ("PR2", "ENT-SUPPORT-PR2", "088",
         "CH5-VAL-033",
         "Elastic-fixed bearing (E); Km=35.271 kN/mm"),
        ("AR2", "ENT-SUPPORT-AR2", "087",
         "CH5-VAL-004,CH5-VAL-005,CH5-VAL-034",
         "Elastic-fixed bearing (E), side-block restraint; Km=12.112 kN/mm"),
    ]
    for name, ent, sheet, src, desc in restraint_defs:
        restraints.append(make_candidate(
            next_id("SM"), ent, "structural_model",
            f"support_restraint.{name}", "SUPPORT_CONDITION", name, "", src,
            calc_loc(2028), dwg_loc(sheet), "HIGH", "UNVERIFIED", "BOTH",
            "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=desc))
    restraints.append(make_candidate(
        next_id("SM"), "ENT-LINE-ACL", "structural_model",
        "support_restraint.dof_fixity", "UNKNOWN_REQUIRES_REVIEW", "", "",
        "CAL-NOT-P00145-001,STRMOD-009", calc_loc(145), "", "UNKNOWN",
        "UNVERIFIED", "ONE_SOURCE_ONLY", "HUMAN_CONFIRMATION_REQUIRED",
        "HUMAN_VALIDATION",
        notes="Per-DOF fixity (which directions restrained) not explicitly stated in source"))

    # ---- rigid offsets ----
    rigid.append(make_candidate(
        next_id("SM"), "ENT-LINE-ACL", "structural_model",
        "rigid_offset.model", "UNKNOWN_REQUIRES_REVIEW", "", "",
        "STRMOD-001,CAL-NOT-P00117-001", calc_loc(117), "", "UNKNOWN",
        "UNVERIFIED", "ONE_SOURCE_ONLY", "HUMAN_CONFIRMATION_REQUIRED",
        "HUMAN_VALIDATION",
        notes="Rigid offsets not stated in chapter_03 model notes; assumed none for grid model"))

    # ---- section assignments (from adopted_value_index) ----
    section_defs = [
        ("AG1", "Sec-1",
         "ADV-001,ADV-002,ADV-003",
         "AG1 Sec-1: UFLG PL620x22, WEB PL2537x14, LFLG PL680x21 (SM490Y)"),
        ("AG1", "Sec-3",
         "ADV-004,ADV-005",
         "AG1 Sec-3: UFLG PL620x27, LFLG PL680x21 (SM490Y)"),
        ("AG1", "Sec-6",
         "ADV-006,ADV-007",
         "AG1 Sec-6: UFLG PL620x39 (SM490Y), LFLG PL680x47 (SM520-H)"),
    ]
    for girder, sec, src, desc in section_defs:
        ent = "ENT-GIRDER-AG1" if girder == "AG1" else "ENT-GIRDER-AG2"
        sections.append(make_candidate(
            next_id("SM"), ent, "structural_model",
            f"section_assignment.{girder}.{sec}", "SECTION_PROPERTY",
            sec, "", src, calc_loc(297), "", "HIGH", "UNVERIFIED",
            "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=desc))
    sections.append(make_candidate(
        next_id("SM"), "ENT-GIRDER-AG1", "structural_model",
        "section_assignment.ag1.full", "UNKNOWN_REQUIRES_REVIEW", "", "",
        "ADV-001,ADV-004,ADV-006,SRC-calculation_chapter_03_section_3_2_values-029",
        calc_loc(293), "", "LOW", "UNVERIFIED", "CALC_ONLY",
        "HUMAN_CONFIRMATION_REQUIRED", "HUMAN_VALIDATION",
        notes="Full AG1 section layout Sec-1..Sec-17 per section_3_2; exact member-to-section assignment needs human confirmation"))

    write_csv(os.path.join(OUT["structural_model"], "node_candidate.csv"),
              CANDIDATE_HEADER, nodes)
    write_csv(os.path.join(OUT["structural_model"], "member_candidate.csv"),
              CANDIDATE_HEADER, members)
    write_csv(os.path.join(OUT["structural_model"], "connectivity_candidate.csv"),
              CANDIDATE_HEADER, conn)
    write_csv(os.path.join(OUT["structural_model"], "local_axis_candidate.csv"),
              CANDIDATE_HEADER, axes)
    write_csv(os.path.join(OUT["structural_model"], "support_restraint_candidate.csv"),
              CANDIDATE_HEADER, restraints)
    write_csv(os.path.join(OUT["structural_model"], "rigid_offset_candidate.csv"),
              CANDIDATE_HEADER, rigid)
    write_csv(os.path.join(OUT["structural_model"], "section_assignment_candidate.csv"),
              CANDIDATE_HEADER, sections)
    write_csv(os.path.join(OUT["structural_model"], "model_entity_register.csv"),
              ["entity_id", "description", "source_record_ids"], model_reg)

    for k, v in [("node_candidate", nodes), ("member_candidate", members),
                 ("connectivity_candidate", conn),
                 ("local_axis_candidate", axes),
                 ("support_restraint_candidate", restraints),
                 ("rigid_offset_candidate", rigid),
                 ("section_assignment_candidate", sections),
                 ("model_entity_register", model_reg)]:
        log[k] = len(v)


# ===========================================================================
# 5. LOAD LAYER
# ===========================================================================
def build_load_layer(log):
    cases, values, combos, applications = [], [], [], []

    # ---- load cases ----
    case_defs = [
        ("DEAD_LOAD", "ENT-LINE-ACL",
         "LOAD-001,LOAD-002,LOAD-003,LOAD-004,LOAD-005,LOAD-006,LOAD-007,LOAD-008,LOAD-009",
         "Dead load (D): pavement, deck, haunch, wall rail, sound barrier, steel, inspection, curb, nose"),
        ("LIVE_LOAD_B", "ENT-LINE-ACL",
         "LOAD-013,CH1-VAL-003",
         "Live load B (\u6d3b\u8377\u91cd) per \u9053\u793a\u2160 8.2"),
        ("IMPACT", "ENT-LINE-ACL",
         "LOAD-010,LOAD-011,LOAD-012",
         "Impact coefficient i=20/(50+L): 0.222/0.198/0.222"),
        ("WIND", "ENT-LINE-ACL",
         "LOAD-014,LOAD-015,LOAD-019",
         "Wind load: outer 3.00 kN/m2, inner 1.50 kN/m2, WS=40.06 kN/m"),
        ("COLLISION", "ENT-LINE-ACL",
         "LOAD-016,LOAD-025",
         "Collision load: 13.0 kN/m (vehicle), F=35.0 kN (SC class)"),
        ("SEISMIC_L1", "ENT-LINE-ACL",
         "LOAD-017,LOAD-020,LOAD-021",
         "Seismic Level 1: Kh=0.25, We=35.89 kN/m"),
        ("NODE_LOADS", "ENT-LINE-ACL",
         "CAL-TBL-P00125-001,CAL-TBL-P00125-002,CAL-TBL-P00125-003,CAL-TBL-P00125-004,CAL-TBL-P00131-001,CAL-TBL-P00131-002",
         "Nose/curb/deck/wrapping concentrated nodal loads at panel points"),
        ("WHEEL_LOAD", "ENT-LINE-ACL",
         "LOAD-023",
         "Wheel load P=100 kN (bracket design)"),
    ]
    for name, ent, src, desc in case_defs:
        cases.append(make_candidate(
            next_id("LD"), ent, "load", f"load_case.{name}", "LOAD_VALUE",
            name, "", src, calc_loc(119), "", "HIGH", "UNVERIFIED",
            "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=desc))

    # ---- load values (from load_index) ----
    load_value_defs = [
        ("pavement", "1.800", "kN/m2", "LOAD-001,CAL-VAL-P00119-003", 119, "Dead load: pavement"),
        ("deck", "6.325", "kN/m2", "LOAD-002,CAL-VAL-P00119-006", 119, "Dead load: deck"),
        ("haunch", "2.842", "kN/m", "LOAD-003,CAL-VAL-P00119-007", 119, "Dead load: haunch AG1/AG2"),
        ("wall_rail", "9.920", "kN/m", "LOAD-004,CAL-VAL-P00119-008", 119, "Dead load: wall rail per side"),
        ("sound_barrier", "2.100", "kN/m", "LOAD-005,CAL-VAL-P00119-009", 119, "Dead load: sound barrier"),
        ("steel", "12.000", "kN/m", "LOAD-006,CAL-VAL-P00119-010", 119, "Dead load: steel per girder"),
        ("inspection", "1.000", "kN/m", "LOAD-007,CAL-VAL-P00119-011", 119, "Dead load: inspection walkway"),
        ("nose", "1.000", "kN/m", "LOAD-008,CAL-VAL-P00119-013", 119, "Dead load: nose"),
        ("curb", "2.100", "kN/m", "LOAD-009,CAL-VAL-P00119-012", 119, "Dead load: curb"),
        ("wind_outer", "3.00", "kN/m2", "LOAD-014,CH2-VAL-006", 18, "Design wind load outer side"),
        ("wind_inner", "1.50", "kN/m2", "LOAD-015,CH2-VAL-007", 18, "Design wind load inner side"),
        ("collision_vehicle", "13.0", "kN/m", "LOAD-016,CH2-VAL-008", 18, "Vehicle collision load"),
        ("wind_WS", "40.06", "kN/m", "LOAD-019,CAL-VAL-P00685-005", 685, "Wind load WS (alpha=1.30)"),
        ("seismic_L1", "35.89", "kN/m", "LOAD-021,CAL-VAL-P00686-002", 686, "Level 1 equivalent seismic load"),
        ("wheel_P", "100", "kN", "LOAD-023,CAL-VAL-P00767-003", 767, "T-wheel load P=100 kN"),
        ("collision_F", "35.0", "kN", "LOAD-025,CAL-VAL-P00768-001", 768, "SC class collision load F=35.0 kN"),
    ]
    for label, val, unit, src, page, desc in load_value_defs:
        values.append(make_candidate(
            next_id("LD"), "ENT-LINE-ACL", "load",
            f"load_value.{label}", "LOAD_VALUE", val, unit, src,
            calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
            "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=desc))

    # derived impact coefficients -> EXCLUDED_DERIVED_VALUE
    for i, (val, srcid, page) in enumerate([
            ("0.222", "LOAD-010,CAL-VAL-P00135-002", 135),
            ("0.198", "LOAD-011,CAL-VAL-P00135-004", 135),
            ("0.222", "LOAD-012,CAL-VAL-P00135-006", 135)]):
        values.append(make_candidate(
            next_id("LD"), "ENT-LINE-ACL", "load",
            f"load_value.impact_coefficient.{i+1}", "DERIVED_VALUE", val, "",
            srcid, calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
            "EXCLUDED_DERIVED_VALUE", "GOLDEN_EXCLUDED",
            notes="Impact coefficient i=20/(50+L); derived value excluded from input"))

    # nodal concentrated loads (from section_3_1 tables)
    node_load_defs = [
        ("nose_curb_S1_AG1", "30", "kN", "CAL-TBL-P00125-001,CAL-VAL-P00125-001", 125),
        ("nose_curb_C1_AG1", "48", "kN", "CAL-TBL-P00125-002,CAL-VAL-P00125-002", 125),
        ("deck_widening_S1_AG1", "11", "kN", "CAL-TBL-P00125-003,CAL-VAL-P00125-003", 125),
        ("deck_widening_C1_AG1", "20", "kN", "CAL-TBL-P00125-004,CAL-VAL-P00125-004", 125),
        ("nose_droop_S1_AG1", "31", "kN", "CAL-TBL-P00128-001,CAL-VAL-P00128-001", 128),
        ("nose_droop_C1_AG1", "23", "kN", "CAL-TBL-P00128-002,CAL-VAL-P00128-002", 128),
        ("nose_droop_C2_AG1", "8", "kN", "CAL-TBL-P00128-003,CAL-VAL-P00128-003", 128),
        ("deck_droop_S1_AG1", "35", "kN", "CAL-TBL-P00131-001", 131),
        ("deck_droop_S1_AG2", "62", "kN", "CAL-TBL-P00131-002", 131),
        ("deck_droop_PR1_AG1", "11", "kN", "CAL-TBL-P00131-003", 131),
        ("deck_droop_PR1_AG2", "11", "kN", "CAL-TBL-P00131-004", 131),
        ("deck_droop_PR2_AG1", "11", "kN", "CAL-TBL-P00131-005", 131),
        ("deck_droop_PR2_AG2", "11", "kN", "CAL-TBL-P00131-006", 131),
        ("deck_droop_S2_AG1", "17", "kN", "CAL-TBL-P00131-007", 131),
        ("deck_droop_S2_AG2", "17", "kN", "CAL-TBL-P00131-008", 131),
        ("girder_end_S1_AG1", "37", "kN", "CAL-TBL-P00132-001", 132),
        ("girder_end_S1_AG2", "44", "kN", "CAL-TBL-P00132-002", 132),
        ("girder_end_S2_AG1", "50", "kN", "CAL-TBL-P00132-003", 132),
        ("girder_end_S2_AG2", "50", "kN", "CAL-TBL-P00132-004", 132),
        ("wrapping_S1_AG1", "215", "kN", "CAL-TBL-P00133-011", 133),
        ("wrapping_S1_AG2", "215", "kN", "CAL-TBL-P00133-012", 133),
        ("wrapping_S2_AG1", "226", "kN", "CAL-TBL-P00134-001", 134),
        ("wrapping_S2_AG2", "226", "kN", "CAL-TBL-P00134-002", 134),
        ("wrapping_PR1_AG1", "283", "kN", "CAL-TBL-P00134-003", 134),
        ("wrapping_PR1_AG2", "283", "kN", "CAL-TBL-P00134-004", 134),
        ("wrapping_PR2_AG1", "283", "kN", "CAL-TBL-P00134-005", 134),
        ("wrapping_PR2_AG2", "283", "kN", "CAL-TBL-P00134-006", 134),
    ]
    for label, val, unit, src, page in node_load_defs:
        values.append(make_candidate(
            next_id("LD"), "ENT-LINE-ACL", "load",
            f"load_value.node_load.{label}", "LOAD_VALUE", val, unit, src,
            calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
            "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Nodal concentrated load {label} applied at panel point"))

    # ---- load combinations ----
    combos.append(make_candidate(
        next_id("LD"), "ENT-LINE-ACL", "load",
        "load_combination.D_plus_L", "LOAD_COMBINATION", "D+L", "",
        "CAL-NOT-P00136-001,CAL-NOT-P00223-002", calc_loc(136), "", "HIGH",
        "UNVERIFIED", "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Combination D+L per \u9053\u793a\u2160 3.3 \u88683-3.1; load/combination coefficients gamma_p, gamma_q considered (see reaction table)"))
    combos.append(make_candidate(
        next_id("LD"), "ENT-LINE-ACL", "load",
        "load_combination.detail_table", "UNKNOWN_REQUIRES_REVIEW", "", "",
        "CAL-NOT-P00136-001", calc_loc(136), "", "LOW", "UNVERIFIED",
        "ONE_SOURCE_ONLY", "HUMAN_CONFIRMATION_REQUIRED", "HUMAN_VALIDATION",
        notes="Numeric load-combination coefficient table (\u9053\u793a\u2160 3.3 \u88683-3.1) not extracted numerically"))

    # ---- load applications ----
    applications.append(make_candidate(
        next_id("LD"), "ENT-LINE-ACL", "load",
        "load_application.distributed_dead_load", "LOAD_VALUE", "", "",
        "CAL-FIG-P00137-001,CAL-FIG-P00118-001,CAL-NOT-P00119-001,CAL-NOT-P00119-002",
        calc_loc(137), "", "MEDIUM", "UNVERIFIED", "CALC_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Distributed dead loads applied per girder line / deck strip (load diagram)"))
    applications.append(make_candidate(
        next_id("LD"), "ENT-LINE-ACL", "load",
        "load_application.panel_point_loads", "LOAD_VALUE", "", "",
        "CAL-FIG-P00138-001,CAL-NOT-P00119-003,CAL-TBL-P00125-001,CAL-TBL-P00131-001",
        calc_loc(138), "", "MEDIUM", "UNVERIFIED", "CALC_ONLY",
        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Concentrated loads applied at panel points (S1, C1, C2, PR1, PR2, S2)"))
    applications.append(make_candidate(
        next_id("LD"), "ENT-LINE-ACL", "load",
        "load_application.live_load_placement", "UNKNOWN_REQUIRES_REVIEW", "",
        "", "CAL-FIG-P00137-001,LOAD-013", calc_loc(135), "", "LOW",
        "UNVERIFIED", "ONE_SOURCE_ONLY", "HUMAN_CONFIRMATION_REQUIRED",
        "HUMAN_VALIDATION",
        notes="Exact live-load placement (influence lines) not extracted; requires human confirmation"))

    write_csv(os.path.join(OUT["load"], "load_case_candidate.csv"),
              CANDIDATE_HEADER, cases)
    write_csv(os.path.join(OUT["load"], "load_value_candidate.csv"),
              CANDIDATE_HEADER, values)
    write_csv(os.path.join(OUT["load"], "load_combination_candidate.csv"),
              CANDIDATE_HEADER, combos)
    write_csv(os.path.join(OUT["load"], "load_application_candidate.csv"),
              CANDIDATE_HEADER, applications)

    for k, v in [("load_case_candidate", cases), ("load_value_candidate", values),
                 ("load_combination_candidate", combos),
                 ("load_application_candidate", applications)]:
        log[k] = len(v)


# ===========================================================================
# 6. ANALYSIS LAYER
# ===========================================================================
_ANALYSIS_NOTE = ("Comes from grid analysis (Chapter 3.1.8); no recalculation "
                  "performed. Excluded from Golden input.")


def build_analysis_layer(log):
    reactions, displacements, rotations, forces, governing = [], [], [], [], []

    # ---- reactions (analysis_result_index AR-001..AR-012) ----
    reaction_defs = [
        ("PU15_AG1_rd", "ENT-SUPPORT-PU15", "1205.1", "kN",
         "AR-001,CAL-VAL-P00223-001", 223, "Dead load reaction Rd PU15-AG1"),
        ("PR1_AG1_rd", "ENT-SUPPORT-PR1", "3325.5", "kN",
         "AR-002,CAL-VAL-P00223-003", 223, "Dead load reaction Rd PR1-AG1"),
        ("PR2_AG1_rd", "ENT-SUPPORT-PR2", "3341.6", "kN",
         "AR-003,CAL-VAL-P00223-005", 223, "Dead load reaction Rd PR2-AG1"),
        ("AR2_AG1_rd", "ENT-SUPPORT-AR2", "1221.9", "kN",
         "AR-004,CAL-VAL-P00223-007", 223, "Dead load reaction Rd AR2-AG1"),
        ("PU15_AG1_rlmax", "ENT-SUPPORT-PU15", "737.8", "kN",
         "AR-005,CAL-VAL-P00223-009", 223, "Live load RL max PU15-AG1"),
        ("PR1_AG1_rlmax", "ENT-SUPPORT-PR1", "1378.9", "kN",
         "AR-006,CAL-VAL-P00223-010", 223, "Live load RL max PR1-AG1"),
        ("PR2_AG1_rlmax", "ENT-SUPPORT-PR2", "1383.2", "kN",
         "CAL-VAL-P00223-011", 223, "Live load RL max PR2-AG1"),
        ("AR2_AG1_rlmax", "ENT-SUPPORT-AR2", "777.3", "kN",
         "CAL-VAL-P00223-012", 223, "Live load RL max AR2-AG1"),
        ("PU15_AG1_rlmin", "ENT-SUPPORT-PU15", "-128.0", "kN",
         "CAL-VAL-P00223-013", 223, "Live load RL min PU15-AG1"),
        ("PR1_AG1_rlmin", "ENT-SUPPORT-PR1", "-164.0", "kN",
         "CAL-VAL-P00223-014", 223, "Live load RL min PR1-AG1"),
        ("PR2_AG1_rlmin", "ENT-SUPPORT-PR2", "-161.4", "kN",
         "CAL-VAL-P00223-015", 223, "Live load RL min PR2-AG1"),
        ("AR2_AG1_rlmin", "ENT-SUPPORT-AR2", "-134.1", "kN",
         "CAL-VAL-P00223-016", 223, "Live load RL min AR2-AG1"),
        ("PU15_AG1_total_max", "ENT-SUPPORT-PU15", "2187.6", "kN",
         "CAL-VAL-P00223-017", 223, "Total (combination considered) max PU15-AG1"),
        ("PU15_AG1_total_min", "ENT-SUPPORT-PU15", "1105.4", "kN",
         "CAL-VAL-P00223-018", 223, "Total (combination considered) min PU15-AG1"),
        ("PU15_AG2_rd", "ENT-SUPPORT-PU15", "1200.7", "kN",
         "CAL-VAL-P00223-002", 223, "Dead load reaction Rd PU15-AG2"),
        ("PR1_AG2_rd", "ENT-SUPPORT-PR1", "3306.6", "kN",
         "CAL-VAL-P00223-004", 223, "Dead load reaction Rd PR1-AG2"),
        ("PR2_AG2_rd", "ENT-SUPPORT-PR2", "3272.9", "kN",
         "CAL-VAL-P00223-006", 223, "Dead load reaction Rd PR2-AG2"),
        ("AR2_AG2_rd", "ENT-SUPPORT-AR2", "1081.3", "kN",
         "CAL-VAL-P00223-008", 223, "Dead load reaction Rd AR2-AG2"),
        ("PU15_total", "ENT-SUPPORT-PU15", "2405.8", "kN",
         "CAL-VAL-P00222-002", 222, "Dead load reaction total PU15"),
        ("PR1_total", "ENT-SUPPORT-PR1", "6632.2", "kN",
         "CAL-VAL-P00222-003", 222, "Dead load reaction total PR1"),
        ("PR2_total", "ENT-SUPPORT-PR2", "6614.5", "kN",
         "CAL-VAL-P00222-004", 222, "Dead load reaction total PR2"),
        ("AR2_total", "ENT-SUPPORT-AR2", "2303.2", "kN",
         "CAL-VAL-P00222-005", 222, "Dead load reaction total AR2"),
        ("ALL_Wd", "ENT-LINE-ACL", "17955.7", "kN",
         "AR-008,CAL-VAL-P00686-001,CAL-VAL-P00222-001", 222,
         "Total dead load reaction Wd (all supports)"),
        ("PR1_wind", "ENT-SUPPORT-PR1", "2159.12", "kN",
         "AR-009,CAL-VAL-P00686-005", 686, "PR1 wind reaction Rw"),
        ("PR1_seismic", "ENT-SUPPORT-PR1", "1824.37", "kN",
         "AR-010,CAL-VAL-P00686-006", 686, "PR1 seismic reaction Re"),
        ("PU15_wind", "ENT-SUPPORT-PU15", "738.52", "kN",
         "AR-011,CAL-VAL-P00686-007", 686, "PU15 wind reaction Rw"),
        ("PU15_seismic", "ENT-SUPPORT-PU15", "536.55", "kN",
         "AR-012,CAL-VAL-P00686-008", 686, "PU15 seismic reaction Re"),
        ("Wd_check_calc", "ENT-LINE-ACL", "17955.87", "kN",
         "CAL-VAL-P00140-001", 140, "Dead load reaction check (calculated)"),
        ("Wd_check_analysis", "ENT-LINE-ACL", "17955.68", "kN",
         "CAL-VAL-P00140-002", 140, "Dead load reaction check (analysis)"),
    ]
    for label, ent, val, unit, src, page, desc in reaction_defs:
        reactions.append(make_candidate(
            next_id("AN"), ent, "analysis", f"reaction.{label}", "reaction",
            val, unit, src, calc_loc(page), "", "HIGH", "UNVERIFIED",
            "CALC_ONLY", "EXCLUDED_ANALYSIS_RESULT", "GOLDEN_EXCLUDED",
            notes=f"{desc}. {_ANALYSIS_NOTE}"))

    # ---- displacements (deflections) ----
    displacement_defs = [
        ("live_load_deflection_PU15_left", "10.7", "mm",
         "CH5-VAL-074", 2207, "Live load deflection PU15 (left)"),
        ("live_load_deflection_PU15_right", "12.0", "mm",
         "CH5-VAL-075", 2207, "Live load deflection PU15 (right)"),
        ("seismic_displacement_L1", "27.7", "mm",
         "CH5-VAL-035", 2037, "Level 1 superstructure movement UB(Io)"),
    ]
    for label, val, unit, src, page, desc in displacement_defs:
        displacements.append(make_candidate(
            next_id("AN"), "ENT-LINE-ACL", "analysis", f"displacement.{label}",
            "deflection", val, unit, src, calc_loc(page), "", "HIGH",
            "UNVERIFIED", "CALC_ONLY", "EXCLUDED_ANALYSIS_RESULT",
            "GOLDEN_EXCLUDED", notes=f"{desc}. {_ANALYSIS_NOTE}"))
    displacements.append(make_candidate(
        next_id("AN"), "ENT-LINE-ACL", "analysis",
        "displacement.grid_analysis", "UNKNOWN_REQUIRES_REVIEW", "", "",
        "CAL-NOT-P00145-001", calc_loc(145), "", "UNKNOWN", "UNVERIFIED",
        "ONE_SOURCE_ONLY", "HUMAN_CONFIRMATION_REQUIRED", "HUMAN_VALIDATION",
        notes="Grid analysis nodal displacements not extracted in 3.1.8; gap registered"))

    # ---- rotations ----
    rotation_defs = [
        ("live_load_rotation_max", "0.00448", "rad",
         "AR-007", 223, "Live load rotation angle max"),
        ("PU15_sum_alpha_e", "0.004608", "rad",
         "CH5-TBL-003", 2028, "Bearing rotation sum alpha_e PU15 (1/217)"),
        ("PR1_sum_alpha_e", "0.003484", "rad",
         "CH5-TBL-004", 2028, "Bearing rotation sum alpha_e PR1 (1/287)"),
        ("PR2_sum_alpha_e", "0.003460", "rad",
         "CH5-TBL-005", 2028, "Bearing rotation sum alpha_e PR2 (1/289)"),
        ("AR2_sum_alpha_e", "0.004651", "rad",
         "CH5-TBL-006", 2028, "Bearing rotation sum alpha_e AR2 (1/215)"),
    ]
    for label, val, unit, src, page, desc in rotation_defs:
        rotations.append(make_candidate(
            next_id("AN"), "ENT-LINE-ACL", "analysis", f"rotation.{label}",
            "rotation", val, unit, src, calc_loc(page), "", "HIGH",
            "UNVERIFIED", "CALC_ONLY", "EXCLUDED_ANALYSIS_RESULT",
            "GOLDEN_EXCLUDED", notes=f"{desc}. {_ANALYSIS_NOTE}"))

    # ---- member forces ----
    force_defs = [
        ("bracket_M", "-308.9", "kNm", "AR-013,CAL-VAL-P00769-001", 769,
         "Bracket design moment M"),
        ("bracket_S", "288.0", "kN", "AR-014,CAL-VAL-P00769-002", 769,
         "Bracket design shear S"),
        ("lateral_bracing_Wd", "18853.5", "kN", "AR-015,CAL-VAL-P00791-002", 791,
         "Lateral bracing Wd L2"),
        ("lateral_bracing_Nmax", "1294.90", "kN", "AR-016,CAL-VAL-P00792-001", 792,
         "Lateral bracing max axial force Nmax D-10096"),
        ("composite_Md1", "0.0", "kNm", "AR-021,CAL-VAL-P01319-006", 1319,
         "Pre-composite DL moment Md1 AG1 Sec-1"),
        ("composite_S_pre", "663.1", "kN", "AR-022,CAL-VAL-P01319-007", 1319,
         "Pre-composite DL shear S AG1 Sec-1"),
        ("composite_S_post", "922.1", "kN", "AR-023,CAL-VAL-P01319-011", 1319,
         "Post-composite LL shear S AG1 Sec-1"),
        ("AG1_Sec3_M_dead", "6673.7", "kNm", "SRC-calculation_chapter_03_section_3_2_tables-032", 350,
         "Dead load moment AG1 Sec-3 (Mx-Max)"),
        ("AG1_Sec5_M_dead", "-9070.3", "kNm", "SRC-calculation_chapter_03_section_3_2_tables-033", 351,
         "Dead load moment AG1 Sec-5 (J-5)"),
        ("AG1_Sec6_M_dead", "-13747.9", "kNm", "SRC-calculation_chapter_03_section_3_2_tables-034", 352,
         "Dead load moment AG1 Sec-6 (Mx-Min support)"),
    ]
    for label, val, unit, src, page, desc in force_defs:
        forces.append(make_candidate(
            next_id("AN"), "ENT-GIRDER-AG1", "analysis", f"member_force.{label}",
            "member_force", val, unit, src, calc_loc(page), "", "HIGH",
            "UNVERIFIED", "CALC_ONLY", "EXCLUDED_ANALYSIS_RESULT",
            "GOLDEN_EXCLUDED", notes=f"{desc}. {_ANALYSIS_NOTE}"))

    # ---- governing load cases ----
    governing_defs = [
        ("AG1_Sec6_MxMin", "ENT-GIRDER-AG1",
         "Dead load + live load (max negative moment at support Sec-6)",
         "DC-006,SRC-calculation_chapter_03_section_3_2_values-056", 297),
        ("AG1_Sec3_MxMax", "ENT-GIRDER-AG1",
         "Live load (max positive moment at Sec-3 / Sec-9)",
         "DC-001,DC-002,SRC-calculation_chapter_03_section_3_2_values-041", 297),
        ("fatigue_No1", "ENT-GIRDER-AG1",
         "Fatigue check No.1 stress range",
         "DC-007,AR-018,CAL-VAL-P00851-001", 851),
        ("bracket_SC", "ENT-GIRDER-AG1",
         "Bracket SC-class collision check",
         "DC-014,DC-015,AR-013", 769),
    ]
    for label, ent, desc, src, page in governing_defs:
        governing.append(make_candidate(
            next_id("AN"), ent, "analysis", f"governing_case.{label}",
            "JUDGMENT_RESULT", "", "", src, calc_loc(page), "", "HIGH",
            "UNVERIFIED", "CALC_ONLY", "EXCLUDED_ANALYSIS_RESULT",
            "GOLDEN_EXCLUDED", notes=f"{desc}. {_ANALYSIS_NOTE}"))

    write_csv(os.path.join(OUT["analysis"], "reaction_candidate.csv"),
              CANDIDATE_HEADER, reactions)
    write_csv(os.path.join(OUT["analysis"], "displacement_candidate.csv"),
              CANDIDATE_HEADER, displacements)
    write_csv(os.path.join(OUT["analysis"], "rotation_candidate.csv"),
              CANDIDATE_HEADER, rotations)
    write_csv(os.path.join(OUT["analysis"], "member_force_candidate.csv"),
              CANDIDATE_HEADER, forces)
    write_csv(os.path.join(OUT["analysis"], "governing_case_candidate.csv"),
              CANDIDATE_HEADER, governing)

    for k, v in [("reaction_candidate", reactions),
                 ("displacement_candidate", displacements),
                 ("rotation_candidate", rotations),
                 ("member_force_candidate", forces),
                 ("governing_case_candidate", governing)]:
        log[k] = len(v)


# ===========================================================================
# 7. SUMMARY MD FILES
# ===========================================================================
def write_summaries(log, gaps):
    def md(path, title, verdict, verdict_reason, file_counts, gaps_list):
        lines = [
            f"# {title}",
            "",
            f"> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II",
            f"> **Numeric analysis performed:** NO (recalculation prohibited)",
            f"> **Verdict:** `{verdict}` — {verdict_reason}",
            "",
            "## Baseline (Phase 2-I) counts",
            "",
            "| Item | Count |",
            "|------|-------|",
            f"| Phase 2-I element rows (calc+drawing CSVs) | 4075 |",
            f"| Phase 2-I domain index entries | 162 |",
            f"| Phase 2-I total (element + index) | 4237 |",
            "",
            "## Generated candidate counts",
            "",
            "| File | Rows |",
            "|------|------|",
        ]
        for name, count in file_counts:
            lines.append(f"| `{name}` | {count} |")
        lines += ["", "## Registered gaps", ""]
        if gaps_list:
            for g in gaps_list:
                lines.append(f"- {g}")
        else:
            lines.append("- None")
        lines += [
            "",
            "## Layer verdict",
            "",
            f"`{verdict}` — {verdict_reason}",
            "",
        ]
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(lines) + "\n")
        print(f"  wrote summary -> {os.path.relpath(path, P2II)}")

    md(os.path.join(OUT["input"], "input_candidate_summary.md"),
       "Input Candidate Layer — Summary",
       "PARTIAL", "Input candidates created; some numeric load-combination / impact / seismic coefficients excluded as derived values.",
       [("input_candidate_register.csv", log["input_candidate_register"]),
        ("input_exclusion_register.csv", log["input_exclusion_register"])],
       ["Impact coefficients (i=20/(50+L)) excluded as DERIVED_VALUE",
        "Steel weight / reaction verification values excluded as derived",
        "Load-combination coefficient table not extracted numerically (HUMAN_CONFIRMATION_REQUIRED)"])

    geo_gaps = [
        "Station value on ACL not extracted in Phase 2-I (UNKNOWN_REQUIRES_REVIEW)",
        "Panel points 1002-1026 / 2002-2026 coordinates not extracted (UNKNOWN_REQUIRES_REVIEW)",
        "Bottom flange width conflict calc 680 mm vs drawing 700 mm (CONF-P2II-001)",
        "Deck elevation / ground level from sheet 141 OCR (HCR-001, PARTIAL)",
    ]
    md(os.path.join(OUT["geometry"], "geometry_candidate_summary.md"),
       "Geometry Candidate Layer — Summary",
       "PARTIAL", "Geometry candidates created; station, intermediate panel-point coordinates and a flange-width parity conflict are registered gaps.",
       [("alignment_candidate.csv", log["alignment_candidate"]),
        ("girder_line_candidate.csv", log["girder_line_candidate"]),
        ("grid_point_candidate.csv", log["grid_point_candidate"]),
        ("cross_section_candidate.csv", log["cross_section_candidate"]),
        ("support_line_candidate.csv", log["support_line_candidate"]),
        ("elevation_crossfall_candidate.csv", log["elevation_crossfall_candidate"]),
        ("geometry_entity_register.csv", log["geometry_entity_register"])],
       geo_gaps)

    sm_gaps = [
        "Local axis convention not stated in source (UNKNOWN_REQUIRES_REVIEW)",
        "Rigid offsets not stated in chapter_03 model notes",
        "Per-DOF support fixity not explicitly stated",
        "Explicit cross-beam node-pair connectivity not extracted",
        "Full AG1/AG2 section layout assignment needs human confirmation",
    ]
    md(os.path.join(OUT["structural_model"], "structural_model_candidate_summary.md"),
       "Structural Model Candidate Layer — Summary",
       "PARTIAL", "Structural model candidates created; local axes, rigid offsets, DOF fixity and full section-assignment are registered gaps.",
       [("node_candidate.csv", log["node_candidate"]),
        ("member_candidate.csv", log["member_candidate"]),
        ("connectivity_candidate.csv", log["connectivity_candidate"]),
        ("local_axis_candidate.csv", log["local_axis_candidate"]),
        ("support_restraint_candidate.csv", log["support_restraint_candidate"]),
        ("rigid_offset_candidate.csv", log["rigid_offset_candidate"]),
        ("section_assignment_candidate.csv", log["section_assignment_candidate"]),
        ("model_entity_register.csv", log["model_entity_register"])],
       sm_gaps)

    load_gaps = [
        "Numeric load-combination coefficient table not extracted (UNKNOWN_REQUIRES_REVIEW)",
        "Exact live-load placement (influence lines) not extracted",
    ]
    md(os.path.join(OUT["load"], "load_candidate_summary.md"),
       "Load Candidate Layer — Summary",
       "PARTIAL", "Load candidates created; load-combination coefficient detail and live-load placement are registered gaps.",
       [("load_case_candidate.csv", log["load_case_candidate"]),
        ("load_value_candidate.csv", log["load_value_candidate"]),
        ("load_combination_candidate.csv", log["load_combination_candidate"]),
        ("load_application_candidate.csv", log["load_application_candidate"])],
       load_gaps)

    an_gaps = [
        "Grid analysis nodal displacements not extracted in 3.1.8 (gap)",
        "Analysis results are EXCLUDED_ANALYSIS_RESULT (not Golden input)",
        "Governing cases identified from design-check evidence; no recalculation",
    ]
    md(os.path.join(OUT["analysis"], "analysis_result_summary.md"),
       "Analysis Candidate Layer — Summary",
       "PARTIAL", "Analysis candidates created from analysis_result_index and section_3_1.8; grid displacements gap registered; all results EXCLUDED_ANALYSIS_RESULT.",
       [("reaction_candidate.csv", log["reaction_candidate"]),
        ("displacement_candidate.csv", log["displacement_candidate"]),
        ("rotation_candidate.csv", log["rotation_candidate"]),
        ("member_force_candidate.csv", log["member_force_candidate"]),
        ("governing_case_candidate.csv", log["governing_case_candidate"])],
       an_gaps)


# ===========================================================================
# 8. VERIFICATION
# ===========================================================================
def verify_outputs():
    problems = []
    all_ids = []
    all_candidate_files = []

    # verify source_record_catalog count + id uniqueness
    src_path = os.path.join(OUT["source"], "source_record_catalog.csv")
    src_ids = set()
    with open(src_path, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    for r in rows:
        if r["source_record_id"] in src_ids:
            problems.append(f"duplicate source_record_id: {r['source_record_id']}")
        src_ids.add(r["source_record_id"])
    print(f"  source_record_catalog rows: {len(rows)}")

    # verify every candidate CSV parses, field counts match header, ids unique
    for layer in ("input", "geometry", "structural_model", "load", "analysis"):
        d = os.path.join(CAND_DIR, layer)
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".csv"):
                continue
            path = os.path.join(d, fn)
            with open(path, encoding="utf-8", newline="") as fh:
                rows = list(csv.DictReader(fh))
            if not rows:
                continue
            header = list(rows[0].keys())
            for i, r in enumerate(rows):
                if list(r.keys()) != header:
                    problems.append(f"field-count mismatch {path} row {i}")
                cid = r.get("candidate_id", "")
                if cid:
                    if cid in all_ids:
                        problems.append(f"duplicate candidate_id: {cid}")
                    all_ids.append(cid)
            all_candidate_files.append((os.path.relpath(path, P2II), len(rows)))
            print(f"  verified {os.path.relpath(path, P2II)} ({len(rows)} rows)")

    print(f"  total candidate_id values across layers: {len(all_ids)}")
    print(f"  unique candidate_ids: {len(set(all_ids))}")

    # source-record integrity: every candidate source_record_ids must resolve
    referenced = set()
    for layer in ("input", "geometry", "structural_model", "load", "analysis"):
        d = os.path.join(CAND_DIR, layer)
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".csv"):
                continue
            path = os.path.join(d, fn)
            with open(path, encoding="utf-8", newline="") as fh:
                for r in csv.DictReader(fh):
                    for sid in (r.get("source_record_ids") or "").split(","):
                        sid = sid.strip()
                        if sid:
                            referenced.add(sid)
    missing = sorted(s for s in referenced if s not in src_ids)
    if missing:
        problems.append(f"unresolved source_record_ids: {missing}")

    if problems:
        print("  PROBLEMS:")
        for p in problems:
            print("   -", p)
    else:
        print("  ALL VERIFICATION CHECKS PASS")
    return problems


# ===========================================================================
# MAIN
# ===========================================================================
def main():
    load_enums()
    for key in OUT:
        os.makedirs(OUT[key], exist_ok=True)

    log = {}
    gaps = []
    print("[1/6] Building source layer...")
    build_source_layer(log)
    print("[2/6] Building input layer...")
    build_input_layer(log)
    print("[3/6] Building geometry layer...")
    build_geometry_layer(log)
    print("[4/6] Building structural model layer...")
    build_structural_model_layer(log)
    print("[5/6] Building load layer...")
    build_load_layer(log)
    print("[6/6] Building analysis layer...")
    build_analysis_layer(log)
    print("[7] Writing summary MD files...")
    write_summaries(log, gaps)
    print("[8] Verifying outputs...")
    verify_outputs()
    print("DONE")


if __name__ == "__main__":
    main()
