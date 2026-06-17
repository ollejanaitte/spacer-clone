// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalysisResult } from "../types";
import { createDefaultProject } from "../data/defaultProject";
import { ja } from "../i18n/ja";
import { ResultsPanel } from "./ResultsPanel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

describe("ResultsPanel influence series selection", () => {
  it("shows all series initially and toggles individual targets", () => {
    const targetIds = [
      "reaction-1",
      "moment-1",
      "disp-1",
      "moment-2",
      "reaction-2",
      "disp-2",
      "torsion-1",
    ];
    renderPanel(influenceResult(targetIds));

    expect(checkedSeries()).toEqual(targetIds);
    expect(visibleSeries()).toEqual(targetIds);

    click(seriesCheckbox("moment-1"));

    expect(checkedSeries()).toEqual(targetIds.filter((id) => id !== "moment-1"));
    expect(visibleSeries()).toEqual(targetIds.filter((id) => id !== "moment-1"));

    click(seriesCheckbox("moment-1"));

    expect(checkedSeries()).toEqual(targetIds);
    expect(visibleSeries()).toEqual(targetIds);
  });

  it("clears and selects all series", () => {
    renderPanel(influenceResult(["reaction-1", "moment-1"]));

    click(button(ja.resultsPanel.tables.influenceClearAll));

    expect(checkedSeries()).toEqual([]);
    expect(visibleSeries()).toEqual([]);
    expect(document.body.textContent).toContain(ja.resultsPanel.tables.influenceNoSeriesSelected);

    click(button(ja.resultsPanel.tables.influenceSelectAll));

    expect(checkedSeries()).toEqual(["reaction-1", "moment-1"]);
    expect(visibleSeries()).toEqual(["reaction-1", "moment-1"]);
  });

  it("resets to all selected when the result series changes", () => {
    renderPanel(influenceResult(["reaction-1", "moment-1"]));
    click(seriesCheckbox("moment-1"));
    expect(checkedSeries()).toEqual(["reaction-1"]);

    renderPanel(influenceResult(["reaction-1", "disp-1", "torsion-1"]));

    expect(checkedSeries()).toEqual(["reaction-1", "disp-1", "torsion-1"]);
    expect(visibleSeries()).toEqual(["reaction-1", "disp-1", "torsion-1"]);
  });
});

function renderPanel(result: AnalysisResult) {
  render(
    <ResultsPanel
      activeTab="results"
      project={createDefaultProject()}
      result={result}
      errors={[]}
      warnings={[]}
      activeLoadCase=""
      selectedEigenMode={1}
      selectedResponseSpectrumResult="SRSS"
      selectedNode={null}
      selectedMember={null}
      logs={[]}
      onTabChange={() => undefined}
      onProjectChange={() => undefined}
      onSelectedEigenModeChange={() => undefined}
      onSelectedResponseSpectrumResultChange={() => undefined}
    />,
  );
}

function render(node: ReactNode) {
  if (!root) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  act(() => {
    root?.render(node);
  });
}

function click(element: HTMLElement) {
  act(() => {
    element.click();
  });
}

function button(label: string): HTMLButtonElement {
  const element = [...document.querySelectorAll("button")].find(
    (item) => item.textContent === label,
  );
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return element;
}

function seriesCheckbox(targetId: string): HTMLInputElement {
  const element = document.querySelector(
    `input[type="checkbox"][data-target-id="${targetId}"]`,
  );
  if (!(element instanceof HTMLInputElement)) throw new Error(`Checkbox not found: ${targetId}`);
  return element;
}

function checkedSeries(): string[] {
  return [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map(
    (item) => item.dataset.targetId ?? "",
  );
}

function visibleSeries(): string[] {
  return [...document.querySelectorAll<SVGPolylineElement>("polyline[data-target-id]")].map(
    (item) => item.dataset.targetId ?? "",
  );
}

function influenceResult(targetIds: string[]): AnalysisResult {
  const targets = targetIds.map((id, index) => ({
    id,
    type: id.startsWith("reaction")
      ? ("reaction" as const)
      : id.startsWith("disp")
        ? ("displacement" as const)
        : ("memberEndForce" as const),
    nodeId: id.startsWith("reaction") || id.startsWith("disp") ? `N${index + 1}` : undefined,
    memberId: id.startsWith("reaction") || id.startsWith("disp") ? undefined : `M${index + 1}`,
    component: id.startsWith("disp") ? "uy" : id.startsWith("reaction") ? "fy" : "Mz",
    end: id.startsWith("reaction") || id.startsWith("disp") ? undefined : ("i" as const),
  }));

  return {
    projectId: "p1",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "influence_line",
      status: "success",
      startedAt: "2026-06-07T00:00:00Z",
      finishedAt: "2026-06-07T00:00:00Z",
      durationMs: 0,
      nodeCount: 3,
      memberCount: 3,
      loadCaseCount: 1,
      totalDof: 18,
      freeDof: 12,
      constrainedDof: 6,
      solver: "scipy_sparse",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    influenceResult: {
      caseId: "inf-1",
      line: {
        id: "line-1",
        memberId: "M1",
        stationCount: 2,
        loadDirection: { x: 0, y: -1, z: 0 },
        loadMagnitude: 1,
      },
      stations: [
        { station: 0, ratio: 0, position: { x: 0, y: 0, z: 0 }, stationIndex: 0 },
        { station: 1, ratio: 1, position: { x: 1, y: 0, z: 0 }, stationIndex: 1 },
      ],
      targets,
      targetResults: targetIds.map((targetId, index) => ({
        targetId,
        values: [0, index + 1],
      })),
    },
    warnings: [],
    errors: [],
  };
}
