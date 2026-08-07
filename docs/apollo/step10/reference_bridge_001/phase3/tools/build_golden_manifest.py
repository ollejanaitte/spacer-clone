#!/usr/bin/env python3
"""
Build Golden Manifest for Reference Bridge 001 (RB-S10-001) Phase 3.

Generates golden_manifest.csv with path/type/sha256/row_count for all
Phase 3 artifacts.

Usage: python build_golden_manifest.py [--phase3-dir PATH] [--output PATH]
"""

import argparse
import csv
import hashlib
import os
import sys

PHASE3_BASE = "docs/apollo/step10/reference_bridge_001/phase3"

EXCLUDED_DIRS = {".git", "__pycache__", "node_modules"}
EXCLUDED_EXT = {".pyc"}


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def build_manifest(phase3_dir, output_path):
    manifest = []
    for root, dirs, files in os.walk(phase3_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        for fname in sorted(files):
            ext = os.path.splitext(fname)[1].lower()
            if ext in EXCLUDED_EXT:
                continue
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, phase3_dir)
            sha = sha256_file(fpath)
            row_count = 0
            if ext == ".csv":
                with open(fpath, newline="", encoding="utf-8") as f:
                    row_count = sum(1 for _ in f) - 1  # exclude header
            elif ext == ".json":
                row_count = 0
            elif ext == ".py":
                with open(fpath, encoding="utf-8") as f:
                    row_count = sum(1 for _ in f)
            ftype = "csv" if ext == ".csv" else ("json" if ext == ".json" else ("python" if ext == ".py" else "markdown" if ext == ".md" else "other"))
            manifest.append({
                "path": rel,
                "type": ftype,
                "sha256": sha,
                "row_count": str(row_count),
            })

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "type", "sha256", "row_count"])
        writer.writeheader()
        for row in manifest:
            writer.writerow(row)

    print(f"Manifest written: {len(manifest)} artifacts")
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Build Phase 3 Golden Manifest")
    parser.add_argument("--phase3-dir", default=os.path.join(os.getcwd(), PHASE3_BASE))
    parser.add_argument("--output", default=os.path.join(os.getcwd(), PHASE3_BASE, "validation", "golden_manifest.csv"))
    args = parser.parse_args()
    build_manifest(args.phase3_dir, args.output)


if __name__ == "__main__":
    main()