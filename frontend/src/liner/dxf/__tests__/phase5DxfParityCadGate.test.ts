import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildFormalDrawingWorkspaceDocuments } from "../../drawing/formalDrawingWorkspaceDocuments";
import type { FormalPlanType } from "../../drawing/builders/types";
import type { DrawingDocument } from "../../drawing/model/document";
import { exportFormalDrawingDxf, type FormalDrawingDxfKind } from "../export/exportFormalDrawingDxf";
import { mapDrawingDocumentToDxf } from "../mapper/mapDrawingDocumentToDxf";
import { DEFAULT_DXF_HEADER } from "../model/defaults";
import { validateDxfDocument } from "../validation/validateDxfDocument";
import { CAD_LAYER_PRESETS, DRAWING_LAYER_TO_CAD_PRESET } from "../presets/cadLayerPresets";
import { getSheetPreset } from "../presets/sheetPresets";

type DxfGateCase = {
  readonly title: string;
  readonly routeKind: "plan" | "profile" | "cross-section";
  readonly exportKind: FormalDrawingDxfKind;
  readonly planType?: FormalPlanType;
  readonly requiredLayers: readonly string[];
  readonly requiredTextSnippets: readonly string[];
};

const DXF_GATE_CASES: readonly DxfGateCase[] = [
  {
    title: "Plan Type A road-shape",
    routeKind: "plan",
    exportKind: "plan-type-a",
    planType: "road_shape",
    requiredLayers: ["PLAN_CENTER", "PLAN_TEXT", "PLAN_BAND"],
    requiredTextSnippets: ["No.", "座標表"],
  },
  {
    title: "Plan Type B centerline",
    routeKind: "plan",
    exportKind: "plan-type-b-centerline",
    planType: "centerline_only",
    requiredLayers: ["PLAN_CENTER", "PLAN_TEXT"],
    requiredTextSnippets: ["No.", "座標表"],
  },
  {
    title: "Profile and band",
    routeKind: "profile",
    exportKind: "profile-band",
    requiredLayers: ["PROFILE_DESIGN", "PROFILE_TEXT", "PROFILE_BAND"],
    requiredTextSnippets: ["No.", "地盤データ未設定"],
  },
  {
    title: "Cross-section",
    routeKind: "cross-section",
    exportKind: "cross-section",
    requiredLayers: ["CROSS_CENTER", "CROSS_SHAPE", "CROSS_SLOPE"],
    requiredTextSnippets: ["中心線", "交角"],
  },
];

function buildDrawableDraft() {
  const draft = createDefaultLinerDraft();
  draft.offsets = [-5.5, -3.25, 0, 3.25, 5.5];
  draft.crossSections = [
    {
      id: "CS-p5-d03",
      name: "P5-D03 CAD gate",
      offsetLines: draft.offsets.map((offset, index) => ({
        id: `OL-p5-d03-${index}`,
        offset,
        elevation: index === 2 ? 0 : -0.02 * Math.abs(offset),
        role: "custom" as const,
      })),
    },
  ];
  return draft;
}

function parseDxf(dxf: string) {
  const parsed = new DxfParser().parseSync(dxf);
  return {
    layers: Object.keys(parsed?.tables?.layer?.layers ?? {}),
    entities: Object.values(parsed?.entities ?? {}),
  };
}

function exportWorkspaceDxf(entry: DxfGateCase, document: DrawingDocument) {
  return exportFormalDrawingDxf(entry.exportKind, document, {
    projectId: "p5-d03",
    sheetPresetId: "common",
    timestamp: new Date("2026-07-22T00:00:00Z"),
  });
}

describe("P5-D03 preview / print / DXF CAD gate", () => {
  it.each(DXF_GATE_CASES)("$title exports workspace DXF with AC1021 and common CAD preset evidence", (entry) => {
    const bundle = buildFormalDrawingWorkspaceDocuments(buildDrawableDraft(), entry.routeKind, entry.planType);
    const first = exportWorkspaceDxf(entry, bundle.dxfDocument);
    const second = exportWorkspaceDxf(entry, bundle.dxfDocument);
    const mapped = mapDrawingDocumentToDxf(bundle.dxfDocument);
    const validation = validateDxfDocument(mapped.document);
    const parsed = parseDxf(first.dxf);

    expect(bundle.previewDocument).toBe(bundle.dxfDocument);
    expect(bundle.printDocument).toBe(bundle.previewDocument);
    expect(first.dxf).toBe(second.dxf);
    expect(first.dxf).toContain("9\n$ACADVER\n1\nAC1021");
    expect(first.fileName).toContain(`liner-p5-d03-${entry.exportKind}-`);
    expect(first.entityCount).toBeGreaterThan(0);
    expect(first.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    expect(validation.hasErrors).toBe(false);

    for (const layer of entry.requiredLayers) {
      expect(mapped.document.tables.layers.map((candidate) => candidate.name)).toContain(layer);
      expect(parsed.layers).toContain(layer);
    }
    for (const snippet of entry.requiredTextSnippets) {
      expect(first.dxf).toContain(snippet);
    }
  });

  it("locks the release CAD gate to the common preset without a regional compliance claim", () => {
    const common = getSheetPreset("common");
    const defaultLayerNames = common.defaultLayers.map((layerId) => CAD_LAYER_PRESETS[layerId].name);

    expect(common.layerPresetGroup).toBe("formal-default");
    expect(defaultLayerNames).toEqual([
      "PLAN_CENTER",
      "PLAN_OFFSET",
      "PLAN_STATION",
      "PLAN_TEXT",
      "PLAN_BAND",
      "PROFILE_GRID",
      "PROFILE_DESIGN",
      "PROFILE_GROUND",
      "PROFILE_TEXT",
      "PROFILE_BAND",
      "CROSS_SHAPE",
      "CROSS_CENTER",
      "CROSS_DIM",
      "CROSS_TEXT",
      "SHEET_FRAME",
      "SHEET_TEXT",
    ]);
    expect(DRAWING_LAYER_TO_CAD_PRESET["plan-curve-annotation-layer"]).toBe("PLAN_CURVE");
    expect(DRAWING_LAYER_TO_CAD_PRESET["profile-vertical-curve-layer"]).toBe("PROFILE_VCURVE");
    expect(DRAWING_LAYER_TO_CAD_PRESET["cross-section-slope-layer"]).toBe("CROSS_SLOPE");
    expect(DEFAULT_DXF_HEADER.acadVer).toBe("AC1021");
  });
});
