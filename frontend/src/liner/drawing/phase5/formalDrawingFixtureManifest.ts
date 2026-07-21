import { ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION } from "../../../contracts";
import {
  LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2,
} from "../../adapters/linerDomainDraftRoadDesignMapper";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { exportFormalDrawingDxf, type FormalDrawingDxfKind } from "../../dxf/export/exportFormalDrawingDxf";
import { DEFAULT_DXF_HEADER } from "../../dxf/model/defaults";
import { mapDrawingDocumentToDxf } from "../../dxf/mapper/mapDrawingDocumentToDxf";
import type { LinerDrawingWorkspaceKind } from "../../uiPreparation";
import {
  buildFormalDrawingWorkspaceDocuments,
  type FormalDrawingWorkspaceDocuments,
} from "../formalDrawingWorkspaceDocuments";
import type { DrawingDocument, DrawingSheetPageKind } from "../model/document";
import type { DrawingPrimitive } from "../model/primitives";
import { validateDrawingDocument } from "../validation/validateDrawingDocument";
import type { FormalPlanType } from "../builders/types";

export const P5_D01_FIXTURE_SCHEMA_VERSION = "0.1.0" as const;

export type Phase5FixtureStatus = "approved";
export type Phase5StationConvention = "jip-no-notation";
export type Phase5CoordinateConvention = "road-model-meters-world-xy-paper-mm";
export type Phase5SourceAuthority = "phase5-freeze-default-liner-draft";
export type Phase5Tolerance = {
  readonly distanceM: number;
  readonly paperMm: number;
  readonly dxfModelUnits: number;
};
export type Phase5ExpectedPreview = {
  readonly sheetId: string;
  readonly requiredViewportKinds: readonly DrawingSheetPageKind[];
  readonly requiredPrimitiveKinds: readonly DrawingPrimitive["kind"][];
  readonly requiredLayerIds: readonly string[];
  readonly requiredTextSnippets: readonly string[];
  readonly minPrimitiveCount: number;
};
export type Phase5ExpectedDxf = {
  readonly kind: FormalDrawingDxfKind;
  readonly acadVer: typeof DEFAULT_DXF_HEADER.acadVer;
  readonly requiredLayerNames: readonly string[];
  readonly requiredTextSnippets: readonly string[];
  readonly minEntityCount: number;
};
export type Phase5FormalDrawingFixture = {
  readonly fixtureId: string;
  readonly title: string;
  readonly sourcePath: string;
  readonly goldenPath: string;
  readonly routeKind: LinerDrawingWorkspaceKind;
  readonly expectedDrawingType: DrawingSheetPageKind;
  readonly expectedPlanType: FormalPlanType | "not_applicable";
  readonly expectedSchemaVersion: typeof ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION;
  readonly expectedPayloadVersion: typeof LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2;
  readonly expectedPreview: Phase5ExpectedPreview;
  readonly expectedDxf: Phase5ExpectedDxf;
  readonly tolerance: Phase5Tolerance;
  readonly stationConvention: Phase5StationConvention;
  readonly coordinateConvention: Phase5CoordinateConvention;
  readonly status: Phase5FixtureStatus;
  readonly sourceAuthority: Phase5SourceAuthority;
  readonly relatedJipSection: readonly string[];
  readonly relatedOpenDecision: readonly string[];
  readonly relatedP5Step: "P5-D01" | "P5-D02" | "P5-D03" | "P5-D04" | "P5-D05";
};
export type Phase5FormalDrawingFixtureManifest = {
  readonly schemaVersion: typeof P5_D01_FIXTURE_SCHEMA_VERSION;
  readonly fixtures: readonly Phase5FormalDrawingFixture[];
};
export type Phase5FixtureDiagnosticCode =
  | "P5_D01_DUPLICATE_FIXTURE_ID"
  | "P5_D01_FIXTURE_ORDER_UNSTABLE"
  | "P5_D01_MISSING_SOURCE_PATH"
  | "P5_D01_MISSING_GOLDEN_PATH"
  | "P5_D01_UNSUPPORTED_SCHEMA_VERSION"
  | "P5_D01_UNSUPPORTED_PAYLOAD_VERSION"
  | "P5_D01_INVALID_TOLERANCE"
  | "P5_D01_UNKNOWN_STATUS"
  | "P5_D01_UNKNOWN_SOURCE_AUTHORITY"
  | "P5_D01_INVALID_STATION_CONVENTION"
  | "P5_D01_INVALID_COORDINATE_CONVENTION"
  | "P5_D01_UNSUPPORTED_DRAWING_TYPE"
  | "P5_D01_PREVIEW_EXPECTATION_MISSING"
  | "P5_D01_DXF_EXPECTATION_MISSING"
  | "P5_D01_PREVIEW_DXF_ROUTE_DIVERGENCE"
  | "P5_D01_DRAWING_DOCUMENT_INVALID"
  | "P5_D01_DXF_DOCUMENT_INVALID"
  | "P5_D01_STALE_GOLDEN";
