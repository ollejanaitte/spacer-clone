// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultProject, createSuspendedDeckProject } from "../data/defaultProject";
import type { AnalysisResult } from "../types";
import { ja } from "../i18n/ja";
import { ComparisonPanel } from "./ComparisonPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

function render(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function makeEigenResult(): AnalysisResult {
  return {
    projectId: "test",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "eigen",
      status: "success",
      startedAt: "2026-06-15T00:00:00Z",
      finishedAt: "2026-06-15T00:00:00Z",
      durationMs: 0,
      nodeCount: 1,
      memberCount: 0,
      loadCaseCount: 0,
      totalDof: 6,
      freeDof: 6,
      constrainedDof: 0,
      solver: "scipy_eigh",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    eigenResult: {
      massCaseId: "MASS_BRIDGE",
      normalization: "mass",
      modes: [
        {
          modeNo: 1,
          eigenvalue: 1,
          circularFrequency: 1,
          frequency: 1,
          period: 2.8,
          modalMass: 1,
          participationFactors: [],
          effectiveMassRatios: [],
          shape: [
            { nodeId: "G3", ux: 0.12, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
            { nodeId: "G4", ux: 0.04, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
          ],
        },
        {
          modeNo: 2,
          eigenvalue: 1,
          circularFrequency: 1,
          frequency: 1,
          period: 1.4,
          modalMass: 1,
          participationFactors: [],
          effectiveMassRatios: [],
          shape: [
            { nodeId: "G3", ux: 0, uy: 0, uz: 0.06, rx: 0, ry: 0, rz: 0 },
          ],
        },
      ],
    },
    warnings: [],
    errors: [],
  };
}

function makeReactionResult(): AnalysisResult {
  return {
    projectId: "test",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-06-15T00:00:00Z",
      finishedAt: "2026-06-15T00:00:00Z",
      durationMs: 0,
      nodeCount: 1,
      memberCount: 0,
      loadCaseCount: 1,
      totalDof: 6,
      freeDof: 1,
      constrainedDof: 5,
      solver: "scipy_sparse",
    },
    displacements: [],
    reactions: [
      { nodeId: "B1", fx: 0, fy: -6500, fz: 0, mx: 0, my: 0, mz: 0 , loadCaseId: "LC1", constrainedDofs: [] },
    ],
    memberEndForces: [],
    warnings: [],
    errors: [],
  };
}

describe("ComparisonPanel", () => {
  it("renders period rows for the A/B comparison", () => {
    render(
      <ComparisonPanel
        leftProject={createDefaultProject()}
        rightProject={createSuspendedDeckProject()}
        leftResult={makeEigenResult()}
        rightResult={null}
      />,
    );
    const panel = document.querySelector("[data-testid=comparison-panel]");
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain("比較サマリー");
    expect(panel?.textContent).toContain("1次周期");
    expect(panel?.textContent).toContain("2次周期");
    expect(panel?.textContent).toContain(ja.comparison.periodLabel(3));
  });

  it(`falls back to ${ja.comparison.notComputed} when reactions are missing`, () => {
    render(
      <ComparisonPanel
        leftProject={createDefaultProject()}
        rightProject={createSuspendedDeckProject()}
        leftResult={null}
        rightResult={null}
      />,
    );
    const row = document.querySelector("[data-testid=comparison-row-max-reaction]");
    expect(row?.textContent).toContain(ja.comparison.notComputed);
  });

  it("shows a positive reduction pill when right is smaller", () => {
    const rightResult = {
      ...makeEigenResult(),
      eigenResult: {
        ...makeEigenResult().eigenResult!,
        modes: makeEigenResult().eigenResult!.modes.map((mode) =>
          mode.modeNo === 1
            ? {
                ...mode,
                period: 1.45,
                shape: [{ nodeId: "G3", ux: 0.045, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }],
              }
            : mode,
        ),
      },
    };
    render(
      <ComparisonPanel
        leftProject={createDefaultProject()}
        rightProject={createSuspendedDeckProject()}
        leftResult={makeEigenResult()}
        rightResult={rightResult}
      />,
    );
    const reduction = document.querySelector(
      "[data-testid=comparison-reduction-horizontal-mode]",
    );
    expect(reduction?.getAttribute("data-direction")).toBe("positive");
    expect(reduction?.textContent).toMatch(new RegExp(ja.comparison.decrease("0").replace(/[0]+/g, "[0\\d.]+")));
  });

  it("shows a dash placeholder when no eigen result is available", () => {
    render(
      <ComparisonPanel
        leftProject={createDefaultProject()}
        rightProject={createSuspendedDeckProject()}
        leftResult={null}
        rightResult={null}
      />,
    );
    const period1 = document.querySelector(
      "[data-testid=comparison-row-period-1]",
    );
    expect(period1?.textContent).toContain("-");
  });

  it("renders the Japanese auto-comment", () => {
    render(
      <ComparisonPanel
        leftProject={createDefaultProject()}
        rightProject={createSuspendedDeckProject()}
        leftResult={makeEigenResult()}
        rightResult={{
          ...makeEigenResult(),
          eigenResult: {
            ...makeEigenResult().eigenResult!,
            modes: makeEigenResult().eigenResult!.modes.map((mode) =>
              mode.modeNo === 1
                ? { ...mode, period: 1.45 }
                : mode,
            ),
          },
        }}
      />,
    );
    const comment = document.querySelector("[data-testid=comparison-comment]");
    expect(comment?.textContent).toMatch(/B\u6848/);
  });

  it("uses the Y reaction component for the max-reaction row", () => {
    const rightResult = {
      ...makeReactionResult(),
      reactions: [
        { nodeId: "B1", fx: 0, fy: -2800, fz: 0, mx: 0, my: 0, mz: 0 , loadCaseId: "LC1", constrainedDofs: [] },
      ],
    };
    render(
      <ComparisonPanel
        leftProject={createDefaultProject()}
        rightProject={createSuspendedDeckProject()}
        leftResult={makeReactionResult()}
        rightResult={rightResult}
      />,
    );
    const row = document.querySelector("[data-testid=comparison-row-max-reaction]");
    expect(row?.textContent).toContain("6500 kN");
    expect(row?.textContent).toContain("2800 kN");
  });
});
