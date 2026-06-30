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

function buttonByTestId(testId: string): HTMLButtonElement {
  const button = document.querySelector(`[data-testid=${testId}]`) as HTMLButtonElement | null;
  if (!button) {
    throw new Error(`Button not found: ${testId}`);
  }
  return button;
}

async function openLinerList() {
  await act(async () => {
    buttonByTestId("open-liner-list").click();
  });
}

async function createLinerSetup() {
  await openLinerList();
  await act(async () => {
    buttonByTestId("create-liner").click();
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

describe("App LINER delete integration", () => {
  it("deletes only LINER metadata and trace while preserving generated frame entities", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);
    await createLinerSetup();

    await act(async () => {
      buttonByTestId("open-liner-mapping-review").click();
    });
    await act(async () => {
      buttonByTestId("open-liner-viewer").click();
    });

    const generatedCounts = document.querySelector("[data-testid=mock-viewer3d]")?.textContent;
    expect(generatedCounts).toBeTruthy();
    expect(generatedCounts).not.toBe("0/0");

    await openLinerList();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => {
      buttonByTestId("delete-liner-model").click();
    });

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-testid=liner-list-empty]")).not.toBeNull();
    expect(document.querySelector("[data-testid=open-liner-setup]")).toBeNull();

    await act(async () => {
      buttonByTestId("close-liner-list").click();
    });

    expect(document.querySelector("[data-testid=mock-viewer3d]")?.textContent).toBe(generatedCounts);
  }, 20000);
});
