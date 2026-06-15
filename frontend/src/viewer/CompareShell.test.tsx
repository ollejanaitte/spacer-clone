// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultProject,
  createSuspendedDeckProject,
  describeBridgeVariant,
} from "../data/defaultProject";
import type { AnalysisResult, ProjectModel } from "../types";
import { CompareShell, type CompareSlotDescriptor } from "./CompareShell";
import type { CameraStateSnapshot, ThreeViewportHandle } from "./types";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => {
      throw new Error("mock WebGLRenderer failure for CompareShell tests");
    }),
  };
});

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

function makeSlots(): CompareSlotDescriptor[] {
  return [
    {
      id: "plan-a",
      label: "Plan A",
      caption: "Continuous",
      project: createDefaultProject(),
    },
    {
      id: "plan-b",
      label: "Plan B",
      caption: "Suspended",
      project: createSuspendedDeckProject(),
    },
  ];
}

const noop = () => undefined;

describe("CompareShell layout", () => {
  it("renders both Plan A and Plan B slots", () => {
    render(
      <CompareShell
        slots={makeSlots()}
        leftResult={null}
        rightResult={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC_DEAD"
        eigenModeNos={[]}
        selectedEigenMode={1}
        selectedResponseSpectrumResult="SRSS"
        spacerAxisSwap="off"
        animationOptions={{ enabled: false, modeNo: 1, scale: 1, speed: 1, useDemo: true, demoDirection: "longitudinal" }}
        onSelectionChange={noop}
        onActiveLoadCaseChange={noop}
        onSelectedEigenModeChange={noop}
        onSelectedResponseSpectrumResultChange={noop}
        onSpacerAxisSwapChange={noop}
        onAnimationOptionsChange={noop}
        onInitializationError={noop}
      />,
    );
    const left = document.querySelector("[data-testid=compare-slot-plan-a]");
    const right = document.querySelector("[data-testid=compare-slot-plan-b]");
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(document.querySelector("[data-testid=compare-shell]")?.getAttribute("data-camera-sync")).toBe("on");
  });

  it("renders the comparison summary for each variant", () => {
    render(
      <CompareShell
        slots={makeSlots()}
        leftResult={null}
        rightResult={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC_DEAD"
        eigenModeNos={[]}
        selectedEigenMode={1}
        selectedResponseSpectrumResult="SRSS"
        spacerAxisSwap="off"
        animationOptions={{ enabled: false, modeNo: 1, scale: 1, speed: 1, useDemo: true, demoDirection: "longitudinal" }}
        onSelectionChange={noop}
        onActiveLoadCaseChange={noop}
        onSelectedEigenModeChange={noop}
        onSelectedResponseSpectrumResultChange={noop}
        onSpacerAxisSwapChange={noop}
        onAnimationOptionsChange={noop}
        onInitializationError={noop}
      />,
    );
    const continuousSummary = document.querySelector("[data-testid=compare-summary-continuous]");
    const suspendedSummary = document.querySelector("[data-testid=compare-summary-suspended]");
    expect(continuousSummary).not.toBeNull();
    expect(suspendedSummary).not.toBeNull();
    expect(continuousSummary?.textContent).toContain("150 m");
    expect(suspendedSummary?.textContent).toContain("150 m");
  });

  it("shows eigen periods when an eigen result is provided", () => {
    const result = {
      projectId: "p",
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
          { modeNo: 1, eigenvalue: 1, circularFrequency: 1, frequency: 1, period: 0.42, modalMass: 1, participationFactors: [], effectiveMassRatios: [], shape: [] },
          { modeNo: 2, eigenvalue: 2, circularFrequency: 2, frequency: 2, period: 0.21, modalMass: 1, participationFactors: [], effectiveMassRatios: [], shape: [] },
        ],
      },
      warnings: [],
      errors: [],
    } satisfies AnalysisResult;
    render(
      <CompareShell
        slots={makeSlots()}
        leftResult={result}
        rightResult={result}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC_DEAD"
        eigenModeNos={[1, 2]}
        selectedEigenMode={1}
        selectedResponseSpectrumResult="SRSS"
        spacerAxisSwap="off"
        animationOptions={{ enabled: false, modeNo: 1, scale: 1, speed: 1, useDemo: true, demoDirection: "longitudinal" }}
        onSelectionChange={noop}
        onActiveLoadCaseChange={noop}
        onSelectedEigenModeChange={noop}
        onSelectedResponseSpectrumResultChange={noop}
        onSpacerAxisSwapChange={noop}
        onAnimationOptionsChange={noop}
        onInitializationError={noop}
      />,
    );
    const continuous = document.querySelector("[data-testid=compare-summary-continuous]")?.textContent ?? "";
    expect(continuous).toContain("0.420 s");
    expect(continuous).toContain("0.210 s");
  });
});

describe("describeBridgeVariant integration", () => {
  it("produces 4 piers, 2 rock and 2 soft, for the continuous variant", () => {
    const info = describeBridgeVariant(createDefaultProject());
    expect(info.pierCount).toBe(4);
    expect(info.rockPierCount).toBe(2);
    expect(info.softPierCount).toBe(2);
  });
  it("flags the suspended variant with one suspended junction", () => {
    const info = describeBridgeVariant(createSuspendedDeckProject());
    expect(info.suspendedJunctionCount).toBe(1);
  });
});

