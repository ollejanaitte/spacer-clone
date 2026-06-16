from __future__ import annotations

from dataclasses import asdict, dataclass, field
import copy
import math
from typing import Any

from .errors import AnalysisError
from .time_history_models import (
    TimeHistoryModelError,
    parse_ground_motions,
    parse_time_history_settings,
)
from .time_history_result import parse_time_history_result


@dataclass(frozen=True)
class ProjectInfo:
    id: str
    name: str
    schemaVersion: str = "1.0.0"
    description: str = ""
    createdAt: str = ""
    updatedAt: str = ""


@dataclass(frozen=True)
class Node:
    id: str
    x: float
    y: float
    z: float
    label: str = ""


@dataclass(frozen=True)
class Material:
    id: str
    name: str
    elasticModulus: float
    shearModulus: float
    poissonRatio: float = 0.0
    density: float = 0.0


@dataclass(frozen=True)
class Section:
    id: str
    name: str
    area: float
    iy: float
    iz: float
    j: float


@dataclass(frozen=True)
class OrientationVector:
    x: float
    y: float
    z: float


@dataclass(frozen=True)
class Member:
    id: str
    nodeI: str
    nodeJ: str
    materialId: str
    sectionId: str
    orientationVector: OrientationVector | None = None
    orientationNode: str | None = None
    label: str = ""


@dataclass(frozen=True)
class Support:
    nodeId: str
    ux: bool
    uy: bool
    uz: bool
    rx: bool
    ry: bool
    rz: bool


@dataclass(frozen=True)
class LoadCase:
    id: str
    name: str
    type: str


@dataclass(frozen=True)
class NodalLoad:
    id: str
    loadCaseId: str
    nodeId: str
    fx: float = 0.0
    fy: float = 0.0
    fz: float = 0.0
    mx: float = 0.0
    my: float = 0.0
    mz: float = 0.0


@dataclass(frozen=True)
class MemberLoad:
    id: str
    loadCaseId: str
    memberId: str
    coordinateSystem: str
    type: str
    wx: float = 0.0
    wy: float = 0.0
    wz: float = 0.0


@dataclass(frozen=True)
class MassItem:
    nodeId: str
    mx: float = 0.0
    my: float = 0.0
    mz: float = 0.0
    irx: float = 0.0
    iry: float = 0.0
    irz: float = 0.0


@dataclass(frozen=True)
class MassCase:
    id: str
    name: str
    method: str = "lumped"
    source: str = "manual"
    items: list[MassItem] | None = None


@dataclass(frozen=True)
class AnalysisSettings:
    analysisType: str = "linear_static"
    solver: str = "scipy_sparse"
    includeShearDeformation: bool = False
    largeDisplacement: bool = False
    tolerance: float = 1e-9
    eigen: dict[str, Any] | None = None
    influence: dict[str, Any] | None = None
    responseSpectrum: dict[str, Any] | None = None
    timeHistory: dict[str, Any] | None = None


@dataclass(frozen=True)
class Model:
    project: ProjectInfo
    nodes: list[Node]
    materials: list[Material]
    sections: list[Section]
    members: list[Member]
    supports: list[Support]
    loadCases: list[LoadCase]
    nodalLoads: list[NodalLoad]
    memberLoads: list[MemberLoad]
    massCases: list[MassCase]
    analysisSettings: AnalysisSettings
    groundMotions: list[dict[str, Any]] = field(default_factory=list)
    analysisResults: dict[str, Any] | None = None

    @property
    def node_by_id(self) -> dict[str, Node]:
        return {node.id: node for node in self.nodes}

    @property
    def material_by_id(self) -> dict[str, Material]:
        return {material.id: material for material in self.materials}

    @property
    def section_by_id(self) -> dict[str, Section]:
        return {section.id: section for section in self.sections}

    @property
    def member_by_id(self) -> dict[str, Member]:
        return {member.id: member for member in self.members}


