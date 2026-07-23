# Phase 6 Manual Reference Matrix

**Date:** 2026-07-23
**Status:** DRAFT

## Manual Authority

Use existing extraction records first. Do not re-interpret manual behavior from memory during implementation.

| Manual/source | Section | P6 use | Extraction status |
| --- | --- | --- | --- |
| JIP-LINER manual | section 8.1 drawing list | multi-record drawing decisions | Phase5 extraction reference |
| JIP-LINER manual | section 8.2 basic data | paper, scale, text, frame, coordinate axis | Phase5 extraction reference |
| JIP-LINER manual | section 8.3 span composition | road/bridge drawing composition | Phase5 extraction reference |
| JIP-LINER manual | section 8.4 line drawing | line labels, styles, curve annotations | Phase5 extraction reference |
| JIP-LINER manual | section 8.5 section drawing | section labels, direction, extension | Phase5 extraction reference |
| JIP-LINER manual | section 8.6 skew angle | skew/intersection annotation | Phase5 extraction reference; implementation design needed |
| JIP-LINER manual | section 8.7 coordinate table | columns, precision, labels | Phase5 extraction reference |
| JIP-LINER manual | section 8.8 line dimension | line-to-line dimensions, leaders | Phase5 extraction reference; implementation design needed |
| JIP-LINER manual | section 8.9 section dimension | section-to-section dimensions, compression | Phase5 extraction reference; implementation design needed |
| SPACER operation manual | frame drawing/output sections | Frame PRINT/DRAFT/Viewer boundary | NOT_EXTRACTED in this docs pass |

## Citation Rule

Implementation docs must cite one of:

- an existing extraction document
- a committed fixture name
- a test oracle
- an explicit deferral/unsupported diagnostic

No implementation should claim product-specific parity for a manual behavior that is not extracted and mapped.

```text
PHASE6_MANUAL_REFERENCE_VERDICT: DRAFT_READY_FOR_REVIEW
```
