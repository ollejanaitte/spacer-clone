# -*- coding: utf-8 -*-
"""Core Geometry Kernel contracts (mirror of frontend/src/liner/core/vector.ts & types.ts).

These dataclasses and utility functions establish the canonical backend-facing
contracts for the Geometry Kernel. They intentionally mirror the TypeScript
canonical implementation (frontend/src/liner/core/) for parity with the Rule
Engine consumers.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Vec2D:
    """2D point/vector. Mirrors Vec2 from frontend types.

    Also exposes convenience vector methods so consumers can use either the
    free-function style (dot2/normalize2/distance2) or the method style.
    """
    x: float = 0.0
    y: float = 0.0

    def distance_to(self, other: "Vec2D") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

    def dot(self, other: "Vec2D") -> float:
        return dot2(self, other)

    def cross(self, other: "Vec2D") -> float:
        return self.x * other.y - self.y * other.x

    def length(self) -> float:
        return math.hypot(self.x, self.y)

    def normalized(self) -> "Vec2D":
        return normalize2(self)


@dataclass
class Vec3:
    """3D vector. Mirrors Vec3 from frontend types."""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


@dataclass
class LocalFrame:
    """Orthonormal frame constructed from an azimuth (tangent/normal/binormal)."""
    tangent: Vec3 = field(default_factory=lambda: Vec3(1, 0, 0))
    normal: Vec3 = field(default_factory=lambda: Vec3(0, 1, 0))
    binormal: Vec3 = field(default_factory=lambda: Vec3(0, 0, 1))


def vec2(x: float, y: float) -> Vec2D:
    return Vec2D(x, y)


def vec3(x: float, y: float, z: float) -> Vec3:
    return Vec3(x, y, z)


def add2(a: Vec2D, b: Vec2D) -> Vec2D:
    return Vec2D(a.x + b.x, a.y + b.y)


def sub2(a: Vec2D, b: Vec2D) -> Vec2D:
    return Vec2D(a.x - b.x, a.y - b.y)


def scale2(v: Vec2D, factor: float) -> Vec2D:
    return Vec2D(v.x * factor, v.y * factor)


def distance2(a: Vec2D, b: Vec2D) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def dot2(a: Vec2D, b: Vec2D) -> float:
    return a.x * b.x + a.y * b.y


def cross3(a: Vec3, b: Vec3) -> Vec3:
    return Vec3(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x,
    )


def normalize2(v: Vec2D) -> Vec2D:
    length = math.hypot(v.x, v.y)
    if length == 0:
        return Vec2D(0, 0)
    return Vec2D(v.x / length, v.y / length)


def normalize3(v: Vec3) -> Vec3:
    length = math.hypot(v.x, v.y, v.z)
    if length == 0:
        return Vec3(0, 0, 0)
    return Vec3(v.x / length, v.y / length, v.z / length)


def angle_to_tangent(azimuth: float) -> Vec3:
    return Vec3(math.cos(azimuth), math.sin(azimuth), 0)


def angle_to_normal(azimuth: float) -> Vec3:
    return Vec3(-math.sin(azimuth), math.cos(azimuth), 0)


def local_frame_from_azimuth(azimuth: float) -> LocalFrame:
    tangent = normalize3(angle_to_tangent(azimuth))
    normal = normalize3(angle_to_normal(azimuth))
    return LocalFrame(tangent, normal, normalize3(cross3(tangent, normal)))


def normalize_angle(angle: float) -> float:
    """Normalize angle to [0, 2π)."""
    return angle % (2 * math.pi)


def offset_point(point: Vec2D, azimuth: float, offset: float) -> Vec2D:
    normal = angle_to_normal(azimuth)
    return Vec2D(point.x + normal.x * offset, point.y + normal.y * offset)


def azimuth_from_direction(dx: float, dy: float) -> float:
    """Compute azimuth from +X axis, normalized to [0, 2π)."""
    return normalize_angle(math.atan2(dy, dx))


def signed_curvature(turn: str, radius: float) -> float:
    """Signed curvature: left = positive, right = negative."""
    if radius <= 0 or not math.isfinite(radius):
        return 0.0
    return (1.0 / radius) if turn == "left" else (-1.0 / radius)


def radius_from_curvature(curvature: float) -> Optional[float]:
    """Inverse of signed_curvature. Returns None for straight/invalid curvature."""
    if not math.isfinite(curvature) or abs(curvature) <= 1e-12:
        return None
    return 1.0 / abs(curvature)


# Backward-compatible aliases for consumers that relied on the single-file
# adapter established during the canonical contract phase.
Vec2 = Vec2D
Point2D = Vec2D
Vector2D = Vec2D