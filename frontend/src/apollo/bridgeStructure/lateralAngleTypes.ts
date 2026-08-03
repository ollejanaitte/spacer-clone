/** Lateral / sway L-angle section (DEC-S5-0007 / 0008). */

export type ApolloLateralAngleSectionDraft = {
  /** When true, bracing solids use L-angle instead of Ø cylinder. */
  readonly enabled: boolean;
  readonly legA: number | null;
  readonly legB: number | null;
  readonly thickness: number | null;
  /** Catalog provenance label shown in UI. */
  readonly catalogId: string;
};

export const LATERAL_ANGLE_CATALOG_ID = "CAT-S5-LAT-UNVERIFIED";

/** Provisional UNVERIFIED development placeholders pending ER-002. */
export const LATERAL_ANGLE_CATALOG_DEFAULTS = {
  legA: 0.075,
  legB: 0.075,
  thickness: 0.009,
} as const;

export function createDefaultLateralAngleSection(): ApolloLateralAngleSectionDraft {
  return {
    enabled: true,
    legA: LATERAL_ANGLE_CATALOG_DEFAULTS.legA,
    legB: LATERAL_ANGLE_CATALOG_DEFAULTS.legB,
    thickness: LATERAL_ANGLE_CATALOG_DEFAULTS.thickness,
    catalogId: LATERAL_ANGLE_CATALOG_ID,
  };
}
