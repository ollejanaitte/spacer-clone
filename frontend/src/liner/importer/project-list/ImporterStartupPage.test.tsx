/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImporterStartupPage } from "./ImporterStartupPage";
import { clearImporterStorageForTests } from "../storage/importerStorage";
import { clearRecoveryStateForTests } from "../storage/recoveryManager";
import {
  BUILT_IN_SAMPLE_BRIDGE_NAME,
  BUILT_IN_SAMPLE_PROJECT_NAME,
} from "../sample/builtInSampleConstants";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(node);
  });
}

function buttonByTestId(testId: string): HTMLButtonElement {
  const button = document.querySelector(`[data-testid=${testId}]`) as HTMLButtonElement | null;
  if (!button) {
    throw new Error(`Button not found: ${testId}`);
  }
  return button;
}

describe("ImporterStartupPage", () => {
  beforeEach(() => {
    clearImporterStorageForTests();
    clearRecoveryStateForTests();
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    host?.remove();
    root = null;
    host = null;
    clearImporterStorageForTests();
    clearRecoveryStateForTests();
  });

  it("renders startup mode choices", async () => {
    await render(<ImporterStartupPage onBack={vi.fn()} onOpenProject={vi.fn()} />);

    expect(document.querySelector("[data-testid=importer-startup-page]")).not.toBeNull();
    expect(document.querySelector("[data-testid=importer-startup-use-sample]")).not.toBeNull();
    expect(document.querySelector("[data-testid=importer-startup-start-empty]")).not.toBeNull();
  });

  it("loads the built-in sample project and opens it", async () => {
    const onOpenProject = vi.fn();
    await render(<ImporterStartupPage onBack={vi.fn()} onOpenProject={onOpenProject} />);

    await act(async () => {
      buttonByTestId("importer-startup-use-sample").click();
    });

    expect(onOpenProject).toHaveBeenCalledTimes(1);
    const [projectId, bridgeId] = onOpenProject.mock.calls[0]!;
    expect(projectId.length).toBeGreaterThan(0);
    expect(bridgeId.length).toBeGreaterThan(0);
  });

  it("creates an empty project with a bridge for the empty path", async () => {
    const onOpenProject = vi.fn();
    await render(<ImporterStartupPage onBack={vi.fn()} onOpenProject={onOpenProject} />);

    await act(async () => {
      buttonByTestId("importer-startup-start-empty").click();
    });

    expect(onOpenProject).toHaveBeenCalledTimes(1);
    const [projectId, bridgeId] = onOpenProject.mock.calls[0]!;

    const { defaultImporterProjectService } = await import("../ImporterProjectService");
    const project = defaultImporterProjectService.loadProject(projectId);
    expect(project?.name).toBe("新規プロジェクト");
    expect(project?.bridges).toHaveLength(1);
    expect(project?.bridges[0]?.id).toBe(bridgeId);
    expect(project?.bridges[0]?.name).toBe("新規橋梁");
    expect(project?.bridges[0]?.sections).toEqual([]);
  });

  it("sample project contains transferred bridge metadata", async () => {
    const onOpenProject = vi.fn();
    await render(<ImporterStartupPage onBack={vi.fn()} onOpenProject={onOpenProject} />);

    await act(async () => {
      buttonByTestId("importer-startup-use-sample").click();
    });

    const [projectId] = onOpenProject.mock.calls[0]!;
    const { defaultImporterProjectService } = await import("../ImporterProjectService");
    const project = defaultImporterProjectService.loadProject(projectId);

    expect(project?.name).toBe(BUILT_IN_SAMPLE_PROJECT_NAME);
    expect(project?.bridges[0]?.name).toBe(BUILT_IN_SAMPLE_BRIDGE_NAME);
    expect(project?.bridges[0]?.sections[0]?.title).toBe("PH12(PE10)");
  });
});
