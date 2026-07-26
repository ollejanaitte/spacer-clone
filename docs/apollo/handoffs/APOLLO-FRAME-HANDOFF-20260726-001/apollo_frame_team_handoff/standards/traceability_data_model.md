# Stage 5 Traceability Data Model

```text
feature_catalog (Stage4)
   └─ stage5a_traceability_scope / external_research_handoff
         └─ package stage5b research_results (101)
               └─ stage5c requirements (101) ─┬─ validation_rules
                                              ├─ traceability_matrix → evidence images
                                              └─ implementation_backlog (READY gap types)
```

IDs: feature_id, handoff_id, research_result_id, requirement_id, evidence_id, backlog_id, crosswalk_id.

Evidence paths in CSV may use research/... prefix; package files live under stage5b/evidence/<filename>.
