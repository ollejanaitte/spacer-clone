import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  syncActiveBundleToAlignments,
  updateLinerCrossSectionTemplate,
} from "../../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../pipeline/pipeline";
import type { HaunchDefinitionDraft } from "../../../schema/types";
import { computeHaunchResults } from "../computeHaunchResults";
import { HAUNCH_ALGORITHM_VERSION } from "../types";
import { LINER_HAUNCH_DIAGNOSTIC_CODES } from "../diagnostics";

const FIXTURE_DIR = join(import.meta.dirname, "fixtures");
const TOLERANCE = 1e-6;

type DraftFixture = {
  offsets: number[];
  offsetLineIds: string[];
  profileElevation?: number;
};

type RowExpectation = {
  stationPhysicalDistance: number;
  lineId?: string;
  haunchTopElevationM: number;
  haunchThicknessM: number;
};

type O1Fixture = {
  draft: DraftFixture;
  definitions: HaunchDefinitionDraft[];
  expected: RowExpectation | {
    includedStations?: number[];
    excludedStations?: number[];
    diagnosticCode?: string;
  };
};

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8")) as T;
}

function buildDraftFromFixture(draftFixture: DraftFixture) {
  let draft = addLinerOffset(createDefaultLinerDraft());
  const profileElevation = draftFixture.profileElevation ?? 0;
  draft = {
    ...draft,
    z: profileElevation,
    verticalAlignment: {
      ...draft.verticalAlignment!,
      elements: draft.verticalAlignment!.elements.map((element) =>
        element.type === "grade"
          ? { ...element, startElevation: profileElevation, grade: 0 }
          : element,
      ),
    },
  };
  const template = draft.crossSections?.[0];
  draft = updateLinerCrossSectionTemplate(draft, {
    id: template?.id ?? `CS-${draft.alignment.id}`,
    name: template?.name ?? "Test",
    offsetLines: draftFixture.offsets.map((offset, index) => ({
      id: draftFixture.offsetLineIds[index]!,
      offset,
      elevation: 0,
      role: "custom",
    })),
  });
  return syncActiveBundleToAlignments(draft);
}

function runDefinitions(
  draft: ReturnType<typeof createDefaultLinerDraft>,
  definitions: HaunchDefinitionDraft[],
) {
  const intermediate = buildIntermediateResult(draft);
  return computeHaunchResults({
    definitions: definitions.map((definition) => ({
      ...definition,
      alignmentId: draft.alignment.id,
    })),
    intermediate,
    sourceRevision: intermediate.sourceRevision,
    linerAlignments: draft.linerAlignments,
    activeAlignmentId: draft.activeAlignmentId ?? draft.alignment.id,
    crossSections: draft.crossSections,
    fallbackAlignmentId: draft.alignment.id,
  });
}

