import type { SheetPreset } from "../../dxf/presets/sheetPresets";
import { ja } from "../../../i18n/ja";
import type { DrawingSheetPageKind, DrawingSheetPageMeta } from "../model/document";

export type SheetScaleLabels = {
  scaleLabel: string;
  scaleHorizontal?: string;
  scaleVertical?: string;
};

export function resolveSheetScaleLabels(
  kind: DrawingSheetPageKind,
  preset: SheetPreset,
): SheetScaleLabels {
  if (kind === "plan") {
    const scale = preset.defaultScale.plan;
    return {
      scaleLabel: ja.liner.formalDrawing.scalePlan(scale),
      scaleHorizontal: scale,
    };
  }
  if (kind === "profile") {
    const horizontal = preset.defaultScale.profileHorizontal;
    const vertical = preset.defaultScale.profileVertical;
    return {
      scaleLabel: `${ja.liner.formalDrawing.scaleHorizontal(horizontal)} ${ja.liner.formalDrawing.scaleVertical(vertical)}`,
      scaleHorizontal: horizontal,
      scaleVertical: vertical,
    };
  }
  const scale = preset.defaultScale.crossSection;
  return {
    scaleLabel: ja.liner.formalDrawing.scaleCrossSection(scale),
    scaleHorizontal: scale,
  };
}

export function createSheetPageMeta(
  kind: DrawingSheetPageKind,
  pageIndex: number,
  pageCount: number,
  preset: SheetPreset,
): DrawingSheetPageMeta {
  const scales = resolveSheetScaleLabels(kind, preset);
  return {
    pageIndex,
    pageNumber: pageIndex + 1,
    pageCount,
    drawingKind: kind,
    ...scales,
  };
}
