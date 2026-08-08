#!/usr/bin/env python3
"""
STEP 1 master validator — superstructure full-implementation design freeze.

Verifies that the STEP 1 design deliverables (18 docs) exist, are indexed in the
README, and satisfy the Design-Freeze consistency gates:

  - docs existence + README index coverage
  - schema / data-model matrix presence (P02)
  - coordinate/unit contract presence (P02)
  - connector matrix presence with producer/consumer/owner columns and no dup IDs (P03)
  - API dataflow presence (P03)
  - Bridge Geometry (P04) + 3D contract (P04) presence
  - analysis/design architecture + calculation rule matrix presence (P05)
  - UI screen + button action matrix presence (P06)
  - output matrix + golden replay spec presence with tolerance/provenance/discrepancy (P07)
  - test/acceptance matrix + error/hold traceability presence (P08)
  - risk/backlog presence with no blocking-HOLD left undefined (P09)
  - STEP2 / STEP3 handoff presence (P10)
  - gap resolution: every GAP-xx from P00 maps to a PR in P01..P10

Usage: python validate_step1_master.py --root <repo root>
Exit 0 on PASS, 1 on FAIL.
"""

import argparse
import os
import re

RB = "docs/apollo/step10/reference_bridge_001/step1"

REQUIRED_DELIVERABLES = {
    # deliverable #: (file, minimal markers)
    "1 master architecture": ("STEP1_P01_MASTER_ARCHITECTURE.md", ["GeometrySnapshot", "責務"]),
    "2 implementation sequence": ("STEP1_P01_IMPLEMENTATION_SEQUENCE.md", ["2-01", "STEP 3"]),
    "3 data model schema matrix": ("STEP1_P02_DATA_MODEL_MATRIX.md", ["schema", "resolution state"]),
    "4 coordinate unit contract": ("STEP1_P02_COORDINATE_UNIT_CONTRACT.md", ["座標", "単位", "rad"]),
    "5 interface connector matrix": ("STEP1_P03_CONNECTOR_MATRIX.md", ["Connector", "producer", "consumer"]),
    "6 api dataflow matrix": ("STEP1_P03_API_DATAFLOW_MATRIX.md", ["API", "frontend", "backend"]),
    "7 calculation rule matrix": ("STEP1_P05_CALCULATION_RULE_MATRIX.md", ["照査", "規準", "NOT_AUTHORIZED"]),
    "8 ui screen matrix": ("STEP1_P06_UI_SCREEN_MATRIX.md", ["画面", "ルーティング"]),
    "9 ui button action matrix": ("STEP1_P06_UI_BUTTON_ACTION_MATRIX.md", ["action", "ボタン"]),
    "10 3d contract": ("STEP1_P04_3D_CONTRACT.md", ["GeometrySnapshot", "Three.js"]),
    "11 output matrix": ("STEP1_P07_OUTPUT_MATRIX.md", ["CSV", "DXF", "STL"]),
    "12 golden master replay spec": ("STEP1_P07_GOLDEN_REPLAY_SPEC.md", ["tolerance", "Replay", "provenance"]),
    "13 test acceptance matrix": ("STEP1_P08_TEST_ACCEPTANCE_MATRIX.md", ["E2E", "acceptance"]),
    "14 error hold traceability spec": ("STEP1_P08_ERROR_HOLD_TRACEABILITY.md", ["HOLD", "CONFLICT", "NOT_AVAILABLE"]),
    "15 risk dependency backlog": ("STEP1_P09_RISK_BACKLOG.md", ["deferred", "HOLD"]),
    "16 step2 implementation handoff": ("STEP1_P10_STEP2_HANDOFF.md", ["2-01", "STEP 2"]),
    "17 step3 integration handoff": ("STEP1_P10_STEP3_HANDOFF.md", ["3-01", "STEP 3"]),
    "18 design freeze report": ("STEP1_P11_DESIGN_FREEZE_REPORT.md", ["DESIGN_FREEZE", "IMPLEMENTATION_READY"]),
}

CONNECTOR_REQUIRED_COLUMNS = ["ID", "Connector", "From→To", "P", "C", "O", "Input", "Output", "Error"]

