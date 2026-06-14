"""Bridge domain model parsing and validation helpers."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Iterable
import math


class BridgeDomainError(ValueError):
    """Raised when a bridge domain payload fails validation."""


@dataclass(frozen=True)
class CrossSection:
    lane_count: int
    lane_width: float
    median_width: float
    sidewalk_width: float
    barrier_width: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @property
    def total_width(self) -> float:
        return (
            self.lane_count * self.lane_width
            + self.median_width
            + 2.0 * self.sidewalk_width
            + 2.0 * self.barrier_width
        )


@dataclass(frozen=True)
class Span:
    index: int
    length: float
    offset: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ImpactFactor:
    value: float
    auto: bool
    formula: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class BridgeLine:
    id: str
    type: str  # traffic | load | reference
    name: str
    points: tuple[tuple[float, float, float], ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "name": self.name,
            "points": [list(p) for p in self.points],
        }


@dataclass(frozen=True)
class BridgeLoad:
    id: str
    type: str  # self_weight | distributed | vehicle
    name: str
    magnitude: float
    direction: str
    line_id: str = ""
    loadCaseId: str = ""

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        return d


@dataclass(frozen=True)
class BridgeGenerationSettings:
    mesh_division: int
    mesh_density: str = "standard"
    girder_spacing_override: float | None = None
    materialId: str = "MAT1"
    sectionId: str = "SEC1"

    def to_dict(self) -> dict[str, Any]:
        return {
            "mesh_division": self.mesh_division,
            "mesh_density": self.mesh_density,
            "girder_spacing_override": self.girder_spacing_override,
            "materialId": self.materialId,
            "sectionId": self.sectionId,
        }


@dataclass(frozen=True)
class BridgeProject:
    id: str
    name: str
    schemaVersion: str
    description: str = ""
    createdAt: str = ""
    updatedAt: str = ""
    crossSection: CrossSection = field(default_factory=lambda: CrossSection(2, 3.5, 0.0, 0.0, 0.5))
    spans: tuple[Span, ...] = field(default_factory=tuple)
    impactFactor: ImpactFactor = field(default_factory=lambda: ImpactFactor(0.0, True))
    lines: tuple[BridgeLine, ...] = field(default_factory=tuple)
    loads: tuple[BridgeLoad, ...] = field(default_factory=tuple)
    generationSettings: BridgeGenerationSettings = field(
        default_factory=lambda: BridgeGenerationSettings(mesh_division=10)
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "schemaVersion": self.schemaVersion,
            "description": self.description,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt,
            "crossSection": self.crossSection.to_dict(),
            "spans": [s.to_dict() for s in self.spans],
            "impactFactor": self.impactFactor.to_dict(),
            "lines": [l.to_dict() for l in self.lines],
            "loads": [l.to_dict() for l in self.loads],
            "generationSettings": self.generationSettings.to_dict(),
        }


# -----------------------------
# Parsing
# -----------------------------


def _require(payload: dict[str, Any], key: str) -> Any:
    if key not in payload:
        raise BridgeDomainError(f"Missing required key: {key}")
    return payload[key]


def _as_number(value: Any, key: str, *, allow_zero: bool = True) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise BridgeDomainError(f"{key} must be a number.")
    f = float(value)
    if not math.isfinite(f):
        raise BridgeDomainError(f"{key} must be finite.")
    if not allow_zero and f <= 0:
        raise BridgeDomainError(f"{key} must be > 0 (got {f}).")
    if allow_zero and f < 0:
        raise BridgeDomainError(f"{key} must be >= 0 (got {f}).")
    return f


def _as_int(value: Any, key: str, *, min_value: int = 1) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise BridgeDomainError(f"{key} must be an integer.")
    if value < min_value:
        raise BridgeDomainError(f"{key} must be >= {min_value} (got {value}).")
    return value


def parse_cross_section(payload: Any) -> CrossSection:
    if not isinstance(payload, dict):
        raise BridgeDomainError("crossSection must be an object.")
    return CrossSection(
        lane_count=_as_int(_require(payload, "lane_count"), "crossSection.lane_count", min_value=1),
        lane_width=_as_number(_require(payload, "lane_width"), "crossSection.lane_width", allow_zero=False),
        median_width=_as_number(_require(payload, "median_width"), "crossSection.median_width"),
        sidewalk_width=_as_number(_require(payload, "sidewalk_width"), "crossSection.sidewalk_width"),
        barrier_width=_as_number(_require(payload, "barrier_width"), "crossSection.barrier_width"),
    )


def parse_spans(payload: Any) -> tuple[Span, ...]:
    if not isinstance(payload, list) or not payload:
        raise BridgeDomainError("spans must be a non-empty list.")
    spans: list[Span] = []
    for i, sp in enumerate(payload):
        if not isinstance(sp, dict):
            raise BridgeDomainError(f"spans[{i}] must be an object.")
        idx = _as_int(_require(sp, "index"), f"spans[{i}].index", min_value=1)
        length = _as_number(_require(sp, "length"), f"spans[{i}].length", allow_zero=False)
        offset = _as_number(sp.get("offset", 0.0), f"spans[{i}].offset")
        spans.append(Span(index=idx, length=length, offset=offset))
    return tuple(spans)


def parse_impact_factor(payload: Any) -> ImpactFactor:
    if not isinstance(payload, dict):
        raise BridgeDomainError("impactFactor must be an object.")
    value = _as_number(_require(payload, "value"), "impactFactor.value")
    if value < 0 or value > 1:
        raise BridgeDomainError("impactFactor.value must be in [0, 1].")
    auto = _require(payload, "auto")
    if not isinstance(auto, bool):
        raise BridgeDomainError("impactFactor.auto must be a boolean.")
    formula = str(payload.get("formula", "") or "")
    return ImpactFactor(value=value, auto=auto, formula=formula)


def parse_lines(payload: Any) -> tuple[BridgeLine, ...]:
    if payload is None:
        return tuple()
    if not isinstance(payload, list):
        raise BridgeDomainError("lines must be a list.")
    out: list[BridgeLine] = []
    for i, ln in enumerate(payload):
        if not isinstance(ln, dict):
            raise BridgeDomainError(f"lines[{i}] must be an object.")
        lid = str(_require(ln, "id"))
        ltype = str(_require(ln, "type"))
        if ltype not in ("traffic", "load", "reference"):
            raise BridgeDomainError(f"lines[{i}].type must be traffic|load|reference.")
        name = str(_require(ln, "name"))
        pts_raw = _require(ln, "points")
        if not isinstance(pts_raw, list) or len(pts_raw) < 2:
            raise BridgeDomainError(f"lines[{i}].points must have >= 2 points.")
        pts: list[tuple[float, float, float]] = []
        for j, p in enumerate(pts_raw):
            if not isinstance(p, (list, tuple)) or len(p) != 3:
                raise BridgeDomainError(f"lines[{i}].points[{j}] must have 3 components.")
            try:
                pf = tuple(float(v) for v in p)
            except (TypeError, ValueError):
                raise BridgeDomainError(f"lines[{i}].points[{j}] must be numeric.")
            pts.append(pf)  # type: ignore[arg-type]
        out.append(BridgeLine(id=lid, type=ltype, name=name, points=tuple(pts)))
    return tuple(out)


def parse_loads(payload: Any) -> tuple[BridgeLoad, ...]:
    if payload is None:
        return tuple()
    if not isinstance(payload, list):
        raise BridgeDomainError("loads must be a list.")
    out: list[BridgeLoad] = []
    for i, ld in enumerate(payload):
        if not isinstance(ld, dict):
            raise BridgeDomainError(f"loads[{i}] must be an object.")
        lt = str(_require(ld, "type"))
        if lt not in ("self_weight", "distributed", "vehicle"):
            raise BridgeDomainError(f"loads[{i}].type must be self_weight|distributed|vehicle.")
        out.append(
            BridgeLoad(
                id=str(_require(ld, "id")),
                type=lt,
                name=str(_require(ld, "name")),
                magnitude=_as_number(_require(ld, "magnitude"), f"loads[{i}].magnitude"),
                direction=str(_require(ld, "direction")),
                line_id=str(ld.get("line_id", "") or ""),
                loadCaseId=str(ld.get("loadCaseId", "") or ""),
            )
        )
    return tuple(out)


def parse_generation_settings(payload: Any) -> BridgeGenerationSettings:
    if payload is None:
        return BridgeGenerationSettings(mesh_division=10)
    if not isinstance(payload, dict):
        raise BridgeDomainError("generationSettings must be an object.")
    div = _as_int(_require(payload, "mesh_division"), "generationSettings.mesh_division", min_value=1)
    density = str(payload.get("mesh_density", "standard"))
    if density not in ("coarse", "standard", "fine"):
        raise BridgeDomainError("generationSettings.mesh_density must be coarse|standard|fine.")
    override = payload.get("girder_spacing_override")
    if override is not None:
        override = _as_number(override, "generationSettings.girder_spacing_override", allow_zero=False)
    return BridgeGenerationSettings(
        mesh_division=div,
        mesh_density=density,
        girder_spacing_override=override,
        materialId=str(payload.get("materialId", "MAT1") or "MAT1"),
        sectionId=str(payload.get("sectionId", "SEC1") or "SEC1"),
    )


def parse_bridge_project(payload: Any) -> BridgeProject:
    if not isinstance(payload, dict):
        raise BridgeDomainError("Bridge project payload must be an object.")
    bid = str(_require(payload, "id"))
    name = str(_require(payload, "name"))
    schema = str(payload.get("schemaVersion", "0.1.0"))
    description = str(payload.get("description", "") or "")
    created_at = str(payload.get("createdAt", "") or "")
    updated_at = str(payload.get("updatedAt", "") or "")
    project = BridgeProject(
        id=bid,
        name=name,
        schemaVersion=schema,
        description=description,
        createdAt=created_at,
        updatedAt=updated_at,
        crossSection=parse_cross_section(_require(payload, "crossSection")),
        spans=parse_spans(_require(payload, "spans")),
        impactFactor=parse_impact_factor(_require(payload, "impactFactor")),
        lines=parse_lines(payload.get("lines", [])),
        loads=parse_loads(payload.get("loads", [])),
        generationSettings=parse_generation_settings(payload.get("generationSettings", {})),
    )
    _validate_load_line_refs(project)
    return project


def _validate_load_line_refs(project: BridgeProject) -> None:
    line_ids = {l.id for l in project.lines}
    for ld in project.loads:
        if ld.line_id and ld.line_id not in line_ids:
            raise BridgeDomainError(
                f"load {ld.id} references unknown line_id={ld.line_id!r}"
            )


def compute_impact_factor(span_lengths: Iterable[float], override: ImpactFactor) -> ImpactFactor:
    if not override.auto:
        return override
    L_max = max(span_lengths) if span_lengths else 0.0
    # MVP approximation: i = min(0.3, 20 / (50 + L_max))
    i = min(0.3, 20.0 / (50.0 + L_max)) if L_max > 0 else 0.0
    return ImpactFactor(
        value=float(i),
        auto=True,
        formula=f"min(0.3, 20 / (50 + L_max)) with L_max={L_max:.3f} m",
    )


def bridge_default(name: str = "新規橋梁") -> BridgeProject:
    return BridgeProject(
        id="bridge-001",
        name=name,
        schemaVersion="0.1.0",
        crossSection=CrossSection(lane_count=2, lane_width=3.5, median_width=0.0, sidewalk_width=1.5, barrier_width=0.5),
        spans=(Span(index=1, length=30.0, offset=0.0),),
        impactFactor=ImpactFactor(value=0.0, auto=True),
        generationSettings=BridgeGenerationSettings(mesh_division=10, mesh_density="standard"),
    )


__all__ = [
    "BridgeProject",
    "CrossSection",
    "Span",
    "ImpactFactor",
    "BridgeLine",
    "BridgeLoad",
    "BridgeGenerationSettings",
    "BridgeDomainError",
    "parse_bridge_project",
    "parse_cross_section",
    "parse_spans",
    "parse_impact_factor",
    "parse_lines",
    "parse_loads",
    "parse_generation_settings",
    "compute_impact_factor",
    "bridge_default",
]
