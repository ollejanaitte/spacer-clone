"""Targeted unittest coverage for EA-01 evidence harness."""

from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

_EVIDENCE_DIR = Path(__file__).resolve().parent.parent
if str(_EVIDENCE_DIR) not in sys.path:
    sys.path.insert(0, str(_EVIDENCE_DIR))

from evidence_core import (  # noqa: E402
    HARNESS_VERSION,
    BundleValidationError,
    ExclusiveWriteError,
    PathSafetyError,
    WorkspaceExistsError,
    capture_environment_record,
    capture_process_result,
    collect_file_manifest,
    compare_repeated_runs,
    create_run_workspace,
    detect_stale_outputs,
    finalize_workspace_bundle,
    generate_run_id,
    read_json,
    redact_environment,
    resolve_within_root,
    resolve_workspace_artifact_path,
    sha256_bytes,
    sha256_file,
    validate_evidence_bundle,
    validate_run_id,
    write_json,
    write_process_capture,
    write_summaries,
)

FIXED_RUN_ID = "a" * 64
ALT_RUN_ID = "b" * 64
_VALIDATE_CLI = _EVIDENCE_DIR / "validate_evidence_bundle.py"


def _wait_for_pid_file(pid_file: Path, *, timeout_seconds: float = 2.0) -> int:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if pid_file.exists():
            return int(pid_file.read_text(encoding="utf-8").strip())
        time.sleep(0.05)
    raise AssertionError(f"child pid file not created within {timeout_seconds}s: {pid_file}")


def _temp_parent() -> tempfile.TemporaryDirectory[str]:
    return tempfile.TemporaryDirectory(prefix="apollo_evidence_test_")


def _build_minimal_bundle(
    parent: Path,
    *,
    command: list[str] | None = None,
    write_output: bool = True,
    timeout_seconds: float | None = None,
) -> Path:
    input_file = parent / "fixture_input.txt"
    input_file.write_text("fixture\n", encoding="utf-8")

    workspace_info = create_run_workspace(parent / "runs", input_paths=[input_file])
    workspace = Path(workspace_info["workspace_path"])
    before = collect_file_manifest(workspace, label="before")
    write_json(workspace / "captures" / "before_manifest.json", before)

    cmd = command or [sys.executable, "-c", "print('ok')"]
    capture = capture_process_result(cmd, cwd=workspace, timeout_seconds=timeout_seconds)
    process_record = write_process_capture(
        workspace,
        cmd,
        capture,
        cwd=workspace,
        env_record=capture_environment_record(),
    )

    if write_output:
        (workspace / "outputs").mkdir(exist_ok=True)
        (workspace / "outputs" / "result.txt").write_text("output\n", encoding="utf-8")

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
            "environment": capture_environment_record(),
        },
        process_result=process_record,
        before_manifest=before,
        after_manifest=after,
        stale_detection=stale,
    )
    write_summaries(workspace, read_json(workspace / "bundle_manifest.json"))
    return workspace


class RunIdUniquenessTest(unittest.TestCase):
    def test_run_id_uniqueness(self) -> None:
        generated = {generate_run_id() for _ in range(256)}
        self.assertEqual(len(generated), 256)
        for run_id in generated:
            self.assertEqual(len(run_id), 64)
            validate_run_id(run_id)


class RunIdFormatTest(unittest.TestCase):
    def test_run_id_format_validation(self) -> None:
        validate_run_id(FIXED_RUN_ID)
        with self.assertRaises(ValueError):
            validate_run_id("fixed-run-id")
        with self.assertRaises(ValueError):
            validate_run_id("A" * 64)
        with self.assertRaises(ValueError):
            validate_run_id("g" * 64)

    def test_create_rejects_invalid_run_id(self) -> None:
        with _temp_parent() as tmp:
            with self.assertRaises(ValueError):
                create_run_workspace(Path(tmp), run_id="not-valid")


