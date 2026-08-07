#!/usr/bin/env python3
"""Phase 2-II validation tool (P2II-J closeout).

Enforces the Phase 2-II candidate-layer contracts (see
`contracts/candidate_layer_contract.md` §8 and `candidate_schema.md`).

Checks implemented:
  C1  CSV parse + no extra-column fields under candidates/ traceability/
      registers/ contracts/
  C2  candidate_id uniqueness across all candidate CSVs
  C3  entity_id present in entity registry (id_and_entity_contract + layer
      entity registers) or empty
  C4  calculation/drawing locator format (calc_pdf_pNNN[-NNN] / DWG-SNNN[-VNN])
      or empty-with-note
  C5  source_record_ids in candidates resolve in source_record_catalog.csv
  C6  source->candidate trace: every source_record_id and candidate_id in
      traceability resolves
  C7  semantic_class values from candidate_enums.csv
  C8  adoption_status from the 7 Phase 2-II values (never APPROVED_GOLDEN_INPUT)
  C9  parity_status / confidence / verification_status from candidate_enums.csv
  C10 raw_value preserved for value-copy layers (input/geometry/load/analysis/
      adopted_design single-source value candidates)
  C11 normalized_value for NOR-002 = raw/1000 (numeric); non-numeric documented
  C12 conflict_id / human_confirmation_id reference registers
  C13 drawing sheet 141 candidates carry PARTIAL + HCR-001
  C14 artifact_manifest.csv paths exist + row counts + SHA-256
  C15 no PDF/image/CAD binaries under phase2_ii
  C16 no APPROVED_GOLDEN_INPUT in candidate CSVs
  C17 final_report.txt "Phase 2-II CURRENT" counts match actual candidate CSVs

A check that finds violations may still PASS if every violation is registered
in the appropriate register (documented exceptions) and the register entry
actually exists. This is the documented-exception mechanism: the validator
reports the data gap and the register documents it, so the overall verdict can
be PASS with documented exceptions. See DOCUMENTED_EXCEPTIONS below.

Exit code 0 = all checks pass, 1 = any check fails.

Authority: STEP 10 Reference Bridge 001 (RB-S10-001) - Phase 2-II closeout.
Python 3.10, standard library only.
"""

from __future__ import annotations

import csv
import glob
import hashlib
import os
import re
import sys

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
P2II = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAND_DIR = os.path.join(P2II, "candidates")
TRACE_DIR = os.path.join(P2II, "traceability")
REG_DIR = os.path.join(P2II, "registers")
CONTRACT_DIR = os.path.join(P2II, "contracts")
VALIDATION_DIR = os.path.join(P2II, "validation")

SRC_RECORD_CATALOG = os.path.join(CAND_DIR, "source", "source_record_catalog.csv")
SRC_VALUE_CATALOG = os.path.join(CAND_DIR, "source", "source_value_catalog.csv")
S2C_TRACE = os.path.join(TRACE_DIR, "source_to_candidate_traceability.csv")
ENUMS = os.path.join(CONTRACT_DIR, "candidate_enums.csv")
ENTITY_CONTRACT = os.path.join(CONTRACT_DIR, "id_and_entity_contract.md")
ISSUE_REG = os.path.join(REG_DIR, "issue_register.csv")
CONF_REG = os.path.join(REG_DIR, "source_conflict_register.csv")
HCR_REG = os.path.join(REG_DIR, "human_confirmation_register.csv")
MANIFEST = os.path.join(P2II, "artifact_manifest.csv")
FINAL_REPORT = os.path.join(P2II, "final_report.txt")

# ---------------------------------------------------------------------------
# Documented exceptions (check_no, violation_key, register_file, register_id)
# ---------------------------------------------------------------------------
DOCUMENTED_EXCEPTIONS = [
    (1, "contracts/candidate_enums.csv", "issue_register", "ISSUE-015"),
    (10, "AN-032", "issue_register", "ISSUE-014"),
    (11, "GEO-076", "issue_register", "ISSUE-016"),
]

