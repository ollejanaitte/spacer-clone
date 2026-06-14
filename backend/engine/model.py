from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

from .errors import AnalysisError


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
    settings = AnalysisSettings(**data.get("analysisSettings", {}))
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


def validate_saved_analysis_settings(model: Model) -> None:
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
