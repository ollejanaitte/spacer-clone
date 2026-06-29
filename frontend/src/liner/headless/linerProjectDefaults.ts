import type { AnalysisSettings, LoadCase, Material, Section } from "../../types";

/**
 * Documented P1-5 headless fixture defaults for liner-generated frame projects.
 * Values are structural placeholders for schema validation and linear static smoke tests,
 * not calibrated engineering properties.
 */
export const LINER_HEADLESS_FIXTURE_MATERIAL_IDS = {
  deck: "MAT_LINER_DECK",
  cross: "MAT_LINER_CROSS",
} as const;

export const LINER_HEADLESS_FIXTURE_SECTION_IDS = {
  deck: "SEC_LINER_DECK",
  cross: "SEC_LINER_CROSS",
} as const;

export const LINER_HEADLESS_FIXTURE_MATERIALS: Material[] = [
  {
    id: LINER_HEADLESS_FIXTURE_MATERIAL_IDS.deck,
    name: "Liner fixture deck steel",
    elasticModulus: 2.05e8,
    shearModulus: 7.88461538e7,
    poissonRatio: 0.3,
    density: 0,
  },
  {
    id: LINER_HEADLESS_FIXTURE_MATERIAL_IDS.cross,
    name: "Liner fixture cross steel",
    elasticModulus: 2.05e8,
    shearModulus: 7.88461538e7,
    poissonRatio: 0.3,
    density: 0,
  },
];

export const LINER_HEADLESS_FIXTURE_SECTIONS: Section[] = [
  {
    id: LINER_HEADLESS_FIXTURE_SECTION_IDS.deck,
    name: "Liner fixture deck section",
    area: 0.05,
    iy: 0.0008,
    iz: 0.0006,
    j: 0.0002,
  },
  {
    id: LINER_HEADLESS_FIXTURE_SECTION_IDS.cross,
    name: "Liner fixture cross section",
    area: 0.03,
    iy: 0.0004,
    iz: 0.0003,
    j: 0.0001,
  },
];

export const LINER_HEADLESS_PLACEHOLDER_LOAD_CASE: LoadCase = {
  id: "LC_LINER_PLACEHOLDER",
  name: "Liner placeholder",
  type: "static",
};

export const LINER_HEADLESS_ANALYSIS_SETTINGS: AnalysisSettings = {
  analysisType: "linear_static",
  solver: "scipy_sparse",
  includeShearDeformation: false,
  largeDisplacement: false,
  tolerance: 1e-9,
};

export const LINER_HEADLESS_UNITS = {
  length: "m",
  force: "kN",
  moment: "kN_m",
  modulus: "kN_per_m2",
  area: "m2",
  inertia: "m4",
} as const;
