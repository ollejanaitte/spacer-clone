/**
 * Reference Bridge 001 geometry replay (Phase 6-4).
 *
 * Runs the deterministic reproduction chain fixture -> GeometrySnapshot -> 3D
 * payload -> STL export and classifies discrepancies against golden-derived
 * expected values with a tolerance. This is the reusable replay entry for the
 * full pipeline (analysis/design steps attach in Phase 7/8).
 *
 * No golden values are fabricated: expected values are declared inputs carrying
 * provenance (goldenId / source).
 */

import type { GeometrySnapshot } from "../geometry";
import { computeFingerprint } from "../geometry/engine";
import { buildSnapshotVisualizationModel } from "../visualization/snapshotVisualizationModel";
import { exportApolloBinaryStl } from "../export/apolloStlExport";

export type ReplayDiscrepancyClass =
  | "FAIL_NUMERIC"
  | "FAIL_ID"
  | "FAIL_UNRESOLVED"
  | "WARN_PROVENANCE"
  | "PASS";

export type ReplayEntry = {
  step: string;
  status: "PASS" | "FAIL" | "WARN";
  detail: string;
  discrepancyClass: ReplayDiscrepancyClass;
};

export type ReplayReport = {
  bridgeId: string;
  verdict: "PASS" | "FAIL";
  fingerprint: string;
  entries: ReplayEntry[];
};

export type GeometryReplayGolden = {
  expectedSupportStationsM: number[];
  expectedGirderOffsetsM: Record<string, number>;
  expectedGridPanelCount: number;
  expectedGridHoldCount: number;
  tolerance?: number;
};

const DEFAULT_TOLERANCE = 1e-6;

function withinTolerance(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

/**
 * Classify a geometry snapshot against golden-derived expected values.
 */
export function classifyGeometryReplay(
  snapshot: GeometrySnapshot,
  golden: GeometryReplayGolden,
): ReplayReport {
  const tol = golden.tolerance ?? DEFAULT_TOLERANCE;
  const entries: ReplayEntry[] = [];
  const push = (entry: ReplayEntry) => entries.push(entry);

  // Support stations
  const stations = snapshot.supportLines.map((l) => l.stationM.value ?? Number.NaN);
  const stationsOk =
    stations.length === golden.expectedSupportStationsM.length &&
    stations.every((s, i) => withinTolerance(s, golden.expectedSupportStationsM[i], tol));
  push({
    step: "geometry/supports",
    status: stationsOk ? "PASS" : "FAIL",
    detail: `stations=${JSON.stringify(stations)} expected=${JSON.stringify(golden.expectedSupportStationsM)}`,
    discrepancyClass: stationsOk ? "PASS" : "FAIL_NUMERIC",
  });

  // Girder offsets
  for (const [girderId, expectedOffset] of Object.entries(golden.expectedGirderOffsetsM)) {
    const line = snapshot.girderLines.find((l) => l.girderId === girderId);
    const actual = line?.offsetM.value ?? Number.NaN;
    const ok = withinTolerance(actual, expectedOffset, tol);
    push({
      step: `geometry/girder/${girderId}`,
      status: ok ? "PASS" : "FAIL",
      detail: `offset=${actual} expected=${expectedOffset}`,
      discrepancyClass: ok ? "PASS" : "FAIL_NUMERIC",
    });
  }

  // Grid panel structure + HOLD propagation
  const gridCount = snapshot.gridPoints.length;
  const holdCount = snapshot.gridPoints.filter(
    (g) => g.state === "HOLD_INSUFFICIENT_SOURCE",
  ).length;
  const gridOk = gridCount === golden.expectedGridPanelCount && holdCount === golden.expectedGridHoldCount;
  const unresolvedFabricated = snapshot.gridPoints.some(
    (g) => g.state === "HOLD_INSUFFICIENT_SOURCE" && g.position !== undefined,
  );
  push({
    step: "geometry/grid-panels",
    status: gridOk ? "PASS" : "FAIL",
    detail: `count=${gridCount} hold=${holdCount}`,
    discrepancyClass: gridOk ? "PASS" : "FAIL_NUMERIC",
  });
  push({
    step: "geometry/hold-no-fabrication",
    status: unresolvedFabricated ? "FAIL" : "PASS",
    detail: unresolvedFabricated ? "HOLD position fabricated" : "no HOLD position fabricated",
    discrepancyClass: unresolvedFabricated ? "FAIL_UNRESOLVED" : "PASS",
  });

  // 3D payload + STL export
  const model = buildSnapshotVisualizationModel(snapshot);
  const solidCount = model.solidGeometryParameters.length;
  const solidsOk = solidCount > 0;
  push({
    step: "3d/solids",
    status: solidsOk ? "PASS" : "FAIL",
    detail: `solids=${solidCount}`,
    discrepancyClass: solidsOk ? "PASS" : "FAIL_ID",
  });
  let stlOk = false;
  let stlDigest = "";
  try {
    const stl = exportApolloBinaryStl(model, { includeBearings: true });
    stlOk = stl.triangleCount > 0;
    stlDigest = stl.digest;
  } catch {
    stlOk = false;
  }
  push({
    step: "export/stl",
    status: stlOk ? "PASS" : "FAIL",
    detail: stlOk ? `digest=${stlDigest}` : "STL export failed",
    discrepancyClass: stlOk ? "PASS" : "FAIL_ID",
  });

  // Deterministic fingerprint
  const fingerprint = computeFingerprint(snapshot);
  push({
    step: "geometry/fingerprint",
    status: "PASS",
    detail: `fingerprint=${fingerprint}`,
    discrepancyClass: "PASS",
  });

  const verdict: ReplayReport["verdict"] = entries.some((e) => e.status === "FAIL")
    ? "FAIL"
    : "PASS";
  return {
    bridgeId: snapshot.bridgeId,
    verdict,
    fingerprint,
    entries,
  };
}
