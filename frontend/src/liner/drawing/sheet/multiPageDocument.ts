import { getSheetPreset, type SheetPresetId } from "../../dxf/presets/sheetPresets";
import { ja } from "../../../i18n/ja";
import {
  createCrossSectionDrawingBuilder,
  createPlanDrawingBuilder,
  createProfileDrawingBuilder,
} from "../builders/formalBuilders";
import type { BuildDrawingContext, DrawingBuilder } from "../builders/types";
import type { DrawingDocument, DrawingSheet, DrawingSheetPageKind } from "../model/document";
import { decorateDrawingSheet } from "./sheetDecoration";
import { FORMAL_DRAWING_PAGES, formalDrawingPageCount } from "./formalDrawingPages";
import { createSheetPageMeta } from "./sheetScale";

export type BuildMultiPageDrawingDocumentOptions = {
  sheetPresetId?: SheetPresetId;
};

function sheetDisplayName(kind: DrawingSheetPageKind): string {
  if (kind === "plan") {
    return ja.liner.formalDrawing.pageNames.plan;
  }
  if (kind === "profile") {
    return ja.liner.formalDrawing.pageNames.profile;
  }
  return ja.liner.formalDrawing.pageNames.crossSection;
}

function builderForPageKind(
  kind: DrawingSheetPageKind,
  selectedCrossSectionStation: number | undefined,
): DrawingBuilder {
  if (kind === "plan") {
    return createPlanDrawingBuilder();
  }
  if (kind === "profile") {
    return createProfileDrawingBuilder();
  }
  return createCrossSectionDrawingBuilder(selectedCrossSectionStation);
}

export function buildMultiPageDrawingDocument(
  context: BuildDrawingContext,
  options: BuildMultiPageDrawingDocumentOptions = {},
): DrawingDocument {
  const preset = getSheetPreset(options.sheetPresetId ?? "common");
  const pageCount = formalDrawingPageCount();
  const sheets: DrawingSheet[] = [];
  const diagnostics = [];

  for (const [pageIndex, pageDescriptor] of FORMAL_DRAWING_PAGES.entries()) {
    const builder = builderForPageKind(pageDescriptor.kind, context.settings.selectedCrossSectionStation);
    const output = builder.build(context);
    const pageMeta = createSheetPageMeta(pageDescriptor.kind, pageIndex, pageCount, preset);
    const decorated = decorateDrawingSheet(
      {
        ...output.sheet,
        name: sheetDisplayName(pageDescriptor.kind),
      },
      pageMeta,
      preset,
    );
    sheets.push(decorated);
    diagnostics.push(...output.diagnostics);
  }

  return {
    version: context.settings.version,
    sheets,
    diagnostics,
    stationAxes: [...context.settings.stationAxes],
  };
}

export function selectDrawingDocumentSheet(
  document: DrawingDocument,
  sheetId: string,
): DrawingDocument {
  const sheet = document.sheets.find((entry) => entry.id === sheetId);
  if (!sheet) {
    return document;
  }
  return {
    ...document,
    sheets: [sheet],
  };
}
