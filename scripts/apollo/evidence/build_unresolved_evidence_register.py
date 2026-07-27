#!/usr/bin/env python3
"""Rebuild unresolved_evidence_register.csv from canonical source registers."""

from __future__ import annotations

import csv
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCS = REPO_ROOT / "docs" / "apollo"
EC = DOCS / "evidence-collection"
DS = DOCS / "design-standards"

SNAPSHOT_PATH = EC / "00_inventory" / "current_blocker_snapshot.csv"
REGISTER_PATH = EC / "unresolved_evidence_register.csv"
REPORT_PATH = EC / "final_evidence_execution_report.md"

DS09_REQ = DS / "09_verification" / "unresolved_evidence_requirements.csv"
AN_BLOCKER = DS / "06_analyzer" / "analyzer_blocker_register.csv"
GOLD_BLOCKER = DS / "07_golden" / "golden_blocker_register.csv"
PAR_BLOCKER = DS / "08_spacer_parity" / "parity_blocker_register.csv"
GOLD_CASE = DS / "07_golden" / "golden_case_catalog.csv"
PAR_CASE = DS / "08_spacer_parity" / "parity_case_catalog.csv"
AN_IDENTITY = DS / "06_analyzer" / "analyzer_identity_register.csv"

SNAPSHOT_BASELINE_MAP = {
    "blocker_id": "blocker_id",
    "source_document": "source_document",
    "affected_area": "affected_area",
    "current_status": "current_status",
    "exact_missing_evidence": "exact_missing_evidence",
    "external_dependency": "external_dependency",
    "required_tool": "required_tool",
    "required_license": "required_license",
    "exact_input": "required_input",
    "exact_output": "expected_output",
    "acceptance_criteria": "acceptance_criteria",
    "planned_stage": "planned_stage",
    "notes": "notes",
}

REGISTER_COLUMNS = [
    "blocker_id",
    "source_document",
    "affected_area",
    "current_status",
    "exact_missing_evidence",
    "external_dependency",
    "required_software",
    "required_tool",
    "required_version",
    "required_license",
    "required_machine",
    "exact_input",
    "exact_procedure",
    "exact_output",
    "checksum_requirement",
    "acceptance_criteria",
    "numeric_implementation_impact",
    "source_locator",
    "source_field_notes",
    "ea_enablement_reference",
    "ea_closure_status",
    "planned_stage",
    "notes",
]

MACHINE_EXPLICIT_PATTERNS = (
    re.compile(r"installed .+ on authorized machine", re.I),
    re.compile(r"vendor-installed .+ (executable|service)", re.I),
    re.compile(r"vendor-installed hosting executable", re.I),
)

NOT_MACHINE_VALUES = {
    "NONE",
    "NOT_APPLICABLE",
    "NOT_APPLICABLE_NOT_SPECIFIED",
    "primary blocker GOLD-BLK-001",
    "primary blocker GOLD-BLK-004",
    "primary blocker GOLD-BLK-006",
    "primary blocker GOLD-BLK-007",
    "primary blocker GOLD-BLK-008",
    "SPACER identity to be fixed",
    "Reference identity to be fixed",
    "SPACER fixed version REQUIRED",
    "Approved parent numeric Golden and live IF3 authority",
    "Supervisor scope decision",
    "Supervisor workshop and lawful manual review",
    "Legal and organizational compliance review",
    "Human-verified source pages",
    "Visual review of cited image pages",
    "Licensed R7 volumes and publisher metadata",
    "Licensed JIS primary sources",
    "Licensed supporting-manual prefaces",
    "Licensed R7 clauses and tables",
    "Licensed JIS and R7 material references",
    "Official publisher or MLIT errata bulletins",
    "Licensed R7 verification clauses",
    "Closed DS-03 source packages",
    "Closed DS-04 source packages",
    "Authorized Analyzer machine captures",
    "Accepted DS-06 machine bundle",
    "AN-BLK-001",
    "PAR-BLK-001",
    "PAR-BLK-001;PAR-BLK-002",
    "PAR-BLK-001;PAR-BLK-002;PAR-BLK-003",
    "PAR-BLK-001;PAR-BLK-002;PAR-BLK-003;PAR-BLK-004;PAR-BLK-006;PAR-BLK-007",
    "PAR-BLK-001;PAR-BLK-002;PAR-BLK-006",
    "BLK-S1-002;BLK-S1-004;BLK-S1-005;PKG-R7-V;PKG-DS03;PKG-DS04",
    "PAR-BLK-001;PAR-BLK-002;BLK-S1-002;BLK-S1-005",
}


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def index_by(rows: list[dict[str, str]], key: str) -> dict[str, dict[str, str]]:
    return {row[key]: row for row in rows}


