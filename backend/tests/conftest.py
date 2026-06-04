from __future__ import annotations

import copy
import importlib
import json
from pathlib import Path
from typing import Any, Callable

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_DIR = REPO_ROOT / "schemas"
EXAMPLES_DIR = REPO_ROOT / "examples"


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def clone_project(project: dict[str, Any]) -> dict[str, Any]:
    return copy.deepcopy(project)


@pytest.fixture(scope="session")
def project_schema() -> dict[str, Any]:
    return load_json(SCHEMAS_DIR / "project.schema.json")


@pytest.fixture(scope="session")
def result_schema() -> dict[str, Any]:
    return load_json(SCHEMAS_DIR / "result.schema.json")


@pytest.fixture(scope="session")
def example_project() -> dict[str, Any]:
    return load_json(EXAMPLES_DIR / "project.json")


def _import_first(candidates: tuple[str, ...]) -> Any | None:
    for module_name in candidates:
        try:
            return importlib.import_module(module_name)
        except ModuleNotFoundError:
            continue
    return None


@pytest.fixture(scope="session")
def engine_runner() -> Callable[[dict[str, Any]], dict[str, Any]]:
    module = _import_first(
        (
            "backend.engine.analysis",
            "backend.engine.analyzer",
            "backend.engine.runner",
            "backend.engine",
        )
    )
    if module is None:
        pytest.skip("Analysis engine is not implemented yet.")

    for attr_name in ("run_analysis", "analyze", "solve", "run"):
        candidate = getattr(module, attr_name, None)
        if callable(candidate):
            return candidate

    pytest.skip(
        "Analysis engine module exists, but no supported runner function is exposed."
    )


@pytest.fixture(scope="session")
def project_validator() -> Callable[[dict[str, Any]], Any]:
    module = _import_first(
        (
            "backend.engine.validation",
            "backend.engine.validator",
            "backend.engine",
        )
    )
    if module is None:
        pytest.skip("Project validation module is not implemented yet.")

    for attr_name in ("validate_project", "validate", "validate_input"):
        candidate = getattr(module, attr_name, None)
        if callable(candidate):
            return candidate

    pytest.skip(
        "Project validation module exists, but no supported validator function is exposed."
    )


@pytest.fixture(scope="session")
def api_app() -> Any:
    module = _import_first(
        (
            "backend.app.main",
            "backend.main",
            "backend.app",
        )
    )
    if module is None:
        pytest.skip("FastAPI app is not implemented yet.")

    app = getattr(module, "app", None)
    if app is None:
        pytest.skip("FastAPI module exists, but does not expose an app object.")
    return app
