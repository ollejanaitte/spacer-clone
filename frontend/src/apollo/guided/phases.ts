import { type GuidedSlideId } from "./types";

export type GuidedPhase = {
  readonly phaseId: number;
  readonly label: string;
  readonly slideIds: readonly GuidedSlideId[];
};

export const GUIDED_PHASES: readonly GuidedPhase[] = [
  { phaseId: 1, label: "計画", slideIds: ["G01", "G02", "G03", "G04"] },
  { phaseId: 2, label: "主桁・床版", slideIds: ["G05", "G06", "G07"] },
  { phaseId: 3, label: "二次部材", slideIds: ["G08", "G09", "G10"] },
  { phaseId: 4, label: "荷重", slideIds: ["G11"] },
  { phaseId: 5, label: "確認", slideIds: ["G12", "G13", "G14"] },
  { phaseId: 6, label: "完了", slideIds: ["G15"] },
] as const;

const SLIDE_TO_PHASE = new Map<GuidedSlideId, GuidedPhase>();
for (const phase of GUIDED_PHASES) {
  for (const slideId of phase.slideIds) {
    SLIDE_TO_PHASE.set(slideId, phase);
  }
}

export function getPhaseForSlide(slideId: GuidedSlideId): GuidedPhase {
  const phase = SLIDE_TO_PHASE.get(slideId);
  if (!phase) {
    return GUIDED_PHASES[0];
  }
  return phase;
}

export function getCompletedSlideCount(slideId: GuidedSlideId): number {
  const index = GUIDED_PHASES.flatMap((p) => p.slideIds).indexOf(slideId);
  return index;
}

export function getPhaseProgress(phaseLabel: string, slideIds: readonly GuidedSlideId[], currentSlideId: GuidedSlideId): string {
  const completed = slideIds.filter((id) => {
    const idx = GUIDED_PHASES.flatMap((p) => p.slideIds).indexOf(id);
    const currentIdx = GUIDED_PHASES.flatMap((p) => p.slideIds).indexOf(currentSlideId);
    return idx < currentIdx;
  }).length;
  return `${completed}/${slideIds.length}`;
}