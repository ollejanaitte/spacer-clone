// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APOLLO_PHASE1_NN_ENABLED_FLAG_NAME,
  APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME,
} from "./apollo/featureFlag";

vi.mock("./api/client", () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    loadAutosaveCandidate: vi.fn().mockResolvedValue({ exists: false }),
    autosaveProject: vi.fn().mockResolvedValue({ ok: true }),
  },
  resolveApiUrl: (path: string) => path,
}));

vi.mock("./viewer/Viewer3D", () => ({
  Viewer3D: ({
    project,
    displayModel,
    apolloDisplayModelAvailable,
    apolloVisualizationModel,
    onDisplayModelChange,
  }: {
    project: { nodes: unknown[]; members: unknown[] };
    displayModel?: string;
    apolloDisplayModelAvailable?: boolean;
    apolloVisualizationModel?: { elements: readonly unknown[] } | null;
    onDisplayModelChange?: (model: string) => void;
  }) => (
    <div
      data-testid="mock-viewer3d"
      data-display-model={displayModel ?? "frame"}
      data-apollo-available={apolloDisplayModelAvailable ? "true" : "false"}
      data-apollo-visualization={
        apolloVisualizationModel ? String(apolloVisualizationModel.elements.length) : "none"
      }
    >
      {project.nodes.length}/{project.members.length}
      {onDisplayModelChange ? (
        <>
          <select
            data-testid="viewer-display-model"
            value={displayModel ?? "frame"}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === "frame" || value === "apollo") {
                onDisplayModelChange(value);
              }
            }}
          >
            <option value="frame">フレーム</option>
            <option value="apollo" disabled={!apolloDisplayModelAvailable}>
              Apollo
            </option>
          </select>
          {!apolloDisplayModelAvailable ? (
            <p data-testid="viewer-display-model-unavailable">Apollo モデルは利用できません。</p>
          ) : null}
        </>
      ) : null}
    </div>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  const button = document.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null;
  if (!button) {
    throw new Error(`Button not found: ${testId}`);
  }
  return button;
}

function inputByTestId(testId: string): HTMLInputElement {
  const input = document.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | null;
  if (!input) {
    throw new Error(`Input not found: ${testId}`);
  }
  return input;
}

function clickButtonByText(pattern: string) {
  const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(pattern),
  ) as HTMLButtonElement | undefined;
  if (!button) {
    throw new Error(`Button not found by text: ${pattern}`);
  }
  button.click();
}

function selectByTestId(testId: string): HTMLSelectElement {
  const select = document.querySelector(`[data-testid="${testId}"]`) as HTMLSelectElement | null;
  if (!select) {
    throw new Error(`Select not found: ${testId}`);
  }
  return select;
}

function setInputValue(input: HTMLInputElement, value: string) {
  input.focus();
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.blur();
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
  valueSetter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function mockViewer3D(): HTMLElement {
  const viewer = document.querySelector("[data-testid='mock-viewer3d']") as HTMLElement | null;
  if (!viewer) {
    throw new Error("mock-viewer3d not found");
  }
  return viewer;
}

async function loadApolloStandardSample() {
  await act(async () => {
    clickButtonByTestId("apollo-open-sample-selection");
  });
  await act(async () => {
    clickButtonByTestId("apollo-load-standard-sample");
  });
}

async function returnToProFromApollo() {
  await act(async () => {
    clickButtonByTestId("apollo-return-to-pro");
  });
  const discardButton = document.querySelector(
    '[data-testid="apollo-guard-discard"]',
  ) as HTMLButtonElement | null;
  if (discardButton) {
    await act(async () => {
      discardButton.click();
    });
  }
}

function clickButtonByTestId(testId: string) {
  const button = buttonByTestId(testId);
  button.click();
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  window.history.pushState({}, "", "/");
});

