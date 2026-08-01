# Apollo Operator Smoke Formal Summary

**PR:** PR-D verification/operator evidence consolidation
**Source:** `apollo_operator_smoke_evidence` (`source://apollo_operator_smoke_evidence/`)
**Capture window:** 2026-07-31 (Xvfb manual operator smoke)
**Authority:** Formal operator-smoke summary and one representative screenshot — does not amend product requirements or numeric release gates.

## Provenance note

Phase 1 recorded an older operator-evidence `final_report.txt` provenance (SHA-256 `c573e543fb55b9b9dbdf283d533f1dd07905a327b57a4642fdab211a9da56eb1`, 15965 bytes, verdict `PARTIAL_WITH_MAJOR_FINDINGS`) and directed Phase 2 to create a formal summary from preserved summary facts plus raw evidence — **without** copying that old report body into Git. This document is that formal summary.

## Capture inventory

| Kind | Count | Git policy |
| --- | ---: | --- |
| PNG screenshots | 60 | All but 1 representative excluded |
| XWD dump | 1 | Excluded |
| **Total source files** | **61** | See [manifest.csv](manifest.csv) |

Raw bodies: `local-archive/operator-evidence/apollo/`.

## Session outline (filename order)

1. Shell launch / mode selection (`01_launch` … `07_pro_*`)
2. Apollo entry / initialize (`08` … `14`)
3. Apollo main + sample load (`15` … `17`) — **representative PNG selected from this stage**
4. List edit / text input / IME paste (`18` … `26`)
5. Tables / numeric field behavior (`27` … `32`)
6. Viewer maximize / controls / visibility (`33` … `46`)
7. View transforms (rotate/pan/zoom/standard views) (`47` … `54`)
8. Panel restore / close (`55` … `59`)

## Representative PNG (Git-tracked)

| Item | Value |
| --- | --- |
| File | [evidence/17_sample_loaded.png](evidence/17_sample_loaded.png) |
| Source | `source://apollo_operator_smoke_evidence/17_sample_loaded.png` |
| SHA-256 | `fecece95cd4c10333e4d11e3e2e9213ded655760177868052ece72af6c0cfe24` |
| Size | 148257 bytes (< 50 MiB) |
| Rights | Internal operator smoke screenshot of product UI; no third-party standards text; no secrets/API keys; no personal data observed |
| Long-term value | Documents successful load of the sample **200m-class 5-span continuous bridge** into Apollo Phase 1 guided mode under the non-numeric input banner — the clearest single-frame proof that the operator smoke path reached a usable editing state |

Selection rationale: among launch, empty main, and loaded-sample frames, `17_sample_loaded.png` uniquely shows post-load guided checklist and sample identity, which remains useful for future UI regression comparison without committing the full 60-PNG sequence.

## Explicit exclusions (Git)

| Category | Count | Retention |
| --- | ---: | --- |
| Other PNG | 59 | `local-archive/operator-evidence/apollo/` |
| XWD | 1 (`04_back_to_mode_selection.xwd`) | same |

## Path normalization

Filenames are portable. Narrative references use `source://apollo_operator_smoke_evidence/`. No machine-local absolute paths are embedded in this summary.

## Verdict

```text
OPERATOR_SMOKE_FORMAL_SUMMARY_VERDICT: COMPLETE
REPRESENTATIVE_PNG_COUNT: 1
RAW_PNG_XWD: LOCAL_ARCHIVE_ONLY
NUMERIC_RELEASE_READINESS: BLOCKED (unchanged)
HISTORICAL_NOTE: prior PARTIAL_WITH_MAJOR_FINDINGS provenance retained as citation only (old report body not copied)
```

## Related

- [Manifest](manifest.csv)
- [Representative evidence PNG](evidence/17_sample_loaded.png)
- [Apollo verification index](../index/README.md)
- [Local archive policy](../../migration/local_archive_policy.md)
