import type { Section } from "../types";
import { evaluateBridgeRenderability } from "../renderability";
import { sortSectionsByPdfPage } from "../utils/importerUtils";

export type PlanPreviewPoint = {
  sectionId: string;
  pointId: string;
  lineLabel: string;
  x: number;
  y: number;
  station: number | null;
  azimuth: number | null;
  pdfPage: number;
  kind: "normal" | "partial" | "undefined";
};

export type PlanPreviewRenderResult = {
  points: PlanPreviewPoint[];
  sections: Section[];
  currentSectionId: string | null;
  renderability: ReturnType<typeof evaluateBridgeRenderability>;
};

export function renderPlanPreview(
  sections: Section[],
  currentSectionId: string | null,
  bridgeId: string,
): PlanPreviewRenderResult {
  const ordered = sortSectionsByPdfPage(sections);
  const points: PlanPreviewPoint[] = [];

  for (const section of ordered) {
    const azimuth = section.azimuth.value?.decimalDeg ?? null;
    const station = section.stationingRef.stationValue ?? null;
    const hasAzimuth = azimuth != null;
    const hasStation = station != null;

    for (const point of section.points) {
      const x = point.x.value;
      const y = point.y.value;
      if (x == null || y == null) {
        continue;
      }

      let kind: PlanPreviewPoint["kind"] = "normal";
      if (!hasAzimuth || !hasStation) {
        kind = "partial";
      }
      if (point.x.flags.notComputed || point.y.flags.notComputed) {
        kind = "undefined";
      }

      points.push({
        sectionId: section.id,
        pointId: point.id,
        lineLabel: point.lineLabel,
        x,
        y,
        station,
        azimuth,
        pdfPage: section.pdfPage,
        kind,
      });
    }
  }

  const bridgeLike = {
    id: bridgeId,
    name: "",
    girderLineSets: [],
    spans: [],
    sections: ordered,
  };

  return {
    points,
    sections: ordered,
    currentSectionId,
    renderability: evaluateBridgeRenderability(bridgeLike),
  };
}

export function PlanPreviewRenderer({
  sections,
  currentSectionId,
  bridgeId,
}: {
  sections: Section[];
  currentSectionId: string | null;
  bridgeId: string;
}) {
  return renderPlanPreview(sections, currentSectionId, bridgeId);
}
