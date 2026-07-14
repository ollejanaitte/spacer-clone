import type { Bounds2 } from "./geometry";

export type PaperSize = "A0" | "A1" | "A2" | "A3" | "A4";
export type PaperOrientation = "landscape" | "portrait";

export type PaperDefinition = {
  size: PaperSize;
  orientation: PaperOrientation;
  widthMm: number;
  heightMm: number;
  marginMm: number;
};

export const PAPER_SIZE_DIMENSIONS_MM: Record<PaperSize, { widthMm: number; heightMm: number }> = {
  A0: { widthMm: 841, heightMm: 1189 },
  A1: { widthMm: 594, heightMm: 841 },
  A2: { widthMm: 420, heightMm: 594 },
  A3: { widthMm: 297, heightMm: 420 },
  A4: { widthMm: 210, heightMm: 297 },
};

export function createPaperDefinition(
  size: PaperSize,
  orientation: PaperOrientation,
  marginMm = 0,
): PaperDefinition {
  const dimensions = PAPER_SIZE_DIMENSIONS_MM[size];
  const portraitWidthMm = dimensions.widthMm;
  const portraitHeightMm = dimensions.heightMm;
  const widthMm = orientation === "landscape" ? portraitHeightMm : portraitWidthMm;
  const heightMm = orientation === "landscape" ? portraitWidthMm : portraitHeightMm;

  return {
    size,
    orientation,
    widthMm,
    heightMm,
    marginMm,
  };
}

export function paperContentBoundsMm(paper: PaperDefinition): Bounds2 {
  return {
    minX: paper.marginMm,
    minY: paper.marginMm,
    maxX: paper.widthMm - paper.marginMm,
    maxY: paper.heightMm - paper.marginMm,
    isEmpty: false,
  };
}

export function isValidPaperDefinition(paper: PaperDefinition): boolean {
  return (
    Number.isFinite(paper.widthMm)
    && Number.isFinite(paper.heightMm)
    && Number.isFinite(paper.marginMm)
    && paper.widthMm > 0
    && paper.heightMm > 0
    && paper.marginMm >= 0
    && paper.marginMm * 2 < Math.min(paper.widthMm, paper.heightMm)
  );
}
