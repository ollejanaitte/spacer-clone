from __future__ import annotations

import os
import re
import threading
from pathlib import Path
from typing import Any

import pytest

from backend.app.atomic_json import (
    AtomicJsonStore,
    DirectoryFsyncUnsupportedError,
    IoHooks,
    JsonSerializationError,
    JsonStoreConflictError,
    JsonStoreIoError,
    PublishedDataDirectoryFsyncError,
    StoreResult,
    atomic_publish_bytes,
    checksum_bytes,
    checksum_for_path,
    default_io_hooks,
    read_json,
    serialize_json,
)
from backend.tests.sample_models import cantilever_tip_load


@pytest.fixture
def store_dir(tmp_path: Path) -> Path:
    target = tmp_path / "data"
    target.mkdir()
    return target


@pytest.fixture
def tracking_io() -> tuple[IoHooks, dict[str, int]]:
    calls = {"file_fsync": 0, "replace": 0, "dir_fsync": 0}

    def file_fsync(fd: int) -> None:
        calls["file_fsync"] += 1
        os.fsync(fd)

    def replace(src: str | os.PathLike[str], dst: str | os.PathLike[str]) -> None:
        calls["replace"] += 1
        os.replace(src, dst)

    def fsync_directory(path: Path) -> None:
        calls["dir_fsync"] += 1
        directory_fd = os.open(str(path), os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)

    hooks = IoHooks(
        file_fsync=file_fsync,
        replace=replace,
        fsync_directory=fsync_directory,
    )
    return hooks, calls


def test_new_file_atomic_write_and_read(store_dir: Path) -> None:
    path = store_dir / "new.project.json"
    payload = {"hello": "world"}
    store = AtomicJsonStore()
    result = store.store(path, payload)

    assert path.exists()
    assert read_json(path) == payload
    assert result.checksum == checksum_bytes(serialize_json(payload))
    assert path.read_bytes() == serialize_json(payload)


def test_deterministic_bytes_and_checksum(store_dir: Path) -> None:
    payload = cantilever_tip_load()
    first = serialize_json(payload)
    second = serialize_json(payload)
    assert first == second
    assert checksum_bytes(first) == checksum_bytes(second)


def test_overwrite_updates_checksum(store_dir: Path) -> None:
    path = store_dir / "overwrite.project.json"
    store = AtomicJsonStore()
    first = store.store(path, {"version": 1})
    second = store.store(path, {"version": 2})

    assert read_json(path) == {"version": 2}
    assert first.checksum != second.checksum


def test_create_only_rejects_duplicate(store_dir: Path) -> None:
    path = store_dir / "create-only.project.json"
    store = AtomicJsonStore()
    store.store(path, {"id": 1}, create_only=True)

    with pytest.raises(JsonStoreConflictError) as exc_info:
        store.store(path, {"id": 2}, create_only=True)
    assert exc_info.value.code == "ALREADY_EXISTS"
    assert read_json(path) == {"id": 1}


def test_expected_checksum_match_allows_write(store_dir: Path) -> None:
    path = store_dir / "checksum.project.json"
    store = AtomicJsonStore()
    first = store.store(path, {"value": 1})
    second = store.store(
        path,
        {"value": 2},
        expected_checksum=first.checksum,
    )
    assert read_json(path) == {"value": 2}
    assert second.checksum != first.checksum


def test_expected_checksum_mismatch_rejects_write(store_dir: Path) -> None:
    path = store_dir / "stale.project.json"
    store = AtomicJsonStore()
    store.store(path, {"value": 1})

    with pytest.raises(JsonStoreConflictError) as exc_info:
        store.store(path, {"value": 2}, expected_checksum="0" * 64)
    assert exc_info.value.code == "CHECKSUM_MISMATCH"
    assert read_json(path) == {"value": 1}


def test_expected_checksum_rejects_missing_target(store_dir: Path) -> None:
    path = store_dir / "missing.project.json"
    store = AtomicJsonStore()

    with pytest.raises(JsonStoreConflictError) as exc_info:
        store.store(path, {"value": 1}, expected_checksum="0" * 64)
    assert exc_info.value.code == "TARGET_NOT_FOUND"
    assert not path.exists()


