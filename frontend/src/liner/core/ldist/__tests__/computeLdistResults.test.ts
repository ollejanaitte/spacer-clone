import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  syncActiveBundleToAlignments,
  updateLinerCrossSectionTemplate,
  updateLinerPiers,
} from "../../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../pipeline/pipeline";
import { distancePointToPierLine } from "../../bridge/pierLineGeometry";
import { evaluateAlignmentAtDistance } from "../../geometry/horizontal";
import { offsetPoint } from "../../vector";
import { computeLdistResults } from "../computeLdistResults";
import { LDIST_ALGORITHM_VERSION } from "../types";
import type { LdistJobDraft } from "../../../schema/types";

const FIXTURE_DIR = join(import.meta.dirname, "fixtures");
const TOLERANCE = 1e-6;

type StraightFixture = {
  draft: {
    offsets: number[];
    offsetLineIds: string[];
    stationPhysicalDistance: number;
  };
  job: LdistJobDraft;
  expected: { distanceM: number; signConvention: string };
};

type SkewFixture = {
  draft: {
    offsets: number[];
    offsetLineIds: string[];
    pier: { id: string; physicalDistance: number; skewAngleRad: number };
    stationPhysicalDistance: number;
  };
  job: LdistJobDraft;
};

type DegenerateFixture = {
  job: LdistJobDraft;
  expected: { diagnosticCode: string };
};

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8")) as T;
}

function buildTwoLineDraft(offsets: number[], lineIds: string[]) {
  let draft = addLinerOffset(createDefaultLinerDraft());
  const template = draft.crossSections?.[0];
  draft = updateLinerCrossSectionTemplate(draft, {
    id: template?.id ?? `CS-${draft.alignment.id}`,
    name: template?.name ?? "Test",
    offsetLines: offsets.map((offset, index) => ({
      id: lineIds[index]!,
      offset,
      elevation: 0,
      role: "custom",
    })),
  });
  return syncActiveBundleToAlignments(draft);
}

function runJob(draft: ReturnType<typeof createDefaultLinerDraft>, job: LdistJobDraft) {
  const intermediate = buildIntermediateResult(draft);
  return computeLdistResults({
    jobs: [{ ...job, alignmentId: draft.alignment.id }],
    intermediate,
    sourceRevision: intermediate.sourceRevision,
    linerAlignments: draft.linerAlignments,
    activeAlignmentId: draft.activeAlignmentId ?? draft.alignment.id,
    crossSections: draft.crossSections,
    fallbackAlignmentId: draft.alignment.id,
  });
}