def parse_model(data: dict[str, Any]) -> Model:
    project = ProjectInfo(**require_mapping(data, "project"))
    nodes = [Node(**item) for item in require_list(data, "nodes")]
    materials = [
        parse_material(item, idx)
        for idx, item in enumerate(require_list(data, "materials"))
    ]
    sections = [Section(**item) for item in require_list(data, "sections")]
    members = [
        parse_member(item, idx)
        for idx, item in enumerate(require_list(data, "members"))
    ]
    supports = [Support(**item) for item in require_list(data, "supports")]
    load_cases = [LoadCase(**item) for item in require_list(data, "loadCases")]
    nodal_loads = [NodalLoad(**item) for item in data.get("nodalLoads", [])]
    member_loads = [MemberLoad(**item) for item in data.get("memberLoads", [])]
    mass_cases = [parse_mass_case(item) for item in data.get("massCases", [])]
    settings_payload = data.get("analysisSettings", {})
    settings = AnalysisSettings(**settings_payload)
    ground_motions_payload = data.get("groundMotions", [])
    if not isinstance(ground_motions_payload, list):
        raise AnalysisError(
            "SCHEMA_ERROR",
            "groundMotions must be an array.",
            path="/groundMotions",
        )
    analysis_results_payload = data.get("analysisResults")
    if analysis_results_payload is not None and not isinstance(
        analysis_results_payload, dict
    ):
        raise AnalysisError(
            "SCHEMA_ERROR",
            "analysisResults must be an object.",
            path="/analysisResults",
        )
    model = Model(
        project=project,
        nodes=nodes,
        materials=materials,
        sections=sections,
        members=members,
        supports=supports,
        loadCases=load_cases,
        nodalLoads=nodal_loads,
        memberLoads=member_loads,
        massCases=mass_cases,
        analysisSettings=settings,
        groundMotions=ground_motions_payload,
        analysisResults=(
            copy.deepcopy(analysis_results_payload)
            if analysis_results_payload is not None
            else None
        ),
    )
    validate_model(model)
    return model


def parse_material(item: dict[str, Any], index: int) -> Material:
    values = dict(item)
    if "shearModulus" not in values:
        elastic_modulus = values.get("elasticModulus")
        poisson_ratio = values.get("poissonRatio", 0.0)
        if not isinstance(elastic_modulus, int | float) or not isinstance(
            poisson_ratio, int | float
        ):
            raise AnalysisError(
                "SCHEMA_ERROR",
                "shearModulus is required unless elasticModulus and poissonRatio are numeric.",
                path=f"/materials/{index}/shearModulus",
                entity_type="material",
                entity_id=values.get("id"),
            )
        if poisson_ratio == -1.0:
            raise AnalysisError(
                "INVALID_VALUE",
                "poissonRatio must be greater than -1.0 and less than 0.5.",
                path=f"/materials/{index}/poissonRatio",
                entity_type="material",
                entity_id=values.get("id"),
            )
        values["shearModulus"] = elastic_modulus / (2.0 * (1.0 + poisson_ratio))
    return Material(**values)


def parse_member(item: dict[str, Any], index: int) -> Member:
    if (
        item.get("orientationVector") is not None
        and item.get("orientationNode") is not None
    ):
        raise AnalysisError(
            "SCHEMA_ERROR",
            "orientationVector and orientationNode cannot be specified together.",
            path=f"/members/{index}",
            entity_type="member",
            entity_id=item.get("id"),
        )
    raw_orientation = item.get("orientationVector")
    orientation = (
        OrientationVector(**raw_orientation) if raw_orientation is not None else None
    )
    return Member(
        id=item["id"],
        nodeI=item["nodeI"],
        nodeJ=item["nodeJ"],
        materialId=item["materialId"],
        sectionId=item["sectionId"],
        orientationVector=orientation,
        orientationNode=item.get("orientationNode"),
        label=item.get("label", ""),
    )


def parse_mass_case(item: dict[str, Any]) -> MassCase:
    values = dict(item)
    values["items"] = [MassItem(**mass) for mass in values.get("items", [])]
    return MassCase(**values)


def require_mapping(data: dict[str, Any], key: str) -> dict[str, Any]:
    value = data.get(key)
    if not isinstance(value, dict):
        raise AnalysisError("SCHEMA_ERROR", f"{key} is required.", path=f"/{key}")
    return value


