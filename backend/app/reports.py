from __future__ import annotations

import csv
import io
import json
import math
from typing import Any


CSV_HEADERS = {
    "displacements.csv": ["loadCaseId", "nodeId", "ux", "uy", "uz", "rx", "ry", "rz"],
    "reactions.csv": [
        "loadCaseId",
        "nodeId",
        "fx",
        "fy",
        "fz",
        "mx",
        "my",
        "mz",
        "constrainedDofs",
    ],
    "member_end_forces.csv": [
        "loadCaseId",
        "memberId",
        "end",
        "fx",
        "fy",
        "fz",
        "mx",
        "my",
        "mz",
    ],
}


def build_result_exports(result: dict[str, Any]) -> dict[str, str]:
    ensure_finite(result)
    return {
        "result.json": json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2)
        + "\n",
        "displacements.csv": displacements_csv(result.get("displacements", [])),
        "reactions.csv": reactions_csv(result.get("reactions", [])),
        "member_end_forces.csv": member_end_forces_csv(
            result.get("memberEndForces", [])
        ),
    }


def displacements_csv(rows: list[dict[str, Any]]) -> str:
    return write_csv(CSV_HEADERS["displacements.csv"], rows)


def reactions_csv(rows: list[dict[str, Any]]) -> str:
    output_rows = [
        row
        | {
            "constrainedDofs": ";".join(
                str(item) for item in row.get("constrainedDofs", [])
            )
        }
        for row in rows
    ]
    return write_csv(CSV_HEADERS["reactions.csv"], output_rows)


def member_end_forces_csv(rows: list[dict[str, Any]]) -> str:
    output_rows: list[dict[str, Any]] = []
    for row in rows:
        for end_key, end_label in (("i", "I"), ("j", "J")):
            forces = row.get(end_key, {})
            output_rows.append(
                {
                    "loadCaseId": row.get("loadCaseId", ""),
                    "memberId": row.get("memberId", ""),
                    "end": end_label,
                    "fx": forces.get("fx", 0.0),
                    "fy": forces.get("fy", 0.0),
                    "fz": forces.get("fz", 0.0),
                    "mx": forces.get("mx", 0.0),
                    "my": forces.get("my", 0.0),
                    "mz": forces.get("mz", 0.0),
                }
            )
    return write_csv(CSV_HEADERS["member_end_forces.csv"], output_rows)


def write_csv(headers: list[str], rows: list[dict[str, Any]]) -> str:
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({header: csv_value(row.get(header, "")) for header in headers})
    return buffer.getvalue()


def csv_value(value: Any) -> Any:
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("CSV value contains NaN or Infinity.")
        return value
    return value


def ensure_finite(value: Any) -> None:
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("Result contains NaN or Infinity.")
    if isinstance(value, dict):
        for item in value.values():
            ensure_finite(item)
    elif isinstance(value, list):
        for item in value:
            ensure_finite(item)
