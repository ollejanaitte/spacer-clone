#!/usr/bin/env python3
"""Rebuild evidence_traceability_matrix.csv with expanded exact blocker/control IDs."""

from __future__ import annotations

import csv
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
EC = REPO_ROOT / "docs" / "apollo" / "evidence-collection"

MATRIX_COLUMNS = (
    "trace_id",
    "ea_stage",
    "deliverable_path",
    "checkpoint_sha",
    "linked_blocker_ids",
    "linked_control_ids",
    "enablement_verdict",
    "closure_verdict",
    "canonical_register_path",
    "status_note",
)

MATRIX_PATH = EC / "evidence_traceability_matrix.csv"
SNAPSHOT_PATH = EC / "00_inventory" / "current_blocker_snapshot.csv"
WORK_ITEMS_PATH = EC / "00_inventory" / "executable_work_items.csv"


def load_snapshot_ids() -> list[str]:
    with SNAPSHOT_PATH.open(encoding="utf-8", newline="") as handle:
        return [row["blocker_id"] for row in csv.DictReader(handle)]


def work_item_blocker_ids() -> str:
    seen: set[str] = set()
    ordered: list[str] = []
    with WORK_ITEMS_PATH.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            blocker_id = row["linked_blocker_id"]
            if blocker_id not in seen:
                seen.add(blocker_id)
                ordered.append(blocker_id)
    return ";".join(ordered)


