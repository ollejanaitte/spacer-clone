# -*- coding: utf-8 -*-
"""Road Geometry API - facade surface (X4D).

Unifies the X4-A Geometry Kernel, X4-B Alignment Solver and X4-C Cross Section
Generator behind a single entry point.
"""
from .contracts import (
    RoadGeometryError,
    RoadGeometryRequest,
    RoadGeometryResult,
    validate_request,
)
from .api import RoadGeometryAPI, road_geometry_api

__all__ = [
    "RoadGeometryError",
    "RoadGeometryRequest",
    "RoadGeometryResult",
    "RoadGeometryAPI",
    "road_geometry_api",
    "validate_request",
]
