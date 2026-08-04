/**
 * Step 5 Guided Mode (DEC-S5-0009) — presentation shell over WorkflowStateModel.
 * Not a second SoR; writes the same Apollo draft objects as detail panels.
 */

export const GUIDED_SLIDE_IDS = [
  "G01",
  "G02",
  "G03",
  "G04",
  "G05",
  "G06",
  "G07",
  "G08",
  "G09",
  "G10",
  "G11",
  "G12",
  "G13",
  "G14",
  "G15",
] as const;

export type GuidedSlideId = (typeof GUIDED_SLIDE_IDS)[number];

export type GuidedDetailEscape =
  | { readonly kind: "panel"; readonly panelId: string; readonly label: string }
  | { readonly kind: "route"; readonly path: string; readonly label: string }
  | { readonly kind: "viewer"; readonly label: string };

export type GuidedSlideDefinition = {
  readonly slideId: GuidedSlideId;
  readonly order: number;
  readonly theme: string;
  readonly decideWhat: string;
  readonly primaryFields: readonly string[];
  readonly wfAnchor: string;
  readonly detailEscape: GuidedDetailEscape;
  readonly impactHints: readonly string[];
};

export type GuidedModeChromeState = {
  readonly currentSlideId: GuidedSlideId;
  readonly index: number;
  readonly total: number;
  readonly canGoBack: boolean;
  readonly canGoNext: boolean;
  readonly progressLabel: string;
  readonly currentPhaseId: number;
  readonly currentPhaseLabel: string;
  readonly phaseSlideIds: readonly GuidedSlideId[];
};
