# EA-05 Dry Run Usage

## Layout

- `artifacts/` — generated case records, DR-20 reports, and `dry_run_summary.json`
- Root control records — `dry_run_execution_register.csv`, `dry_run_artifact_manifest.csv`, `dry_run_failures.csv`, and narrative docs

## Execute

```bash
cd scripts/apollo/evidence && python3 run_evidence_dry_run.py
```

Re-run determinism: execute the runner twice; `dry_run_artifact_manifest.csv` byte SHA-256 must be identical across runs.

## Verify committed artifacts

```bash
cd scripts/apollo/evidence
python3 verify_dry_run_artifacts.py \
  --dry-run-root ../../../docs/apollo/evidence-collection/05_dry_run \
  --expected-manifest-sha256 9b08de3126f8c62eeb49f824a13bb1857750f50f9c32243b5850e3b864df5913
```

The manifest SHA-256 is stored out-of-band in this usage doc. `artifacts/dry_run_summary.json` must not self-reference the manifest hash.

## Tests

```bash
cd scripts/apollo/evidence && python3 -m unittest tests.test_evidence_dry_run -v
```
