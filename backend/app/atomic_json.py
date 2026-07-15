from __future__ import annotations

import hashlib
import json
import os
import secrets
import sys
import threading
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class AtomicJsonError(Exception):
    """Base error for atomic JSON persistence."""


class JsonSerializationError(AtomicJsonError):
    """JSON payload could not be serialized to canonical bytes."""


class JsonStoreConflictError(AtomicJsonError):
    """Optimistic conflict: create-only duplicate or checksum mismatch."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class JsonStoreIoError(AtomicJsonError):
    """I/O failure before the target file was published."""


class PublishedDataDirectoryFsyncError(AtomicJsonError):
    """Target bytes were published; directory fsync failed afterward."""

    def __init__(self, path: Path, checksum: str, cause: BaseException) -> None:
        super().__init__(
            f"Published {path} (checksum {checksum}), but directory fsync failed."
        )
        self.path = path
        self.checksum = checksum
        self.cause = cause


class DirectoryFsyncUnsupportedError(AtomicJsonError):
    """Directory fsync is not supported on this platform."""


@dataclass(frozen=True)
class StoreResult:
    path: Path
    checksum: str
    bytes_written: int


@dataclass
class IoHooks:
    file_fsync: Callable[[int], None] = os.fsync
    replace: Callable[[str | os.PathLike[str], str | os.PathLike[str]], None] = os.replace
    unlink: Callable[[str | os.PathLike[str]], None] = os.unlink
    fsync_directory: Callable[[Path], None] | None = None
    open_write: Callable[[Path], Any] | None = None


def _default_fsync_directory(path: Path) -> None:
    if sys.platform == "win32":
        raise DirectoryFsyncUnsupportedError(
            f"Directory fsync is not supported on Windows for {path}."
        )
    directory_fd = os.open(str(path), os.O_RDONLY)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)


def default_io_hooks() -> IoHooks:
    return IoHooks(fsync_directory=_default_fsync_directory)


def serialize_json(data: Any) -> bytes:
    try:
        text = json.dumps(data, ensure_ascii=False, allow_nan=False, indent=2)
    except (TypeError, ValueError) as exc:
        raise JsonSerializationError(str(exc)) from exc
    return (text + "\n").encode("utf-8")


def checksum_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def checksum_for_bytes(data: bytes) -> str:
    return checksum_bytes(data)


def checksum_for_path(path: Path) -> str:
    return checksum_bytes(path.read_bytes())


def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def _try_fsync_directory(path: Path, io: IoHooks) -> None:
    if io.fsync_directory is None:
        raise DirectoryFsyncUnsupportedError(
            f"Directory fsync hook is not configured for {path}."
        )
    io.fsync_directory(path)


def ensure_parent_directory(path: Path, io: IoHooks) -> None:
    parent = path.parent
    if not parent.exists():
        parent.mkdir(parents=True, exist_ok=True)
    try:
        _try_fsync_directory(parent, io)
    except DirectoryFsyncUnsupportedError:
        pass


def _temp_path_for(target: Path) -> Path:
    token = secrets.token_hex(8)
    return target.parent / f".{target.name}.{os.getpid()}.{token}.tmp"


def _open_write(path: Path, io: IoHooks) -> Any:
    if io.open_write is not None:
        return io.open_write(path)
    return path.open("wb")


def _cleanup_temp(temp_path: Path, io: IoHooks) -> None:
    if temp_path.exists():
        io.unlink(temp_path)


def _cleanup_temp_best_effort(temp_path: Path, io: IoHooks) -> None:
    try:
        _cleanup_temp(temp_path, io)
    except OSError:
        pass


_path_lock_registry: dict[str, threading.Lock] = {}
_path_lock_registry_guard = threading.Lock()


def _lock_for_path(path: Path) -> threading.Lock:
    key = str(path.resolve())
    with _path_lock_registry_guard:
        lock = _path_lock_registry.get(key)
        if lock is None:
            lock = threading.Lock()
            _path_lock_registry[key] = lock
        return lock


def atomic_publish_bytes(
    target: Path,
    payload: bytes,
    *,
    io: IoHooks | None = None,
) -> None:
    hooks = io or default_io_hooks()
    ensure_parent_directory(target, hooks)
    temp_path = _temp_path_for(target)
    publish_error: BaseException | None = None
    try:
        with _open_write(temp_path, hooks) as file:
            file.write(payload)
            file.flush()
            hooks.file_fsync(file.fileno())
        hooks.replace(temp_path, target)
    except Exception as exc:
        publish_error = exc
        _cleanup_temp_best_effort(temp_path, hooks)
        if isinstance(exc, AtomicJsonError):
            raise
        raise JsonStoreIoError(f"Failed to publish {target}.") from exc
    finally:
        if temp_path.exists():
            if publish_error is not None:
                _cleanup_temp_best_effort(temp_path, hooks)
            else:
                _cleanup_temp(temp_path, hooks)


def _fsync_directory_after_publish(parent: Path, target: Path, checksum: str, io: IoHooks) -> None:
    try:
        _try_fsync_directory(parent, io)
    except DirectoryFsyncUnsupportedError:
        return
    except OSError as exc:
        raise PublishedDataDirectoryFsyncError(target, checksum, exc) from exc


class AtomicJsonStore:
    def __init__(self, io: IoHooks | None = None) -> None:
        self._io = io or default_io_hooks()

    def store(
        self,
        path: Path,
        data: Any,
        *,
        create_only: bool = False,
        expected_checksum: str | None = None,
    ) -> StoreResult:
        with _lock_for_path(path):
            if create_only and path.exists():
                raise JsonStoreConflictError(
                    "ALREADY_EXISTS",
                    f"File already exists: {path}",
                )
            if expected_checksum is not None:
                if not path.exists():
                    raise JsonStoreConflictError(
                        "TARGET_NOT_FOUND",
                        f"Cannot apply expected checksum; file does not exist: {path}",
                    )
                current = checksum_for_path(path)
                if current != expected_checksum.lower():
                    raise JsonStoreConflictError(
                        "CHECKSUM_MISMATCH",
                        f"Checksum mismatch for {path}.",
                    )

            payload = serialize_json(data)
            checksum = checksum_bytes(payload)
            atomic_publish_bytes(path, payload, io=self._io)
            _fsync_directory_after_publish(path.parent, path, checksum, self._io)
            return StoreResult(path=path, checksum=checksum, bytes_written=len(payload))


default_store = AtomicJsonStore()
