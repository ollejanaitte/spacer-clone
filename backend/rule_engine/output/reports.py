# -*- coding: utf-8 -*-
"""Output - report serializers (STEP-2 S2-UX13).

Produces lightweight report outputs (CSV and HTML) from tables built by
`output.tables`, and a minimal DXF writer for coordinate/line primitives.

These are backend report/drawing outputs that feed the frontend exports and
confirm drawings. DXF is emitted with a minimal but valid structure
(HEADER + TABLES + ENTITIES with LINE / POINT / TEXT) using AC1009 (DXF 12).
"""
from __future__ import annotations

import csv
import html
import io
from dataclasses import dataclass, field
from typing import List, Optional

from .tables import Table

__all__ = [
    "ReportSet",
    "build_report_set",
    "table_to_csv",
    "table_to_html",
    "DxfPoint",
    "DxfLine",
    "DxfText",
    "DxfDocument",
    "render_dxf",
]


# ---------------------------------------------------------------------------
# CSV / HTML report
# ---------------------------------------------------------------------------

def table_to_csv(table: Table) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(table.columns)
    for row in table.rows:
        writer.writerow(row.columns)
    return buffer.getvalue()


def table_to_html(table: Table) -> str:
    escaped_title = html.escape(table.title)
    header = "".join(f"<th>{html.escape(c)}</th>" for c in table.columns)
    body = "".join(
        "<tr>" + "".join(f"<td>{html.escape(c)}</td>" for c in row.columns) + "</tr>"
        for row in table.rows
    )
    return (f"<table><caption>{escaped_title}</caption>"
            f"<thead><tr>{header}</tr></thead><tbody>{body}</tbody></table>")


@dataclass
class ReportSet:
    """A named collection of tables, serializable to CSV/HTML."""
    name: str
    tables: List[Table] = field(default_factory=list)

    def to_csv_bundle(self) -> dict:
        return {t.title: table_to_csv(t) for t in self.tables}

    def to_html(self) -> str:
        return "\n".join(table_to_html(t) for t in self.tables)


def build_report_set(name: str, tables: List[Table]) -> ReportSet:
    return ReportSet(name=name, tables=list(tables))


# ---------------------------------------------------------------------------
# Minimal DXF
# ---------------------------------------------------------------------------

@dataclass
class DxfPoint:
    x: float
    y: float
    z: float = 0.0
    layer: str = "0"


@dataclass
class DxfLine:
    x1: float
    y1: float
    x2: float
    y2: float
    z: float = 0.0
    layer: str = "0"


@dataclass
class DxfText:
    text: str
    x: float
    y: float
    height: float = 2.5
    layer: str = "TEXT"


@dataclass
class DxfDocument:
    points: List[DxfPoint] = field(default_factory=list)
    lines: List[DxfLine] = field(default_factory=list)
    texts: List[DxfText] = field(default_factory=list)


def _point_entities(point: DxfPoint) -> str:
    return (
        "  0\nPOINT\n  8\n{layer}\n 10\n{x}\n 20\n{y}\n 30\n{z}\n"
        .format(layer=point.layer, x=point.x, y=point.y, z=point.z)
    )


def _line_entities(line: DxfLine) -> str:
    return (
        "  0\nLINE\n  8\n{layer}\n 10\n{x1}\n 20\n{y1}\n 30\n{z}\n"
        " 11\n{x2}\n 21\n{y2}\n 31\n{z}\n"
        .format(layer=line.layer, x1=line.x1, y1=line.y1,
                x2=line.x2, y2=line.y2, z=line.z)
    )


def _text_entities(text: DxfText) -> str:
    return (
        "  0\nTEXT\n  8\n{layer}\n 10\n{x}\n 20\n{y}\n 30\n0.0\n"
        " 40\n{height}\n  1\n{value}\n"
        .format(layer=text.layer, x=text.x, y=text.y,
                height=text.height, value=text.text)
    )


def render_dxf(document: DxfDocument) -> str:
    """Serialize a DxfDocument to a DXF-12 (AC1009) string."""
    entities = ""
    for point in document.points:
        entities += _point_entities(point)
    for line in document.lines:
        entities += _line_entities(line)
    for text in document.texts:
        entities += _text_entities(text)

    head = (
        "0\nSECTION\n  2\nHEADER\n"
        "  9\n$ACADVER\n  1\nAC1009\n"
        "  9\n$INSUNITS\n 70\n6\n"
        "0\nENDSEC\n"
    )
    tables_section = (
        "0\nSECTION\n  2\nTABLES\n"
        "  0\nTABLE\n  2\nLAYER\n 70\n1\n"
        "  0\nENDTAB\n"
        "0\nENDSEC\n"
    )
    entities_section = f"0\nSECTION\n  2\nENTITIES\n{entities}0\nENDSEC\n"
    eof = "  0\nEOF\n"
    return head + tables_section + entities_section + eof
