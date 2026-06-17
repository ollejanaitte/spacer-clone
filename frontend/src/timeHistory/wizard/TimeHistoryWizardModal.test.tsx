// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectModel, TimeHistoryResult } from "../../types";
import { TimeHistoryWizardModal } from "./TimeHistoryWizardModal";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
const containers: HTMLDivElement[] = [];

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
}

function unmount() {
  act(() => {
    root?.unmount();
  });
  root = null;
  for (const c of containers) c.remove();
  containers.length = 0;
}

function makeProject(): ProjectModel {
  return {
    project: { id: "p", name: "test", schemaVersion: "v1", description: "", createdAt: "", updatedAt: "" },
    nodes: [
      { id: "N1", x: 0, y: 0, z: 0 },
      { id: "N2", x: 1, y: 0, z: 0 },
    ],
    members: [{ id: "M1", nodeI: "N1", nodeJ: "N2", materialId: "mat1", sectionId: "sec1" }],
    materials: [],
    sections: [],
    supports: [{ nodeId: "N1", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
    loadCases: [],
    loads: { nodal: [], member: [] },
    massCases: [{ id: "mc1", name: "mass1", method: "lumped", source: "self_weight" }],
    analysisSettings: {
      timeHistory: {
        enabled: true,
        method: "newmark-beta",
        timeStep: 0.01,
        duration: 0.05,
        beta: 0.25,
        gamma: 0.5,
        massCaseId: "mc1",
        groundMotionId: "gm-001",
        direction: "X",
        damping: { type: "rayleigh", alpha: 0, beta: 0 },
      },
    },
    groundMotions: [
      { id: "gm-001", name: "wave", direction: "X", unit: "m/s2", timeStep: 0.01, duration: 0.05, samples: [0, 0.1, 0.2, 0.1, 0, -0.1] },
    ],
    analysisResults: null,
  } as unknown as ProjectModel;
}

function makeResult(): TimeHistoryResult {
  return {
    meta: { analysisId: "a1", status: "success", method: "newmark-beta", timeStep: 0.01, duration: 0.05, sampleCount: 3 },
    time: [0, 0.01, 0.02],
    displacements: { N1_ux: [0, 0.001, 0.002] },
    velocities: {},
    accelerations: {},
  };
}

afterEach(() => {
  unmount();
});

describe("TimeHistoryWizardModal", () => {
  it("renders nothing when closed", () => {
    mount(
      <TimeHistoryWizardModal
        open={false}
        project={makeProject()}
        result={null}
        onProjectChange={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(document.querySelector(".time-history-wizard-modal")).toBeNull();
  });

  it("renders the intro section when opened", () => {
    mount(
      <TimeHistoryWizardModal
        open={true}
        project={makeProject()}
        result={null}
        onProjectChange={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(document.querySelector(".time-history-wizard-modal")).toBeTruthy();
    expect(document.body.textContent).toContain("はじめに");
  });

  it("renders the ground motion section when navigated", () => {
    mount(
      <TimeHistoryWizardModal
        open={true}
        project={makeProject()}
        result={null}
        onProjectChange={() => undefined}
        onClose={() => undefined}
      />,
    );
    const navButton = Array.from(document.querySelectorAll("nav.time-history-wizard-side-nav button"))
      .find((btn) => btn.textContent && btn.textContent.includes("地震波設定")) as HTMLButtonElement | undefined;
    expect(navButton).toBeTruthy();
    act(() => { navButton!.click(); });
    expect(document.body.textContent).toContain("読み込んだ地震波");
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    mount(
      <TimeHistoryWizardModal
        open={true}
        project={makeProject()}
        result={null}
        onProjectChange={() => undefined}
        onClose={onClose}
      />,
    );
    const closeButton = Array.from(document.querySelectorAll("button"))
      .find((btn) => btn.textContent === "閉じる") as HTMLButtonElement | undefined;
    expect(closeButton).toBeTruthy();
    act(() => { closeButton!.click(); });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not mutate the project on render", () => {
    const onProjectChange = vi.fn();
    mount(
      <TimeHistoryWizardModal
        open={true}
        project={makeProject()}
        result={null}
        onProjectChange={onProjectChange}
        onClose={() => undefined}
      />,
    );
    expect(onProjectChange).not.toHaveBeenCalled();
  });

  it("renders the result section with a result", () => {
    mount(
      <TimeHistoryWizardModal
        open={true}
        project={makeProject()}
        result={makeResult()}
        onProjectChange={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(document.body.textContent).toContain("結果表示");
  });
});
