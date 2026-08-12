/**
 * Superstructure components (Phase 5-01 C-01 FROZEN / Phase 5-02 WP-D).
 *
 * Steel plate-girder configuration builders: cross beams (end/support/
 * intermediate), cross frames, bearing seats (support × girder), and girder
 * section properties (via the KEEP `sectionProperties` asset).
 *
 * Configuration generation is layout-only; member dimensions stay null (DEFER)
 * and declared section values are never invented (MISSING preserved).
 */

import { computeGirderSectionProperties, type GirderSectionProperties } from "../../../apollo/bridgeStructure/sectionProperties";
import type {
  BearingConfiguration,
  BearingSeat,
  CrossBeam,
  CrossBeamConfiguration,
  CrossFrameConfiguration,
  GirderSectionModel,
} from "./superstructureTypes";

export interface SupportStation {
  readonly supportId: string;
  readonly station: number;
  readonly supportType: "abutment" | "pier";
}

/** Compute I-beam section properties from declared section data (null when MISSING). */
export function computeSuperstructureSectionProperties(
  section: GirderSectionModel,
  girderLengthM: number,
): GirderSectionProperties | null {
  const { depthM, webThicknessM, topFlange, bottomFlange } = section;
  if (
    depthM === null
    || webThicknessM === null
    || topFlange === null
    || bottomFlange === null
    || topFlange.widthM === null
    || topFlange.thicknessM === null
    || bottomFlange.widthM === null
    || bottomFlange.thicknessM === null
  ) {
    return null;
  }
  return computeGirderSectionProperties({
    spanLength: girderLengthM,
    bridgeLength: girderLengthM,
    width: 0,
    girderCount: 1,
    girderSpacing: 0,
    girderDepth: depthM,
    topFlangeWidth: topFlange.widthM,
    topFlangeThickness: topFlange.thicknessM,
    bottomFlangeWidth: bottomFlange.widthM,
    bottomFlangeThickness: bottomFlange.thicknessM,
    webThickness: webThicknessM,
    deckThickness: 0,
    crossBeamSpacing: 0,
  });
}

/**
 * Build the cross beam configuration:
 *  - end/support cross beams at every support station (continuous: required)
 *  - intermediate cross beams at crossBeamSpacingM intervals, avoiding supports
 * Dimensions are null (DEFER); layout only.
 */
export function buildCrossBeamConfiguration(
  supports: readonly SupportStation[],
  crossBeamSpacingM: number,
): CrossBeamConfiguration {
  const crossBeams: CrossBeam[] = [];
  const supportStations = new Set(supports.map((s) => s.station));
  const ordered = [...supports].sort((a, b) => a.station - b.station);

  for (const support of ordered) {
    crossBeams.push({
      crossBeamId: `XB-${support.supportId}`,
      kind: "support",
      stationM: support.station,
      depthM: null,
      widthM: null,
    });
  }
  if (ordered.length >= 2) {
    const start = ordered[0].station;
    const end = ordered[ordered.length - 1].station;
    if (crossBeamSpacingM > 0) {
      let station = start + crossBeamSpacingM;
      let index = 1;
      while (station < end - 1e-9) {
        if (!supportStations.has(station)) {
          crossBeams.push({
            crossBeamId: `XB-i-${index}`,
            kind: "intermediate",
            stationM: station,
            depthM: null,
            widthM: null,
          });
          index += 1;
        }
        station += crossBeamSpacingM;
      }
    }
  }
  return { crossBeamSpacingM, crossBeams: crossBeams.sort((a, b) => a.stationM - b.stationM) };
}

/** Build the cross frame configuration (intervals only; member sections DEFER). */
export function buildCrossFrameConfiguration(
  crossFrameSpacingM: number,
  swayIntervalM: number,
  lateralIntervalM: number,
): CrossFrameConfiguration {
  return {
    crossFrameSpacingM,
    swayBracing: { intervalM: swayIntervalM },
    lateralBracing: { intervalM: lateralIntervalM },
  };
}

/**
 * Build the bearing configuration: support × girder incidence (derived) plus
 * bearing seats (BRG-{supportId}-{girderId}) with superstructure-owned form
 * defaults (UNDECIDED in Phase 5-02).
 */
export function buildBearingConfiguration(
  supports: readonly SupportStation[],
  girderIds: readonly string[],
): BearingConfiguration {
  const bearingSupportRelation: { supportId: string; girderId: string }[] = [];
  const bearingSeats: BearingSeat[] = [];
  for (const support of supports) {
    for (const girderId of girderIds) {
      bearingSupportRelation.push({ supportId: support.supportId, girderId });
      bearingSeats.push({
        seatId: `BRG-${support.supportId}-${girderId}`,
        supportId: support.supportId,
        girderId,
        bearingType: null,
        fixedOrMovable: "UNDECIDED",
        longitudinalDirection: null,
        transverseDirection: null,
      });
    }
  }
  return { bearingSupportRelation, bearingSeats };
}