CALC_LOCATOR_RE = re.compile(r"^calc_pdf_p\d+(-\d+)?$")
DRAWING_LOCATOR_RE = re.compile(r"^DWG-S\d{3}(-V\d{2})?$")

# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------


def read_rows(path):
    with open(path, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def candidate_files():
    files = []
    for path in glob.glob(os.path.join(CAND_DIR, "*", "*.csv")):
        with open(path, encoding="utf-8", newline="") as fh:
            try:
                header = next(csv.reader(fh))
            except StopIteration:
                header = []
        if "candidate_id" in header:
            files.append(path)
    return files


def load_enums():
    sem, ver, par, ado, conf = set(), set(), set(), set(), set()
    for r in read_rows(ENUMS):
        if len(r) < 2:
            continue
        t = r.get("enum_type", "")
        v = r.get("enum_value", "")
        if t == "semantic_class":
            sem.add(v)
        elif t == "verification_status":
            ver.add(v)
        elif t == "parity_status":
            par.add(v)
        elif t == "adoption_status":
            ado.add(v)
        elif t == "confidence":
            conf.add(v)
    return sem, ver, par, ado, conf


def register_ids(path):
    if not os.path.exists(path):
        return set()
    out = set()
    for r in read_rows(path):
        for k, v in r.items():
            if v and (k.endswith("_id") or k in ("item_id", "issue_id", "conflict_id")):
                out.add(v)
    return out


def documented_for(check_no, violations):
    """Return (documented_keys, all_registered, missing_regs).

    documented_keys: violation keys covered by DOCUMENTED_EXCEPTIONS.
    all_registered: True if every violation is covered AND the register
    entries referenced by those exceptions exist.
    """
    covered = []
    for key in violations:
        for (cn, vkey, regfile, regid) in DOCUMENTED_EXCEPTIONS:
            if cn == check_no and vkey == key:
                covered.append(key)
    uncovered = [k for k in violations if k not in covered]
    if uncovered:
        return covered, False, []
    missing = []
    for (cn, vkey, regfile, regid) in DOCUMENTED_EXCEPTIONS:
        if cn == check_no and vkey in covered:
            ids = register_ids(os.path.join(REG_DIR, regfile + ".csv"))
            if regid not in ids:
                missing.append((regfile, regid))
    return covered, not missing, missing


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------


def check_csv_parse():
    files = []
    for base in (CAND_DIR, TRACE_DIR, REG_DIR, CONTRACT_DIR):
        files.extend(glob.glob(os.path.join(base, "*.csv")))
        if base == CAND_DIR:
            files.extend(glob.glob(os.path.join(base, "*", "*.csv")))
    files = sorted(set(files))
    violations = []
    for path in files:
        rel = os.path.relpath(path, P2II)
        try:
            with open(path, encoding="utf-8", newline="") as fh:
                for row in csv.DictReader(fh):
                    for k, v in row.items():
                        if k is None or v is None:
                            violations.append(rel)
                            break
                    else:
                        continue
                    break
        except Exception as exc:  # noqa: BLE001
            violations.append(f"{rel} (parse error: {exc})")
    return violations


def check_candidate_id_unique():
    seen = {}
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            cid = r.get("candidate_id", "")
            if cid in seen:
                violations.append(cid)
            else:
                seen[cid] = path
    return violations


def entity_registry():
    reg = set()
    for path in (
        os.path.join(CAND_DIR, "geometry", "geometry_entity_register.csv"),
        os.path.join(CAND_DIR, "structural_model", "model_entity_register.csv"),
    ):
        for r in read_rows(path):
            if r.get("entity_id"):
                reg.add(r["entity_id"])
    with open(ENTITY_CONTRACT, encoding="utf-8") as fh:
        for m in re.finditer(r"\b(ENT-[A-Z0-9-]+)\b", fh.read()):
            reg.add(m.group(1))
    return reg


def check_entity_id():
    reg = entity_registry()
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            e = (r.get("entity_id") or "").strip()
            if e and e not in reg:
                violations.append(r.get("candidate_id", ""))
    return violations


def check_locators():
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            cid = r.get("candidate_id", "")
            cl = (r.get("calculation_locator") or "").strip()
            dl = (r.get("drawing_locator") or "").strip()
            if cl and not CALC_LOCATOR_RE.match(cl):
                violations.append(f"{cid}:calc:{cl}")
            if dl and not DRAWING_LOCATOR_RE.match(dl):
                violations.append(f"{cid}:drawing:{dl}")
    return violations


def source_catalog_ids():
    ids = set()
    for r in read_rows(SRC_RECORD_CATALOG):
        ids.add(r["source_record_id"])
    return ids


def check_source_record_refs():
    catalog = source_catalog_ids()
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            for part in (r.get("source_record_ids") or "").split(","):
                part = part.strip()
                if part and part not in catalog:
                    violations.append(f"{r['candidate_id']}:{part}")
    return violations


def check_trace_resolution():
    catalog = source_catalog_ids()
    cand_ids = set()
    for path in candidate_files():
        for r in read_rows(path):
            cand_ids.add(r["candidate_id"])
    violations = []
    for r in read_rows(S2C_TRACE):
        sid = r["source_record_id"]
        cid = r["candidate_id"]
        if sid not in catalog:
            violations.append(f"source:{sid}")
        if cid not in cand_ids:
            violations.append(f"candidate:{cid}")
    return violations


def check_semantic_class():
    sem, _, _, _, _ = load_enums()
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            v = r.get("semantic_class") or ""
            if v and v not in sem:
                violations.append(f"{r['candidate_id']}:{v}")
    return violations


def check_adoption_status():
    _, _, _, ado, _ = load_enums()
    allowed = {a for a in ado if a != "APPROVED_GOLDEN_INPUT"}
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            v = r.get("adoption_status") or ""
            if v and v not in allowed:
                violations.append(f"{r['candidate_id']}:{v}")
    return violations


def check_parity_confidence_verification():
    _, ver, par, _, conf = load_enums()
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            cid = r["candidate_id"]
            for col, allowed in (("parity_status", par),
                                 ("confidence", conf),
                                 ("verification_status", ver)):
                v = (r.get(col) or "").strip()
                if v and v not in allowed:
                    violations.append(f"{cid}:{col}:{v}")
    return violations


def check_raw_value_preserved():
    """Value-copy layers only: input/geometry/load/analysis/adopted_design.

    A candidate qualifies when it references exactly one source record and
    that record appears in source_value_catalog.csv (a value-bearing record).
    Design/drawing/report layers intentionally carry verdicts, enriched
    dimension text or labels instead of a verbatim value, so they are not
    value-copy candidates (see validation summary).
    """
    value_rows = {}
    for r in read_rows(SRC_VALUE_CATALOG):
        value_rows.setdefault(r["source_record_id"], []).append(r)

    value_layers = ("input", "geometry", "load", "analysis", "adopted_design")
    violations = []
    for path in candidate_files():
        layer = os.path.basename(os.path.dirname(path))
        if layer not in value_layers:
            continue
        for r in read_rows(path):
            sids = [s.strip() for s in (r.get("source_record_ids") or "").split(",") if s.strip()]
            vsids = [s for s in sids if s in value_rows]
            if len(sids) != 1 or len(vsids) != 1:
                continue
            cand_raw = (r.get("raw_value") or "").strip()
            src_raw = (value_rows[vsids[0]][0].get("raw_value") or "").strip()
            if cand_raw != src_raw:
                violations.append(r["candidate_id"])
    return violations


def check_normalization():
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            if r.get("normalization_rule_id") != "NOR-002":
                continue
            raw = (r.get("raw_value") or "").strip()
            norm = (r.get("normalized_value") or "").strip()
            cid = r["candidate_id"]
            try:
                rawf = float(raw)
            except ValueError:
                # range/compound values cannot be divided as a single number
                violations.append(cid)
                continue
            if not norm:
                violations.append(cid)
                continue
            try:
                normf = float(norm)
            except ValueError:
                violations.append(cid)
                continue
            if abs(rawf / 1000.0 - normf) > 1e-9:
                violations.append(cid)
    return violations


def check_register_references():
    conf_ids = register_ids(CONF_REG)
    hcr_ids = register_ids(HCR_REG)
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            cid = r["candidate_id"]
            cf = (r.get("conflict_id") or "").strip()
            if cf and cf not in conf_ids:
                violations.append(f"{cid}:{cf}")
            hcr = (r.get("human_confirmation_id") or "").strip()
            if hcr and hcr not in hcr_ids:
                violations.append(f"{cid}:{hcr}")
    return violations


def check_sheet141():
    violations = []
    for path in candidate_files():
        if os.path.basename(os.path.dirname(path)) != "drawing":
            continue
        for r in read_rows(path):
            loc = (r.get("drawing_locator") or "").strip()
            if not loc.startswith("DWG-S141"):
                continue
            cid = r["candidate_id"]
            if r.get("verification_status") != "PARTIAL" or r.get("human_confirmation_id") != "HCR-001":
                violations.append(cid)
    return violations


def check_manifest():
    if not os.path.exists(MANIFEST):
        return ["artifact_manifest.csv missing"]
    violations = []
    try:
        rows = read_rows(MANIFEST)
    except Exception as exc:  # noqa: BLE001
        return [f"artifact_manifest.csv unreadable: {exc}"]
    for r in rows:
        rel = r.get("artifact_path", "")
        full = os.path.join(P2II, rel)
        if not os.path.exists(full):
            violations.append(f"{rel}:missing")
            continue
        if rel.endswith(".csv"):
            if rel == "artifact_manifest.csv":
                rc = ""
            else:
                try:
                    rc = str(sum(1 for _ in open(full, encoding="utf-8", newline="")) - 1)
                except Exception as exc:  # noqa: BLE001
                    violations.append(f"{rel}:rowcount-error:{exc}")
                    continue
            recorded_rc = (r.get("row_count") or "").strip()
            if str(recorded_rc) != str(rc):
                violations.append(f"{rel}:rowcount:{recorded_rc}!={rc}")
        recorded_sha = (r.get("sha256") or "").strip()
        if rel == "artifact_manifest.csv":
            actual_sha = canonical_self_sha(full)
        else:
            actual_sha = hashlib.sha256(open(full, "rb").read()).hexdigest()
        if recorded_sha != actual_sha:
            violations.append(f"{rel}:sha-mismatch")
    return violations


def canonical_self_sha(path):
    """Mirror of tools/build_phase2_ii_manifest.py: digest of the manifest with
    its own sha256 field blanked."""
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


def check_no_binaries():
    extensions = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".glb", ".dwg", ".dxf"}
    violations = []
    for dirpath, dirnames, filenames in os.walk(P2II):
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() in extensions:
                violations.append(os.path.relpath(os.path.join(dirpath, fn), P2II))
    return violations


