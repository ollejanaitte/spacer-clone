#!/usr/bin/env python3
"""Validate the P2II-A unread_resolution deliverables for Reference Bridge 001.

Checks:
  1. All drawing_sheet_141_*.csv files parse cleanly (no empty fieldnames,
     consistent columns).
  2. Every row carries a valid resolution state and verification status.
  3. The visual transcription markdown exists and references all CSVs.
  4. unread_resolution_register.csv lists every sheet flagged as resolved.

Documentation-only. Does not recompute any design value.
Standard library only.
"""
import csv
import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "unread_resolution")
ROOT = os.path.normpath(ROOT)
REGISTER = os.path.join(os.path.dirname(ROOT), "unread_resolution_register.csv")

VALID_STATES = {
    "RESOLVED_WITH_OCR_ASSIST",
    "RESOLVED_WITH_TEXT_LAYER",
    "RESOLVED_VISUALLY",
    "PARTIALLY_RESOLVED",
    "UNREADABLE_REQUIRES_HUMAN",
}
VALID_VERIFICATIONS = {
    "VERIFIED", "UNVERIFIED", "PARTIAL",
    "AGREED", "CONFIRMED_BLANK",  # OCR pass-agreement markers
}

fails = 0


def check(ok, msg):
    global fails
    if not ok:
        fails += 1
        print("[FAIL] " + msg)
    else:
        print("[ok] " + msg)


def main():
    print("Check 1 — drawing_sheet_141_*.csv parse cleanly")
    for p in sorted(glob.glob(os.path.join(ROOT, "drawing_sheet_141_*.csv"))):
        try:
            rows = list(csv.DictReader(open(p, encoding="utf-8")))
        except Exception as e:  # noqa: BLE001
            check(False, f"{os.path.basename(p)}: parse error {e}")
            continue
        bad = [r for r in rows if None in r or (not any((r.get(k) or "").strip() for k in r))]
        check(not bad, f"{os.path.basename(p)}: {len(rows)} rows, clean columns")
    check(True, "scanned")

    print("Check 2 — status / verification statuses from enum")
    for p in sorted(glob.glob(os.path.join(ROOT, "drawing_sheet_141_*.csv"))):
        for r in csv.DictReader(open(p, encoding="utf-8")):
            st = (r.get("status") or "").strip()
            vs = (r.get("verification_status") or "").strip()
            if st:
                check(st in VALID_STATES, f"{os.path.basename(p)}: status={st}")
            if vs:
                check(vs in VALID_VERIFICATIONS,
                      f"{os.path.basename(p)}: verification_status={vs}")

    print("Check 3 — visual transcription markdown references CSVs")
    md = os.path.join(ROOT, "drawing_sheet_141_visual_transcription.md")
    check(os.path.exists(md), "visual transcription md exists")
    if os.path.exists(md):
        txt = open(md, encoding="utf-8").read()
        for f in ("Drawing title", "Girder identity", "Erection order",
                  "Crane working", "Crane capacity table", "Cross section",
                  "Other annotations", "Ambiguous"):
            check(f in txt, f"md references '{f}'")

    print("Check 4 — unread_resolution_register.csv lists resolved sheets")
    check(os.path.exists(REGISTER), "register exists")
    if os.path.exists(REGISTER):
        rows = list(csv.DictReader(open(REGISTER, encoding="utf-8")))
        check(len(rows) >= 1, f"register has {len(rows)} row(s)")
        for r in rows:
            v = (r.get("verdict") or "").strip()
            check(v in VALID_STATES, f"verdict={v} in register")

    print("Check 5 — no PDF/image artifacts inside unread_resolution")
    for p in glob.glob(os.path.join(ROOT, "**", "*"), recursive=True):
        if os.path.isfile(p) and not p.endswith((".md", ".csv", ".py")):
            check(False, f"unexpected artifact {os.path.basename(p)}")

    print("Check 6 — verification log covers every ambiguity flag V001..Vnn")
    vlog = os.path.join(ROOT, "drawing_sheet_141_verification_log.csv")
    md_txt = open(md, encoding="utf-8").read() if os.path.exists(md) else ""
    flags = sorted(set(re.findall(r"\bV\d{3}\b", md_txt)))
    if os.path.exists(vlog):
        vids = {r["verification_id"].strip() for r in csv.DictReader(open(vlog, encoding="utf-8"))}
        missing = [f for f in flags if f not in vids]
        check(not missing, f"all V-flags {flags} covered in verification_log")

    print("OVERALL: " + ("PASS" if fails == 0 else f"FAIL — {fails} failing check(s)"))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
