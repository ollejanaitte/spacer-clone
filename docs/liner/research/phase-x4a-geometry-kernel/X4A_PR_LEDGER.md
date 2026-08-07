# X4-A PR Ledger

Phase X4-A (LINER Geometry Kernel Audit / Canonicalization) のPR台帳。

| Step | Branch | Title | PR / Merge SHA | Status |
|------|--------|-------|----------------|--------|
| P00 | research/liner-x4a-p00-audit | docs(liner): freeze Phase X4-A Geometry Kernel scope | #513 | MERGED |
| P01 | research/liner-x4a-p01-types | feat(liner): establish canonical Geometry Kernel contracts | #514 | MERGED |
| P02 | research/liner-x4a-p02-line-arc | feat(liner): split Geometry Kernel line/arc module | #517 `4108100` | MERGED |
| P03 | research/liner-x4a-p03-clothoid | feat(liner): add Geometry Kernel clothoid module | #518 `aeae8cc` | MERGED |
| P04 | research/liner-x4a-p04-station-offset | feat(liner): add Geometry Kernel station/offset module | #519 `101d1db` | MERGED |
| P05 | research/liner-x4a-p05-adapters | refactor(liner): re-export Geometry Kernel adapter surface | #520 `54aef44` | MERGED |
| P06 | research/liner-x4a-p06-verification | test(liner): expand Geometry Kernel regression coverage | #521 `6604157` | MERGED |
| P07 | research/liner-x4a-p07-x4b-gate | docs/final X4-B readiness gate | this PR | OPEN |

Note: P01 was initially merged (#514) with the canonical contracts in a single
`__init__.py`. To keep P02-P05 as independently reviewable diffs, the adapter was
re-split by responsibility into `contracts.py`, `line_arc.py`, `clothoid.py`,
`station_offset.py` with `__init__.py` re-exporting the public surface.