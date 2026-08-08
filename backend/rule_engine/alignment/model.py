# -*- coding: utf-8 -*-
"""Canonical Alignment model and builder.

Provides the top-level LINER Alignment model over a single centerline, built on
top of the X4-A canonical Geometry Kernel. This module defines:

- AlignmentElement (thin wrapper over the kernel element dataclasses)
- Alignment (ordered element sequence with cumulative station spans)
- build_alignment (validation + deterministic span derivation)

No geometry math is re-implemented here; element parameters reuse the X4-A
kernel types (backend.rule_engine.geometry.line_arc / clothoid) so Solvers can
delegate all numeric evaluation to the canonical kernel.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Union

from backend.rule_engine.geometry.line_arc import CircularArcElement, StraightElement
from backend.rule_engine.geometry.clothoid import ClothoidElement

AlignmentElement = Union[StraightElement, CircularArcElement, ClothoidElement]


class AlignmentError(ValueError):
    """Raised when an Alignment cannot be constructed or is internally inconsistent."""


@dataclass
class AlignmentSpan:
    """An Alignment element plus its resolved absolute start/end station."""
    element: AlignmentElement
    start_station: float
    end_station: float
    index: int = 0

    @property
    def length(self) -> float:
        return self.element.length

    @property
    def element_id(self) -> str:
        return self.element.id

    @property
    def element_type(self) -> str:
        return self.element.type


@dataclass
class Alignment:
    """A single-1 Alignment: an ordered sequence of kernel elements."""
    alignment_id: str
    elements: List[AlignmentElement] = field(default_factory=list)
    origin_station: float = 0.0
    source_trace: Optional[str] = None
    _spans: Optional[List[AlignmentSpan]] = field(default=None, repr=False, compare=False)

    @property
    def total_length(self) -> float:
        """Cumulative geometric length of the element sequence (origin-independent)."""
        if not self._spans:
            return 0.0
        return self._spans[-1].end_station - self.origin_station

    @property
    def start_station(self) -> float:
        return self.origin_station

    @property
    def end_station(self) -> float:
        return self.origin_station + self.total_length

    @property
    def station_range(self) -> Tuple[float, float]:
        return (self.start_station, self.end_station)

    @property
    def spans(self) -> List[AlignmentSpan]:
        if self._spans is None:
            raise AlignmentError("Alignment must be built via build_alignment() before reading spans")
        return self._spans


def _check_length(element: AlignmentElement) -> None:
    if not (element.length > 0):
        raise AlignmentError(
            f"element {element.id!r} has non-positive length {element.length!r} "
            "(only strictly positive element lengths are supported)"
        )


def build_alignment(
    alignment_id: str,
    elements: List[AlignmentElement],
    *,
    origin_station: float = 0.0,
    source_trace: Optional[str] = None,
) -> Alignment:
    """Validate and build a canonical Alignment with deterministic station spans.

    Raises AlignmentError on:
      - empty alignment_id
      - empty element list
      - non-positive element length
      - duplicate element id
    """
    if not alignment_id:
        raise AlignmentError("alignment_id must be non-empty")
    if not elements:
        raise AlignmentError("alignment must contain at least one element")

    seen_ids: set = set()
    cumulative = origin_station
    spans: List[AlignmentSpan] = []
    for index, element in enumerate(elements):
        if element.id in seen_ids:
            raise AlignmentError(f"duplicate element id {element.id!r}")
        seen_ids.add(element.id)
        _check_length(element)
        start = cumulative
        end = cumulative + element.length
        spans.append(AlignmentSpan(element=element, start_station=start, end_station=end, index=index))
        cumulative = end

    return Alignment(
        alignment_id=alignment_id,
        elements=list(elements),
        origin_station=origin_station,
        source_trace=source_trace,
        _spans=spans,
    )


__all__ = [
    "Alignment",
    "AlignmentError",
    "AlignmentElement",
    "AlignmentSpan",
    "build_alignment",
]