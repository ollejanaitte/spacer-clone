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
});