def test_stale_concurrent_writer_conflict_same_process(store_dir: Path) -> None:
    path = store_dir / "concurrent.project.json"
    store = AtomicJsonStore()
    initial = store.store(path, {"value": 1})
    barrier = threading.Barrier(2)
    outcomes: list[StoreResult | JsonStoreConflictError] = []

    def writer(value: int) -> None:
        try:
            barrier.wait()
            outcomes.append(
                store.store(path, {"value": value}, expected_checksum=initial.checksum)
            )
        except JsonStoreConflictError as exc:
            outcomes.append(exc)

    thread_a = threading.Thread(target=writer, args=(2,))
    thread_b = threading.Thread(target=writer, args=(3,))
    thread_a.start()
    thread_b.start()
    thread_a.join()
    thread_b.join()

    successes = [item for item in outcomes if isinstance(item, StoreResult)]
    conflicts = [
        item
        for item in outcomes
        if isinstance(item, JsonStoreConflictError) and item.code == "CHECKSUM_MISMATCH"
    ]
    assert len(successes) == 1
    assert len(conflicts) == 1
    final_value = read_json(path)["value"]
    assert final_value in {2, 3}


def test_serialization_failure_leaves_existing_file_unchanged(store_dir: Path) -> None:
    path = store_dir / "finite.project.json"
    store = AtomicJsonStore()
    store.store(path, {"ok": True})
    original = path.read_bytes()

    with pytest.raises(JsonSerializationError):
        store.store(path, {"bad": float("nan")})

    assert path.read_bytes() == original


def test_temp_write_failure_leaves_existing_unchanged(store_dir: Path) -> None:
    path = store_dir / "temp-write.project.json"
    store = AtomicJsonStore()
    store.store(path, {"value": 1})
    original = path.read_bytes()

    def failing_open(target: Path) -> Any:
        raise OSError("temp write failed")

    hooks = IoHooks(
        file_fsync=os.fsync,
        replace=os.replace,
        unlink=os.unlink,
        fsync_directory=default_io_hooks().fsync_directory,
        open_write=failing_open,
    )
    faulty_store = AtomicJsonStore(io=hooks)

    with pytest.raises(JsonStoreIoError):
        faulty_store.store(path, {"value": 2})

    assert path.read_bytes() == original


def test_file_fsync_failure_before_replace_leaves_existing_unchanged(
    store_dir: Path,
) -> None:
    path = store_dir / "fsync-fault.project.json"
    store = AtomicJsonStore()
    store.store(path, {"value": 1})
    original = path.read_bytes()

    def failing_fsync(fd: int) -> None:
        raise OSError("file fsync failed")

    hooks = IoHooks(
        file_fsync=failing_fsync,
        replace=os.replace,
        unlink=os.unlink,
        fsync_directory=default_io_hooks().fsync_directory,
    )
    faulty_store = AtomicJsonStore(io=hooks)

    with pytest.raises(JsonStoreIoError):
        faulty_store.store(path, {"value": 2})

    assert path.read_bytes() == original
    assert list(store_dir.glob(f".{path.name}.*.tmp")) == []


def test_publish_before_replace_fault_leaves_existing_unchanged(
    store_dir: Path,
) -> None:
    path = store_dir / "fault.project.json"
    store = AtomicJsonStore()
    store.store(path, {"value": 1})
    original = path.read_bytes()

    def failing_replace(
        src: str | os.PathLike[str],
        dst: str | os.PathLike[str],
    ) -> None:
        raise OSError("injected replace failure")

    hooks = default_io_hooks()
    hooks.replace = failing_replace
    faulty_store = AtomicJsonStore(io=hooks)

    with pytest.raises(JsonStoreIoError):
        faulty_store.store(path, {"value": 2})

    assert path.read_bytes() == original
    assert not any(path.parent.glob(f".{path.name}.*.tmp"))


