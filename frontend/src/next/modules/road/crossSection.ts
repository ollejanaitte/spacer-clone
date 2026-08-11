import {
  resolveCrossSectionTemplateForPhysicalDistance,
} from "../../../liner/core/crossSectionTemplateResolution";
import {
  computeOffsetLineElevation,
} from "../../../liner/core/crossSectionElevation";
import type {
  CrossSectionOffsetLineDraft,
  CrossSectionTemplateDraft,
} from "../../../liner/schema/types";

/**
 * Phase 2-05: Cross-section template and cross-slope evaluation.
 * Reuses the proven LINER cross-section resolution (KEEP/ADAPT).
 */
export {
  resolveCrossSectionTemplateForPhysicalDistance,
  computeOffsetLineElevation,
};

export type {
  CrossSectionOffsetLineDraft,
  CrossSectionTemplateDraft,
};

export type CrossSectionComponentRole =
  | "lane"
  | "shoulder"
  | "sidewalk"
  | "median"
  | "edge"
  | "custom";

export interface RoadCrossSectionComponent {
  readonly id: string;
  readonly role: CrossSectionComponentRole;
  readonly label: string;
  readonly offset: number; // signed offset from centerline (right positive)
  readonly width: number;
  readonly crossSlope: number; // % (right-down positive)
}

export interface RoadCrossSection {
  readonly templateId: string;
  readonly name: string;
  readonly components: readonly RoadCrossSectionComponent[];
  readonly leftWidth: number;
  readonly rightWidth: number;
}

export interface CrossSectionTemplateInput {
  readonly id: string;
  readonly name: string;
  readonly offsetLines: readonly {
    readonly id: string;
    readonly offset: number;
    readonly elevation: number;
    readonly role?: CrossSectionComponentRole;
    readonly label?: string;
  }[];
  readonly station?: number;
}

export function buildRoadCrossSection(input: CrossSectionTemplateInput): RoadCrossSection {
  const sorted = [...input.offsetLines].sort((a, b) => a.offset - b.offset);
  const components: RoadCrossSectionComponent[] = sorted.map((line) => ({
    id: line.id,
    role: line.role ?? "custom",
    label: line.label ?? line.id,
    offset: line.offset,
    width: Math.abs(line.offset) - (0),
    crossSlope: 0,
  }));
  for (let i = 0; i < components.length; i += 1) {
    const prevOffset = i > 0 ? components[i - 1].offset : 0;
    components[i] = { ...components[i], width: Math.abs(components[i].offset) - Math.abs(prevOffset) };
  }
  const leftWidth = Math.abs(Math.min(0, ...sorted.map((l) => l.offset)));
  const rightWidth = Math.max(0, ...sorted.map((l) => l.offset));
  return {
    templateId: input.id,
    name: input.name,
    components,
    leftWidth,
    rightWidth,
  };
}

export interface RoadCrossSectionPoint {
  readonly offset: number;
  readonly role: CrossSectionComponentRole | undefined;
  readonly label: string | undefined;
  readonly elevation: number;
}

export function evaluateCrossSectionAtOffset(
  template: CrossSectionTemplateDraft,
  offset: number,
): RoadCrossSectionPoint | undefined {
  const line = template.offsetLines.find((l) => Math.abs(l.offset - offset) < 1e-9);
  if (!line) return undefined;
  return {
    offset: line.offset,
    role: line.role,
    label: line.label,
    elevation: line.elevation,
  };
}

export function evaluateCrossSectionSurface(
  template: CrossSectionTemplateDraft,
  offset: number,
  crossSlopePercent: number,
): { offset: number; elevation: number } {
  const line = evaluateCrossSectionAtOffset(template, offset);
  const baseElevation = line?.elevation ?? 0;
  const slopeElevation = computeOffsetLineElevation(offset, crossSlopePercent);
  return { offset, elevation: baseElevation + slopeElevation };
}