export type Phase5FixtureDiagnostic = {
  readonly code: Phase5FixtureDiagnosticCode;
  readonly fixtureId?: string;
  readonly message: string;
};
export type Phase5FixtureValidationResult = {
  readonly ok: boolean;
  readonly diagnostics: readonly Phase5FixtureDiagnostic[];
};

type PathExists = (path: string) => boolean;

const DEFAULT_TOLERANCE: Phase5Tolerance = {
  distanceM: 1e-6,
  paperMm: 1e-3,
  dxfModelUnits: 1e-6,
};

export const P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST: Phase5FormalDrawingFixtureManifest = {
  schemaVersion: P5_D01_FIXTURE_SCHEMA_VERSION,
  fixtures: [
    {
      fixtureId: "p5-d01-cross-section-default",
      title: "Cross-section formal drawing representative fixture",
      sourcePath: "frontend/src/liner/drawing/phase5/__fixtures__/p5-d01-cross-section-default.source.json",
      goldenPath: "frontend/src/liner/drawing/phase5/__golden__/p5-d01-cross-section-default.golden.json",
      routeKind: "cross-section",
      expectedDrawingType: "cross_section",
      expectedPlanType: "not_applicable",
      expectedSchemaVersion: ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
      expectedPayloadVersion: LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2,
      expectedPreview: {
        sheetId: "cross_section-sheet",
        requiredViewportKinds: ["cross_section"],
        requiredPrimitiveKinds: ["polyline", "text"],
        requiredLayerIds: ["cross-section-layer"],
        requiredTextSnippets: ["No."],
        minPrimitiveCount: 6,
      },
      expectedDxf: {
        kind: "cross-section",
        acadVer: DEFAULT_DXF_HEADER.acadVer,
        requiredLayerNames: ["CROSS_CENTER", "CROSS_SHAPE"],
        requiredTextSnippets: ["No."],
        minEntityCount: 6,
      },
      tolerance: DEFAULT_TOLERANCE,
      stationConvention: "jip-no-notation",
      coordinateConvention: "road-model-meters-world-xy-paper-mm",
      status: "approved",
      sourceAuthority: "phase5-freeze-default-liner-draft",
      relatedJipSection: ["8.5", "8.9"],
      relatedOpenDecision: ["OD-06", "OD-17", "OD-19"],
      relatedP5Step: "P5-D01",
    },
    {
      fixtureId: "p5-d01-plan-type-a-default",
      title: "Plan Type A road-shape representative fixture",
      sourcePath: "frontend/src/liner/drawing/phase5/__fixtures__/p5-d01-plan-type-a-default.source.json",
      goldenPath: "frontend/src/liner/drawing/phase5/__golden__/p5-d01-plan-type-a-default.golden.json",
      routeKind: "plan",
      expectedDrawingType: "plan",
      expectedPlanType: "road_shape",
      expectedSchemaVersion: ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
      expectedPayloadVersion: LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2,
      expectedPreview: {
        sheetId: "plan-sheet",
        requiredViewportKinds: ["plan"],
        requiredPrimitiveKinds: ["polyline", "text", "dimension"],
        requiredLayerIds: ["plan-layer", "plan-annotation-layer", "plan-band-layer"],
        requiredTextSnippets: ["No.", "座標表"],
        minPrimitiveCount: 20,
      },
      expectedDxf: {
        kind: "plan-type-a",
        acadVer: DEFAULT_DXF_HEADER.acadVer,
        requiredLayerNames: ["PLAN_CENTER", "PLAN_TEXT", "PLAN_BAND"],
        requiredTextSnippets: ["No.", "座標表"],
        minEntityCount: 20,
      },
      tolerance: DEFAULT_TOLERANCE,
      stationConvention: "jip-no-notation",
      coordinateConvention: "road-model-meters-world-xy-paper-mm",
      status: "approved",
      sourceAuthority: "phase5-freeze-default-liner-draft",
      relatedJipSection: ["8.2", "8.4", "8.7", "8.8"],
      relatedOpenDecision: ["OD-03", "OD-05", "OD-06", "OD-16", "OD-19"],
      relatedP5Step: "P5-D01",
    },
    {
      fixtureId: "p5-d01-plan-type-b-default",
      title: "Plan Type B centerline and coordinate-table representative fixture",
      sourcePath: "frontend/src/liner/drawing/phase5/__fixtures__/p5-d01-plan-type-b-default.source.json",
      goldenPath: "frontend/src/liner/drawing/phase5/__golden__/p5-d01-plan-type-b-default.golden.json",
      routeKind: "plan",
      expectedDrawingType: "plan",
      expectedPlanType: "centerline_only",
      expectedSchemaVersion: ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
      expectedPayloadVersion: LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2,
      expectedPreview: {
        sheetId: "plan-sheet",
        requiredViewportKinds: ["plan"],
        requiredPrimitiveKinds: ["polyline", "text", "circle"],
        requiredLayerIds: ["plan-layer", "plan-coordinate-table-layer"],
        requiredTextSnippets: ["No.", "座標表"],
        minPrimitiveCount: 12,
      },
      expectedDxf: {
        kind: "plan-type-b-centerline",
        acadVer: DEFAULT_DXF_HEADER.acadVer,
        requiredLayerNames: ["PLAN_CENTER", "PLAN_TEXT"],
        requiredTextSnippets: ["No.", "座標表"],
        minEntityCount: 12,
      },
      tolerance: DEFAULT_TOLERANCE,
      stationConvention: "jip-no-notation",
      coordinateConvention: "road-model-meters-world-xy-paper-mm",
      status: "approved",
      sourceAuthority: "phase5-freeze-default-liner-draft",
      relatedJipSection: ["8.2", "8.4", "8.7"],
      relatedOpenDecision: ["OD-03", "OD-05", "OD-06", "OD-17", "OD-19"],
      relatedP5Step: "P5-D01",
    },
    {
      fixtureId: "p5-d01-profile-band-default",
      title: "Profile and band formal drawing representative fixture",
      sourcePath: "frontend/src/liner/drawing/phase5/__fixtures__/p5-d01-profile-band-default.source.json",
      goldenPath: "frontend/src/liner/drawing/phase5/__golden__/p5-d01-profile-band-default.golden.json",
      routeKind: "profile",
      expectedDrawingType: "profile",
      expectedPlanType: "not_applicable",
      expectedSchemaVersion: ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
      expectedPayloadVersion: LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2,
      expectedPreview: {
        sheetId: "profile-sheet",
        requiredViewportKinds: ["profile"],
        requiredPrimitiveKinds: ["polyline", "text"],
        requiredLayerIds: ["profile-layer", "profile-annotation-layer", "band-layer"],
        requiredTextSnippets: ["地盤データ未設定", "No."],
        minPrimitiveCount: 16,
      },
      expectedDxf: {
        kind: "profile-band",
        acadVer: DEFAULT_DXF_HEADER.acadVer,
        requiredLayerNames: ["PROFILE_DESIGN", "PROFILE_TEXT", "PROFILE_BAND"],
        requiredTextSnippets: ["地盤データ未設定", "No."],
        minEntityCount: 16,
      },
      tolerance: DEFAULT_TOLERANCE,
      stationConvention: "jip-no-notation",
      coordinateConvention: "road-model-meters-world-xy-paper-mm",
      status: "approved",
      sourceAuthority: "phase5-freeze-default-liner-draft",
      relatedJipSection: ["8.2", "8.3", "8.5", "5.4"],
      relatedOpenDecision: ["OD-06", "OD-07", "OD-13", "OD-18", "OD-19"],
      relatedP5Step: "P5-D01",
    },
  ],
};

