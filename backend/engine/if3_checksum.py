from __future__ import annotations

import hashlib
import json
import math
from typing import Any


CONTENT_CHECKSUM_ALGORITHM = "sha256"


class If3ChecksumError(ValueError):
    pass


def canonical_json(value: Any) -> str:
    _assert_json_compatible(value)
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_content_checksum(value: Any) -> dict[str, str]:
    encoded = canonical_json(value).encode("utf-8")
    return {
        "algorithm": CONTENT_CHECKSUM_ALGORITHM,
        "hexDigest": hashlib.sha256(encoded).hexdigest(),
    }


def validate_content_checksum(value: Any) -> bool:
    if not isinstance(value, dict):
        return False
    return (
        value.get("algorithm") == CONTENT_CHECKSUM_ALGORITHM
        and isinstance(value.get("hexDigest"), str)
        and len(value["hexDigest"]) == 64
        and all(char in "0123456789abcdef" for char in value["hexDigest"])
    )


def _assert_json_compatible(value: Any, path: str = "") -> None:
    if value is None or isinstance(value, (str, bool, int)):
        return
    if isinstance(value, float):
        if not math.isfinite(value):
            raise If3ChecksumError(f"Non-finite value at {path or '/'}")
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            _assert_json_compatible(item, f"{path}/{index}")
        return
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str):
                raise If3ChecksumError(f"Non-string object key at {path or '/'}")
            _assert_json_compatible(item, f"{path}/{key}")
        return
    raise If3ChecksumError(f"Unsupported JSON value at {path or '/'}")