class InputChecksumTest(unittest.TestCase):
    def test_input_checksum(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            source = parent / "input.dat"
            source.write_bytes(b"alpha-beta-gamma\n")
            info = create_run_workspace(parent, input_paths=[source])
            workspace = Path(info["workspace_path"])
            copied = workspace / "inputs" / "input.dat"
            self.assertTrue(copied.exists())
            self.assertEqual(sha256_file(copied), info["input_artifacts"][0]["sha256"])
            mode = copied.stat().st_mode
            self.assertEqual(mode & stat.S_IWUSR, 0)


class OutputChecksumTest(unittest.TestCase):
    def test_output_checksum(self) -> None:
        with _temp_parent() as tmp:
            workspace = _build_minimal_bundle(Path(tmp))
            manifest = read_json(workspace / "bundle_manifest.json")
            validate_evidence_bundle(manifest, workspace=workspace)
            output = manifest["output_artifacts"][0]
            disk_path = workspace / output["workspace_relative_path"]
            self.assertEqual(sha256_file(disk_path), output["sha256"])


class EmptyOutputTest(unittest.TestCase):
    def test_empty_output(self) -> None:
        with _temp_parent() as tmp:
            workspace = _build_minimal_bundle(Path(tmp), write_output=False)
            manifest = read_json(workspace / "bundle_manifest.json")
            self.assertEqual(manifest["output_artifacts"], [])
            report = validate_evidence_bundle(manifest, workspace=workspace)
            self.assertTrue(report["valid"])


class MissingCommandTest(unittest.TestCase):
    def test_missing_command(self) -> None:
        with self.assertRaises(ValueError):
            capture_process_result([])


class NonzeroExitTest(unittest.TestCase):
    def test_nonzero_exit(self) -> None:
        with _temp_parent() as tmp:
            workspace = _build_minimal_bundle(
                Path(tmp),
                command=[sys.executable, "-c", "import sys; sys.exit(7)"],
                write_output=False,
            )
            manifest = read_json(workspace / "bundle_manifest.json")
            self.assertEqual(manifest["process_result"]["exit_code"], 7)


class StdoutStderrTest(unittest.TestCase):
    def test_stdout_stderr(self) -> None:
        with _temp_parent() as tmp:
            command = [
                sys.executable,
                "-c",
                "import sys; print('stdout-line'); print('stderr-line', file=sys.stderr)",
            ]
            workspace = _build_minimal_bundle(Path(tmp), command=command, write_output=False)
            manifest = read_json(workspace / "bundle_manifest.json")
            stdout_path = workspace / manifest["process_result"]["stdout"]["relative_path"]
            stderr_path = workspace / manifest["process_result"]["stderr"]["relative_path"]
            self.assertEqual(stdout_path.read_bytes(), b"stdout-line\n")
            self.assertIn(b"stderr-line", stderr_path.read_bytes())
            self.assertEqual(
                manifest["process_result"]["stdout"]["sha256"],
                sha256_bytes(stdout_path.read_bytes()),
            )


class StaleOutputTest(unittest.TestCase):
    def test_stale_output(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            input_file = parent / "input.txt"
            input_file.write_text("in\n", encoding="utf-8")
            info = create_run_workspace(parent, input_paths=[input_file])
            workspace = Path(info["workspace_path"])
            outputs = workspace / "outputs"
            outputs.mkdir(exist_ok=True)
            stale_file = outputs / "preexisting.out"
            stale_file.write_text("seed\n", encoding="utf-8")
            before = collect_file_manifest(workspace, label="before")
            time.sleep(0.05)
            os.utime(stale_file, None)
            after = collect_file_manifest(workspace, label="after")
            stale = detect_stale_outputs(before, after)
            self.assertTrue(stale["stale_detected"])
            self.assertEqual(stale["stale_entries"][0]["relative_path"], "outputs/preexisting.out")


class RepeatedIdenticalTest(unittest.TestCase):
    def test_repeated_identical(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            command = [sys.executable, "-c", "print('ok')"]
            run_a = _build_minimal_bundle(parent, command=command)
            run_b = _build_minimal_bundle(parent, command=command)
            bundle_a = read_json(run_a / "bundle_manifest.json")
            bundle_b = read_json(run_b / "bundle_manifest.json")
            comparison = compare_repeated_runs(bundle_a, bundle_b)
            self.assertEqual(comparison["verdict"], "deterministic")
            self.assertTrue(comparison["deterministic"])
            self.assertEqual(
                comparison["projection_a"]["command"],
                comparison["projection_b"]["command"],
            )
            self.assertEqual(
                comparison["projection_a"]["harness_version"],
                HARNESS_VERSION,
            )


class RepeatedDifferentTest(unittest.TestCase):
    def test_repeated_different(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            run_a = _build_minimal_bundle(
                parent,
                command=[sys.executable, "-c", "print('ok')"],
            )
            run_b = _build_minimal_bundle(
                parent,
                command=[sys.executable, "-c", "exec(\"print('ok')\")"],
            )
            bundle_a = read_json(run_a / "bundle_manifest.json")
            bundle_b = read_json(run_b / "bundle_manifest.json")
            comparison = compare_repeated_runs(bundle_a, bundle_b)
            self.assertEqual(comparison["verdict"], "nondeterministic")
            self.assertFalse(comparison["deterministic"])
            self.assertIn("field:command", comparison["differences"])


class MalformedManifestTest(unittest.TestCase):
    def test_malformed_manifest(self) -> None:
        malformed = {"schema_version": "wrong", "run_id": ""}
        with self.assertRaises(BundleValidationError):
            validate_evidence_bundle(malformed)

        with _temp_parent() as tmp:
            bad_path = Path(tmp) / "bad.json"
            bad_path.write_text("{not-json", encoding="utf-8")
            with self.assertRaises(BundleValidationError):
                read_json(bad_path)


class PathTraversalRejectionTest(unittest.TestCase):
    def test_path_traversal_rejection(self) -> None:
        with _temp_parent() as tmp:
            root = Path(tmp)
            with self.assertRaises(PathSafetyError):
                resolve_within_root(root, "../outside.txt")
            with self.assertRaises(PathSafetyError):
                resolve_within_root(root, "inputs/../../escape.txt")
            with self.assertRaises(PathSafetyError):
                resolve_within_root(root, "/etc/passwd")


class OverwriteRejectionTest(unittest.TestCase):
    def test_overwrite_rejection(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            create_run_workspace(parent, run_id=FIXED_RUN_ID)
            with self.assertRaises(WorkspaceExistsError):
                create_run_workspace(parent, run_id=FIXED_RUN_ID)


class EncodingHandlingTest(unittest.TestCase):
    def test_encoding_handling(self) -> None:
        from evidence_core import utf8_safe_summary

        raw = b"valid \xc3\xa9 \xff\xfe invalid"
        summary = utf8_safe_summary(raw)
        self.assertIn("valid", summary)
        self.assertIn("\ufffd", summary)

        with _temp_parent() as tmp:
            command = [
                sys.executable,
                "-c",
                "import sys; sys.stdout.buffer.write(b'\\xc3\\xa9\\xff\\xfe\\n')",
            ]
            workspace = _build_minimal_bundle(Path(tmp), command=command, write_output=False)
            manifest = read_json(workspace / "bundle_manifest.json")
            stdout_summary = manifest["process_result"]["stdout"]["utf8_summary"]
            self.assertIn("\ufffd", stdout_summary)


class CancellationRecordTest(unittest.TestCase):
    def test_cancellation_record(self) -> None:
        with _temp_parent() as tmp:
            command = [sys.executable, "-c", "import time; time.sleep(5)"]
            workspace = _build_minimal_bundle(
                Path(tmp),
                command=command,
                write_output=False,
                timeout_seconds=0.2,
            )
            manifest = read_json(workspace / "bundle_manifest.json")
            process_result = manifest["process_result"]
            self.assertTrue(process_result["cancelled"])
            self.assertEqual(process_result["cancellation_reason"], "timeout")
            self.assertEqual(process_result["timeout_seconds"], 0.2)
            self.assertTrue(process_result["cleanup_attempted"])
            self.assertTrue(process_result["cleanup_succeeded"])


class SecretRedactionTest(unittest.TestCase):
    def test_secret_redaction_in_environment(self) -> None:
        captured = redact_environment(
            {
                "PATH": "/usr/bin",
                "MY_SECRET_TOKEN": "super-secret",
                "SAFE_CUSTOM": "visible",
            },
            allowlist={"PATH", "SAFE_CUSTOM", "MY_SECRET_TOKEN"},
        )
        self.assertEqual(captured["PATH"], "/usr/bin")
        self.assertEqual(captured["SAFE_CUSTOM"], "visible")
        self.assertEqual(captured["MY_SECRET_TOKEN"], "[REDACTED]")


class SymlinkInputRejectionTest(unittest.TestCase):
    def test_symlink_input_rejected(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            real_file = parent / "real.dat"
            real_file.write_bytes(b"payload\n")
            symlink = parent / "linked.dat"
            symlink.symlink_to(real_file)
            with self.assertRaises(PathSafetyError):
                create_run_workspace(parent, input_paths=[symlink])


class SymlinkEscapeRejectionTest(unittest.TestCase):
    def test_symlink_escape_in_workspace_rejected(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            outside = parent / "outside.txt"
            outside.write_text("secret\n", encoding="utf-8")
            info = create_run_workspace(parent)
            workspace = Path(info["workspace_path"])
            trap = workspace / "inputs" / "trap.dat"
            trap.symlink_to(outside)
            with self.assertRaises(PathSafetyError):
                resolve_workspace_artifact_path(workspace, "inputs/trap.dat")


class ExclusiveWriteTest(unittest.TestCase):
    def test_exclusive_writes_reject_existing(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            target = parent / "record.json"
            write_json(target, {"first": True})
            with self.assertRaises(ExclusiveWriteError):
                write_json(target, {"second": True})

    def test_finalize_and_summary_reject_existing(self) -> None:
        with _temp_parent() as tmp:
            workspace = _build_minimal_bundle(Path(tmp), write_output=False)
            manifest = read_json(workspace / "bundle_manifest.json")
            with self.assertRaises(ExclusiveWriteError):
                finalize_workspace_bundle(
                    workspace,
                    run_id=manifest["run_id"],
                    created_at_utc=manifest["created_at_utc"],
                    input_artifacts=manifest["input_artifacts"],
                    invocation=manifest["invocation"],
                    process_result=manifest["process_result"],
                    before_manifest=manifest["manifests"]["before"],
                    after_manifest=manifest["manifests"]["after"],
                )
            with self.assertRaises(ExclusiveWriteError):
                write_summaries(workspace, manifest)

    def test_recapture_rejects_existing_streams(self) -> None:
        with _temp_parent() as tmp:
            info = create_run_workspace(Path(tmp))
            workspace = Path(info["workspace_path"])
            cmd = [sys.executable, "-c", "print('once')"]
            capture = capture_process_result(cmd, cwd=workspace)
            write_process_capture(workspace, cmd, capture, cwd=workspace)
            with self.assertRaises(ExclusiveWriteError):
                write_process_capture(workspace, cmd, capture, cwd=workspace)


class DuplicatePathRejectionTest(unittest.TestCase):
    def test_duplicate_manifest_relative_path_rejected(self) -> None:
        manifest = {
            "entries": [
                {"relative_path": "outputs/a.txt", "sha256": "a" * 64, "size_bytes": 1, "mtime_utc": "Z"},
                {"relative_path": "outputs/a.txt", "sha256": "b" * 64, "size_bytes": 1, "mtime_utc": "Z"},
            ]
        }
        with self.assertRaises(BundleValidationError):
            detect_stale_outputs(manifest, manifest)

    def test_duplicate_input_workspace_relative_path_rejected(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            first = parent / "a.dat"
            second = parent / "b.dat"
            first.write_bytes(b"1\n")
            second.write_bytes(b"2\n")
            first.rename(parent / "shared.dat")
            second.rename(parent / "also.dat")
            shared = parent / "shared.dat"
            also = parent / "also.dat"
            info = create_run_workspace(parent, input_paths=[shared])
            workspace = Path(info["workspace_path"])
            dup_dest = workspace / "inputs" / "also.dat"
            dup_dest.write_bytes(also.read_bytes())
            manifest = read_json(workspace / "bundle_manifest.json") if (workspace / "bundle_manifest.json").exists() else {
                "schema_version": "apollo.evidence.bundle.v1",
                "harness_version": HARNESS_VERSION,
                "run_id": info["run_id"],
                "created_at_utc": info["created_at_utc"],
                "completed_at_utc": info["created_at_utc"],
                "workspace_path": str(workspace),
                "software_identity": capture_environment_record()["software_identity"],
                "input_artifacts": info["input_artifacts"] + [
                    {
                        "source_path": str(also.resolve()),
                        "workspace_relative_path": info["input_artifacts"][0]["workspace_relative_path"],
                        "sha256": "c" * 64,
                        "size_bytes": 2,
                        "read_only": True,
                    }
                ],
                "invocation": {"command": ["x"], "cwd": str(workspace), "environment": {}},
                "process_result": {
                    "command": ["x"],
                    "cwd": str(workspace),
                    "environment": {},
                    "started_at_utc": "Z",
                    "ended_at_utc": "Z",
                    "exit_code": 0,
                    "cancelled": False,
                    "cleanup_attempted": False,
                    "cleanup_succeeded": False,
                    "stdout": {
                        "relative_path": "captures/stdout.bin",
                        "sha256": "d" * 64,
                        "size_bytes": 0,
                        "utf8_summary": "",
                    },
                    "stderr": {
                        "relative_path": "captures/stderr.bin",
                        "sha256": "e" * 64,
                        "size_bytes": 0,
                        "utf8_summary": "",
                    },
                },
                "manifests": {
                    "before": {"label": "b", "root_path": str(workspace), "captured_at_utc": "Z", "entries": []},
                    "after": {"label": "a", "root_path": str(workspace), "captured_at_utc": "Z", "entries": []},
                },
                "output_artifacts": [],
                "stale_detection": {
                    "evaluated_at_utc": "Z",
                    "outputs_prefix": "outputs/",
                    "stale_detected": False,
                    "stale_entries": [],
                },
            }
            with self.assertRaises(BundleValidationError):
                validate_evidence_bundle(manifest)


class HarnessVersionValidationTest(unittest.TestCase):
    def test_harness_version_required_and_matched(self) -> None:
        with _temp_parent() as tmp:
            workspace = _build_minimal_bundle(Path(tmp), write_output=False)
            manifest = read_json(workspace / "bundle_manifest.json")
            self.assertEqual(manifest["harness_version"], HARNESS_VERSION)
            manifest["harness_version"] = "9.9.9"
            with self.assertRaises(BundleValidationError):
                validate_evidence_bundle(manifest)


class InvocationCommandConsistencyTest(unittest.TestCase):
    def test_invocation_process_command_mismatch_rejected(self) -> None:
        with _temp_parent() as tmp:
            workspace = _build_minimal_bundle(Path(tmp), write_output=False)
            manifest = read_json(workspace / "bundle_manifest.json")
            manifest["invocation"]["command"] = [sys.executable, "-c", "print('mismatch')"]
            with self.assertRaises(BundleValidationError):
                validate_evidence_bundle(manifest, workspace=workspace)


class WorkspaceDirectChildTest(unittest.TestCase):
    def test_workspace_must_be_direct_child_of_base(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            info = create_run_workspace(parent, run_id=FIXED_RUN_ID)
            workspace = Path(info["workspace_path"])
            manifest = {
                "schema_version": "apollo.evidence.bundle.v1",
                "harness_version": HARNESS_VERSION,
                "run_id": ALT_RUN_ID,
                "created_at_utc": "2026-01-01T00:00:00Z",
                "completed_at_utc": "2026-01-01T00:00:01Z",
                "workspace_path": str(workspace),
                "software_identity": capture_environment_record()["software_identity"],
                "input_artifacts": [],
                "invocation": {"command": ["x"], "cwd": str(workspace), "environment": {}},
                "process_result": {
                    "command": ["x"],
                    "cwd": str(workspace),
                    "environment": {},
                    "started_at_utc": "Z",
                    "ended_at_utc": "Z",
                    "exit_code": 0,
                    "cancelled": False,
                    "cleanup_attempted": False,
                    "cleanup_succeeded": False,
                    "stdout": {
                        "relative_path": "captures/stdout.bin",
                        "sha256": "a" * 64,
                        "size_bytes": 0,
                        "utf8_summary": "",
                    },
                    "stderr": {
                        "relative_path": "captures/stderr.bin",
                        "sha256": "b" * 64,
                        "size_bytes": 0,
                        "utf8_summary": "",
                    },
                },
                "manifests": {
                    "before": {"label": "b", "root_path": str(workspace), "captured_at_utc": "Z", "entries": []},
                    "after": {"label": "a", "root_path": str(workspace), "captured_at_utc": "Z", "entries": []},
                },
                "output_artifacts": [],
                "stale_detection": {
                    "evaluated_at_utc": "Z",
                    "outputs_prefix": "outputs/",
                    "stale_detected": False,
                    "stale_entries": [],
                },
            }
            with self.assertRaises(BundleValidationError):
                validate_evidence_bundle(manifest, workspace=workspace)


@unittest.skipUnless(sys.platform == "linux", "Linux-only orphan process check")
class OrphanChildCleanupTest(unittest.TestCase):
    def test_no_orphan_descendant_after_timeout(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            pid_file = parent / "child.pid"
            script = (
                "import os, sys, time\n"
                "child = os.fork()\n"
                "if child == 0:\n"
                "    with open(sys.argv[1], 'w', encoding='utf-8') as handle:\n"
                "        handle.write(str(os.getpid()))\n"
                "    time.sleep(3600)\n"
                "    raise SystemExit(0)\n"
                "time.sleep(3600)\n"
            )
            command = [sys.executable, "-c", script, str(pid_file)]
            capture = capture_process_result(command, timeout_seconds=0.3)
            self.assertTrue(capture.cancelled)
            self.assertTrue(capture.cleanup_attempted)
            self.assertTrue(capture.cleanup_succeeded)
            child_pid = _wait_for_pid_file(pid_file)
            self.assertFalse(Path(f"/proc/{child_pid}").exists())


class ForgedStaleDetectionTest(unittest.TestCase):
    def test_forged_stale_false_rejected(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            input_file = parent / "input.txt"
            input_file.write_text("in\n", encoding="utf-8")
            info = create_run_workspace(parent, input_paths=[input_file])
            workspace = Path(info["workspace_path"])
            outputs = workspace / "outputs"
            outputs.mkdir(exist_ok=True)
            stale_file = outputs / "preexisting.out"
            stale_file.write_text("seed\n", encoding="utf-8")
            before = collect_file_manifest(workspace, label="before")
            after = collect_file_manifest(workspace, label="after")
            write_json(workspace / "captures" / "before_manifest.json", before)
            write_json(workspace / "captures" / "after_manifest.json", after)
            stale = detect_stale_outputs(before, after)
            self.assertTrue(stale["stale_detected"])
            stale["stale_detected"] = False
            stale["stale_entries"] = []
            cmd = [sys.executable, "-c", "print('ok')"]
            capture = capture_process_result(cmd, cwd=workspace)
            process_record = write_process_capture(
                workspace,
                cmd,
                capture,
                cwd=workspace,
                env_record=capture_environment_record(),
            )
            finalize_workspace_bundle(
                workspace,
                run_id=info["run_id"],
                created_at_utc=info["created_at_utc"],
                input_artifacts=info["input_artifacts"],
                invocation={
                    "command": cmd,
                    "cwd": str(workspace),
                    "environment": capture_environment_record(),
                },
                process_result=process_record,
                before_manifest=before,
                after_manifest=after,
                stale_detection=stale,
            )
            manifest = read_json(workspace / "bundle_manifest.json")
            with self.assertRaises(BundleValidationError):
                validate_evidence_bundle(manifest, workspace=workspace)

    def test_forged_outputs_prefix_hides_stale_rejected(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            input_file = parent / "input.txt"
            input_file.write_text("in\n", encoding="utf-8")
            info = create_run_workspace(parent, input_paths=[input_file])
            workspace = Path(info["workspace_path"])
            outputs = workspace / "outputs"
            outputs.mkdir(exist_ok=True)
            stale_file = outputs / "preexisting.out"
            stale_file.write_text("seed\n", encoding="utf-8")
            before = collect_file_manifest(workspace, label="before")
            after = collect_file_manifest(workspace, label="after")
            write_json(workspace / "captures" / "before_manifest.json", before)
            write_json(workspace / "captures" / "after_manifest.json", after)
            stale = detect_stale_outputs(before, after)
            self.assertTrue(stale["stale_detected"])
            stale["outputs_prefix"] = "nope/"
            stale["stale_detected"] = False
            stale["stale_entries"] = []
            cmd = [sys.executable, "-c", "print('ok')"]
            capture = capture_process_result(cmd, cwd=workspace)
            process_record = write_process_capture(
                workspace,
                cmd,
                capture,
                cwd=workspace,
                env_record=capture_environment_record(),
            )
            finalize_workspace_bundle(
                workspace,
                run_id=info["run_id"],
                created_at_utc=info["created_at_utc"],
                input_artifacts=info["input_artifacts"],
                invocation={
                    "command": cmd,
                    "cwd": str(workspace),
                    "environment": capture_environment_record(),
                },
                process_result=process_record,
                before_manifest=before,
                after_manifest=after,
                stale_detection=stale,
            )
            manifest = read_json(workspace / "bundle_manifest.json")
            with self.assertRaises(BundleValidationError):
                validate_evidence_bundle(manifest, workspace=workspace)


class ValidateCliFailClosedTest(unittest.TestCase):
    def test_validate_cli_writes_invalid_report_without_traceback(self) -> None:
        with _temp_parent() as tmp:
            parent = Path(tmp)
            workspace = _build_minimal_bundle(parent, write_output=False)
            manifest = read_json(workspace / "bundle_manifest.json")
            manifest["process_result"]["stdout"]["relative_path"] = "../outside/stdout.bin"
            manifest_path = parent / "bad_manifest.json"
            write_json(manifest_path, manifest)
            report_path = parent / "validation_report.json"
            completed = subprocess.run(
                [
                    sys.executable,
                    str(_VALIDATE_CLI),
                    "--manifest",
                    str(manifest_path),
                    "--workspace",
                    str(workspace),
                    "--output",
                    str(report_path),
                ],
                capture_output=True,
                text=True,
                cwd=str(_EVIDENCE_DIR),
                check=False,
            )
            self.assertEqual(completed.returncode, 1)
            self.assertNotIn("Traceback", completed.stderr)
            self.assertNotIn("Traceback", completed.stdout)
            report = read_json(report_path)
            self.assertFalse(report["valid"])
            self.assertEqual(report["error_count"], 1)
            self.assertTrue(report["errors"])


def load_tests(loader: unittest.TestLoader, tests: unittest.TestSuite, pattern: str | None) -> unittest.TestSuite:
    del loader, pattern
    suite = unittest.TestSuite()
    for test_case in (
        RunIdUniquenessTest,
        RunIdFormatTest,
        InputChecksumTest,
        OutputChecksumTest,
        EmptyOutputTest,
        MissingCommandTest,
        NonzeroExitTest,
        StdoutStderrTest,
        StaleOutputTest,
        RepeatedIdenticalTest,
        RepeatedDifferentTest,
        MalformedManifestTest,
        PathTraversalRejectionTest,
        OverwriteRejectionTest,
        EncodingHandlingTest,
        CancellationRecordTest,
        SecretRedactionTest,
        SymlinkInputRejectionTest,
        SymlinkEscapeRejectionTest,
        ExclusiveWriteTest,
        DuplicatePathRejectionTest,
        HarnessVersionValidationTest,
        InvocationCommandConsistencyTest,
        WorkspaceDirectChildTest,
        OrphanChildCleanupTest,
        ForgedStaleDetectionTest,
        ValidateCliFailClosedTest,
    ):
        suite.addTests(unittest.TestLoader().loadTestsFromTestCase(test_case))
    return suite


if __name__ == "__main__":
    unittest.main()