export function validatePhase5FormalDrawingFixtureManifest(
  manifest: Phase5FormalDrawingFixtureManifest,
  options: { readonly pathExists?: PathExists } = {},
): Phase5FixtureValidationResult {
  const diagnostics: Phase5FixtureDiagnostic[] = [];
  const ids = new Set<string>();
  let previousId = "";

  for (const fixture of manifest.fixtures) {
    if (ids.has(fixture.fixtureId)) {
      diagnostics.push(error("P5_D01_DUPLICATE_FIXTURE_ID", fixture, `Duplicate fixtureId ${fixture.fixtureId}`));
    }
    ids.add(fixture.fixtureId);

    if (previousId && fixture.fixtureId.localeCompare(previousId) < 0) {
      diagnostics.push(error("P5_D01_FIXTURE_ORDER_UNSTABLE", fixture, "Fixture manifest must be sorted by fixtureId."));
    }
    previousId = fixture.fixtureId;

    if (options.pathExists && !options.pathExists(fixture.sourcePath)) {
      diagnostics.push(error("P5_D01_MISSING_SOURCE_PATH", fixture, `Missing source fixture ${fixture.sourcePath}`));
    }
    if (options.pathExists && !options.pathExists(fixture.goldenPath)) {
      diagnostics.push(error("P5_D01_MISSING_GOLDEN_PATH", fixture, `Missing golden fixture ${fixture.goldenPath}`));
    }
    if (fixture.expectedSchemaVersion !== ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION) {
      diagnostics.push(error("P5_D01_UNSUPPORTED_SCHEMA_VERSION", fixture, `Unsupported schema version ${fixture.expectedSchemaVersion}`));
    }
    if (fixture.expectedPayloadVersion !== LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2) {
      diagnostics.push(error("P5_D01_UNSUPPORTED_PAYLOAD_VERSION", fixture, `Unsupported payload version ${fixture.expectedPayloadVersion}`));
    }
    if (!isValidTolerance(fixture.tolerance)) {
      diagnostics.push(error("P5_D01_INVALID_TOLERANCE", fixture, "Tolerance values must be finite positive numbers."));
    }
    if (fixture.status !== "approved") {
      diagnostics.push(error("P5_D01_UNKNOWN_STATUS", fixture, `Unknown fixture status ${fixture.status}`));
    }
    if (fixture.sourceAuthority !== "phase5-freeze-default-liner-draft") {
      diagnostics.push(error("P5_D01_UNKNOWN_SOURCE_AUTHORITY", fixture, `Unknown source authority ${fixture.sourceAuthority}`));
    }
    if (fixture.stationConvention !== "jip-no-notation") {
      diagnostics.push(error("P5_D01_INVALID_STATION_CONVENTION", fixture, `Unsupported station convention ${fixture.stationConvention}`));
    }
    if (fixture.coordinateConvention !== "road-model-meters-world-xy-paper-mm") {
      diagnostics.push(error("P5_D01_INVALID_COORDINATE_CONVENTION", fixture, `Unsupported coordinate convention ${fixture.coordinateConvention}`));
    }
    if (!["plan", "profile", "cross_section"].includes(fixture.expectedDrawingType)) {
      diagnostics.push(error("P5_D01_UNSUPPORTED_DRAWING_TYPE", fixture, `Unsupported drawing type ${fixture.expectedDrawingType}`));
    }
    if (fixture.expectedPreview.requiredPrimitiveKinds.length === 0 || fixture.expectedPreview.minPrimitiveCount <= 0) {
      diagnostics.push(error("P5_D01_PREVIEW_EXPECTATION_MISSING", fixture, "Preview expectation must require primitives."));
    }
    if (fixture.expectedDxf.requiredLayerNames.length === 0 || fixture.expectedDxf.minEntityCount <= 0) {
      diagnostics.push(error("P5_D01_DXF_EXPECTATION_MISSING", fixture, "DXF expectation must require layers and entities."));
    }
  }

  return { ok: diagnostics.length === 0, diagnostics };
}

