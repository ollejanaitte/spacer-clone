# Approved Regression Golden Specification — DS-07

An `APPROVED_REGRESSION_GOLDEN` preserves an already approved behavior; it does not create truth.
Admission requires a parent analytical/reference Golden or an independently specified serialization,
export, or negative contract.

Existing repository regression fixtures are `REFERENCE_ONLY` until their provenance and parent
oracle are recorded. Apollo output generated once and copied into a fixture is circular and cannot
be approved. The same author/run cannot be both the sole proposer evidence and approval evidence.

Each update requires:

1. old and new checksums;
2. parent Golden and approval IDs;
3. implementation change identifier;
4. semantic diff and reason;
5. independent review;
6. explicit decision to approve, reject, or keep the prior baseline.

Serialization Goldens compare canonical semantic content and explicitly governed metadata. Export
Goldens must pass live-source authority gates and distinguish internal precision from displayed
rounding. Negative Goldens require the exact status/error code and absence of authoritative output.
