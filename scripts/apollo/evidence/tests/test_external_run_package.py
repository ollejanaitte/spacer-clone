"""Targeted unittest coverage for EA-03 external run package (synthetic packages only)."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

_EVIDENCE_DIR = Path(__file__).resolve().parent.parent
if str(_EVIDENCE_DIR) not in sys.path:
    sys.path.insert(0, str(_EVIDENCE_DIR))

from evidence_core import (  # noqa: E402
    ExclusiveWriteError,
    capture_environment_record,
    capture_process_result,
    collect_file_manifest,
    create_run_workspace,
    detect_stale_outputs,
    finalize_workspace_bundle,
    sha256_file,
    write_json,
    write_process_capture,
)
from external_run_package_core import (  # noqa: E402
    BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    CANONICAL_PROBE_SLOT_IDS,
    DOCS_DIR,
    EXECUTION_VERDICT_BLOCKED,
    EXTERNAL_IDENTITY_BINDING_NAME,
    IDENTITY_BINDINGS_MANIFEST_NAME,
    PACKAGE_VERDICT_COMPLETE,
    REFERENCE_ONLY_MANUAL_SHA,
    REQUIRED_OPERATOR_INPUT,
    ExternalRunPackageError,
    ExternalRunPackageValidationError,
    import_external_run_bundle,
    prepare_external_run_bundle,
    summarize_external_run_bundle,
    validate_docs_package,
    verify_external_run_bundle,
    write_package_catalogs,
)

SYNTHETIC_LABEL = "NOT_MACHINE_EVIDENCE"


def _temp_parent() -> tempfile.TemporaryDirectory[str]:
    return tempfile.TemporaryDirectory(prefix="apollo_ea03_test_")


def _bundle_rel_paths(bundle: Path) -> set[str]:
    root = bundle.resolve()
    paths: set[str] = set()
    for current, _dirnames, filenames in os.walk(root):
        rel_root = Path(current).relative_to(root)
        if rel_root != Path("."):
            paths.add(rel_root.as_posix())
        for filename in filenames:
            if rel_root == Path("."):
                paths.add(filename)
            else:
                paths.add((rel_root / filename).as_posix())
    return paths


def _build_synthetic_ea01_bundle(parent: Path, *, run_suffix: str = "") -> Path:
    input_file = parent / f"fixture_input{run_suffix}.txt"
    input_file.write_text(f"synthetic fixture {run_suffix}\n", encoding="utf-8")

    workspace_info = create_run_workspace(parent / "runs", input_paths=[input_file])
    workspace = Path(workspace_info["workspace_path"])
    before = collect_file_manifest(workspace, label="before")
    write_json(workspace / "captures" / "before_manifest.json", before)

    cmd = [sys.executable, "-c", "print('synthetic')"]
    capture = capture_process_result(cmd, cwd=workspace)
    process_record = write_process_capture(
        workspace,
        cmd,
        capture,
        cwd=workspace,
        env_record=capture_environment_record(),
    )

    (workspace / "outputs").mkdir(exist_ok=True)
    (workspace / "outputs" / "result.txt").write_text(f"out{run_suffix}\n", encoding="utf-8")

    after = collect_file_manifest(workspace, label="after")
    write_json(workspace / "captures" / "after_manifest.json", after)
    stale = detect_stale_outputs(before, after)

    finalize_workspace_bundle(
        workspace,
        run_id=workspace_info["run_id"],
        created_at_utc=workspace_info["created_at_utc"],
        input_artifacts=workspace_info["input_artifacts"],
        invocation={
            "command": cmd,
            "cwd": str(workspace),
            "environment": capture_environment_record()["environment"],
        },
        process_result=process_record,
        before_manifest=before,
        after_manifest=after,
        stale_detection=stale,
    )
    return workspace


def _synthetic_binding(
  bundle: Path,
  *,
  selected: str = "AN-ID-004",
  frozen_id: str = "frozen-synthetic-identity-001",
  executable_sha: str = "a" * 64,
) -> dict[str, str]:
    fixture_manifest_path = bundle / "input_bundle" / "fixture_checksum_manifest.json"
    return {
        "schema_version": "apollo.external_run.package.v1",
        "selected_identity_id": selected,
        "frozen_identity_bundle_id": frozen_id,
        "executable_sha256": executable_sha,
        "fixture_manifest_sha256": sha256_file(fixture_manifest_path),
    }


def _fill_bindings_manifest(bundle: Path, binding: dict[str, str]) -> None:
    manifest_path = bundle / IDENTITY_BINDINGS_MANIFEST_NAME
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    bindings = manifest["bindings"]
    bindings["run_request"] = dict(binding)
    for index in range(1, 4):
        bindings[f"repeat_{index:02d}"] = dict(binding)
    for probe_id in CANONICAL_PROBE_SLOT_IDS:
        bindings[f"probe:{probe_id}"] = dict(binding)
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _fill_synthetic_operator_identity(bundle: Path) -> dict[str, str]:
    operator = json.loads((bundle / "operator_record.json").read_text(encoding="utf-8"))
    operator.update(
        {
            "operator_id": "synthetic-op-001",
            "operator_name": "Synthetic Test Operator",
            "organization": "EA-03 Test Harness",
            "capture_started_at_utc": "2026-07-28T00:00:00Z",
            "capture_completed_at_utc": "2026-07-28T00:01:00Z",
            "authorized_machine_id": "synthetic-host-001",
        }
    )
    (bundle / "operator_record.json").write_text(
        json.dumps(operator, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    frozen_id = "frozen-synthetic-identity-001"
    executable_hashes = {
        "AN-ID-004": "a" * 64,
        "AN-ID-005": "b" * 64,
        "AN-ID-006": "c" * 64,
    }
    product_versions = {
        "AN-ID-004": "1.0.0-synthetic-a",
        "AN-ID-005": "2.0.0-synthetic-b",
        "AN-ID-006": "3.0.0-synthetic-c",
    }
    for identity_id in ("AN-ID-004", "AN-ID-005", "AN-ID-006"):
        path = bundle / "software_identities" / f"{identity_id}.json"
        record = json.loads(path.read_text(encoding="utf-8"))
        record.update(
            {
                "identity_name": f"Synthetic {identity_id}",
                "identity_class": "SYNTHETIC_TEST",
                "product_version": product_versions[identity_id],
                "build_id": f"synthetic-build-{identity_id}",
                "architecture": "x86_64",
                "publisher": "EA-03 Test",
                "executable_path": f"/synthetic/path/{identity_id}",
                "executable_sha256": executable_hashes[identity_id],
                "service_name": "synthetic-service",
                "hosting_process": "synthetic-host",
                "relationship_notes": SYNTHETIC_LABEL,
                "identity_capture_command": "synthetic --version",
                "identity_capture_stdout_sha256": "d" * 64,
                "frozen_identity_bundle_id": frozen_id,
                "captured_at_utc": "2026-07-28T00:00:00Z",
            }
        )
        path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    fixture_path = bundle / "input_bundle" / "synthetic_fixture.dat"
    fixture_path.write_text("synthetic fixture bytes\n", encoding="utf-8")
    fixture_manifest = json.loads(
        (bundle / "input_bundle" / "fixture_checksum_manifest.json").read_text(encoding="utf-8")
    )
    fixture_manifest.update(
        {
            "manifest_id": "synthetic-fixture-manifest-001",
            "fixtures": [
                {
                    "fixture_id": "SYN-FIX-001",
                    "workspace_relative_path": "synthetic_fixture.dat",
                    "source_path": str(fixture_path),
                    "sha256": sha256_file(fixture_path),
                    "size_bytes": fixture_path.stat().st_size,
                    "read_only": True,
                }
            ],
        }
    )
    fixture_manifest_path = bundle / "input_bundle" / "fixture_checksum_manifest.json"
    fixture_manifest_path.write_text(
        json.dumps(fixture_manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    fixture_digest = sha256_file(fixture_manifest_path)

    run_request = json.loads((bundle / "run_request.json").read_text(encoding="utf-8"))
    run_request.update(
        {
            "selected_identity_id": "AN-ID-004",
            "invocation_command": [sys.executable, "-c", "print('synthetic')"],
            "invocation_cwd": str(bundle),
            "invocation_environment_allowlist": ["PATH", "LANG"],
            "fixture_binding_sha256": fixture_digest,
            "frozen_identity_bundle_id": frozen_id,
        }
    )
    (bundle / "run_request.json").write_text(
        json.dumps(run_request, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    license_preflight = json.loads((bundle / "license_preflight.json").read_text(encoding="utf-8"))
    license_preflight.update(
        {
            "entitlement_name": "synthetic-entitlement",
            "entitlement_state": "valid",
            "license_server_reachable": True,
            "seat_count_documented": 1,
            "license_artifact_sha256": "e" * 64,
        }
    )
    (bundle / "license_preflight.json").write_text(
        json.dumps(license_preflight, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    machine = json.loads((bundle / "machine_preflight.json").read_text(encoding="utf-8"))
    machine.update(
        {
            "host_os": "Linux",
            "host_architecture": "x86_64",
            "host_locale": "C.UTF-8",
            "timezone": "UTC",
            "authorized_machine_id": "synthetic-host-001",
            "external_software_discovered": True,
            "discovery_evidence_sha256": "f" * 64,
        }
    )
    (bundle / "machine_preflight.json").write_text(
        json.dumps(machine, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    binding = _synthetic_binding(bundle, frozen_id=frozen_id)
    _fill_bindings_manifest(bundle, binding)
    return binding


def _import_repeats_with_bindings(
    bundle: Path,
    root: Path,
    binding: dict[str, str],
    *,
    mismatch_slot: str | None = None,
) -> str:
    workspaces = [
        _build_synthetic_ea01_bundle(root, run_suffix=""),
        _build_synthetic_ea01_bundle(root, run_suffix=""),
        _build_synthetic_ea01_bundle(root, run_suffix=""),
    ]
    identity_bindings = {}
    for index, workspace in enumerate(workspaces, start=1):
        slot = f"repeat_{index:02d}"
        slot_binding = dict(binding)
        if slot == mismatch_slot:
            slot_binding["executable_sha256"] = "9" * 64
        identity_bindings[slot] = slot_binding
    manifest = import_external_run_bundle(
        bundle,
        evidence_bundle_dirs={
            "repeat_01": workspaces[0],
            "repeat_02": workspaces[1],
            "repeat_03": workspaces[2],
        },
        identity_bindings=identity_bindings,
    )
    return manifest["import_manifest_sha256"]


def _import_all_probes(bundle: Path, root: Path, binding: dict[str, str]) -> str:
    evidence_dirs: dict[str, Path] = {}
    identity_bindings: dict[str, dict[str, str]] = {}
    for probe_id in CANONICAL_PROBE_SLOT_IDS:
        workspace = _build_synthetic_ea01_bundle(root, run_suffix=f"-{probe_id}")
        evidence_dirs[f"probe:{probe_id}"] = workspace
        identity_bindings[f"probe:{probe_id}"] = dict(binding)
    manifest = import_external_run_bundle(
        bundle,
        evidence_bundle_dirs=evidence_dirs,
        identity_bindings=identity_bindings,
    )
    return manifest["import_manifest_sha256"]


class TestExternalRunPackagePrepare(unittest.TestCase):
    def test_prepare_creates_exclusive_skeleton(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            report = prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-001")
            self.assertEqual(report["package_verdict"], PACKAGE_VERDICT_COMPLETE)
            self.assertEqual(report["execution_verdict"], EXECUTION_VERDICT_BLOCKED)
            self.assertTrue((bundle / "package_manifest.json").exists())
            self.assertTrue((bundle / IDENTITY_BINDINGS_MANIFEST_NAME).exists())
            machine = json.loads((bundle / "machine_preflight.json").read_text(encoding="utf-8"))
            self.assertEqual(machine["host_os"], REQUIRED_OPERATOR_INPUT)

    def test_prepare_refuses_overwrite(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            with self.assertRaises(ExclusiveWriteError):
                prepare_external_run_bundle(bundle)


class TestExternalRunPackageVerify(unittest.TestCase):
    def test_verify_skeleton_valid_false_package_valid_true(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-002")
            report = verify_external_run_bundle(bundle)
            self.assertFalse(report["valid"])
            self.assertTrue(report["package_valid"])
            self.assertFalse(report["execution_valid"])
            self.assertEqual(report["package_verdict"], PACKAGE_VERDICT_COMPLETE)
            self.assertEqual(report["execution_verdict"], EXECUTION_VERDICT_BLOCKED)
            self.assertFalse(report["operator_inputs_complete"])

            package_only = verify_external_run_bundle(bundle, package_only=True)
            self.assertTrue(package_only["valid"])
            self.assertTrue(package_only["package_valid"])
            self.assertFalse(package_only["execution_valid"])
            self.assertFalse(package_only["operator_inputs_complete"])
            self.assertTrue(package_only["execution_errors"])

    def test_package_only_filled_partial_keeps_execution_flags_false(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-partial-package-only")
            binding = _fill_synthetic_operator_identity(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            import_external_run_bundle(
                bundle,
                evidence_bundle_dirs={"probe:AN-PRB-001": workspace},
                identity_bindings={"probe:AN-PRB-001": dict(binding)},
            )
            report = verify_external_run_bundle(bundle, package_only=True)
            self.assertTrue(report["valid"])
            self.assertTrue(report["package_valid"])
            self.assertFalse(report["execution_valid"])
            self.assertFalse(report["operator_inputs_complete"])
            self.assertTrue(
                any("missing probe execution bundles" in error for error in report["execution_errors"])
            )
            self.assertTrue(
                any(
                    "import_manifest.json required" in error
                    or "expected_import_manifest_sha256" in error
                    for error in report["execution_errors"]
                )
            )

    def test_verify_rejects_reference_only_manual_sha(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-003")
            _fill_synthetic_operator_identity(bundle)
            identity_path = bundle / "software_identities" / "AN-ID-004.json"
            record = json.loads(identity_path.read_text(encoding="utf-8"))
            record["executable_sha256"] = REFERENCE_ONLY_MANUAL_SHA
            identity_path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
            report = verify_external_run_bundle(bundle)
            self.assertFalse(report["valid"])
            self.assertTrue(
                any("reference-only manual SHA" in error for error in report["execution_errors"])
            )

    def test_default_verify_applies_full_operator_rules_without_legacy_flag(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-default-verify")
            report = verify_external_run_bundle(bundle)
            self.assertFalse(report["valid"])
            self.assertTrue(
                any("missing probe execution bundles" in error for error in report["execution_errors"])
            )
            self.assertTrue(
                any("import_manifest.json required" in error for error in report["execution_errors"])
            )


class TestExternalRunPackageImport(unittest.TestCase):
    def test_import_records_content_hashes_and_manifest_sha(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-005")
            fixture = root / "fixture.dat"
            fixture.write_text("synthetic input\n", encoding="utf-8")
            manifest = import_external_run_bundle(
                bundle,
                source_files={"input_bundle/fixture.dat": fixture},
            )
            self.assertIn("content_hashes", manifest)
            self.assertIn("import_manifest_sha256", manifest)
            self.assertEqual(
                manifest["import_manifest_sha256"],
                sha256_file(bundle / "import_manifest.json"),
            )

    def test_import_rejects_manual_edit_without_seal(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-006")
            import_external_run_bundle(bundle)
            operator = bundle / "operator_record.json"
            operator.write_text(operator.read_text(encoding="utf-8") + "\n", encoding="utf-8")
            report = verify_external_run_bundle(
                bundle,
                expected_import_manifest_sha256=sha256_file(bundle / "import_manifest.json"),
            )
            self.assertTrue(
                any("manual edit detected" in error for error in report["execution_errors"])
            )

    def test_import_manifest_forge_missing_expected_seal(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-forge")
            manifest = import_external_run_bundle(bundle)
            forged = json.loads((bundle / "import_manifest.json").read_text(encoding="utf-8"))
            forged["content_hashes"]["package_manifest.json"] = "0" * 64
            (bundle / "import_manifest.json").write_text(
                json.dumps(forged, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            missing_seal = verify_external_run_bundle(bundle)
            self.assertTrue(
                any("expected_import_manifest_sha256" in error for error in missing_seal["execution_errors"])
            )
            wrong_seal = verify_external_run_bundle(
                bundle,
                expected_import_manifest_sha256="0" * 64,
            )
            self.assertTrue(
                any("import_manifest_sha256 seal mismatch" in error for error in wrong_seal["execution_errors"])
            )
            correct = verify_external_run_bundle(
                bundle,
                expected_import_manifest_sha256=manifest["import_manifest_sha256"],
            )
            self.assertTrue(
                any("manual edit detected" in error for error in correct["execution_errors"])
            )

    def test_probe_traversal_rejected(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            with self.assertRaises(ExternalRunPackageError):
                import_external_run_bundle(
                    bundle,
                    evidence_bundle_dirs={"probe:../evil": workspace},
                )
            with self.assertRaises(ExternalRunPackageError):
                import_external_run_bundle(
                    bundle,
                    evidence_bundle_dirs={"probe:AN-PRB-999": workspace},
                )

    def test_transactional_rollback_leaves_destination_unchanged(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            before_tree = _bundle_rel_paths(bundle)
            fixture = root / "fixture.dat"
            fixture.write_text("before import\n", encoding="utf-8")
            bad_workspace = root / "not-a-bundle"
            bad_workspace.mkdir()
            binding = {
                "schema_version": "apollo.external_run.package.v1",
                "selected_identity_id": "AN-ID-004",
                "frozen_identity_bundle_id": "frozen-test",
                "executable_sha256": "a" * 64,
                "fixture_manifest_sha256": "b" * 64,
            }
            with self.assertRaises(ExternalRunPackageError):
                import_external_run_bundle(
                    bundle,
                    source_files={"input_bundle/fixture.dat": fixture},
                    evidence_bundle_dirs={"repeat_01": bad_workspace},
                    identity_bindings={"repeat_01": binding},
                )
            self.assertEqual(_bundle_rel_paths(bundle), before_tree)
            self.assertFalse(any(bundle.glob(".import_staging_*")))

    def test_import_missing_binding_rejected(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            with self.assertRaises(ExternalRunPackageValidationError):
                import_external_run_bundle(
                    bundle,
                    evidence_bundle_dirs={"repeat_01": workspace},
                )

    def test_import_invalid_binding_rejected(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            with self.assertRaises(ExternalRunPackageValidationError):
                import_external_run_bundle(
                    bundle,
                    evidence_bundle_dirs={"repeat_01": workspace},
                    identity_bindings={"repeat_01": {"selected_identity_id": "AN-ID-004"}},
                )

    def test_import_unserializable_binding_rejected(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            binding = {
                "schema_version": "apollo.external_run.package.v1",
                "selected_identity_id": "AN-ID-004",
                "frozen_identity_bundle_id": "frozen-test",
                "executable_sha256": "a" * 64,
                "fixture_manifest_sha256": "b" * 64,
                "bad": {1, 2, 3},
            }
            with self.assertRaises(ExternalRunPackageValidationError):
                import_external_run_bundle(
                    bundle,
                    evidence_bundle_dirs={"repeat_01": workspace},
                    identity_bindings={"repeat_01": binding},
                )

    def test_import_rejects_preexisting_import_manifest(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            (bundle / "import_manifest.json").write_text("{}\n", encoding="utf-8")
            with self.assertRaises(ExclusiveWriteError):
                import_external_run_bundle(bundle)
            self.assertTrue((bundle / "import_manifest.json").exists())

    def test_import_binding_destination_conflict_rejected(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            binding_path = bundle / "repeat_runs" / "repeat_01" / EXTERNAL_IDENTITY_BINDING_NAME
            binding_path.parent.mkdir(parents=True, exist_ok=True)
            binding_path.write_text("{}\n", encoding="utf-8")
            binding = {
                "schema_version": "apollo.external_run.package.v1",
                "selected_identity_id": "AN-ID-004",
                "frozen_identity_bundle_id": "frozen-test",
                "executable_sha256": "a" * 64,
                "fixture_manifest_sha256": "b" * 64,
            }
            with self.assertRaises(ExclusiveWriteError):
                import_external_run_bundle(
                    bundle,
                    evidence_bundle_dirs={"repeat_01": workspace},
                    identity_bindings={"repeat_01": binding},
                )

    def test_import_failure_on_first_promotion_preserves_directory_tree(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            before_tree = _bundle_rel_paths(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            binding = {
                "schema_version": "apollo.external_run.package.v1",
                "selected_identity_id": "AN-ID-004",
                "frozen_identity_bundle_id": "frozen-test",
                "executable_sha256": "a" * 64,
                "fixture_manifest_sha256": "b" * 64,
            }
            original_replace = Path.replace
            calls = {"count": 0}

            def fail_first_replace(self: Path, target: Path) -> Path:
                calls["count"] += 1
                if calls["count"] == 1:
                    raise OSError("injected first promotion failure")
                return original_replace(self, target)

            with mock.patch.object(Path, "replace", fail_first_replace):
                with self.assertRaises(OSError):
                    import_external_run_bundle(
                        bundle,
                        evidence_bundle_dirs={"repeat_01": workspace},
                        identity_bindings={"repeat_01": binding},
                    )
            self.assertEqual(_bundle_rel_paths(bundle), before_tree)
            repeat_slot = bundle / "repeat_runs" / "repeat_01"
            self.assertTrue(repeat_slot.is_dir())
            self.assertEqual(list(repeat_slot.iterdir()), [])
            self.assertFalse(any(bundle.glob(".import_staging_*")))

    def test_import_promotion_failure_rolls_back_promoted_paths(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            before_tree = _bundle_rel_paths(bundle)
            fixture = root / "fixture.dat"
            fixture.write_text("before import\n", encoding="utf-8")
            workspace = _build_synthetic_ea01_bundle(root)
            binding = {
                "schema_version": "apollo.external_run.package.v1",
                "selected_identity_id": "AN-ID-004",
                "frozen_identity_bundle_id": "frozen-test",
                "executable_sha256": "a" * 64,
                "fixture_manifest_sha256": "b" * 64,
            }
            original_replace = Path.replace
            calls = {"count": 0}

            def flaky_replace(self: Path, target: Path) -> Path:
                calls["count"] += 1
                if calls["count"] == 2:
                    raise OSError("injected promotion failure")
                return original_replace(self, target)

            with mock.patch.object(Path, "replace", flaky_replace):
                with self.assertRaises(OSError):
                    import_external_run_bundle(
                        bundle,
                        source_files={"input_bundle/fixture.dat": fixture},
                        evidence_bundle_dirs={"repeat_01": workspace},
                        identity_bindings={"repeat_01": binding},
                    )
            self.assertEqual(_bundle_rel_paths(bundle), before_tree)
            repeat_slot = bundle / "repeat_runs" / "repeat_01"
            self.assertTrue(repeat_slot.is_dir())
            self.assertEqual(list(repeat_slot.iterdir()), [])
            self.assertFalse(any(bundle.glob(".import_staging_*")))

    def test_import_mid_probe_promotion_rollback_removes_created_probe_slot(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            before_tree = _bundle_rel_paths(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            binding = {
                "schema_version": "apollo.external_run.package.v1",
                "selected_identity_id": "AN-ID-004",
                "frozen_identity_bundle_id": "frozen-test",
                "executable_sha256": "a" * 64,
                "fixture_manifest_sha256": "b" * 64,
            }
            original_replace = Path.replace
            calls = {"count": 0}

            def fail_binding_replace(self: Path, target: Path) -> Path:
                calls["count"] += 1
                if calls["count"] == 2:
                    raise OSError("injected probe binding promotion failure")
                return original_replace(self, target)

            with mock.patch.object(Path, "replace", fail_binding_replace):
                with self.assertRaises(OSError):
                    import_external_run_bundle(
                        bundle,
                        evidence_bundle_dirs={"probe:AN-PRB-001": workspace},
                        identity_bindings={"probe:AN-PRB-001": binding},
                    )
            self.assertEqual(_bundle_rel_paths(bundle), before_tree)
            probe_slot = bundle / "probe_executions" / "AN-PRB-001"
            self.assertFalse(probe_slot.exists())


class TestExternalRunRepeatRuns(unittest.TestCase):
    def test_three_repeat_bundles_deterministic(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-007")
            binding = _fill_synthetic_operator_identity(bundle)
            seal = _import_repeats_with_bindings(bundle, root, binding)
            report = verify_external_run_bundle(
                bundle,
                expected_import_manifest_sha256=seal,
            )
            self.assertEqual(report["repeat_run_count"], 3)
            self.assertTrue(any("missing probe execution bundles" in error for error in report["execution_errors"]))

    def test_nondeterministic_repeat_runs_fail(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-008")
            binding = _fill_synthetic_operator_identity(bundle)
            workspaces = [
                _build_synthetic_ea01_bundle(root, run_suffix=""),
                _build_synthetic_ea01_bundle(root, run_suffix=""),
                _build_synthetic_ea01_bundle(root, run_suffix="-diff"),
            ]
            seal = import_external_run_bundle(
                bundle,
                evidence_bundle_dirs={
                    "repeat_01": workspaces[0],
                    "repeat_02": workspaces[1],
                    "repeat_03": workspaces[2],
                },
                identity_bindings={
                    f"repeat_{index:02d}": dict(binding) for index in range(1, 4)
                },
            )["import_manifest_sha256"]
            report = verify_external_run_bundle(
                bundle,
                expected_import_manifest_sha256=seal,
            )
            self.assertFalse(report["execution_valid"])
            self.assertTrue(
                any("nondeterministic" in error for error in report["execution_errors"])
            )

    def test_repeat_binding_mismatch_rejected(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            binding = _fill_synthetic_operator_identity(bundle)
            seal = _import_repeats_with_bindings(bundle, root, binding, mismatch_slot="repeat_02")
            report = verify_external_run_bundle(
                bundle,
                expected_import_manifest_sha256=seal,
            )
            self.assertTrue(
                any("repeat_02_binding.executable_sha256" in error for error in report["execution_errors"])
            )


class TestExternalRunValidationRules(unittest.TestCase):
    def test_machine_discovered_must_be_boolean_true(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            machine = json.loads((bundle / "machine_preflight.json").read_text(encoding="utf-8"))
            machine["external_software_discovered"] = False
            (bundle / "machine_preflight.json").write_text(
                json.dumps(machine, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            report = verify_external_run_bundle(bundle)
            self.assertTrue(
                any("external_software_discovered must be boolean true" in error for error in report["execution_errors"])
            )

    def test_fixture_binding_mismatch_rejected(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            run_request = json.loads((bundle / "run_request.json").read_text(encoding="utf-8"))
            run_request["fixture_binding_sha256"] = "0" * 64
            (bundle / "run_request.json").write_text(
                json.dumps(run_request, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            report = verify_external_run_bundle(bundle)
            self.assertTrue(
                any("fixture_binding_sha256 does not match" in error for error in report["execution_errors"])
            )

    def test_allowlist_placeholder_and_secret_rejected(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            run_request = json.loads((bundle / "run_request.json").read_text(encoding="utf-8"))
            run_request["invocation_environment_allowlist"] = ["MY_SECRET_TOKEN"]
            (bundle / "run_request.json").write_text(
                json.dumps(run_request, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            report = verify_external_run_bundle(bundle)
            self.assertTrue(
                any("secret-like environment name segment" in error for error in report["execution_errors"])
            )

    def test_license_string_true_rejected(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            license_preflight = json.loads((bundle / "license_preflight.json").read_text(encoding="utf-8"))
            license_preflight["license_server_reachable"] = "true"
            license_preflight["seat_count_documented"] = "1"
            (bundle / "license_preflight.json").write_text(
                json.dumps(license_preflight, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            report = verify_external_run_bundle(bundle)
            self.assertTrue(
                any("license_server_reachable must be a boolean" in error for error in report["execution_errors"])
            )
            self.assertTrue(
                any("seat_count_documented must be a non-negative integer" in error for error in report["execution_errors"])
            )

    def test_split_frozen_ids_rejected(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            path = bundle / "software_identities" / "AN-ID-005.json"
            record = json.loads(path.read_text(encoding="utf-8"))
            record["frozen_identity_bundle_id"] = "different-frozen-id"
            path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            report = verify_external_run_bundle(bundle)
            self.assertTrue(
                any("split frozen_identity_bundle_id" in error for error in report["execution_errors"])
            )

    def test_distinct_product_versions_allowed(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            report = verify_external_run_bundle(bundle)
            self.assertFalse(
                any("version mixing" in error for error in report["execution_errors"])
            )

    def test_missing_and_unknown_probes_rejected(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            binding = _fill_synthetic_operator_identity(bundle)
            workspace = _build_synthetic_ea01_bundle(root)
            import_external_run_bundle(
                bundle,
                evidence_bundle_dirs={"probe:AN-PRB-001": workspace},
                identity_bindings={"probe:AN-PRB-001": dict(binding)},
            )
            (bundle / "probe_executions" / "UNKNOWN-PROBE").mkdir()
            report = verify_external_run_bundle(bundle)
            self.assertTrue(
                any("missing probe execution bundles" in error for error in report["execution_errors"])
            )
            self.assertTrue(
                any("unknown probe execution directory" in error for error in report["execution_errors"])
            )

    def test_all_probes_present_still_blocked_without_full_operator_inputs(self) -> None:
        with _temp_parent() as parent:
            root = Path(parent)
            bundle = root / "bundle"
            prepare_external_run_bundle(bundle)
            binding = _fill_synthetic_operator_identity(bundle)
            seal = _import_all_probes(bundle, root, binding)
            report = verify_external_run_bundle(
                bundle,
                expected_import_manifest_sha256=seal,
            )
            self.assertFalse(report["valid"])
            self.assertEqual(report["execution_verdict"], EXECUTION_VERDICT_BLOCKED)


    def test_template_prose_passes_secret_scan(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            report = verify_external_run_bundle(bundle)
            self.assertFalse(
                any("secret-like" in error for error in report["execution_errors"])
            )

    def test_invocation_command_secret_assignment_rejected(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            run_request = json.loads((bundle / "run_request.json").read_text(encoding="utf-8"))
            run_request["invocation_command"] = [sys.executable, "-c", "TOKEN=leaked"]
            (bundle / "run_request.json").write_text(
                json.dumps(run_request, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            report = verify_external_run_bundle(bundle)
            self.assertTrue(
                any("secret-like assignment pattern" in error for error in report["execution_errors"])
            )

    def test_fixture_workspace_relative_path_nested_resolved(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            _fill_synthetic_operator_identity(bundle)
            nested = bundle / "input_bundle" / "nested"
            nested.mkdir(parents=True)
            fixture = nested / "deep_fixture.dat"
            fixture.write_text("nested bytes\n", encoding="utf-8")
            manifest = json.loads(
                (bundle / "input_bundle" / "fixture_checksum_manifest.json").read_text(encoding="utf-8")
            )
            manifest["fixtures"] = [
                {
                    "fixture_id": "SYN-FIX-NESTED",
                    "workspace_relative_path": "nested/deep_fixture.dat",
                    "source_path": str(fixture),
                    "sha256": sha256_file(fixture),
                    "size_bytes": fixture.stat().st_size,
                    "read_only": True,
                }
            ]
            manifest_path = bundle / "input_bundle" / "fixture_checksum_manifest.json"
            manifest_path.write_text(
                json.dumps(manifest, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            run_request = json.loads((bundle / "run_request.json").read_text(encoding="utf-8"))
            run_request["fixture_binding_sha256"] = sha256_file(manifest_path)
            (bundle / "run_request.json").write_text(
                json.dumps(run_request, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            report = verify_external_run_bundle(bundle)
            self.assertFalse(
                any("missing fixture file: nested/deep_fixture.dat" in error for error in report["execution_errors"])
            )

    def test_fixture_workspace_relative_path_traversal_rejected(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            manifest = json.loads(
                (bundle / "input_bundle" / "fixture_checksum_manifest.json").read_text(encoding="utf-8")
            )
            manifest["fixtures"] = [
                {
                    "fixture_id": "SYN-FIX-BAD",
                    "workspace_relative_path": "../escape.dat",
                    "source_path": "/tmp/escape.dat",
                    "sha256": "a" * 64,
                    "size_bytes": 1,
                    "read_only": True,
                }
            ]
            (bundle / "input_bundle" / "fixture_checksum_manifest.json").write_text(
                json.dumps(manifest, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            report = verify_external_run_bundle(bundle, package_only=True)
            self.assertTrue(
                any("workspace_relative_path rejected" in error for error in report["execution_errors"])
            )


class TestExternalRunDocsPackage(unittest.TestCase):
    def test_docs_package_validates(self) -> None:
        report = validate_docs_package(DOCS_DIR)
        self.assertTrue(report["valid"], msg=str(report.get("errors")))
        self.assertEqual(report["package_verdict"], PACKAGE_VERDICT_COMPLETE)
        self.assertEqual(report["execution_verdict"], EXECUTION_VERDICT_BLOCKED)

    def test_probe_catalogs_cover_canonical_matrices(self) -> None:
        positive = DOCS_DIR / "positive_probe_catalog.csv"
        negative = DOCS_DIR / "negative_probe_catalog.csv"
        self.assertTrue(positive.exists())
        self.assertTrue(negative.exists())
        positive_text = positive.read_text(encoding="utf-8")
        negative_text = negative.read_text(encoding="utf-8")
        for index in range(1, 23):
            self.assertIn(f"AN-PRB-{index:03d}", positive_text)
        for index in range(1, 17):
            self.assertIn(f"AN-ERR-{index:03d}", negative_text)

    def test_catalogs_refuse_overwrite(self) -> None:
        with _temp_parent() as parent:
            docs = Path(parent) / "docs"
            docs.mkdir()
            write_package_catalogs(docs)
            with self.assertRaises(ExclusiveWriteError):
                write_package_catalogs(docs)


class TestExternalRunSummarize(unittest.TestCase):
    def test_summarize_includes_synthetic_label(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle, bundle_id="synthetic-ea03-009")
            summary = summarize_external_run_bundle(bundle)
            self.assertIn(SYNTHETIC_LABEL, summary["synthetic_evidence_label"])
            self.assertEqual(summary["execution_verdict"], EXECUTION_VERDICT_BLOCKED)
            self.assertIn("package_valid_hint", summary)


class TestExternalRunPlaceholders(unittest.TestCase):
    def test_skeleton_contains_required_operator_input_markers(self) -> None:
        with _temp_parent() as parent:
            bundle = Path(parent) / "bundle"
            prepare_external_run_bundle(bundle)
            operator = json.loads((bundle / "operator_record.json").read_text(encoding="utf-8"))
            self.assertEqual(operator["operator_id"], REQUIRED_OPERATOR_INPUT)
            identity = json.loads(
                (bundle / "software_identities" / "AN-ID-004.json").read_text(encoding="utf-8")
            )
            self.assertEqual(identity["status"], BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT)
            binding_path = bundle / "repeat_runs" / "repeat_01" / EXTERNAL_IDENTITY_BINDING_NAME
            self.assertFalse(binding_path.exists())


if __name__ == "__main__":
    unittest.main()
