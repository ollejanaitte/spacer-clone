# 17 — Schema Migration Versioning

Bump `apolloBridgeStructureInput` schema beyond `1.1.0-development` for:
- pavement block
- roadMarkings block
- optional L-angle params on bracing

Migration rules:
- Missing pavement/markings → NOT_PROVIDED / empty (invent nothing)
- Legacy projects keep behavior; STALE if new fields affect generation checksum
