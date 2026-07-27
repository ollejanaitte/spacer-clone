"""Shared core for the Apollo evidence acquisition harness (EA-01)."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import platform
import re
import secrets
import shutil
import signal
import stat
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

SCHEMA_VERSION = "apollo.evidence.bundle.v1"
HARNESS_VERSION = "1.0.0"
RUN_ID_HEX_LEN = 64
RUN_ID_PATTERN = re.compile(r"^[0-9a-f]{64}$")

WORKSPACE_DIRS = (
    "inputs",
    "outputs",
    "captures",
    "summaries",
)

OUTPUTS_PREFIX = "outputs/"

BUNDLE_MANIFEST_NAME = "bundle_manifest.json"
ENVIRONMENT_NAME = "environment.json"
PROCESS_RESULT_NAME = "process_result.json"
BEFORE_MANIFEST_NAME = "before_manifest.json"
AFTER_MANIFEST_NAME = "after_manifest.json"
STDOUT_NAME = "stdout.bin"
STDERR_NAME = "stderr.bin"
SUMMARY_JSON_NAME = "evidence_summary.json"
SUMMARY_CSV_NAME = "evidence_summary.csv"

DEFAULT_ENV_ALLOWLIST = frozenset(
    {
        "HOME",
        "LANG",
        "LC_ALL",
        "LC_CTYPE",
        "LC_MESSAGES",
        "LC_NUMERIC",
        "PATH",
        "PWD",
        "SHELL",
        "TERM",
        "TZ",
        "USER",
        "USERNAME",
        "LOGNAME",
    }
)

SECRET_ENV_PATTERNS = (
    "PASSWORD",
    "SECRET",
    "TOKEN",
    "API_KEY",
    "APIKEY",
    "CREDENTIAL",
    "PRIVATE_KEY",
    "AUTH",
    "BEARER",
    "LICENSE_KEY",
    "ACCESS_KEY",
)

NORMALIZED_METADATA_FIELDS = frozenset(
    {
        "run_id",
        "created_at_utc",
        "completed_at_utc",
        "started_at_utc",
        "ended_at_utc",
        "workspace_path",
        "captured_at_utc",
        "evaluated_at_utc",
        "compared_at_utc",
        "root_path",
        "source_path",
        "mtime_utc",
        "label",
    }
)

_PROCESS_CLEANUP_GRACE_SECONDS = 0.5


class BundleValidationError(ValueError):
    """Raised when an evidence bundle fails semantic validation."""


class PathSafetyError(ValueError):
    """Raised when a path would escape the workspace or traverse symlinks."""


class WorkspaceExistsError(FileExistsError):
    """Raised when a run workspace would overwrite an existing directory."""


class ExclusiveWriteError(FileExistsError):
    """Raised when an evidence artifact would overwrite an existing file."""


@dataclass(frozen=True)
class ProcessCaptureResult:
    exit_code: int
    stdout_bytes: bytes
    stderr_bytes: bytes
    started_at_utc: str
    ended_at_utc: str
    cancelled: bool
    timeout_seconds: float | None
    cancellation_reason: str | None
    cleanup_attempted: bool = False
    cleanup_succeeded: bool = False
    cleanup_detail: str | None = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def generate_run_id() -> str:
    return secrets.token_hex(32)


def validate_run_id(run_id: str) -> str:
    if not isinstance(run_id, str):
        raise ValueError(f"run_id must be a string, got {type(run_id).__name__}")
    if not RUN_ID_PATTERN.fullmatch(run_id):
        raise ValueError(
            f"run_id must be exactly {RUN_ID_HEX_LEN} lowercase hex characters: {run_id!r}"
        )
    return run_id


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utf8_safe_summary(data: bytes, max_chars: int = 4096) -> str:
    text = data.decode("utf-8", errors="replace")
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3] + "..."


def _reject_unsafe_relative(relative: str, *, context: str) -> None:
    if not isinstance(relative, str) or not relative:
        raise PathSafetyError(f"{context}: relative path must be a non-empty string")
    if "\0" in relative:
        raise PathSafetyError(f"{context}: path contains NUL byte")
    if relative.startswith(("/", "\\")) or (len(relative) > 1 and relative[1] == ":"):
        raise PathSafetyError(f"{context}: absolute path rejected: {relative}")
    parts = Path(relative).parts
    if ".." in parts:
        raise PathSafetyError(f"{context}: path traversal rejected: {relative}")


def resolve_within_root(root: Path, candidate: Path | str) -> Path:
    root_resolved = root.resolve()
    if isinstance(candidate, str):
        _reject_unsafe_relative(candidate, context="resolve_within_root")
        target = (root / candidate).resolve()
    else:
        if candidate.is_absolute():
            raise PathSafetyError(f"absolute path rejected: {candidate}")
        parts = candidate.parts
        if ".." in parts:
            raise PathSafetyError(f"path traversal rejected: {candidate}")
        target = (root / candidate).resolve()

    try:
        target.relative_to(root_resolved)
    except ValueError as exc:
        raise PathSafetyError(f"path escapes workspace root: {candidate}") from exc
    return target


def resolve_workspace_artifact_path(workspace_root: Path, relative_path: str) -> Path:
    _reject_unsafe_relative(relative_path, context="workspace artifact")
    return assert_safe_existing_path(workspace_root, workspace_root / relative_path)


def assert_safe_existing_path(root: Path, path: Path) -> Path:
    root_resolved = root.resolve()
    if path.is_symlink():
        link_target = path.readlink()
        if link_target.is_absolute() or ".." in link_target.parts:
            raise PathSafetyError(f"symlink escape rejected: {path} -> {link_target}")
        resolved_target = (path.parent / link_target).resolve()
        try:
            resolved_target.relative_to(root_resolved)
        except ValueError as exc:
            raise PathSafetyError(f"symlink target escapes workspace: {path}") from exc
        return resolved_target

    resolved = path.resolve()
    try:
        resolved.relative_to(root_resolved)
    except ValueError as exc:
        raise PathSafetyError(f"path escapes workspace root: {path}") from exc
    return resolved


def assert_regular_file(path: Path) -> None:
    if path.is_symlink():
        raise PathSafetyError(f"symlink rejected: {path}")
    try:
        mode = path.lstat().st_mode
    except OSError as exc:
        raise FileNotFoundError(f"file not found: {path}") from exc
    if not stat.S_ISREG(mode):
        raise ValueError(f"not a regular file: {path}")


def validate_workspace_is_direct_child(base_dir: Path, workspace: Path, run_id: str) -> None:
    validate_run_id(run_id)
    base_resolved = base_dir.resolve()
    workspace_resolved = workspace.resolve()
    if workspace_resolved.parent != base_resolved:
        raise PathSafetyError(
            f"workspace must be a direct child of base_dir: {workspace_resolved} not under {base_resolved}"
        )
    if workspace_resolved.name != run_id:
        raise PathSafetyError(
            f"workspace directory name must equal run_id: {workspace_resolved.name!r} != {run_id!r}"
        )


def write_bytes_exclusive(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("xb") as handle:
            handle.write(data)
    except FileExistsError as exc:
        raise ExclusiveWriteError(f"refusing to overwrite existing file: {path}") from exc


def write_text_exclusive(path: Path, text: str) -> None:
    write_bytes_exclusive(path, text.encode("utf-8"))


def write_json(path: Path, payload: Mapping[str, Any]) -> None:
    text = json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False)
    write_text_exclusive(path, text + "\n")


def read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise BundleValidationError(f"malformed JSON manifest: {path}") from exc
    if not isinstance(payload, dict):
        raise BundleValidationError(f"manifest root must be an object: {path}")
    return payload


def software_identity() -> dict[str, str]:
    return {
        "harness_version": HARNESS_VERSION,
        "python_version": platform.python_version(),
        "python_implementation": platform.python_implementation(),
        "platform_system": platform.system(),
        "platform_release": platform.release(),
        "platform_machine": platform.machine(),
        "platform_version": platform.version(),
    }


def _matches_secret_pattern(key: str) -> bool:
    upper = key.upper()
    return any(pattern in upper for pattern in SECRET_ENV_PATTERNS)


def redact_environment(
    environ: Mapping[str, str] | None = None,
    *,
    allowlist: Iterable[str] | None = None,
) -> dict[str, str]:
    source = dict(os.environ if environ is None else environ)
    allowed = set(DEFAULT_ENV_ALLOWLIST if allowlist is None else allowlist)
    captured: dict[str, str] = {}
    for key in sorted(source):
        if _matches_secret_pattern(key):
            captured[key] = "[REDACTED]"
            continue
        if key in allowed:
            captured[key] = source[key]
    return captured


def capture_environment_record(
    *,
    extra_allowlist: Iterable[str] | None = None,
) -> dict[str, Any]:
    allowlist = set(DEFAULT_ENV_ALLOWLIST)
    if extra_allowlist is not None:
        allowlist.update(extra_allowlist)
    return {
        "captured_at_utc": utc_now_iso(),
        "software_identity": software_identity(),
        "environment_allowlist": sorted(allowlist),
        "environment": redact_environment(allowlist=allowlist),
    }


def create_run_workspace(
    base_dir: Path | str,
    *,
    run_id: str | None = None,
    input_paths: Sequence[Path | str] | None = None,
) -> dict[str, Any]:
    base = Path(base_dir)
    if base.is_absolute() is False:
        base = base.resolve()
    base.mkdir(parents=True, exist_ok=True)

    resolved_run_id = validate_run_id(run_id) if run_id is not None else generate_run_id()
    workspace = base / resolved_run_id
    if workspace.exists():
        raise WorkspaceExistsError(f"run workspace already exists: {workspace}")
    validate_workspace_is_direct_child(base, workspace, resolved_run_id)

    workspace.mkdir(parents=False, exist_ok=False)
    for dirname in WORKSPACE_DIRS:
        (workspace / dirname).mkdir(parents=True, exist_ok=True)

    workspace_root = workspace.resolve()
    copied_inputs: list[dict[str, Any]] = []
    seen_relative: set[str] = set()
    if input_paths:
        for raw_input in input_paths:
            source = Path(raw_input)
            if not source.exists():
                raise FileNotFoundError(f"input not found: {source}")
            assert_regular_file(source)
            destination_name = source.name
            workspace_relative = f"inputs/{destination_name}"
            if workspace_relative in seen_relative:
                raise BundleValidationError(
                    f"duplicate workspace_relative_path in inputs: {workspace_relative}"
                )
            seen_relative.add(workspace_relative)
            destination = resolve_within_root(workspace_root, workspace_relative)
            if destination.exists():
                raise WorkspaceExistsError(f"input destination already exists: {destination}")
            shutil.copy2(source, destination)
            destination.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
            copied_inputs.append(
                {
                    "source_path": str(source.resolve()),
                    "workspace_relative_path": workspace_relative,
                    "sha256": sha256_file(destination),
                    "size_bytes": destination.stat().st_size,
                    "read_only": True,
                }
            )

    record = {
        "run_id": resolved_run_id,
        "created_at_utc": utc_now_iso(),
        "workspace_path": str(workspace_root),
        "input_artifacts": copied_inputs,
    }
    return record


def _manifest_entries_with_duplicates_check(
    entries: list[dict[str, Any]],
) -> None:
    seen: set[str] = set()
    for entry in entries:
        relative = entry.get("relative_path")
        if not isinstance(relative, str) or not relative:
            raise BundleValidationError("manifest entry missing relative_path")
        if relative in seen:
            raise BundleValidationError(f"duplicate relative_path in manifest: {relative}")
        seen.add(relative)


def collect_file_manifest(root: Path | str, *, label: str | None = None) -> dict[str, Any]:
    root_path = Path(root)
    if not root_path.exists():
        raise FileNotFoundError(f"manifest root not found: {root_path}")
    root_resolved = root_path.resolve()
    entries: list[dict[str, Any]] = []
    for current_root, dirnames, filenames in os.walk(root_path):
        dirnames.sort()
        filenames.sort()
        current = Path(current_root)
        for name in filenames:
            file_path = current / name
            if file_path.is_symlink():
                raise PathSafetyError(f"symlink in manifest tree rejected: {file_path}")
            resolved = assert_safe_existing_path(root_resolved, file_path)
            relative = resolved.relative_to(root_resolved).as_posix()
            _reject_unsafe_relative(relative, context="manifest entry")
            stat_result = resolved.stat()
            entries.append(
                {
                    "relative_path": relative,
                    "sha256": sha256_file(resolved),
                    "size_bytes": stat_result.st_size,
                    "mtime_utc": datetime.fromtimestamp(
                        stat_result.st_mtime, tz=timezone.utc
                    )
                    .replace(microsecond=0)
                    .isoformat()
                    .replace("+00:00", "Z"),
                }
            )
    entries.sort(key=lambda item: item["relative_path"])
    _manifest_entries_with_duplicates_check(entries)
    return {
        "label": label or root_resolved.name,
        "root_path": str(root_resolved),
        "captured_at_utc": utc_now_iso(),
        "entries": entries,
    }


def hash_artifacts(paths: Sequence[Path | str]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for raw in paths:
        path = Path(raw)
        if not path.exists():
            raise FileNotFoundError(f"artifact not found: {path}")
        assert_regular_file(path)
        records.append(
            {
                "path": str(path.resolve()),
                "sha256": sha256_file(path),
                "size_bytes": path.stat().st_size,
            }
        )
    records.sort(key=lambda item: item["path"])
    return records


def _terminate_process_group(
    proc: subprocess.Popen[bytes],
    *,
    grace_seconds: float = _PROCESS_CLEANUP_GRACE_SECONDS,
) -> tuple[bool, bool, str]:
    """Terminate only the spawned process group. Returns attempted, succeeded, detail."""
    if proc.poll() is not None:
        return False, True, "process already exited"

    cleanup_attempted = True
    detail_parts: list[str] = []

    if sys.platform == "win32":
        proc.terminate()
        detail_parts.append("terminate")
        try:
            proc.wait(timeout=grace_seconds)
            return cleanup_attempted, True, ";".join(detail_parts)
        except subprocess.TimeoutExpired:
            proc.kill()
            detail_parts.append("kill")
            try:
                proc.wait(timeout=grace_seconds)
                return cleanup_attempted, True, ";".join(detail_parts)
            except subprocess.TimeoutExpired:
                return cleanup_attempted, False, ";".join(detail_parts) + ";wait_timeout"

    pgid: int | None
    try:
        pgid = os.getpgid(proc.pid)
    except OSError as exc:
        detail_parts.append(f"getpgid_failed:{exc}")
        pgid = None

    if pgid is not None:
        try:
            os.killpg(pgid, signal.SIGTERM)
            detail_parts.append("sigterm_pgid")
        except OSError as exc:
            detail_parts.append(f"sigterm_pgid_failed:{exc}")
            try:
                proc.terminate()
                detail_parts.append("terminate_fallback")
            except OSError as term_exc:
                detail_parts.append(f"terminate_failed:{term_exc}")
    else:
        try:
            proc.terminate()
            detail_parts.append("terminate")
        except OSError as exc:
            detail_parts.append(f"terminate_failed:{exc}")

    deadline = time.monotonic() + grace_seconds
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            return cleanup_attempted, True, ";".join(detail_parts)

    if pgid is not None:
        try:
            os.killpg(pgid, signal.SIGKILL)
            detail_parts.append("sigkill_pgid")
        except OSError as exc:
            detail_parts.append(f"sigkill_pgid_failed:{exc}")
            try:
                proc.kill()
                detail_parts.append("kill_fallback")
            except OSError as kill_exc:
                detail_parts.append(f"kill_failed:{kill_exc}")
    else:
        try:
            proc.kill()
            detail_parts.append("kill")
        except OSError as exc:
            detail_parts.append(f"kill_failed:{exc}")

    try:
        proc.wait(timeout=grace_seconds)
        return cleanup_attempted, proc.poll() is not None, ";".join(detail_parts)
    except subprocess.TimeoutExpired:
        detail_parts.append("wait_timeout")
        return cleanup_attempted, False, ";".join(detail_parts)


def capture_process_result(
    command: Sequence[str],
    *,
    cwd: Path | str | None = None,
    env: Mapping[str, str] | None = None,
    timeout_seconds: float | None = None,
) -> ProcessCaptureResult:
    if not command:
        raise ValueError("command is required")

    started = utc_now_iso()
    cancelled = False
    cancellation_reason: str | None = None
    cleanup_attempted = False
    cleanup_succeeded = False
    cleanup_detail: str | None = None
    stdout_bytes = b""
    stderr_bytes = b""
    exit_code = 1

    popen_kwargs: dict[str, Any] = {
        "stdout": subprocess.PIPE,
        "stderr": subprocess.PIPE,
        "cwd": str(cwd) if cwd is not None else None,
        "env": dict(env) if env is not None else None,
    }
    if sys.platform == "win32":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
    else:
        popen_kwargs["start_new_session"] = True

    proc = subprocess.Popen(list(command), **popen_kwargs)
    try:
        stdout_bytes, stderr_bytes = proc.communicate(timeout=timeout_seconds)
        exit_code = int(proc.returncode if proc.returncode is not None else 1)
    except subprocess.TimeoutExpired:
        cancelled = True
        cancellation_reason = "timeout"
        exit_code = 124
        cleanup_attempted, cleanup_succeeded, cleanup_detail = _terminate_process_group(proc)
        try:
            stdout_bytes, stderr_bytes = proc.communicate(timeout=_PROCESS_CLEANUP_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            stdout_bytes = proc.stdout.read() if proc.stdout is not None else b""
            stderr_bytes = proc.stderr.read() if proc.stderr is not None else b""
        if timeout_seconds is not None:
            stderr_bytes = stderr_bytes + (
                f"\n[evidence harness] process exceeded timeout of {timeout_seconds}s\n"
            ).encode("utf-8")
    finally:
        if proc.stdout is not None:
            proc.stdout.close()
        if proc.stderr is not None:
            proc.stderr.close()
        if proc.poll() is None:
            attempted, succeeded, detail = _terminate_process_group(proc)
            cleanup_attempted = cleanup_attempted or attempted
            if not cleanup_succeeded:
                cleanup_succeeded = succeeded
            if detail:
                cleanup_detail = detail if cleanup_detail is None else f"{cleanup_detail};{detail}"

    ended = utc_now_iso()
    return ProcessCaptureResult(
        exit_code=exit_code,
        stdout_bytes=stdout_bytes or b"",
        stderr_bytes=stderr_bytes or b"",
        started_at_utc=started,
        ended_at_utc=ended,
        cancelled=cancelled,
        timeout_seconds=timeout_seconds,
        cancellation_reason=cancellation_reason,
        cleanup_attempted=cleanup_attempted,
        cleanup_succeeded=cleanup_succeeded,
        cleanup_detail=cleanup_detail,
    )


def write_process_capture(
    workspace: Path,
    command: Sequence[str],
    capture: ProcessCaptureResult,
    *,
    cwd: Path | str | None = None,
    env_record: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    workspace_root = workspace.resolve()
    captures_dir = workspace_root / "captures"
    captures_dir.mkdir(parents=True, exist_ok=True)

    stdout_path = captures_dir / STDOUT_NAME
    stderr_path = captures_dir / STDERR_NAME
    process_result_path = captures_dir / PROCESS_RESULT_NAME
    for existing in (stdout_path, stderr_path, process_result_path):
        if existing.exists():
            raise ExclusiveWriteError(f"refusing to overwrite existing capture file: {existing}")

    write_bytes_exclusive(stdout_path, capture.stdout_bytes)
    write_bytes_exclusive(stderr_path, capture.stderr_bytes)

    resolved_cwd = str(Path(cwd).resolve()) if cwd is not None else str(workspace_root)
    record = {
        "command": list(command),
        "cwd": resolved_cwd,
        "environment": env_record or {},
        "started_at_utc": capture.started_at_utc,
        "ended_at_utc": capture.ended_at_utc,
        "exit_code": capture.exit_code,
        "cancelled": capture.cancelled,
        "timeout_seconds": capture.timeout_seconds,
        "cancellation_reason": capture.cancellation_reason,
        "cleanup_attempted": capture.cleanup_attempted,
        "cleanup_succeeded": capture.cleanup_succeeded,
        "cleanup_detail": capture.cleanup_detail,
        "stdout": {
            "relative_path": f"captures/{STDOUT_NAME}",
            "sha256": sha256_bytes(capture.stdout_bytes),
            "size_bytes": len(capture.stdout_bytes),
            "utf8_summary": utf8_safe_summary(capture.stdout_bytes),
        },
        "stderr": {
            "relative_path": f"captures/{STDERR_NAME}",
            "sha256": sha256_bytes(capture.stderr_bytes),
            "size_bytes": len(capture.stderr_bytes),
            "utf8_summary": utf8_safe_summary(capture.stderr_bytes),
        },
    }
    write_json(process_result_path, record)
    return record


def manifest_index(manifest: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    entries = manifest.get("entries")
    if not isinstance(entries, list):
        raise BundleValidationError("manifest entries must be a list")
    index: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise BundleValidationError("manifest entry must be an object")
        relative = entry.get("relative_path")
        if not isinstance(relative, str) or not relative:
            raise BundleValidationError("manifest entry missing relative_path")
        if relative in index:
            raise BundleValidationError(f"duplicate relative_path in manifest: {relative}")
        index[relative] = entry
    return index


def detect_stale_outputs(
    before_manifest: Mapping[str, Any],
    after_manifest: Mapping[str, Any],
    *,
    outputs_prefix: str = OUTPUTS_PREFIX,
) -> dict[str, Any]:
    before_index = manifest_index(before_manifest)
    after_index = manifest_index(after_manifest)
    stale_entries: list[dict[str, Any]] = []
    for relative, before_entry in before_index.items():
        if not relative.startswith(outputs_prefix):
            continue
        after_entry = after_index.get(relative)
        if after_entry is None:
            continue
        if before_entry.get("sha256") == after_entry.get("sha256"):
            stale_entries.append(
                {
                    "relative_path": relative,
                    "sha256": before_entry.get("sha256"),
                    "reason": "unchanged_since_before_manifest",
                }
            )
    return {
        "evaluated_at_utc": utc_now_iso(),
        "outputs_prefix": outputs_prefix,
        "stale_detected": bool(stale_entries),
        "stale_entries": stale_entries,
    }


def normalize_for_comparison(payload: Any) -> Any:
    if isinstance(payload, dict):
        normalized: dict[str, Any] = {}
        for key, value in payload.items():
            if key in NORMALIZED_METADATA_FIELDS:
                continue
            normalized[key] = normalize_for_comparison(value)
        return normalized
    if isinstance(payload, list):
        return [normalize_for_comparison(item) for item in payload]
    return payload


def _cwd_projection(bundle: Mapping[str, Any], process: Mapping[str, Any], invocation: Mapping[str, Any]) -> str:
    workspace_path = bundle.get("workspace_path")
    cwd = process.get("cwd")
    if not isinstance(cwd, str):
        cwd = invocation.get("cwd")
    if not isinstance(cwd, str):
        return ""
    if isinstance(workspace_path, str) and workspace_path:
        try:
            if Path(cwd).resolve() == Path(workspace_path).resolve():
                return "workspace"
        except OSError:
            pass
    return cwd


def comparison_projection(bundle: Mapping[str, Any]) -> dict[str, Any]:
    """Extract reproducibility-relevant fields for repeated-run comparison."""
    process = bundle.get("process_result", {})
    if not isinstance(process, dict):
        process = {}
    invocation = bundle.get("invocation", {})
    if not isinstance(invocation, dict):
        invocation = {}

    def artifact_pairs(key: str) -> list[tuple[str, str]]:
        artifacts = bundle.get(key, [])
        if not isinstance(artifacts, list):
            return []
        pairs: list[tuple[str, str]] = []
        for artifact in artifacts:
            if not isinstance(artifact, dict):
                continue
            relative = artifact.get("workspace_relative_path")
            digest = artifact.get("sha256")
            if isinstance(relative, str) and isinstance(digest, str):
                pairs.append((relative, digest))
        pairs.sort()
        return pairs

    software = bundle.get("software_identity", {})
    if not isinstance(software, dict):
        software = {}

    command = process.get("command")
    if not isinstance(command, list):
        command = invocation.get("command")
    if not isinstance(command, list):
        command = []

    cwd = _cwd_projection(bundle, process, invocation)

    return {
        "command": command,
        "cwd": cwd,
        "harness_version": bundle.get("harness_version"),
        "software_identity": software,
        "exit_code": process.get("exit_code"),
        "cancelled": process.get("cancelled", False),
        "cancellation_reason": process.get("cancellation_reason"),
        "stdout_sha256": (process.get("stdout") or {}).get("sha256"),
        "stderr_sha256": (process.get("stderr") or {}).get("sha256"),
        "input_artifacts": artifact_pairs("input_artifacts"),
        "output_artifacts": artifact_pairs("output_artifacts"),
        "stale_detected": (bundle.get("stale_detection") or {}).get("stale_detected", False),
    }


def compare_repeated_runs(
    bundle_a: Mapping[str, Any],
    bundle_b: Mapping[str, Any],
) -> dict[str, Any]:
    projected_a = comparison_projection(bundle_a)
    projected_b = comparison_projection(bundle_b)
    identical = projected_a == projected_b
    verdict = "deterministic" if identical else "nondeterministic"
    differences: list[str] = []
    if not identical:
        keys_a = set(projected_a.keys())
        keys_b = set(projected_b.keys())
        for key in sorted(keys_a.symmetric_difference(keys_b)):
            differences.append(f"top_level_key:{key}")
        for key in sorted(keys_a.intersection(keys_b)):
            if projected_a[key] != projected_b[key]:
                differences.append(f"field:{key}")
    return {
        "compared_at_utc": utc_now_iso(),
        "verdict": verdict,
        "deterministic": identical,
        "differences": differences,
        "normalization_policy": [
            "compare_command_argv",
            "compare_cwd_policy",
            "compare_harness_version_and_software_identity",
            "compare_exit_code",
            "compare_stream_sha256",
            "compare_input_output_artifact_sha256",
            "compare_stale_detected",
            "ignore_run_metadata_and_workspace_paths",
        ],
        "projection_a": projected_a,
        "projection_b": projected_b,
    }


def _require_string(payload: Mapping[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise BundleValidationError(f"missing or invalid string field: {key}")
    return value


def _require_list(payload: Mapping[str, Any], key: str) -> list[Any]:
    value = payload.get(key)
    if not isinstance(value, list):
        raise BundleValidationError(f"missing or invalid list field: {key}")
    return value


def _validate_sha256_field(value: Any, field_name: str) -> None:
    if not isinstance(value, str) or not RUN_ID_PATTERN.fullmatch(value):
        raise BundleValidationError(f"{field_name} must be a 64-char lowercase hex sha256")


def _path_safety_as_validation_error(exc: PathSafetyError) -> BundleValidationError:
    return BundleValidationError(str(exc))


def _validate_manifest_section(section: Any, label: str) -> list[dict[str, Any]]:
    if not isinstance(section, dict):
        raise BundleValidationError(f"manifests.{label} must be an object")
    for field in ("label", "root_path", "captured_at_utc", "entries"):
        if field not in section:
            raise BundleValidationError(f"manifests.{label}.{field} is required")
    entries = section.get("entries")
    if not isinstance(entries, list):
        raise BundleValidationError(f"manifests.{label}.entries must be a list")
    manifest_index(section)
    validated_entries: list[dict[str, Any]] = []
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise BundleValidationError(f"manifests.{label}.entries[{index}] must be an object")
        relative = _require_string(entry, "relative_path")
        try:
            _reject_unsafe_relative(relative, context=f"manifests.{label}.entries[{index}]")
        except PathSafetyError as exc:
            raise _path_safety_as_validation_error(exc) from exc
        _validate_sha256_field(entry.get("sha256"), f"manifests.{label}.entries[{index}].sha256")
        size_bytes = entry.get("size_bytes")
        if not isinstance(size_bytes, int) or size_bytes < 0:
            raise BundleValidationError(
                f"manifests.{label}.entries[{index}].size_bytes must be a non-negative integer"
            )
        _require_string(entry, "mtime_utc")
        validated_entries.append(entry)
    return validated_entries


def _validate_artifact_list(
    artifacts: Any,
    label: str,
) -> list[dict[str, Any]]:
    if not isinstance(artifacts, list):
        raise BundleValidationError(f"{label} must be a list")
    seen: set[str] = set()
    validated: list[dict[str, Any]] = []
    for index, artifact in enumerate(artifacts):
        if not isinstance(artifact, dict):
            raise BundleValidationError(f"{label}[{index}] must be an object")
        relative = artifact.get("workspace_relative_path")
        if not isinstance(relative, str) or not relative:
            raise BundleValidationError(f"{label}[{index}].workspace_relative_path is required")
        try:
            _reject_unsafe_relative(relative, context=f"{label}[{index}]")
        except PathSafetyError as exc:
            raise _path_safety_as_validation_error(exc) from exc
        if relative in seen:
            raise BundleValidationError(f"duplicate workspace_relative_path in {label}: {relative}")
        seen.add(relative)
        _validate_sha256_field(artifact.get("sha256"), f"{label}[{index}].sha256")
        size_bytes = artifact.get("size_bytes")
        if not isinstance(size_bytes, int) or size_bytes < 0:
            raise BundleValidationError(f"{label}[{index}].size_bytes must be a non-negative integer")
        if label == "input_artifacts":
            for required in ("source_path", "read_only"):
                if required not in artifact:
                    raise BundleValidationError(f"{label}[{index}].{required} is required")
        validated.append(artifact)
    return validated


def _validate_stream(stream: Any, label: str) -> dict[str, Any]:
    if not isinstance(stream, dict):
        raise BundleValidationError(f"{label} must be an object")
    relative = stream.get("relative_path")
    if not isinstance(relative, str) or not relative:
        raise BundleValidationError(f"{label}.relative_path is required")
    try:
        _reject_unsafe_relative(relative, context=label)
    except PathSafetyError as exc:
        raise _path_safety_as_validation_error(exc) from exc
    _validate_sha256_field(stream.get("sha256"), f"{label}.sha256")
    size_bytes = stream.get("size_bytes")
    if not isinstance(size_bytes, int) or size_bytes < 0:
        raise BundleValidationError(f"{label}.size_bytes must be a non-negative integer")
    if "utf8_summary" not in stream or not isinstance(stream["utf8_summary"], str):
        raise BundleValidationError(f"{label}.utf8_summary is required")
    return stream


def validate_evidence_bundle(manifest: Mapping[str, Any], *, workspace: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []

    def fail(message: str) -> None:
        errors.append(message)

    schema_version = manifest.get("schema_version")
    if schema_version != SCHEMA_VERSION:
        fail(f"schema_version must be {SCHEMA_VERSION!r}")

    harness_version = manifest.get("harness_version")
    if not isinstance(harness_version, str) or not harness_version.strip():
        fail("harness_version is required")
    elif harness_version != HARNESS_VERSION:
        fail(f"harness_version must be {HARNESS_VERSION!r}")

    try:
        run_id = _require_string(manifest, "run_id")
        validate_run_id(run_id)
    except (BundleValidationError, ValueError) as exc:
        fail(str(exc))
        run_id = ""

    for field in ("created_at_utc", "completed_at_utc"):
        try:
            _require_string(manifest, field)
        except BundleValidationError as exc:
            fail(str(exc))

    workspace_path_value = manifest.get("workspace_path")
    workspace_path = None
    if not isinstance(workspace_path_value, str) or not workspace_path_value:
        fail("workspace_path must be a non-empty string")
    else:
        workspace_path = Path(workspace_path_value)
        if workspace is not None and workspace.resolve() != workspace_path.resolve():
            fail("workspace_path does not match supplied workspace directory")
        if run_id:
            try:
                validate_workspace_is_direct_child(workspace_path.parent, workspace_path, run_id)
            except (PathSafetyError, ValueError) as exc:
                fail(str(exc))

    software = manifest.get("software_identity")
    if not isinstance(software, dict):
        fail("software_identity must be an object")
    else:
        for field in (
            "harness_version",
            "python_version",
            "python_implementation",
            "platform_system",
            "platform_release",
            "platform_machine",
            "platform_version",
        ):
            if not isinstance(software.get(field), str) or not software.get(field):
                fail(f"software_identity.{field} is required")
        if software.get("harness_version") != HARNESS_VERSION:
            fail(f"software_identity.harness_version must be {HARNESS_VERSION!r}")

    invocation = manifest.get("invocation")
    invocation_command: list[str] | None = None
    if not isinstance(invocation, dict):
        fail("invocation must be an object")
    else:
        command = invocation.get("command")
        if not isinstance(command, list) or not command:
            fail("invocation.command must be a non-empty list")
        elif not all(isinstance(part, str) for part in command):
            fail("invocation.command entries must be strings")
        else:
            invocation_command = list(command)
        if not isinstance(invocation.get("cwd"), str) or not invocation.get("cwd"):
            fail("invocation.cwd must be a non-empty string")
        if not isinstance(invocation.get("environment"), dict):
            fail("invocation.environment must be an object")

    process_result: dict[str, Any] | None = None
    process_command: list[str] | None = None
    proc = manifest.get("process_result")
    if not isinstance(proc, dict):
        fail("process_result must be an object")
    else:
        process_result = proc
        proc_command = proc.get("command")
        if not isinstance(proc_command, list) or not proc_command:
            fail("process_result.command must be a non-empty list")
        elif not all(isinstance(part, str) for part in proc_command):
            fail("process_result.command entries must be strings")
        else:
            process_command = list(proc_command)
        if invocation_command is not None and process_command is not None and invocation_command != process_command:
            fail("invocation.command must match process_result.command")
        if not isinstance(proc.get("cwd"), str) or not proc.get("cwd"):
            fail("process_result.cwd must be a non-empty string")
        if not isinstance(proc.get("environment"), dict):
            fail("process_result.environment must be an object")
        if "exit_code" not in proc or not isinstance(proc["exit_code"], int):
            fail("process_result.exit_code must be an integer")
        if not isinstance(proc.get("cancelled"), bool):
            fail("process_result.cancelled must be a boolean")
        if not isinstance(proc.get("cleanup_attempted"), bool):
            fail("process_result.cleanup_attempted must be a boolean")
        if not isinstance(proc.get("cleanup_succeeded"), bool):
            fail("process_result.cleanup_succeeded must be a boolean")
        cleanup_attempted = proc["cleanup_attempted"]
        cleanup_succeeded = proc["cleanup_succeeded"]
        if cleanup_succeeded and not cleanup_attempted:
            fail("process_result.cleanup_succeeded cannot be true when cleanup_attempted is false")
        cancelled = proc["cancelled"]
        if cancelled:
            if not cleanup_attempted:
                fail("process_result.cleanup_attempted must be true when cancelled")
            cancellation_reason = proc.get("cancellation_reason")
            if not isinstance(cancellation_reason, str) or not cancellation_reason.strip():
                fail("process_result.cancellation_reason must be a non-empty string when cancelled")
        elif cleanup_attempted:
            fail("process_result.cleanup_attempted must be false when not cancelled")
        for field in ("started_at_utc", "ended_at_utc"):
            if not isinstance(proc.get(field), str):
                fail(f"process_result.{field} must be a string")
        for stream_name in ("stdout", "stderr"):
            try:
                _validate_stream(proc.get(stream_name), f"process_result.{stream_name}")
            except BundleValidationError as exc:
                fail(str(exc))

    input_artifacts: list[dict[str, Any]] = []
    try:
        input_artifacts = _validate_artifact_list(manifest.get("input_artifacts"), "input_artifacts")
    except BundleValidationError as exc:
        fail(str(exc))

    before_entries: list[dict[str, Any]] = []
    after_entries: list[dict[str, Any]] = []
    manifests = manifest.get("manifests")
    if not isinstance(manifests, dict):
        fail("manifests must be an object")
    else:
        for label in ("before", "after"):
            try:
                entries = _validate_manifest_section(manifests.get(label), label)
                if label == "before":
                    before_entries = entries
                else:
                    after_entries = entries
            except BundleValidationError as exc:
                fail(str(exc))

    output_artifacts: list[dict[str, Any]] = []
    try:
        output_artifacts = _validate_artifact_list(manifest.get("output_artifacts"), "output_artifacts")
    except BundleValidationError as exc:
        fail(str(exc))

    stale_detection = manifest.get("stale_detection")
    if not isinstance(stale_detection, dict):
        fail("stale_detection must be an object")
    else:
        for field in ("evaluated_at_utc", "outputs_prefix", "stale_detected", "stale_entries"):
            if field not in stale_detection:
                fail(f"stale_detection.{field} is required")
        if not isinstance(stale_detection.get("stale_detected"), bool):
            fail("stale_detection.stale_detected must be a boolean")
        stale_entries = stale_detection.get("stale_entries")
        if not isinstance(stale_entries, list):
            fail("stale_detection.stale_entries must be a list")
        outputs_prefix = stale_detection.get("outputs_prefix")
        if outputs_prefix != OUTPUTS_PREFIX:
            fail(f"stale_detection.outputs_prefix must be exactly {OUTPUTS_PREFIX!r}")

    if errors:
        raise BundleValidationError("; ".join(errors))

    embedded_before = manifests.get("before") if isinstance(manifests, dict) else None
    embedded_after = manifests.get("after") if isinstance(manifests, dict) else None
    if (
        isinstance(stale_detection, dict)
        and isinstance(embedded_before, dict)
        and isinstance(embedded_after, dict)
    ):
        try:
            recomputed = detect_stale_outputs(
                embedded_before,
                embedded_after,
                outputs_prefix=OUTPUTS_PREFIX,
            )
        except BundleValidationError as exc:
            raise BundleValidationError(str(exc)) from exc
        if stale_detection.get("stale_detected") != recomputed["stale_detected"]:
            raise BundleValidationError(
                "stale_detection.stale_detected does not match recomputation from manifests"
            )
        if stale_detection.get("stale_entries") != recomputed["stale_entries"]:
            raise BundleValidationError(
                "stale_detection.stale_entries does not match recomputation from manifests"
            )

    if workspace is not None and process_result is not None:
        workspace_root = workspace.resolve()
        manifest_path = workspace_root / BUNDLE_MANIFEST_NAME
        if not manifest_path.exists():
            raise BundleValidationError(f"missing bundle manifest file: {manifest_path}")

        before_file = workspace_root / "captures" / BEFORE_MANIFEST_NAME
        after_file = workspace_root / "captures" / AFTER_MANIFEST_NAME
        if before_file.exists() and isinstance(embedded_before, dict):
            on_disk_before = read_json(before_file)
            if on_disk_before != embedded_before:
                raise BundleValidationError("embedded before manifest does not match captures/before_manifest.json")
        if after_file.exists() and isinstance(embedded_after, dict):
            on_disk_after = read_json(after_file)
            if on_disk_after != embedded_after:
                raise BundleValidationError("embedded after manifest does not match captures/after_manifest.json")

        try:
            for artifact in input_artifacts:
                rel = artifact["workspace_relative_path"]
                file_path = resolve_workspace_artifact_path(workspace_root, rel)
                if not file_path.exists():
                    raise BundleValidationError(f"missing input artifact: {rel}")
                if not file_path.is_file():
                    raise BundleValidationError(f"input artifact is not a regular file: {rel}")
                if sha256_file(file_path) != artifact["sha256"]:
                    raise BundleValidationError(f"input checksum mismatch: {rel}")
                if file_path.stat().st_size != artifact["size_bytes"]:
                    raise BundleValidationError(f"input size mismatch: {rel}")

            for stream_name in ("stdout", "stderr"):
                stream = process_result[stream_name]
                rel = stream["relative_path"]
                file_path = resolve_workspace_artifact_path(workspace_root, rel)
                if not file_path.exists():
                    raise BundleValidationError(f"missing capture stream: {rel}")
                content = file_path.read_bytes()
                if sha256_bytes(content) != stream["sha256"]:
                    raise BundleValidationError(f"{stream_name} checksum mismatch")
                if len(content) != stream["size_bytes"]:
                    raise BundleValidationError(f"{stream_name} size mismatch")

            for artifact in output_artifacts:
                rel = artifact["workspace_relative_path"]
                file_path = resolve_workspace_artifact_path(workspace_root, rel)
                if not file_path.exists():
                    raise BundleValidationError(f"missing output artifact: {rel}")
                if sha256_file(file_path) != artifact["sha256"]:
                    raise BundleValidationError(f"output checksum mismatch: {rel}")
                if file_path.stat().st_size != artifact["size_bytes"]:
                    raise BundleValidationError(f"output size mismatch: {rel}")

            manifest_root = workspace_root
            for label, entries in (("before", before_entries), ("after", after_entries)):
                for entry in entries:
                    rel = entry["relative_path"]
                    file_path = resolve_workspace_artifact_path(manifest_root, rel)
                    if not file_path.exists():
                        raise BundleValidationError(f"missing {label} manifest file: {rel}")
                    if sha256_file(file_path) != entry["sha256"]:
                        raise BundleValidationError(f"{label} manifest checksum mismatch: {rel}")
                    if file_path.stat().st_size != entry["size_bytes"]:
                        raise BundleValidationError(f"{label} manifest size mismatch: {rel}")
        except PathSafetyError as exc:
            raise _path_safety_as_validation_error(exc) from exc

    return {
        "validated_at_utc": utc_now_iso(),
        "run_id": run_id,
        "schema_version": SCHEMA_VERSION,
        "valid": True,
        "error_count": 0,
    }


def build_bundle_manifest(
    *,
    workspace: Path,
    run_id: str,
    created_at_utc: str,
    completed_at_utc: str,
    input_artifacts: list[dict[str, Any]],
    invocation: dict[str, Any],
    process_result: dict[str, Any],
    before_manifest: dict[str, Any],
    after_manifest: dict[str, Any],
    output_artifacts: list[dict[str, Any]],
    stale_detection: dict[str, Any] | None = None,
    comparison: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validate_run_id(run_id)
    manifest: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "harness_version": HARNESS_VERSION,
        "run_id": run_id,
        "created_at_utc": created_at_utc,
        "completed_at_utc": completed_at_utc,
        "workspace_path": str(workspace.resolve()),
        "software_identity": software_identity(),
        "input_artifacts": input_artifacts,
        "invocation": invocation,
        "process_result": process_result,
        "manifests": {
            "before": before_manifest,
            "after": after_manifest,
        },
        "output_artifacts": output_artifacts,
        "stale_detection": stale_detection
        or {
            "evaluated_at_utc": utc_now_iso(),
            "outputs_prefix": OUTPUTS_PREFIX,
            "stale_detected": False,
            "stale_entries": [],
        },
    }
    if comparison is not None:
        manifest["comparison"] = comparison
    return manifest


def collect_output_artifacts(workspace: Path, outputs_dir: Path | None = None) -> list[dict[str, Any]]:
    root = outputs_dir or (workspace / "outputs")
    if not root.exists():
        return []
    manifest = collect_file_manifest(root, label="outputs")
    artifacts: list[dict[str, Any]] = []
    seen: set[str] = set()
    for entry in manifest["entries"]:
        workspace_relative = f"outputs/{entry['relative_path']}"
        if workspace_relative in seen:
            raise BundleValidationError(
                f"duplicate workspace_relative_path in output artifacts: {workspace_relative}"
            )
        seen.add(workspace_relative)
        artifacts.append(
            {
                "workspace_relative_path": workspace_relative,
                "sha256": entry["sha256"],
                "size_bytes": entry["size_bytes"],
            }
        )
    return artifacts


def finalize_workspace_bundle(
    workspace: Path,
    *,
    run_id: str,
    created_at_utc: str,
    input_artifacts: list[dict[str, Any]],
    invocation: dict[str, Any],
    process_result: dict[str, Any],
    before_manifest: dict[str, Any],
    after_manifest: dict[str, Any],
    stale_detection: dict[str, Any] | None = None,
    comparison: dict[str, Any] | None = None,
) -> dict[str, Any]:
    manifest_path = workspace / BUNDLE_MANIFEST_NAME
    if manifest_path.exists():
        raise ExclusiveWriteError(f"refusing to overwrite existing bundle manifest: {manifest_path}")

    output_artifacts = collect_output_artifacts(workspace)
    manifest = build_bundle_manifest(
        workspace=workspace,
        run_id=run_id,
        created_at_utc=created_at_utc,
        completed_at_utc=utc_now_iso(),
        input_artifacts=input_artifacts,
        invocation=invocation,
        process_result=process_result,
        before_manifest=before_manifest,
        after_manifest=after_manifest,
        output_artifacts=output_artifacts,
        stale_detection=stale_detection,
        comparison=comparison,
    )
    write_json(manifest_path, manifest)
    return manifest


def render_evidence_summary(manifest: Mapping[str, Any]) -> tuple[dict[str, Any], str]:
    process_result = manifest.get("process_result", {})
    stale = manifest.get("stale_detection", {})
    summary: dict[str, Any] = {
        "schema_version": manifest.get("schema_version"),
        "harness_version": manifest.get("harness_version"),
        "run_id": manifest.get("run_id"),
        "created_at_utc": manifest.get("created_at_utc"),
        "completed_at_utc": manifest.get("completed_at_utc"),
        "exit_code": process_result.get("exit_code"),
        "cancelled": process_result.get("cancelled", False),
        "input_count": len(manifest.get("input_artifacts", [])),
        "output_count": len(manifest.get("output_artifacts", [])),
        "stale_detected": stale.get("stale_detected", False),
        "stdout_sha256": (process_result.get("stdout") or {}).get("sha256"),
        "stderr_sha256": (process_result.get("stderr") or {}).get("sha256"),
        "comparison_verdict": (manifest.get("comparison") or {}).get("verdict"),
    }

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(summary.keys()))
    writer.writeheader()
    writer.writerow(summary)
    return summary, buffer.getvalue()


def write_summaries(workspace: Path, manifest: Mapping[str, Any]) -> tuple[Path, Path]:
    summary_json, summary_csv = render_evidence_summary(manifest)
    summaries_dir = workspace / "summaries"
    summaries_dir.mkdir(parents=True, exist_ok=True)
    json_path = summaries_dir / SUMMARY_JSON_NAME
    csv_path = summaries_dir / SUMMARY_CSV_NAME
    if json_path.exists() or csv_path.exists():
        raise ExclusiveWriteError("refusing to overwrite existing summary files")
    write_json(json_path, summary_json)
    write_text_exclusive(csv_path, summary_csv)
    return json_path, csv_path


def load_bundle_manifest(workspace: Path) -> dict[str, Any]:
    return read_json(workspace / BUNDLE_MANIFEST_NAME)
