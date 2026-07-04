import type { Section } from "../types";
import { evaluateSectionRenderability } from "../renderability";

export type CrossSectionPointKind = "normal" | "undefined" | "warning";

export type CrossSectionRenderPoint = {
  id: string;
  lineLabel: string;
  cumulativeWidth: number | null;
  designElevation: number | null;
  kind: CrossSectionPointKind;
};

export type CrossSectionRenderResult = {
  points: CrossSectionRenderPoint[];
  renderability: ReturnType<typeof evaluateSectionRenderability>;
};

function classifyPoint(
  cumulativeWidth: number | null,
  designElevation: number | null,
  flags: { notComputed?: boolean; outOfRange?: boolean },
): CrossSectionPointKind {
  if (cumulativeWidth == null || designElevation == null) {
    return flags.notComputed ? "undefined" : "undefined";
  }
  if (flags.outOfRange) {
    return "warning";
  }
  return "normal";
}

export function renderCrossSection(section: Section): CrossSectionRenderResult {
  const renderability = evaluateSectionRenderability(section);
  const points: CrossSectionRenderPoint[] = section.points.map((point) => ({
    id: point.id,
    lineLabel: point.lineLabel,
    cumulativeWidth: point.cumulativeWidth.value,
    designElevation: point.designElevation.value,
    kind: classifyPoint(
      point.cumulativeWidth.value,
      point.designElevation.value,
      {
        notComputed: point.cumulativeWidth.flags.notComputed || point.designElevation.flags.notComputed,
        outOfRange: point.cumulativeWidth.flags.outOfRange || point.designElevation.flags.outOfRange,
      },
    ),
  }));

  return { points, renderability };
}

export function CrossSectionRenderer({ section }: { section: Section }) {
  return renderCrossSection(section);
}
