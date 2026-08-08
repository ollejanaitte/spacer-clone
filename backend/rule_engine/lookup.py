# -*- coding: utf-8 -*-
"""Lookup Resolver - resolves table lookups for rules."""

from typing import Any, Dict


class LookupResolver:
    """Resolves table lookups from rule tables."""

    @staticmethod
    def resolve(table: Dict, keys: tuple) -> Any:
        if not table:
            return None
        return table.get(keys)


class RoadClassTable:
    """道路区分表 (Table-01) - 道路種級区分の体系"""
    # (種級, 地域, 地形, 計画交通量) -> 区分
    _data = {
        ("高速自動車国道", "地方部", "平地", "30,000以上"): "第1種第1級",
        ("高速自動車国道", "地方部", "平地", "20,000~30,000"): "第1種第2級",
        ("高速自動車国道", "地方部", "平地", "10,000~20,000"): "第1種第3級",
    }

    @staticmethod
    def classify(road_type: str, region: str, terrain: str, traffic: str) -> str:
        return RoadClassTable._data.get((road_type, region, terrain, traffic), "UNKNOWN")


class DesignSpeedTable:
    """設計速度表 (Table-02)"""
    _data = {
        ("第1種第1級", "平地"): 120,
        ("第1種第1級", "山地"): 100,
        ("第1種第2級", "平地"): 100,
        ("第1種第2級", "山地"): 80,
        ("第1種第3級", "平地"): 80,
        ("第1種第3級", "山地"): 60,
        ("第1種第4級", "平地"): 60,
        ("第1種第4級", "山地"): 50,
        ("第2種第1級", "平地"): 80,
        ("第2種第1級", "山地"): 60,
        ("第2種第2級", "平地"): 60,
        ("第2種第2級", "山地"): 50,
        ("第3種第1級", "平地"): 80,
        ("第3種第1級", "山地"): 60,
        ("第3種第2級", "平地"): 60,
        ("第3種第2級", "山地"): 50,
        ("第3種第3級", "平地"): 60,
        ("第3種第3級", "山地"): 30,
        ("第3種第4級", "平地"): 50,
        ("第3種第4級", "山地"): 20,
        ("第3種第5級", "平地"): 40,
        ("第3種第5級", "山地"): 20,
        ("第4種第1級", "平地"): 60,
        ("第4種第1級", "山地"): 40,
        ("第4種第2級", "平地"): 60,
        ("第4種第2級", "山地"): 30,
        ("第4種第3級", "平地"): 50,
        ("第4種第3級", "山地"): 20,
        ("第4種第4級", "平地"): 40,
        ("第4種第4級", "山地"): 20,
    }

    @staticmethod
    def get(road_class: str, terrain: str) -> int:
        return DesignSpeedTable._data.get((road_class, terrain), 0)


class CurveRadiusTable:
    """最小曲線半径表 (Table-07) - 表3-5 規定値"""
    _data = {
        120: 710, 100: 460, 80: 280, 60: 150,
        50: 100, 40: 60, 30: 55, 20: 30,
    }

    @staticmethod
    def get_min(design_speed: int) -> int:
        return CurveRadiusTable._data.get(design_speed, 0)

    @staticmethod
    def get_desirable(design_speed: int) -> int:
        desirable = {120: 1000, 100: 700, 80: 400, 60: 200,
                     50: 150, 40: 100, 30: 65, 20: 30}
        return desirable.get(design_speed, 0)