def require_list(data: dict[str, Any], key: str) -> list[dict[str, Any]]:
    value = data.get(key)
    if not isinstance(value, list):
        raise AnalysisError("SCHEMA_ERROR", f"{key} is required.", path=f"/{key}")
    return value


def validate_model(model: Model) -> None:
    ensure_unique([node.id for node in model.nodes], "node", "/nodes")
    ensure_unique(
        [material.id for material in model.materials], "material", "/materials"
    )
    ensure_unique([section.id for section in model.sections], "section", "/sections")
    ensure_unique([member.id for member in model.members], "member", "/members")
    ensure_unique([case.id for case in model.loadCases], "loadCase", "/loadCases")
    ensure_unique([load.id for load in model.nodalLoads], "nodalLoad", "/nodalLoads")
    ensure_unique([load.id for load in model.memberLoads], "memberLoad", "/memberLoads")
    ensure_unique([case.id for case in model.massCases], "massCase", "/massCases")
    ensure_unique(
        [support.nodeId for support in model.supports], "support", "/supports"
    )
    nodes = model.node_by_id
    materials = model.material_by_id
    sections = model.section_by_id
    load_cases = {case.id for case in model.loadCases}
    members = model.member_by_id
    for idx, node in enumerate(model.nodes):
        for key in ("x", "y", "z"):
            finite(getattr(node, key), f"/nodes/{idx}/{key}", "node", node.id)
    for idx, material in enumerate(model.materials):
        positive(
            material.elasticModulus,
            f"/materials/{idx}/elasticModulus",
            "material",
            material.id,
        )
        positive(
            material.shearModulus,
            f"/materials/{idx}/shearModulus",
            "material",
            material.id,
        )
        if not (-1.0 < material.poissonRatio < 0.5):
            raise AnalysisError(
                "INVALID_VALUE",
                "poissonRatio must be greater than -1.0 and less than 0.5.",
                path=f"/materials/{idx}/poissonRatio",
                entity_type="material",
                entity_id=material.id,
            )
    for idx, section in enumerate(model.sections):
        for key in ("area", "iy", "iz", "j"):
            positive(
                getattr(section, key), f"/sections/{idx}/{key}", "section", section.id
            )
    for idx, member in enumerate(model.members):
        ref(member.nodeI, nodes, f"/members/{idx}/nodeI", "member", member.id)
        ref(member.nodeJ, nodes, f"/members/{idx}/nodeJ", "member", member.id)
        ref(
            member.materialId,
            materials,
            f"/members/{idx}/materialId",
            "member",
            member.id,
        )
        ref(
            member.sectionId, sections, f"/members/{idx}/sectionId", "member", member.id
        )
        if member.orientationNode is not None:
            ref(
                member.orientationNode,
                nodes,
                f"/members/{idx}/orientationNode",
                "member",
                member.id,
            )
        if member.nodeI in nodes and member.nodeJ in nodes:
            node_i = nodes[member.nodeI]
            node_j = nodes[member.nodeJ]
            length_sq = (
                (node_j.x - node_i.x) ** 2
                + (node_j.y - node_i.y) ** 2
                + (node_j.z - node_i.z) ** 2
            )
            if not math.isfinite(length_sq) or length_sq <= 0.0:
                raise AnalysisError(
                    "ZERO_LENGTH_MEMBER",
                    "Member length is zero.",
                    path=f"/members/{idx}",
                    entity_type="member",
                    entity_id=member.id,
                )
        if member.orientationVector is not None:
            for key in ("x", "y", "z"):
                finite(
                    getattr(member.orientationVector, key),
                    f"/members/{idx}/orientationVector/{key}",
                    "member",
                    member.id,
                )
    for idx, support in enumerate(model.supports):
        ref(support.nodeId, nodes, f"/supports/{idx}/nodeId", "support", support.nodeId)
    for idx, load in enumerate(model.nodalLoads):
        ref(
            load.loadCaseId,
            load_cases,
            f"/nodalLoads/{idx}/loadCaseId",
            "nodalLoad",
            load.id,
        )
        ref(load.nodeId, nodes, f"/nodalLoads/{idx}/nodeId", "nodalLoad", load.id)
        for key in ("fx", "fy", "fz", "mx", "my", "mz"):
            finite(getattr(load, key), f"/nodalLoads/{idx}/{key}", "nodalLoad", load.id)
    for idx, load in enumerate(model.memberLoads):
        ref(
            load.loadCaseId,
            load_cases,
            f"/memberLoads/{idx}/loadCaseId",
            "memberLoad",
            load.id,
        )
        ref(
            load.memberId,
            members,
            f"/memberLoads/{idx}/memberId",
            "memberLoad",
            load.id,
        )
        if load.type != "uniform":
            raise AnalysisError(
                "SCHEMA_ERROR",
                "Only uniform member loads are supported.",
                path=f"/memberLoads/{idx}/type",
            )
        if load.coordinateSystem not in {"local", "global"}:
            raise AnalysisError(
                "SCHEMA_ERROR",
                "coordinateSystem must be local or global.",
                path=f"/memberLoads/{idx}/coordinateSystem",
            )
        for key in ("wx", "wy", "wz"):
            finite(
                getattr(load, key), f"/memberLoads/{idx}/{key}", "memberLoad", load.id
            )
    for case_idx, mass_case in enumerate(model.massCases):
        if mass_case.method != "lumped":
            raise AnalysisError(
                "SCHEMA_ERROR",
                "Only lumped mass cases are supported.",
                path=f"/massCases/{case_idx}/method",
                entity_type="massCase",
                entity_id=mass_case.id,
            )
        if mass_case.source != "manual":
            raise AnalysisError(
                "SCHEMA_ERROR",
                "Only manual mass cases are supported.",
                path=f"/massCases/{case_idx}/source",
                entity_type="massCase",
                entity_id=mass_case.id,
            )
        for item_idx, item in enumerate(mass_case.items or []):
            ref(
                item.nodeId,
                nodes,
                f"/massCases/{case_idx}/items/{item_idx}/nodeId",
                "massCase",
                mass_case.id,
            )
            for key in ("mx", "my", "mz", "irx", "iry", "irz"):
                nonnegative(
                    getattr(item, key),
                    f"/massCases/{case_idx}/items/{item_idx}/{key}",
                    "massCase",
                    mass_case.id,
                )
    if model.analysisSettings.analysisType != "linear_static":
        raise AnalysisError(
            "SCHEMA_ERROR",
            "Only linear_static analysis is supported.",
            path="/analysisSettings/analysisType",
        )
    if model.analysisSettings.solver != "scipy_sparse":
        raise AnalysisError(
            "SCHEMA_ERROR",
            "Only scipy_sparse solver is supported.",
            path="/analysisSettings/solver",
        )
    if (
        model.analysisSettings.includeShearDeformation
        or model.analysisSettings.largeDisplacement
    ):
        raise AnalysisError(
            "SCHEMA_ERROR",
            "Nonlinear and shear deformation analysis are out of MVP scope.",
            path="/analysisSettings",
        )
    positive(
        model.analysisSettings.tolerance,
        "/analysisSettings/tolerance",
        "analysisSettings",
        "analysisSettings",
    )
    validate_saved_analysis_settings(model)


