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
import type { HosoDefinitionDraft } from "../../../schema/types";
import { computeHosoResults } from "../computeHosoResults";
import { HOSO_ALGORITHM_VERSION } from "../types";
import { LINER_HOSO_DIAGNOSTIC_CODES } from "../diagnostics";

const FIXTURE_DIR = join(import.meta.dirname, "fixtures");

type DraftFixture = {
  offsets: number[];
  offsetLineIds: string[];
  profileElevation?: number;
  lineElevations?: number[];
};

type RowExpectation = {
  stationPhysicalDistance: number;
  lineId?: string;
  pavementThicknessM: number;
};

type O1Fixture = {
  draft: DraftFixture;
  definitions: HosoDefinitionDraft[];
  expected: RowExpectation | { diagnosticCode: string };
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
      elevation: draftFixture.lineElevations?.[index] ?? 0,
      role: "custom",
    })),
  });
  return syncActiveBundleToAlignments(draft);
}

function runDefinitions(
  draft: ReturnType<typeof createDefaultLinerDraft>,
  definitions: HosoDefinitionDraft[],
) {
  const intermediate = buildIntermediateResult(draft);
  return computeHosoResults({
    definitions: definitions.map((definition) => ({
      ...definition,
      alignmentId: draft.alignment.id,
    })),
    intermediate,
    sourceRevision: intermediate.sourceRevision,
    linerAlignments: draft.linerAlignments,
    activeAlignmentId: draft.activeAlignmentId ?? draft.alignment.id,
    crossSections: draft.crossSections,
    crossSlopeIntervals: draft.crossSlopeIntervals,
    fallbackAlignmentId: draft.alignment.id,
  });
}

describe("computeHosoResults O1 fixtures", () => {
  it("gc-hoso-auto-pipeline: auto_converge_pipeline direct rule", () => {
    const fixture = loadFixture<O1Fixture>("gc-hoso-auto-pipeline.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) => entry.stationPhysicalDistance === expected.stationPhysicalDistance,
    );
    expect(row?.pavementThicknessM).toBeCloseTo(expected.pavementThicknessM, 6);
    expect(row?.algorithmVersion).toBe(HOSO_ALGORITHM_VERSION);
  });

  it("gc-hoso-longitudinal-linear: linear t(s)", () => {
    const fixture = loadFixture<O1Fixture>("gc-hoso-longitudinal-linear.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) => entry.stationPhysicalDistance === expected.stationPhysicalDistance,
    );
    expect(row?.pavementThicknessM).toBeCloseTo(expected.pavementThicknessM, 6);
  });

  it("gc-hoso-longitudinal-both-gradients: both_gradients variant", () => {
    const fixture = loadFixture<O1Fixture>("gc-hoso-longitudinal-both-gradients.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) => entry.stationPhysicalDistance === expected.stationPhysicalDistance,
    );
    expect(row?.pavementThicknessM).toBeCloseTo(expected.pavementThicknessM, 6);
  });

  it("gc-hoso-transverse-linear: linear t(d)", () => {
    const fixture = loadFixture<O1Fixture>("gc-hoso-transverse-linear.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) =>
        entry.stationPhysicalDistance === expected.stationPhysicalDistance
        && entry.lineId === expected.lineId,
    );
    expect(row?.pavementThicknessM).toBeCloseTo(expected.pavementThicknessM, 6);
  });

  it("gc-hoso-two-point-chord: chord interpolation", () => {
    const fixture = loadFixture<O1Fixture>("gc-hoso-two-point-chord.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) => entry.stationPhysicalDistance === expected.stationPhysicalDistance,
    );
    expect(row?.pavementThicknessM).toBeCloseTo(expected.pavementThicknessM, 6);
  });

  it("gc-hoso-three-point-plane: affine plane", () => {
    const fixture = loadFixture<O1Fixture>("gc-hoso-three-point-plane.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const expected = fixture.expected as RowExpectation;
    const row = output.rows.find(
      (entry) =>
        entry.stationPhysicalDistance === expected.stationPhysicalDistance
        && entry.lineId === expected.lineId,
    );
    expect(row?.pavementThicknessM).toBeCloseTo(expected.pavementThicknessM, 6);
  });

  it("gc-hoso-negative-thickness: fail-closed negative rejection", () => {
    const fixture = loadFixture<O1Fixture>("gc-hoso-negative-thickness.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    const expected = fixture.expected as { diagnosticCode: string };
    expect(
      output.diagnostics.some((entry) => entry.code === expected.diagnosticCode),
    ).toBe(true);
  });
});

describe("computeHosoResults algorithm version", () => {
  it("tags every row with hoso-0.1.0", () => {
    const fixture = loadFixture<O1Fixture>("gc-hoso-longitudinal-linear.json");
    const draft = buildDraftFromFixture(fixture.draft);
    const output = runDefinitions(draft, fixture.definitions);
    expect(output.rows.length).toBeGreaterThan(0);
    for (const row of output.rows) {
      expect(row.algorithmVersion).toBe(HOSO_ALGORITHM_VERSION);
    }
  });
});

describe("computeHosoResults unsupported variant", () => {
  it("rejects unknown variant at validation", () => {
    const draft = buildDraftFromFixture({
      offsets: [-5],
      offsetLineIds: ["OL-girder"],
    });
    const output = runDefinitions(draft, [
      {
        id: "hoso-unsupported",
        alignmentId: draft.alignment.id,
        family: "auto",
        variant: "auto_converge_pipeline",
        stationRange: { fromM: 0, toM: 100 },
        jipType: 99,
      } as HosoDefinitionDraft,
    ]);
    expect(output.rows).toHaveLength(0);
    expect(
      output.diagnostics.some(
        (entry) => entry.code === LINER_HOSO_DIAGNOSTIC_CODES.unsupportedType,
      ),
    ).toBe(true);
  });
});