def is_explicit_machine(value: str) -> bool:
    if not value or value in NOT_MACHINE_VALUES:
        return False
    if ";" in value and not any(p.search(value) for p in MACHINE_EXPLICIT_PATTERNS):
        return False
    return any(p.search(value) for p in MACHINE_EXPLICIT_PATTERNS)


def normalize_machine(snapshot_machine: str, explicit_candidate: str = "") -> str:
    for candidate in (explicit_candidate, snapshot_machine):
        if candidate and is_explicit_machine(candidate):
            return candidate
    return "NOT_APPLICABLE_NOT_SPECIFIED"


def closure_status(status: str) -> str:
    if status == "NOT_APPROVED":
        return "NOT_APPROVED; enablement does not approve case"
    return f"{status}; enablement does not close blocker"


def baseline_from_snapshot(snapshot: dict[str, str]) -> dict[str, str]:
    return {
        register_field: snapshot[snapshot_field]
        for register_field, snapshot_field in SNAPSHOT_BASELINE_MAP.items()
    }


def ea_reference_ds09(row: dict[str, str]) -> str:
    ref = row.get("ea_enablement_reference", "")
    if "EA-01" in ref:
        return ref
    if row["blocker_id"] in {"BLK-S1-011", "PKG-DS06"}:
        return "EA-01 harness; EA-03 external run package (TOOLING_COMPLETE_NOT_MACHINE_EVIDENCE)"
    return f"EA-00 inventory and sequence only; licensed primary source capture BLOCKED"


def build_ds09_row(snapshot: dict[str, str], source: dict[str, str]) -> dict[str, str]:
    blocker_id = snapshot["blocker_id"]
    ext = snapshot["external_dependency"]
    row = baseline_from_snapshot(snapshot)
    row.update(
        {
            "required_software": "NOT_APPLICABLE",
            "required_version": "SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN",
            "required_machine": normalize_machine(ext),
            "exact_procedure": source["acquisition_method"],
            "checksum_requirement": "SHA-256 manifest over all retained evidence artifacts",
            "numeric_implementation_impact": source["numeric_implementation_impact"],
            "source_locator": f"{DS09_REQ.relative_to(REPO_ROOT)}:{blocker_id}",
            "source_field_notes": "acquisition_method->exact_procedure; baseline fields from EA-00 snapshot",
            "ea_enablement_reference": ea_reference_ds09(source),
            "ea_closure_status": closure_status(source["status"]),
        }
    )
    return row


def build_an_blocker_row(snapshot: dict[str, str], source: dict[str, str]) -> dict[str, str]:
    blocker_id = snapshot["blocker_id"]
    ext = snapshot["external_dependency"]
    machine = normalize_machine(ext, "Installed Analyzer SPACER STATICS on authorized machine")
    row = baseline_from_snapshot(snapshot)
    row.update(
        {
            "required_software": source["required_executable_or_service"],
            "required_version": "MUST_BE_CAPTURED_AND_FROZEN",
            "required_machine": machine,
            "exact_procedure": source["safe_acquisition_procedure"],
            "checksum_requirement": source["checksum_requirement"],
            "numeric_implementation_impact": "BLOCKS_NUMERIC_RELEASE",
            "source_locator": f"{AN_BLOCKER.relative_to(REPO_ROOT)}:{blocker_id}",
            "source_field_notes": "safe_acquisition_procedure->exact_procedure; required_executable_or_service->required_software; baseline fields from EA-00 snapshot",
            "ea_enablement_reference": "EA-01 harness; EA-03 external run package (TOOLING_COMPLETE_NOT_MACHINE_EVIDENCE)",
            "ea_closure_status": closure_status(source["status"]),
        }
    )
    return row