describe("computeHaunchResults O1 fixtures", () => {
  it("gc-haunch-two-point-linear: Type 1 linear z(s)", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-two-point-linear.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) => entry.stationPhysicalDistance === expected.stationPhysicalDistance,
    );
    expect(row).toBeDefined();
    expect(row?.haunchTopElevationM).toBeCloseTo(expected.haunchTopElevationM, 6);
    expect(row?.haunchThicknessM).toBeCloseTo(expected.haunchThicknessM, 6);
    expect(row?.algorithmVersion).toBe(HAUNCH_ALGORITHM_VERSION);
  });

  it("gc-haunch-two-point-gradient: Type 2 one point + gradient", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-two-point-gradient.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) => entry.stationPhysicalDistance === expected.stationPhysicalDistance,
    );
    expect(row?.haunchTopElevationM).toBeCloseTo(expected.haunchTopElevationM, 6);
    expect(row?.haunchThicknessM).toBeCloseTo(expected.haunchThicknessM, 6);
  });

  it("gc-haunch-three-point-plane: Type 6 affine plane", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-three-point-plane.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) =>
        entry.stationPhysicalDistance === expected.stationPhysicalDistance
        && entry.lineId === expected.lineId,
    );
    expect(row?.haunchTopElevationM).toBeCloseTo(expected.haunchTopElevationM, 6);
    expect(row?.haunchThicknessM).toBeCloseTo(expected.haunchThicknessM, 6);
  });

  it("gc-haunch-three-point-parabola: Type 9 parabola along girder", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-three-point-parabola.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) => entry.stationPhysicalDistance === expected.stationPhysicalDistance,
    );
    expect(row?.haunchTopElevationM).toBeCloseTo(expected.haunchTopElevationM, 6);
    expect(row?.haunchThicknessM).toBeCloseTo(expected.haunchThicknessM, 6);
  });

  it("gc-haunch-plane-gradients: Type 7 one point + two gradients", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-plane-gradients.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) =>
        entry.stationPhysicalDistance === expected.stationPhysicalDistance
        && entry.lineId === expected.lineId,
    );
    expect(row?.haunchTopElevationM).toBeCloseTo(expected.haunchTopElevationM, 6);
    expect(row?.haunchThicknessM).toBeCloseTo(expected.haunchThicknessM, 6);
  });

  it("gc-haunch-range-filter: Type 8 scope limits inner two-point rows", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-range-filter.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as {
      includedStations: number[];
      excludedStations: number[];
    };
    const stations = new Set(output.rows.map((row) => row.stationPhysicalDistance));
    for (const station of expected.includedStations) {
      expect(stations.has(station)).toBe(true);
    }
    for (const station of expected.excludedStations) {
      expect(stations.has(station)).toBe(false);
    }
  });

  it("gc-haunch-degenerate-collinear: fail-closed degenerate geometry", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-degenerate-collinear.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    const expected = fixture.expected as { diagnosticCode: string };
    expect(output.rows).toHaveLength(0);
    expect(
      output.diagnostics.some((entry) => entry.code === expected.diagnosticCode),
    ).toBe(true);
  });

  it("gc-haunch-unsupported-type-12: fail-closed liner height required", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-unsupported-type-12.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    const expected = fixture.expected as { diagnosticCode: string };
    expect(output.rows).toHaveLength(0);
    expect(
      output.diagnostics.some((entry) => entry.code === expected.diagnosticCode),
    ).toBe(true);
  });
});

describe("computeHaunchResults algorithm version", () => {
  it("tags every row with haunch-0.1.0", () => {
    const fixture = loadFixture<O1Fixture>("gc-haunch-two-point-linear.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.rows.length).toBeGreaterThan(0);
    for (const row of output.rows) {
      expect(row.algorithmVersion).toBe(HAUNCH_ALGORITHM_VERSION);
    }
  });
});

describe("computeHaunchResults unsupported plane variant", () => {
  it("rejects two_points_normal_gradient at validation", () => {
    const draft = buildDraftFromFixture({
      offsets: [-5, 5],
      offsetLineIds: ["OL-left", "OL-right"],
    });
    const output = runDefinitions(draft, [
      {
        id: "haunch-type-14",
        alignmentId: draft.alignment.id,
        family: "plane",
        variant: "two_points_normal_gradient",
        stationRange: { fromM: 0, toM: 100 },
        anchors: [
          {
            id: "a1",
            stationPhysicalDistanceM: 0,
            mode: "elevation",
            valueM: 10,
            lineId: "OL-left",
          },
          {
            id: "a2",
            stationPhysicalDistanceM: 100,
            mode: "elevation",
            valueM: 20,
            lineId: "OL-right",
          },
        ],
        normalGradient: 0.01,
      },
    ]);
    expect(output.rows).toHaveLength(0);
    expect(
      output.diagnostics.some(
        (entry) => entry.code === LINER_HAUNCH_DIAGNOSTIC_CODES.unsupportedType,
      ),
    ).toBe(true);
  });
});
