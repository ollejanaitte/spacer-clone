// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

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

function inputByTestId(testId: string): HTMLInputElement {
  const input = document.querySelector(`[data-testid=${testId}]`) as HTMLInputElement | null;
  if (!input) {
    throw new Error(`Input not found: ${testId}`);
  }
  return input;
}

function buttonByTestId(testId: string): HTMLButtonElement {
  const button = document.querySelector(`[data-testid=${testId}]`) as HTMLButtonElement | null;
  if (!button) {
    throw new Error(`Button not found: ${testId}`);
  }
  return button;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function resetModel(confirmValue: boolean) {
  vi.spyOn(window, "confirm").mockReturnValue(confirmValue);
  await act(async () => {
    buttonByTestId("reset-model").click();
  });
}

async function openLinerList() {
  await act(async () => {
    buttonByTestId("open-liner-list").click();
  });
}

async function openLinerSetup() {
  await openLinerList();
  await act(async () => {
    buttonByTestId("open-liner-setup").click();
  });
}

async function createLinerSetup() {
  await openLinerList();
  await act(async () => {
    buttonByTestId("create-liner").click();
  });
}

async function switchLinerSetupTab(tabId: string) {
  await act(async () => {
    buttonByTestId(`liner-setup-tab-${tabId}`).click();
  });
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("App LINER reset integration", () => {
  it("shows an empty LINER list after model reset", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);

    await resetModel(true);
    await openLinerList();

    expect(document.querySelector("[data-testid=liner-list-empty]")).not.toBeNull();
    expect(document.querySelector("[data-testid=open-liner-setup]")).toBeNull();
  }, 20000);

  it("creates and keeps edited LINER identifiers after model reset", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);

    await resetModel(true);
    await createLinerSetup();

    await act(async () => {
      setInputValue(inputByTestId("liner-alignment-id"), "alignment-after-reset");
      setInputValue(inputByTestId("liner-model-id"), "liner-after-reset");
      setInputValue(inputByTestId("liner-coordinate-policy-id"), "policy-after-reset");
      setInputValue(inputByTestId("liner-element-id-S1"), "S-after-reset");
    });
    await switchLinerSetupTab("station");
    await act(async () => {
      inputByTestId("liner-station-interval").focus();
    });
    await switchLinerSetupTab("line");

    expect(inputByTestId("liner-alignment-id").value).toBe("alignment-after-reset");
    expect(inputByTestId("liner-model-id").value).toBe("liner-after-reset");
    expect(inputByTestId("liner-coordinate-policy-id").value).toBe("policy-after-reset");
    expect(inputByTestId("liner-element-id-S-after-reset").value).toBe("S-after-reset");
  }, 20000);

  it("adds and edits a straight element after model reset", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);
    await resetModel(true);
    await createLinerSetup();

    await act(async () => {
      buttonByTestId("add-liner-straight-element").click();
    });
    await act(async () => {
      setInputValue(inputByTestId("liner-element-id-S2"), "S-new");
    });
    await act(async () => {
      setInputValue(inputByTestId("liner-element-start-x-S-new"), "12.5");
      setInputValue(inputByTestId("liner-element-start-y-S-new"), "3.25");
      setInputValue(inputByTestId("liner-element-azimuth-S-new"), "0.5");
      setInputValue(inputByTestId("liner-element-length-S-new"), "75");
    });

    expect(inputByTestId("liner-element-id-S-new").value).toBe("S-new");
    expect(inputByTestId("liner-element-start-x-S-new").value).toBe("12.5");
    expect(inputByTestId("liner-element-start-y-S-new").value).toBe("3.25");
    expect(inputByTestId("liner-element-azimuth-S-new").value).toBe("0.5");
    expect(inputByTestId("liner-element-length-S-new").value).toBe("75");
    expect(document.querySelector("[data-testid=remove-liner-element-S-new]")).not.toBeNull();
  }, 20000);

  it("opens mapping review and applies the generated 3D model after reset", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);
    await resetModel(true);
    await createLinerSetup();

    await act(async () => {
      setInputValue(inputByTestId("liner-model-id"), "liner-after-reset");
      setInputValue(inputByTestId("liner-element-length-S1"), "30");
    });
    await switchLinerSetupTab("station");
    await act(async () => {
      setInputValue(inputByTestId("liner-sample-interval"), "10");
    });

    await act(async () => {
      buttonByTestId("open-liner-mapping-review").click();
    });

    expect(document.querySelector("[data-testid=liner-mapping-review-page]")).not.toBeNull();
    expect(document.querySelector("[data-testid=mock-viewer3d]")).not.toBeNull();
    expect(buttonByTestId("open-liner-viewer").disabled).toBe(false);

    await act(async () => {
      buttonByTestId("open-liner-viewer").click();
    });

    expect(document.querySelector("[data-testid=liner-mapping-review-page]")).toBeNull();
    expect(document.querySelector("[data-testid=mock-viewer3d]")?.textContent).not.toBe("0/0");
  }, 20000);

  it("does not change LINER state when model reset is cancelled", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);
    await createLinerSetup();

    await act(async () => {
      setInputValue(inputByTestId("liner-alignment-id"), "alignment-before-cancel");
      setInputValue(inputByTestId("liner-model-id"), "liner-before-cancel");
    });
    await act(async () => {
      buttonByTestId("close-liner-edit").click();
    });

    await resetModel(false);
    await openLinerSetup();

    expect(inputByTestId("liner-alignment-id").value).toBe("alignment-before-cancel");
    expect(inputByTestId("liner-model-id").value).toBe("liner-before-cancel");
  }, 20000);
});