def validate_saved_time_history_settings(model: "Model") -> None:
    """Validate the time history analysis blocks stored on the model.

    This function is the TH-1d integration point: it re-runs the
    TH-1a model validators (parse_time_history_settings and
    parse_ground_motions) so the in-memory Model satisfies the
    project JSON schema.

    Missing blocks are accepted. Unknown nested fields are accepted
    (they are preserved by the loader and the saver as opaque data).
    The function translates TimeHistoryModelError into AnalysisError
    using the project-standard error code "INVALID_VALUE" and a
    JSON-pointer style path.
    """

    time_history_payload = model.analysisSettings.timeHistory
    if time_history_payload is not None:
        try:
            parse_time_history_settings(time_history_payload)
        except TimeHistoryModelError as exc:
            raise _to_analysis_error(exc, prefix="/analysisSettings/timeHistory") from exc

    try:
        parse_ground_motions(model.groundMotions)
    except TimeHistoryModelError as exc:
        raise _to_analysis_error(exc, prefix="/groundMotions") from exc

    # TH-4: validate the persisted result block, if any. The MVP keeps
    # the result block as an opaque dict; full structural validation
    # delegates to parse_time_history_result which raises AnalysisError
    # with a JSON-pointer path.
    if model.analysisResults is not None:
        time_history_result = model.analysisResults.get("timeHistory")
        if time_history_result is not None:
            parse_time_history_result(time_history_result)