describe("computeLdistResults O1 fixtures", () => {
  it("gc-ldist-straight-orthogonal: Mode A pair distance", () => {
    const fixture = loadFixture<StraightFixture>("gc-ldist-straight-orthogonal.json");
    const draft = buildTwoLineDraft(fixture.draft.offsets, fixture.draft.offsetLineIds);
    const output = runJob(draft, fixture.job);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const rowAtOrigin = output.rows.find((row) => row.stationPhysicalDistance === 0);
    expect(rowAtOrigin).toBeDefined();
    expect(rowAtOrigin?.distanceM).toBeCloseTo(fixture.expected.distanceM, 6);
    expect(rowAtOrigin?.signConvention).toBe(fixture.expected.signConvention);
    expect(rowAtOrigin?.algorithmVersion).toBe(LDIST_ALGORITHM_VERSION);
  });

  it("gc-ldist-mode-b-sine: Mode B distance with sin(theta_ref)=1 on straight alignment", () => {
    const fixture = loadFixture<StraightFixture>("gc-ldist-mode-b-sine.json");
    const draft = buildTwoLineDraft(fixture.draft.offsets, fixture.draft.offsetLineIds);
    const output = runJob(draft, fixture.job);
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const rowAtOrigin = output.rows.find((row) => row.stationPhysicalDistance === 0);
    expect(rowAtOrigin?.distanceM).toBeCloseTo(fixture.expected.distanceM, 6);
    expect(rowAtOrigin?.signConvention).toBe(fixture.expected.signConvention);
  });

  it("gc-ldist-skew-pier: overhang at skewed pier", () => {
    const fixture = loadFixture<SkewFixture>("gc-ldist-skew-pier.json");
    let draft = buildTwoLineDraft(fixture.draft.offsets, fixture.draft.offsetLineIds);
    draft = updateLinerPiers(draft, [
      {
        id: fixture.draft.pier.id,
        physicalDistance: fixture.draft.pier.physicalDistance,
        kind: "pier",
        skewAngleRad: fixture.draft.pier.skewAngleRad,
      },
    ]);
    const intermediate = buildIntermediateResult(draft);
    const evaluation = evaluateAlignmentAtDistance(
      draft.alignment,
      fixture.draft.pier.physicalDistance,
      fixture.draft.pier.physicalDistance,
    );
    const leftPoint = offsetPoint(evaluation.point, evaluation.azimuth, fixture.draft.offsets[0]!);
    const rightPoint = offsetPoint(evaluation.point, evaluation.azimuth, fixture.draft.offsets[1]!);
    const expectedLeft = distancePointToPierLine(
      leftPoint,
      evaluation.point,
      evaluation.azimuth,
      fixture.draft.pier.skewAngleRad,
    );
    const expectedRight = distancePointToPierLine(
      rightPoint,
      evaluation.point,
      evaluation.azimuth,
      fixture.draft.pier.skewAngleRad,
    );

    const output = computeLdistResults({
      jobs: [{ ...fixture.job, alignmentId: draft.alignment.id }],
      intermediate,
      sourceRevision: intermediate.sourceRevision,
      linerAlignments: draft.linerAlignments,
      activeAlignmentId: draft.activeAlignmentId ?? draft.alignment.id,
      crossSections: draft.crossSections,
      fallbackAlignmentId: draft.alignment.id,
    });
    expect(output.diagnostics.filter((entry) => entry.level === "error")).toHaveLength(0);
    const leftRow = output.rows.find((row) => row.side === "left");
    const rightRow = output.rows.find((row) => row.side === "right");
    expect(leftRow?.overhangM).toBeCloseTo(expectedLeft, 6);
    expect(rightRow?.overhangM).toBeCloseTo(expectedRight, 6);
    expect(leftRow?.pierId).toBe(fixture.draft.pier.id);
  });

  it("gc-ldist-degenerate-sin-zero: coincident pair emits degenerate diagnostic", () => {
    const fixture = loadFixture<DegenerateFixture>("gc-ldist-degenerate-sin-zero.json");
    const draft = buildTwoLineDraft([-2, 2], ["OL-left", "OL-right"]);
    const degenerateJob: LdistJobDraft = {
      ...fixture.job,
      alignmentId: draft.alignment.id,
      stationScope: "all_generated",
      pairs: [{ fromLineId: "OL-left", toLineId: "OL-left" }],
    };
    const output = runJob(draft, degenerateJob);
    expect(output.rows).toHaveLength(0);
    expect(
      output.diagnostics.some((entry) => entry.code === fixture.expected.diagnosticCode),
    ).toBe(true);
  });
});

describe("computeLdistResults algorithmVersion", () => {
  it("stamps ldist-0.1.0 on every row", () => {
    const fixture = loadFixture<StraightFixture>("gc-ldist-straight-orthogonal.json");
    const draft = buildTwoLineDraft(fixture.draft.offsets, fixture.draft.offsetLineIds);
    const output = runJob(draft, fixture.job);
    for (const row of output.rows) {
      expect(row.algorithmVersion).toBe(LDIST_ALGORITHM_VERSION);
      expect(row.sourceRevision.length).toBeGreaterThan(0);
    }
  });
});
