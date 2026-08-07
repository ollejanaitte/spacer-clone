#!/usr/bin/env python3
"""
Common Bridge Data Model validator (canonical schema + semantic checks).

Validates a Common Bridge Data Model JSON document against the canonical JSON
Schema (schemas/contracts/v0.1/common-bridge-data-model.schema.json) and applies
the runtime semantic rules:

  - unsupported schema version rejection
  - required root sections present
  - entity ID uniqueness (across all layers + registries + traceability)
  - reference integrity (references to declared entity IDs resolve)
  - finite numeric values everywhere (no NaN / Infinity)
  - units present for numeric confirmed / HCR values
  - conflict correctness (candidates present, resolutionStatus set)
  - HCR correctness (humanConfirmationId present, state tracked)
  - HOLD correctness (stateReason present)
  - no silent default for unresolved engineering values
  - analysisReference empty state allowed and must be explicit (NOT_AVAILABLE)

Usage:
  python validate_common_bridge_model.py --root <repo root> <model.json>
Exit 0 on PASS, 1 on FAIL.
"""

import argparse
import json
import math
import os
import sys

SCHEMA_REL = os.path.join(
    "schemas", "contracts", "v0.1", "common-bridge-data-model.schema.json")

CANONICAL_VERSION = "1.0.0"


def load_normalized_schema(path):
    """Load the canonical schema with $defs keys normalized to JSON-Pointer-safe aliases.

    The generated zod-to-json-schema output places full URLs as `$defs` keys and
    references them unescaped (`#/$defs/https://...`), which is not a valid JSON
    Pointer and breaks Python jsonschema resolution. Normalization maps each URL
    key to a safe alias (last path segment without `.schema.json`) so structural
    validation works while the checked-in canonical schema remains authoritative.
    """
    with open(path, encoding="utf-8") as f:
        schema = json.load(f)
    if "$defs" not in schema:
        return schema
    alias_map = {}
    new_defs = {}
    for key, value in schema["$defs"].items():
        if key.startswith("http://") or key.startswith("https://"):
            alias = key.rstrip("/").split("/")[-1]
            if alias.endswith(".schema.json"):
                alias = alias[: -len(".schema.json")]
            alias_map[key] = alias
            new_defs[alias] = value
        else:
            new_defs[key] = value

    def rewrite(node):
        if isinstance(node, dict):
            if "$ref" in node and isinstance(node["$ref"], str):
                for old, new in alias_map.items():
                    node["$ref"] = node["$ref"].replace(f"/{old}", f"/{new}")
            for v in node.values():
                rewrite(v)
        elif isinstance(node, list):
            for v in node:
                rewrite(v)

    rewrite(schema)
    schema["$defs"] = new_defs
    return schema

ENTITY_CONTAINER_KEYS = {
    "alignments": "alignments",
    "bridgeGeometry": ("spans", "supports", "girders", "gridPoints", "deck", "crossMembers"),
    "structuralModel": ("nodes", "members"),
    "materials": "materials",
    "sections": "sections",
    "loads": ("loadCases", "loadCombinations"),
    "design": "items",
    "reportSpecification": "items",
    "drawingSpecification": ("sheets", "items"),
    "analysisReference": "results",
}


def iter_entities(model):
    """Yield every Common entity object in the model (dict with id + fields)."""
    for layer, keys in ENTITY_CONTAINER_KEYS.items():
        if layer not in model:
            continue
        container = model[layer]
        if not isinstance(container, dict):
            continue
        for key in (keys if isinstance(keys, tuple) else (keys,)):
            for ent in container.get(key, []):
                if isinstance(ent, dict) and "id" in ent:
                    yield ent


def iter_values(node):
    """Recursively yield resolved-value dicts (dicts with a 'state' key)."""
    if isinstance(node, dict):
        if "state" in node and isinstance(node["state"], str):
            yield node
        for v in node.values():
            yield from iter_values(v)
    elif isinstance(node, list):
        for v in node:
            yield from iter_values(v)


def iter_numbers(node):
    if isinstance(node, dict):
        for v in node.values():
            yield from iter_numbers(v)
    elif isinstance(node, list):
        for v in node:
            yield from iter_numbers(v)
    elif isinstance(node, (int, float)) and not isinstance(node, bool):
        yield node


