from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.sparse import coo_matrix, csr_matrix

from .dof import DofMap, member_dofs
from .element import element_matrices, equivalent_uniform_load_local, transformation
from .model import Member, MemberLoad, Model


@dataclass(frozen=True)
class ElementState:
    member: Member
    dofs: list[int]
    length: float
    rotation: NDArray[np.float64]
    k_local: NDArray[np.float64]
    k_global: NDArray[np.float64]
    f_equiv_local_by_case: dict[str, NDArray[np.float64]]


@dataclass(frozen=True)
class Assembly:
    stiffness: csr_matrix
    element_states: list[ElementState]


def assemble_stiffness(model: Model, dof_map: DofMap) -> Assembly:
    rows: list[int] = []
    cols: list[int] = []
    values: list[float] = []
    states: list[ElementState] = []
    nodes = model.node_by_id
    materials = model.material_by_id
    sections = model.section_by_id
    member_loads = loads_by_member(model.memberLoads)
    for member in model.members:
        length, rotation, k_local, k_global = element_matrices(
            member,
            nodes[member.nodeI],
            nodes[member.nodeJ],
            materials[member.materialId],
            sections[member.sectionId],
        )
        dofs = member_dofs(dof_map, member.nodeI, member.nodeJ)
        for local_row, global_row in enumerate(dofs):
            for local_col, global_col in enumerate(dofs):
                rows.append(global_row)
                cols.append(global_col)
                values.append(float(k_global[local_row, local_col]))
        states.append(
            ElementState(
                member=member,
                dofs=dofs,
                length=length,
                rotation=rotation,
                k_local=k_local,
                k_global=k_global,
                f_equiv_local_by_case=equivalent_loads_by_case(
                    length, rotation, member_loads.get(member.id, [])
                ),
            )
        )
    total = dof_map.total_dof
    stiffness = coo_matrix((values, (rows, cols)), shape=(total, total)).tocsr()
    return Assembly(stiffness=stiffness, element_states=states)


def load_vector(
    model: Model, dof_map: DofMap, assembly: Assembly, load_case_id: str
) -> NDArray[np.float64]:
    vector = np.zeros(dof_map.total_dof, dtype=float)
    for load in model.nodalLoads:
        if load.loadCaseId != load_case_id:
            continue
        dofs = dof_map.node_dofs(load.nodeId)
        vector[dofs] += np.array(
            [load.fx, load.fy, load.fz, load.mx, load.my, load.mz], dtype=float
        )
    for state in assembly.element_states:
        local = state.f_equiv_local_by_case.get(load_case_id)
        if local is None:
            continue
        global_load = transformation(state.rotation).T @ local
        vector[state.dofs] += global_load
    return vector


def equivalent_loads_by_case(
    length: float,
    rotation: NDArray[np.float64],
    loads: list[MemberLoad],
) -> dict[str, NDArray[np.float64]]:
    by_case: dict[str, NDArray[np.float64]] = {}
    for load in loads:
        if load.coordinateSystem == "global":
            wx, wy, wz = rotation @ np.array([load.wx, load.wy, load.wz], dtype=float)
        else:
            wx, wy, wz = load.wx, load.wy, load.wz
        equiv = equivalent_uniform_load_local(length, wx, wy, wz)
        by_case[load.loadCaseId] = (
            by_case.get(load.loadCaseId, np.zeros(12, dtype=float)) + equiv
        )
    return by_case


def loads_by_member(loads: list[MemberLoad]) -> dict[str, list[MemberLoad]]:
    result: dict[str, list[MemberLoad]] = {}
    for load in loads:
        result.setdefault(load.memberId, []).append(load)
    return result
