// @vitest-environment jsdom
// Phase C1 (M2-09B) LINER review タブ → 下部工計画 画面遷移統合テスト
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
  Viewer3D: () => <div data-testid="mock-viewer3d" />,
}));

vi.mock("./substructure/viewer3d/SubstructureViewer3D", () => ({
  SubstructureViewer3D: () => <div data-testid="viewer3d-stub" />,
}));
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useThree: () => ({}),
}));
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
}));
vi.mock("./viewer/threeUtils", () => ({
  resolveOrbitControlsBindings: () => ({}),
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
  if (!button) throw new Error(`Button not found: ${testId}`);
  return button;
}

async function createLinerSetup() {
  await act(async () => {
    window.history.pushState({}, "", "/pro/liner");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await act(async () => {
    buttonByTestId("create-liner").click();
  });
  await act(async () => {
    buttonByTestId("liner-launcher-gui").click();
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

describe("App LINER review → substructure navigation", () => {
  it("reaches the substructure planning page from the review tab entry", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");
    await render(<App />);
    await createLinerSetup();

    expect(window.location.pathname).toBe("/pro/liner/setup");

    await act(async () => {
      buttonByTestId("liner-setup-tab-review").click();
    });
    expect(document.querySelector("[data-testid=open-substructure-planning]")).not.toBeNull();

    await act(async () => {
      buttonByTestId("open-substructure-planning").click();
    });

    expect(window.location.pathname).toBe("/pro/liner/substructure");
    expect(document.querySelector("[data-testid=substructure-planning-page]")).not.toBeNull();
  }, 40000);
});
