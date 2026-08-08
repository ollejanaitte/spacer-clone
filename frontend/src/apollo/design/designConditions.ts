/**
 * Design conditions model (Phase 7).
 *
 * Declared design conditions for the superstructure design engine. Values are
 * declared inputs (standard profile, spans, composite flag); numeric design
 * authorization remains NOT_GRANTED until the Phase A gates clear.
 */

export type DesignStandardProfile = "H29_REFERENCE";

export type DesignConditions = {
  bridgeId: string;
  standardProfile: DesignStandardProfile;
  spanLengthsM: number[];
  bridgeLengthM: number;
  girderCount: number;
  compositeAction: boolean;
  numericDesignAuthorization: "NOT_GRANTED";
  r7Compliance: "NOT_VERIFIED";
  designOrConstructionUse: "PROHIBITED";
};

/** Reference Bridge 001 declared design conditions. */
export const RB001_DESIGN_CONDITIONS: DesignConditions = {
  bridgeId: "RB-S10-001",
  standardProfile: "H29_REFERENCE",
  spanLengthsM: [40.201, 51.0, 40.2],
  bridgeLengthM: 134.001,
  girderCount: 2,
  compositeAction: false, // nonCompositeAssertion = false
  numericDesignAuthorization: "NOT_GRANTED",
  r7Compliance: "NOT_VERIFIED",
  designOrConstructionUse: "PROHIBITED",
};