def _to_analysis_error(exc: TimeHistoryModelError, *, prefix: str) -> AnalysisError:
    """Translate a TimeHistoryModelError into a project AnalysisError.

    The mapping is intentionally simple: the error message is used
    verbatim, and the path is derived by stripping the leading
    "timeHistory." or "groundMotions[i]." prefix from the message
    and prepending the supplied JSON-pointer prefix. The MVP uses
    a single "INVALID_VALUE" code for all time history violations
    to match the existing convention used by eigen, influence, and
    response spectrum validation paths.
    """

    message = str(exc)
    path_suffix = _extract_path_suffix(message)
    full_path = f"{prefix}{path_suffix}"
    return AnalysisError("INVALID_VALUE", message, path=full_path)


def _extract_path_suffix(message: str) -> str:
    """Extract the path suffix from a TimeHistoryModelError message.

    The TH-1a error messages use a structured prefix that mirrors
    the JSON-pointer path to the offending field, e.g.:

    * ``timeHistory.timeStep must be positive.`` -> ``/timeStep``
    * ``groundMotions[2].direction must be one of ...`` -> ``/2/direction``
    * ``timeHistory.damping.type must be one of ...`` -> ``/damping/type``

    The MVP strips the leading "timeHistory." or "groundMotions[i]."
    segment and returns the remainder as a JSON-pointer path
    component starting with "/".
    """

    head_end = message.find(" ") if " " in message else len(message)
    head = message[:head_end]
    if head.startswith("timeHistory."):
        # JSON pointer style: use "/" as the segment separator.
        return "/" + head[len("timeHistory."):].replace(".", "/")
    if head.startswith("groundMotions["):
        bracket = head.find("]")
        if bracket == -1:
            return ""
        index = head[len("groundMotions["):bracket]
        # The dataclass __post_init__ uses "[]" to mean "any record".
        # Map that to a "/*/" path component to indicate a project-level
        # rule that applies to every record. parse_ground_motions emits
        # the per-record index for known cases, so this branch is
        # reached only for schema-level enum/range checks.
        if index == "":
            index_token = "/*"
        else:
            index_token = "/" + index
        rest = head[bracket + 1:]
        # Strip a leading "." separator between the index and the field name.
        if rest.startswith("."):
            rest = rest[1:]
        return index_token + "/" + rest
    return ""


