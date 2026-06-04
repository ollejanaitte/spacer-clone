from __future__ import annotations

from dataclasses import dataclass
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
    poissonRatio: float
    density: float = 0.0

    @property
    def shear_modulus(self) -> float:
        return self.elasticModulus / (2.0 * (1.0 + self.poissonRatio))


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
class AnalysisSettings:
    analysisType: str = "linear_static"
    includeShearDeformation: bool = False
    largeDisplacement: bool = False
    tolerance: float = 1e-9


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
    reject_mvp_extras(data)
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
        analysisSettings=settings,
    )
    validate_model(model)
    return model


def reject_mvp_extras(data: dict[str, Any]) -> None:
    if "units" in data:
        raise AnalysisError(
            "SCHEMA_ERROR", "units is not part of the MVP engine input.", path="/units"
        )


def parse_material(item: dict[str, Any], index: int) -> Material:
    if "shearModulus" in item:
        raise AnalysisError(
            "SCHEMA_ERROR",
            "shearModulus must be computed from elasticModulus and poissonRatio.",
            path=f"/materials/{index}/shearModulus",
            entity_type="material",
            entity_id=item.get("id"),
        )
    return Material(**item)


def parse_member(item: dict[str, Any], index: int) -> Member:
    if "orientationNode" in item:
        raise AnalysisError(
            "SCHEMA_ERROR",
            "orientationNode is not supported in the MVP engine.",
            path=f"/members/{index}/orientationNode",
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
        label=item.get("label", ""),
    )


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
    ensure_unique(
        [support.nodeId for support in model.supports], "support", "/supports"
    )
    nodes = model.node_by_id
    materials = model.material_by_id
    sections = model.section_by_id
    load_cases = {case.id for case in model.loadCases}
    members = model.member_by_id
    for idx, material in enumerate(model.materials):
        positive(
            material.elasticModulus,
            f"/materials/{idx}/elasticModulus",
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
    if model.analysisSettings.analysisType != "linear_static":
        raise AnalysisError(
            "SCHEMA_ERROR",
            "Only linear_static analysis is supported.",
            path="/analysisSettings/analysisType",
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
    if value <= 0.0:
        raise AnalysisError(
            "INVALID_VALUE",
            "Value must be positive.",
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