def test_temp_file_cleanup_on_success_and_failure(store_dir: Path) -> None:
    path = store_dir / "cleanup.project.json"
    store = AtomicJsonStore()
    store.store(path, {"value": 1})
    assert list(store_dir.glob(f".{path.name}.*.tmp")) == []

    def failing_replace(
        src: str | os.PathLike[str],
        dst: str | os.PathLike[str],
    ) -> None:
        raise OSError("replace failed")

    faulty_store = AtomicJsonStore(
        io=IoHooks(
            file_fsync=os.fsync,
            replace=failing_replace,
            unlink=os.unlink,
            fsync_directory=default_io_hooks().fsync_directory,
        )
    )
    with pytest.raises(JsonStoreIoError):
        faulty_store.store(path, {"value": 2})
    assert list(store_dir.glob(f".{path.name}.*.tmp")) == []


def test_file_fsync_and_replace_are_called(
    store_dir: Path,
    tracking_io: tuple[IoHooks, dict[str, int]],
) -> None:
    hooks, calls = tracking_io
    path = store_dir / "tracked.project.json"
    AtomicJsonStore(io=hooks).store(path, {"tracked": True})

    assert calls["file_fsync"] >= 1
    assert calls["replace"] == 1


def test_directory_fsync_contract_after_publish(
    store_dir: Path,
    tracking_io: tuple[IoHooks, dict[str, int]],
) -> None:
    hooks, calls = tracking_io
    path = store_dir / "dir-fsync.project.json"
    AtomicJsonStore(io=hooks).store(path, {"dir": True})

    assert calls["dir_fsync"] >= 1


def test_directory_fsync_after_publish_failure_raises_published_contract(
    store_dir: Path,
) -> None:
    path = store_dir / "published.project.json"
    calls = {"count": 0}

    def failing_dir_fsync(directory: Path) -> None:
        calls["count"] += 1
        if calls["count"] == 1:
            directory_fd = os.open(str(directory), os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
            return
        raise OSError("directory fsync failed")

    hooks = IoHooks(
        file_fsync=os.fsync,
        replace=os.replace,
        unlink=os.unlink,
        fsync_directory=failing_dir_fsync,
    )
    store = AtomicJsonStore(io=hooks)
    with pytest.raises(PublishedDataDirectoryFsyncError) as exc_info:
        store.store(path, {"published": True})

    assert path.exists()
    assert read_json(path) == {"published": True}
    assert exc_info.value.checksum == checksum_for_path(path)


def test_directory_fsync_unsupported_is_explicitly_limited(store_dir: Path) -> None:
    path = store_dir / "unsupported.project.json"

    def unsupported(_: Path) -> None:
        raise DirectoryFsyncUnsupportedError("unsupported")

    hooks = IoHooks(
        file_fsync=os.fsync,
        replace=os.replace,
        unlink=os.unlink,
        fsync_directory=unsupported,
    )
    store = AtomicJsonStore(io=hooks)
    result = store.store(path, {"ok": True})
    assert result.checksum == checksum_for_path(path)


def test_different_paths_do_not_share_lock(store_dir: Path) -> None:
    path_a = store_dir / "a.project.json"
    path_b = store_dir / "b.project.json"
    store = AtomicJsonStore()
    started = threading.Barrier(2)
    done = threading.Barrier(2)

    def write(path: Path, value: int) -> None:
        started.wait()
        store.store(path, {"value": value})
        done.wait()

    thread_a = threading.Thread(target=write, args=(path_a, 1))
    thread_b = threading.Thread(target=write, args=(path_b, 2))
    thread_a.start()
    thread_b.start()
    thread_a.join(timeout=5)
    thread_b.join(timeout=5)
    assert read_json(path_a) == {"value": 1}
    assert read_json(path_b) == {"value": 2}


def test_same_path_lock_shared_across_store_instances(store_dir: Path) -> None:
    path = store_dir / "shared-lock.project.json"
    store_a = AtomicJsonStore()
    store_b = AtomicJsonStore()
    initial = store_a.store(path, {"value": 1})
    barrier = threading.Barrier(2)
    outcomes: list[StoreResult | JsonStoreConflictError] = []

    def writer(store: AtomicJsonStore, value: int) -> None:
        try:
            barrier.wait()
            outcomes.append(
                store.store(path, {"value": value}, expected_checksum=initial.checksum)
            )
        except JsonStoreConflictError as exc:
            outcomes.append(exc)

    thread_a = threading.Thread(target=writer, args=(store_a, 2))
    thread_b = threading.Thread(target=writer, args=(store_b, 3))
    thread_a.start()
    thread_b.start()
    thread_a.join()
    thread_b.join()

    successes = [item for item in outcomes if isinstance(item, StoreResult)]
    conflicts = [
        item
        for item in outcomes
        if isinstance(item, JsonStoreConflictError) and item.code == "CHECKSUM_MISMATCH"
    ]
    assert len(successes) == 1
    assert len(conflicts) == 1
    assert read_json(path)["value"] in {2, 3}


def test_atomic_publish_bytes_direct(store_dir: Path) -> None:
    path = store_dir / "direct.project.json"
    payload = serialize_json({"direct": True})
    atomic_publish_bytes(path, payload)
    assert path.read_bytes() == payload


@pytest.fixture(scope="session")
def client(api_app):
    testclient = pytest.importorskip(
        "fastapi.testclient", reason="FastAPI is required for API tests."
    )
    return testclient.TestClient(api_app)


def test_project_save_load_round_trip(client, tmp_path, monkeypatch) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "PROJECT_STORAGE_DIR", tmp_path)
    project = cantilever_tip_load()

    save_response = client.post(
        "/api/projects/save",
        json={"fileName": "roundtrip.project.json", "project": project},
    )
    assert save_response.status_code == 200
    assert save_response.json() == {
        "saved": True,
        "fileName": "roundtrip.project.json",
    }

    load_response = client.post(
        "/api/projects/load",
        json={"fileName": "roundtrip.project.json"},
    )
    assert load_response.status_code == 200
    assert load_response.json()["project"] == project