def validate_saved_analysis_settings(model: Model) -> None:
    # Validate the time history analysis blocks first (TH-1d).
    # This is placed before the eigen/influence checks so the
    # call always runs even when the influence block triggers an
    # early return.
    validate_saved_time_history_settings(model)
    eigen = model.analysisSettings.eigen
    if eigen is not None:
        mass_case_id = eigen.get("massCaseId")
        ref(
            mass_case_id,
            {case.id for case in model.massCases},
            "/analysisSettings/eigen/massCaseId",
            "massCase",
            str(mass_case_id or ""),
        )
        mode_count = eigen.get("modeCount")
        if not isinstance(mode_count, int) or isinstance(mode_count, bool) or mode_count <= 0:
            raise AnalysisError(
                "INVALID_VALUE",
                "modeCount must be a positive integer.",
                path="/analysisSettings/eigen/modeCount",
            )

    influence = model.analysisSettings.influence
    if influence is None:
        return
    line = influence.get("line")
    if not isinstance(line, dict):
        raise AnalysisError(
            "SCHEMA_ERROR",
            "Influence line settings are required.",
            path="/analysisSettings/influence/line",
        )
    member_id = line.get("memberId")
    ref(
        member_id,
        model.member_by_id,
        "/analysisSettings/influence/line/memberId",
        "member",
        str(member_id or ""),
    )
    station_count = line.get("stationCount")
    if (
        not isinstance(station_count, int)
        or isinstance(station_count, bool)
        or not 2 <= station_count <= 201
    ):
        raise AnalysisError(
            "INVALID_VALUE",
            "stationCount must be an integer from 2 through 201.",
            path="/analysisSettings/influence/line/stationCount",
        )
    magnitude = line.get("magnitude")
    if not isinstance(magnitude, int | float) or not math.isfinite(magnitude):
        raise AnalysisError(
            "INVALID_VALUE",
            "Influence load magnitude must be finite.",
            path="/analysisSettings/influence/line/magnitude",
        )
    direction = line.get("direction")
    if not isinstance(direction, dict):
        raise AnalysisError(
            "SCHEMA_ERROR",
            "Influence load direction is required.",
            path="/analysisSettings/influence/line/direction",
        )
    direction_values = []
    for axis in ("x", "y", "z"):
        value = direction.get(axis)
        if not isinstance(value, int | float) or not math.isfinite(value):
            raise AnalysisError(
                "INVALID_VALUE",
                "Influence load direction must contain finite components.",
                path=f"/analysisSettings/influence/line/direction/{axis}",
            )
        direction_values.append(float(value))
    if math.sqrt(sum(value * value for value in direction_values)) <= 1e-12:
        raise AnalysisError(
            "INVALID_VALUE",
            "Influence load direction must not be zero.",
            path="/analysisSettings/influence/line/direction",
        )
    for index, target in enumerate(influence.get("targets", [])):
        if target.get("type") in {"displacement", "reaction"}:
            ref(
                target.get("nodeId"),
                model.node_by_id,
                f"/analysisSettings/influence/targets/{index}/nodeId",
                "node",
                str(target.get("nodeId") or ""),
            )
        elif target.get("type") == "memberEndForce":
            ref(
                target.get("memberId"),
                model.member_by_id,
                f"/analysisSettings/influence/targets/{index}/memberId",
                "member",
                str(target.get("memberId") or ""),
            )


def ensure_unique(values: list[str], entity_type: str, path: str) -> None:
    seen: set[str] = set()
    for value in values:
        if value in seen:
            raise AnalysisError(
                "DUPLICATE_ID",
                f"Duplicate {entity_type} id: {value}.",
                path=path,
                entity_type=entity_type,
                entity_id=value,
            )
        seen.add(value)


def positive(value: float, path: str, entity_type: str, entity_id: str) -> None:
    if not math.isfinite(value) or value <= 0.0:
        raise AnalysisError(
            "INVALID_VALUE",
            "Value must be finite and positive.",
            path=path,
            entity_type=entity_type,
            entity_id=entity_id,
        )


def finite(value: float, path: str, entity_type: str, entity_id: str) -> None:
    if not math.isfinite(value):
        raise AnalysisError(
            "INVALID_VALUE",
            "Value must be finite.",
            path=path,
            entity_type=entity_type,
            entity_id=entity_id,
        )


def nonnegative(value: float, path: str, entity_type: str, entity_id: str) -> None:
    if not math.isfinite(value) or value < 0.0:
        raise AnalysisError(
            "INVALID_VALUE",
            "Value must be finite and non-negative.",
            path=path,
            entity_type=entity_type,
            entity_id=entity_id,
        )


def ref(
    value: str,
    collection: dict[str, Any] | set[str],
    path: str,
    entity_type: str,
    entity_id: str,
) -> None:
    if value not in collection:
        raise AnalysisError(
            "INVALID_REFERENCE",
            f"Referenced id does not exist: {value}.",
            path=path,
            entity_type=entity_type,
            entity_id=entity_id,
        )

# ---------------------------------------------------------------------------
# Project saver.
# 
# The functions in this section serialize an in-memory Model back into a
# project dict. The saver preserves the time history analysis fields added
# by TH-1a (analysisSettings.timeHistory) and TH-1b (groundMotions).
# 
# The MVP saver is a Model-driven serializer. It does not attempt to
# preserve unknown top-level keys that were not modeled in TH-1a; those
# are handled by the API save endpoint, which dumps the input project
# dict directly to JSON. The function below is intended for the future
# TH-2 solver pipeline, where the in-memory model is the source of
# truth.
# ---------------------------------------------------------------------------


