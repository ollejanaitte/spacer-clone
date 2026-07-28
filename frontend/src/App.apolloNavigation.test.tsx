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
  Viewer3D: ({ project }: { project: { nodes: unknown[]; members: unknown[] } }) => (
    <div data-testid="mock-viewer3d">
      {project.nodes.length}/{project.members.length}
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

function selectByTestId(testId: string): HTMLSelectElement {
  const select = document.querySelector(`[data-testid="${testId}"]`) as HTMLSelectElement | null;
  if (!select) {
    throw new Error(`Select not found: ${testId}`);
  }
  return select;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
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
      buttonByTestId("open-apollo-phase1").click();
    });

    expect(window.location.pathname).toBe("/pro/apollo");
    expect(document.querySelector("[data-testid='apollo-phase1-shell']")).not.toBeNull();

    await act(async () => {
      setInputValue(inputByTestId("apollo-project-name-input"), "Apollo Route Persistence");
      buttonByTestId("apollo-add-node").click();
    });

    await act(async () => {
      setInputValue(inputByTestId("apollo-node-label-input"), "Apollo Edited Node");
      setInputValue(inputByTestId("apollo-node-x-input"), "12.5");
    });

    const nodeSummary = document.querySelector("[data-testid='apollo-topology-summary']")?.textContent ?? "";
    expect(nodeSummary).toContain("11");
    expect(inputByTestId("apollo-node-label-input").value).toBe("Apollo Edited Node");
    expect(inputByTestId("apollo-node-x-input").value).toBe("12.5");

    await act(async () => {
      buttonByTestId("apollo-return-to-pro").click();
    });

    expect(window.location.pathname).toBe("/pro");
    expect(document.body.textContent).toContain("Apollo Route Persistence");

    await act(async () => {
      buttonByTestId("open-apollo-phase1").click();
    });

    expect(window.location.pathname).toBe("/pro/apollo");
    expect(inputByTestId("apollo-project-name-input").value).toBe("Apollo Route Persistence");
    expect(document.body.textContent).toContain("11");
    await act(async () => {
      setSelectValue(selectByTestId("apollo-node-select"), "APN-1");
    });
    expect(inputByTestId("apollo-node-label-input").value).toBe("Apollo Edited Node");
    expect(inputByTestId("apollo-node-x-input").value).toBe("12.5");
  }, 40000);
});
function setSelectValue(select: HTMLSelectElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
  valueSetter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}
