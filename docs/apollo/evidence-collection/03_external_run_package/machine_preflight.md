# Machine Preflight

**Blocker:** AN-BLK-001 prerequisite; all probe safe-acquisition procedures
**Status:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

## Supervisor preflight record (validation host)

Supervisor observations are documentation-only and are **not** accepted as capture host facts. The skeleton `machine_preflight.json` uses `REQUIRED_OPERATOR_INPUT` for all host fields.

| Item | Supervisor observation (docs only) |
|---|---|
| Host OS | Linux (validation host) |
| Architecture | x86_64 (validation host) |
| Locale | C.UTF-8 (validation host) |
| Analyzer executable in PATH | Not found |
| SPACER executable in PATH | Not found |
| STATICS executable in PATH | Not found |
| `/opt` product install | Not found |
| `/usr/local` product install | Not found |
| Repository product binary | Not found |

`external_software_discovered` remains `false` in the skeleton until an authorized operator performs capture on a licensed machine.

## Required operator inputs

On the authorized capture host, update `machine_preflight.json`:

| Field | Requirement |
|---|---|
| `host_os` | Observed operating system (nonempty string) |
| `host_architecture` | Observed machine architecture (nonempty string) |
| `host_locale` | Observed locale (e.g. `C.UTF-8`, `ja_JP.UTF-8`) |
| `timezone` | IANA or system timezone at capture time |
| `authorized_machine_id` | Must match `operator_record.authorized_machine_id` |
| `external_software_discovered` | Boolean `true` after verified executable/service discovery |
| `discovery_evidence_sha256` | SHA-256 of discovery evidence artifact |
| `discovery_search_paths` | Paths searched (default: PATH, /opt, /usr/local, repository root) |

## Environment capture

Use EA-01 `capture_environment.py` inside each isolated run workspace. Environment allowlist follows EA-01 `DEFAULT_ENV_ALLOWLIST`; secret-pattern keys are stored as `[REDACTED]`.

## Locale probe linkage

AN-PRB-014 / AN-ERR-014 require the same checksum-fixed minimal model under two vendor-supported locales. Record raw bytes, metadata, and per-locale output SHA-256 in separate isolated EA-01 bundles.

## Acceptance

Machine preflight documents OS, architecture, locale, and timezone before identity capture and probe execution. Operator must not claim discovery on the validation host where supervisor preflight found no external software.
