export { GuidedModeShell, type GuidedModeShellProps } from "./GuidedModeShell";
export { buildGuidedModeChromeState, guidedSlideDecideWhat } from "./chrome";
export {
  adjacentGuidedSlide,
  getGuidedSlideDefinition,
  GUIDED_SLIDE_DEFINITIONS,
  isGuidedSlideId,
} from "./slides";
export {
  GUIDED_SLIDE_IDS,
  type GuidedDetailEscape,
  type GuidedModeChromeState,
  type GuidedSlideDefinition,
  type GuidedSlideId,
} from "./types";
export {
  GUIDED_PHASES,
  getPhaseForSlide,
  getCompletedSlideCount,
} from "./phases";