def build_gold_blocker_row(snapshot: dict[str, str], source: dict[str, str]) -> dict[str, str]:
    blocker_id = snapshot["blocker_id"]
    ext = snapshot["external_dependency"]
    version = (
        "SOURCE_EDITION_MUST_BE_CAPTURED_AND_FROZEN"
        if source["required_license"] == "NOT_APPLICABLE"
        else "MUST_BE_CAPTURED_AND_FROZEN"
    )
    ea_map = {
        "GOLD-BLK-001": "EA-02 analytical golden package (COMPLETE; TOOLING_REVIEWED_NOT_GOLD_APPROVED)",
        "GOLD-BLK-002": "EA-02 analytical golden package (COMPLETE; TOOLING_REVIEWED_NOT_GOLD_APPROVED)",
        "GOLD-BLK-003": "EA-02 tooling partial; EA-03 runbook; external capture BLOCKED",
        "GOLD-BLK-004": "EA-02 regression/serialization tooling; organizational approval BLOCKED",
        "GOLD-BLK-005": "EA-02 tooling partial; EA-03 runbook; external capture BLOCKED",
        "GOLD-BLK-006": "EA-02 regression/serialization tooling; organizational approval BLOCKED",
        "GOLD-BLK-007": "EA-02 tooling; DS-02..05 source prerequisites BLOCKED",
        "GOLD-BLK-008": "EA-02 export tooling; parent Golden authority BLOCKED",
    }
    row = baseline_from_snapshot(snapshot)
    row.update(
        {
            "required_software": "NOT_APPLICABLE",
            "required_version": version,
            "required_machine": normalize_machine(ext),
            "exact_procedure": source["acquisition_method"],
            "checksum_requirement": (
                "SHA-256 over executable inputs outputs and retained artifacts"
                if blocker_id in {"GOLD-BLK-001", "GOLD-BLK-003", "GOLD-BLK-007"}
                else "SHA-256 manifest over all retained evidence artifacts"
            ),
            "numeric_implementation_impact": "BLOCKS_NUMERIC_RELEASE",
            "source_locator": f"{GOLD_BLOCKER.relative_to(REPO_ROOT)}:{blocker_id}",
            "source_field_notes": "acquisition_method->exact_procedure; baseline fields from EA-00 snapshot",
            "ea_enablement_reference": ea_map[blocker_id],
            "ea_closure_status": closure_status(source["status"]),
        }
    )
    return row


def build_par_blocker_row(snapshot: dict[str, str], source: dict[str, str]) -> dict[str, str]:
    blocker_id = snapshot["blocker_id"]
    ext = snapshot["external_dependency"]
    numeric = source["numeric_impact"]
    if numeric == "Blocks automated parity claim":
        numeric = "Blocks automated parity claim"
    ea = (
        "EA-04 parity harness; EA-05 dry run OPERATIONAL; organizational WI-001 sign-off BLOCKED"
        if blocker_id == "PAR-BLK-006"
        else "EA-04 parity harness; EA-03 SPACER identity runbook; actual capture BLOCKED"
    )
    row = baseline_from_snapshot(snapshot)
    row.update(
        {
            "required_software": "NOT_APPLICABLE",
            "required_version": "MUST_BE_CAPTURED_AND_FROZEN",
            "required_machine": normalize_machine(ext),
            "exact_procedure": source["acquisition_method"],
            "checksum_requirement": (
                "SHA-256 over executable inputs outputs and retained artifacts"
                if blocker_id != "PAR-BLK-005"
                else "SHA-256 manifest over all retained evidence artifacts"
            ),
            "numeric_implementation_impact": numeric,
            "source_locator": f"{PAR_BLOCKER.relative_to(REPO_ROOT)}:{blocker_id}",
            "source_field_notes": "acquisition_method->exact_procedure; baseline fields from EA-00 snapshot",
            "ea_enablement_reference": ea,
            "ea_closure_status": closure_status(source["status"]),
        }
    )
    return row


def build_ext_id_row(snapshot: dict[str, str], source: dict[str, str]) -> dict[str, str]:
    blocker_id = snapshot["blocker_id"]
    ext = snapshot["external_dependency"]
    machine = normalize_machine(ext, ext)
    row = baseline_from_snapshot(snapshot)
    row.update(
        {
            "required_software": source["required_executable_or_service"],
            "required_version": "MUST_BE_CAPTURED_AND_FROZEN",
            "required_machine": machine,
            "exact_procedure": source["safe_acquisition_procedure"],
            "checksum_requirement": "SHA-256 manifest over all retained evidence artifacts",
            "numeric_implementation_impact": "BLOCKS_NUMERIC_RELEASE",
            "source_locator": f"{AN_IDENTITY.relative_to(REPO_ROOT)}:blocker_id={source['blocker_id']}",
            "source_field_notes": "safe_acquisition_procedure->exact_procedure; required_executable_or_service->required_software; baseline fields from EA-00 snapshot",
            "ea_enablement_reference": "EA-01 harness; EA-03 external run package (TOOLING_COMPLETE_NOT_MACHINE_EVIDENCE)",
            "ea_closure_status": closure_status("BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT"),
        }
    )
    return row


