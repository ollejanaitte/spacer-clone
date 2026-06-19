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
    meta: {
      analysisId: "a1",
      status: "success",
      method: "newmark-beta",
      timeStep: 0.01,
      duration: 0.05,
      sampleCount: 3,
      groundMotions: [{ direction: "X" }],
    },
    time: [0, 0.01, 0.02],
    displacements: {
      N1_ux: [0, 3, 0],
      N1_uy: [0, 4, 0],
      N1_uz: [0, 0, 0],
    },
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

  it("selects, charts, and summarizes the XYZ combined displacement", () => {
    mount(
      <TimeHistoryWizardModal
        open={true}
        project={makeProject()}
        result={makeResult()}
        onProjectChange={() => undefined}
        onClose={() => undefined}
      />,
    );
    const resultNav = Array.from(document.querySelectorAll("nav.time-history-wizard-side-nav button"))
      .find((button) => button.textContent?.includes("結果表示")) as HTMLButtonElement | undefined;
    expect(resultNav).toBeTruthy();
    act(() => { resultNav!.click(); });

    const targetSelect = document.querySelector<HTMLSelectElement>(".time-history-target-filter select");
    expect(targetSelect).toBeTruthy();
    const optionLabels = Array.from(targetSelect!.options, (option) => option.textContent);
    expect(optionLabels).toEqual(expect.arrayContaining(["N1 X", "N1 Y", "N1 Z", "N1 XYZ合成"]));

    act(() => {
      for (const option of Array.from(targetSelect!.options)) {
        option.selected = option.value === "xyz:N1";
      }
      targetSelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const chartTab = Array.from(document.querySelectorAll(".time-history-result-page-tabs button"))
      .find((button) => button.textContent?.includes("時刻歴グラフ")) as HTMLButtonElement | undefined;
    expect(chartTab).toBeTruthy();
    act(() => { chartTab!.click(); });
    expect(document.querySelector(".time-history-chart-host")?.getAttribute("data-series-labels")).toContain("N1 XYZ合成");
    expect(document.querySelector("[aria-label='グラフ凡例']")?.textContent).toContain("N1 XYZ合成");

    const peakTab = Array.from(document.querySelectorAll(".time-history-result-page-tabs button"))
      .find((button) => button.textContent?.includes("最大応答抽出")) as HTMLButtonElement | undefined;
    expect(peakTab).toBeTruthy();
    act(() => { peakTab!.click(); });
    expect(document.querySelector("[aria-label='最大応答抽出']")).toBeTruthy();
    expect(document.body.textContent).toContain("X変位");
    expect(document.body.textContent).toContain("Y変位");
    expect(document.body.textContent).toContain("Z変位");
    expect(document.body.textContent).toContain("XYZ合成");
    expect(document.body.textContent).toContain("絶対最大値");
    expect(document.body.textContent).toContain("5");
    expect(document.body.textContent).toContain("0.01 秒");
    expect(Array.from(document.querySelectorAll("button")).some((button) => button.textContent === "CSV保存")).toBe(true);
    expect(Array.from(document.querySelectorAll("button")).some((button) => button.textContent === "クリップボードへコピー")).toBe(true);

    const graphTabAgain = Array.from(document.querySelectorAll(".time-history-result-page-tabs button"))
      .find((button) => button.textContent?.includes("時刻歴グラフ")) as HTMLButtonElement | undefined;
    act(() => { graphTabAgain!.click(); });
    expect(document.querySelector(".time-history-chart-host")).toBeTruthy();
  });
});
