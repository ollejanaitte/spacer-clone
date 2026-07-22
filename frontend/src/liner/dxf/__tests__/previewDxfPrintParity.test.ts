import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../../data/defaultProject";
import { createDefaultLinerDraft, updateLinerDrawingSettings } from "../../adapters/linerUiAdapter";
import {
  hydrateProjectLinerFromPersistence,
  linerDraftFromProject,
  serializeProjectForPersistence,
  withProjectLinerDraft,
} from "../../adapters/linerProjectDraft";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import {
  buildFormalDrawingWorkspaceDocuments,
  type FormalDrawingWorkspaceDocuments,
} from "../../drawing/formalDrawingWorkspaceDocuments";
import {
  buildMultiPageDrawingDocument,
  createDrawingSettingsFromDraft,
  FORMAL_DRAWING_PAGES,
  selectDrawingDocumentSheet,
} from "../../drawing";
import type { DrawingDocument, DrawingLayer } from "../../drawing/model/document";
import { exportFormalDrawingDxf } from "../export/exportFormalDrawingDxf";
import { mapDrawingDocumentToDxf } from "../mapper/mapDrawingDocumentToDxf";

const PERSISTED_DRAWING_SETTINGS = {
  version: "0.1.0" as const,
  planPaperSize: "A1" as const,
  profilePaperSize: "A2" as const,
  crossSectionPaperSize: "A3" as const,
  bandPaperSize: "A4" as const,
  paperOrientation: "landscape" as const,
  marginMm: 12,
};

function buildDrawableDraft() {
  const draft = createDefaultLinerDraft();
  if (!draft.offsets || draft.offsets.length < 2) {
    draft.offsets = [-5.5, -3.25, 0, 3.25, 5.5];
    draft.crossSections = [
      {
        id: "CS-parity",
        name: "Verify",
        offsetLines: draft.offsets.map((offset, index) => ({
          id: `OL-${index}`,
          offset,
          elevation: index === 2 ? 0 : -0.02 * Math.abs(offset),
          role: "custom" as const,
        })),
      },
    ];
  }
  return draft;
}

function buildDrawableDraftWithPersistedSettings() {
  return updateLinerDrawingSettings(buildDrawableDraft(), PERSISTED_DRAWING_SETTINGS);
}

function reloadDraftThroughRdd(draft: ReturnType<typeof buildDrawableDraft>) {
  const project = withProjectLinerDraft(createDefaultProject(), draft);
  const serialized = serializeProjectForPersistence(project);
  expect(serialized.ok).toBe(true);
  if (!serialized.ok) {
    throw new Error("serializeProjectForPersistence failed");
  }
  const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
  expect(hydrated.ok).toBe(true);
  if (!hydrated.ok) {
    throw new Error("hydrateProjectLinerFromPersistence failed");
  }
  const reloaded = linerDraftFromProject(hydrated.project);
  if (!reloaded) {
    throw new Error("linerDraftFromProject returned undefined");
  }
  return reloaded;
}

function collectLayerNames(document: DrawingDocument): string[] {
  const names = new Set<string>();
  for (const sheet of document.sheets) {
    for (const viewport of sheet.viewports) {
      for (const layer of viewport.layers) {
        names.add(layer.name);
      }
    }
  }
  return [...names].sort();
}

function countPrimitives(document: DrawingDocument): number {
  return document.sheets.reduce(
    (sheetTotal, sheet) =>
      sheetTotal +
      sheet.viewports.reduce(
        (viewportTotal, viewport) =>
          viewportTotal + viewport.layers.reduce((layerTotal, layer) => layerTotal + layer.primitives.length, 0),
        0,
      ),
    0,
  );
}

function countPrimitivesByKind(document: DrawingDocument, kind: DrawingLayer["primitives"][number]["kind"]): number {
  let total = 0;
  for (const sheet of document.sheets) {
    for (const viewport of sheet.viewports) {
      for (const layer of viewport.layers) {
        total += layer.primitives.filter((primitive) => primitive.kind === kind).length;
      }
    }
  }
  return total;
}

function parseExportedDxf(document: DrawingDocument, kind: "plan" | "profile-band" | "cross-section" = "plan") {
  const exported = exportFormalDrawingDxf(kind, document, {
    timestamp: new Date("2026-07-16T12:00:00Z"),
    projectId: "parity",
  });
  const parsed = new DxfParser().parseSync(exported.dxf);
  const entities = Object.values(parsed?.entities ?? {});
  const layers = Object.keys(parsed?.tables?.layer?.layers ?? {});
  return { exported, parsed, entities, layers };
}

