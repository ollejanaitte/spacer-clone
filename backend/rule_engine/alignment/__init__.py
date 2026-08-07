# -*- coding: utf-8 -*-
"""LINER Alignment Solver public adapter surface.

Canonical Alignment model/builder over the X4-A Geometry Kernel.
"""
from .model import Alignment, AlignmentError, AlignmentElement, AlignmentSpan, build_alignment
from .station import STATION_EPSILON, AlignmentRangeError, StationLookup, lookup_station, station_at

__all__ = [
    "Alignment",
    "AlignmentError",
    "AlignmentElement",
    "AlignmentSpan",
    "build_alignment",
    "STATION_EPSILON",
    "AlignmentRangeError",
    "StationLookup",
    "lookup_station",
    "station_at",
]