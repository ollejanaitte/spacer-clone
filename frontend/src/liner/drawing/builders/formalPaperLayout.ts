import type { Bounds2 } from "../model/geometry";
import { paperContentBoundsMm, type PaperDefinition } from "../model/paper";
import type { AffineTransform2 } from "../transforms/affineTransform2";

export const FORMAL_DRAWING_LAYOUT = {
  planBandHeightMm: 108,
  profileBandHeightMm: 128,
  regionGapMm: 6,
  labelColumnWidthMm: 40,
  planRowHeightMm: 11,
  profileRowHeightMm: 9,
  geometryInsetMm: 4,
  minReadableTextHeightMm: 7,
  bandLabelTextHeightMm: 8,
  bandValueTextHeightMm: 7,
  planAnnotationTextHeightMm: 7,
  planNorthTextHeightMm: 10,
  profileAnnotationTextHeightMm: 7,
  crossSectionTitleTextHeightMm: 8,
  crossSectionAnnotationTextHeightMm: 7,
  crossSectionCenterlineStrokeWidthMm: 0.4,
  geometryStrokeWidthMm: 0.55,
  bandStrokeWidthMm: 0.4,
  minElevationSpanM: 4,
  profileStationLabelReserveMm: 12,
  minModelHeightRatio: 0.12,
} as const;

export type SheetRegions = {
  geometryBounds: Bounds2;
  bandBounds: Bounds2;
};

export function splitSheetRegions(
  contentBounds: Bounds2,
  bandHeightMm: number,
  gapMm: number,
): SheetRegions {
  const bandHeight = Math.min(bandHeightMm, (contentBounds.maxY - contentBounds.minY) * 0.38);
  return {
    geometryBounds: {
      minX: contentBounds.minX,
      minY: contentBounds.minY,
      maxX: contentBounds.maxX,
      maxY: contentBounds.maxY - bandHeight - gapMm,
      isEmpty: false,
    },
    bandBounds: {
      minX: contentBounds.minX,
      minY: contentBounds.maxY - bandHeight,
      maxX: contentBounds.maxX,
      maxY: contentBounds.maxY,
      isEmpty: false,
    },
  };
}

export function sheetRegionsForKind(
  paper: PaperDefinition,
  kind: "plan" | "profile",
): SheetRegions {
  const contentBounds = paperContentBoundsMm(paper);
  const bandHeightMm =
    kind === "plan" ? FORMAL_DRAWING_LAYOUT.planBandHeightMm : FORMAL_DRAWING_LAYOUT.profileBandHeightMm;
  return splitSheetRegions(contentBounds, bandHeightMm, FORMAL_DRAWING_LAYOUT.regionGapMm);
}

export function horizontalScaleMmPerMeter(
  spanM: number,
  drawableWidthMm: number,
  innerPaddingMm = FORMAL_DRAWING_LAYOUT.geometryInsetMm,
): number {
  return (drawableWidthMm - innerPaddingMm * 2) / Math.max(spanM, 1);
}

export function fitTransformLongitudinal(
  modelBounds: Bounds2,
  paperBounds: Bounds2,
  startPhysicalDistance: number,
  mmPerMeter: number,
  options: {
    minModelHeightM?: number;
  } = {},
): AffineTransform2 {
  if (modelBounds.isEmpty) {
    return identityPaperTransform();
  }

  const modelWidth = Math.max(modelBounds.maxX - modelBounds.minX, 1);
  const naturalModelHeight = Math.max(modelBounds.maxY - modelBounds.minY, 0.001);
  const minModelHeightM = options.minModelHeightM ?? modelWidth * FORMAL_DRAWING_LAYOUT.minModelHeightRatio;
  const modelHeight = Math.max(naturalModelHeight, minModelHeightM);
  const left = geometryDataOriginX(paperBounds);
  const top = paperBounds.minY + FORMAL_DRAWING_LAYOUT.geometryInsetMm;
  const bottom = top + modelHeight * mmPerMeter;

  return {
    a: mmPerMeter,
    b: 0,
    c: 0,
    d: -mmPerMeter,
    e: left - startPhysicalDistance * mmPerMeter,
    f: bottom + modelBounds.maxY * mmPerMeter,
  };
}

export function fitTransformPlan(
  modelBounds: Bounds2,
  paperBounds: Bounds2,
  options: {
    paddingMm?: number;
    minModelHeightM?: number;
  } = {},
): AffineTransform2 {
  return fitTransformWidthTop(modelBounds, paperBounds, options);
}

export function fitTransformWidthTop(
  modelBounds: Bounds2,
  paperBounds: Bounds2,
  options: {
    paddingMm?: number;
    minModelHeightM?: number;
  } = {},
): AffineTransform2 {
  if (modelBounds.isEmpty) {
    return {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
    };
  }

  const paddingMm = options.paddingMm ?? FORMAL_DRAWING_LAYOUT.geometryInsetMm;
  const modelWidth = Math.max(modelBounds.maxX - modelBounds.minX, 1);
  const naturalModelHeight = Math.max(modelBounds.maxY - modelBounds.minY, 0.001);
  const minModelHeightM = options.minModelHeightM ?? modelWidth * FORMAL_DRAWING_LAYOUT.minModelHeightRatio;
  const modelHeight = Math.max(naturalModelHeight, minModelHeightM);

  const paperWidth = paperBounds.maxX - paperBounds.minX;
  const scale = (paperWidth - paddingMm * 2) / modelWidth;
  const left = paperBounds.minX + paddingMm;
  const top = paperBounds.minY + paddingMm;
  const bottom = top + modelHeight * scale;

  return {
    a: scale,
    b: 0,
    c: 0,
    d: -scale,
    e: left - modelBounds.minX * scale,
    f: bottom + modelBounds.maxY * scale,
  };
}

export function identityPaperTransform(): AffineTransform2 {
  return {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0,
  };
}

export function stationColumnPaperX(
  bandBounds: Bounds2,
  physicalDistance: number,
  startPhysicalDistance: number,
  mmPerMeter: number,
): number {
  return (
    bandBounds.minX
    + FORMAL_DRAWING_LAYOUT.labelColumnWidthMm
    + (physicalDistance - startPhysicalDistance) * mmPerMeter
  );
}

export function geometryDataOriginX(paperBounds: Bounds2): number {
  return paperBounds.minX + FORMAL_DRAWING_LAYOUT.labelColumnWidthMm;
}

export function geometryDrawableWidthMm(paperBounds: Bounds2): number {
  return (
    paperBounds.maxX
    - paperBounds.minX
    - FORMAL_DRAWING_LAYOUT.labelColumnWidthMm
    - FORMAL_DRAWING_LAYOUT.geometryInsetMm
  );
}
