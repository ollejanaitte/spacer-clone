# 12 — Open Questions and Risks

All formerly blocking items have **design-draft decisions** for implementation start.
Formal human adoption of standards remains **NOT_GRANTED** (not an implementation blocker for coding against these drafts).

| ID | Question | Options | Recommendation (DEC) | Blocking for P0 GO? | Phase |
|----|----------|---------|----------------------|---------------------|-------|
| OQ-01 | Appurtenance cross-section | rect prism vs parametric | Rect prism v1 | No | 4-B |
| OQ-02 | Multi-segment discontinuities | single span-long vs multi | Multi optional after single | No | 4-B/C |
| OQ-03 | Haunch shape | RECT only vs RECT+TRAP | Both; RECT default | No | 4-B |
| OQ-04 | Haunch along span | constant vs variable | Constant only | No | 4-B |
| OQ-05 | Haunch vs deck datum | below deck soffit vs above flange | Below deck soffit, on TF top | No | 4-B |
| OQ-06 | Splice station input | list vs spacing | Explicit station list | No | 4-D |
| OQ-07 | Bolts | entity vs pattern | Pattern | No | 4-D |
| OQ-08 | Filler parent | under flange plate | Child of splice assembly | No | 4-D |
| OQ-09 | Splice SW in analysis | include/exclude | Exclude default | No | 4-C/D |
| OQ-10 | Alignment SoR | Road vs Apollo copy | Road/LINER | No | 4-E |
| OQ-11 | Station/handedness/crossfall sign | see §07 | Frozen in §07 | No | 4-E |
| OQ-12 | Grade in 3D girders | ignore vs apply | Apply constant grade if binding present; else local flat + WARNING | No | 4-E/F |
| OQ-13 | Workflow persistence | full persist vs derive | Derive + optional WF-15 ack | No | 4-A |
| OQ-14 | COMPLETE vs NOT_AUTHORIZED | single vs badges | status + badges | No | 4-A |
| OQ-15 | 3D label tech | CSS2D vs sprites | CSS2D preferred | No | 4-F |
| OQ-16 | Mobile UI | full vs accordion | Accordion workflow | No | 4-A |
| OQ-17 | Schema bump | 1.1.0-dev | Yes | No | 4-B |
| OQ-18 | Backward compat | read Step3 | Yes per §05 | No | 4-B |
| OQ-19 | Formal release blockers | list | Keep NOT_GRANTED | No | all |
| OQ-20 | Manual depth | extract only | LIMITED_TO_USER_PROVIDED_EXTRACT | No | P0 |

**BLOCKING_OPEN_QUESTIONS:** 0
