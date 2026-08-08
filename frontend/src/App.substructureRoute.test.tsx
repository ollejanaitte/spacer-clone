// @vitest-environment jsdom
// Phase C1 (M2-09A) App /pro/liner/substructure ルート統合テスト
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

function query(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid=${testId}]`);
}

async function navigate(path: string) {
  await act(async () => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
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

describe("App /pro/liner/substructure route", () => {
  it("deep link renders SubstructurePlanningHost without crash (no liner draft)", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro/liner/substructure");
    await render(<App />);
    expect(query("substructure-planning-page")).not.toBeNull();
    expect(query("open-sample-dialog")).not.toBeNull();
  });

  it("back button navigates to LINER setup", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro/liner/substructure");
    await render(<App />);
    await act(async () => {
      query("substructure-back")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(window.location.pathname).toBe("/pro/liner/setup");
  });

  it("substructure route is reachable after entering LINER setup", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro/liner");
    await render(<App />);
    await navigate("/pro/liner/substructure");
    expect(query("substructure-planning-page")).not.toBeNull();
  });
});
