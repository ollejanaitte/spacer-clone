#!/usr/bin/env python3
"""Rebuild the Phase 2-I artifact manifest, computing row_count and SHA-256
for every tracked CSV and documenting MD/documentation artifacts.

Evidence-based; standard library only. Documentation-mode tool.
"""
import csv
import hashlib
import os
import subprocess

P2I = "docs/apollo/step10/reference_bridge_001/phase2/phase2_i"
MANIFEST = os.path.join(P2I, "artifact_manifest.csv")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def row_count(path):
    if path.endswith(".csv"):
        with open(path, encoding="utf-8") as f:
            return sum(1 for _ in f) - 1
    return ""


def kind_for(path):
    b = os.path.basename(path)
    if b.endswith(".csv"):
        return "extraction" if "/calculation/" in path or "/drawings/" in path else (
            "coverage" if b.endswith("coverage.csv") else
            "status" if b.endswith("status.csv") else
            "register" if b.endswith("register.csv") else
            "index" if "/domain_indexes/" in path else
            "manifest" if b == "artifact_manifest.csv" else "extraction")
    return "documentation"


def domain_for(path):
    if "/calculation/" in path:
        return "calculation"
    if "/drawings/" in path:
        return "drawing"
    if "/domain_indexes/" in path:
        return "index"
    return "governance"


def notes_for(path):
    b = os.path.basename(path)
    if b.endswith("coverage.csv"):
        return "Coverage rows for every page/sheet with evidence-based extraction status"
    if b.endswith("status.csv"):
        return "Section/group extraction status derived from artifact evidence"
    return ""


def main():
    files = sorted(
        subprocess.run(
            ["git", "ls-files", P2I], capture_output=True, text=True
        ).stdout.split()
    )
    files = [f for f in files if f.endswith(".csv") or f.endswith(".md")]
    rows = []
    for path in files:
        short = path.replace("docs/apollo/step10/reference_bridge_001/", "")
        rc = row_count(path)
        rows.append({
            "artifact_path": short,
            "artifact_kind": kind_for(path),
            "file_format": "csv" if path.endswith(".csv") else "md",
            "row_count": rc if rc is not None else "",
            "sha256": sha256(path),
            "domain": domain_for(path),
            "phase": "phase2_i",
            "status": "CREATED",
            "notes": main_description(path),
        })
    with open(MANIFEST, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "artifact_path", "artifact_kind", "file_format", "row_count",
            "sha256", "domain", "phase", "status", "notes"])
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {MANIFEST}")


def main_description(path):
    b = os.path.basename(path)
    if b == "artifact_manifest.csv":
        return "Self-manifest; row_count blank by design"
    if b.endswith(".coverage") or "coverage" in b:
        return "Coverage with evidence-based extraction status"
    if "status" in b:
        return "Section/group extraction status"
    if "register" in b:
        return "Register of issues/conflicts/human confirmations"
    if b.endswith(".md"):
        return "Documentation"
    return "Extraction artifact"


if __name__ == "__main__":
    main()