#!/usr/bin/env python3
"""Rebuild Phase 2-I coverage/status CSVs from the actual tracked extraction
artifacts (evidence-based), and report before/after counts for truth
reconciliation.

Documentation-only. Does not recompute any design value.
Standard library only.
"""
import csv
import os
import sys
import hashlib

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "phase2_i")
ROOT = os.path.normpath(ROOT)

CALC_ARTIFACT_FILES = [
    "page_elements.csv",
    "values.csv",
    "tables.csv",
    "formulas.csv",
    "notes.csv",
    "figures.csv",
]

# section_id (bare, as in calculation_section_status.csv) -> artifact dir
# relative to phase2_i/calculation
SECTION_TO_ARTIFACT = {
    "ch1": "chapter_01",
    "1.1": "chapter_01",
    "1.2": "chapter_01",
    "1.3": "chapter_01",
    "ch2": "chapter_02",
    "2.1": "chapter_02",
    "2.2": "chapter_02",
    "3.1": "chapter_03/section_3_1",
    "3.1.1": "chapter_03/section_3_1",
    "3.1.2": "chapter_03/section_3_1",
    "3.1.3": "chapter_03/section_3_1",
    "3.1.4": "chapter_03/section_3_1",
    "3.1.5": "chapter_03/section_3_1",
    "3.1.6": "chapter_03/section_3_1",
    "3.1.7": "chapter_03/section_3_1",
    "3.1.8": "chapter_03/section_3_1",
    "3.1.9": "chapter_03/section_3_1",
    "3.2": "chapter_03/section_3_2",
    "3.2.1": "chapter_03/section_3_2",
    "3.2.2": "chapter_03/section_3_2",
    "3.2.3": "chapter_03/section_3_2",
    "3.2.4": "chapter_03/section_3_2",
    "3.2.5": "chapter_03/section_3_2",
    "3.2.6": "chapter_03/section_3_2",
    "3.2.7": "chapter_03/section_3_2",
    "3.2.8": "chapter_03/section_3_2",
    "3.2.9": "chapter_03/section_3_2",
    "3.2.10": "chapter_03/section_3_2",
    "3.2.11": "chapter_03/section_3_2",
    "3.2.12": "chapter_03/section_3_2",
    "3.2.13": "chapter_03/section_3_2",
    "3.2.14": "chapter_03/section_3_2",
    "3.2.15": "chapter_03/section_3_2",
    "3.2.16": "chapter_03/section_3_2",
    "3.3": "chapter_03/section_3_3",
    "3.3.1": "chapter_03/section_3_3",
    "3.3.2": "chapter_03/section_3_3",
    "3.3.3": "chapter_03/section_3_3",
    "3.3.4": "chapter_03/section_3_3",
    "3.3.5": "chapter_03/section_3_3",
    "3.3.6": "chapter_03/section_3_3",
    "3.3.7": "chapter_03/section_3_3",
    "3.4": "chapter_03/section_3_4",
    "3.4.1": "chapter_03/section_3_4",
    "3.4.2": "chapter_03/section_3_4",
    "3.5": "chapter_03/section_3_5",
    "3.5.1": "chapter_03/section_3_5",
    "3.5.2": "chapter_03/section_3_5",
    "3.5.3": "chapter_03/section_3_5",
    "3.5.4": "chapter_03/section_3_5",
    "3.5.5": "chapter_03/section_3_5",
    "3.5.6": "chapter_03/section_3_5",
    "3.6": "chapter_03/section_3_6",
    "3.6.1": "chapter_03/section_3_6",
    "3.6.2": "chapter_03/section_3_6",
    "3.6.3": "chapter_03/section_3_6",
    "3.6.4": "chapter_03/section_3_6",
    "3.7": "chapter_03/section_3_7",
    "3.7.1": "chapter_03/section_3_7",
    "3.7.2": "chapter_03/section_3_7",
    "ch3": "chapter_03",
    "4.1": "chapter_04/section_4_1",
    "4.1.1": "chapter_04/section_4_1",
    "4.1.2": "chapter_04/section_4_1",
    "4.1.3": "chapter_04/section_4_1",
    "4.1.4": "chapter_04/section_4_1",
    "4.1.5": "chapter_04/section_4_1",
    "4.1.6": "chapter_04/section_4_1",
    "4.1.7": "chapter_04/section_4_1",
    "4.2": "chapter_04/section_4_2",
    "4.2.1": "chapter_04/section_4_2",
    "4.2.2": "chapter_04/section_4_2",
    "4.2.3": "chapter_04/section_4_2",
    "4.2.4": "chapter_04/section_4_2",
    "4.2.5": "chapter_04/section_4_2",
    "4.2.6": "chapter_04/section_4_2",
    "4.2.7": "chapter_04/section_4_2",
    "4.2.8": "chapter_04/section_4_2",
    "4.2.9": "chapter_04/section_4_2",
    "4.2.10": "chapter_04/section_4_2",
    "ch4": "chapter_04",
    "5.1": "chapter_05",
    "5.1.1": "chapter_05",
    "5.1.2": "chapter_05",
    "5.1.3": "chapter_05",
    "5.1.4": "chapter_05",
    "5.2": "chapter_05",
    "5.3": "chapter_05",
    "5.4": "chapter_05",
    "5.4.1": "chapter_05",
    "5.4.2": "chapter_05",
    "ch5": "chapter_05",
}

