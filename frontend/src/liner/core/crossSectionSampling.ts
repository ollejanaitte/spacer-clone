import type { CrossSectionTemplateDraft, GridDefinitionDraft } from "../schema/types";
import {
  SAMPLING_INTERVAL_DISPLAY,
  SAMPLING_INTERVAL_DXF,
  SAMPLING_INTERVAL_FRAME,
} from "./sampling";

export type CrossSectionSamplePoint = {
  station: number;
  templateId: string;
  offsetLineIds: string[];
};

function resolveOffsetLineIds(
  template: CrossSectionTemplateDraft,
  gridDefinition: GridDefinitionDraft,
): string[] {
  return gridDefinition.offsetLineIds ?? template.offsetLines.map((line) => line.id);
}

function isValidRange(start: number, end: number): boolean {
  return Number.isFinite(start) && Number.isFinite(end) && end >= start;
}

export function sampleCrossSectionAtInterval(
  template: CrossSectionTemplateDraft,
  gridDefinition: GridDefinitionDraft,
  interval: number,
): CrossSectionSamplePoint[] {
  if (!Number.isFinite(interval) || interval <= 0) {
    return [];
  }

  const start = gridDefinition.stationRange.startPhysicalDistance;
  const end = gridDefinition.stationRange.endPhysicalDistance;
  if (!isValidRange(start, end)) {
    return [];
  }

  const offsetLineIds = resolveOffsetLineIds(template, gridDefinition);
  const samples: CrossSectionSamplePoint[] = [];

  for (let station = start; station < end; station += interval) {
    samples.push({
      station,
      templateId: template.id,
      offsetLineIds,
    });
  }

  const last = samples[samples.length - 1];
  if (last === undefined || last.station !== end) {
    samples.push({
      station: end,
      templateId: template.id,
      offsetLineIds,
    });
  }

  return samples;
}

export function sampleCrossSectionDisplay(
  template: CrossSectionTemplateDraft,
  gridDefinition: GridDefinitionDraft,
): CrossSectionSamplePoint[] {
  return sampleCrossSectionAtInterval(template, gridDefinition, SAMPLING_INTERVAL_DISPLAY);
}

export function sampleCrossSectionDxf(
  template: CrossSectionTemplateDraft,
  gridDefinition: GridDefinitionDraft,
): CrossSectionSamplePoint[] {
  return sampleCrossSectionAtInterval(template, gridDefinition, SAMPLING_INTERVAL_DXF);
}

export function sampleCrossSectionFrame(
  template: CrossSectionTemplateDraft,
  gridDefinition: GridDefinitionDraft,
): CrossSectionSamplePoint[] {
  return sampleCrossSectionAtInterval(template, gridDefinition, SAMPLING_INTERVAL_FRAME);
}
