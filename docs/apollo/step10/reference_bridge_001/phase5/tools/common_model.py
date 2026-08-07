#!/usr/bin/env python3
"""
Common Bridge Data Model Python representation (P5-3).

Provides:
  - envelope construction (schema identity, version, checksum, provenance)
  - canonical serialization (deterministic key order / separators / number rule)
  - deserialization
  - semantic round-trip parity comparison
  - semantic fingerprint generation

Canonical serialization rules (see serialization_contract.md):
  - JSON UTF-8, compact separators, sorted keys recursively
  - no NaN / Infinity (validators reject)
  - semantic parity is the authority (JSON byte parity is not required)
"""

import hashlib
import json
import re
import uuid
from typing import Any

SCHEMA_ID = "spacer.contracts.common-bridge-data-model"
SCHEMA_VERSION = "1.0.0"
DOCUMENT_KIND = "common-bridge-data-model"
NAMESPACE = uuid.UUID("6ba7b811-9dad-11d1-80b4-00c04fd430c8")  # uuid.NAMESPACE_URL


def deterministic_document_id(bridge_id: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"spacer:cbdm:{bridge_id}"))


def _canonical(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _canonical(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_canonical(v) for v in obj]
    if isinstance(obj, bool):
        return obj
    if isinstance(obj, (int, float)):
        return float(obj)
    return obj


def canonical_dumps(doc: dict) -> str:
    """Deterministic canonical JSON text for a Common Bridge Data Model document."""
    return json.dumps(
        _canonical(doc),
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    )


def serialize(doc: dict) -> str:
    return canonical_dumps(doc)


def deserialize(text: str) -> dict:
    return json.loads(text)


def round_trip(doc: dict) -> dict:
    return deserialize(serialize(doc))


def semantic_parity(a: dict, b: dict) -> bool:
    """True when two documents are semantically identical under canonicalization."""
    return _canonical(a) == _canonical(b)


def semantic_fingerprint(doc: dict) -> str:
    """sha256 hex digest of the canonical serialization (excluding checksum)."""
    body = dict(doc)
    body.pop("contentChecksum", None)
    return hashlib.sha256(canonical_dumps(body).encode("utf-8")).hexdigest()


def compute_content_checksum(doc: dict) -> str:
    body = dict(doc)
    body.pop("contentChecksum", None)
    return hashlib.sha256(canonical_dumps(body).encode("utf-8")).hexdigest()


def build_envelope(bridge_id: str, display_name: str) -> dict:
    return {
        "schemaId": SCHEMA_ID,
        "schemaVersion": SCHEMA_VERSION,
        "documentId": deterministic_document_id(bridge_id),
        "documentKind": DOCUMENT_KIND,
        "revisionId": 1,
        "contentChecksum": {"algorithm": "sha256", "hexDigest": "0" * 64},
        "provenance": {
            "createdAt": "2026-08-08T00:00:00Z",
            "createdBy": {"actorId": "apollo-step10-p5", "actorType": "tool",
                          "displayName": "Apollo STEP10 P5 adapter"},
            "producer": {"toolId": "apollo-step10-p5", "toolVersion": "1.0.0",
                         "algorithmVersion": "1.0.0"},
        },
    }


def finalize_document(doc: dict) -> dict:
    """Fill the content checksum after the full document is built."""
    doc["contentChecksum"] = {
        "algorithm": "sha256",
        "hexDigest": compute_content_checksum(doc),
    }
    return doc
