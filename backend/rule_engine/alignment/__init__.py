# -*- coding: utf-8 -*-
"""LINER Alignment Solver public adapter surface.

Canonical Alignment model/builder over the X4-A Geometry Kernel.
"""
from .model import Alignment, AlignmentError, AlignmentElement, AlignmentSpan, build_alignment

__all__ = [
    "Alignment",
    "AlignmentError",
    "AlignmentElement",
    "AlignmentSpan",
    "build_alignment",
]