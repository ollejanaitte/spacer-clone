import { describe, expect, it } from "vitest";
import { compareSemanticParity } from "../compare";
import { normalizeProjectModelForSemanticParity } from "../normalize";
import { compareLoadParity } from "../loadParity";
import { matchNormalizedMembers } from "../memberMatching";
import { matchNormalizedNodes } from "../nodeMatching";
import { DEFAULT_SEMANTIC_TOLERANCE } from "../tolerance";
import {
  duplicateLoadCaseSemanticKeyFixture,
  duplicateSemanticCandidateFixture,
  equivalentLoadCasesDifferentIds,
  explicitZeroVsAbsentFixture,
  loadsVsAbsentFixture,
  memberLoadMismatchByCoordinateSystemFixture,
  memberLoadMismatchByMemberFixture,
  missingLoadCaseFixture,
  nearEqualLoadToleranceFixture,
  nodalLoadMismatchByNodeFixture,
  nodalLoadMismatchByVectorFixture,
  reorderedLoadArrays,
  selfWeightAsNodalLoadsFixture,
} from "./fixtures/loadParityFixtures";
import { project, baseMembers, baseNodes } from "./fixtures/semanticParityFixtures";

describe("load parity", () => {
  it("treats equivalent load cases with different ids and array orders as equivalent", () => {
    const left = normalizeProjectModelForSemanticParity(equivalentLoadCasesDifferentIds.left);
    const right = normalizeProjectModelForSemanticParity({
      ...equivalentLoadCasesDifferentIds.right,
      loadCases: [...equivalentLoadCasesDifferentIds.right.loadCases].reverse(),
      nodalLoads: [...equivalentLoadCasesDifferentIds.right.nodalLoads].reverse(),
      memberLoads: [...equivalentLoadCasesDifferentIds.right.memberLoads].reverse(),
    });
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const memberMatches = matchNormalizedMembers(left.members, right.members, nodeMatches.matched);
    const result = compareLoadParity(left, right, nodeMatches.matched, memberMatches.matched, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.matchedLoadCaseCount).toBe(1);
    expect(result.summary.matchedNodalLoadCount).toBe(1);
    expect(result.summary.matchedMemberLoadCount).toBe(1);
    expect(result.mismatches).toHaveLength(0);
  });

  it("reports nodal load mismatch by target node", () => {
    const fixture = nodalLoadMismatchByNodeFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.status).toBe("different");
    expect(report.metrics.load.unmatchedLeftNodalLoadCount).toBeGreaterThan(0);
    expect(report.metrics.load.unmatchedRightNodalLoadCount).toBeGreaterThan(0);
    expect(report.mismatches.some((mismatch) => mismatch.category === "load")).toBe(true);
  });

  it("reports nodal load mismatch by vector component", () => {
    const fixture = nodalLoadMismatchByVectorFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.status).toBe("different");
    expect(report.metrics.load.nodalLoadValueMismatchCount).toBe(1);
  });

  it("reports member load mismatch by target member", () => {
    const fixture = memberLoadMismatchByMemberFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.status).toBe("different");
    expect(report.metrics.load.unmatchedLeftMemberLoadCount).toBeGreaterThan(0);
    expect(report.metrics.load.unmatchedRightMemberLoadCount).toBeGreaterThan(0);
  });

  it("reports member load mismatch by coordinateSystem", () => {
    const fixture = memberLoadMismatchByCoordinateSystemFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.status).toBe("different");
    expect(report.metrics.load.unmatchedLeftMemberLoadCount).toBeGreaterThan(0);
    expect(report.metrics.load.unmatchedRightMemberLoadCount).toBeGreaterThan(0);
  });

  it("reports load case mismatch and missing case", () => {
    const fixture = missingLoadCaseFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.status).toBe("different");
    expect(report.metrics.load.matchedLoadCaseCount).toBe(0);
    expect(report.metrics.load.unmatchedLeftLoadCaseCount).toBe(1);
    expect(report.metrics.load.unmatchedRightLoadCaseCount).toBe(1);
    expect(report.metrics.load.ambiguousLoadCandidateCount).toBe(0);
    expect(report.mismatches.some((mismatch) => (
      mismatch.category === "load"
      && mismatch.message.includes("Left load case has no right counterpart")
    ))).toBe(true);
    expect(report.mismatches.some((mismatch) => (
      mismatch.category === "load"
      && mismatch.message.includes("Right load case has no left counterpart")
    ))).toBe(true);
  });

  it("marks duplicate load case semantic keys as indeterminate", () => {
    const fixture = duplicateLoadCaseSemanticKeyFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.status).toBe("indeterminate");
    expect(report.metrics.load.matchedLoadCaseCount).toBe(0);
    expect(report.metrics.load.ambiguousLoadCandidateCount).toBe(2);
    expect(report.ambiguities.some((ambiguity) => (
      ambiguity.category === "load"
      && ambiguity.message.includes("Duplicate semantic load case candidates")
    ))).toBe(true);
  });

  it("distinguishes explicit zero load item from absent load item", () => {
    const fixture = explicitZeroVsAbsentFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.status).toBe("different");
    expect(report.metrics.load.unmatchedLeftNodalLoadCount).toBe(1);
    expect(report.metrics.load.unmatchedRightNodalLoadCount).toBe(0);
  });

  it("marks duplicate semantic candidates as indeterminate", () => {
    const fixture = duplicateSemanticCandidateFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.status).toBe("indeterminate");
    expect(report.metrics.load.ambiguousLoadCandidateCount).toBeGreaterThan(0);
    expect(report.ambiguities.some((ambiguity) => ambiguity.category === "load")).toBe(true);
  });

  it("is order independent for load arrays", () => {
    const leftReport = compareSemanticParity(reorderedLoadArrays.left, reorderedLoadArrays.right);
    const rightShuffled = {
      ...reorderedLoadArrays.right,
      loadCases: [...reorderedLoadArrays.right.loadCases].reverse(),
      nodalLoads: [...reorderedLoadArrays.right.nodalLoads].reverse(),
      memberLoads: [...reorderedLoadArrays.right.memberLoads].reverse(),
    };
    const shuffledReport = compareSemanticParity(reorderedLoadArrays.left, rightShuffled);

    expect(leftReport.summary.loadEquivalent).toBe(true);
    expect(shuffledReport.summary.loadEquivalent).toBe(true);
    expect(leftReport.metrics.load).toEqual(shuffledReport.metrics.load);
  });

  it("accepts near-equal load values within tolerance", () => {
    const fixture = nearEqualLoadToleranceFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.metrics.load.matchedNodalLoadCount).toBe(1);
    expect(report.metrics.load.nodalLoadValueMismatchCount).toBe(0);
    expect(report.metrics.load.totalAppliedLoadEquivalent).toBe(true);
  });

  it("compares generated self-weight nodal loads as normal load items", () => {
    const fixture = selfWeightAsNodalLoadsFixture();
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.metrics.load.matchedLoadCaseCount).toBe(1);
    expect(report.metrics.load.matchedNodalLoadCount).toBe(3);
    expect(report.metrics.load.totalAppliedLoadEquivalent).toBe(true);
    expect(report.summary.loadEquivalent).toBe(true);
  });

  it("keeps support fixity parity passing alongside load comparison", () => {
    const fixture = equivalentLoadCasesDifferentIds;
    const report = compareSemanticParity(fixture.left, fixture.right);

    expect(report.summary.supportEquivalent).toBe(true);
    expect(report.summary.loadEquivalent).toBe(true);
    expect(report.status).toBe("equivalent");
  });

  it("does not treat absent loads as equivalent to present loads (LINER-style)", () => {
    const fixture = loadsVsAbsentFixture();
    const report = compareSemanticParity(fixture.left, fixture.right, {
      leftLoadsMapped: true,
      rightLoadsMapped: false,
    });

    expect(report.summary.loadEquivalent).toBe(false);
    expect(report.status).toBe("different");
    expect(report.warnings.some((warning) => warning.code === "SEMANTIC_LOAD_PARITY_SKIPPED_RIGHT")).toBe(true);
  });

  it("compares models with only explicit zero nodal loads as equivalent", () => {
    const zeroLoad = {
      id: "nl-zero",
      loadCaseId: "lc-1",
      nodeId: "n-b",
      fx: 0,
      fy: 0,
      fz: 0,
      mx: 0,
      my: 0,
      mz: 0,
    };
    const left = project(baseNodes, baseMembers, {
      supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      loadCases: [{ id: "lc-1", name: "Zero", type: "static" }],
      nodalLoads: [zeroLoad],
      memberLoads: [],
    });
    const right = project(baseNodes, baseMembers, {
      supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      loadCases: [{ id: "lc-2", name: "Zero", type: "static" }],
      nodalLoads: [{ ...zeroLoad, id: "nl-other", loadCaseId: "lc-2" }],
      memberLoads: [],
    });
    const report = compareSemanticParity(left, right);

    expect(report.summary.loadEquivalent).toBe(true);
    expect(report.metrics.load.matchedNodalLoadCount).toBe(1);
  });
});
