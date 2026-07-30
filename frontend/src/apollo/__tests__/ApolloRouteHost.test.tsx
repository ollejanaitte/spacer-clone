// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { createDefaultProject } from "../../data/defaultProject";
import { ApolloRouteHost } from "../ApolloRouteHost";
import type { ApolloPhase1FeatureFlags } from "../featureFlag";
import type { ProjectModel } from "../../types";
import { withApolloPhase1Unit2Draft } from "../unit2Draft";

vi.mock("../../viewer/Viewer3D", () => ({
  Viewer3D: ({
    project,
    selection,
  }: {
    project: { nodes: unknown[]; members: unknown[] };
    selection?: { type: string; id: string } | null;
  }) => (
    <div
      data-testid="mock-viewer3d"
      data-selection={selection ? `${selection.type}:${selection.id}` : "none"}
    >
      {project.nodes.length}/{project.members.length}
    </div>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DEFAULT_FLAGS: ApolloPhase1FeatureFlags = {
  nnEnabled: true,
  numericReleaseBlocked: true,
  showProvisionalStatus: true,
  disableResultPublication: true,
  disableNumericExecution: true,
};

function renderRouteHost(options?: {
  initialProject?: ProjectModel;
  onSaveProject?: () => Promise<boolean>;
  onReloadProject?: () => Promise<boolean>;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onSaveProject = options?.onSaveProject ?? vi.fn(async () => true);

  function Harness() {
    const [project, setProject] = useState(options?.initialProject ?? createDefaultProject());
    return (
      <ApolloRouteHost
        project={project}
        flags={DEFAULT_FLAGS}
        onProjectChange={setProject}
        onReturnToPro={async () => undefined}
        onSaveProject={onSaveProject}
        onReloadProject={options?.onReloadProject ?? (async () => false)}
      />
    );
  }

  act(() => {
    root.render(<Harness />);
  });

  return { container, root, onSaveProject };
}

function dirtyStatusText(container: HTMLElement): string | undefined {
  return Array.from(container.querySelectorAll("span")).find((span) =>
    span.textContent?.startsWith("保存状態:"),
  )?.textContent;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ApolloRouteHost", () => {
  it("clears dirty immediately after a successful save without waiting for a project change", async () => {
    const initialProject = withApolloPhase1Unit2Draft(createDefaultProject(), (draft) => ({
      ...draft,
      metadata: {
        ...draft.metadata,
        name: "Baseline bridge",
      },
    }));
    const { container } = renderRouteHost({ initialProject });

    const listModeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("一覧編集モード"),
    ) as HTMLButtonElement | undefined;
    act(() => {
      listModeButton?.click();
    });

    expect(dirtyStatusText(container)).toBe("保存状態: 保存済み");

    const nameInput = container.querySelector(
      '[data-testid="apollo-project-name-input"]',
    ) as HTMLInputElement;
    expect(nameInput).toBeTruthy();

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(nameInput, "Edited bridge name");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(dirtyStatusText(container)).toBe("保存状態: 変更あり");

    const saveButton = container.querySelector(
      '[data-testid="apollo-save-project"]',
    ) as HTMLButtonElement;
    await act(async () => {
      saveButton.click();
    });

    expect(dirtyStatusText(container)).toBe("保存状態: 保存済み");
  });

  it("clears dirty after choosing Save in the unsaved-changes guard", async () => {
    const initialProject = withApolloPhase1Unit2Draft(createDefaultProject(), (draft) => ({
      ...draft,
      metadata: {
        ...draft.metadata,
        name: "Baseline bridge",
      },
    }));
    const onSaveProject = vi.fn(async () => true);
    const onReloadProject = vi.fn(async () => false);
    const { container } = renderRouteHost({ initialProject, onSaveProject, onReloadProject });

    const listModeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("一覧編集モード"),
    ) as HTMLButtonElement | undefined;
    act(() => {
      listModeButton?.click();
    });

    const nameInput = container.querySelector(
      '[data-testid="apollo-project-name-input"]',
    ) as HTMLInputElement;
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(nameInput, "Edited bridge name");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(dirtyStatusText(container)).toBe("保存状態: 変更あり");

    const reloadButton = container.querySelector(
      '[data-testid="apollo-reload-project"]',
    ) as HTMLButtonElement;
    await act(async () => {
      reloadButton.click();
    });

    const guardDialog = container.querySelector('[data-testid="apollo-unsaved-guard-dialog"]');
    expect(guardDialog).toBeTruthy();

    const guardSaveButton = container.querySelector(
      '[data-testid="apollo-guard-save"]',
    ) as HTMLButtonElement;
    await act(async () => {
      guardSaveButton.click();
    });

    expect(onSaveProject).toHaveBeenCalledTimes(1);
    expect(dirtyStatusText(container)).toBe("保存状態: 保存済み");
    expect(onReloadProject).toHaveBeenCalledTimes(1);
  });

  it("returns to clean on undo back to baseline and dirty again on redo", async () => {
    const initialProject = withApolloPhase1Unit2Draft(createDefaultProject(), (draft) => ({
      ...draft,
      metadata: {
        ...draft.metadata,
        name: "Baseline bridge",
      },
    }));
    const { container } = renderRouteHost({ initialProject });

    const listModeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("一覧編集モード"),
    ) as HTMLButtonElement | undefined;
    act(() => {
      listModeButton?.click();
    });

    const nameInput = container.querySelector(
      '[data-testid="apollo-project-name-input"]',
    ) as HTMLInputElement;
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(nameInput, "Edited bridge name");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new Event("change", { bubbles: true }));
      nameInput.dispatchEvent(new Event("blur", { bubbles: true }));
    });

    expect(dirtyStatusText(container)).toBe("保存状態: 変更あり");

    const undoButton = container.querySelector('[data-testid="apollo-undo"]') as HTMLButtonElement;
    const redoButton = container.querySelector('[data-testid="apollo-redo"]') as HTMLButtonElement;

    act(() => {
      undoButton.click();
    });
    expect(dirtyStatusText(container)).toBe("保存状態: 保存済み");

    act(() => {
      redoButton.click();
    });
    expect(dirtyStatusText(container)).toBe("保存状態: 変更あり");
  });
});