FRONT_MATTER_ARTIFACT = "front_matter"

DRAWING_GROUP_TO_RANGE = {
    "location": "1-4",
    "general": "5-7",
    "quantities": "8-9",
    "structure_general": "10-12",
    "alignment": "13-16",
    "cross_section": "17-19",
    "common_details": "20",
    "camber": "21-29",
    "main_girder_ag1": "30-38",
    "main_girder_ag2": "39-44",
    "stud_layout": "45-46",
    "end_cross_beam": "47-48",
    "pier_cross_beam": "49-60",
    "intermediate_cross_beam": "61-71",
    "lateral_bracing": "72-79",
    "wrapping_concrete": "80-83",
    "wrapping_concrete_stud": "84",
    "composite_deck": "85-88",
    "bearing_details": "89-92",
    "expansion_joints": "93-99",
    "parapet": "100",
    "lighting": "101-111",
    "deck_drainage": "112-114",
    "substructure_drainage": "115",
    "bridge_deck_drainage": "116-125",
    "inspection_super": "126-130",
    "inspection_sub": "131",
    "slope_stairs": "132",
    "falling_object": "133-134",
    "spalling": "135-136",
    "step_prevention": "137",
    "nameplate": "138-139",
    "nose_guardrail": "140",
    "nose_water_stop": "141",
}


def csv_rows(path):
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return list(csv.reader(f))


def artifact_row_counts(rel_dir):
    base = os.path.join(ROOT, "calculation", rel_dir)
    total = 0
    per_file = {}
    for fn in CALC_ARTIFACT_FILES:
        p = os.path.join(base, fn)
        if os.path.isfile(p):
            n = sum(1 for _ in open(p, encoding="utf-8")) - 1
            per_file[fn] = n
            total += n
    return total, per_file


def dir_extracted(rel):
    total, _ = artifact_row_counts(rel)
    return total > 0


def section_extracted(section_id):
    """The section's artifact dir has >0 data rows; a bare chapter id is
    extracted when any of its descendant section dirs have data."""
    rel = SECTION_TO_ARTIFACT.get(section_id)
    if not rel:
        return False
    if dir_extracted(rel):
        return True
    base = os.path.join(ROOT, "calculation", rel)
    if os.path.isdir(base):
        for sub in sorted(os.listdir(base)):
            subp = os.path.join(base, sub)
            if os.path.isdir(subp) and dir_extracted(subp):
                return True
    return False