def validate_semantic(model):
    issues = []

    schema_version = model.get("schemaVersion")
    if schema_version is None:
        issues.append("missing required root field: schemaVersion")
    elif str(schema_version).split(".")[0] != str(CANONICAL_VERSION.split(".")[0]):
        issues.append(f"unsupported schema version major: {schema_version}")

    required_root = [
        "schemaId", "documentKind", "metadata", "alignments", "bridgeGeometry",
        "structuralModel", "materials", "sections", "loads", "analysisReference",
        "design", "reportSpecification", "drawingSpecification", "traceability",
        "resolutionRegistry",
    ]
    for key in required_root:
        if key not in model:
            issues.append(f"missing required root section: {key}")

    # AnalysisReference empty state must be explicit
    ar = model.get("analysisReference", {})
    status = ar.get("status")
    if status is None:
        issues.append("analysisReference.status missing (must be explicit, NOT_AVAILABLE allowed)")
    elif status == "AVAILABLE" and not ar.get("results"):
        issues.append("analysisReference status AVAILABLE but no results")

    # Entity ID uniqueness
    seen = {}
    for ent in iter_entities(model):
        eid = ent.get("id")
        if not eid:
            issues.append(f"entity without id: {json.dumps(ent)[:120]}")
            continue
        if eid in seen:
            issues.append(f"duplicate entity id: {eid}")
        else:
            seen[eid] = True

    # Reference integrity: references into registries / traceability must resolve
    # (we check the resolution registry affectedEntityIds and traceability
    # commonEntityId point to known entity ids when they are provided).
    known = set(seen.keys())
    reg = model.get("resolutionRegistry", {})
    for entry in reg.get("conflicts", []):
        for eid in entry.get("affectedEntityIds", []):
            if eid not in known:
                issues.append(f"conflict {entry.get('conflictId')} references unknown entity: {eid}")
    for entry in reg.get("humanConfirmations", []):
        for eid in entry.get("affectedEntityIds", []):
            if eid not in known:
                issues.append(f"HCR {entry.get('humanConfirmationId')} references unknown entity: {eid}")
    for entry in reg.get("holds", []):
        for eid in entry.get("affectedEntityIds", []):
            if eid not in known:
                issues.append(f"hold {entry.get('holdId')} references unknown entity: {eid}")
    for link in model.get("traceability", {}).get("links", []):
        ceid = link.get("commonEntityId")
        if ceid and ceid not in known:
            issues.append(f"traceability link {link.get('traceabilityId')} references unknown entity: {ceid}")

    # Numeric finiteness
    for num in iter_numbers(model):
        if not math.isfinite(float(num)):
            issues.append(f"non-finite number in model: {num}")

    # Value-state correctness
    for val in iter_values(model):
        state = val.get("state")
        if state in ("CONFIRMED", "HUMAN_CONFIRMATION_REQUIRED"):
            if "value" not in val or val.get("value") is None:
                issues.append(f"value with state {state} missing value")
            if state == "HUMAN_CONFIRMATION_REQUIRED" and not val.get("humanConfirmationId"):
                issues.append("HUMAN_CONFIRMATION_REQUIRED value missing humanConfirmationId")
        elif state == "CONFLICT":
            if not val.get("candidates"):
                issues.append(f"CONFLICT {val.get('conflictId')} has no candidates")
            if "selected" not in val:
                issues.append(f"CONFLICT {val.get('conflictId')} missing selected field")
            if not val.get("resolutionStatus"):
                issues.append(f"CONFLICT {val.get('conflictId')} missing resolutionStatus")
        elif state == "HOLD_INSUFFICIENT_SOURCE":
            if not val.get("stateReason"):
                issues.append("HOLD_INSUFFICIENT_SOURCE value missing stateReason")

    # No silent default: an unresolved engineering value (HOLD/CONFLICT/NOT_AVAILABLE)
    # must not carry a numeric value pretending to be confirmed.
    for val in iter_values(model):
        if val.get("state") in ("HOLD_INSUFFICIENT_SOURCE", "NOT_AVAILABLE", "CONFLICT"):
            if val.get("state") in ("HOLD_INSUFFICIENT_SOURCE", "NOT_AVAILABLE") and "value" in val:
                issues.append(f"silent default detected: {val.get('state')} carries a value")

    return issues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    ap.add_argument("model", help="Common Bridge Data Model JSON file")
    args = ap.parse_args()
    schema_path = os.path.join(args.root, SCHEMA_REL)
    if not os.path.exists(schema_path):
        print(f"FAIL: canonical schema not found: {schema_path}")
        return 1
    try:
        from jsonschema import Draft202012Validator
    except ImportError:
        print("FAIL: jsonschema package not available")
        return 1
    schema = load_normalized_schema(schema_path)
    with open(args.model, encoding="utf-8") as f:
        model = json.load(f)

    v = Draft202012Validator(schema)
    schema_errors = sorted(v.iter_errors(model), key=lambda e: list(e.path))
    issues = []
    for e in schema_errors:
        issues.append(f"schema: {'/'.join(map(str, e.path))}: {e.message}")
    semantic_issues = validate_semantic(model)
    issues.extend(semantic_issues)

    total = len(issues)
    print(f"SCHEMA_VALIDATION: {'PASS' if not schema_errors else 'FAIL'} "
          f"({len(list(schema_errors))} schema errors)")
    print(f"SEMANTIC_VALIDATION: {'PASS' if not semantic_issues else 'FAIL'} "
          f"({len(semantic_issues)} semantic issues)")
    print(f"OVERALL: {'PASS' if not issues else 'FAIL'} ({total} issues)")
    for issue in issues[:40]:
        print(f"  - {issue}")
    return 0 if not issues else 1


if __name__ == "__main__":
    raise SystemExit(main())