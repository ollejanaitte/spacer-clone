// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../project/projectManagerInstance";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { AnalysisModuleShellPage } from "../AnalysisModuleShellPage";

async function render(node: ReactNode): Promise<Root> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  return root;
}

beforeEach(() => {
  document.body.innerHTML = "";
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AnalysisModuleShellPage (Phase 11 P0-05)", () => {
  it("renders analysis shell with run/export controls and empty IF3 panel", async () => {
    const manager = getProjectManager();
    const result = manager.createProject({
      name: "T",
      businessNumber: "B-1",
      designStage: "bridge-detailed",
    });
    if (!result.ok || !result.project) throw new Error("createProject failed");
    const projectId = result.project.projectId;
    const root = await render(<AnalysisModuleShellPage projectId={projectId} moduleId="analysis" />);
    expect(document.querySelector('[data-testid="analysis-title"]')?.textContent).toContain("FEM");
    expect(document.querySelector('[data-testid="analysis-run"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="analysis-export-csv"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="if3-result-empty"]')?.textContent).toContain("解析を実行すると結果を表示します");
    root.unmount();
  });

  it("blocks CSV export when no IF3 result (fail-closed)", async () => {
    const manager = getProjectManager();
    const result = manager.createProject({ name: "T", businessNumber: "B-1", designStage: "bridge-detailed" });
    if (!result.ok || !result.project) throw new Error("createProject failed");
    const projectId = result.project.projectId;
    const root = await render(<AnalysisModuleShellPage projectId={projectId} moduleId="analysis" />);
    const btn = document.querySelector('[data-testid="analysis-export-csv"]') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(document.querySelector('[data-testid="analysis-export-message"]')?.textContent).toContain("解析結果がありません");
    root.unmount();
  });
});