describe("ThreeViewportHandle surface", () => {
  it("exposes a camera snapshot shape compatible with state copies", () => {
    const sample: CameraStateSnapshot = {
      position: { x: 1, y: 2, z: 3 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1,
      fov: 45,
    };
    const copy: CameraStateSnapshot = JSON.parse(JSON.stringify(sample));
    expect(copy).toEqual(sample);
  });
});


describe("CompareShell: independent left/right results", () => {
  const noopAny = () => undefined;

  function makeEigenResult(periodA: number, periodB: number): [AnalysisResult, AnalysisResult] {
    const base = (period: number): AnalysisResult => ({
      projectId: "p",
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
          { modeNo: 1, eigenvalue: 1, circularFrequency: 1, frequency: 1, period, modalMass: 1, participationFactors: [], effectiveMassRatios: [], shape: [] },
        ],
      },
      warnings: [],
      errors: [],
    });
    return [base(periodA), base(periodB)];
  }

  it("renders the left period from leftResult and the right period from rightResult", () => {
    const [aResult, bResult] = makeEigenResult(0.05, 0.02);
    render(
      <CompareShell
        slots={makeSlots()}
        leftResult={aResult}
        rightResult={bResult}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC_DEAD"
        eigenModeNos={[1]}
        selectedEigenMode={1}
        selectedResponseSpectrumResult="SRSS"
        spacerAxisSwap="off"
        animationOptions={{ enabled: false, modeNo: 1, scale: 1, speed: 1, useDemo: true, demoDirection: "longitudinal" }}
        onSelectionChange={noopAny}
        onActiveLoadCaseChange={noopAny}
        onSelectedEigenModeChange={noopAny}
        onSelectedResponseSpectrumResultChange={noopAny}
        onSpacerAxisSwapChange={noopAny}
        onAnimationOptionsChange={noopAny}
        onInitializationError={noopAny}
      />,
    );
    const leftSummary = document.querySelector("[data-testid=compare-summary-continuous]")?.textContent ?? "";
    const rightSummary = document.querySelector("[data-testid=compare-summary-suspended]")?.textContent ?? "";
    expect(leftSummary).toContain("0.050 s");
    expect(rightSummary).toContain("0.020 s");
    expect(leftSummary).not.toContain("0.020 s");
    expect(rightSummary).not.toContain("0.050 s");
  });

  it("displays a dash for the right period when rightResult is null", () => {
    const [aResult] = makeEigenResult(0.05, 0.02);
    render(
      <CompareShell
        slots={makeSlots()}
        leftResult={aResult}
        rightResult={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC_DEAD"
        eigenModeNos={[1]}
        selectedEigenMode={1}
        selectedResponseSpectrumResult="SRSS"
        spacerAxisSwap="off"
        animationOptions={{ enabled: false, modeNo: 1, scale: 1, speed: 1, useDemo: true, demoDirection: "longitudinal" }}
        onSelectionChange={noopAny}
        onActiveLoadCaseChange={noopAny}
        onSelectedEigenModeChange={noopAny}
        onSelectedResponseSpectrumResultChange={noopAny}
        onSpacerAxisSwapChange={noopAny}
        onAnimationOptionsChange={noopAny}
        onInitializationError={noopAny}
      />,
    );
    const rightSummary = document.querySelector("[data-testid=compare-summary-suspended]")?.textContent ?? "";
    expect(rightSummary).toContain("-");
    expect(rightSummary).not.toContain("0.050 s");
  });

  it("renders a model-summary block that shows the per-plan node/member counts", () => {
    render(
      <CompareShell
        slots={makeSlots()}
        leftResult={null}
        rightResult={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC_DEAD"
        eigenModeNos={[]}
        selectedEigenMode={1}
        selectedResponseSpectrumResult="SRSS"
        spacerAxisSwap="off"
        animationOptions={{ enabled: false, modeNo: 1, scale: 1, speed: 1, useDemo: true, demoDirection: "longitudinal" }}
        onSelectionChange={noopAny}
        onActiveLoadCaseChange={noopAny}
        onSelectedEigenModeChange={noopAny}
        onSelectedResponseSpectrumResultChange={noopAny}
        onSpacerAxisSwapChange={noopAny}
        onAnimationOptionsChange={noopAny}
        onInitializationError={noopAny}
      />,
    );
    const summary = document.querySelector("[data-testid=comparison-model-summary]");
    expect(summary).not.toBeNull();
    const left = document.querySelector("[data-testid=comparison-model-summary-left]")?.textContent ?? "";
    const right = document.querySelector("[data-testid=comparison-model-summary-right]")?.textContent ?? "";
    // The suspended variant has more nodes and members than the continuous one.
    expect(left).toMatch(/Plan A/);
    expect(right).toMatch(/Plan B/);
    const leftCells = Array.from(document.querySelectorAll("[data-testid=comparison-model-summary-left] td")).map((td) => Number(td.textContent));
    const rightCells = Array.from(document.querySelectorAll("[data-testid=comparison-model-summary-right] td")).map((td) => Number(td.textContent));
    expect(leftCells.length).toBe(4);
    expect(rightCells.length).toBe(4);
    // suspended (Plan B) has more nodes and members than continuous (Plan A)
    expect(leftCells[0]).toBeLessThan(rightCells[0]);
    expect(leftCells[1]).toBeLessThan(rightCells[1]);
    // Plan A has no suspended junction; Plan B has exactly one
    expect(leftCells[2]).toBe(0);
    expect(rightCells[2]).toBe(1);
  });
});
