// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectModel, TimeHistoryResult } from "../../types";
import { createDefaultProject } from "../../data/defaultProject";
import { ja } from "../../i18n/ja";
import { TimeHistoryAnimationProvider } from "../TimeHistoryAnimationContext";
import { TimeHistoryAnimationAvailability } from "./TimeHistoryAnimationAvailability";
import { TimeHistoryAnimationControlsPanel } from "./TimeHistoryAnimationControlsPanel";
import { TimeHistoryAnimationViewerPanel } from "./TimeHistoryAnimationViewerPanel";
import { useTimeHistoryAnimationState } from "../useTimeHistoryAnimationState";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function render(element: ReactNode) {
  act(() => {
    if (root) {
      root.unmount();
      root = null;
    }
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(element);
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function makeProject(): ProjectModel {
  const project = createDefaultProject();
  project.nodes = [
    { id: "N1", x: 0, y: 0, z: 0 },
    { id: "N2", x: 1, y: 0, z: 0 },
  ];
  return project;
}

function makeResult(overrides: Partial<TimeHistoryResult> = {}): TimeHistoryResult {
  return {
    meta: { analysisId: "a1", status: "success", method: "newmark-beta", timeStep: 0.05, duration: 0.1, sampleCount: 3 },
    time: [0, 0.05, 0.1],
    displacements: {
      N2_ux: [0, 1.0, 0.5],
      N2_uy: [0, 0.2, -0.3],
      N3_uz: [0, 2.0, 1.0],
    },
    velocities: {},
    accelerations: {},
    ...overrides,
  };
}

function withAnimationProvider(node: ReactNode, project: ProjectModel, result: TimeHistoryResult) {
  function Harness() {
    const animation = useTimeHistoryAnimationState({ project, result });
    return (
      <TimeHistoryAnimationProvider
        project={project}
        result={result}
        state={animation.state}
        setters={animation.setters}
        reset={animation.reset}
        jumpToMax={animation.jumpToMax}
        currentTimeSeconds={animation.currentTimeSeconds}
        currentValue={animation.currentValue}
        maxAbsValue={animation.maxAbsValue}
        maxAbsTimeSeconds={animation.maxAbsTimeSeconds}
        largeScaleWarning={animation.largeScaleWarning}
      >
        {node}
      </TimeHistoryAnimationProvider>
    );
  }
  return <Harness />;
}

describe("TimeHistoryAnimationAvailability", () => {
  it("renders the availability table headings", () => {
    render(<TimeHistoryAnimationAvailability result={makeResult()} />);
    const labels = ja.timeHistoryWizard.animation;
    expect(document.body.textContent).toContain(labels.availabilityHeading);
    expect(document.body.textContent).toContain(labels.xStatus);
    expect(document.body.textContent).toContain(labels.yStatus);
    expect(document.body.textContent).toContain(labels.zStatus);
    expect(document.body.textContent).toContain(labels.xyzStatus);
    expect(document.body.textContent).toContain(labels.okLabel);
    expect(document.body.textContent).toContain(labels.availableLabel);
  });

  it("marks missing components and shows the missing-axes notice", () => {
    const partial = makeResult({
      displacements: { N1_ux: [0, 0.001] },
      meta: { analysisId: "a1", status: "success", method: "newmark-beta", timeStep: 0.01, duration: 0.1, sampleCount: 2 },
      time: [0, 0.01],
    });
    render(<TimeHistoryAnimationAvailability result={partial} />);
    const labels = ja.timeHistoryWizard.animation;
    expect(document.body.textContent).toContain(labels.xyzUnavailableTitle);
    expect(document.body.textContent).toContain(labels.unavailableLabel);
    expect(document.body.textContent).toContain(labels.missingLabel);
  });
});

describe("TimeHistoryAnimationControlsPanel", () => {
  it("renders the play/pause/slider/mode/scale/jump controls with labels", () => {
    const project = makeProject();
    const result = makeResult();
    render(withAnimationProvider(<TimeHistoryAnimationControlsPanel result={result} />, project, result));
    const labels = ja.timeHistoryWizard.animation;
    expect(document.body.textContent).toContain(labels.heading);
    expect(document.body.textContent).toContain(labels.play);
    // The pause label is part of the play button aria-label; verify the button exists.
    expect(document.body.textContent).toContain(labels.previous);
    expect(document.body.textContent).toContain(labels.next);
    expect(document.body.textContent).toContain(labels.reset);
    expect(document.body.textContent).toContain(labels.modeLabel);
    expect(document.body.textContent).toContain(labels.modeX);
    expect(document.body.textContent).toContain(labels.modeY);
    expect(document.body.textContent).toContain(labels.modeZ);
    expect(document.body.textContent).toContain(labels.modeXyz);
    expect(document.body.textContent).toContain(labels.displacementScaleLabel);
    expect(document.body.textContent).toContain(labels.jumpToMax);
  });

  it("disables xyz mode when components are missing", () => {
    const project = makeProject();
    const partial = makeResult({
      displacements: { N1_ux: [0, 0.001] },
      meta: { analysisId: "a1", status: "success", method: "newmark-beta", timeStep: 0.01, duration: 0.1, sampleCount: 2 },
      time: [0, 0.01],
    });
    render(withAnimationProvider(<TimeHistoryAnimationControlsPanel result={partial} />, project, partial));
    const select = document.querySelector("select");
    expect(select).toBeTruthy();
    const xyzOption = Array.from(select!.querySelectorAll("option")).find((o) => (o as HTMLOptionElement).value === "xyz");
    expect(xyzOption).toBeTruthy();
    expect((xyzOption as HTMLOptionElement).disabled).toBe(true);
  });
});

describe("TimeHistoryAnimationViewerPanel", () => {
  it("renders the embedding heading even when disabled", () => {
    const project = makeProject();
    render(<TimeHistoryAnimationViewerPanel project={project} result={null} />);
    const labels = ja.timeHistoryWizard.animation;
    expect(document.body.textContent).toContain(labels.embeddingHeading);
    expect(document.body.textContent).toContain(labels.embeddingHelp);
    expect(document.body.textContent).toContain(labels.emptyResult);
  });
});
