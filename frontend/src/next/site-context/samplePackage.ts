/**
 * Lane U Wave 2: Synthetic `.sitecontext` sample package for the import flow.
 *
 * The Site Context screen drives the real Lane B adapter
 * (createSiteContextImportAdapter) with a deterministic, schema-valid V2
 * package so the import flow (inspect → report → import) is exercisable
 * without an external file. The payload mirrors the Gujo Hachiman baseline
 * (EPSG:6674, projected JGD2011 zone 7) and carries no terrain assets so the
 * package passes the adapter's fail-closed integrity checks with zero files.
 *
 * This is a synthetic fixture for the workflow UI; a real file import replaces
 * the input with an actual parsed package (same adapter surface).
 */

import type {
  SiteContextImportInput,
  SiteContextPackage,
} from "../integration/siteContext/adapterContract";
import {
  GUJO_COORDINATE_CONTEXT,
  GUJO_CENTER_EPSG6674,
} from "../../terrain/gujoSample";

export const SYNTHETIC_SITE_CONTEXT_PACKAGE_ID = "pkg-gujo-hachiman-synthetic" as const;
export const SYNTHETIC_SITE_CONTEXT_PROJECT_ID = "111e4567-e89b-12d3-a456-426614174001" as const;
export const SYNTHETIC_SITE_CONTEXT_PROJECT_NAME = "郡上市八幡 現況 (合成パッケージ)" as const;

function buildSyntheticV2Project(): Record<string, unknown> {
  const now = "2026-08-16T00:00:00.000Z";
  return {
    schemaVersion: "2",
    dataVersion: "2",
    fileFormatVersion: "2",
    project: {
      projectId: SYNTHETIC_SITE_CONTEXT_PROJECT_ID,
      businessNumber: "RB-001",
      name: SYNTHETIC_SITE_CONTEXT_PROJECT_NAME,
      designStage: "概念設計",
      createdAt: now,
      updatedAt: now,
    },
    coordinateContexts: [
      {
        id: GUJO_COORDINATE_CONTEXT.id,
        crs: {
          kind: "known",
          projection: "projected",
          epsg: GUJO_COORDINATE_CONTEXT.crs.epsg,
          name: GUJO_COORDINATE_CONTEXT.crs.name,
          horizontalUnits: "m",
        },
        verticalDatum: "tp",
        verticalUnits: "m",
        origin: { x: GUJO_CENTER_EPSG6674.x, y: GUJO_CENTER_EPSG6674.y, z: 0 },
      },
    ],
    projectCoordinateContextId: GUJO_COORDINATE_CONTEXT.id,
    siteContext: {
      coordinateContextId: GUJO_COORDINATE_CONTEXT.id,
      searchLocation: null,
      selectionArea: null,
      selectionTransformRecords: [],
      terrain: [],
      activeTerrainId: null,
      determinism: {},
      imagery: [],
      vectorLayers: [],
      sourceDatasets: [],
      presentation: {},
    },
    existingConditions: [],
    layerMappings: [],
    settings: {},
  };
}

/** Deterministic, integrity-valid V2 `.sitecontext` package (no assets). */
export function buildSyntheticSiteContextPackage(): SiteContextImportInput {
  const project = buildSyntheticV2Project();
  const packageBody: SiteContextPackage = {
    envelope: {
      format: "sitecontext-package",
      version: "1",
      exportProfile: "sitecontext-v2",
      exportedAt: "2026-08-16T00:00:00.000Z",
      revision: 1,
      projectId: SYNTHETIC_SITE_CONTEXT_PROJECT_ID,
      schemaVersion: "2",
      project,
      files: [],
    },
    files: [],
  };
  return {
    package: packageBody,
    options: { asNew: true },
    sourceMetadata: { synthetic: true, reason: "Lane U sample package for the import flow" },
  };
}