def build_rows(snapshot_ids: list[str]) -> list[tuple[str, ...]]:
    all_76 = ";".join(snapshot_ids)
    wi = ";".join(f"WI-{index:03d}" for index in range(1, 21))
    dr = ";".join(f"DR-{index:02d}" for index in range(1, 21))
    gate = ";".join(f"GATE-NR-{index:02d}" for index in range(1, 8))
    stages = ";".join(f"STAGE-{index:02d}" for index in range(0, 6))
    an_blk = ";".join(f"AN-BLK-{index:03d}" for index in range(1, 11))
    ext_id = ";".join(f"EXT-ID-{index:03d}" for index in range(1, 4))
    an_002_010 = ";".join(f"AN-BLK-{index:03d}" for index in range(2, 11))
    an_ext = f"{an_blk};{ext_id}"
    gold_blk_001_002 = "GOLD-BLK-001;GOLD-BLK-002"
    gold_001_005 = ";".join(f"GOLD-{index:03d}" for index in range(1, 6))

    return [
        (
            "ETM-001",
            "EA-00",
            "docs/apollo/evidence-collection/00_inventory/current_blocker_snapshot.csv",
            "fa3c9d0afe5a59860a2bc28c740c3466b464279e",
            all_76,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/evidence-collection/00_inventory/current_blocker_snapshot.csv",
            "76-row snapshot; 0 resolved",
        ),
        (
            "ETM-002",
            "EA-00",
            "docs/apollo/evidence-collection/00_inventory/blocker_reconciliation_report.md",
            "fa3c9d0afe5a59860a2bc28c740c3466b464279e",
            all_76,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/evidence-collection/00_inventory/current_blocker_snapshot.csv",
            "Reconciled with final_report.txt qualified",
        ),
        (
            "ETM-003",
            "EA-00",
            "docs/apollo/evidence-collection/00_inventory/executable_work_items.csv",
            "fa3c9d0afe5a59860a2bc28c740c3466b464279e",
            work_item_blocker_ids(),
            wi,
            "COMPLETE",
            "PARTIAL",
            "docs/apollo/evidence-collection/00_inventory/executable_work_items.csv",
            "Enablement work items; closure external",
        ),
        (
            "ETM-004",
            "EA-00",
            "docs/apollo/evidence-collection/00_inventory/evidence_acquisition_sequence.md",
            "fa3c9d0afe5a59860a2bc28c740c3466b464279e",
            all_76,
            stages,
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/evidence-collection/00_inventory/current_blocker_snapshot.csv",
            "Staged acquisition order",
        ),
        (
            "ETM-005",
            "EA-01",
            "docs/apollo/evidence-collection/01_harness/evidence_harness_spec.md",
            "46f11c139df5ab0c8184e11e36eae22c2eaa4e19",
            "AN-BLK-002;AN-BLK-006;AN-BLK-007;AN-BLK-008",
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/design-standards/06_analyzer/analyzer_blocker_register.csv",
            "Harness tooling; 200 tests PASS",
        ),
        (
            "ETM-006",
            "EA-01",
            "docs/apollo/evidence-collection/01_harness/harness_validation_report.md",
            "60b44f3f2605a4d5b62cd93cf9e4a6727192d339",
            an_blk,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/design-standards/06_analyzer/analyzer_blocker_register.csv",
            "Adversarial audit repairs closed",
        ),
        (
            "ETM-007",
            "EA-02",
            "docs/apollo/evidence-collection/02_analytical_golden/analytical_golden_review.md",
            "f3945c7a47318c2c4ed45de2a4936b64917d09e9",
            f"{gold_blk_001_002};{gold_001_005}",
            "",
            "COMPLETE",
            "TOOLING_REVIEWED_NOT_GOLD_APPROVED",
            "docs/apollo/design-standards/07_golden/golden_blocker_register.csv",
            "Tolerance freeze 4dd51a92",
        ),
        (
            "ETM-008",
            "EA-02",
            "docs/apollo/evidence-collection/02_analytical_golden/tolerance_freeze_register.csv",
            "f3945c7a47318c2c4ed45de2a4936b64917d09e9",
            "GOLD-BLK-002",
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/design-standards/07_golden/golden_blocker_register.csv",
            "Frozen before comparison",
        ),
        (
            "ETM-009",
            "EA-03",
            "docs/apollo/evidence-collection/03_external_run_package/external_run_package_review.md",
            "c8d601e8593069e9f28341e34c3d654f084ef2c4",
            an_ext,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/design-standards/06_analyzer/analyzer_blocker_register.csv",
            "TOOLING_COMPLETE_NOT_MACHINE_EVIDENCE",
        ),
        (
            "ETM-010",
            "EA-03",
            "docs/apollo/evidence-collection/03_external_run_package/execution_runbook.md",
            "c8d601e8593069e9f28341e34c3d654f084ef2c4",
            an_002_010,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/design-standards/06_analyzer/analyzer_blocker_register.csv",
            "No Analyzer in PATH at preflight",
        ),
        (
            "ETM-011",
            "EA-04",
            "docs/apollo/evidence-collection/04_parity_harness/parity_harness_validation_report.md",
            "a00104e2cd9ce1ec14a334ab3a2be2f148ab5696",
            "PAR-BLK-006",
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/design-standards/08_spacer_parity/parity_blocker_register.csv",
            "Tolerance freeze 7ea474a42",
        ),
        (
            "ETM-012",
            "EA-04",
            "docs/apollo/evidence-collection/04_parity_harness/tolerance_freeze_register.csv",
            "a00104e2cd9ce1ec14a334ab3a2be2f148ab5696",
            "PAR-BLK-006",
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/design-standards/08_spacer_parity/parity_blocker_register.csv",
            "Synthetic NOT_ACTUAL_SPACER_PARITY",
        ),
        (
            "ETM-013",
            "EA-05",
            "docs/apollo/evidence-collection/05_dry_run/dry_run_results.md",
            "482eabcdbd293629e8d1a57f168f5306549626cf",
            all_76,
            dr,
            "OPERATIONAL",
            "BLOCKED",
            "docs/apollo/evidence-collection/05_dry_run/dry_run_execution_register.csv",
            "20/20 synthetic PASS; manifest 9b08de31",
        ),
        (
            "ETM-014",
            "EA-05",
            "docs/apollo/evidence-collection/05_dry_run/dry_run_verdicts.md",
            "482eabcdbd293629e8d1a57f168f5306549626cf",
            all_76,
            "EXTERNAL_MACHINE_EVIDENCE_VERDICT;ACTUAL_SPACER_PARITY_VERDICT",
            "OPERATIONAL",
            "BLOCKED",
            "docs/apollo/evidence-collection/05_dry_run/dry_run_verdicts.md",
            "Machine and actual parity remain blocked",
        ),
        (
            "ETM-015",
            "EA-06",
            "docs/apollo/evidence-collection/evidence_traceability_matrix.csv",
            "SELF_PENDING_FINAL_COMMIT",
            all_76,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/evidence-collection/evidence_traceability_matrix.csv",
            "Integration matrix",
        ),
        (
            "ETM-016",
            "EA-06",
            "docs/apollo/evidence-collection/unresolved_evidence_register.csv",
            "SELF_PENDING_FINAL_COMMIT",
            all_76,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/evidence-collection/unresolved_evidence_register.csv",
            "76 entries; 0 resolved",
        ),
        (
            "ETM-017",
            "EA-06",
            "docs/apollo/evidence-collection/numeric_release_gate.md",
            "SELF_PENDING_FINAL_COMMIT",
            all_76,
            gate,
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/evidence-collection/numeric_release_gate.md",
            "Reassessment after EA-00..05",
        ),
        (
            "ETM-018",
            "EA-06",
            "docs/apollo/evidence-collection/final_evidence_execution_report.md",
            "SELF_PENDING_FINAL_COMMIT",
            all_76,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/evidence-collection/final_evidence_execution_report.md",
            "14-section integration report",
        ),
        (
            "ETM-019",
            "EA-06",
            "docs/apollo/evidence-collection/final_verdicts.md",
            "SELF_PENDING_FINAL_COMMIT",
            all_76,
            "",
            "COMPLETE",
            "BLOCKED",
            "docs/apollo/evidence-collection/final_verdicts.md",
            "Canonical EA verdict tokens",
        ),
        (
            "ETM-020",
            "DS-09",
            "docs/apollo/design-standards/09_verification/numeric_release_gate.md",
            "7386bdf8be5b11cb38d445e32ddce16464fdb3c1",
            all_76,
            gate,
            "UNCHANGED",
            "BLOCKED",
            "docs/apollo/design-standards/09_verification/numeric_release_gate.md",
            "DS document freeze gate; EA-06 cross-reference added",
        ),
    ]


def main() -> int:
    snapshot_ids = load_snapshot_ids()
    if len(snapshot_ids) != 76:
        raise SystemExit(f"snapshot row count {len(snapshot_ids)} != 76")
    rows = build_rows(snapshot_ids)
    with MATRIX_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(MATRIX_COLUMNS)
        writer.writerows(rows)
    print(f"TRACEABILITY_MATRIX_BUILD: PASS ({len(rows)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
