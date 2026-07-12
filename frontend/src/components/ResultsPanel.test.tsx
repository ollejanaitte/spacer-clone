// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisResult } from "../types";
import { createDefaultProject } from "../data/defaultProject";
import { ja } from "../i18n/ja";
import type { ProjectModel } from "../types";
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

describe("ResultsPanel semantic parity integration", () => {
  it("renders the semantic parity section in the results tab", () => {
    renderParityPanel();

    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.heading);
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.noReport);
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.leftSourcePlaceholder);
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.rightSourcePlaceholder);
  });

  it("compares the current project with a local JSON file and serializes deterministically", async () => {
    const project = parityProject();
    renderParityPanel(project);

    await chooseRightFile(project, "right-project.json");
    click(button(ja.resultsPanel.semanticParity.compare));

    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.status.equivalent);
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.summary.matchedNodes);
    expect(reportJson()).toContain('"schemaVersion": "1.0.0"');

    const firstJson = reportJson();

    click(button(ja.resultsPanel.semanticParity.compare));

    expect(reportJson()).toBe(firstJson);
  });

  it("renders different state", async () => {
    const project = parityProject();
    renderParityPanel(project);

    await chooseRightFile(mutatedProject(project), "different.json");
    click(button(ja.resultsPanel.semanticParity.compare));
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.status.different);
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.summary.mismatchCount);
  });

  it("renders indeterminate state", async () => {
    const project = parityProject();
    renderParityPanel(project);

    await chooseRightFile(indeterminateRightModel(project), "indeterminate.json");
    click(button(ja.resultsPanel.semanticParity.compare));
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.status.indeterminate);
  });

  it("renders invalid and malformed JSON states", async () => {
    renderParityPanel(parityProject());

    await chooseRightFile({ schemaVersion: 1 } as ProjectModel, "invalid-model.json");
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.validation.invalidModel);

    await chooseRightFileText("{ not json", "malformed.json");
    expect(document.body.textContent).toContain("position");
  });

  it("supports copy, download, stale state, and clear/reset", async () => {
    const project = parityProject();
    renderParityPanel(project);

    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        element.click = clickSpy;
      }
      return element;
    });

    await chooseRightFile(project, "right-project.json");
    click(button(ja.resultsPanel.semanticParity.compare));

    click(button(ja.resultsPanel.semanticParity.copy));
    click(button(ja.resultsPanel.semanticParity.download));

    expect(clipboardWriteText).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();

    await chooseRightFile(mutatedProject(project), "different.json");
    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.stale);

    click(button(ja.resultsPanel.semanticParity.clear));

    expect(document.body.textContent).toContain(ja.resultsPanel.semanticParity.status.idle);
    expect(reportJson()).toBe("");
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

function renderParityPanel(project: ProjectModel = parityProject()) {
  render(
    <ResultsPanel
      activeTab="results"
      project={project}
      result={null}
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

async function chooseRightFile(project: ProjectModel, name: string) {
  await chooseRightFileText(JSON.stringify(project, null, 2), name);
}

async function chooseRightFileText(contents: string, name: string) {
  const input = fileInput();
  const file = new File([contents], name, { type: "application/json" });
  await act(async () => {
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

function fileInput(): HTMLInputElement {
  const element = document.querySelector('input[type="file"]');
  if (!(element instanceof HTMLInputElement)) throw new Error("File input not found");
  return element;
}

function reportJson(): string {
  const element = document.querySelector(".semantic-parity-json");
  if (!(element instanceof HTMLTextAreaElement)) throw new Error("Report textarea not found");
  return element.value;
}

function parityProject(): ProjectModel {
  return {
    schemaVersion: 1,
    project: {
      id: "parity-project",
      name: "Parity Project",
      schemaVersion: "1.0.0",
      description: "semantic parity ui test",
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
    },
    units: {
      length: "m",
      force: "kN",
      moment: "kN-m",
      modulus: "kN/m2",
      area: "m2",
      inertia: "m4",
    },
    nodes: [
      { id: "n-1", x: 0, y: 0, z: 0 },
      { id: "n-2", x: 10, y: 0, z: 0 },
    ],
    materials: [{ id: "mat-1", name: "Steel", elasticModulus: 200000, shearModulus: 80000, poissonRatio: 0.3, density: 78.5 }],
    sections: [{ id: "sec-1", name: "Section", area: 1, iy: 1, iz: 1, j: 1 }],
    members: [{ id: "m-1", nodeI: "n-1", nodeJ: "n-2", materialId: "mat-1", sectionId: "sec-1" }],
    supports: [
      { nodeId: "n-1", ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
    ],
    loadCases: [],
    nodalLoads: [],
    memberLoads: [],
    analysisSettings: {
      analysisType: "linear_static",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-6,
    },
  };
}

function mutatedProject(project: ProjectModel): ProjectModel {
  const copy = JSON.parse(JSON.stringify(project)) as ProjectModel;
  copy.nodes[1] = { ...copy.nodes[1], x: copy.nodes[1].x + 0.25 };
  return copy;
}

function indeterminateRightModel(project: ProjectModel): ProjectModel {
  const copy = JSON.parse(JSON.stringify(project)) as ProjectModel;
  copy.members.push({
    ...copy.members[0],
    id: "m-dup",
    nodeI: copy.members[0].nodeJ,
    nodeJ: copy.members[0].nodeI,
  });
  return copy;
}