describe("preview / DXF / print DrawingDocument parity", () => {
  it("uses one build for preview, DXF, and print on each formal route", () => {
    const draft = buildDrawableDraft();
    for (const page of FORMAL_DRAWING_PAGES) {
      const bundle: FormalDrawingWorkspaceDocuments = buildFormalDrawingWorkspaceDocuments(
        draft,
        page.routeKind,
      );
      expect(bundle.previewDocument).toBe(bundle.dxfDocument);
      expect(bundle.printDocument).toBe(bundle.previewDocument);
      expect(bundle.previewDocument.sheets).toHaveLength(1);
      expect(bundle.previewDocument.sheets[0]?.id).toBe(page.sheetId);
      expect(countPrimitives(bundle.previewDocument)).toBeGreaterThan(0);
    }
  });

  it("keeps preview, DXF, and print parity after drawingSettings RDD round-trip", () => {
    const originalDraft = buildDrawableDraftWithPersistedSettings();
    const reloadedDraft = reloadDraftThroughRdd(originalDraft);
    expect(reloadedDraft.drawingSettings).toEqual(PERSISTED_DRAWING_SETTINGS);

    for (const page of FORMAL_DRAWING_PAGES) {
      const before = buildFormalDrawingWorkspaceDocuments(originalDraft, page.routeKind);
      const after = buildFormalDrawingWorkspaceDocuments(reloadedDraft, page.routeKind);

      expect(after.previewDocument).toBe(after.dxfDocument);
      expect(after.printDocument).toBe(after.previewDocument);
      expect(before.previewDocument).toEqual(after.previewDocument);
      expect(countPrimitives(after.previewDocument)).toBeGreaterThan(0);
      expect(mapDrawingDocumentToDxf(after.previewDocument).document.entities.length).toBeGreaterThan(0);
    }
  });

  it("maps the preview document to DXF without rebuilding geometry", () => {
    const bundle = buildFormalDrawingWorkspaceDocuments(buildDrawableDraft(), "plan");
    const mapped = mapDrawingDocumentToDxf(bundle.previewDocument);
    expect(mapped.document.entities.length).toBeGreaterThan(0);
    expect(mapped.document.tables.layers.some((layer) => layer.name === "PLAN_CENTER")).toBe(true);
  });

  it("reflects each multi-page sheet layer/text/dimension content in DXF", () => {
    const draft = buildDrawableDraft();
    const result = buildIntermediateResult(draft);
    const settings = createDrawingSettingsFromDraft(result, draft.drawingSettings);
    const multiPageDocument = buildMultiPageDrawingDocument({ result, settings });

    expect(multiPageDocument.sheets).toHaveLength(3);

    for (const page of FORMAL_DRAWING_PAGES) {
      const sheetDocument = selectDrawingDocumentSheet(multiPageDocument, page.sheetId);
      const drawingLayers = collectLayerNames(sheetDocument);
      const textCount = countPrimitivesByKind(sheetDocument, "text");
      const dimensionCount = countPrimitivesByKind(sheetDocument, "dimension");
      const mapped = mapDrawingDocumentToDxf(sheetDocument);
      const dxfLayers = mapped.document.tables.layers.map((layer) => layer.name);

      expect(drawingLayers.length).toBeGreaterThan(0);
      for (const layerName of drawingLayers) {
        expect(dxfLayers.some((entry) => entry.includes(layerName.replace(/\s+/g, "_").toUpperCase()) || entry === layerName)).toBe(
          true,
        );
      }
      if (textCount > 0) {
        expect(mapped.document.entities.some((entity) => entity.kind === "text")).toBe(true);
      }
      if (dimensionCount > 0) {
        expect(mapped.document.entities.some((entity) => entity.kind === "line")).toBe(true);
        expect(mapped.document.entities.some((entity) => entity.kind === "text")).toBe(true);
      }
      expect(mapped.document.entities.length).toBeGreaterThan(0);
    }

    const fullMapped = mapDrawingDocumentToDxf(multiPageDocument);
    expect(fullMapped.document.tables.layers.some((layer) => layer.name === "SHEET_FRAME")).toBe(true);
    expect(fullMapped.document.tables.layers.some((layer) => layer.name === "SHEET_TEXT")).toBe(true);
    expect(fullMapped.document.entities.some((entity) => entity.kind === "text")).toBe(true);
  });
});

describe("CAD smoke — DXF parser layer / text / dimension", () => {
  it("parses exported plan DXF with layers and text entities", () => {
    const bundle = buildFormalDrawingWorkspaceDocuments(buildDrawableDraft(), "plan");
    const { exported, entities, layers } = parseExportedDxf(bundle.previewDocument, "plan");

    expect(exported.entityCount).toBeGreaterThan(0);
    expect(layers.length).toBeGreaterThan(0);
    expect(layers).toContain("PLAN_CENTER");
    expect(entities.some((entity) => (entity as { type?: string }).type === "TEXT")).toBe(true);
    expect(entities.some((entity) => (entity as { type?: string }).type === "LWPOLYLINE")).toBe(true);
  });

  it("parses exported cross-section DXF with dimension decomposition", () => {
    const bundle = buildFormalDrawingWorkspaceDocuments(buildDrawableDraft(), "cross-section");
    const { entities, layers } = parseExportedDxf(bundle.previewDocument, "cross-section");

    expect(layers.some((layer) => layer.startsWith("CROSS_"))).toBe(true);
    expect(layers).toContain("CROSS_SLOPE");
    expect(entities.some((entity) => (entity as { type?: string }).type === "LINE")).toBe(true);
    expect(entities.some((entity) => (entity as { type?: string }).type === "TEXT")).toBe(true);
  });
});