export function validatePhase5FormalDrawingFixture(
  fixture: Phase5FormalDrawingFixture,
): Phase5FixtureValidationResult {
  const planType = fixture.expectedPlanType === "not_applicable" ? undefined : fixture.expectedPlanType;
  const bundle = buildFormalDrawingWorkspaceDocuments(createDefaultLinerDraft(), fixture.routeKind, planType);
  return validatePhase5FormalDrawingFixtureDocuments(fixture, bundle);
}

export function validatePhase5FormalDrawingFixtureDocuments(
  fixture: Phase5FormalDrawingFixture,
  bundle: Pick<FormalDrawingWorkspaceDocuments, "previewDocument" | "dxfDocument" | "printDocument">,
): Phase5FixtureValidationResult {
  const diagnostics: Phase5FixtureDiagnostic[] = [];
  const document = bundle.previewDocument;

  if (bundle.previewDocument !== bundle.dxfDocument || bundle.printDocument !== bundle.previewDocument) {
    diagnostics.push(error("P5_D01_PREVIEW_DXF_ROUTE_DIVERGENCE", fixture, "Preview, print, and DXF must share the same DrawingDocument instance."));
  }

  const drawingValidation = validateDrawingDocument(document);
  if (!drawingValidation.isValid) {
    diagnostics.push(error("P5_D01_DRAWING_DOCUMENT_INVALID", fixture, "DrawingDocument validation failed."));
  }

  diagnostics.push(...validatePreviewExpectation(fixture, document));
  diagnostics.push(...validateDxfExpectation(fixture, document));

  return { ok: diagnostics.length === 0, diagnostics };
}

