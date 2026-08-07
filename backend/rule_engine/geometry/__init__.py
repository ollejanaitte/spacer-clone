# -*- coding: utf-8 -*-
"""Geometry Kernel Adapter for Rule Engine.

This adapter provides Python wrappers around the canonical TypeScript
Geometry Kernel (frontend/src/liner/core/geometry/).

Since the canonical implementation lives in TypeScript, this adapter
provides Python-side contracts and utilities that mirror the kernel's
conventions for use by the Rule Engine.
"""
from typing import Any, Dict, List, Optional, Tuple
import math


class Point2D:
    """2D point. Matches Vec2 from frontend types."""
    def __init__(self, x: float = 0.0, y: float = 0.0):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point2D({self.x}, {self.y})"

    def distance_to(self, other: "Point2D") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)


class Vector2D:
    """2D vector."""
    def __init__(self, x: float = 0.0, y: float = 0.0):
        self.x = x
        self.y = y

    def dot(self, other: "Vector2D") -> float:
        return self.x * other.x + self.y * other.y

    def cross(self, other: "Vector2D") -> float:
        return self.x * other.y - self.y * other.x

    def length(self) -> float:
        return math.hypot(self.x, self.y)

    def normalized(self) -> "Vector2D":
        l = self.length()
        if l < 1e-12:
            return Vector2D(0, 0)
        return Vector2D(self.x / l, self.y / l)


def normalize_angle(angle: float) -> float:
    """Normalize angle to [0, 2π)."""
    return angle % (2 * math.pi)


def azimuth_from_direction(dx: float, dy: float) -> float:
    """Compute azimuth from +X axis."""
    return normalize_angle(math.atan2(dy, dx))


def signed_curvature(turn: str, radius: float) -> float:
    """Signed curvature: left = positive, right = negative."""
    if radius <= 0 or not math.isfinite(radius):
        return 0.0
    return (1.0 / radius) if turn == "left" else (-1.0 / radius)
