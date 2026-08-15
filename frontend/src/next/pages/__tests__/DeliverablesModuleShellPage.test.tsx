// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../project/projectManagerInstance";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { DeliverablesModuleShellPage } from "../DeliverablesModuleShellPage";

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

describe("DeliverablesModuleShellPage (Phase 11 P0-01)", () => {
  it("renders deliverables table with blocked exports on empty project (fail-closed)", async () => {
    const manager = getProjectManager();
    const result = manager.createProject({
      name: "T",
      businessNumber: "B-1",
      designStage: "bridge-detailed",
    });
    if (!result.ok || !result.project) {
      throw new Error("createProject failed");
    }
    const projectId = result.project.projectId;
    const root = await render(
      <DeliverablesModuleShellPage projectId={projectId} moduleId="deliverables" />,
    );
    expect(document.querySelector('[data-testid="deliverables-title"]')?.textContent).toContain("成果品");
    // All deliverables INVALID (no source data) -> exports blocked
    const exportButtons = Array.from(document.querySelectorAll("[data-testid$='-export']")) as HTMLButtonElement[];
    expect(exportButtons.length).toBeGreaterThan(0);
    for (const btn of exportButtons) {
      expect(btn.disabled).toBe(true);
    }
    expect(document.querySelector('[data-testid="deliverables-status"]')?.textContent).toBeTruthy();
    expect(document.querySelector('[data-testid="deliverables-import-fixture"]')).toBeTruthy();
    root.unmount();
  });
});
