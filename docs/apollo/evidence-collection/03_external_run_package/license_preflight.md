# License Preflight

**Blockers:** AN-BLK-005 (license probes); AN-PRB-011, AN-PRB-021; AN-ERR-005, AN-ERR-006
**Status:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

## Objective

Document named entitlement state before any external probe execution without capturing license keys or modifying license files.

## Required operator inputs

Fill `license_preflight.json` (from package skeleton or template):

| Field | Requirement |
|---|---|
| `entitlement_name` | Named valid entitlement per vendor contract |
| `entitlement_state` | `valid`, `unavailable_test`, `expired_test`, or vendor-approved test state |
| `license_server_reachable` | `true` or `false` as observed |
| `seat_count_documented` | Documented seat count for concurrency probes (AN-PRB-012) |
| `license_artifact_sha256` | SHA-256 of permitted license log or diagnostic artifact (no key material) |

## Hard prohibitions

- `license_key_captured` must remain `false`.
- Never modify, copy, or redistribute license files from the vendor installation.
- Coordinate unavailable-license and expired-license probes (AN-PRB-011, AN-PRB-021) with license administrator only.

## Probe linkage

| Probe / error | License requirement |
|---|---|
| AN-PRB-011 / AN-ERR-005 | Vendor-approved unavailable or test state |
| AN-PRB-021 / AN-ERR-006 | Vendor test or safely expired entitlement |
| AN-PRB-012 / AN-ERR-012 | Named entitlement with documented seat count |

## Acceptance

License preflight is complete when entitlement name and state are recorded, `license_key_captured` is false, and `license_artifact_sha256` binds a permitted diagnostic artifact. Failure signatures from license probes must remain distinguishable from analysis success per DS-06 success acceptance rule.
