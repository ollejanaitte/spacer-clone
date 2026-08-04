// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";
import { createDefaultProject } from "../../data/defaultProject";
import type { ProjectModel } from "../../types";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { WorkflowControlScreen } from "../components/WorkflowControlScreen";
import { WorkflowStepCard } from "../components/WorkflowStepCard";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import { WorkflowProgressSummary } from "../components/WorkflowProgressSummary";
import { buildWorkflowStateModel } from "../workflow/index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const { root, container } of mountedRoots.splice(0)) {
    root.unmount();
    container.remove();
  }
});

function render(node: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(node);
  });
  return container;
}

function generatedProject(): ProjectModel {
  let project = createDefaultProject();
  project = fillSimpleSingleBridgeStructureInput(project);
  const result = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!result.ok) throw new Error(`generate failed: ${result.diagnostics.join("; ")}`);
  return result.project;
}

describe("WorkflowStatusBadge (E2E-S4A-005 not color-only)", () => {
  it("renders text label for COMPLETE (not color-only)", () => {
    const container = render(<WorkflowStatusBadge status="COMPLETE" />);
    const badge = container.querySelector("[data-testid='apollo-wf-status-complete']");
    expect(badge?.textContent).toContain("完了");
    expect(badge?.getAttribute("aria-label")).toContain("完了");
  });

  it("renders RECOMMENDED flag when recommended", () => {
    const container = render(<WorkflowStatusBadge status="RECOMMENDED" isRecommended />);
    expect(container.querySelector("[data-testid='apollo-wf-recommended-flag']")?.textContent).toContain("推奨");
  });
});

describe("WorkflowStepCard", () => {
  it("shows id, label, diagnostics and disabled reason for BLOCKED steps", () => {
    const model = buildWorkflowStateModel(createDefaultProject());
    const blocked = model.steps.find((step) => step.status === "BLOCKED");
    expect(blocked).toBeDefined();
    if (!blocked) return;
    const container = render(
      <WorkflowStepCard
        step={blocked}
        onNavigate={() => undefined}
        onPrimaryAction={() => undefined}
      />,
    );
    expect(container.querySelector("[data-testid='apollo-wf-step-id']")?.textContent).toBe(blocked.workflowStepId);
    expect(container.querySelector("[data-testid='apollo-wf-diagnostics']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-wf-step-disabled-reason']")?.textContent).toContain(
      "先に必要な作業があります",
    );
    expect(container.querySelector("[data-testid='apollo-wf-step-primary']") as HTMLButtonElement).toHaveProperty(
      "disabled",
      true,
    );
  });
});

describe("WorkflowControlScreen (full model master-detail)", () => {
  it("renders navigator with all 15 steps and progress summary", () => {
    const project = generatedProject();
    const container = render(<WorkflowControlScreen project={project} onNavigate={() => undefined} onPrimaryAction={() => undefined} />);
    expect(container.querySelector("[data-testid='apollo-wf-master-detail']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-wf-navigator']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-wf-detail-panel']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-wf-progress-summary']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-wf-authorization-summary']")?.textContent).toContain(
      "正式認可なし",
    );
  });

  it("navigator lists all 15 steps", () => {
    const project = generatedProject();
    const container = render(<WorkflowControlScreen project={project} onNavigate={() => undefined} onPrimaryAction={() => undefined} />);
    const navButtons = container.querySelectorAll("[data-testid^='apollo-wf-nav-']");
    expect(navButtons).toHaveLength(15);
  });

  it("marks STALE steps with regeneration CTA after input mutation", () => {
    let project = generatedProject();
    project = withBridgeStructureField(project, "width", 13);
    const container = render(<WorkflowControlScreen project={project} onNavigate={() => undefined} onPrimaryAction={() => undefined} />);
    const staleNav = container.querySelector("[data-testid='apollo-wf-nav-WF-02']");
    expect(staleNav?.textContent).toContain("要再計算");
    expect(container.querySelector("[data-testid='apollo-wf-progress-recommended']")?.textContent).toContain("WF-02");
  });

  it("detail panel shows navigation and next/prev buttons", () => {
    const project = generatedProject();
    const container = render(<WorkflowControlScreen project={project} onNavigate={() => undefined} onPrimaryAction={() => undefined} />);
    expect(container.querySelector("[data-testid='apollo-wf-detail-prev']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-wf-detail-next']")).not.toBeNull();
    const pos = container.querySelector("[data-testid='apollo-wf-detail-position']")?.textContent;
    expect(pos).toMatch(/\d+ \/ 15/);
    expect(container.querySelector("[data-testid='apollo-wf-step-id']")).not.toBeNull();
  });

  it("navigation handler receives the step navigation target", () => {
    const project = createDefaultProject();
    let received: string | null = null;
    const container = render(
      <WorkflowControlScreen
        project={project}
        onNavigate={(target) => {
          received = target.path;
        }}
        onPrimaryAction={() => undefined}
      />,
    );
    const wf02 = container.querySelector("[data-testid='apollo-wf-nav-WF-02']") as HTMLButtonElement | null;
    act(() => {
      wf02?.click();
    });
    const detailNavigate = container.querySelector("[data-testid='apollo-wf-step-navigate']") as HTMLButtonElement | null;
    act(() => {
      detailNavigate?.click();
    });
    expect(received).toBe("wf-panel-bridge-structure");
  });
});

describe("WorkflowProgressSummary", () => {
  it("renders progress counts and recommended step", () => {
    const model = buildWorkflowStateModel(createDefaultProject());
    const container = render(
      <WorkflowProgressSummary progress={model.progress} currentRecommendedStepId={model.currentRecommendedStepId} />,
    );
    expect(container.querySelector("[data-testid='apollo-wf-progress-recommended']")?.textContent).toContain("WF-02");
    expect(container.textContent).toContain("全 15 工程");
  });
});