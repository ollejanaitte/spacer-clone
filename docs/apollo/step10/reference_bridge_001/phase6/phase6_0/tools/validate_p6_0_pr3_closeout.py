#!/usr/bin/env python3
"""
P6-0 PR-3C closeout validator — Phase 6-0 completion evidence.

Validates the Phase 6-0 closeout deliverables that close the Phase 6-0 seal:

  - risk register (validation/risk_register.csv) well-formed + non-empty
  - backlog (backlog/) exists with Phase 6-1..6-4 coverage
  - handoff (08_phase6_1_handoff.md) present with readiness markers
  - seal (phase6_0_seal.md) present with seal ID / verdict markers
  - completion reports (PR-3 + closeout) present
  - root final_report.txt Phase 6-0 section marked COMPLETE with seal ID and
    master validation PASS
  - Phase 6 README status table shows PR-3 COMPLETE

Usage: python validate_p6_0_pr3_closeout.py --root <repo root>
Exit 0 on PASS, 1 on FAIL.
"""

import argparse
import csv
import os

RB = "docs/apollo/step10/reference_bridge_001/phase6/phase6_0"

RISK_COLUMNS = [
    "risk_id", "phase", "risk", "category", "impact", "likelihood",
    "mitigation", "owner", "status", "notes",
]

REQUIRED_FILES = [
    "validation/risk_register.csv",
    "backlog/README.md",
    "08_phase6_1_handoff.md",
    "phase6_0_seal.md",
    "completion/p6_0_pr3_completion_report.md",
    "completion/phase6_0_closeout_report.md",
    "validation/phase6_0_master_validation_summary.md",
]

RISK_SEVERITY = {"LOW", "MEDIUM", "HIGH"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    base = os.path.join(root, RB)
    fails, checks = [], 0

    for rel in REQUIRED_FILES:
        checks += 1
        if not os.path.exists(os.path.join(base, rel)):
            fails.append(f"missing: {rel}")

    # risk register
    risk_path = os.path.join(base, "validation", "risk_register.csv")
    if os.path.exists(risk_path):
        with open(risk_path, newline="", encoding="utf-8") as f:
            raw = list(csv.reader(f))
        rows = [dict(zip(raw[0], r)) for r in raw[1:]]
        headers = raw[0] if raw else []
        checks += 1
        ncols = len(raw[0]) if raw else 0
        malformed = [i + 1 for i, r in enumerate(raw[1:], start=1) if len(r) != ncols]
        if malformed:
            fails.append(f"risk_register malformed rows: {malformed}")
        for col in RISK_COLUMNS:
            checks += 1
            if col not in headers:
                fails.append(f"risk_register missing column: {col}")
        checks += 1
        if not rows:
            fails.append("risk_register empty")
        ids = [r["risk_id"] for r in rows]
        checks += 1
        if len(ids) != len(set(ids)):
            fails.append("risk_register duplicate risk_id")
        checks += 1
        bad = [r["risk_id"] for r in rows if (r.get("status") or "").strip() != "OPEN"
               or (r.get("risk_id") or "").strip() == ""]
        if bad:
            fails.append(f"risk_register invalid status/empty id rows: {bad}")

    # backlog coverage
    backlog = os.path.join(base, "backlog", "README.md")
    if os.path.exists(backlog):
        text = open(backlog, encoding="utf-8").read().lower()
        for m in ("phase 6-1", "phase 6-2", "phase 6-3", "phase 6-4"):
            checks += 1
            if m not in text:
                fails.append(f"backlog missing coverage marker: {m}")

    # handoff
    handoff = os.path.join(base, "08_phase6_1_handoff.md")
    if os.path.exists(handoff):
        text = open(handoff, encoding="utf-8").read()
        checks += 1
        if "READY" not in text or "explicit user instruction" not in text.lower():
            fails.append("handoff missing readiness / explicit-instruction marker")

    # seal
    seal = os.path.join(base, "phase6_0_seal.md")
    if os.path.exists(seal):
        text = open(seal, encoding="utf-8").read()
        checks += 1
        if "SEAL-RB-S10-001-P6-0" not in text or "SEALED" not in text:
            fails.append("seal missing seal ID / SEALED marker")
        checks += 1
        if "PHASE6_0_MASTER_VALIDATION: PASS" not in text:
            fails.append("seal missing master validation PASS marker")

    # final_report.txt
    fr = os.path.join(root, "final_report.txt")
    checks += 1
    if not os.path.exists(fr):
        fails.append("root final_report.txt missing")
    else:
        text = open(fr, encoding="utf-8").read()
        checks += 1
        if "PHASE6_0_OVERALL_VERDICT: COMPLETE" not in text:
            fails.append("final_report.txt Phase 6-0 verdict not COMPLETE")
        checks += 1
        if "SEAL-RB-S10-001-P6-0" not in text:
            fails.append("final_report.txt missing Phase 6-0 seal ID")
        checks += 1
        if "PHASE6_0_MASTER_VALIDATION: PASS" not in text:
            fails.append("final_report.txt missing master validation PASS")

    # phase6_0 README status
    readme = os.path.join(base, "README.md")
    if os.path.exists(readme):
        text = open(readme, encoding="utf-8").read()
        checks += 1
        if "PR-3" in text and "COMPLETE" not in text:
            fails.append("phase6_0 README status not updated to COMPLETE")

    print(f"OVERALL: {'PASS' if not fails else 'FAIL'} ({checks} checks)")
    for f in fails:
        print(f"  FAIL: {f}")
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
