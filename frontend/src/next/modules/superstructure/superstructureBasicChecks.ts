/**
 * Superstructure basic checks (Phase 5-01 D-01 FROZEN / Phase 5-02 WP-G).
 *
 * IN-SCOPE basic verifications:
 *  - SECTION-PROPERTIES     section properties (Area / I / section moduli)
 *  - GIRDER-BENDING-BASIC   sigma = M / Z <= allowable (reference)
 *  - GIRDER-SHEAR-BASIC     tau = V * S / (I * tw) <= allowable (reference)
 *  - GIRDER-DEFLECTION-BASIC deflection / span <= ratio (reference)
 *  - CROSSBEAM-BASIC        cross beam bending (reference)
 *  - BEARING-BASIC          reaction <= bearing allowable (reference)
 *
 * Fail-closed: when required inputs are MISSING the check is NOT_AVAILABLE
 * (never auto-PASS). Overall designStatus stays NOT_AUTHORIZED (auto-promotion
 * forbidden); individual check status may be OK / NG / NOT_AVAILABLE.
 */

import type { DesignCheckResult, GirderSectionModel } from "./superstructureTypes";
import { computeSuperstructureSectionProperties } from "./superstructureComponents";
import { REFERENCE_DESIGN_CONDITIONS, type DesignConditions } from "./superstructureDesignConditions";

export const CHECK_SECTION_PROPERTIES = "SECTION-PROPERTIES";
export const CHECK_GIRDER_BENDING = "GIRDER-BENDING-BASIC";
export const CHECK_GIRDER_SHEAR = "GIRDER-SHEAR-BASIC";
export const CHECK_GIRDER_DEFLECTION = "GIRDER-DEFLECTION-BASIC";
export const CHECK_CROSSBEAM = "CROSSBEAM-BASIC";
export const CHECK_BEARING = "BEARING-BASIC";

export interface BasicCheckInputs {
  readonly girderSection: GirderSectionModel;
  readonly girderLengthM: number;
  /** Maximum bending moment on a main girder (kNm) from analysis. null = not available. */
  readonly maxBendingMomentKNm: number | null;
  /** Maximum shear on a main girder (kN) from analysis. null = not available. */
  readonly maxShearKN: number | null;
  /** Maximum deflection (m) from analysis. null = not available. */
  readonly maxDeflectionM: number | null;
  /** Maximum cross beam bending moment (kNm) from analysis. null = not available. */
  readonly crossBeamBendingKNm: number | null;
  /** Maximum vertical reaction per seat (kN) from analysis. null = not available. */
  readonly maxReactionKN: number | null;
}

function unavailable(checkId: string, ruleReference: string, message: string): DesignCheckResult {
  return { checkId, status: "NOT_AVAILABLE", ruleReference, message };
}

function ok(checkId: string, ruleReference: string, message: string): DesignCheckResult {
  return { checkId, status: "OK", ruleReference, message };
}

function ng(checkId: string, ruleReference: string, message: string): DesignCheckResult {
  return { checkId, status: "NG", ruleReference, message };
}

/**
 * Run the six basic checks against the supplied analysis inputs.
 * Never auto-passes: MISSING inputs -> NOT_AVAILABLE.
 */
