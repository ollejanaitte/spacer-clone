#!/usr/bin/env python3
"""
Authoritative Golden -> Common Bridge Data Model mapping rules (P5-3).

This module is the single source of truth for:
  - Common layer assignment (domain/field_path -> 12 logical layers)
  - Common entity id derivation (deterministic, stable)
  - Common field key derivation
  - ResolvedValue construction (CONFIRMED / HCR / CONFLICT / HOLD)

It is shared by:
  - build_mapping_registers.py  (P5-1 mapping registers, regenerated for P5-3)
  - build_common_model_fixture.py (Golden adapter, P5-3)

These rules are Reference-Bridge mapping rules; they are intentionally NOT part of
the Common model contract (which is bridge-agnostic). See
phase5/contracts/reference_bridge_mapping_contract.md.
"""

import re
from collections import OrderedDict

METADATA_LAYER = "metadata"


def _girder_id(ent, index):
    if ent in ("LINE-ACL", "ACL", "LINE"):
        return "ALN-ACL"
    if ent.upper().startswith("GIRDER"):
        ent = ent[len("GIRDER"):].lstrip("-_")
    return f"GIRDER-{ent}" if ent else f"GIRDER-{index}"

def clean_token(text: str) -> str:
    t = (text or "").strip()
    if t.startswith("ENT-"):
        t = t[4:]
    t = re.sub(r"[^A-Za-z0-9_-]", "_", t)
    return t


def _fp_tokens(fp: str):
    return [t for t in (fp or "").split(".") if t != ""]


def assign_layer(domain: str, field_path: str):
    """Return (common_layer, common_section) for a golden record."""
    fp = field_path or ""
    toks = _fp_tokens(fp)
    tok = toks[0] if toks else ""
    if domain == "report":
        return "reportSpecification", "report_item"
    if domain == "drawing":
        if len(toks) > 1 and toks[1] == "sheet":
            return "drawingSpecification", "drawing_sheet"
        return "drawingSpecification", "drawing_item"
    if domain in ("design", "adopted_design"):
        return "design", "design_item"
    if domain == "structural_model":
        section = {
            "node": "structural_node",
            "member": "structural_member",
            "support_restraint": "support_restraint",
            "connectivity": "connectivity",
            "section_assignment": "section_assignment",
        }.get(tok, "structural_model")
        return "structuralModel", section
    if domain == "geometry":
        return {
            "alignment": ("alignment", "alignment"),
            "girder_line": ("bridgeGeometry", "girder"),
            "girder": ("bridgeGeometry", "girder"),
            "cross_section": ("sections", "section"),
            "elevation": ("bridgeGeometry", "elevation"),
            "grid_point": ("bridgeGeometry", "grid_point"),
            "support_line": ("bridgeGeometry", "support"),
            "support": ("bridgeGeometry", "support"),
            "member": ("bridgeGeometry", "girder"),
            "deck": ("bridgeGeometry", "deck"),
        }.get(tok, ("bridgeGeometry", "bridgeGeometry"))
    # Phase 3 input golden: domain column is the first field_path token
    return {
        "alignment": ("alignment", "alignment"),
        "bridge": ("alignment", "alignment"),
        "bridge_type": ("design", "design_item"),
        "bridge_identity": ("design", "design_item"),
        "code": ("design", "design_item"),
        "road_spec": ("design", "design_item"),
        "material": ("materials", "material"),
        "load_case": ("loads", "load_case"),
        "load_value": ("loads", "load_value"),
        "load_application": ("loads", "load_application"),
        "live_load": ("loads", "live_load"),
        "girder_line": ("bridgeGeometry", "girder"),
        "girder": ("bridgeGeometry", "girder"),
        "member": ("structuralModel", "structural_member"),
        "cross_section": ("sections", "section"),
        "deck": ("bridgeGeometry", "deck"),
        "elevation": ("bridgeGeometry", "elevation"),
        "grid_point": ("bridgeGeometry", "grid_point"),
        "support_line": ("bridgeGeometry", "support"),
        "support": ("bridgeGeometry", "support"),
        "support_restraint": ("structuralModel", "support_restraint"),
        "node": ("structuralModel", "structural_node"),
    }.get(tok, ("bridgeGeometry", "bridgeGeometry"))