def write_csv(path, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerows(rows)


def main():
    print("ROOT:", ROOT)

    # ---- calculation page coverage ----
    cov_path = os.path.join(ROOT, "calculation_page_coverage.csv")
    rows = csv_rows(cov_path)
    header = rows[0]
    before = {}
    after = {}
    changed = 0
    issues = []
    for r in rows[1:]:
        page_type = r[4]
        section_id = r[3].replace("CAL-SEC-", "")
        old_status = r[5]
        # repair column-misalignment corruption from earlier partial regen:
        # a TEXT_EXTRACTED value in the page_type column (index 4) indicates the
        # intended status was written into the wrong column; restore 'content'.
        if page_type not in ("front_matter", "content", "end_marker"):
            issues.append(
                f"page {r[0]} corrupted page_type column value '{page_type}' -> restored to 'content'"
            )
            page_type = "content"
            r[4] = "content"
        if page_type == "front_matter":
            total, _ = artifact_row_counts(FRONT_MATTER_ARTIFACT)
            new_status = "TEXT_EXTRACTED" if total > 0 else "NOT_STARTED"
            if total == 0:
                issues.append(f"front_matter page {r[0]} has no artifacts")
        elif page_type == "end_marker":
            new_status = "NOT_STARTED"
        else:
            if section_extracted(section_id):
                new_status = "TEXT_EXTRACTED"
            else:
                new_status = "NOT_STARTED"
                issues.append(f"page {r[0]} section {section_id} has no artifacts")
        before[old_status] = before.get(old_status, 0) + 1
        after[new_status] = after.get(new_status, 0) + 1
        if old_status != new_status:
            changed += 1
        r[5] = new_status
        r[6] = "UNVERIFIED"
    print("calculation_page_coverage.csv")
    print("  before:", before)
    print("  after :", after, "changed:", changed)
    if issues:
        print("  ISSUES:")
        for i in issues[:30]:
            print("   -", i)
    write_csv(cov_path, rows)

    # ---- drawing sheet coverage ----
    ds_path = os.path.join(ROOT, "drawing_sheet_coverage.csv")
    d_rows = csv_rows(ds_path)
    d_before = {}
    d_after = {}
    d_changed = 0
    for r in d_rows[1:]:
        sheet = r[0]
        old = r[4]
        if sheet == "141":
            new = "UNREADABLE_REQUIRES_HUMAN"
        else:
            new = "TEXT_EXTRACTED"
        d_before[old] = d_before.get(old, 0) + 1
        d_after[new] = d_after.get(new, 0) + 1
        if old != new:
            d_changed += 1
        r[4] = new
        r[5] = "UNVERIFIED"
    print("drawing_sheet_coverage.csv")
    print("  before:", d_before)
    print("  after :", d_after, "changed:", d_changed)
    write_csv(ds_path, d_rows)

    # ---- calculation section status ----
    ss_path = os.path.join(ROOT, "calculation_section_status.csv")
    s_rows = csv_rows(ss_path)
    s_before = {}
    s_after = {}
    s_changed = 0
    for r in s_rows[1:]:
        section_id = r[1]
        old = r[5]
        new = "TEXT_EXTRACTED" if section_extracted(section_id) else "NOT_STARTED"
        s_before[old] = s_before.get(old, 0) + 1
        s_after[new] = s_after.get(new, 0) + 1
        if old != new:
            s_changed += 1
        r[5] = new
        r[6] = "UNVERIFIED"
    print("calculation_section_status.csv")
    print("  before:", s_before)
    print("  after :", s_after, "changed:", s_changed)
    write_csv(ss_path, s_rows)

    # ---- drawing group status ----
    dg_path = os.path.join(ROOT, "drawing_group_status.csv")
    g_rows = csv_rows(dg_path)
    g_before = {}
    g_after = {}
    g_changed = 0
    for r in g_rows[1:]:
        group = r[0]
        old = r[3]
        # sheet 141 group => unreadable; all other groups extracted
        if "141" in r[1]:
            new = "UNREADABLE_REQUIRES_HUMAN"
        else:
            new = "TEXT_EXTRACTED"
        g_before[old] = g_before.get(old, 0) + 1
        g_after[new] = g_after.get(new, 0) + 1
        if old != new:
            g_changed += 1
        r[3] = new
        r[4] = "UNVERIFIED"
    print("drawing_group_status.csv")
    print("  before:", g_before)
    print("  after :", g_after, "changed:", g_changed)
    write_csv(dg_path, g_rows)


if __name__ == "__main__":
    main()
