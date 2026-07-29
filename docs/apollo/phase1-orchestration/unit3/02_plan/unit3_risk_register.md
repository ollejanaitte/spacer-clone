# Apollo Phase 1-NN Unit 3 Risk Register

| Risk ID | Area | Description | Trigger | Impact | Mitigation | Residual Status |
| --- | --- | --- | --- | --- | --- | --- |
| U3-RISK-001 | CRUD / guard | Active project and workspace snapshot identity diverge during rename, duplicate, or delete | Snapshot order changes while active project remains open | Wrong draft opened or deleted | Freeze explicit active-project contract before implementation | PLANNED |
| U3-RISK-002 | Dirty guard | Boolean-only dirty tracking cannot prove undo-to-saved-state correctness | Undo or import after edits | False dirty clear or silent data loss | Use saved-baseline fingerprint as source of truth | PLANNED |
| U3-RISK-003 | History | Snapshot history grows too broad or crosses project/import boundaries | Import, workspace switch, or new draft with non-reset history | Restoring state from the wrong project | Reset history at documented boundaries and cap retained entries | PLANNED |
| U3-RISK-004 | Selection | Mixed entity selection rules stay ambiguous | Bulk edit or copy invoked on heterogeneous selection | Invalid actions or partial edits | Freeze eligibility tables and block unsupported combinations | PLANNED |
| U3-RISK-005 | Clipboard | ID or reference remap is incomplete | Paste of related entities | Silent referential corruption | Require deterministic remap tests and atomic paste rejection | PLANNED |
| U3-RISK-006 | Search / navigator | Filter-hidden selected rows or issues break navigator targeting | Search/filter active during validation navigation | User lands on wrong row or no row | Define hidden-selection and hidden-issue rules before coding | PLANNED |
| U3-RISK-007 | Electron close | Browser-only unload guard is weaker than Electron close/quit flows | User closes the window or quits app | Draft loss without prompt | Freeze dedicated Electron close/quit guard path | PLANNED |
| U3-RISK-008 | Numeric boundary | Productivity features accidentally open blocked publication/export paths | Import/export or bulk actions touch shared app surfaces | Numeric contamination or false authority claim | Preserve existing fail-closed guards and explicit out-of-scope list | PLANNED |
