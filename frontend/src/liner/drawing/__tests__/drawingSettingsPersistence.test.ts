import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../../data/defaultProject";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerDrawingSettings,
} from "../../adapters/linerUiAdapter";
import {
  hydrateProjectLinerFromPersistence,
  linerDraftFromProject,
  serializeProjectForPersistence,
  withProjectLinerDraft,
} from "../../adapters/linerProjectDraft";
import { LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY } from "../../adapters/linerDomainDraftRoadDesignMapper";
import type { LinerDrawingSettingsDraft } from "../../schema/types";
import { buildFormalDrawingWorkspaceDocuments } from "../formalDrawingWorkspaceDocuments";
import type { DrawingDocument } from "../model/document";
import { FORMAL_DRAWING_PAGES } from "../sheet/formalDrawingPages";

const PERSISTED_DRAWING_SETTINGS: LinerDrawingSettingsDraft = {
  version: "0.1.0",
  planPaperSize: "A1",
  profilePaperSize: "A2",
  crossSectionPaperSize: "A3",
  bandPaperSize: "A4",
  paperOrientation: "landscape",
  marginMm: 12,
};

function createDrawableDraftWithSettings() {
  let draft = addLinerOffset(createDefaultLinerDraft());
  if (!draft.offsets || draft.offsets.length < 2) {
    draft.offsets = [-5.5, -3.25, 0, 3.25, 5.5];
    draft.crossSections = [
      {
        id: "CS-drawing-settings",
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
  return updateLinerDrawingSettings(draft, PERSISTED_DRAWING_SETTINGS);
}

function collectDocumentSignature(document: DrawingDocument) {
  const layers: string[] = [];
  const primitives: string[] = [];
  for (const sheet of document.sheets) {
    for (const viewport of sheet.viewports) {
      for (const layer of viewport.layers) {
        layers.push(`${sheet.id}:${layer.id}:${layer.name}`);
        for (const primitive of layer.primitives) {
          primitives.push(`${sheet.id}:${primitive.kind}:${primitive.id}`);
        }
      }
    }
  }
  return {
    sheetIds: document.sheets.map((sheet) => sheet.id),
    paper: document.sheets.map((sheet) => ({
      id: sheet.id,
      size: sheet.paper.size,
      orientation: sheet.paper.orientation,
      marginMm: sheet.paper.marginMm,
      widthMm: sheet.paper.widthMm,
      heightMm: sheet.paper.heightMm,
    })),
    layers: layers.sort(),
    primitives: primitives.sort(),
  };
}

function expectNoDrawingDocumentPayload(project: Record<string, unknown>) {
  expect(project.drawingDocument).toBeUndefined();
  const liner = project.liner as Record<string, unknown> | undefined;
  expect(liner?.drawingDocument).toBeUndefined();
  expect(liner?.domainDraft).toBeUndefined();
  expect(liner?.draft).toBeUndefined();
}

describe("drawingSettings persistence and DrawingDocument regeneration", () => {
  it("stores drawingSettings in roadDesignDocument extensions without persisting DrawingDocument", () => {
    const project = withProjectLinerDraft(createDefaultProject(), createDrawableDraftWithSettings());
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    expectNoDrawingDocumentPayload(serialized.project as unknown as Record<string, unknown>);
    const extension =
      serialized.project.liner?.roadDesignDocument?.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as unknown as {
      domainDraft: { drawingSettings?: LinerDrawingSettingsDraft };
    };
    expect(payload.domainDraft.drawingSettings).toEqual(PERSISTED_DRAWING_SETTINGS);
  });

  it("hydrates drawingSettings and regenerates the same DrawingDocument signature deterministically", () => {
    const originalDraft = createDrawableDraftWithSettings();
    const project = withProjectLinerDraft(createDefaultProject(), originalDraft);
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }

    const reloadedDraft = linerDraftFromProject(hydrated.project);
    expect(reloadedDraft?.drawingSettings).toEqual(PERSISTED_DRAWING_SETTINGS);

    const before = buildFormalDrawingWorkspaceDocuments(originalDraft, "plan");
    const after = buildFormalDrawingWorkspaceDocuments(reloadedDraft!, "plan");

    expect(collectDocumentSignature(before.multiPageDocument)).toEqual(
      collectDocumentSignature(after.multiPageDocument),
    );
    expect(collectDocumentSignature(before.previewDocument)).toEqual(
      collectDocumentSignature(after.previewDocument),
    );
    expect(before.previewDocument).toEqual(after.previewDocument);
    expect(before.dxfDocument).toBe(before.previewDocument);
    expect(after.dxfDocument).toBe(after.previewDocument);
    expect(before.printDocument).toBe(before.previewDocument);
    expect(after.printDocument).toBe(after.previewDocument);
  });

  it("keeps preview, print, and DXF on one regenerated document for each formal route", () => {
    const originalDraft = createDrawableDraftWithSettings();
    const project = withProjectLinerDraft(createDefaultProject(), originalDraft);
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }

    const reloadedDraft = linerDraftFromProject(hydrated.project);
    expect(reloadedDraft).toBeDefined();

    for (const page of FORMAL_DRAWING_PAGES) {
      const before = buildFormalDrawingWorkspaceDocuments(originalDraft, page.routeKind);
      const after = buildFormalDrawingWorkspaceDocuments(reloadedDraft!, page.routeKind);

      expect(after.previewDocument).toBe(after.dxfDocument);
      expect(after.printDocument).toBe(after.previewDocument);
      expect(after.previewDocument.sheets).toHaveLength(1);
      expect(after.previewDocument.sheets[0]?.id).toBe(page.sheetId);
      expect(collectDocumentSignature(before.previewDocument)).toEqual(
        collectDocumentSignature(after.previewDocument),
      );
    }
  });

  it("is deterministic across repeated DrawingDocument builds from the same hydrated draft", () => {
    const project = withProjectLinerDraft(createDefaultProject(), createDrawableDraftWithSettings());
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }

    const reloadedDraft = linerDraftFromProject(hydrated.project);
    expect(reloadedDraft).toBeDefined();

    const first = buildFormalDrawingWorkspaceDocuments(reloadedDraft!, "plan");
    const second = buildFormalDrawingWorkspaceDocuments(reloadedDraft!, "plan");
    expect(first.multiPageDocument).toEqual(second.multiPageDocument);
    expect(first.previewDocument).toEqual(second.previewDocument);
  });
});
