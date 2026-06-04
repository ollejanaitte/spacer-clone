from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from .errors import AnalysisError
from .model import Material, Member, Node, OrientationVector, Section


def length_and_rotation(
    node_i: Node,
    node_j: Node,
    orientation: OrientationVector | None,
    orientation_node: Node | None = None,
) -> tuple[float, NDArray[np.float64]]:
    p_i = np.array([node_i.x, node_i.y, node_i.z], dtype=float)
    p_j = np.array([node_j.x, node_j.y, node_j.z], dtype=float)
    axis = p_j - p_i
    length = float(np.linalg.norm(axis))
    if length <= 0.0:
        raise AnalysisError(
            "ZERO_LENGTH_MEMBER", "Member length is zero.", entity_type="member"
        )
    x_axis = axis / length
    candidate = orientation_array(orientation, orientation_node, node_i, x_axis)
    y_axis = candidate - float(np.dot(candidate, x_axis)) * x_axis
    y_norm = float(np.linalg.norm(y_axis))
    if y_norm < 1e-12:
        raise AnalysisError(
            "INVALID_ORIENTATION", "orientationVector is parallel to the member axis."
        )
    y_axis /= y_norm
    z_axis = np.cross(x_axis, y_axis)
    z_axis /= np.linalg.norm(z_axis)
    y_axis = np.cross(z_axis, x_axis)
    rotation = np.vstack([x_axis, y_axis, z_axis])
    return length, rotation


def orientation_array(
    orientation: OrientationVector | None,
    orientation_node: Node | None,
    node_i: Node,
    x_axis: NDArray[np.float64],
) -> NDArray[np.float64]:
    if orientation is not None:
        vector = np.array([orientation.x, orientation.y, orientation.z], dtype=float)
        norm = float(np.linalg.norm(vector))
        if norm < 1e-12:
            raise AnalysisError(
                "INVALID_ORIENTATION", "orientationVector must not be zero."
            )
        return vector / norm
    if orientation_node is not None:
        vector = np.array(
            [
                orientation_node.x - node_i.x,
                orientation_node.y - node_i.y,
                orientation_node.z - node_i.z,
            ],
            dtype=float,
        )
        norm = float(np.linalg.norm(vector))
        if norm < 1e-12:
            raise AnalysisError(
                "INVALID_ORIENTATION", "orientationNode must not coincide with nodeI."
            )
        return vector / norm
    global_z = np.array([0.0, 0.0, 1.0])
    if abs(float(np.dot(x_axis, global_z))) > 0.99:
        return np.array([0.0, 1.0, 0.0])
    return global_z


def local_stiffness(
    length: float, material: Material, section: Section
) -> NDArray[np.float64]:
    e = material.elasticModulus
    g = material.shearModulus
    a = section.area
    iy = section.iy
    iz = section.iz
    j = section.j
    span = length
    k = np.zeros((12, 12), dtype=float)
    set_submatrix(
        k,
        [0, 6],
        np.array([[e * a / span, -e * a / span], [-e * a / span, e * a / span]]),
    )
    set_submatrix(
        k,
        [3, 9],
        np.array([[g * j / span, -g * j / span], [-g * j / span, g * j / span]]),
    )
    l2 = span * span
    l3 = l2 * span
    yz = np.array(
        [
            [12 * e * iz / l3, 6 * e * iz / l2, -12 * e * iz / l3, 6 * e * iz / l2],
            [6 * e * iz / l2, 4 * e * iz / span, -6 * e * iz / l2, 2 * e * iz / span],
            [-12 * e * iz / l3, -6 * e * iz / l2, 12 * e * iz / l3, -6 * e * iz / l2],
            [6 * e * iz / l2, 2 * e * iz / span, -6 * e * iz / l2, 4 * e * iz / span],
        ]
    )
    set_submatrix(k, [1, 5, 7, 11], yz)
    zy = np.array(
        [
            [12 * e * iy / l3, -6 * e * iy / l2, -12 * e * iy / l3, -6 * e * iy / l2],
            [-6 * e * iy / l2, 4 * e * iy / span, 6 * e * iy / l2, 2 * e * iy / span],
            [-12 * e * iy / l3, 6 * e * iy / l2, 12 * e * iy / l3, 6 * e * iy / l2],
            [-6 * e * iy / l2, 2 * e * iy / span, 6 * e * iy / l2, 4 * e * iy / span],
        ]
    )
    set_submatrix(k, [2, 4, 8, 10], zy)
    return k


def set_submatrix(
    target: NDArray[np.float64], indices: list[int], values: NDArray[np.float64]
) -> None:
    for row_index, row in enumerate(indices):
        for col_index, col in enumerate(indices):
            target[row, col] = values[row_index, col_index]


def transformation(rotation: NDArray[np.float64]) -> NDArray[np.float64]:
    transform = np.zeros((12, 12), dtype=float)
    for block in range(4):
        start = block * 3
        transform[start : start + 3, start : start + 3] = rotation
    return transform


def element_matrices(
    member: Member,
    node_i: Node,
    node_j: Node,
    material: Material,
    section: Section,
    orientation_node: Node | None = None,
) -> tuple[float, NDArray[np.float64], NDArray[np.float64], NDArray[np.float64]]:
    length, rotation = length_and_rotation(
        node_i, node_j, member.orientationVector, orientation_node
    )
    k_local = local_stiffness(length, material, section)
    transform = transformation(rotation)
    k_global = transform.T @ k_local @ transform
    return length, rotation, k_local, k_global


def equivalent_uniform_load_local(
    length: float, wx: float, wy: float, wz: float
) -> NDArray[np.float64]:
    span = length
    load = np.zeros(12, dtype=float)
    load[0] = wx * span / 2.0
    load[6] = wx * span / 2.0
    load[1] = wy * span / 2.0
    load[5] = wy * span * span / 12.0
    load[7] = wy * span / 2.0
    load[11] = -wy * span * span / 12.0
    load[2] = wz * span / 2.0
    load[4] = -wz * span * span / 12.0
    load[8] = wz * span / 2.0
    load[10] = wz * span * span / 12.0
    return load