def test_autosave_regression(client, tmp_path, monkeypatch) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "PROJECT_STORAGE_DIR", tmp_path)
    project = cantilever_tip_load()

    save_response = client.post("/api/projects/autosave", json={"project": project})
    assert save_response.status_code == 200
    assert save_response.json() == {"saved": True, "fileName": "autosave.json"}

    load_response = client.get("/api/projects/autosave")
    assert load_response.status_code == 200
    body = load_response.json()
    assert body["exists"] is True
    assert body["project"] == project


def test_bridge_create_update_regression(client, tmp_path, monkeypatch) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "BRIDGE_STORAGE_DIR", tmp_path)
    template = client.get("/api/bridge/template").json()["project"]
    bridge_id = "atomic-bridge-test"

    create = client.post("/api/bridge", json={"id": bridge_id, "project": template})
    assert create.status_code == 200
    assert create.json()["id"] == bridge_id

    duplicate = client.post("/api/bridge", json={"id": bridge_id, "project": template})
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["code"] == "ALREADY_EXISTS"

    updated = {**template, "name": "Atomic Updated"}
    update = client.put(f"/api/bridge/{bridge_id}", json={"project": updated})
    assert update.status_code == 200
    assert update.json()["project"]["name"] == "Atomic Updated"

    client.delete(f"/api/bridge/{bridge_id}")


def test_legacy_routes_do_not_use_direct_json_dump_write() -> None:
    source = Path(__file__).resolve().parents[1] / "app" / "main.py"
    text = source.read_text(encoding="utf-8")
    direct_write_pattern = re.compile(
        r"path\.open\(\s*[\"']w[\"'].*json\.dump",
        re.DOTALL,
    )
    save_block = re.search(
        r"def save_project_endpoint.*?^def ",
        text,
        flags=re.DOTALL | re.MULTILINE,
    )
    autosave_block = re.search(
        r"def autosave_project_endpoint.*?^def ",
        text,
        flags=re.DOTALL | re.MULTILINE,
    )
    create_block = re.search(
        r"def create_bridge_endpoint.*?^@app",
        text,
        flags=re.DOTALL | re.MULTILINE,
    )
    update_block = re.search(
        r"def update_bridge_endpoint.*?^@app",
        text,
        flags=re.DOTALL | re.MULTILINE,
    )
    for name, block in [
        ("save", save_block),
        ("autosave", autosave_block),
        ("bridge create", create_block),
        ("bridge update", update_block),
    ]:
        assert block is not None, f"missing {name} endpoint block"
        assert not direct_write_pattern.search(block.group(0)), (
            f"{name} still uses direct path.open/json.dump write"
        )


