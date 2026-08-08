# -*- coding: utf-8 -*-
"""Output - table builders (STEP-2 S2-UX12).

Builds report tables from resolved road / vertical / bridge geometry using the
shared formatter (STEP1 P04). All values are display-formatted; internal
precise values are preserved in `raw`.

Table kinds (STEP1 P04 §5.1):
- element table (線形要素表)
- key-point coordinate table (主要点座標表)
- station coordinate table (測点座標表)
- vertical table (縦断表)
- crossfall table (横断勾配表)
- road-edge table (道路端座標表)
- pier / girder / node coordinate tables
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from backend.rule_engine.bridge_geometry import Girder, Node, Pier
from backend.rule_engine.output.format import (
    format_angle,
    format_curvature,
    format_grade_percent,
    format_length,
    format_radius,
)

__all__ = [
    "Row",
    "Table",
    "element_table",
    "key_point_table",
    "station_coordinate_table",
    "vertical_table",
    "crossfall_table",
    "road_edge_table",
    "pier_table",
    "girder_table",
    "node_table",
]


@dataclass
class Row:
    columns: List[str] = field(default_factory=list)
    raw: dict = field(default_factory=dict)


@dataclass
class Table:
    title: str
    columns: List[str]
    rows: List[Row] = field(default_factory=list)


def _fmt(value: Optional[float]) -> str:
    return format_length(value)


def _fmt_r(curvature: Optional[float]) -> str:
    return format_radius(curvature)


def element_table(elements: List[dict]) -> Table:
    """元素表 rows: {type,id,start,end,length,radius_curvature,A}."""
    table = Table("線形要素表", ["種別", "ID", "開始測点", "終了測点", "長さL", "半径R", "緩和A"])
    for e in elements:
        table.rows.append(Row(
            columns=[
                str(e.get("type", "")),
                str(e.get("id", "")),
                _fmt(e.get("start")),
                _fmt(e.get("end")),
                _fmt(e.get("length")),
                _fmt_r(e.get("curvature")),
                _fmt(e.get("a")),
            ],
            raw=dict(e),
        ))
    return table


def key_point_table(points: List[dict]) -> Table:
    """Key points (BP/KA/KE/BC/EC/EBC/EP) rows: {name,station,x,y,z,R,A,L}."""
    table = Table("主要点座標表",
                  ["点", "測点", "X", "Y", "Z", "R", "A", "L"])
    for p in points:
        table.rows.append(Row(
            columns=[
                str(p.get("name", "")),
                _fmt(p.get("station")),
                _fmt(p.get("x")),
                _fmt(p.get("y")),
                _fmt(p.get("z")),
                _fmt_r(p.get("curvature")),
                _fmt(p.get("a")),
                _fmt(p.get("length")),
            ],
            raw=dict(p),
        ))
    return table


def station_coordinate_table(stations: List[dict]) -> Table:
    """Station rows: {station,x,y,z,heading,curvature,element_id}."""
    table = Table("測点座標表",
                  ["測点", "X", "Y", "Z", "方位角", "曲率", "要素"])
    for s in stations:
        table.rows.append(Row(
            columns=[
                _fmt(s.get("station")),
                _fmt(s.get("x")),
                _fmt(s.get("y")),
                _fmt(s.get("z")),
                format_angle(s.get("heading")),
                format_curvature(s.get("curvature")),
                str(s.get("element_id", "")),
            ],
            raw=dict(s),
        ))
    return table


def vertical_table(rows_data: List[dict]) -> Table:
    """Vertical rows: {station,z,grade_percent,curvature,element_id}."""
    table = Table("縦断表", ["測点", "計画高Z", "縦断勾配%", "縦断曲率", "要素"])
    for v in rows_data:
        table.rows.append(Row(
            columns=[
                _fmt(v.get("station")),
                _fmt(v.get("z")),
                format_grade_percent(v.get("grade")),
                format_curvature(v.get("vertical_curvature")),
                str(v.get("element_id", "")),
            ],
            raw=dict(v),
        ))
    return table


def crossfall_table(rows_data: List[dict]) -> Table:
    """Crossfall rows: {station,left,right,widening} (display %)."""
    table = Table("横断勾配表", ["測点", "左勾配%", "右勾配%", "拡幅量"])
    for c in rows_data:
        table.rows.append(Row(
            columns=[
                _fmt(c.get("station")),
                format_grade_percent(c.get("left")),
                format_grade_percent(c.get("right")),
                _fmt(c.get("widening")),
            ],
            raw=dict(c),
        ))
    return table


def road_edge_table(rows_data: List[dict]) -> Table:
    """Road edge rows: {station, side, x, y, z}."""
    table = Table("道路端座標表", ["測点", "側", "X", "Y", "Z"])
    for e in rows_data:
        table.rows.append(Row(
            columns=[
                _fmt(e.get("station")),
                str(e.get("side", "")),
                _fmt(e.get("x")),
                _fmt(e.get("y")),
                _fmt(e.get("z")),
            ],
            raw=dict(e),
        ))
    return table


def pier_table(piers: List[Pier]) -> Table:
    """Pier rows: {pier_id, station, skew_deg, support_point}."""
    table = Table("Pier座標表", ["Pier", "測点", "交角°", "支承点"])
    for pier in piers:
        for index, pt in enumerate(pier.support_points):
            table.rows.append(Row(
                columns=[
                    pier.pier_id if index == 0 else "",
                    _fmt(pier.station) if index == 0 else "",
                    format_angle(pier.skew_angle_deg) if index == 0 else "",
                    f"({_fmt(pt.x)}, {_fmt(pt.y)}, {_fmt(pt.z)})",
                ],
                raw={"pier_id": pier.pier_id, "station": pier.station,
                     "skew_deg": pier.skew_angle_deg,
                     "x": pt.x, "y": pt.y, "z": pt.z},
            ))
    return table


def girder_table(girders: List[Girder]) -> Table:
    """Girder rows: {girder_id, line_side, transverse_offset}."""
    table = Table("Girder座標表", ["Girder", "ライン", "横断オフセット"])
    for g in girders:
        table.rows.append(Row(
            columns=[g.girder_id, g.line_side, _fmt(g.transverse_offset_m)],
            raw={"girder_id": g.girder_id, "line_side": g.line_side,
                 "offset": g.transverse_offset_m},
        ))
    return table


def node_table(nodes: List[Node]) -> Table:
    """Node rows: {node_id, girder_id, pier_id, station, offset, x, y, z}."""
    table = Table("Node座標表", ["Node", "Girder", "Pier", "測点", "offset", "X", "Y", "Z"])
    for n in nodes:
        table.rows.append(Row(
            columns=[
                n.node_id, n.girder_id, n.pier_id,
                _fmt(n.station), _fmt(n.offset_m),
                _fmt(n.xyz.x), _fmt(n.xyz.y), _fmt(n.xyz.z),
            ],
            raw={"node_id": n.node_id, "station": n.station,
                 "x": n.xyz.x, "y": n.xyz.y, "z": n.xyz.z},
        ))
    return table