def check_no_golden():
    violations = []
    for path in candidate_files():
        for r in read_rows(path):
            if r.get("adoption_status") == "APPROVED_GOLDEN_INPUT":
                violations.append(r["candidate_id"])
    return violations


def check_final_report_counts():
    if not os.path.exists(FINAL_REPORT):
        return ["final_report.txt missing"]
    counts = {}
    in_current = False
    with open(FINAL_REPORT, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line.startswith("== PHASE 2-II CURRENT =="):
                in_current = True
                continue
            if not in_current:
                continue
            if line.startswith("=="):
                break
            if "," not in line:
                continue
            key, _, val = line.partition(",")
            key = key.strip()
            val = val.strip()
            if key.startswith("candidates/") and val.isdigit():
                counts[key] = int(val)
    if not counts:
        return ["final_report.txt: no candidate counts under PHASE 2-II CURRENT"]
    violations = []
    for key, reported in sorted(counts.items()):
        full = os.path.join(P2II, key)
        if not os.path.exists(full):
            violations.append(f"{key}:missing")
            continue
        try:
            actual = sum(1 for _ in open(full, encoding="utf-8", newline="")) - 1
        except Exception as exc:  # noqa: BLE001
            violations.append(f"{key}:read-error:{exc}")
            continue
        if actual != reported:
            violations.append(f"{key}:reported={reported} actual={actual}")
    return violations


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

CHECKS = [
    ("Check 1  - CSV parse (no extra-column fields)", check_csv_parse),
    ("Check 2  - candidate_id unique across candidate CSVs", check_candidate_id_unique),
    ("Check 3  - entity_id in registry or empty", check_entity_id),
    ("Check 4  - calculation/drawing locator format", check_locators),
    ("Check 5  - candidate source_record_ids resolve in catalog", check_source_record_refs),
    ("Check 6  - trace source/candidate ids resolve", check_trace_resolution),
    ("Check 7  - semantic_class from enums", check_semantic_class),
    ("Check 8  - adoption_status from 7 allowed (no GOLDEN)", check_adoption_status),
    ("Check 9  - parity/confidence/verification from enums", check_parity_confidence_verification),
    ("Check 10 - raw_value preserved (value-copy layers)", check_raw_value_preserved),
    ("Check 11 - NOR-002 normalized = raw/1000", check_normalization),
    ("Check 12 - conflict_id/human_confirmation_id reference registers", check_register_references),
    ("Check 13 - drawing sheet 141 carries PARTIAL + HCR-001", check_sheet141),
    ("Check 14 - artifact_manifest paths/rows/SHA-256", check_manifest),
    ("Check 15 - no PDF/image/CAD binaries under phase2_ii", check_no_binaries),
    ("Check 16 - no APPROVED_GOLDEN_INPUT", check_no_golden),
    ("Check 17 - final_report Phase 2-II CURRENT counts parity", check_final_report_counts),
]


def main() -> int:
    all_pass = True
    print(f"Phase 2-II Validation Tool (P2II-J)")
    print(f"Phase 2-II directory: {P2II}")
    print("=" * 68)

    for idx, (name, func) in enumerate(CHECKS, start=1):
        print(f"\n{name}")
        print("-" * len(name))
        try:
            violations = func()
        except Exception as exc:  # noqa: BLE001
            print(f"  [ERROR] exception: {exc}")
            all_pass = False
            continue
        if not violations:
            print("  [PASS]")
            continue
        covered, registered, missing_regs = documented_for(idx, violations)
        if registered:
            print(f"  [PASS] {len(violations)} documented exception(s) registered:")
            for v in sorted(violations):
                print(f"      - {v}")
            for (cn, vkey, regfile, regid) in DOCUMENTED_EXCEPTIONS:
                if cn == idx and vkey in covered:
                    print(f"      (registered: {regid} in {regfile}.csv)")
            continue
        if missing_regs:
            print(f"  [FAIL] {len(violations)} violation(s); register entry missing:")
            for regfile, regid in missing_regs:
                print(f"      missing register entry: {regid} in {regfile}.csv")
        else:
            print(f"  [FAIL] {len(violations)} unregistered violation(s):")
        for v in sorted(violations)[:12]:
            print(f"      - {v}")
        if len(violations) > 12:
            print(f"      ... and {len(violations) - 12} more")
        all_pass = False

    print(f"\n{'=' * 68}")
    if all_pass:
        print("OVERALL: PASS")
        return 0
    print("OVERALL: FAIL - see [FAIL] messages above")
    return 1


if __name__ == "__main__":
    sys.exit(main())