def build_gold_case_row(snapshot: dict[str, str], source: dict[str, str]) -> dict[str, str]:
    golden_id = snapshot["blocker_id"]
    ext = snapshot["external_dependency"]
    ref_sw = source["reference_software"]
    required_software = ref_sw if ref_sw not in {"", "NOT_APPLICABLE"} else "NOT_APPLICABLE"
    ea_map = {
        "GOLD-006": "EA-02 tooling partial; EA-03 runbook; external capture BLOCKED",
        "GOLD-007": "EA-02 tooling partial; EA-03 runbook; external capture BLOCKED",
        "GOLD-008": "EA-02 tooling partial; EA-03 runbook; external capture BLOCKED",
        "GOLD-009": "EA-02 tooling partial; EA-03 runbook; external capture BLOCKED",
        "GOLD-010": "EA-02 tooling partial; EA-03 runbook; external capture BLOCKED",
        "GOLD-015": "EA-02 tooling; DS-02..05 source prerequisites BLOCKED",
        "GOLD-016": "EA-02 export tooling; parent Golden authority BLOCKED",
    }
    row = baseline_from_snapshot(snapshot)
    row.update(
        {
            "required_software": required_software,
            "required_version": "MUST_BE_CAPTURED_AND_FROZEN",
            "required_machine": normalize_machine(ext),
            "exact_procedure": source["derivation_method"],
            "checksum_requirement": "SHA-256 over executable inputs outputs and retained artifacts",
            "numeric_implementation_impact": "BLOCKS_NUMERIC_RELEASE",
            "source_locator": f"{GOLD_CASE.relative_to(REPO_ROOT)}:{golden_id}",
            "source_field_notes": "derivation_method->exact_procedure; reference_software->required_software when applicable; baseline fields from EA-00 snapshot",
            "ea_enablement_reference": ea_map.get(
                golden_id,
                "EA-02 analytical golden package (COMPLETE; TOOLING_REVIEWED_NOT_GOLD_APPROVED)",
            ),
            "ea_closure_status": closure_status("NOT_APPROVED"),
        }
    )
    return row


def build_par_case_row(snapshot: dict[str, str], source: dict[str, str]) -> dict[str, str]:
    parity_id = snapshot["blocker_id"]
    ext = snapshot["external_dependency"]
    row = baseline_from_snapshot(snapshot)
    row.update(
        {
            "required_software": source["reference_software"],
            "required_version": "MUST_BE_CAPTURED_AND_FROZEN",
            "required_machine": normalize_machine(ext),
            "exact_procedure": source["mapping_rule"],
            "checksum_requirement": "SHA-256 over executable inputs outputs and retained artifacts",
            "numeric_implementation_impact": "BLOCKS_NUMERIC_RELEASE",
            "source_locator": f"{PAR_CASE.relative_to(REPO_ROOT)}:{parity_id}",
            "source_field_notes": "mapping_rule->exact_procedure; reference_software->required_software; baseline fields from EA-00 snapshot",
            "ea_enablement_reference": "EA-04 parity harness; EA-03 SPACER identity runbook; actual capture BLOCKED",
            "ea_closure_status": closure_status("NOT_APPROVED"),
        }
    )
    return row


def identity_row_for_ext(ext_id: str, identity_rows: list[dict[str, str]]) -> dict[str, str]:
    mapping = {
        "EXT-ID-001": "AN-ID-004",
        "EXT-ID-002": "AN-ID-005",
        "EXT-ID-003": "AN-ID-006",
    }
    target = mapping[ext_id]
    for row in identity_rows:
        if row["analyzer_identity_id"] == target:
            return row
    raise KeyError(f"identity row not found for {ext_id}")


