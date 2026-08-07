#!/usr/bin/env python3
"""Phase 2-II artifact manifest builder (P2II-J).

Builds `artifact_manifest.csv` at the Phase 2-II root for every committed
artifact under `phase2_ii/` (csv / md / py / txt). For CSV artifacts the
data row count (excluding the header) is computed; SHA-256 is computed for
every artifact. The manifest itself is included with a blank row_count by
design (consistent with the Phase 2-I manifest convention).

Authority: STEP 10 Reference Bridge 001 (RB-S10-001) - Phase 2-II closeout.
Python 3.10, standard library only. Deterministic and idempotent.

Usage:
    python3 build_phase2_ii_manifest.py [--root <phase2_ii_dir>]
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import os
import sys

ARTIFACT_EXTS = {".csv", ".md", ".py", ".txt"}
PHASE = "phase2_ii"
RELATIVE_TO = "phase2_ii"

MANIFEST_HEADER = [
    "artifact_path",
    "artifact_type",
    "kind",
    "row_count",
    "sha256",
    "relative_to",
    "phase",
    "status",
    "notes",
]


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def row_count(path: str):
    if path.endswith(".csv"):
        with open(path, encoding="utf-8", newline="") as fh:
            return sum(1 for _ in fh) - 1
    return ""


def kind_for(path: str, rel: str) -> str:
    base = os.path.basename(path)
    if base == "artifact_manifest.csv":
        return "manifest"
    if "/candidates/" in rel:
        return "candidate"
    if "/registers/" in rel:
        return "register"
    if "/traceability/" in rel:
        return "traceability"
    if "/contracts/" in rel:
        return "contract"
    if "/validation/" in rel:
        return "validation"
    if "/unread_resolution/" in rel:
        return "unread_resolution"
    if "/tools/" in rel:
        return "tool"
    if base == "final_report.txt":
        return "final_report"
    if base == "completion_report.md":
        return "completion_report"
    if base == "08_phase3_handoff.md":
        return "handoff"
    if base == "README.md":
        return "readme"
    return "documentation"


def notes_for(rel: str) -> str:
    if rel == "artifact_manifest.csv":
        return "Self-manifest; row_count blank by design"
    if rel == "final_report.txt":
        return "Phase 2-II CURRENT block holds authoritative counts"
    if rel == "08_phase3_handoff.md":
        return "Phase 3 handoff document"
    if rel == "completion_report.md":
        return "Phase 2-II completion report"
    if rel.startswith("candidates/source/"):
        return "Source layer catalog"
    return ""


def collect(root: str):
    entries = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            if os.path.splitext(fn)[1].lower() not in ARTIFACT_EXTS:
                continue
            entries.append((full, rel))
    # deterministic order: directories then files, stable sort
    entries.sort(key=lambda e: (e[1].lower(), e[1]))
    return entries


def build_lines(entries, self_sha: str):
    lines = [",".join(MANIFEST_HEADER)]
    for full, rel in entries:
        if rel == "artifact_manifest.csv":
            rc = ""
            note = "Self-manifest; row_count blank by design"
        else:
            rc = row_count(full)
            note = notes_for(rel)
        row = [
            rel,
            "csv" if rel.endswith(".csv") else ("md" if rel.endswith(".md") else
                                                ("py" if rel.endswith(".py") else "txt")),
            kind_for(full, rel),
            str(rc) if rc != "" else "",
            self_sha if rel == "artifact_manifest.csv" else sha256(full),
            RELATIVE_TO,
            PHASE,
            "committed",
            note,
        ]
        lines.append(",".join(_csv_quote(v) for v in row))
    return lines


def canonical_self_sha(path: str) -> str:
    """SHA-256 of the manifest with its own sha256 field blanked.

    The manifest's self-row records the digest of the file content with the
    self-row's sha256 field emptied, so the recorded digest does not depend on
    itself. The validator recomputes the same canonical digest.
    """
    import io
    text = open(path, encoding="utf-8", newline="").read()
    out_lines = []
    for line in text.split("\n"):
        if not line.strip():
            continue
        row = next(csv.reader([line]))
        if row and row[0] == "artifact_manifest.csv":
            row[4] = ""
            buf = io.StringIO()
            csv.writer(buf, lineterminator="\n").writerow(row)
            out_lines.append(buf.getvalue().rstrip("\n"))
        else:
            out_lines.append(line)
    return hashlib.sha256("\n".join(out_lines).encode("utf-8")).hexdigest()


def write_manifest(entries, out_path: str) -> int:
    lines = build_lines(entries, "")
    with open(out_path, "w", encoding="utf-8", newline="") as fh:
        fh.write("\n".join(lines) + "\n")
    self_sha = canonical_self_sha(out_path)
    lines = build_lines(entries, self_sha)
    with open(out_path, "w", encoding="utf-8", newline="") as fh:
        fh.write("\n".join(lines) + "\n")
    return len(lines) - 1


def _csv_quote(value: str) -> str:
    if "," in value or '"' in value or "\n" in value:
        return '"' + value.replace('"', '""') + '"'
    return value


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", default=None, help="Phase 2-II directory")
    args = ap.parse_args()

    if args.root:
        root = os.path.abspath(args.root)
    else:
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(root, "artifact_manifest.csv")

    if not os.path.isdir(root):
        print(f"[ERROR] Phase 2-II directory not found: {root}", file=sys.stderr)
        return 1

    entries = collect(root)
    n = write_manifest(entries, out_path)
    print(f"artifact_manifest.csv written: {out_path}")
    print(f"entries: {len(entries)}")
    print(f"manifest data rows: {n}")
    print(f"manifest sha256: {sha256(out_path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