def entity_type_for(common_section: str) -> str:
    table = {
        "alignment": "ALIGNMENT",
        "girder": "GIRDER",
        "support": "SUPPORT",
        "grid_point": "GRID_POINT",
        "deck": "DECK",
        "elevation": "DECK",
        "member": "GIRDER",
        "section": "SECTION",
        "structural_node": "STRUCTURAL_NODE",
        "structural_member": "STRUCTURAL_MEMBER",
        "support_restraint": "SUPPORT",
        "connectivity": "STRUCTURAL_NODE",
        "section_assignment": "STRUCTURAL_MEMBER",
        "material": "MATERIAL",
        "load_case": "LOAD_CASE",
        "load_value": "LOAD_CASE",
        "load_application": "LOAD_CASE",
        "live_load": "LOAD_CASE",
        "design_item": "DESIGN_ITEM",
        "report_item": "REPORT_ITEM",
        "drawing_item": "DRAWING_ITEM",
        "drawing_sheet": "DRAWING_SHEET",
        "bridgeGeometry": "BRIDGE_GEOMETRY",
        "structural_model": "STRUCTURAL_MODEL",
    }
    return table.get(common_section, "ALIGNMENT")


def entity_id_for(domain: str, field_path: str, entity_id: str, golden_id: str,
                  index: int) -> str:
    fp = field_path or ""
    toks = _fp_tokens(fp)
    tok = toks[0] if toks else ""
    ent = clean_token(entity_id)
    m = re.match(r"G-RPT-(\d+)", golden_id)
    if m:
        return f"RPT-{int(m.group(1)):05d}"
    m = re.match(r"G-DWG-(\d+)", golden_id)
    if m and len(toks) > 1 and toks[1] == "sheet":
        sheet_no = toks[2] if len(toks) > 2 else m.group(1)
        return f"DWG-S{int(sheet_no):03d}"
    if m:
        return f"DWG-{int(m.group(1)):05d}"
    m = re.match(r"G-(DES|AD)-(\d+)", golden_id)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):05d}"
    if domain == "structural_model":
        if tok == "node":
            return f"NODE-{toks[1]}" if len(toks) > 1 else f"NODE-{index}"
        if tok == "member":
            return f"MEMBER-{toks[1]}" if len(toks) > 1 else f"MEMBER-{ent}"
        if tok == "support_restraint":
            return f"SUP-{toks[1].upper()}" if len(toks) > 1 else f"SUP-{ent.upper()}"
        if tok == "connectivity":
            return "SM-CONNECTIVITY"
        if tok == "section_assignment":
            return "SM-SECTION-ASSIGN"
    if domain == "geometry":
        if tok == "grid_point":
            return f"GRID-{toks[1]}" if len(toks) > 1 else f"GRID-{index}"
        if tok == "alignment":
            return "ALN-ACL"
        if tok == "girder_line" or tok == "girder":
            return _girder_id(ent, index)
        if tok == "support_line" or tok == "support":
            return f"SUP-{toks[1].upper()}" if len(toks) > 1 else f"SUP-{ent.upper()}"
        if tok == "cross_section":
            return f"SECTION-{ent}" if ent else f"SECTION-{index}"
        if tok == "elevation":
            return f"ALN-{ent}" if ent else f"ALN-{index}"
        if tok == "deck":
            return "DECK-01"
        if tok == "member":
            return f"GIRDER-{ent}" if ent else f"GIRDER-{index}"
    # Phase 3 (domain == first token)
    if tok == "bridge":
        return "ALN-ACL"
    if tok in ("bridge_type", "bridge_identity", "code", "road_spec"):
        return "DES-BASIS-01"
    if tok == "material":
        if len(toks) > 2:
            return f"MAT-{clean_token(toks[2])}"
        if ent:
            return f"MAT-{ent}"
        return "MAT-01"
    if tok == "load_case":
        return f"LOADCASE-{toks[1]}" if len(toks) > 1 else "LOADCASE-01"
    if tok in ("load_value", "load_application"):
        return "LOAD-DEAD-INPUTS"
    if tok == "live_load":
        return "LOAD-LIVE-INPUTS"
    if tok == "girder_line" or tok == "girder":
        return _girder_id(ent, index)
    if tok == "member":
        return f"MEMBER-{toks[1]}" if len(toks) > 1 else f"MEMBER-{ent or index}"
    if tok == "cross_section":
        if ent.startswith("DECK"):
            return "DECK-01"
        return f"SECTION-{ent}" if ent else f"SECTION-{index}"
    if tok == "deck":
        return "DECK-01"
    if tok == "elevation":
        if ent.startswith("DECK"):
            return "DECK-01"
        return f"ALN-{ent}" if ent else "ALN-ACL"
    if tok == "grid_point":
        return f"GRID-{toks[1]}" if len(toks) > 1 else f"GRID-{index}"
    if tok == "support_line":
        return f"SUP-{toks[1].upper()}" if len(toks) > 1 else f"SUP-{ent.upper()}"
    if tok == "support":
        return f"SUP-{toks[1].upper()}" if len(toks) > 1 else f"SUP-{ent.upper()}"
    if tok == "support_restraint":
        return f"SUP-{toks[1].upper()}" if len(toks) > 1 else f"SUP-{ent.upper()}"
    if tok == "node":
        return f"NODE-{toks[1]}" if len(toks) > 1 else f"NODE-{index}"
    if tok == "alignment":
        return "ALN-ACL"
    if domain == "design" or domain == "adopted_design":
        m = re.match(r"G-(?:DES|AD)-(\d+)", golden_id)
        n = int(m.group(1)) if m else index
        return f"DES-{n:05d}"
    return f"ENT-{ent or index}"


