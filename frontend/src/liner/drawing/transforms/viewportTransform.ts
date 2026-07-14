import type { Bounds2, Point2 } from "../model/geometry";
import {
  composeAffineTransform2,
  identityAffineTransform2,
  scaleAffineTransform2,
  translateAffineTransform2,
  transformPoint2,
  type AffineTransform2,
} from "./affineTransform2";

export type FitViewportOptions = {
  marginMm?: number;
  invertY?: boolean;
};

function boundsWidth(bounds: Bounds2): number {
  return bounds.isEmpty ? 0 : bounds.maxX - bounds.minX;
}

function boundsHeight(bounds: Bounds2): number {
  return bounds.isEmpty ? 0 : bounds.maxY - bounds.minY;
}

export function fitViewportTransform2(
  modelBounds: Bounds2,
  paperBounds: Bounds2,
  options: FitViewportOptions = {},
): AffineTransform2 {
  if (modelBounds.isEmpty || paperBounds.isEmpty) {
    return identityAffineTransform2();
  }

  const marginMm = options.marginMm ?? 0;
  const invertY = options.invertY ?? true;
  const availableWidth = Math.max(paperBounds.maxX - paperBounds.minX - marginMm * 2, 1);
  const availableHeight = Math.max(paperBounds.maxY - paperBounds.minY - marginMm * 2, 1);
  const modelWidth = Math.max(boundsWidth(modelBounds), 1);
  const modelHeight = Math.max(boundsHeight(modelBounds), 1);
  const scale = Math.min(availableWidth / modelWidth, availableHeight / modelHeight);
  const scaledWidth = modelWidth * scale;
  const scaledHeight = modelHeight * scale;
  const paperCenterX = (paperBounds.minX + paperBounds.maxX) / 2;
  const paperCenterY = (paperBounds.minY + paperBounds.maxY) / 2;
  const modelCenterX = (modelBounds.minX + modelBounds.maxX) / 2;
  const modelCenterY = (modelBounds.minY + modelBounds.maxY) / 2;

  const translateToOrigin = translateAffineTransform2(-modelCenterX, -modelCenterY);
  const scaling = scaleAffineTransform2(scale, invertY ? -scale : scale);
  const translateToPaper = translateAffineTransform2(
    paperCenterX,
    invertY ? paperCenterY : paperCenterY,
  );

  const centered = composeAffineTransform2(translateToOrigin, scaling, translateToPaper);

  if (marginMm <= 0) {
    return centered;
  }

  const offsetX = paperCenterX - scaledWidth / 2;
  const offsetY = paperCenterY - scaledHeight / 2;
  return composeAffineTransform2(translateAffineTransform2(offsetX - paperCenterX, offsetY - paperCenterY), centered);
}

export function transformPointMm(transform: AffineTransform2, point: Point2): Point2 {
  return transformPoint2(transform, point);
}
