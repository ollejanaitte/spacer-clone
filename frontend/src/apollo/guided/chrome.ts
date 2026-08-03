import { GUIDED_SLIDE_IDS, type GuidedModeChromeState, type GuidedSlideId } from "./types";
import { adjacentGuidedSlide, getGuidedSlideDefinition } from "./slides";

export function buildGuidedModeChromeState(currentSlideId: GuidedSlideId): GuidedModeChromeState {
  const index = GUIDED_SLIDE_IDS.indexOf(currentSlideId);
  const safeIndex = index < 0 ? 0 : index;
  const total = GUIDED_SLIDE_IDS.length;
  return {
    currentSlideId: GUIDED_SLIDE_IDS[safeIndex] ?? "G01",
    index: safeIndex,
    total,
    canGoBack: adjacentGuidedSlide(currentSlideId, "back") !== null,
    canGoNext: adjacentGuidedSlide(currentSlideId, "next") !== null,
    progressLabel: `${safeIndex + 1}/${total}`,
  };
}

export function guidedSlideDecideWhat(slideId: GuidedSlideId): string {
  return getGuidedSlideDefinition(slideId).decideWhat;
}
