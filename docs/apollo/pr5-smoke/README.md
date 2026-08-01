# Apollo PR5 Browser Smoke Summary

**PR:** PR-D verification/operator evidence consolidation
**Source:** `apollo-pr5-smoke` (`source://apollo-pr5-smoke/`)
**Evidence date:** 2026-07-30 (verifiedAt in source summary)
**Authority:** Smoke summary and indexes only — does not amend STL export product behavior or numeric release gates.

## Scope

Selective Git integration of PR5 STL-export browser smoke documentation. Tracked artifacts:

| File | Role |
| --- | --- |
| This README | Narrative smoke summary |
| [json-summary.json](json-summary.json) | Derived JSON要約 (presets, downloads, exclusions) |
| [manifest.csv](manifest.csv) | Full source inventory with include/exclude |

Source `browser-smoke-summary.json` and `result.json` are not Git-tracked; fields are folded into this README and [json-summary.json](json-summary.json).

## Smoke result (from source summary)

| Field | Value |
| --- | --- |
| Route | `/pro/apollo` |
| Backend | `python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000` |
| Frontend | `npm run dev:apollo -- --host 127.0.0.1 --strictPort` |
| Presets | `full`, `girders`, `deck`, `visible` |
| Downloads | STL + `.apollo.json` confirmed for all presets |
| HTTP failures | none (per summary) |
| Console errors | none (per summary) |
| Console warnings | WebGL ReadPixels GPU stall warnings under headless Chromium |

## Explicit exclusions (Git)

| Category | Count | Examples | Retention |
| --- | ---: | --- | --- |
| STL binaries | 8 | `*-200m級-5径間連続橋.stl` | `local-archive/smoke-artifacts/apollo-pr5/` |
| Raw export JSON | 4 | `*.apollo.json` | same |
| Screenshot PNG | 1 | `apollo-stl-list-mode.png` | same |
| Console log | 1 | `console.log` | same |
| Raw smoke / result JSON | 2 | `browser-smoke-summary.json`, `result.json` | same (summarized into Git docs) |

## Path normalization

Narrative references use `source://apollo-pr5-smoke/`. No machine-local absolute paths are embedded in this package.

## Verdict

```text
PR5_SMOKE_SUMMARY_VERDICT: PASS_PER_SOURCE_SUMMARY
RAW_ARTIFACTS: LOCAL_ARCHIVE_ONLY
NUMERIC_RELEASE_READINESS: BLOCKED (unchanged)
```

## Related

- [JSON要約](json-summary.json)
- [Manifest](manifest.csv)
- [Apollo verification index](../index/README.md)
- [Local archive policy](../../migration/local_archive_policy.md)
