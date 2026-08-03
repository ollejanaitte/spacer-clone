# Workflow Status Mapping

WF-03/WF-05: capability IMPLEMENTED, gatingGuard ACTIVE.

| Condition | Status |
|-----------|--------|
| Prereq incomplete | NOT_STARTED |
| Any NOT_PROVIDED / incomplete PROVIDED | INCOMPLETE (or AVAILABLE if all empty) |
| Blocking validation | BLOCKED |
| Valid + not generated | READY |
| Valid + generated current | COMPLETE + NOT_AUTHORIZED |
| Input changed after generate | STALE |
| Parse corruption | ERROR |

Downstream: WF_STEP_4_C_INTEGRATION_PENDING / WF_PARTIAL_SCOPE_WARNING when PROVIDED.
WF-06 remains PLANNED.
