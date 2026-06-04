from __future__ import annotations

from dataclasses import dataclass

from .model import Model, Support

DOF_NAMES = ("ux", "uy", "uz", "rx", "ry", "rz")


@dataclass(frozen=True)
class DofMap:
    node_index: dict[str, int]

    @property
    def total_dof(self) -> int:
        return 6 * len(self.node_index)

    def node_dofs(self, node_id: str) -> list[int]:
        base = 6 * self.node_index[node_id]
        return [base + offset for offset in range(6)]

    def dof(self, node_id: str, name: str) -> int:
        return self.node_dofs(node_id)[DOF_NAMES.index(name)]


def build_dof_map(model: Model) -> DofMap:
    return DofMap(node_index={node.id: index for index, node in enumerate(model.nodes)})


def member_dofs(dof_map: DofMap, node_i: str, node_j: str) -> list[int]:
    return dof_map.node_dofs(node_i) + dof_map.node_dofs(node_j)


def constrained_dofs(model: Model, dof_map: DofMap) -> list[int]:
    values: list[int] = []
    for support in model.supports:
        values.extend(support_dofs(support, dof_map))
    return sorted(set(values))


def support_dofs(support: Support, dof_map: DofMap) -> list[int]:
    node_dofs = dof_map.node_dofs(support.nodeId)
    return [
        node_dofs[index]
        for index, name in enumerate(DOF_NAMES)
        if getattr(support, name)
    ]
