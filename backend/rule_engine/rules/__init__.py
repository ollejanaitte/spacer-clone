# -*- coding: utf-8 -*-
"""Rule Engine - registered rules package."""

from typing import List


def load_all_rules() -> List:
    """Load all rule instances."""
    from .road_classification import RoadClassificationRule
    from .design_speed import DesignSpeedRule
    from .curve_radius import CurveRadiusRule
    from .design_vehicle import DesignVehicleRule
    from .lane_width import LaneWidthRule
    from .median import MEDIANRule as MedianRule
    from .shoulder import SHOULDER_WIDTHRule as ShoulderRule
    from .cross_slope import CROSS_SLOPERule as CrossSlopeRule
    from .transition_curve import TRANSITION_CURVERule as TransitionCurveRule
    from .superelevation import SUPERELEVATIONRule as SuperelevationRule
    from .sight_distance import SIGHT_DISTANCERule as SightDistanceRule
    from .longitudinal_grade import LONGITUDINAL_GRADERule as LongitudinalGradeRule
    from .vertical_curve import VERTICAL_CURVERule as VerticalCurveRule
    from .exception import EXCEPTIONRule as ExceptionRule
    from .grid_point import GRID_POINTRule as GridPointRule
    from .station import STATIONRule as StationRule
    from .coordinate_transform import COORDINATERule as CoordinateTransformRule
    from .validation import VALIDATIONRule as ValidationRule
    from ..alignment.contract import AlignmentGeometryRule
    from .widening import WIDENINGRule
    from .curve_length import CURVE_LENGTHRule
    from .superelevation_transition import SUPERELEVATION_TRANSITIONRule
    return [
        RoadClassificationRule(),
        DesignSpeedRule(),
        CurveRadiusRule(),
        DesignVehicleRule(),
        LaneWidthRule(),
        MedianRule(),
        ShoulderRule(),
        CrossSlopeRule(),
        TransitionCurveRule(),
        SuperelevationRule(),
        SightDistanceRule(),
        LongitudinalGradeRule(),
        VerticalCurveRule(),
        ExceptionRule(),
        GridPointRule(),
        StationRule(),
        CoordinateTransformRule(),
        ValidationRule(),
        AlignmentGeometryRule(),
        WIDENINGRule(),
        CURVE_LENGTHRule(),
        SUPERELEVATION_TRANSITIONRule(),
    ]