export function runBasicChecks(
  inputs: BasicCheckInputs,
  conditions: DesignConditions = REFERENCE_DESIGN_CONDITIONS,
): DesignCheckResult[] {
  const checks: DesignCheckResult[] = [];
  const props = computeSuperstructureSectionProperties(inputs.girderSection, inputs.girderLengthM);

  // SECTION-PROPERTIES
  if (props === null) {
    checks.push(unavailable(CHECK_SECTION_PROPERTIES, "DS-05", "girder section is MISSING (declared values required)"));
  } else {
    checks.push(ok(
      CHECK_SECTION_PROPERTIES,
      "DS-05",
      `Area ${props.totalArea.toFixed(4)} m2, I ${props.secondMomentOfArea.toFixed(5)} m4, Zt ${props.sectionModulusTop.toFixed(4)} m3, Zb ${props.sectionModulusBottom.toFixed(4)} m3`,
    ));
  }

  // GIRDER-BENDING-BASIC: sigma = M / Z (use bottom modulus, conservative for sagging)
  if (props === null || inputs.maxBendingMomentKNm === null) {
    checks.push(unavailable(CHECK_GIRDER_BENDING, "DS-05", "girder section or bending moment is MISSING"));
  } else {
    const sigma = inputs.maxBendingMomentKNm / props.sectionModulusBottom; // kN/m^2 = kPa
    const pass = sigma <= conditions.allowableBendingStressKPa;
    checks.push(pass
      ? ok(CHECK_GIRDER_BENDING, "DS-05", `sigma ${sigma.toFixed(1)} kPa <= ${conditions.allowableBendingStressKPa} kPa`)
      : ng(CHECK_GIRDER_BENDING, "DS-05", `sigma ${sigma.toFixed(1)} kPa > ${conditions.allowableBendingStressKPa} kPa`));
  }

  // GIRDER-SHEAR-BASIC: tau = V * S / (I * tw); S ~ web area * (webHeight/2) for I-section (reference)
  if (props === null || inputs.maxShearKN === null || inputs.girderSection.webThicknessM === null) {
    checks.push(unavailable(CHECK_GIRDER_SHEAR, "DS-05", "girder section or shear is MISSING"));
  } else {
    const S = (props.webArea * props.webHeight) / 2;
    const tau = (inputs.maxShearKN * S) / (props.secondMomentOfArea * inputs.girderSection.webThicknessM);
    const pass = tau <= conditions.allowableShearStressKPa;
    checks.push(pass
      ? ok(CHECK_GIRDER_SHEAR, "DS-05", `tau ${tau.toFixed(1)} kPa <= ${conditions.allowableShearStressKPa} kPa`)
      : ng(CHECK_GIRDER_SHEAR, "DS-05", `tau ${tau.toFixed(1)} kPa > ${conditions.allowableShearStressKPa} kPa`));
  }

  // GIRDER-DEFLECTION-BASIC
  if (inputs.maxDeflectionM === null || inputs.girderLengthM === null || !(inputs.girderLengthM > 0)) {
    checks.push(unavailable(CHECK_GIRDER_DEFLECTION, "DS-05", "deflection or span is MISSING"));
  } else {
    const ratio = inputs.maxDeflectionM / inputs.girderLengthM;
    const pass = ratio <= conditions.allowableDeflectionRatio;
    checks.push(pass
      ? ok(CHECK_GIRDER_DEFLECTION, "DS-05", `deflection/span ${ratio.toFixed(6)} <= ${conditions.allowableDeflectionRatio}`)
      : ng(CHECK_GIRDER_DEFLECTION, "DS-05", `deflection/span ${ratio.toFixed(6)} > ${conditions.allowableDeflectionRatio}`));
  }

  // CROSSBEAM-BASIC (reference: treat like girder bending with a nominal section)
  if (inputs.crossBeamBendingKNm === null || props === null) {
    checks.push(unavailable(CHECK_CROSSBEAM, "DS-05", "cross beam moment is MISSING (cross beam section DEFER)"));
  } else {
    // Reference check with the girder's section modulus as a proxy (to be adopted).
    const sigma = inputs.crossBeamBendingKNm / props.sectionModulusBottom;
    const pass = sigma <= conditions.allowableBendingStressKPa;
    checks.push(pass
      ? ok(CHECK_CROSSBEAM, "DS-05", `cross beam sigma ${sigma.toFixed(1)} kPa <= allowable`)
      : ng(CHECK_CROSSBEAM, "DS-05", `cross beam sigma ${sigma.toFixed(1)} kPa > allowable`));
  }

  // BEARING-BASIC
  if (inputs.maxReactionKN === null || conditions.bearingAllowableReactionKN === null) {
    checks.push(unavailable(CHECK_BEARING, "DS-05", "reaction or bearing allowable is not adopted"));
  } else {
    const pass = inputs.maxReactionKN <= conditions.bearingAllowableReactionKN;
    checks.push(pass
      ? ok(CHECK_BEARING, "DS-05", `reaction ${inputs.maxReactionKN} kN <= ${conditions.bearingAllowableReactionKN} kN`)
      : ng(CHECK_BEARING, "DS-05", `reaction ${inputs.maxReactionKN} kN > ${conditions.bearingAllowableReactionKN} kN`));
  }

  return checks;
}

/**
 * Apply check results to the SuperstructureDocument. The overall designStatus
 * stays NOT_AUTHORIZED (auto-promotion forbidden); per-check status is recorded.
 */
export function withDesignCheckResults(
  document: SuperstructureDocumentLike,
  checks: readonly DesignCheckResult[],
  now: string = new Date().toISOString(),
): SuperstructureDocumentLike {
  return {
    ...document,
    designResults: {
      designStatus: "NOT_AUTHORIZED",
      checks,
      reactionResultsReference: document.designResults.reactionResultsReference,
    },
    timestamps: { ...document.timestamps, derivedAt: now },
  };
}

// Local structural subset to avoid a heavy import cycle in the barrel.
interface SuperstructureDocumentLike {
  readonly designResults: {
    readonly designStatus: string;
    readonly checks: readonly DesignCheckResult[];
    readonly reactionResultsReference: { reactionDigest: string | null };
  };
  readonly timestamps: { updatedAt: string; derivedAt: string | null };
}