def field_key_for(domain: str, field_path: str) -> str:
    fp = field_path or ""
    toks = _fp_tokens(fp)
    if not toks:
        return "value"
    if domain == "report":
        return ".".join(toks[1:]) or "value"
    if domain == "drawing":
        if toks[0] == "sheet":
            return "sheet"
        return ".".join(toks[1:]) or "value"
    if domain in ("design", "adopted_design"):
        return ".".join(toks[1:]) or "value"
    if domain == "structural_model":
        if toks[0] == "node":
            return "coordinate"
        if toks[0] == "member":
            return "member"
        if toks[0] == "support_restraint":
            return "restraint"
        if toks[0] == "connectivity":
            return ".".join(toks[1:]) or "value"
        if toks[0] == "section_assignment":
            return ".".join(toks[1:]) or "value"
    if domain == "geometry":
        if toks[0] == "grid_point":
            return toks[-1] if len(toks) > 2 else "value"
        return ".".join(toks[1:]) or "value"
    # phase3
    if toks[0] == "material":
        return ".".join(toks[1:]) or "value"
    if toks[0] == "load_case":
        return "case"
    if toks[0] in ("load_value", "load_application", "live_load"):
        return ".".join(toks[1:]) or "value"
    if toks[0] == "member":
        return "member"
    if toks[0] == "node":
        return "coordinate"
    if toks[0] == "grid_point":
        return toks[-1] if len(toks) > 2 else "value"
    return ".".join(toks[1:]) or "value"


def parse_number(text: str):
    try:
        f = float(text)
        if f.is_integer() and abs(f) < 1e15:
            return int(f)
        return f
    except (TypeError, ValueError):
        return None


