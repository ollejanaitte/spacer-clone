#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 2-II Candidate Layer Generator (PR-2: Design + Adopted Design + Report +
Drawing candidate layers + Traceability).

Authority: STEP 10 Reference Bridge 001 (RB-S10-001) - Phase 2-II.
Development approach: documentation-only / data-only.
Numeric analysis: NO (recalculation prohibited).

Reads the Phase 2-I source decomposition (element CSVs + curated domain
indexes + Phase 2-II-A unread-resolution records) and emits:

  candidates/design/            section_property, stress, limit, check_ratio,
                                judgment, formula_trace + summary
  candidates/adopted_design/    adopted_section, adopted_material,
                                adopted_bearing, adopted_dimension + summary
  candidates/report/            chapter, section, table, formula, figure,
                                note, layout + summary
  candidates/drawing/           sheet, view, dimension, annotation, member,
                                table, title_block, reference + summary
  traceability/                 entity_crosswalk, source_to_candidate,
                                value, formula_result,
                                calculation_drawing, adopted_value,
                                report_drawing + summary

Python 3.10, stdlib only. Deterministic and idempotent.

candidate_id prefixes (PR-2): DS- design, AD- adopted design, RP- report,
DR- drawing, TR- traceability.  No PR-1 ids are reused.
"""

from __future__ import annotations

import csv
import glob
import os
import re

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
P2II = os.path.dirname(HERE)
P2I = os.path.join(os.path.dirname(P2II), "phase2_i")

CONTRACTS = os.path.join(P2II, "contracts")
CAND_DIR = os.path.join(P2II, "candidates")
OUT = {
    "design": os.path.join(CAND_DIR, "design"),
    "adopted_design": os.path.join(CAND_DIR, "adopted_design"),
    "report": os.path.join(CAND_DIR, "report"),
    "drawing": os.path.join(CAND_DIR, "drawing"),
}
TRACE_DIR = os.path.join(P2II, "traceability")
UNREAD_DIR = os.path.join(P2II, "unread_resolution")

CANDIDATE_HEADER = [
    "candidate_id", "entity_id", "candidate_layer", "field_path_candidate",
    "semantic_class", "raw_value", "raw_unit", "normalized_value",
    "normalized_unit", "normalization_rule_id", "source_record_ids",
    "calculation_locator", "drawing_locator", "confidence",
    "verification_status", "parity_status", "adoption_status", "issue_id",
    "conflict_id", "human_confirmation_id", "phase3_action", "notes",
]

_ID_COUNTERS = {"DS": 0, "AD": 0, "RP": 0, "DR": 0, "TR": 0}
_CAND_REG = {}
_CAND_LIST = []


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
    print(f"  wrote {len(rows):5d} rows -> {os.path.relpath(path, P2II)}")


def sget(row, *keys):
    for k in keys:
        if k in row and row[k] is not None and str(row[k]).strip() != "":
            return str(row[k]).strip()
    return ""


def _slug(s):
    s = re.sub(r"[^0-9a-zA-Z\u3040-\u30ff\u4e00-\u9fff_-]", "", s or "")
    return s.lower()


# source semantic class -> candidate-enum semantic class (mirrors PR-1 SEM_MAP)
_SEM_MAP = {
    "ANALYSIS_RESULT": "ANALYSIS_RESULT", "AREA": "SECTION_PROPERTY",
    "COEFFICIENT": "DERIVED_VALUE", "DESIGN_PARAMETER": "DESIGN_INPUT",
    "DESIGN_POLICY": "NOTE", "MATERIAL_PROPERTY": "MATERIAL_PROPERTY",
    "PARTIAL_FACTOR_DESIGN": "DESIGN_INPUT", "REINFORCEMENT": "MATERIAL_PROPERTY",
    "SECTION_COMPOSITION": "SECTION_PROPERTY", "SECTION_FORCE": "member_force",
    "SECTION_PROPERTY": "SECTION_PROPERTY", "STRESS_LIMIT": "stress_limit",
    "STRESS_LIMIT_FORMULA": "FORMULA_DEFINITION", "STRESS_VALUE": "DESIGN_RESULT",
    "VERIFICATION_CHECK": "DESIGN_RESULT", "VERIFICATION_FORMULA": "FORMULA_DEFINITION",
    "VERIFICATION_LIMIT": "stress_limit", "VERIFICATION_RESULT": "DESIGN_RESULT",
    "bearing_stress_limit": "stress_limit", "bending_tensile_limit": "stress_limit",
    "combined_stiffness": "MATERIAL_PROPERTY", "combined_stress_check": "DESIGN_RESULT",
    "compression_displacement": "deflection", "compressive_stiffness": "MATERIAL_PROPERTY",
    "deck_moment": "member_force", "design_flow": "NOTE",
    "drain_max_spacing": "DIMENSION", "equivalent_shear_modulus": "MATERIAL_PROPERTY",
    "equivalent_stiffness": "MATERIAL_PROPERTY", "face_plate_moment": "member_force",
    "face_plate_thickness": "DIMENSION", "finger_gap": "DIMENSION",
    "finger_lap": "DIMENSION", "finger_length": "DIMENSION",
    "flow_area": "SECTION_PROPERTY", "formula": "FORMULA_DEFINITION",
    "horizontal_force": "LOAD_VALUE", "hydraulic_radius": "SECTION_PROPERTY",
    "increase_factor": "DERIVED_VALUE", "lead_plug_area": "SECTION_PROPERTY",
    "local_shear_strain": "DESIGN_RESULT", "max_compressive_stress": "DESIGN_RESULT",
    "rotation_displacement": "rotation", "seismic_displacement": "deflection",
    "seismic_movement": "deflection", "shape_factor_1": "SECTION_PROPERTY",
    "shape_factor_2": "SECTION_PROPERTY", "shear_force": "member_force",
    "shear_strain": "DESIGN_RESULT", "standard_ref": "REFERENCE_TEXT",
    "stress_amplitude": "DESIGN_RESULT", "stress_check": "DESIGN_RESULT",
    "stud_shear_capacity": "DESIGN_RESULT", "thermal_movement": "deflection",
    "verification_formula": "FORMULA_DEFINITION", "PARAMETER": "DERIVED_VALUE",
    "LOAD_VALUE": "LOAD_VALUE", "FORMULA_DEFINITION": "FORMULA_DEFINITION",
    "NUMERIC_SUBSTITUTION": "NUMERIC_SUBSTITUTION",
}


def map_semantic(sc):
    """Map a source semantic class to a candidate-enum semantic class."""
    if not sc:
        return "UNKNOWN_REQUIRES_REVIEW"
    sc = sc.strip()
    if sc in SEMANTIC_CLASSES:
        return sc
    low = sc.lower()
    for key, val in _SEM_MAP.items():
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
            "material" in low):
        return "MATERIAL_PROPERTY"
    if ("coefficient" in low or "ratio" in low or "factor" in low):
        return "DERIVED_VALUE"
    if ("force" in low or "moment" in low or "shear" in low or "axial" in low):
        return "member_force"
    if "displacement" in low or "deflection" in low or "movement" in low:
        return "deflection"
    return "UNKNOWN_REQUIRES_REVIEW"


SEMANTIC_CLASSES = set()


def load_enums():
    for r in read_csv(os.path.join(CONTRACTS, "candidate_enums.csv")):
        if r["enum_type"] == "semantic_class":
            SEMANTIC_CLASSES.add(r["enum_value"])


def next_id(prefix):
    _ID_COUNTERS[prefix] += 1
    return f"{prefix}-{_ID_COUNTERS[prefix]:03d}"


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


def register(layer, field_path, cid, entity_id=""):
    key = (layer, field_path)
    if key in _CAND_REG:
        raise ValueError(f"duplicate field_path register: {key}")
    _CAND_REG[key] = cid
    _CAND_LIST.append({"candidate_id": cid, "candidate_layer": layer,
                       "field_path_candidate": field_path,
                       "entity_id": entity_id})


def lookup(layer, field_path):
    key = (layer, field_path)
    if key not in _CAND_REG:
        raise KeyError(f"lookup miss: {key}")
    return _CAND_REG[key]


def lookup_entity(field_path):
    for r in _CAND_LIST:
        if r["field_path_candidate"] == field_path:
            return r["entity_id"]
    return ""


# ---------------------------------------------------------------------------
# Normalization (per normalization_contract.md NOR-001..NOR-013)
# ---------------------------------------------------------------------------
def _fmt(val):
    if val == int(val) and abs(val) < 1e15:
        return str(int(val))
    s = f"{val:.6f}".rstrip("0").rstrip(".")
    return s if s else "0"


def _is_num(s):
    try:
        float(str(s).replace(",", ""))
        return True
    except (ValueError, TypeError):
        return False


def normalize2(raw_value, raw_unit):
    """Normalize by unit conversion only.  Text/compound -> empty + NOR-011."""
    rv = (raw_value or "").strip()
    ru = (raw_unit or "").strip()
    if rv == "":
        return "", "", "NONE"
    if not _is_num(rv):
        return "", "", "NOR-011"
    if ru in ("mm",):
        val = float(rv.replace(",", "")) / 1000.0
        return _fmt(val), "m", "NOR-002"
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
    if ru == "rad":
        return rv, "rad", "NOR-008"
    if ru in ("kNm", "kN\u00b7m", "kN\u30fbm", "kN-m"):
        return rv, "kN\u00b7m", "NOR-012"
    if ru in ("kN/mm",):
        return rv, "kN/mm", "NOR-013"
    if ru in ("%", "t", "sec", "mm/h"):
        return rv, ru, "NOR-009"
    if ru in ("\u56de", "\u5c64", "\u672c", "\u53f0/\u65e5\uff65\u65b9\u5411",
              "\u53f0/\u65e5/\u8eca\u7dda"):
        return rv, ru, "NOR-010"
    if ru == "":
        if _is_num(rv):
            return rv, "", "NOR-009"
        return rv, "", "NOR-011"
    return rv, ru, "NONE"


def make_candidate(candidate_id, entity_id, layer, field_path, sem, raw_value,
                   raw_unit, source_record_ids, calc_locator, drawing_locator,
                   confidence, verification_status, parity_status,
                   adoption_status, phase3_action, notes="", issue_id="",
                   conflict_id="", human_confirmation_id=""):
    nv, nu, nrule = normalize2(raw_value, raw_unit)
    row = {
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
    register(layer, field_path, candidate_id, entity_id)
    return row


# ---------------------------------------------------------------------------
# Source element iteration + PR-1 source_record_id replication
# ---------------------------------------------------------------------------
def iter_calc_files():
    for path in sorted(glob.glob(os.path.join(P2I, "calculation", "**",
                                              "*.csv"), recursive=True)):
        rel = os.path.relpath(path, P2I).replace(os.sep, "/")
        base = os.path.basename(path)
        kind = base[:-4]
        yield rel, kind, read_csv(path)


def calc_src_id(rel, kind, r, i):
    """Replicate PR-1 generator calc source_record_id logic."""
    keymap = {"values": "value_id", "tables": "table_id",
              "formulas": "formula_id", "notes": "note_id",
              "figures": "figure_id", "page_elements": "element_id"}
    rid = sget(r, keymap.get(kind, ""))
    force = "section_3_2" in rel.replace(os.sep, "/")
    if not rid or force:
        stem = rel.replace(".csv", "").replace("/", "_").replace(".", "-")
        rid = f"SRC-{stem}-{i + 1:03d}"
    return rid


def build_drawing_src_ids():
    """Replicate PR-1 drawing source_record_id logic.
    Returns {(group_dir, kind, row_index): source_record_id}."""
    out = {}
    seq = {}
    PRE = {"annotations": "ANO", "references": "REF",
           "sheet_elements": "EL", "tables": "TBL",
           "title_blocks": "TB", "views": "VW"}
    for path in sorted(glob.glob(os.path.join(P2I, "drawings", "**", "*.csv"),
                                 recursive=True)):
        rel = os.path.relpath(path, P2I)
        group = os.path.basename(os.path.dirname(path))
        kind = os.path.basename(path)[:-4]
        rows = read_csv(path)
        for i, r in enumerate(rows):
            sheet = sget(r, "sheet_number") or "all"
            k = (kind, sheet)
            seq[k] = seq.get(k, 0) + 1
            n = seq[k]
            sheet3 = "001" if sheet == "all" else f"{sheet:0>3}"
            rid = ""
            if kind == "dimensions" and group == "sheets_001_044" and sget(r, "id"):
                rid = f"DWG-DIM-S{sheet3}-{sget(r, 'id'):0>3}"
            elif kind == "dimensions" and sget(r, "dimension_id"):
                m = re.search(r"(\d+)$", sget(r, "dimension_id"))
                num = m.group(1) if m else f"{n:03d}"
                rid = f"DWG-DIM-S{sheet3}-{num:0>3}"
            elif kind == "dimensions":
                rid = f"DWG-DIM-S{sheet3}-{n:03d}"
            elif kind == "members" and group == "sheets_001_044" and sget(r, "member_id"):
                rid = f"DWG-MEM-{sget(r, 'member_id').replace('-', '')}"
            elif kind == "members":
                rid = f"DWG-MEM-S{sheet:0>3}-{n:03d}"
            else:
                rid = f"DWG-{PRE.get(kind, 'EL')}-S{sheet3}-{n:03d}"
            out[(group, kind, i)] = rid
    return out


# drawing sheet coverage map (filled by load_sheet_info before use)
sheet_info_map = {}


def load_sheet_info():
    for r in read_csv(os.path.join(P2I, "drawing_sheet_coverage.csv")):
        sheet = int(r["drawing_sheet_number"])
        sheet_info_map[sheet] = {
            "pdf": sget(r, "pdf_page_number"),
            "group": sget(r, "drawing_group"),
            "title": sget(r, "drawing_title"),
            "status": sget(r, "extraction_status"),
            "verification": sget(r, "verification_status"),
            "issue": sget(r, "issue_ref"),
        }


# ===========================================================================
# 1. DESIGN LAYER
# ===========================================================================
S32_SRC = "SRC-calculation_chapter_03_section_3_2"


def s32(kind, idx):
    return f"{S32_SRC}_{kind}-{idx + 1:03d}"


def build_design_layer(log):
    section_props = []
    stresses = []
    limits = []
    ratios = []
    judgments = []
    formula_traces = []

    s32_vals = []
    s32_tables = []
    for rel, kind, rows in iter_calc_files():
        if "section_3_2" not in rel:
            continue
        if kind == "values":
            s32_vals = list(enumerate(rows))
        elif kind == "tables":
            s32_tables = list(enumerate(rows))

    sec_page = {"1": 293, "2": 295, "3": 296, "5": 300, "6": 301, "8": 305,
                "9": 307, "10": 308, "11": 310, "12": 312, "13": 314,
                "14": 316, "15": 318, "16": 319, "17": 320}

    # ---------- section properties (AG1 Sec-1..17) ----------
    prop_pattern = re.compile(r"^AG1_Sec(\d+)_(UFLG|WEB|LFLG)$")
    deriv_pattern = re.compile(r"^AG1_Sec(\d+)_(I|Yu|YL|A)$")
    adv_map = {"1": {"uflg": "ADV-001", "web": "ADV-002", "lflg": "ADV-003"},
               "3": {"uflg": "ADV-004", "lflg": "ADV-005"},
               "6": {"uflg": "ADV-006", "lflg": "ADV-007"}}
    for idx, r in s32_vals:
        param = sget(r, "parameter")
        m = prop_pattern.match(param)
        if m:
            sec, part = m.group(1), m.group(2).lower()
            src = [s32("values", idx)]
            if sec in adv_map and part in adv_map[sec]:
                src.append(adv_map[sec][part])
            conflict = ""
            notes = ("Adopted section plate dimension (SM490Y unless noted; "
                     "Sec-6 LFLG SM520-H).")
            if part == "lflg" and sec in ("1", "3", "6"):
                conflict = "CONF-P2II-001"
                notes = ("Adopted section LFLG plate width (calc 680 mm). "
                         "CONFLICT with drawing 700 mm -> CONF-P2II-001.")
            section_props.append(make_candidate(
                next_id("DS"), "ENT-GIRDER-AG1", "design",
                f"section_property.ag1.sec-{sec}.{part}", "SECTION_PROPERTY",
                sget(r, "value"), sget(r, "unit"), ",".join(src),
                calc_loc(sec_page.get(sec, 297)), "", "HIGH", "UNVERIFIED",
                "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                notes=notes, conflict_id=conflict))
        m = deriv_pattern.match(param)
        if m:
            sec, what = m.group(1), m.group(2)
            section_props.append(make_candidate(
                next_id("DS"), "ENT-GIRDER-AG1", "design",
                f"section_property.ag1.sec-{sec}.{what}", "SECTION_PROPERTY",
                sget(r, "value"), sget(r, "unit"), s32("values", idx),
                calc_loc(sec_page.get(sec, 293)), "", "MEDIUM", "UNVERIFIED",
                "CALC_ONLY", "EXCLUDED_DESIGN_RESULT", "GOLDEN_EXCLUDED",
                notes="Section property I/Yu/YL/A computed by design program; "
                      "excluded from Golden input."))

    # AG2 section summary (table T30)
    section_props.append(make_candidate(
        next_id("DS"), "ENT-GIRDER-AG2", "design",
        "section_property.ag2.summary", "SECTION_PROPERTY",
        "Sec-1..Sec-17 same flange widths 620/680, web 14mm, varying thickness",
        "mm", s32("tables", 39), calc_loc("323-349"), "", "MEDIUM",
        "UNVERIFIED", "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="AG2 sections summarised in table T30 (28 sections); "
              "individual AG2 section properties not extracted."))

    # composite section properties (chapter_04)
    comp_props = [
        ("steel_area", "634.38", "cm2", "CAL-VAL-P01319-021"),
        ("steel_inertia", "6473032", "cm4", "CAL-VAL-P01319-022"),
        ("composite_area_n7", "1946.50", "cm2", "CAL-VAL-P01319-023"),
        ("composite_inertia_n7", "18008524", "cm4", "CAL-VAL-P01319-024"),
        ("composite_ycu", "-64.89", "cm", "CAL-VAL-P01319-025"),
        ("composite_ysu", "-19.89", "cm", "CAL-VAL-P01319-026"),
        ("composite_ysl", "238.11", "cm", "CAL-VAL-P01319-027"),
    ]
    for label, val, unit, src in comp_props:
        section_props.append(make_candidate(
            next_id("DS"), "ENT-GIRDER-AG1", "design",
            f"section_property.composite.n7.{label}", "SECTION_PROPERTY",
            val, unit, src, calc_loc(1319), "", "HIGH", "UNVERIFIED",
            "CALC_ONLY", "EXCLUDED_DESIGN_RESULT", "GOLDEN_EXCLUDED",
            notes="Composite section property (n=7 live load) at AG1 Sec-1; "
                  "derived value excluded from Golden input."))

    # ---------- stresses (design-check index + fatigue) ----------
    dc_stress = [
        ("ag1.sec-3.bending_upper", "bending_stress", "-232", "N/mm2",
         "DC-001," + s32("values", 39), 297,
         "AG1 Sec-3 upper-fiber bending stress (compression)."),
        ("ag1.sec-3.bending_lower", "bending_stress", "249", "N/mm2",
         "DC-002," + s32("values", 40), 297,
         "AG1 Sec-3 lower-fiber bending stress (tension)."),
        ("ag1.sec-6.bending_upper", "bending_stress", "261", "N/mm2",
         "DC-003," + s32("values", 51), 297,
         "AG1 Sec-6 upper-fiber bending stress (tension, support)."),
        ("ag1.sec-6.bending_lower", "bending_stress", "-224", "N/mm2",
         "DC-004," + s32("values", 52), 297,
         "AG1 Sec-6 lower-fiber bending stress (compression, support)."),
        ("ag1.sec-6.shear", "shear_stress", "75", "N/mm2",
         "DC-005," + s32("values", 53), 297, "AG1 Sec-6 web shear stress."),
        ("ag1.sec-1.shear_composite", "shear_stress", "53", "N/mm2",
         "DC-009,CAL-VAL-P01319-028", 1319,
         "AG1 Sec-1 composite-section shear stress (n=7)."),
        ("fatigue.no1.dead_stress", "bending_stress", "63", "N/mm2",
         "AR-017,CAL-VAL-P00850-003", 850,
         "Fatigue check No.1 dead-load stress."),
        ("fatigue.no1.stress_range", "fatigue", "54", "N/mm2",
         "AR-018,CAL-VAL-P00851-001", 851,
         "Fatigue check No.1 stress range delta_sigma_max."),
        ("fatigue.no2.dead_stress", "bending_stress", "-84", "N/mm2",
         "AR-019,CAL-VAL-P00853-003", 853,
         "Fatigue check No.2 dead-load stress (compression)."),
        ("fatigue.no2.stress_range", "fatigue", "80", "N/mm2",
         "AR-020,CAL-VAL-P00854-001", 854,
         "Fatigue check No.2 stress range delta_sigma_max."),
    ]
    for label, sem, val, unit, src, page, note in dc_stress:
        stresses.append(make_candidate(
            next_id("DS"), "ENT-GIRDER-AG1", "design", f"stress.{label}", sem,
            val, unit, src, calc_loc(page), "", "HIGH", "UNVERIFIED",
            "CALC_ONLY", "EXCLUDED_DESIGN_RESULT", "GOLDEN_EXCLUDED",
            notes=note))

    # ---------- stress / kappa parsed from section_3_2 tables ----------
    stress_re = re.compile(r"\u03c3b\(([UL])\)(?:\(([+-]M)\))?\s*=\s*(-?\d+)")
    tau_re = re.compile(r"\u03c4b\s*=\s*(\d+)")
    kappa_re = re.compile(r"\u03ba\s*=\s*([\d.]+)(?:/([\d.]+))?")
    fld_occ = {}

    def uniq(fld):
        fld_occ[fld] = fld_occ.get(fld, 0) + 1
        n = fld_occ[fld]
        return fld if n == 1 else f"{fld}.{n}"

    for idx, r in s32_tables:
        title = sget(r, "table_title")
        row_data = sget(r, "row_data")
        page = sget(r, "pdf_page")
        msec = re.search(r"AG1 Sec-(\d+)(?:\s*\(([^)]*)\))?", title)
        if msec:
            sec_num = msec.group(1)
            desc = _slug(msec.group(2)) if msec.group(2) else ""
            sec_label = f"sec-{sec_num}" + (f"-{desc}" if desc else "")
        else:
            sec_label = "sec?"
        src = s32("tables", idx)
        for m in stress_re.finditer(row_data):
            fiber, moment, val = m.group(1), m.group(2) or "", m.group(3)
            sub = {"U": "upper", "L": "lower"}[fiber]
            fld = (f"stress.ag1.{sec_label}.bending_{sub}"
                   + (f"_{moment.lower()}" if moment else ""))
            notes = f"Parsed from section table '{title}'."
            if sec_label == "sec-6" and fiber == "L" and val == "-222":
                notes += (" Table reads -222 vs design-check -224 "
                          "(values-053); source inconsistency recorded.")
            stresses.append(make_candidate(
                next_id("DS"), "ENT-GIRDER-AG1", "design", uniq(fld),
                "bending_stress", val, "N/mm2", src, calc_loc(page), "",
                "MEDIUM", "UNVERIFIED", "CALC_ONLY", "EXCLUDED_DESIGN_RESULT",
                "GOLDEN_EXCLUDED", notes=notes))
        for m in tau_re.finditer(row_data):
            stresses.append(make_candidate(
                next_id("DS"), "ENT-GIRDER-AG1", "design",
                uniq(f"stress.ag1.{sec_label}.shear"), "shear_stress",
                m.group(1), "N/mm2", src, calc_loc(page), "", "MEDIUM",
                "UNVERIFIED", "CALC_ONLY", "EXCLUDED_DESIGN_RESULT",
                "GOLDEN_EXCLUDED",
                notes=f"Parsed from section table '{title}'."))
        for m in kappa_re.finditer(row_data):
            occ = 0
            for kval in m.groups():
                if not kval:
                    continue
                occ += 1
                ratios.append(make_candidate(
                    next_id("DS"), "ENT-GIRDER-AG1", "design",
                    f"check_ratio.ag1.{sec_label}.kappa.{occ}", "check_ratio",
                    kval, "", src, calc_loc(page), "", "MEDIUM", "UNVERIFIED",
                    "CALC_ONLY", "EXCLUDED_DESIGN_RESULT", "GOLDEN_EXCLUDED",
                    notes=f"Combined bending+shear kappa from table "
                          f"'{title}'."))

    # ---------- limits ----------
    limit_defs = [
        ("tension_ls3_tud", "stress_limit", "272", "N/mm2",
         "DC-011,CAL-VAL-P01319-016," + s32("values", 16), 1319,
         "Upper flange tension limit sigma_tud (limit state 3, SM490Y)."),
        ("compression_sec3_cud", "stress_limit", "247", "N/mm2", "DC-001",
         297, "AG1 Sec-3 compression limit sigma_cud (limit state 3)."),
        ("compression_sec6_cud", "stress_limit", "250", "N/mm2", "DC-004",
         297, "AG1 Sec-6 compression limit sigma_cud (limit state 3)."),
        ("compression_composite_uflg", "stress_limit", "193", "N/mm2",
         "DC-012,CAL-VAL-P01319-017", 1319,
         "Composite upper-flange compression limit sigma_cud (LS3)."),
        ("compression_composite_lflg", "stress_limit", "164", "N/mm2",
         "CAL-VAL-P01319-019", 1319,
         "Composite lower-flange compression limit sigma_cud (LS3)."),
        ("shear_tud", "stress_limit", "157", "N/mm2",
         "DC-005,DC-013,CAL-VAL-P01319-020," + s32("values", 17), 297,
         "Web shear limit tau_ud (limit state 3)."),
        ("combined_kappa_limit", "LIMIT_VALUE", "1.2", "", "DC-006", 297,
         "Combined bending+shear kappa limit <= 1.2."),
        ("fatigue_damage_limit", "LIMIT_VALUE", "1.0", "", "DC-007", 852,
         "Fatigue damage ratio limit D < 1.0."),
        ("bracket_bending_compression", "stress_limit", "144", "N/mm2",
         "DC-014,CAL-VAL-P00771-001", 771,
         "Bracket bending-compression limit sigma_brgd."),
        ("bracket_tension", "stress_limit", "180", "N/mm2",
         "DC-015,CAL-VAL-P00771-002", 771, "Bracket tension limit sigma_tud."),
        ("concrete_ck", "concrete_strength", "30", "N/mm2",
         "CAL-VAL-P01319-004,CH1-VAL-030", 1319,
         "Concrete design strength sigma_ck (composite deck / wrapping)."),
        ("rubber_max_compressive", "stress_limit", "8.0", "N/mm2",
         "CH5-TBL-034,CH5-TBL-035,CH5-TBL-036", 2040,
         "Rubber bearing max compressive stress limit sigma_maxa."),
        ("rubber_shear_strain_g10", "LIMIT_VALUE", "365", "%", "CH5-VAL-042",
         2039, "NR rubber local shear strain limit (G10)."),
        ("rubber_shear_strain_g12", "LIMIT_VALUE", "330", "%", "CH5-VAL-043",
         2039, "NR rubber local shear strain limit (G12)."),
        ("rubber_repeated_horizontal", "LIMIT_VALUE", "70", "%",
         "CH5-TBL-038,CH5-TBL-039,CH5-TBL-040", 2041,
         "Rubber repeated horizontal displacement shear-strain limit "
         "gamma_sa."),
        ("steel_weight_ratio", "LIMIT_VALUE", "110", "%", "DC-010", 674,
         "Assumed vs actual steel weight ratio limit <= 110%."),
    ]
    for label, sem, val, unit, src, page, note in limit_defs:
        limits.append(make_candidate(
            next_id("DS"), "ENT-GIRDER-AG1", "design", f"limit.{label}", sem,
            val, unit, src, calc_loc(page), "", "HIGH", "UNVERIFIED",
            "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=note))

    # ---------- check ratios (design-check index + bearing) ----------
    ratio_defs = [
        ("ag1.sec-6.kappa", "1.10",
         "DC-006," + s32("values", 54), 297,
         "AG1 Sec-6 combined bending+shear kappa (limit 1.2)."),
        ("ag1.composite.kappa", "0.13", "DC-008,CAL-VAL-P01319-029", 1319,
         "Composite section simultaneous bending+shear kappa (LS1)."),
        ("fatigue.damage_D", "0.26", "DC-007,CAL-VAL-P00852-003", 852,
         "Fatigue damage ratio D (limit 1.0)."),
        ("steel_weight_ratio", "95.7", "DC-010," + s32("values", 24), 674,
         "Assumed vs actual steel weight ratio (limit 110%)."),
        ("bearing.PR1.sigma_max", "5.14", "CH5-TBL-034", 2040,
         "PR1 bearing max compressive stress (limit 8.0 N/mm2)."),
        ("bearing.PR2.sigma_max", "5.16", "CH5-TBL-035", 2040,
         "PR2 bearing max compressive stress (limit 8.0 N/mm2)."),
        ("bearing.AR2.sigma_max", "4.68", "CH5-TBL-036", 2040,
         "AR2 bearing max compressive stress (limit 8.0 N/mm2)."),
        ("bearing.PU15.sigma_max", "4.56", "CH5-TBL-033", 2040,
         "PU15 bearing max compressive stress (limit 8.0 N/mm2)."),
        ("bearing.PR1.shear_strain", "6.7", "CH5-TBL-038", 2041,
         "PR1 repeated horizontal displacement shear strain (limit 70%)."),
        ("bearing.PR2.shear_strain", "6.7", "CH5-TBL-039", 2041,
         "PR2 repeated horizontal displacement shear strain (limit 70%)."),
        ("bearing.AR2.shear_strain", "30.5", "CH5-TBL-040", 2041,
         "AR2 repeated horizontal displacement shear strain (limit 70%)."),
    ]
    for label, val, src, page, note in ratio_defs:
        ratios.append(make_candidate(
            next_id("DS"), "ENT-GIRDER-AG1", "design", f"check_ratio.{label}",
            "check_ratio", val, "", src, calc_loc(page), "", "HIGH",
            "UNVERIFIED", "CALC_ONLY", "EXCLUDED_DESIGN_RESULT",
            "GOLDEN_EXCLUDED", notes=note))

    # ---------- judgments ----------
    judgment_defs = [
        ("ag1.sec-3.bending_upper", "OK", "DC-001", "ENT-GIRDER-AG1", 297,
         "AG1 Sec-3 upper-fiber stress verification OK (stress < limit)."),
        ("ag1.sec-3.bending_lower", "OK", "DC-002", "ENT-GIRDER-AG1", 297,
         "AG1 Sec-3 lower-fiber stress verification OK."),
        ("ag1.sec-6.tension", "OK", "DC-003", "ENT-GIRDER-AG1", 297,
         "AG1 Sec-6 support section tension check OK."),
        ("ag1.sec-6.compression", "OK", "DC-004", "ENT-GIRDER-AG1", 297,
         "AG1 Sec-6 support section compression check OK."),
        ("ag1.sec-6.shear", "OK", "DC-005", "ENT-GIRDER-AG1", 297,
         "AG1 Sec-6 shear check OK."),
        ("ag1.sec-6.combined", "OK", "DC-006", "ENT-GIRDER-AG1", 297,
         "AG1 Sec-6 combined bending+shear check OK (kappa 1.10 < 1.2)."),
        ("fatigue.no1", "OK", "DC-007", "ENT-GIRDER-AG1", 852,
         "No.1 fatigue check OK per Doshi (D=0.26 < 1.0)."),
        ("ag1.composite.combined", "OK", "DC-008", "ENT-GIRDER-AG1", 1319,
         "Composite section simultaneous bending+shear check (kappa 0.13)."),
        ("ag1.composite.shear", "OK", "DC-009", "ENT-GIRDER-AG1", 1319,
         "Composite section shear stress verification (tau 53 < 157)."),
        ("steel_weight_ratio", "OK", "DC-010", "ENT-GIRDER-AG1", 674,
         "Assumed vs actual steel weight comparison OK (95.7% <= 110%)."),
        ("bearing.PU15.max_compression", "OK", "CH5-TBL-033",
         "ENT-SUPPORT-PU15", 2040,
         "PU15 bearing max compressive stress check (4.56 < 8.0)."),
        ("bearing.PR1.max_compression", "OK", "CH5-TBL-034",
         "ENT-SUPPORT-PR1", 2040,
         "PR1 bearing max compressive stress check OK (5.14 < 8.0)."),
        ("bearing.PR2.max_compression", "OK", "CH5-TBL-035",
         "ENT-SUPPORT-PR2", 2040,
         "PR2 bearing max compressive stress check OK (5.16 < 8.0)."),
        ("bearing.AR2.max_compression", "OK", "CH5-TBL-036",
         "ENT-SUPPORT-AR2", 2040,
         "AR2 bearing max compressive stress check OK (4.68 < 8.0)."),
        ("bearing.PR1.repeated_displacement", "OK", "CH5-TBL-038",
         "ENT-SUPPORT-PR1", 2041,
         "PR1 repeated horizontal displacement check OK (6.7% < 70%)."),
        ("bearing.PR2.repeated_displacement", "OK", "CH5-TBL-039",
         "ENT-SUPPORT-PR2", 2041,
         "PR2 repeated horizontal displacement check OK (6.7% < 70%)."),
        ("bearing.AR2.repeated_displacement", "OK", "CH5-TBL-040",
         "ENT-SUPPORT-AR2", 2041,
         "AR2 repeated horizontal displacement check OK (30.5% < 70%)."),
    ]
    for label, verdict, src, ent, page, note in judgment_defs:
        judgments.append(make_candidate(
            next_id("DS"), ent, "design", f"judgment.{label}", "judgment",
            verdict, "", src, calc_loc(page), "", "HIGH", "UNVERIFIED",
            "CALC_ONLY", "EXCLUDED_DESIGN_RESULT", "GOLDEN_EXCLUDED",
            notes=note))

    # judgment gaps
    judgments.append(make_candidate(
        next_id("DS"), "ENT-SUPPORT-PU15", "design",
        "judgment.wrapping_concrete.rebar_count", "judgment", "N/A", "",
        "CAL-VAL-P00819-004,CAL-VAL-P00820-003,CAL-VAL-P00821-004",
        calc_loc(819), "", "LOW", "UNVERIFIED", "CALC_ONLY",
        "HUMAN_CONFIRMATION_REQUIRED", "HUMAN_VALIDATION",
        notes="Wrapping-concrete minimum rebar counts (D19 n=18/19/26) "
              "computed; no explicit OK/NG verdict extracted. Requires human "
              "confirmation.", human_confirmation_id="HCR-002"))
    judgments.append(make_candidate(
        next_id("DS"), "ENT-GIRDER-AG1", "design", "judgment.camber",
        "judgment", "N/A", "", s32("values", 18), "", dwg_loc("020"), "LOW",
        "UNVERIFIED", "DRAWING_ONLY", "EXCLUDED_DRAWING_ONLY",
        "GOLDEN_EXCLUDED",
        notes="Camber shown only on drawing sheet 20 (camber diagram/table); "
              "no camber calc values extracted. Drawing-only."))

    # ---------- formula traces ----------
    fml_defs = [
        ("ag1.bending_stress", "FORMULA_DEFINITION",
         "\u03c3b = M x y / I", s32("formulas", 4), 297,
         "AG1 Sec-3 bending stress -232 N/mm2 = M x y / I (Doshi II "
         "eq 13.2.1)."),
        ("ag1.shear_stress", "FORMULA_DEFINITION",
         "\u03c4b = S / Aw", s32("formulas", 5), 297,
         "AG1 Sec-6 shear stress 75 N/mm2 = S / Aw (Doshi II eq 13.2.2)."),
        ("ag1.combined_kappa", "FORMULA_DEFINITION",
         "\u03ba = (\u03c3b/\u03c3tyd)\u00b2 + (\u03c4b/\u03c4yd)\u00b2 "
         "<= 1.2", s32("formulas", 7), 297,
         "AG1 Sec-6 kappa 1.10 < 1.2 (Doshi II eq 5.3.2)."),
        ("tension_limit_tud", "FORMULA_DEFINITION",
         "\u03c3tud = \u03be1 x \u03be2 x \u03a6ut x \u03c3yk",
         "CAL-FML-P01321-001", 1321,
         "sigma_tud = 0.90*1.00*0.85*355 = 272 N/mm2 (Doshi II eq 5.4.22)."),
        ("shear_limit_tud", "NUMERIC_SUBSTITUTION",
         "\u03c4ud = \u03be1 x \u03be2 x \u03a6us x \u03c4yk "
         "= 0.90*1.00*0.85*205 = 157 N/mm2", "CAL-FML-P01321-011", 1321,
         "tau_ud = 157 N/mm2 (Doshi II eq 5.4.28)."),
        ("composite_kappa", "DESIGN_RESULT",
         "\u03ba = (\u03c3m/\u03c3a)\u00b2 + (\u03c4/\u03c4a)\u00b2 <= 1.2",
         "CAL-FML-P01319-005", 1319,
         "Composite kappa 0.13 (AG1 Sec-1, limit state 1)."),
        ("fatigue.stress_range", "NUMERIC_SUBSTITUTION",
         "delta_sigma = |14-(-4)|*3.00 = 54 N/mm2", "CAL-FML-P00850-002", 850,
         "Fatigue No.1 stress range 54 N/mm2."),
        ("fatigue.cycles", "NUMERIC_SUBSTITUTION",
         "nti = ADTTSLi*gamma_n*365*Y = 379*0.03*365*100 = 0.42e6",
         "CAL-FML-P00852-001", 852, "Fatigue No.1 equivalent cycles 0.42e6."),
        ("fatigue.damage", "DESIGN_RESULT",
         "D = sum(nti/Ni) = 0.26 < 1.0", "CAL-VAL-P00852-003,DC-007", 852,
         "Fatigue No.1 damage ratio 0.26 (OK)."),
        ("wind.load_WS", "NUMERIC_SUBSTITUTION",
         "Ws = (40/40)\u00b2*[4.0-0.2]*8.110*1.30 = 40.06 kN/m",
         "CAL-FML-P00685-002", 685,
         "Cross-beam wind load WS = 40.06 kN/m (Doshi I 8.17)."),
        ("seismic.we", "NUMERIC_SUBSTITUTION",
         "We = 1.05*17955.7*0.25/131.325 = 35.89 kN/m",
         "CAL-FML-P00686-001", 686,
         "Level-1 equivalent seismic load We = 35.89 kN/m."),
        ("bracket.bending_limit", "NUMERIC_SUBSTITUTION",
         "\u03c3brgd = 0.90*1.00*0.85*0.803*235 = 144 N/mm2",
         "CAL-FML-P00770-002", 770,
         "Bracket bending-compression limit 144 N/mm2."),
        ("bracket.shear_limit", "NUMERIC_SUBSTITUTION",
         "\u03c4ud = 0.90*1.00*0.85*135 = 103 N/mm2",
         "CAL-FML-P00772-001", 772, "Bracket shear limit 103 N/mm2."),
        ("lateral_bracing.pw", "NUMERIC_SUBSTITUTION",
         "Pw = 1.00*1.25*6.67 = 8.34 kN/m", "CAL-FML-P00791-005", 791,
         "Lateral bracing wind design load 8.34 kN/m."),
        ("lateral_bracing.pe", "NUMERIC_SUBSTITUTION",
         "Pe = 1.00*1.00*48.81*0.765 = 37.34 kN/m", "CAL-FML-P00791-006", 791,
         "Lateral bracing seismic design load 37.34 kN/m."),
        ("wrapping.ac", "NUMERIC_SUBSTITUTION",
         "Ac = B*H = 1500*2280/100 = 34200 cm2", "CAL-FML-P00819-001", 819,
         "Wrapping concrete S1 section area 34200 cm2."),
        ("wrapping.asreq", "NUMERIC_SUBSTITUTION",
         "Asreq = Ac*0.15% = 34200*0.0015 = 51.30 cm2",
         "CAL-FML-P00819-002", 819,
         "Wrapping concrete S1 min rebar area 51.30 cm2."),
        ("deck.thickness_formula", "NUMERIC_SUBSTITUTION",
         "hc = 25*L+110 = 223 mm", "CH2-VAL-038", 19,
         "Composite deck thickness formula hc = 223 mm."),
    ]
    for label, sem, expr, src, page, note in fml_defs:
        adoption = ("EXCLUDED_DERIVED_VALUE"
                    if sem == "NUMERIC_SUBSTITUTION"
                    else "EXCLUDED_DESIGN_RESULT")
        formula_traces.append(make_candidate(
            next_id("DS"), "ENT-GIRDER-AG1", "design",
            f"formula_trace.{label}", sem, expr, "", src, calc_loc(page), "",
            "HIGH", "UNVERIFIED", "CALC_ONLY", adoption, "GOLDEN_EXCLUDED",
            notes=note))

    # ---------- registered design gaps (no fabrication) ----------
    gap_defs = [
        ("stiffeners.vertical", "ENT-GIRDER-AG1", "NOTE",
         s32("notes", 13), 291, "ONE_SOURCE_ONLY",
         "HUMAN_CONFIRMATION_REQUIRED", "HCR-002", "ORPHAN_LOG",
         "Vertical stiffener design policy extracted as note only; no "
         "numeric check values registered."),
        ("splice.field", "ENT-GIRDER-AG1", "NOTE",
         s32("notes", 35) + "," + s32("tables", 43), 379, "ONE_SOURCE_ONLY",
         "HUMAN_CONFIRMATION_REQUIRED", "HCR-002", "ORPHAN_LOG",
         "Field splice design described by equations/tables; bolt-level "
         "results not individually extracted."),
        ("welding.flange_web", "ENT-GIRDER-AG1", "welding",
         s32("tables", 46), 667, "ONE_SOURCE_ONLY",
         "HUMAN_CONFIRMATION_REQUIRED", "HCR-002", "ORPHAN_LOG",
         "Flange-web weld verification table present; per-weld values not "
         "extracted."),
        ("camber.drawings", "ENT-GIRDER-AG1", "camber",
         s32("values", 18), "", "DRAWING_ONLY",
         "EXCLUDED_DRAWING_ONLY", "", "GOLDEN_EXCLUDED",
         "Camber diagram/table on drawing sheet 20 only; no calc camber "
         "values."),
    ]
    for label, ent, sem, src, page, parity, adoption, hcr, phase3, note \
            in gap_defs:
        dwg = "020" if label == "camber.drawings" else ""
        conf = "MEDIUM" if dwg else ("LOW" if hcr else "HIGH")
        judgments.append(make_candidate(
            next_id("DS"), ent, "design", f"design_gap.{label}", sem, "", "",
            src, calc_loc(page), dwg_loc(dwg) if dwg else "", conf,
            "UNVERIFIED", parity, adoption, phase3, notes=note,
            human_confirmation_id=hcr))

    write_csv(os.path.join(OUT["design"], "section_property_candidate.csv"),
              CANDIDATE_HEADER, section_props)
    write_csv(os.path.join(OUT["design"], "stress_candidate.csv"),
              CANDIDATE_HEADER, stresses)
    write_csv(os.path.join(OUT["design"], "limit_candidate.csv"),
              CANDIDATE_HEADER, limits)
    write_csv(os.path.join(OUT["design"], "check_ratio_candidate.csv"),
              CANDIDATE_HEADER, ratios)
    write_csv(os.path.join(OUT["design"], "judgment_candidate.csv"),
              CANDIDATE_HEADER, judgments)
    write_csv(os.path.join(OUT["design"], "formula_trace_candidate.csv"),
              CANDIDATE_HEADER, formula_traces)

    for k, v in [("design_section_property", len(section_props)),
                 ("design_stress", len(stresses)),
                 ("design_limit", len(limits)),
                 ("design_check_ratio", len(ratios)),
                 ("design_judgment", len(judgments)),
                 ("design_formula_trace", len(formula_traces))]:
        log[k] = v


# ===========================================================================
# 2. ADOPTED DESIGN LAYER
# ===========================================================================
def build_adopted_design_layer(log):
    sections = []
    materials = []
    bearings = []
    dimensions = []

    # ---------- adopted sections (ADV-001..007) ----------
    adv_section = [
        ("ag1.sec-1.uflg", "PL620x22 SM490Y", "620 x 22", "mm",
         "ADV-001," + s32("values", 28), "AG1 Sec-1 upper flange."),
        ("ag1.sec-1.web", "PL2537x14 SM490Y", "2537 x 14", "mm",
         "ADV-002," + s32("values", 29), "AG1 Sec-1 web."),
        ("ag1.sec-1.lflg", "PL680x21 SM490Y", "680 x 21", "mm",
         "ADV-003," + s32("values", 30),
         "AG1 Sec-1 lower flange (calc width 680 mm; drawing 700 mm "
         "CONF-P2II-001)."),
        ("ag1.sec-3.uflg", "PL620x27 SM490Y", "620 x 27", "mm",
         "ADV-004," + s32("values", 35),
         "AG1 Sec-3 upper flange (max positive moment)."),
        ("ag1.sec-3.lflg", "PL680x21 SM490Y", "680 x 21", "mm",
         "ADV-005," + s32("values", 36), "AG1 Sec-3 lower flange."),
        ("ag1.sec-6.uflg", "PL620x39 SM490Y", "620 x 39", "mm",
         "ADV-006," + s32("values", 47),
         "AG1 Sec-6 upper flange (support, max negative moment)."),
        ("ag1.sec-6.lflg", "PL680x47 SM520-H", "680 x 47", "mm",
         "ADV-007," + s32("values", 48),
         "AG1 Sec-6 lower flange SM520-H (support)."),
    ]
    for label, desc, val, unit, src, note in adv_section:
        conflict = "CONF-P2II-001" if label.endswith("lflg") else ""
        if conflict:
            note += (" Adoption based on calc value; drawing plate width "
                     "700 mm differs (CONF-P2II-001).")
        sections.append(make_candidate(
            next_id("AD"), "ENT-GIRDER-AG1", "adopted_design",
            f"adopted_section.{label}", "SECTION_PROPERTY", val, unit, src,
            calc_loc(297), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
            "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=note,
            conflict_id=conflict))

    # ---------- adopted materials (material_section_index) ----------
    adv_mat = [
        ("steel_sm490y", "steel_grade", "SM490Y", "",
         "MATSEC-004,CH1-VAL-027,CH2-VAL-009", "Main structural steel grade."),
        ("steel_sm400", "steel_grade", "SM400", "",
         "MATSEC-005,CH1-VAL-028", "Mild steel grade."),
        ("steel_sm520", "steel_grade", "SM520", "",
         "MATSEC-003,CH1-VAL-026", "High-strength steel grade."),
        ("steel_ss400", "steel_grade", "SS400", "",
         "MATSEC-006,CH1-VAL-029", "General structural steel grade."),
        ("steel_sm520h", "steel_grade", "SM520-H", "",
         s32("values", 5) + ",ADV-007",
         "High-strength steel for thick plates (47 mm LFLG Sec-6)."),
        ("rebar_sd345", "MATERIAL_PROPERTY", "SD345", "",
         "MATSEC-013,CH1-VAL-033", "Rebar grade."),
        ("concrete_deck_ck30", "concrete_strength", "30", "N/mm2",
         "MATSEC-010,CH1-VAL-030,CH2-VAL-020",
         "Concrete design strength for composite deck / wrapping."),
        ("concrete_wall_rail_ck24", "concrete_strength", "24", "N/mm2",
         "CH1-VAL-031", "Concrete design strength wall rail."),
        ("elastic_modulus_steel", "elastic_modulus", "2.0e8", "kN/m2",
         "MATSEC-001,CAL-VAL-P00149-001",
         "Steel Young's modulus E=2.0e8 kN/m2."),
        ("shear_modulus_steel", "shear_modulus", "7.7e7", "kN/m2",
         "MATSEC-002,CAL-VAL-P00149-002",
         "Steel shear modulus G=7.7e7 kN/m2."),
        ("yield_strength_sm490y", "yield_strength", "355", "N/mm2",
         "MATSEC-007,CAL-VAL-P01285-001,CH2-VAL-011",
         "SM490Y yield point sigma_y."),
        ("tensile_strength_sm490y", "MATERIAL_PROPERTY", "490", "N/mm2",
         "MATSEC-008,CAL-VAL-P01285-002", "SM490Y tensile strength sigma_su."),
        ("shear_yield_sm490y", "MATERIAL_PROPERTY", "205", "N/mm2",
         "MATSEC-009,CAL-VAL-P01285-003", "SM490Y shear yield tau_y."),
    ]
    for label, sem, val, unit, src, note in adv_mat:
        materials.append(make_candidate(
            next_id("AD"), "ENT-GIRDER-AG1", "adopted_design",
            f"adopted_material.{label}", sem, val, unit, src, calc_loc(149),
            "", "HIGH", "UNVERIFIED", "CALC_ONLY", "CANDIDATE_ONLY",
            "GOLDEN_ELIGIBLE", notes=note))

    # ---------- adopted bearings (chapter_05) ----------
    adv_bear = [
        ("PU15.type", "bearing_type", "E", "", "CH5-VAL-004",
         "PU15 elastic-fixed bearing (E), side-block restraint.",
         "ENT-SUPPORT-PU15", 2027),
        ("PU15.rubber_layer", "DIMENSION", "32", "mm",
         "ADV-011,CH5-VAL-016", "PU15 rubber layer te=32 mm x 5 layers.",
         "ENT-SUPPORT-PU15", 2031),
        ("PU15.rubber_total", "DIMENSION", "160", "mm",
         "CH5-VAL-017", "PU15 total rubber thickness sum te.",
         "ENT-SUPPORT-PU15", 2031),
        ("PU15.rubber_count", "DERIVED_VALUE", "5", "\u5c64",
         "CH5-VAL-020", "PU15 rubber layer count.", "ENT-SUPPORT-PU15", 2031),
        ("PU15.lead_plug", "DIMENSION", "95", "mm",
         "ADV-013,CH5-VAL-024", "PU15 lead plug diameter phi_d 95 mm x 4.",
         "ENT-SUPPORT-PU15", 2031),
        ("PU15.lead_plug_count", "DERIVED_VALUE", "4", "\u672c",
         "CH5-VAL-026", "PU15 lead plug count NP=4.", "ENT-SUPPORT-PU15", 2031),
        ("PU15.stiffness", "MATERIAL_PROPERTY", "12.391", "kN/mm",
         "CH5-VAL-031", "PU15 combined stiffness Km at +-50 deg C.",
         "ENT-SUPPORT-PU15", 2034),
        ("PR1.type", "bearing_type", "E", "", "CH5-VAL-004",
         "PR1 elastic-fixed bearing (E).", "ENT-SUPPORT-PR1", 2027),
        ("PR1.rubber_layer", "DIMENSION", "37", "mm",
         "ADV-012,CH5-VAL-018", "PR1 rubber layer te=37 mm x 5 layers.",
         "ENT-SUPPORT-PR1", 2031),
        ("PR1.rubber_total", "DIMENSION", "185", "mm",
         "CH5-VAL-019", "PR1 total rubber thickness sum te.",
         "ENT-SUPPORT-PR1", 2031),
        ("PR1.lead_plug", "DIMENSION", "150", "mm",
         "ADV-014,CH5-VAL-025", "PR1 lead plug diameter phi_d 150 mm.",
         "ENT-SUPPORT-PR1", 2031),
        ("PR1.stiffness", "MATERIAL_PROPERTY", "37.613", "kN/mm",
         "CH5-VAL-032", "PR1 combined stiffness Km at +-50 deg C.",
         "ENT-SUPPORT-PR1", 2034),
        ("PR2.stiffness", "MATERIAL_PROPERTY", "35.271", "kN/mm",
         "CH5-VAL-033", "PR2 combined stiffness Km at +-50 deg C.",
         "ENT-SUPPORT-PR2", 2034),
        ("AR2.stiffness", "MATERIAL_PROPERTY", "12.112", "kN/mm",
         "CH5-VAL-034", "AR2 combined stiffness Km at +-50 deg C.",
         "ENT-SUPPORT-AR2", 2034),
        ("step_prevention.buffer", "DIMENSION", "900", "mm",
         "ADV-015,CH5-VAL-048", "Step-prevention buffer length 900 mm.",
         "ENT-SUPPORT-AR2", 2192),
        ("step_prevention.top_plate", "DIMENSION", "25", "mm",
         "CH5-VAL-050", "Step-prevention top plate thickness 25 mm.",
         "ENT-SUPPORT-AR2", 2192),
    ]
    for label, sem, val, unit, src, note, ent, page in adv_bear:
        bearings.append(make_candidate(
            next_id("AD"), ent, "adopted_design",
            f"adopted_bearing.{label}", sem, val, unit, src, calc_loc(page),
            "", "HIGH", "UNVERIFIED", "CALC_ONLY", "CANDIDATE_ONLY",
            "GOLDEN_ELIGIBLE", notes=note))

    # ---------- adopted dimensions (chapter_01 + deck) ----------
    adv_dim = [
        ("bridge_length", "bridge_length", "134.001", "m",
         "CH1-VAL-005,GEO-001,DWG-DIM-S001-001", 7, dwg_loc("001"), "BOTH",
         "Overall bridge length on ACL; drawing 134001 mm."),
        ("girder_length_ag1", "girder_length", "133.151", "m",
         "CH1-VAL-006,GEO-008", 7, dwg_loc("001"), "BOTH",
         "Girder length AG1 (calc 133.151 m; drawing 133151 mm)."),
        ("girder_length_ag2", "girder_length", "132.847", "m",
         s32("values", 19) + ",GEO-008", 297, dwg_loc("001"), "BOTH",
         "Girder length AG2 (calc 132.847 m; drawing 132847 mm)."),
        ("span_1", "span_length", "40.201", "m",
         "CH1-VAL-007,GEO-002,DWG-DIM-S001-003", 7, dwg_loc("001"), "BOTH",
         "Span length 1 (ACL)."),
        ("span_2", "span_length", "51.000", "m",
         "CH1-VAL-008,GEO-003,DWG-DIM-S001-003", 7, dwg_loc("001"), "BOTH",
         "Span length 2 (ACL)."),
        ("span_3", "span_length", "40.200", "m",
         "CH1-VAL-009,GEO-004,DWG-DIM-S001-003", 7, dwg_loc("001"), "BOTH",
         "Span length 3 (ACL)."),
        ("total_width", "total_width", "8.010", "m",
         "CH1-VAL-010,GEO-005,DWG-DIM-S009-006", 7, dwg_loc("009"), "BOTH",
         "Deck total width; drawing 8031.7/8010.3/8010 mm at S1/S2/PR1."),
        ("effective_width", "effective_width", "7.000", "m",
         "CH1-VAL-011,GEO-006", 7, "", "CALC_ONLY",
         "Effective roadway width 7.000 m (calc only)."),
        ("girder_spacing", "girder_spacing", "4500", "mm",
         "DWG-DIM-S001-004,CH1-TBL-064", 10, dwg_loc("001"), "BOTH",
         "Main girder spacing 4500 mm."),
        ("girder_height", "girder_height", "2700", "mm",
         "DWG-DIM-S001-005," + s32("values", 8), 293, dwg_loc("001"), "BOTH",
         "Reference girder height 2700 mm."),
        ("deck_thickness", "deck_thickness", "230", "mm",
         "CH1-VAL-022,CH2-VAL-022,DWG-DIM-S009-007", 7, dwg_loc("009"),
         "BOTH", "Composite deck thickness 230 mm."),
        ("pavement_thickness", "DIMENSION", "80", "mm",
         "CH1-VAL-021,DWG-DIM-S009-008", 7, dwg_loc("009"), "BOTH",
         "Pavement thickness 80 mm."),
        ("stud_size", "DIMENSION", "\u03c616\u00d7160", "mm",
         "ADV-008,CH2-VAL-030", 19, "", "CALC_ONLY",
         "Composite-deck stud size phi16x160 mm."),
        ("main_rebar", "IDENTIFIER", "D19@100", "",
         "ADV-009,CH2-VAL-034", 20, "", "CALC_ONLY",
         "Composite slab main reinforcement D19@100."),
        ("distribution_rebar_support", "IDENTIFIER", "D22@125", "",
         "ADV-010,CH2-VAL-037", 20, "", "CALC_ONLY",
         "Distribution rebar at intermediate support D22@125."),
        ("rib_height", "DIMENSION", "100", "mm",
         "ADV-016,CH2-VAL-028", 19, "", "CALC_ONLY",
         "Composite deck lateral rib height 100 mm."),
    ]
    for label, sem, val, unit, src, page, dwg, parity, note in adv_dim:
        dimensions.append(make_candidate(
            next_id("AD"), "ENT-DECK", "adopted_design",
            f"adopted_dimension.{label}", sem, val, unit, src, calc_loc(page),
            dwg, "HIGH", "UNVERIFIED", parity, "CANDIDATE_ONLY",
            "GOLDEN_ELIGIBLE", notes=note))

    write_csv(os.path.join(OUT["adopted_design"],
                           "adopted_section_candidate.csv"),
              CANDIDATE_HEADER, sections)
    write_csv(os.path.join(OUT["adopted_design"],
                           "adopted_material_candidate.csv"),
              CANDIDATE_HEADER, materials)
    write_csv(os.path.join(OUT["adopted_design"],
                           "adopted_bearing_candidate.csv"),
              CANDIDATE_HEADER, bearings)
    write_csv(os.path.join(OUT["adopted_design"],
                           "adopted_dimension_candidate.csv"),
              CANDIDATE_HEADER, dimensions)

    for k, v in [("adopted_section", len(sections)),
                 ("adopted_material", len(materials)),
                 ("adopted_bearing", len(bearings)),
                 ("adopted_dimension", len(dimensions))]:
        log[k] = v


# ===========================================================================
# 3. REPORT LAYER
# ===========================================================================
def build_report_layer(log):
    chapters = []
    sections = []
    tables = []
    formulas = []
    figures = []
    notes = []
    layouts = []

    chapters.append(make_candidate(
        next_id("RP"), "ENT-LINE-ACL", "report", "report.chapter.front_matter",
        "text", "\u8868\u7d19\u30fb\u76ee\u6b21", "",
        "FM-PE-001,FM-PE-002,FM-PE-008", calc_loc(1), "", "HIGH",
        "UNVERIFIED", "CALC_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
        notes="Calculation book front matter (cover pages 1-2, TOC page 3)."))

    section_types = {"section_title", "section_header", "subsection_title",
                     "subsection_header", "sub_section", "sub_sub_section",
                     "subsection_title"}
    chapter_types = {"chapter_title", "section_header", "chapter_header"}

    for rel, kind, rows in iter_calc_files():
        if kind == "page_elements":
            for i, r in enumerate(rows):
                rid = calc_src_id(rel, kind, r, i)
                etype = sget(r, "element_type")
                title = sget(r, "title_raw")
                page = sget(r, "pdf_page_number")
                sem = "text"
                if etype in ("note", "design_note", "design_item",
                             "design_condition", "text_block"):
                    sem = "NOTE"
                elif etype == "figure":
                    sem = "figure"
                layouts.append(make_candidate(
                    next_id("RP"), "ENT-LINE-ACL", "report",
                    f"report.layout.{rid}", sem, title, "", rid,
                    calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
                    "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                    notes=f"Page element type '{etype}'."))
                if etype in chapter_types and re.match(r"^第[1-5]章",
                                                       title or ""):
                    chapters.append(make_candidate(
                        next_id("RP"), "ENT-LINE-ACL", "report",
                        f"report.chapter.{rid}", "text", title, "", rid,
                        calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
                        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                        notes="Calculation chapter heading."))
                if etype in section_types:
                    sections.append(make_candidate(
                        next_id("RP"), "ENT-LINE-ACL", "report",
                        f"report.section.{rid}", "text", title, "", rid,
                        calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
                        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                        notes=f"Calculation section heading (type {etype})."))
        elif kind == "tables":
            for i, r in enumerate(rows):
                rid = calc_src_id(rel, kind, r, i)
                page = sget(r, "pdf_page_number", "pdf_page")
                title = sget(r, "title_raw", "table_title")
                tables.append(make_candidate(
                    next_id("RP"), "ENT-LINE-ACL", "report",
                    f"report.table.{rid}", "table", title, "", rid,
                    calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
                    "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                    notes="Calculation table record."))
        elif kind == "formulas":
            for i, r in enumerate(rows):
                rid = calc_src_id(rel, kind, r, i)
                page = sget(r, "pdf_page_number")
                label = sget(r, "formula_label_raw", "description", "symbol")
                expr = sget(r, "expression_raw", "equation")
                raw_sem = sget(r, "semantic_class")
                if raw_sem:
                    sem = map_semantic(raw_sem)
                else:
                    sem = "FORMULA_DEFINITION"
                adoption = ("EXCLUDED_DERIVED_VALUE"
                            if sem == "NUMERIC_SUBSTITUTION"
                            else "CANDIDATE_ONLY")
                phase3 = ("GOLDEN_EXCLUDED"
                          if sem == "NUMERIC_SUBSTITUTION"
                          else "GOLDEN_ELIGIBLE")
                formulas.append(make_candidate(
                    next_id("RP"), "ENT-LINE-ACL", "report",
                    f"report.formula.{rid}", sem, expr or label, "", rid,
                    calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
                    adoption, phase3, notes=f"Formula '{label}'."))
        elif kind == "figures":
            for i, r in enumerate(rows):
                rid = calc_src_id(rel, kind, r, i)
                page = sget(r, "pdf_page_number")
                title = sget(r, "title_raw", "title")
                figures.append(make_candidate(
                    next_id("RP"), "ENT-LINE-ACL", "report",
                    f"report.figure.{rid}", "figure", title, "", rid,
                    calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
                    "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                    notes="Calculation figure record."))
        elif kind == "notes":
            for i, r in enumerate(rows):
                rid = calc_src_id(rel, kind, r, i)
                page = sget(r, "pdf_page_number")
                nsum = sget(r, "note_summary", "note_text")
                nkind = sget(r, "note_kind", "category")
                notes.append(make_candidate(
                    next_id("RP"), "ENT-LINE-ACL", "report",
                    f"report.note.{rid}", "NOTE", nsum, "", rid,
                    calc_loc(page), "", "HIGH", "UNVERIFIED", "CALC_ONLY",
                    "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                    notes=f"Calculation note (kind {nkind})."))

    write_csv(os.path.join(OUT["report"], "report_chapter_candidate.csv"),
              CANDIDATE_HEADER, chapters)
    write_csv(os.path.join(OUT["report"], "report_section_candidate.csv"),
              CANDIDATE_HEADER, sections)
    write_csv(os.path.join(OUT["report"], "report_table_candidate.csv"),
              CANDIDATE_HEADER, tables)
    write_csv(os.path.join(OUT["report"], "report_formula_candidate.csv"),
              CANDIDATE_HEADER, formulas)
    write_csv(os.path.join(OUT["report"], "report_figure_candidate.csv"),
              CANDIDATE_HEADER, figures)
    write_csv(os.path.join(OUT["report"], "report_note_candidate.csv"),
              CANDIDATE_HEADER, notes)
    write_csv(os.path.join(OUT["report"], "report_layout_candidate.csv"),
              CANDIDATE_HEADER, layouts)

    for k, v in [("report_chapter", len(chapters)),
                 ("report_section", len(sections)),
                 ("report_table", len(tables)),
                 ("report_formula", len(formulas)),
                 ("report_figure", len(figures)),
                 ("report_note", len(notes)),
                 ("report_layout", len(layouts))]:
        log[k] = v


# ===========================================================================
# 4. DRAWING LAYER
# ===========================================================================
def build_drawing_layer(log):
    sheets = []
    views = []
    dimensions = []
    annotations = []
    members = []
    tables = []
    title_blocks = []
    references = []

    draw_ids = build_drawing_src_ids()

    groups = ["sheets_001_044", "sheets_045_088", "sheets_089_141"]
    draw_files = {}
    for g in groups:
        d = os.path.join(P2I, "drawings", g)
        draw_files[g] = {
            os.path.basename(p)[:-4]: read_csv(p)
            for p in sorted(glob.glob(os.path.join(d, "*.csv")))
        }

    # ---------- drawing sheets (1..141) ----------
    for sheet in range(1, 142):
        info = sheet_info_map[sheet]
        pdf = info["pdf"]
        title = info["title"]
        if sheet == 141:
            src = "S141-E01,TB01"
            conf, vs, hcr, issue = "MEDIUM", "PARTIAL", "HCR-001", "ISSUE-001"
        else:
            src = f"DWG-TB-S{sheet:03d}-001"
            conf = "HIGH"
            vs = info["verification"] or "UNVERIFIED"
            hcr, issue = "", info["issue"] or ""
        sheets.append(make_candidate(
            next_id("DR"), "ENT-LINE-ACL", "drawing",
            f"drawing.sheet.{sheet}", "text", title, "", src, calc_loc(pdf),
            dwg_loc(sheet), conf, vs, "DRAWING_ONLY", "CANDIDATE_ONLY",
            "GOLDEN_ELIGIBLE",
            notes=f"Drawing sheet {sheet} ({info['group']}).",
            human_confirmation_id=hcr, issue_id=issue))

    # ---------- drawing element CSVs ----------
    view_seq = {}

    def view_loc(sheet, seq):
        s3 = "001" if str(sheet) == "all" else f"{int(sheet):03d}"
        return f"DWG-S{s3}-V{seq:02d}"

    def sheet_entity(sheet):
        if str(sheet) == "all":
            return "ENT-LINE-ACL"
        s = int(sheet)
        if s in (13, 21, 22, 23, 24, 25, 26, 27, 28, 29):
            return "ENT-GIRDER-AG1"
        if s in (14, 30, 31, 32, 33, 34, 35, 36, 37, 38):
            return "ENT-GIRDER-AG2"
        if s in (39, 40, 41, 42, 43, 44):
            return "ENT-STUD"
        if s in (45, 46, 47, 48):
            return "ENT-XBEAM-GE1"
        if s in (49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60):
            return "ENT-XBEAM-C1C7"
        if s in (61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71):
            return "ENT-BRACE-AL1"
        if s in (72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83):
            return "ENT-SUPPORT-PR1"
        if s in (85, 86, 87, 88):
            return "ENT-SUPPORT-PU15"
        if s in (9, 15, 16, 84, 93, 94, 95, 96, 97, 98, 99, 100):
            return "ENT-DECK"
        return "ENT-LINE-ACL"

    for g in groups:
        fs = draw_files[g]
        for kind in ("views", "dimensions", "annotations", "members",
                     "tables", "title_blocks", "references"):
            if kind not in fs:
                continue
            for i, r in enumerate(fs[kind]):
                rid = draw_ids.get((g, kind, i), "")
                sheet = sget(r, "sheet_number") or "all"
                sent = sheet_entity(sheet)
                if sheet == "all":
                    pdf, dl = "3", "DWG-S001"
                else:
                    sheetn = int(sheet)
                    pdf = sheet_info_map.get(sheetn, {}).get("pdf", "")
                    dl = dwg_loc(sheetn)
                conf = "HIGH"
                vs = "UNVERIFIED"
                hcr = ""
                if str(sheet) == "141":
                    conf, vs, hcr = "MEDIUM", "PARTIAL", "HCR-001"

                if kind == "views":
                    vname = sget(r, "view_name", "view_label", "view_title")
                    vtype = sget(r, "view_type")
                    key = (str(sheet), vname)
                    view_seq[key] = view_seq.get(key, 0) + 1
                    views.append(make_candidate(
                        next_id("DR"), sent, "drawing",
                        f"drawing.view.{rid}", "figure", vname, "", rid,
                        calc_loc(pdf), view_loc(sheet, view_seq[key]), conf,
                        vs, "DRAWING_ONLY", "CANDIDATE_ONLY",
                        "GOLDEN_ELIGIBLE",
                        notes=f"Drawing view type '{vtype}'.",
                        human_confirmation_id=hcr))
                elif kind == "dimensions":
                    val = sget(r, "value", "value_raw", "value_numeric")
                    unit = sget(r, "unit")
                    label = sget(r, "japanese_name", "item", "label",
                                 "dimension_type")
                    notes = sget(r, "notes", "description")
                    conflict = ""
                    if rid == "DWG-DIM-S013-014":
                        conflict = "CONF-P2II-001"
                        notes = ("CONFLICT: drawing bottom flange width "
                                 "700 mm vs calc 680 mm (CONF-P2II-001).")
                    dimensions.append(make_candidate(
                        next_id("DR"), sent, "drawing",
                        f"drawing.dimension.{rid}", "DIMENSION", val, unit,
                        rid, calc_loc(pdf), dl, conf, vs, "DRAWING_ONLY",
                        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=notes,
                        conflict_id=conflict, human_confirmation_id=hcr))
                elif kind == "annotations":
                    txt = sget(r, "japanese_text", "raw_text",
                               "annotation_text")
                    an_type = sget(r, "annotation_type", "category")
                    annotations.append(make_candidate(
                        next_id("DR"), sent, "drawing",
                        f"drawing.annotation.{rid}", "NOTE", txt, "", rid,
                        calc_loc(pdf), dl, conf, vs, "DRAWING_ONLY",
                        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                        notes=f"Drawing annotation type '{an_type}'.",
                        human_confirmation_id=hcr))
                elif kind == "members":
                    mid = sget(r, "member_id", "part_name", "part_no")
                    desc = sget(r, "english_name", "dimensions",
                                "description", "material")
                    members.append(make_candidate(
                        next_id("DR"), sent, "drawing",
                        f"drawing.member.{rid}", "member_id", mid, "", rid,
                        calc_loc(pdf), dl, conf, vs, "DRAWING_ONLY",
                        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=desc,
                        human_confirmation_id=hcr))
                elif kind == "tables":
                    tname = sget(r, "table_name_jp", "table_title",
                                 "content_summary", "table_type")
                    desc = sget(r, "description", "entries", "content_json")
                    tables.append(make_candidate(
                        next_id("DR"), sent, "drawing",
                        f"drawing.table.{rid}", "table", tname, "", rid,
                        calc_loc(pdf), dl, conf, vs, "DRAWING_ONLY",
                        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=desc,
                        human_confirmation_id=hcr))
                elif kind == "title_blocks":
                    fname = sget(r, "bridge_name", "field_name", "field")
                    fval = sget(r, "raw_value", "value", "scale",
                                "sheet_number_in_set", "route_name")
                    if not fval:
                        fval = sget(r, "location", "total_sheets",
                                    "source_document", "drawing_title")
                    title_blocks.append(make_candidate(
                        next_id("DR"), sent, "drawing",
                        f"drawing.title_block.{rid}", "TITLE_BLOCK_VALUE",
                        fval, "", rid, calc_loc(pdf), dl, conf, vs,
                        "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
                        notes=f"Title block field '{fname}'.",
                        human_confirmation_id=hcr))
                elif kind == "references":
                    ref = sget(r, "drawing_title", "ref_type",
                               "reference_type", "to_calc_section")
                    desc = sget(r, "notes", "description")
                    references.append(make_candidate(
                        next_id("DR"), sent, "drawing",
                        f"drawing.reference.{rid}", "REFERENCE_TEXT", ref, "",
                        rid, calc_loc(pdf), dl, conf, vs, "DRAWING_ONLY",
                        "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE", notes=desc,
                        human_confirmation_id=hcr))

    # ---------- drawing sheet 141 (unread resolution / OCR) ----------
    def unread_rows(base):
        path = os.path.join(UNREAD_DIR, f"{base}.csv")
        if not os.path.exists(path):
            return []
        return read_csv(path)

    def ocr_conf(conf):
        c = conf or "HIGH"
        return "MEDIUM" if c == "HIGH" else "LOW"

    for r in unread_rows("drawing_sheet_141_views"):
        vid = sget(r, "view_id")
        vname = sget(r, "view_name", "view_name_jp")
        scale = sget(r, "scale")
        views.append(make_candidate(
            next_id("DR"), "ENT-LINE-ACL", "drawing", f"drawing.view.{vid}",
            "figure", vname, "", vid, calc_loc(143), dwg_loc(141),
            ocr_conf(sget(r, "confidence")), "PARTIAL", "DRAWING_ONLY",
            "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Sheet 141 OCR view; scale {scale}.",
            human_confirmation_id="HCR-001"))
    for r in unread_rows("drawing_sheet_141_dimensions"):
        did = sget(r, "dimension_id")
        label = sget(r, "label")
        val = sget(r, "value")
        unit = sget(r, "unit")
        dimensions.append(make_candidate(
            next_id("DR"), "ENT-LINE-ACL", "drawing",
            f"drawing.dimension.{did}", "DIMENSION", val, unit, did,
            calc_loc(143), dwg_loc(141), ocr_conf(sget(r, "confidence")),
            "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=sget(r, "notes"), human_confirmation_id="HCR-001"))
    for r in unread_rows("drawing_sheet_141_annotations"):
        aid = sget(r, "annotation_id")
        label = sget(r, "label")
        val = sget(r, "text_value")
        an_type = sget(r, "annotation_type")
        annotations.append(make_candidate(
            next_id("DR"), "ENT-LINE-ACL", "drawing",
            f"drawing.annotation.{aid}", "NOTE", val or label, "", aid,
            calc_loc(143), dwg_loc(141), ocr_conf(sget(r, "confidence")),
            "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Sheet 141 OCR annotation type '{an_type}'.",
            human_confirmation_id="HCR-001"))
    for r in unread_rows("drawing_sheet_141_elements"):
        eid = sget(r, "element_id")
        desc = sget(r, "description")
        val = sget(r, "value")
        annotations.append(make_candidate(
            next_id("DR"), "ENT-LINE-ACL", "drawing",
            f"drawing.annotation.{eid}", "NOTE", val or desc, "", eid,
            calc_loc(143), dwg_loc(141), ocr_conf(sget(r, "confidence")),
            "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Sheet 141 OCR element: {desc}.",
            human_confirmation_id="HCR-001"))
    for r in unread_rows("drawing_sheet_141_erection_blocks"):
        bid = sget(r, "block_id")
        weight = sget(r, "block_weight_t")
        order = sget(r, "erection_order")
        annotations.append(make_candidate(
            next_id("DR"), "ENT-LINE-ACL", "drawing",
            f"drawing.annotation.{bid}.weight", "LOAD_VALUE", weight, "t", bid,
            calc_loc(143), dwg_loc(141), ocr_conf(sget(r, "confidence")),
            "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Sheet 141 erection block order {order}, W={weight} t.",
            human_confirmation_id="HCR-001"))
    tables.append(make_candidate(
        next_id("DR"), "ENT-LINE-ACL", "drawing",
        "drawing.table.s141.crane_capacity", "table",
        "120t\u540a\u5b9a\u683c\u8377\u91cd\u8868 TADANO ATF120N-5.1 "
        "(A\u6027\u80fd)", "", "S141-V04,S141-C01,S141-C30", calc_loc(143),
        dwg_loc(141), "MEDIUM", "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY",
        "GOLDEN_ELIGIBLE",
        notes="Sheet 141 crane capacity table (OCR); 30 capacity rows.",
        human_confirmation_id="HCR-001"))
    for r in unread_rows("drawing_sheet_141_crane_capacity"):
        cid = sget(r, "row_id")
        boom = sget(r, "boom_length_m")
        radius = sget(r, "working_radius_m")
        cap = sget(r, "rated_capacity_t")
        if cap in ("", None):
            val = f"boom {boom} m, radius {radius} m, blank"
        else:
            val = f"boom {boom} m, radius {radius} m, {cap} t"
        tables.append(make_candidate(
            next_id("DR"), "ENT-LINE-ACL", "drawing",
            f"drawing.table.s141.crane_capacity.{cid}", "table", val, "", cid,
            calc_loc(143), dwg_loc(141), ocr_conf(sget(r, "confidence")),
            "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes="Sheet 141 crane capacity table row (OCR).",
            human_confirmation_id="HCR-001"))
    for r in unread_rows("drawing_sheet_141_title_block"):
        fid = sget(r, "field_id")
        field = sget(r, "title_block_field")
        val = sget(r, "value")
        title_blocks.append(make_candidate(
            next_id("DR"), "ENT-LINE-ACL", "drawing",
            f"drawing.title_block.{fid}", "TITLE_BLOCK_VALUE", val, "", fid,
            calc_loc(143), dwg_loc(141), ocr_conf(sget(r, "confidence")),
            "PARTIAL", "DRAWING_ONLY", "CANDIDATE_ONLY", "GOLDEN_ELIGIBLE",
            notes=f"Sheet 141 OCR title block field '{field}'.",
            human_confirmation_id="HCR-001"))

    write_csv(os.path.join(OUT["drawing"], "drawing_sheet_candidate.csv"),
              CANDIDATE_HEADER, sheets)
    write_csv(os.path.join(OUT["drawing"], "drawing_view_candidate.csv"),
              CANDIDATE_HEADER, views)
    write_csv(os.path.join(OUT["drawing"], "drawing_dimension_candidate.csv"),
              CANDIDATE_HEADER, dimensions)
    write_csv(os.path.join(OUT["drawing"], "drawing_annotation_candidate.csv"),
              CANDIDATE_HEADER, annotations)
    write_csv(os.path.join(OUT["drawing"], "drawing_member_candidate.csv"),
              CANDIDATE_HEADER, members)
    write_csv(os.path.join(OUT["drawing"], "drawing_table_candidate.csv"),
              CANDIDATE_HEADER, tables)
    write_csv(os.path.join(OUT["drawing"], "drawing_title_block_candidate.csv"),
              CANDIDATE_HEADER, title_blocks)
    write_csv(os.path.join(OUT["drawing"], "drawing_reference_candidate.csv"),
              CANDIDATE_HEADER, references)

    for k, v in [("drawing_sheet", len(sheets)),
                 ("drawing_view", len(views)),
                 ("drawing_dimension", len(dimensions)),
                 ("drawing_annotation", len(annotations)),
                 ("drawing_member", len(members)),
                 ("drawing_table", len(tables)),
                 ("drawing_title_block", len(title_blocks)),
                 ("drawing_reference", len(references))]:
        log[k] = v


# ===========================================================================
# 5. TRACEABILITY
# ===========================================================================
def build_traceability(log):
    entity_rows = []
    src2cand = []
    value_rows = []
    fml_result = []
    calc_dwg = []
    adopted_val = []
    report_dwg = []

    layer_rows = {}
    for layer in ("design", "adopted_design", "report", "drawing"):
        layer_rows[layer] = []
        d = os.path.join(CAND_DIR, layer)
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".csv"):
                continue
            layer_rows[layer].extend(read_csv(os.path.join(d, fn)))

    # ---------- entity crosswalk ----------
    ent_src = {}
    ent_cand = {}
    for layer, rows in layer_rows.items():
        for r in rows:
            ent = r.get("entity_id") or ""
            if not ent:
                continue
            ent_cand.setdefault(ent, []).append(r["candidate_id"])
            for sid in (r.get("source_record_ids") or "").split(","):
                sid = sid.strip()
                if sid:
                    ent_src.setdefault(ent, []).append(sid)
    ENTITY_NAMES = {
        "ENT-LINE-ACL": "Alignment center line (ACL)",
        "ENT-GIRDER-AG1": "Main girder AG1",
        "ENT-GIRDER-AG2": "Main girder AG2",
        "ENT-DECK": "RC / composite deck",
        "ENT-SUPPORT-PU15": "Support line PU15",
        "ENT-SUPPORT-PR1": "Support line PR1",
        "ENT-SUPPORT-PR2": "Support line PR2",
        "ENT-SUPPORT-AR2": "Support line AR2",
        "ENT-XBEAM-GE1": "End cross beam GE1",
        "ENT-XBEAM-GE2": "End cross beam GE2",
        "ENT-XBEAM-C1C7": "Intermediate cross beams C1-C7",
        "ENT-XBEAM-C8C13": "Intermediate cross beams C8-C13",
        "ENT-XBEAM-C14C20": "Intermediate cross beams C14-C20",
        "ENT-XBEAM-C21C23": "Intermediate cross beams C21-C23",
        "ENT-BRACE-AL1": "Lateral bracing A-L1",
        "ENT-BRACE-AL2": "Lateral bracing A-L2",
        "ENT-STUD": "Head stud",
        "ENT-STIFF-VSTIFF": "Vertical stiffener",
        "ENT-STIFF-JACKSTIFF": "Jack-up stiffener",
        "ENT-SOLEPL": "Sole plate",
        "ENT-NOSE": "Nose section",
        "ENT-NOSE-HNO1": "Nose section H-NO1",
    }
    for ent in sorted(ent_cand):
        srcs = sorted(set(ent_src.get(ent, [])))
        cands = sorted(set(ent_cand.get(ent, [])))
        if ent.startswith("ENT-SUPPORT"):
            kind = "support entity"
        elif ent.startswith("ENT-XBEAM"):
            kind = "cross-beam entity"
        elif ent.startswith("ENT-BRACE"):
            kind = "bracing entity"
        else:
            kind = "domain/design entity"
        entity_rows.append({
            "trace_id": next_id("TR"),
            "entity_id": ent,
            "entity_name": ENTITY_NAMES.get(ent, ent),
            "entity_kind": kind,
            "source_record_ids": ",".join(srcs),
            "candidate_ids": ",".join(cands),
            "notes": "",
        })

    # ---------- source -> candidate ----------
    src_meta = {}
    for r in read_csv(os.path.join(CAND_DIR, "source",
                                   "source_record_catalog.csv")):
        src_meta[r["source_record_id"]] = r
    for layer, rows in layer_rows.items():
        for r in rows:
            for sid in (r.get("source_record_ids") or "").split(","):
                sid = sid.strip()
                if not sid:
                    continue
                meta = src_meta.get(sid, {})
                src2cand.append({
                    "trace_id": next_id("TR"),
                    "source_record_id": sid,
                    "candidate_id": r["candidate_id"],
                    "source_type": meta.get("source_type", ""),
                    "source_locator": meta.get("source_locator", ""),
                    "candidate_layer": r["candidate_layer"],
                    "notes": "",
                })

    # ---------- value traceability chains ----------
    def cid(layer, fld):
        return lookup(layer, fld)

    value_chains = [
        ("bridge_length",
         "input(CH1-VAL-005)->candidate(GEO-001/INP)->drawing"
         "(DWG-DIM-S001-001)->adopted(AD)", "ENT-LINE-ACL",
         "CH1-VAL-005,DWG-DIM-S001-001,GEO-001",
         f"GEO-001,{cid('adopted_design', 'adopted_dimension.bridge_length')}",
         "BOTH", "HIGH", "134.001 m calc vs 134001 mm drawing."),
        ("girder_length_ag1",
         "input(CH1-VAL-006)->drawing(DWG-DIM-S001-002)->adopted(AD)",
         "ENT-GIRDER-AG1", "CH1-VAL-006,DWG-DIM-S001-002",
         cid("adopted_design", "adopted_dimension.girder_length_ag1"),
         "BOTH", "HIGH", "133.151 m calc vs 133151 mm drawing."),
        ("span_lengths",
         "input(CH1-VAL-007/008/009)->drawing(DWG-DIM-S001-003)->adopted(AD)",
         "ENT-LINE-ACL",
         "CH1-VAL-007,CH1-VAL-008,CH1-VAL-009,DWG-DIM-S001-003",
         cid("adopted_design", "adopted_dimension.span_1"),
         "BOTH", "HIGH", "40.201/51.000/40.200 m vs 40201/51000/40200 mm."),
        ("deck_thickness",
         "input(CH1-VAL-022)->geometry->drawing(DWG-DIM-S009-007)->adopted(AD)",
         "ENT-DECK", "CH1-VAL-022,DWG-DIM-S009-007",
         cid("adopted_design", "adopted_dimension.deck_thickness"),
         "BOTH", "HIGH", "230 mm in calc and drawing."),
        ("ag1_sec1_adopted_section",
         "adopted(ADV-001..003)->section_property(DS)->stress/check->judgment "
         "OK", "ENT-GIRDER-AG1",
         "ADV-001,ADV-002,ADV-003," + s32("values", 28) + "," +
         s32("values", 29) + "," + s32("values", 30),
         cid("design", "section_property.ag1.sec-1.uflg") + "," +
         cid("adopted_design", "adopted_section.ag1.sec-1.uflg"),
         "CALC_ONLY", "HIGH",
         "AG1 Sec-1 UFLG PL620x22 / WEB PL2537x14 / LFLG PL680x21 (SM490Y)."),
        ("ag1_sec6_combined_check",
         "section dims->stress(DS)->kappa 1.10(DS)->limit 1.2->judgment "
         "OK->adopted Sec-6", "ENT-GIRDER-AG1",
         "ADV-006,ADV-007,DC-006," + s32("values", 51) + "," +
         s32("values", 52) + "," + s32("values", 53) + "," +
         s32("values", 54),
         cid("design", "stress.ag1.sec-6.bending_upper") + "," +
         cid("design", "check_ratio.ag1.sec-6.kappa") + "," +
         cid("adopted_design", "adopted_section.ag1.sec-6.uflg"),
         "CALC_ONLY", "HIGH",
         "Sec-6 stress 261/-224 N/mm2, tau 75, kappa 1.10 < 1.2 "
         "(governing)."),
        ("fatigue_no1",
         "stress range 54(AR-018)->D=0.26(DC-007)->judgment OK",
         "ENT-GIRDER-AG1",
         "AR-018,CAL-VAL-P00851-001,CAL-VAL-P00852-003,DC-007",
         cid("design", "stress.fatigue.no1.stress_range") + "," +
         cid("design", "check_ratio.fatigue.damage_D"),
         "CALC_ONLY", "HIGH", "Fatigue No.1 check chain complete."),
        ("bearing_pu15",
         "bearing design(CH5-VAL-016/024)->adopted(AD)",
         "ENT-SUPPORT-PU15", "ADV-011,ADV-013,CH5-VAL-016,CH5-VAL-024",
         cid("adopted_design", "adopted_bearing.PU15.rubber_layer") + "," +
         cid("adopted_design", "adopted_bearing.PU15.lead_plug"),
         "CALC_ONLY", "HIGH",
         "PU15 rubber te=32mm x5, lead plug phi95mm x4."),
        ("stud_shear_connector",
         "deck design(CH2-VAL-030)->adopted(AD)", "ENT-DECK",
         "ADV-008,CH2-VAL-030",
         cid("adopted_design", "adopted_dimension.stud_size"),
         "CALC_ONLY", "HIGH",
         "Composite-deck stud phi16x160 mm (deck stud; drawing sheet 39 "
         "studs phi22x200 are girder studs)."),
        ("reaction_wd_bearing",
         "load(LOAD-001..009)->analysis Wd(AR-008)->bearing load design",
         "ENT-LINE-ACL",
         "LOAD-001,LOAD-002,LOAD-003,LOAD-004,LOAD-005,LOAD-006,LOAD-007,"
         "LOAD-008,LOAD-009,AR-008", "AN-023", "CALC_ONLY", "HIGH",
         "Total dead-load reaction Wd=17955.7 kN feeds bearing design."),
        ("lateral_bracing",
         "wind/seismic(AR-015/016)->formula trace->bracing Nmax "
         "1294.90 kN", "ENT-BRACE-AL1",
         "AR-015,AR-016,CAL-VAL-P00791-002,CAL-VAL-P00792-001",
         cid("design", "formula_trace.lateral_bracing.pw"),
         "CALC_ONLY", "MEDIUM",
         "Lateral bracing chain (section 3.5); no explicit OK verdict "
         "extracted."),
        ("wrapping_concrete_s1",
         "section area(CAL-VAL-P00819-001)->Asreq->rebar count (partial)",
         "ENT-SUPPORT-PU15",
         "CAL-VAL-P00819-001,CAL-VAL-P00819-004,CAL-VAL-P00819-006,"
         "CAL-FML-P00819-002",
         cid("design", "formula_trace.wrapping.asreq"),
         "CALC_ONLY", "MEDIUM",
         "Wrapping-concrete chain ends at rebar count; no OK verdict "
         "(HCR-002)."),
        ("bracket",
         "load P=100(CAL-VAL-P00767-003)->M/S(AR-013/014)->limits"
         "(DC-014/015)", "ENT-GIRDER-AG1",
         "CAL-VAL-P00767-003,AR-013,AR-014,DC-014,DC-015",
         cid("design", "limit.bracket_bending_compression"),
         "CALC_ONLY", "MEDIUM",
         "Bracket chain; stress checks in section 3.4 tables not "
         "individually registered."),
    ]
    for label, steps, ent, srcs, cands, parity, conf, note in value_chains:
        value_rows.append({
            "trace_id": next_id("TR"),
            "chain_label": label,
            "entity_id": ent,
            "chain_steps": steps,
            "source_record_ids": srcs,
            "candidate_ids": cands,
            "parity_status": parity,
            "confidence": conf,
            "notes": note,
        })

    # ---------- formula -> result traceability ----------
    fml_result_defs = [
        (s32("formulas", 4), s32("values", 39),
         "\u03c3b = M x y / I", "-232", "N/mm2", 297,
         "AG1 Sec-3 upper bending stress."),
        (s32("formulas", 5), s32("values", 53),
         "\u03c4b = S / Aw", "75", "N/mm2", 297, "AG1 Sec-6 shear stress."),
        (s32("formulas", 7), s32("values", 54),
         "\u03ba = (\u03c3b/\u03c3tyd)\u00b2 + (\u03c4b/\u03c4yd)\u00b2 "
         "<= 1.2", "1.10", "", 297, "AG1 Sec-6 combined check."),
        ("CAL-FML-P01321-001", "CAL-VAL-P01319-016",
         "\u03c3tud = \u03be1 x \u03be2 x \u03a6ut x \u03c3yk",
         "272", "N/mm2", 1321, "Upper flange tension limit."),
        ("CAL-FML-P01321-011", "CAL-VAL-P01319-020",
         "\u03c4ud = \u03be1 x \u03be2 x \u03a6us x \u03c4yk = 157",
         "157", "N/mm2", 1321, "Web shear limit."),
        ("CAL-FML-P00850-002", "CAL-VAL-P00851-001",
         "delta_sigma = |14-(-4)|*3.00 = 54", "54", "N/mm2", 850,
         "Fatigue No.1 stress range."),
        ("CAL-FML-P00852-001", "CAL-VAL-P00852-001",
         "nti = 379*0.03*365*100 = 0.42e6", "0.42e6", "\u56de", 852,
         "Fatigue No.1 equivalent cycles."),
        ("CAL-FML-P00685-002", "CAL-VAL-P00685-005",
         "Ws = (40/40)\u00b2*[4.0-0.2]*8.110*1.30 = 40.06",
         "40.06", "kN/m", 685, "Cross-beam wind load."),
        ("CAL-FML-P00686-001", "CAL-VAL-P00686-002",
         "We = 1.05*17955.7*0.25/131.325 = 35.89", "35.89", "kN/m", 686,
         "Level-1 seismic load."),
        ("CAL-FML-P00770-002", "CAL-VAL-P00771-001",
         "\u03c3brgd = 0.90*1.00*0.85*0.803*235 = 144", "144", "N/mm2", 770,
         "Bracket bending-compression limit."),
        ("CAL-FML-P00772-001", "CAL-VAL-P00771-002",
         "\u03c4ud = 0.90*1.00*0.85*135 = 103", "103", "N/mm2", 772,
         "Bracket shear limit."),
        ("CAL-FML-P00791-005", "CAL-VAL-P00791-005",
         "Pw = 1.00*1.25*6.67 = 8.34", "8.34", "kN/m", 791,
         "Lateral bracing wind load."),
        ("CAL-FML-P00791-006", "CAL-VAL-P00791-006",
         "Pe = 1.00*1.00*48.81*0.765 = 37.34", "37.34", "kN/m", 791,
         "Lateral bracing seismic load."),
        ("CAL-FML-P00819-001", "CAL-VAL-P00819-001",
         "Ac = B*H = 1500*2280/100 = 34200", "34200", "cm2", 819,
         "Wrapping concrete S1 area."),
        ("CAL-FML-P00819-002", "CAL-VAL-P00819-004",
         "Asreq = 34200*0.0015 = 51.30", "51.30", "cm2", 819,
         "Wrapping concrete S1 min rebar area."),
    ]
    for fsrc, rsrc, expr, rval, runit, page, note in fml_result_defs:
        fml_result.append({
            "trace_id": next_id("TR"),
            "formula_source_id": fsrc,
            "result_source_id": rsrc,
            "formula_expression": expr,
            "result_raw_value": rval,
            "result_unit": runit,
            "calculation_locator": calc_loc(page),
            "notes": note,
        })

    # ---------- calculation <-> drawing parity ----------
    calc_dwg_defs = [
        ("bridge_length", "134.001", "m", "CH1-VAL-005,GEO-001",
         "134001", "mm", "DWG-DIM-S001-001", "BOTH", "HIGH", "",
         "Bridge length calc 134.001 m == drawing 134001 mm."),
        ("girder_length_AG1", "133.151", "m", "CH1-VAL-006",
         "133151", "mm", "DWG-DIM-S001-002", "BOTH", "HIGH", "",
         "Girder length AG1 133.151 m == 133151 mm."),
        ("span_1", "40.201", "m", "CH1-VAL-007,GEO-002",
         "40201", "mm", "DWG-DIM-S001-003", "BOTH", "HIGH", "",
         "Span 1 40.201 m == 40201 mm."),
        ("span_2", "51.000", "m", "CH1-VAL-008,GEO-003",
         "51000", "mm", "DWG-DIM-S001-003", "BOTH", "HIGH", "",
         "Span 2 51.000 m == 51000 mm."),
        ("span_3", "40.200", "m", "CH1-VAL-009,GEO-004",
         "40200", "mm", "DWG-DIM-S001-003", "BOTH", "HIGH", "",
         "Span 3 40.200 m == 40200 mm."),
        ("total_width", "8.010", "m", "CH1-VAL-010,GEO-005",
         "8031.7/8010.3/8010", "mm", "DWG-DIM-S009-006", "BOTH", "HIGH", "",
         "Total width calc 8.010 m; drawing 8031.7/8010.3/8010 mm "
         "(varies at supports)."),
        ("deck_thickness", "230", "mm", "CH1-VAL-022,CH2-VAL-022",
         "230", "mm", "DWG-DIM-S009-007", "BOTH", "HIGH", "",
         "Deck thickness 230 mm both."),
        ("pavement_thickness", "80", "mm", "CH1-VAL-021",
         "80", "mm", "DWG-DIM-S009-008", "BOTH", "HIGH", "",
         "Pavement thickness 80 mm both."),
        ("top_flange_width", "620", "mm", s32("values", 5),
         "620", "mm", "DWG-DIM-S013-010", "BOTH", "HIGH", "",
         "Top flange width 620 mm both."),
        ("bottom_flange_width", "680", "mm",
         s32("values", 6) + ",ADV-003", "700", "mm", "DWG-DIM-S013-014",
         "CONFLICT", "HIGH", "CONF-P2II-001",
         "CONFLICT: calc bottom flange width 680 mm vs drawing 700 mm."),
        ("web_thickness", "14", "mm", s32("values", 7),
         "14", "mm", "DWG-DIM-S013-013", "BOTH", "HIGH", "",
         "Web thickness 14 mm both."),
        ("girder_spacing", "4500", "mm", "CH1-TBL-064",
         "4500", "mm", "DWG-DIM-S001-004", "BOTH", "HIGH", "",
         "Girder spacing 4500 mm both (calc table row2)."),
        ("girder_height", "2700", "mm", s32("values", 8),
         "2700", "mm", "DWG-DIM-S001-005", "BOTH", "HIGH", "",
         "Girder height 2700 mm both."),
        ("girder_length_sheet141", "133.151/133.303", "m",
         "CH1-VAL-006," + s32("values", 18), "133.201", "m", "S141-D05",
         "BOTH", "MEDIUM", "",
         "Sheet 141 girder length 133.201 m (OCR) vs calc 133.151/133.303 m; "
         "PARTIAL (V001 last digit uncertain), HCR-001."),
        ("deck_level_sheet141", "", "", "", "10.00", "m", "S141-D11",
         "DRAWING_ONLY", "MEDIUM", "",
         "Deck level D.L. 10.00 m from sheet 141 OCR only; HCR-001."),
        ("ground_level_sheet141", "", "", "", "15.250", "m", "S141-D08",
         "DRAWING_ONLY", "MEDIUM", "",
         "Construction base level V 15.250 m from sheet 141 OCR only; "
         "HCR-001."),
        ("deck_stud_vs_girder_stud", "\u03c616\u00d7160", "mm",
         "CH2-VAL-030", "\u03c622x200/150", "mm", "DWG-DIM-S039-032",
         "ONE_SOURCE_ONLY", "HIGH", "",
         "Different stud types: calc composite-deck stud phi16x160 vs drawing "
         "girder stud phi22x200/150; not a conflict."),
    ]
    for item, cval, cunit, csrc, dval, dunit, dsrc, parity, conf, conflict, \
            note in calc_dwg_defs:
        calc_dwg.append({
            "trace_id": next_id("TR"),
            "item": item,
            "calc_value": cval,
            "calc_unit": cunit,
            "calc_source_ids": csrc,
            "drawing_value": dval,
            "drawing_unit": dunit,
            "drawing_source_ids": dsrc,
            "parity_status": parity,
            "confidence": conf,
            "conflict_id": conflict,
            "notes": note,
        })

    # ---------- adopted value traceability ----------
    adopted_val_defs = [
        ("adopted_section.ag1.sec-1.uflg", "ADV-001",
         "section_property.ag1.sec-1.uflg", "PL620x22",
         "AG1 Sec-1 UFLG adopted from ADV-001 (calc only)."),
        ("adopted_section.ag1.sec-1.web", "ADV-002",
         "section_property.ag1.sec-1.web", "PL2537x14",
         "AG1 Sec-1 WEB adopted from ADV-002."),
        ("adopted_section.ag1.sec-1.lflg", "ADV-003",
         "section_property.ag1.sec-1.lflg", "PL680x21",
         "AG1 Sec-1 LFLG adopted from ADV-003 (CONF-P2II-001 width)."),
        ("adopted_section.ag1.sec-3.uflg", "ADV-004",
         "section_property.ag1.sec-3.uflg", "PL620x27",
         "AG1 Sec-3 UFLG adopted from ADV-004."),
        ("adopted_section.ag1.sec-6.uflg", "ADV-006",
         "section_property.ag1.sec-6.uflg", "PL620x39",
         "AG1 Sec-6 UFLG adopted from ADV-006."),
        ("adopted_section.ag1.sec-6.lflg", "ADV-007",
         "section_property.ag1.sec-6.lflg", "PL680x47 SM520-H",
         "AG1 Sec-6 LFLG SM520-H adopted from ADV-007."),
        ("adopted_bearing.PU15.rubber_layer", "ADV-011", "",
         "32mm x5", "PU15 rubber layer adopted from ADV-011."),
        ("adopted_bearing.PR1.rubber_layer", "ADV-012", "",
         "37mm x5", "PR1 rubber layer adopted from ADV-012."),
        ("adopted_bearing.PU15.lead_plug", "ADV-013", "",
         "phi95mm x4", "PU15 lead plug adopted from ADV-013."),
        ("adopted_bearing.PR1.lead_plug", "ADV-014", "",
         "phi150mm", "PR1 lead plug adopted from ADV-014."),
        ("adopted_dimension.stud_size", "ADV-008", "",
         "\u03c616\u00d7160", "Deck stud adopted from ADV-008."),
        ("adopted_dimension.main_rebar", "ADV-009", "",
         "D19@100", "Main reinforcement adopted from ADV-009."),
        ("adopted_dimension.distribution_rebar_support", "ADV-010", "",
         "D22@125", "Distribution rebar adopted from ADV-010."),
        ("adopted_dimension.rib_height", "ADV-016", "",
         "100mm", "Lateral rib height adopted from ADV-016."),
    ]
    for ad_fld, src, up_fld, aval, note in adopted_val_defs:
        up_cand = ""
        if up_fld:
            up_cand = cid("design", up_fld)
        adopted_val.append({
            "trace_id": next_id("TR"),
            "adopted_candidate_id": cid("adopted_design", ad_fld),
            "entity_id": lookup_entity(ad_fld),
            "adopted_value": aval,
            "source_record_ids": src,
            "upstream_candidate_ids": up_cand,
            "source_type": "domain_index/adopted_value",
            "notes": note,
        })

    # ---------- report <-> drawing traceability ----------
    group_chapter = {
        "location": "CH1", "general": "CH1", "quantities": "CH2",
        "structure_general": "CH1", "alignment": "CH1",
        "cross_section": "CH1", "common_detail": "CH2", "camber": "CH3",
        "main_girder_AG1": "CH3", "main_girder_AG2": "CH3",
        "stud_layout": "CH3", "end_cross_beam": "CH3/CH4",
        "pier_cross_beam": "CH3/CH4", "intermediate_cross_beam": "CH3/CH4",
        "lateral_bracing": "CH3", "wrapping_concrete": "CH3",
        "wrapping_concrete_stud": "CH3", "composite_deck_layout": "CH2/CH4",
        "bearing_detail": "CH5", "expansion_joint": "CH5",
        "parapet_reinforcement": "CH2", "lighting_pedestal": "CH5",
        "deck_drainage": "CH5", "substructure_drainage": "CH5",
        "bridge_deck_drainage": "CH5", "superstructure_inspection": "CH5",
        "substructure_inspection": "CH5", "slope_stairs": "CH5",
        "falling_object_prevention": "CH5", "spalling_prevention": "CH5",
        "step_prevention": "CH5", "nameplate": "CH5",
        "nose_guardrail": "CH5", "nose_water_stop": "CH5",
        "erection_plan": "CH3",
    }
    for sheet in range(1, 142):
        info = sheet_info_map[sheet]
        if sheet == 141:
            dsrc = "S141-E01"
            notes = ("Sheet 141 OCR-assisted (PARTIAL, HCR-001); erection "
                     "plan not linked to a numeric calc section.")
        else:
            dsrc = f"DWG-TB-S{sheet:03d}-001"
            notes = ""
        report_dwg.append({
            "trace_id": next_id("TR"),
            "drawing_sheet_number": sheet,
            "drawing_title": info["title"],
            "drawing_group": info["group"],
            "report_chapter": group_chapter.get(info["group"], ""),
            "report_section": "",
            "drawing_source_ids": dsrc,
            "link_type": "ocr_sheet" if sheet == 141 else "group_mapping",
            "notes": notes,
        })

    write_csv(os.path.join(TRACE_DIR, "entity_crosswalk.csv"),
              ["trace_id", "entity_id", "entity_name", "entity_kind",
               "source_record_ids", "candidate_ids", "notes"], entity_rows)
    write_csv(os.path.join(TRACE_DIR,
                           "source_to_candidate_traceability.csv"),
              ["trace_id", "source_record_id", "candidate_id", "source_type",
               "source_locator", "candidate_layer", "notes"], src2cand)
    write_csv(os.path.join(TRACE_DIR, "value_traceability.csv"),
              ["trace_id", "chain_label", "entity_id", "chain_steps",
               "source_record_ids", "candidate_ids", "parity_status",
               "confidence", "notes"], value_rows)
    write_csv(os.path.join(TRACE_DIR, "formula_result_traceability.csv"),
              ["trace_id", "formula_source_id", "result_source_id",
               "formula_expression", "result_raw_value", "result_unit",
               "calculation_locator", "notes"], fml_result)
    write_csv(os.path.join(TRACE_DIR,
                           "calculation_drawing_traceability.csv"),
              ["trace_id", "item", "calc_value", "calc_unit",
               "calc_source_ids", "drawing_value", "drawing_unit",
               "drawing_source_ids", "parity_status", "confidence",
               "conflict_id", "notes"], calc_dwg)
    write_csv(os.path.join(TRACE_DIR, "adopted_value_traceability.csv"),
              ["trace_id", "adopted_candidate_id", "entity_id",
               "adopted_value", "source_record_ids",
               "upstream_candidate_ids", "source_type", "notes"],
              adopted_val)
    write_csv(os.path.join(TRACE_DIR, "report_drawing_traceability.csv"),
              ["trace_id", "drawing_sheet_number", "drawing_title",
               "drawing_group", "report_chapter", "report_section",
               "drawing_source_ids", "link_type", "notes"], report_dwg)

    for k, v in [("entity_crosswalk", len(entity_rows)),
                 ("source_to_candidate", len(src2cand)),
                 ("value_traceability", len(value_rows)),
                 ("formula_result_traceability", len(fml_result)),
                 ("calculation_drawing_traceability", len(calc_dwg)),
                 ("adopted_value_traceability", len(adopted_val)),
                 ("report_drawing_traceability", len(report_dwg))]:
        log[k] = v


# ===========================================================================
# 6. SUMMARIES
# ===========================================================================
def write_summaries(log):
    def md(path, title, verdict, verdict_reason, file_counts, gaps_list):
        lines = [
            f"# {title}",
            "",
            f"> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) "
            f"\u2014 Phase 2-II",
            f"> **Numeric analysis performed:** NO (recalculation prohibited)",
            f"> **Verdict:** `{verdict}` \u2014 {verdict_reason}",
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
            f"`{verdict}` \u2014 {verdict_reason}",
            "",
        ]
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(lines) + "\n")
        print(f"  wrote summary -> {os.path.relpath(path, P2II)}")

    md(os.path.join(OUT["design"], "design_candidate_summary.md"),
       "Design Candidate Layer \u2014 Summary", "PARTIAL",
       "Design candidates created from design_check_index + section_3_2 "
       "tables/values + fatigue + chapter_04 composite + chapter_05 bearing "
       "checks; camber / stiffener / splice / weld numeric detail and "
       "wrapping-concrete verdict are registered gaps.",
       [("section_property_candidate.csv", log["design_section_property"]),
        ("stress_candidate.csv", log["design_stress"]),
        ("limit_candidate.csv", log["design_limit"]),
        ("check_ratio_candidate.csv", log["design_check_ratio"]),
        ("judgment_candidate.csv", log["design_judgment"]),
        ("formula_trace_candidate.csv", log["design_formula_trace"])],
       ["Camber values exist only on drawing sheet 20 (no calc values); "
        "registered EXCLUDED_DRAWING_ONLY",
        "Vertical stiffener design numeric checks not extracted (note only)",
        "Field splice bolt-level results not individually extracted",
        "Flange-web weld per-weld values not extracted",
        "Wrapping-concrete rebar-count check has no OK/NG verdict (HCR-002)",
        "AG2 individual section properties not extracted (table T30 "
        "summary only)",
        "AG1 Sec-6 lower stress: table reads -222 vs design-check -224 "
        "(source inconsistency, both recorded)",
        "candidate_enums.csv extended with semantic_class 'fatigue' and "
        "'welding' (source=phase2_i_extraction) for fatigue stress-range and "
        "weld-design candidates"])

    md(os.path.join(OUT["adopted_design"], "adopted_design_summary.md"),
       "Adopted Design Candidate Layer \u2014 Summary", "PARTIAL",
       "Adopted section/material/bearing/dimension candidates created from "
       "adopted_value_index + material_section_index + chapter_01/05; all "
       "adoption_status=CANDIDATE_ONLY (Phase 3 reviews for Golden).",
       [("adopted_section_candidate.csv", log["adopted_section"]),
        ("adopted_material_candidate.csv", log["adopted_material"]),
        ("adopted_bearing_candidate.csv", log["adopted_bearing"]),
        ("adopted_dimension_candidate.csv", log["adopted_dimension"])],
       ["Bottom flange width conflict calc 680 vs drawing 700 mm reuses "
        "CONF-P2II-001 (no new conflict)",
        "AG2 adopted section plates not in adopted_value_index; only drawing "
        "plate marks (DWG-DIM-S030-*) recorded in drawing layer",
        "All adopted values CANDIDATE_ONLY; no APPROVED_GOLDEN_INPUT "
        "promotion in Phase 2-II"])

    md(os.path.join(OUT["report"], "report_structure_summary.md"),
       "Report Candidate Layer \u2014 Summary", "PARTIAL",
       "Calculation-book structure captured (front matter + 5 chapters + "
       "sections + tables/formulas/figures/notes/page layout); numeric "
       "substitution formulas excluded as derived.",
       [("report_chapter_candidate.csv", log["report_chapter"]),
        ("report_section_candidate.csv", log["report_section"]),
        ("report_table_candidate.csv", log["report_table"]),
        ("report_formula_candidate.csv", log["report_formula"]),
        ("report_figure_candidate.csv", log["report_figure"]),
        ("report_note_candidate.csv", log["report_note"]),
        ("report_layout_candidate.csv", log["report_layout"])],
       ["Chapter 1 and Chapter 2 have no figures.csv in Phase 2-I "
        "(counts reflect source)",
        "Chapter 1 formulas.csv is empty in Phase 2-I",
        "NUMERIC_SUBSTITUTION formulas recorded as EXCLUDED_DERIVED_VALUE",
        "Report structure is CANDIDATE_ONLY; Golden promotion in Phase 3"])

    md(os.path.join(OUT["drawing"], "drawing_structure_summary.md"),
       "Drawing Candidate Layer \u2014 Summary", "PARTIAL",
       "All 141 drawing sheets covered; element-level candidates from "
       "drawing CSVs; sheet 141 OCR results integrated as PARTIAL/HCR-001.",
       [("drawing_sheet_candidate.csv", log["drawing_sheet"]),
        ("drawing_view_candidate.csv", log["drawing_view"]),
        ("drawing_dimension_candidate.csv", log["drawing_dimension"]),
        ("drawing_annotation_candidate.csv", log["drawing_annotation"]),
        ("drawing_member_candidate.csv", log["drawing_member"]),
        ("drawing_table_candidate.csv", log["drawing_table"]),
        ("drawing_title_block_candidate.csv", log["drawing_title_block"]),
        ("drawing_reference_candidate.csv", log["drawing_reference"])],
       ["Drawing sheet 141 is OCR-assisted PARTIAL; all 141 rows carry "
        "HCR-001 (crane table, dimensions, blocks, title block)",
        "Sheet 141 girder length 133.201 m vs calc 133.151/133.303 m flagged "
        "PARTIAL (V001); not registered as a formal conflict",
        "Bottom flange width drawing 700 mm vs calc 680 mm reuses "
        "CONF-P2II-001",
        "Title block rows are per-field (141 sheets x multiple fields); "
        "sheet 141 also carries OCR-resolved TB01..TB08 rows"])

    md(os.path.join(TRACE_DIR, "traceability_summary.md"),
       "Traceability \u2014 Summary", "PARTIAL",
       "Source->candidate->entity trace built for all PR-2 candidate layers; "
       "value/formula/adopted/calc-drawing/report-drawing chains registered; "
       "one-source-only and human-confirm chains logged.",
       [("entity_crosswalk.csv", log["entity_crosswalk"]),
        ("source_to_candidate_traceability.csv", log["source_to_candidate"]),
        ("value_traceability.csv", log["value_traceability"]),
        ("formula_result_traceability.csv",
         log["formula_result_traceability"]),
        ("calculation_drawing_traceability.csv",
         log["calculation_drawing_traceability"]),
        ("adopted_value_traceability.csv",
         log["adopted_value_traceability"]),
        ("report_drawing_traceability.csv",
         log["report_drawing_traceability"])],
       ["Value chains are partial where a subject has no explicit OK "
        "verdict or no drawing counterpart (wrapping, bracket, camber, AG2 "
        "sections)",
        "One-source-only records: camber (drawing only), deck level / ground "
        "level (sheet 141 OCR), effective width (calc only)",
        "Orphan/partial chains: stiffeners, splice, welding (design "
        "policy/table only, no numeric result)",
        "report_drawing_traceability uses group->chapter mapping "
        "(link_type=group_mapping) plus source references where present"])


# ===========================================================================
# 7. VERIFICATION
# ===========================================================================
def verify_outputs():
    problems = []
    all_ids = []
    cand_files = []

    src_ids = set()
    for r in read_csv(os.path.join(CAND_DIR, "source",
                                   "source_record_catalog.csv")):
        src_ids.add(r["source_record_id"])

    layers = ("input", "geometry", "structural_model", "load", "analysis",
              "design", "adopted_design", "report", "drawing")
    for layer in layers:
        d = os.path.join(CAND_DIR, layer)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".csv"):
                continue
            path = os.path.join(d, fn)
            rows = read_csv(path)
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
            cand_files.append((os.path.relpath(path, P2II), len(rows)))

    referenced = set()
    for layer in layers:
        d = os.path.join(CAND_DIR, layer)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".csv"):
                continue
            for r in read_csv(os.path.join(d, fn)):
                for sid in (r.get("source_record_ids") or "").split(","):
                    sid = sid.strip()
                    if sid:
                        referenced.add(sid)
    missing = sorted(s for s in referenced if s not in src_ids)
    if missing:
        problems.append(f"unresolved source_record_ids: {missing}")

    print(f"  candidate CSVs checked: {len(cand_files)}")
    for p, n in cand_files:
        print(f"    {p}: {n} rows")
    print(f"  total candidate_id values (PR-1 + PR-2): {len(all_ids)}")
    print(f"  unique candidate_ids: {len(set(all_ids))}")
    print(f"  referenced source_record_ids: {len(referenced)} "
          f"(missing {len(missing)})")
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
    for key in OUT:
        os.makedirs(OUT[key], exist_ok=True)
    os.makedirs(TRACE_DIR, exist_ok=True)

    load_enums()
    load_sheet_info()

    log = {}
    print("[1/5] Building design layer...")
    build_design_layer(log)
    print("[2/5] Building adopted design layer...")
    build_adopted_design_layer(log)
    print("[3/5] Building report layer...")
    build_report_layer(log)
    print("[4/5] Building drawing layer...")
    build_drawing_layer(log)
    print("[5/5] Building traceability...")
    build_traceability(log)
    print("[6] Writing summary MD files...")
    write_summaries(log)
    print("[7] Verifying outputs...")
    verify_outputs()
    print("DONE")


if __name__ == "__main__":
    main()