export function validatePhase5FormalDrawingFixtureGate(
  manifest: Phase5FormalDrawingFixtureManifest = P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
  options: { readonly pathExists?: PathExists } = {},
): Phase5FixtureValidationResult {
  const manifestResult = validatePhase5FormalDrawingFixtureManifest(manifest, options);
  const diagnostics = [...manifestResult.diagnostics];
  for (const fixture of manifest.fixtures) {
    diagnostics.push(...validatePhase5FormalDrawingFixture(fixture).diagnostics);
  }
  return { ok: diagnostics.length === 0, diagnostics };
}

function validatePreviewExpectation(
  fixture: Phase5FormalDrawingFixture,
  document: DrawingDocument,
): Phase5FixtureDiagnostic[] {
  const diagnostics: Phase5FixtureDiagnostic[] = [];
  const sheet = document.sheets[0];
  if (!sheet || sheet.id !== fixture.expectedPreview.sheetId || sheet.page?.drawingKind !== fixture.expectedDrawingType) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "Preview sheet identity no longer matches the P5-D01 golden expectation."));
    return diagnostics;
  }

  const viewports = sheet.viewports;
  const viewportKinds = new Set(viewports.map((viewport) => viewport.kind));
  const layers = viewports.flatMap((viewport) => viewport.layers);
  const layerIds = new Set(layers.map((layer) => layer.id));
  const primitives = layers.flatMap((layer) => layer.primitives);
  const primitiveKinds = new Set(primitives.map((primitive) => primitive.kind));
  const textValues = primitives
    .filter((primitive): primitive is Extract<DrawingPrimitive, { kind: "text" }> => primitive.kind === "text")
    .map((primitive) => primitive.value);

  if (!fixture.expectedPreview.requiredViewportKinds.every((kind) => viewportKinds.has(kind))) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "Preview viewport kinds no longer match the P5-D01 golden expectation."));
  }
  if (!fixture.expectedPreview.requiredLayerIds.every((layerId) => layerIds.has(layerId))) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "Preview layers no longer match the P5-D01 golden expectation."));
  }
  if (!fixture.expectedPreview.requiredPrimitiveKinds.every((kind) => primitiveKinds.has(kind))) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "Preview primitive kinds no longer match the P5-D01 golden expectation."));
  }
  if (primitives.length < fixture.expectedPreview.minPrimitiveCount) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "Preview primitive count is below the P5-D01 golden expectation."));
  }
  if (!fixture.expectedPreview.requiredTextSnippets.every((snippet) => textValues.some((value) => value.includes(snippet)))) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "Preview text snippets no longer match the P5-D01 golden expectation."));
  }

  return diagnostics;
}

