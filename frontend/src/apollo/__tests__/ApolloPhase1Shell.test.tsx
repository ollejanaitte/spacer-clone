// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createDefaultProject } from "../../data/defaultProject";
import { ApolloPhase1Shell } from "../ApolloPhase1Shell";
import type { ApolloPhase1FeatureFlags } from "../featureFlag";
import type { ProjectModel } from "../../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DEFAULT_FLAGS: ApolloPhase1FeatureFlags = {
  nnEnabled: true,
  numericReleaseBlocked: true,
  showProvisionalStatus: true,
  disableResultPublication: true,
  disableNumericExecution: true,
};

function renderShell(
  props?: Partial<{
    onReturnToPro: () => void;
    project: ProjectModel;
    flags: ApolloPhase1FeatureFlags;
    onProjectChange: (nextProject: ProjectModel) => void;
    onAuditEvent: (message: string) => void;
  }>,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onReturnToPro = props?.onReturnToPro ?? (() => undefined);
  act(() => {
    root.render(
      <ApolloPhase1Shell
        project={props?.project ?? createDefaultProject()}
        flags={props?.flags ?? DEFAULT_FLAGS}
        onProjectChange={props?.onProjectChange ?? (() => undefined)}
        onReturnToPro={onReturnToPro}
        onAuditEvent={props?.onAuditEvent}
      />,
    );
  });
  return { container };
}

describe("ApolloPhase1Shell", () => {
  it("shows guarded placeholder only", () => {
    const { container } = renderShell();
    expect(container.querySelector("[data-testid='apollo-phase1-shell']")).not.toBeNull();
    expect(container.textContent).toContain("Apollo Phase 1-NN");
    expect(container.textContent).toContain("Provisional / unverified status");
    expect(container.querySelector("[data-testid='apollo-verified-badge']")).toBeNull();
  });

  it("returns to pro workspace", () => {
    const onReturnToPro = vi.fn();
    const { container } = renderShell({ onReturnToPro });
    const button = container.querySelector("[data-testid='apollo-return-to-pro']") as HTMLButtonElement;
    button.click();
    expect(onReturnToPro).toHaveBeenCalledOnce();
  });

  it("updates project metadata and topology through shell callbacks", () => {
    const updates: ProjectModel[] = [];
    const project = createDefaultProject();
    const { container } = renderShell({
      project,
      onProjectChange: (nextProject) => {
        updates.push(nextProject);
      },
    });

    const nameInput = container.querySelector("[data-testid='apollo-project-name-input']") as HTMLInputElement;
    act(() => {
      nameInput.value = "Apollo NN Draft";
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const addNodeButton = container.querySelector("[data-testid='apollo-add-node']") as HTMLButtonElement;
    act(() => {
      addNodeButton.click();
    });

    expect(updates[0]?.project.name).toBe("Apollo NN Draft");
    expect(updates.at(-1)?.nodes.length).toBe(project.nodes.length + 1);
  });

  it("blocks numeric execution and result publication while recording audit events", () => {
    const onAuditEvent = vi.fn();
    const { container } = renderShell({ onAuditEvent });

    const numericGuard = container.querySelector("[data-testid='apollo-numeric-execution-guard']") as HTMLButtonElement;
    const publicationGuard = container.querySelector("[data-testid='apollo-result-publication-guard']") as HTMLButtonElement;

    expect(numericGuard.getAttribute("aria-disabled")).toBe("true");
    expect(publicationGuard.getAttribute("aria-disabled")).toBe("true");

    act(() => {
      numericGuard.click();
      publicationGuard.click();
    });

    expect(container.textContent).toContain("Numeric execution request denied by Phase 1-NN guard.");
    expect(container.textContent).toContain("Result publication request denied by Phase 1-NN guard.");
    expect(container.textContent).toContain(
      "Authoritative result publication remains blocked. This shell may show provisional structure state only.",
    );
    expect(onAuditEvent).toHaveBeenCalledWith(
      "Numeric execution request denied by Phase 1-NN guard.",
    );
    expect(onAuditEvent).toHaveBeenCalledWith(
      "Result publication request denied by Phase 1-NN guard.",
    );
  });

  it("shows validation issues for invalid shell state", () => {
    const project = {
      ...createDefaultProject(),
      project: {
        ...createDefaultProject().project,
        name: "",
      },
      members: [
        {
          id: "BROKEN",
          nodeI: "MISSING-I",
          nodeJ: "MISSING-J",
          materialId: "MAT_DECK",
          sectionId: "SEC_DECK",
        },
      ],
      supports: [
        {
          nodeId: "MISSING-SUPPORT",
          ux: false,
          uy: false,
          uz: false,
          rx: false,
          ry: false,
          rz: false,
        },
      ],
    };
    const { container } = renderShell({ project });
    expect(container.textContent).toContain("NN-PROJECT-NAME-REQUIRED");
    expect(container.textContent).toContain("NN-MEMBER-NODE-REFERENCE");
    expect(container.textContent).toContain("NN-SUPPORT-NODE-REFERENCE");
  });
});