def build_resolved_value(rec, conflict_candidates=None, coord_axes=None):
    """Build a ResolvedValue dict for a golden record.

    coord_axes: optional list of axis tokens parsed from a COORDINATE record
    (e.g. node coordinate 'X=.. m, Y=.. m' -> per-axis values). When provided,
    returns a list of (axis, value_dict) pairs instead of a single value.
    """
    raw = (rec.get("raw_value") or "").strip()
    norm = (rec.get("normalized_value") or "").strip()
    nunit = (rec.get("normalized_unit") or "").strip()
    runit = (rec.get("raw_unit") or "").strip()
    hcr = (rec.get("human_confirmation_id") or "").strip()
    conf = (rec.get("conflict_id") or "").strip()
    gid = (rec.get("golden_id") or "").strip()
    refs = [x for x in (rec.get("source_record_ids") or "").split(",") if x.strip()]

    if conf and conflict_candidates:
        cands = [
            {"value": c["value"], "unit": c.get("unit"), "sourceRefs": c.get("sourceRefs")}
            for c in conflict_candidates
        ]
        return [("value", {
            "state": "CONFLICT",
            "conflictId": conf,
            "candidates": cands,
            "selected": None,
            "resolutionStatus": "UNRESOLVED",
        })]

    # numeric preference: normalized then raw
    value = None
    unit = None
    source = norm if norm else raw
    if source:
        num = parse_number(source)
        if num is not None:
            value = num
            unit = nunit if nunit else (runit if runit else None)
        else:
            value = source
            unit = nunit if nunit else (runit if runit else None)
    else:
        value = raw

    v = {"state": "CONFIRMED", "value": value}
    if unit:
        v["unit"] = unit
    if runit and runit != unit:
        v["sourceUnit"] = runit
    if refs:
        v["sourceRefs"] = refs
    if gid:
        v["goldenId"] = gid
    if hcr:
        v["state"] = "HUMAN_CONFIRMATION_REQUIRED"
        v["humanConfirmationId"] = hcr

    if coord_axes:
        # split coordinate into per-axis values
        out = []
        for axis in coord_axes:
            nv = dict(v)
            nv["value"] = axis["value"]
            nv["unit"] = axis.get("unit") or unit
            if nv.get("goldenId"):
                nv["goldenId"] = f"{gid}-{axis['name']}"
            out.append((axis["name"], nv))
        return out
    return [("value", v)]


def parse_coordinate_record(rec):
    """Parse a COORDINATE record like 'X=1.21766 m, Y=1.47689 m' into axis values."""
    raw = (rec.get("raw_value") or "").strip()
    axes = []
    for part in re.split(r"[;,]", raw):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"([XYZxyz])\s*=\s*([-+0-9.eE]+)\s*([A-Za-z0-9/._]*)", part)
        if m:
            num = parse_number(m.group(2))
            if num is not None:
                axes.append({"name": m.group(1).upper(), "value": num, "unit": m.group(3) or None})
    return axes or None


def resolve_target(rec, index):
    """Return (common_layer, common_section, entity_id) for a golden record.

    Single source of truth used by BOTH build_mapping_registers.py and
    build_common_model_fixture.py so mapping registers and the fixture agree.
    """
    domain = (rec.get("domain") or "").strip()
    fp = rec.get("field_path") or ""
    layer, section = assign_layer(domain, fp)
    eid = entity_id_for(domain, fp, rec.get("entity_id", ""), rec.get("golden_id", ""), index)

    if section == "elevation":
        if (rec.get("entity_id") or "").startswith("ENT-DECK"):
            layer, section, eid = "bridgeGeometry", "deck", "DECK-01"
        else:
            layer, section, eid = "alignment", "alignment", "ALN-ACL"
    if section == "girder" and eid == "ALN-ACL":
        layer, section = "alignment", "alignment"
    if section == "support_restraint":
        layer, section = "bridgeGeometry", "support"
    if section == "connectivity":
        rest = [t for t in fp.split(".") if t][1:]
        if rest and rest[0].startswith(("ag1", "ag2")):
            layer, section, eid = "bridgeGeometry", "girder", f"GIRDER-{rest[0].split('_')[0].upper()}"
        else:
            layer, section, eid = "alignment", "alignment", "ALN-ACL"
    if section == "section_assignment":
        rest = [t for t in fp.split(".") if t][1:]
        if rest:
            layer, section, eid = "bridgeGeometry", "girder", f"GIRDER-{rest[0].upper()}"
    if layer == "sections" and eid == "DECK-01":
        layer, section = "bridgeGeometry", "deck"
    return layer, section, eid