function validateDxfExpectation(
  fixture: Phase5FormalDrawingFixture,
  document: DrawingDocument,
): Phase5FixtureDiagnostic[] {
  const diagnostics: Phase5FixtureDiagnostic[] = [];
  const mapped = mapDrawingDocumentToDxf(document);
  if (mapped.document.header.acadVer !== fixture.expectedDxf.acadVer) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "DXF ACADVER no longer matches the P5-D01 golden expectation."));
  }
  if (mapped.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    diagnostics.push(error("P5_D01_DXF_DOCUMENT_INVALID", fixture, "DXF mapping emitted error diagnostics."));
  }

  const exported = exportFormalDrawingDxf(fixture.expectedDxf.kind, document, {
    timestamp: new Date("2026-07-22T00:00:00Z"),
    projectId: fixture.fixtureId,
  });
  if (exported.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    diagnostics.push(error("P5_D01_DXF_DOCUMENT_INVALID", fixture, "DXF export emitted error diagnostics."));
  }

  const layerNames = new Set(mapped.document.tables.layers.map((layer) => layer.name));
  if (!fixture.expectedDxf.requiredLayerNames.every((name) => layerNames.has(name))) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "DXF layers no longer match the P5-D01 golden expectation."));
  }
  if (mapped.document.entities.length < fixture.expectedDxf.minEntityCount) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "DXF entity count is below the P5-D01 golden expectation."));
  }
  if (!fixture.expectedDxf.requiredTextSnippets.every((snippet) => exported.dxf.includes(snippet))) {
    diagnostics.push(error("P5_D01_STALE_GOLDEN", fixture, "DXF text snippets no longer match the P5-D01 golden expectation."));
  }

  return diagnostics;
}

function isValidTolerance(tolerance: Phase5Tolerance): boolean {
  return [tolerance.distanceM, tolerance.paperMm, tolerance.dxfModelUnits].every(
    (value) => Number.isFinite(value) && value > 0,
  );
}

function error(
  code: Phase5FixtureDiagnosticCode,
  fixture: Pick<Phase5FormalDrawingFixture, "fixtureId">,
  message: string,
): Phase5FixtureDiagnostic {
  return { code, fixtureId: fixture.fixtureId, message };
}