describe("App Apollo navigation", () => {
  it("shows a disabled Apollo entry when the feature flag is OFF", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);

    const button = buttonByTestId("open-apollo-phase1");
    expect(button.disabled).toBe(true);
    expect(window.location.pathname).toBe("/pro");
  }, 40000);

  it("navigates to Apollo and preserves edits across a route round-trip when the feature flag is ON", async () => {
    vi.stubEnv(APOLLO_PHASE1_NN_ENABLED_FLAG_NAME, "true");
    vi.stubEnv(APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME, "true");
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);

    await act(async () => {
      clickButtonByTestId("open-apollo-phase1");
    });

    expect(window.location.pathname).toBe("/pro/apollo");
    expect(document.querySelector("[data-testid='apollo-phase1-shell']")).not.toBeNull();

    await act(async () => {
      clickButtonByText("新規作成");
    });

    await act(async () => {
      setInputValue(inputByTestId("apollo-project-name-input"), "Apollo Route Persistence");
    });

    await act(async () => {
      clickButtonByText("次へ: 節点を確認");
    });

    await act(async () => {
      clickButtonByTestId("apollo-add-node");
    });

    await act(async () => {
      clickButtonByTestId("apollo-node-select-APN-1");
      setInputValue(inputByTestId("apollo-node-label-input"), "Apollo Edited Node");
      setInputValue(inputByTestId("apollo-node-x-input"), "12.5");
    });

    const nodeSummary = document.querySelector("[data-testid='apollo-topology-summary']")?.textContent ?? "";
    expect(nodeSummary).toContain("11");
    expect(inputByTestId("apollo-node-label-input").value).toBe("Apollo Edited Node");
    expect(inputByTestId("apollo-node-x-input").value).toBe("12.5");

    await act(async () => {
      clickButtonByTestId("apollo-return-to-pro");
    });

    await act(async () => {
      const discardButton = document.querySelector(
        '[data-testid="apollo-guard-discard"]',
      ) as HTMLButtonElement | null;
      discardButton?.click();
    });

    expect(window.location.pathname).toBe("/pro");
    expect(document.body.textContent).toContain("Apollo Route Persistence");

    await act(async () => {
      clickButtonByTestId("open-apollo-phase1");
    });

    expect(window.location.pathname).toBe("/pro/apollo");
    await act(async () => {
      clickButtonByText("一覧編集モード");
    });
    expect(inputByTestId("apollo-project-name-input").value).toBe("Apollo Route Persistence");
    expect(document.body.textContent).toContain("11");
    await act(async () => {
      clickButtonByTestId("apollo-node-select-APN-1");
    });
    expect(inputByTestId("apollo-node-label-input").value).toBe("Apollo Edited Node");
    expect(inputByTestId("apollo-node-x-input").value).toBe("12.5");
  }, 40000);

  it("keeps frame as the active display model when Apollo sidecar data is absent", async () => {
    vi.stubEnv(APOLLO_PHASE1_NN_ENABLED_FLAG_NAME, "true");
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);

    const viewer = mockViewer3D();
    expect(viewer.getAttribute("data-apollo-available")).toBe("false");
    expect(viewer.getAttribute("data-display-model")).toBe("frame");
    expect(viewer.getAttribute("data-apollo-visualization")).toBe("none");

    const modelSelect = selectByTestId("viewer-display-model");
    expect(modelSelect.value).toBe("frame");
    const apolloOption = modelSelect.querySelector('option[value="apollo"]') as HTMLOptionElement;
    expect(apolloOption.disabled).toBe(true);
    expect(document.querySelector("[data-testid='viewer-display-model-unavailable']")).not.toBeNull();
  }, 40000);

  it("passes Apollo display-model availability to Viewer3D and hands off the Apollo model when selected", async () => {
    vi.stubEnv(APOLLO_PHASE1_NN_ENABLED_FLAG_NAME, "true");
    vi.stubEnv(APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME, "true");
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);

    await act(async () => {
      clickButtonByTestId("open-apollo-phase1");
    });
    await loadApolloStandardSample();
    await returnToProFromApollo();

    expect(window.location.pathname).toBe("/pro");

    const viewer = mockViewer3D();
    expect(viewer.getAttribute("data-apollo-available")).toBe("true");
    expect(viewer.getAttribute("data-display-model")).toBe("frame");
    expect(viewer.getAttribute("data-apollo-visualization")).toBe("none");

    const modelSelect = selectByTestId("viewer-display-model");
    const apolloOption = modelSelect.querySelector('option[value="apollo"]') as HTMLOptionElement;
    expect(apolloOption.disabled).toBe(false);
    expect(document.querySelector("[data-testid='viewer-display-model-unavailable']")).toBeNull();

    await act(async () => {
      setSelectValue(modelSelect, "apollo");
    });

    expect(mockViewer3D().getAttribute("data-display-model")).toBe("apollo");
    expect(mockViewer3D().getAttribute("data-apollo-visualization")).not.toBe("none");
    expect(Number(mockViewer3D().getAttribute("data-apollo-visualization"))).toBeGreaterThan(0);
  }, 40000);

  it("exposes Apollo display-model availability on the main screen after an Apollo sample round-trip", async () => {
    vi.stubEnv(APOLLO_PHASE1_NN_ENABLED_FLAG_NAME, "true");
    vi.stubEnv(APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME, "true");
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);

    await act(async () => {
      clickButtonByTestId("open-apollo-phase1");
    });
    expect(window.location.pathname).toBe("/pro/apollo");

    await loadApolloStandardSample();
    await returnToProFromApollo();

    expect(window.location.pathname).toBe("/pro");
    expect(mockViewer3D().getAttribute("data-apollo-available")).toBe("true");

    expect(document.querySelector("[data-testid='viewer-display-model']")).not.toBeNull();

    const modelSelect = selectByTestId("viewer-display-model");
    const apolloOption = modelSelect.querySelector('option[value="apollo"]') as HTMLOptionElement;
    expect(apolloOption.disabled).toBe(false);
    expect(document.querySelector("[data-testid='viewer-display-model-unavailable']")).toBeNull();
  }, 40000);
});