def build_row(snapshot: dict[str, str], indexes: dict[str, dict[str, dict[str, str]]]) -> dict[str, str]:
    blocker_id = snapshot["blocker_id"]
    source_doc = snapshot["source_document"]

    if source_doc.endswith("unresolved_evidence_requirements.csv"):
        source = indexes["ds09"][blocker_id]
        return build_ds09_row(snapshot, source)
    if source_doc.endswith("analyzer_blocker_register.csv"):
        return build_an_blocker_row(snapshot, indexes["an_blocker"][blocker_id])
    if source_doc.endswith("golden_blocker_register.csv"):
        return build_gold_blocker_row(snapshot, indexes["gold_blocker"][blocker_id])
    if source_doc.endswith("parity_blocker_register.csv"):
        return build_par_blocker_row(snapshot, indexes["par_blocker"][blocker_id])
    if source_doc.endswith("analyzer_identity_register.csv"):
        identity = identity_row_for_ext(blocker_id, indexes["identity_list"])
        return build_ext_id_row(snapshot, identity)
    if source_doc.endswith("golden_case_catalog.csv"):
        return build_gold_case_row(snapshot, indexes["gold_case"][blocker_id])
    if source_doc.endswith("parity_case_catalog.csv"):
        return build_par_case_row(snapshot, indexes["par_case"][blocker_id])
    raise ValueError(f"unknown source_document for {blocker_id}: {source_doc}")


def build_register_rows() -> list[dict[str, str]]:
    snapshots = load_csv(SNAPSHOT_PATH)
    indexes = {
        "ds09": index_by(load_csv(DS09_REQ), "blocker_id"),
        "an_blocker": index_by(load_csv(AN_BLOCKER), "blocker_id"),
        "gold_blocker": index_by(load_csv(GOLD_BLOCKER), "blocker_id"),
        "par_blocker": index_by(load_csv(PAR_BLOCKER), "blocker_id"),
        "gold_case": index_by(load_csv(GOLD_CASE), "golden_id"),
        "par_case": index_by(load_csv(PAR_CASE), "parity_case_id"),
        "identity_list": load_csv(AN_IDENTITY),
    }
    return [build_row(snapshot, indexes) for snapshot in snapshots]


def write_register(rows: list[dict[str, str]]) -> None:
    with REGISTER_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=REGISTER_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def escape_md_cell(value: str) -> str:
    return value.replace("|", "\\|")


def section12_software(row: dict[str, str]) -> str:
    software = row["required_software"]
    if software in {"", "NOT_APPLICABLE"}:
        return row["required_tool"]
    return software


SECTION12_MAP = {
    "Software": section12_software,
    "Version": lambda row: row["required_version"],
    "License": lambda row: row["required_license"],
    "Machine": lambda row: row["required_machine"],
    "Input": lambda row: row["exact_input"],
    "Procedure": lambda row: row["exact_procedure"],
    "Output": lambda row: row["exact_output"],
    "Checksum": lambda row: row["checksum_requirement"],
    "Acceptance": lambda row: row["acceptance_criteria"],
    "Numeric impact": lambda row: row["numeric_implementation_impact"],
}


def render_section12_table(rows: list[dict[str, str]]) -> str:
    header = (
        "| ID | Software | Version | License | Machine | Input | Procedure | Output | "
        "Checksum | Acceptance | Numeric impact |"
    )
    separator = "|---|---|---|---|---|---|---|---|---|---|---|"
    body_lines = []
    for row in rows:
        cells = [row["blocker_id"]]
        for getter in SECTION12_MAP.values():
            cells.append(escape_md_cell(getter(row)))
        body_lines.append("| " + " | ".join(cells) + " |")
    return "\n".join([header, separator, *body_lines])


def patch_report_section12(rows: list[dict[str, str]]) -> None:
    text = REPORT_PATH.read_text(encoding="utf-8")
    table = render_section12_table(rows)
    lines = text.splitlines()
    header_idx = next(
        index
        for index, line in enumerate(lines)
        if line.startswith("| ID | Software | Version | License | Machine |")
    )
    end_idx = header_idx + 2
    while end_idx < len(lines) and lines[end_idx].startswith("|"):
        end_idx += 1
    new_lines = lines[:header_idx] + table.splitlines() + lines[end_idx:]
    REPORT_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def main() -> None:
    rows = build_register_rows()
    if len(rows) != 76:
        raise SystemExit(f"expected 76 rows, got {len(rows)}")
    write_register(rows)
    patch_report_section12(rows)
    print(f"wrote {REGISTER_PATH} ({len(rows)} rows)")
    print(f"patched section 12 in {REPORT_PATH}")


if __name__ == "__main__":
    main()
