# Serialization Contract — Common Bridge Data Model

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1

## 1. Serialization format

- Canonical serialized format: **JSON** (UTF-8).
- Data is self-describing: `schemaVersion`, `$schema`/schema identity, and a
  `documentKind` are present at the root.
- Serialized JSON MUST NOT contain NaN or Infinity. All numeric values are finite.

## 2. Round-trip requirements

`Common Model → JSON → Common Model` MUST preserve:

1. `bridgeId` and all entity IDs (stable, byte-for-byte)
2. engineering values (numeric value + canonical unit)
3. units (canonical unit; source unit preserved when present)
4. resolution states (CONFIRMED / HUMAN_CONFIRMATION_REQUIRED / CONFLICT /
   HOLD_INSUFFICIENT_SOURCE / NOT_APPLICABLE / NOT_AVAILABLE)
5. source references (`sourceRefs`, Golden IDs, source record IDs)
6. traceability links
7. report refs, drawing refs
8. carry-forward structures (conflict, HCR, HOLD)

## 3. Ordering contract

Canonical serialization uses **documented, deterministic ordering**:

- Object keys are sorted deterministically (documented key order or sorted keys).
- Entity arrays are ordered deterministically (stable entity ID order within each kind).
- No dependence on insertion order.

## 4. Canonicalization

- Canonical serializer produces comparable canonical JSON: deterministic key order,
  deterministic entity ordering, documented floating-point representation rule.
- Floating rule: numbers are serialized in a fixed, lossless textual form
  (e.g. repr with fixed formatting at a documented precision; no scientific-notation
  ambiguity, no trailing-zero churn that breaks semantic comparison).
- JSON text byte parity is NOT the goal; **semantic parity** is the authority.

## 5. Semantic parity comparison

Round-trip parity is checked by comparing the canonicalized deserialized model
against the canonicalized original model semantically:

- entity counts
- entity IDs
- engineering values
- units
- resolution states
- traceability refs
- report refs
- drawing refs

## 6. Additional-properties policy

- Root and layer containers: `additionalProperties` behavior is explicit in the schema.
- Unknown/optional metadata: policy is explicit; where unknown fields are preserved,
  they follow the existing unknown-field-store pattern.

## 7. Fingerprint

- A semantic fingerprint MAY be generated for the Reference fixture.
- The fingerprint generation method is documented; its behavior across schema
  version changes is recorded (fingerprint must be regenerated on semantic change,
  and the regeneration is recorded).
- Fingerprint stability is verified in round-trip tests (serialize→deserialize→fingerprint
  equals original fingerprint).

## 8. Golden references preserved

- Each Common record that originates from a Golden record keeps `goldenId`/
  `sourceRefs`, so Golden → Common traceability is never lost in serialization.