def _faulty_store_after_publish_dir_fsync() -> AtomicJsonStore:
    calls = {"count": 0}

    def failing_dir_fsync(directory: Path) -> None:
        calls["count"] += 1
        if calls["count"] == 1:
            directory_fd = os.open(str(directory), os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
            return
        raise OSError("directory fsync failed")

    hooks = IoHooks(
        file_fsync=os.fsync,
        replace=os.replace,
        unlink=os.unlink,
        fsync_directory=failing_dir_fsync,
    )
    return AtomicJsonStore(io=hooks)


def _assert_published_not_durable_response(response) -> str:
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == "PUBLISHED_NOT_DURABLE"
    assert detail["message"]
    checksum = detail["checksum"]
    assert isinstance(checksum, str) and len(checksum) == 64
    return checksum


def test_project_save_returns_503_when_publish_not_durable(
    client, tmp_path, monkeypatch
) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "PROJECT_STORAGE_DIR", tmp_path)
    monkeypatch.setattr(main, "default_store", _faulty_store_after_publish_dir_fsync())
    project = cantilever_tip_load()
    file_name = "not-durable.project.json"

    response = client.post(
        "/api/projects/save",
        json={"fileName": file_name, "project": project},
    )
    checksum = _assert_published_not_durable_response(response)

    path = tmp_path / file_name
    assert path.exists()
    assert checksum_for_path(path) == checksum
    assert read_json(path) == project


def test_project_autosave_returns_503_when_publish_not_durable(
    client, tmp_path, monkeypatch
) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "PROJECT_STORAGE_DIR", tmp_path)
    monkeypatch.setattr(main, "default_store", _faulty_store_after_publish_dir_fsync())
    project = cantilever_tip_load()

    response = client.post("/api/projects/autosave", json={"project": project})
    checksum = _assert_published_not_durable_response(response)

    path = tmp_path / "autosave.json"
    assert path.exists()
    assert checksum_for_path(path) == checksum
    assert read_json(path) == project


def test_bridge_create_returns_503_when_publish_not_durable(
    client, tmp_path, monkeypatch
) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "BRIDGE_STORAGE_DIR", tmp_path)
    monkeypatch.setattr(main, "default_store", _faulty_store_after_publish_dir_fsync())
    template = client.get("/api/bridge/template").json()["project"]
    bridge_id = "not-durable-bridge"

    response = client.post("/api/bridge", json={"id": bridge_id, "project": template})
    checksum = _assert_published_not_durable_response(response)

    path = tmp_path / f"{bridge_id}.json"
    assert path.exists()
    assert checksum_for_path(path) == checksum
    assert read_json(path) == template


def test_bridge_update_returns_503_when_publish_not_durable(
    client, tmp_path, monkeypatch
) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "BRIDGE_STORAGE_DIR", tmp_path)
    monkeypatch.setattr(main, "default_store", AtomicJsonStore())
    template = client.get("/api/bridge/template").json()["project"]
    bridge_id = "not-durable-update-bridge"
    create = client.post("/api/bridge", json={"id": bridge_id, "project": template})
    assert create.status_code == 200

    monkeypatch.setattr(main, "default_store", _faulty_store_after_publish_dir_fsync())
    updated = {**template, "name": "Not Durable Updated"}
    response = client.put(f"/api/bridge/{bridge_id}", json={"project": updated})
    checksum = _assert_published_not_durable_response(response)

    path = tmp_path / f"{bridge_id}.json"
    assert path.exists()
    assert checksum_for_path(path) == checksum
    assert read_json(path)["name"] == "Not Durable Updated"