GAP_RE = re.compile(r"GAP-(\d\d)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    base = os.path.join(root, RB)
    fails, checks = [], 0

    # 1. README + all 18 deliverables
    checks += 1
    if not os.path.exists(os.path.join(base, "README.md")):
        fails.append("missing: README.md")
    readme = open(os.path.join(base, "README.md"), encoding="utf-8").read()

    for name, (rel, markers) in REQUIRED_DELIVERABLES.items():
        checks += 1
        p = os.path.join(base, rel)
        if not os.path.exists(p):
            fails.append(f"missing deliverable: {name} ({rel})")
            continue
        text = open(p, encoding="utf-8").read()
        for m in markers:
            checks += 1
            if m not in text:
                fails.append(f"{rel} missing marker: {m}")
        checks += 1
        if rel not in readme:
            fails.append(f"README index missing: {rel}")

    # 2. connector matrix columns + dup IDs
    conn = os.path.join(base, "STEP1_P03_CONNECTOR_MATRIX.md")
    if os.path.exists(conn):
        text = open(conn, encoding="utf-8").read()
        for col in CONNECTOR_REQUIRED_COLUMNS:
            checks += 1
            if col not in text:
                fails.append(f"connector matrix missing column marker: {col}")
        ids = re.findall(r"^\| CN-\d\d\b", text, re.MULTILINE)
        ids = [m.split("|")[1].strip() for m in ids]
        checks += 1
        dup = sorted({i for i in ids if ids.count(i) > 1})
        if dup:
            fails.append(f"connector duplicate IDs: {dup}")
        checks += 1
        if len(set(ids)) < 14:
            fails.append(f"connector count low ({len(set(ids))} < 14)")

    # 3. replay spec: tolerance + discrepancy + provenance
    replay = os.path.join(base, "STEP1_P07_GOLDEN_REPLAY_SPEC.md")
    if os.path.exists(replay):
        text = open(replay, encoding="utf-8").read()
        for m in ("tolerance", "discrepancy", "provenance", "FAIL_ID", "Replay 順序"):
            checks += 1
            if m not in text:
                fails.append(f"replay spec missing marker: {m}")

    # 4. test acceptance
    test = os.path.join(base, "STEP1_P08_TEST_ACCEPTANCE_MATRIX.md")
    if os.path.exists(test):
        text = open(test, encoding="utf-8").read()
        for m in ("pytest", "vitest", "E2E"):
            checks += 1
            if m not in text:
                fails.append(f"test acceptance missing marker: {m}")

    # 5. risk/backlog: no undefined blocking HOLD (must mention deferred)
    risk = os.path.join(base, "STEP1_P09_RISK_BACKLOG.md")
    if os.path.exists(risk):
        text = open(risk, encoding="utf-8").read()
        checks += 1
        if "deferred" not in text or "blocking HOLD = 0" not in text:
            fails.append("risk backlog missing deferred / blocking-HOLD-0 markers")

    # 6. P00 gaps -> resolved across P01..P10
    baseline = os.path.join(base, "STEP1_P00_BASELINE.md")
    gaps = set()
    if os.path.exists(baseline):
        gaps = set(GAP_RE.findall(open(baseline, encoding="utf-8").read()))
    if gaps:
        others = ""
        for rel in os.listdir(base):
            if rel.endswith(".md") and rel != "STEP1_P00_BASELINE.md":
                others += open(os.path.join(base, rel), encoding="utf-8").read()
        missing_gaps = [g for g in sorted(gaps) if f"GAP-{g}" not in others]
        checks += 1
        if missing_gaps:
            fails.append(f"unresolved GAP references: {[f'GAP-{g}' for g in missing_gaps]}")

    # 7. no duplicate responsibility markers (3D/図面 geometry 一本化)
    checks += 1
    arch = open(os.path.join(base, "STEP1_P01_MASTER_ARCHITECTURE.md"), encoding="utf-8").read()
    if "GeometrySnapshot" not in arch or "再計算しない" not in arch:
        fails.append("master architecture missing snapshot-single-source markers")

    print(f"OVERALL: {'PASS' if not fails else 'FAIL'} ({checks} checks)")
    for f in fails:
        print(f"  FAIL: {f}")
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
