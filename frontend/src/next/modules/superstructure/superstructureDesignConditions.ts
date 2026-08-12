/**
 * Superstructure design conditions (Phase 5-01 D-01 FROZEN / Phase 5-02 WP-G).
 *
 * REFERENCE allowable values. These are REFERENCE ONLY (not adopted numerics):
 * the values used by the basic checks are placeholders to be confirmed in the
 * DS adoption phase. The interface is frozen so checks never auto-pass by
 * changing tolerances.
 *
 * Units: kPa (kN/m^2) for stress; span/deflection in m.
 */

export interface DesignConditions {
  /** Allowable bending stress (kPa). */
  readonly allowableBendingStressKPa: number;
  /** Allowable shear stress (kPa). */
  readonly allowableShearStressKPa: number;
  /** Allowable deflection ratio (deflection / span). */
  readonly allowableDeflectionRatio: number;
  /** Steel elastic modulus (kPa). */
  readonly steelElasticModulusKPa: number;
  /** Allowable bearing reaction per seat (kN). null = to be adopted. */
  readonly bearingAllowableReactionKN: number | null;
}

export const REFERENCE_DESIGN_CONDITIONS: DesignConditions = {
  allowableBendingStressKPa: 210000,
  allowableShearStressKPa: 120000,
  allowableDeflectionRatio: 1 / 600,
  steelElasticModulusKPa: 2.05e8,
  bearingAllowableReactionKN: null,
};