def _model_to_project_payload(model: "Model") -> dict[str, Any]:
    """Build the canonical project dict from a Model.

    The output is deterministic: top-level keys are emitted in a fixed
    order so that the same Model always produces the same JSON.
    """

    payload: dict[str, Any] = {}
    payload["project"] = asdict(model.project)
    payload["nodes"] = [asdict(node) for node in model.nodes]
    payload["materials"] = [asdict(material) for material in model.materials]
    payload["sections"] = [asdict(section) for section in model.sections]
    payload["members"] = [_member_to_dict(member) for member in model.members]
    payload["supports"] = [asdict(support) for support in model.supports]
    payload["loadCases"] = [asdict(case) for case in model.loadCases]
    payload["nodalLoads"] = [asdict(load) for load in model.nodalLoads]
    payload["memberLoads"] = [asdict(load) for load in model.memberLoads]
    payload["massCases"] = [_mass_case_to_dict(case) for case in model.massCases]
    payload["analysisSettings"] = _analysis_settings_to_dict(model.analysisSettings)
    # groundMotions is preserved as-is. The loader keeps the entries as
    # dicts so any future-compatible keys are retained through the round
    # trip.
    payload["groundMotions"] = copy.deepcopy(model.groundMotions)
    # analysisResults is preserved as an opaque dict. The MVP keeps the
    # entire block untouched so that any future-compatible result
    # fields (e.g. nonlinear dynamic results) are retained through the
    # round trip without requiring per-result-type handling here.
    if model.analysisResults is not None:
        payload["analysisResults"] = copy.deepcopy(model.analysisResults)
    return payload


def model_to_project_dict(model: "Model") -> dict[str, Any]:
    """Convert a Model back into a project dict for project saving.

    The returned dict can be passed to :func:`parse_model` to obtain an
    equivalent Model. The round trip preserves the time history fields
    (analysisSettings.timeHistory and groundMotions).

    The function does not mutate ``model``; the in-memory Model is left
    untouched.
    """

    return _model_to_project_payload(model)


def _member_to_dict(member: "Member") -> dict[str, Any]:
    """Serialize a Member dataclass to a dict with a stable key order.

    The Member dataclass uses ``field(default=None)`` for the two
    orientation fields, but the project schema disallows passing them
    together. The loader already rejects that case, so the saver only
    needs to omit the keys when they are ``None`` to keep the output
    compact and avoid spurious ``None`` values.
    """

    payload = asdict(member)
    if payload.get("orientationVector") is None:
        payload.pop("orientationVector", None)
    if payload.get("orientationNode") is None:
        payload.pop("orientationNode", None)
    return payload


def _mass_case_to_dict(case: "MassCase") -> dict[str, Any]:
    """Serialize a MassCase to a dict.

    ``items`` is normalized to an empty list when ``None`` so the saved
    payload is deterministic.
    """

    payload = asdict(case)
    if payload.get("items") is None:
        payload["items"] = []
    return payload


def _analysis_settings_to_dict(settings: "AnalysisSettings") -> dict[str, Any]:
    """Serialize AnalysisSettings to a dict with a stable key order.

    The MVP keeps the time history block as an opaque dict so that any
    future-compatible keys are retained. The other optional sub-blocks
    (``eigen``, ``influence``, ``responseSpectrum``) follow the same
    convention.
    """

    payload: dict[str, Any] = {}
    payload["analysisType"] = settings.analysisType
    payload["solver"] = settings.solver
    payload["includeShearDeformation"] = settings.includeShearDeformation
    payload["largeDisplacement"] = settings.largeDisplacement
    payload["tolerance"] = settings.tolerance
    if settings.eigen is not None:
        payload["eigen"] = copy.deepcopy(settings.eigen)
    if settings.influence is not None:
        payload["influence"] = copy.deepcopy(settings.influence)
    if settings.responseSpectrum is not None:
        payload["responseSpectrum"] = copy.deepcopy(settings.responseSpectrum)
    if settings.timeHistory is not None:
        payload["timeHistory"] = copy.deepcopy(settings.timeHistory)
    return payload

