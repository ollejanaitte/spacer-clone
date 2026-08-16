// @vitest-environment jsdom
// Lane U Wave 2 U-4: Site Context → Road → Bridge workflow on the SAME Project.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/client", () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    loadAutosaveCandidate: vi.fn().mockResolvedValue({ exists: false }),
    autosaveProject: vi.fn().mockResolvedValue({ ok: true }),
  },
  resolveApiUrl: (path: string) => path,
}));

vi.mock("../../viewer/Viewer3D", () => ({
  Viewer3D: () => <div data-testid="mock-viewer3d" />,
}));
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useThree: () => ({}),
}));
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
}));
vi.mock("../../viewer/threeUtils", () => ({
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

async function click(testId: string) {
  await act(async () => {
    query(testId)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function projectIdFrom(card: HTMLElement | null): string | null {
  if (!card) return null;
  const match = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.exec(card.textContent ?? "");
  return match ? match[1] : null;
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

describe("App Road/Bridge workflow (U-4)", () => {
  it("navigating Site Context → Road → Bridge keeps the same project id", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/site-context");
    await render(<App />);
    expect(query("site-context-entry-page")).not.toBeNull();

    await navigate("/pro/workflow/road");
    const roadCard = query("road-workflow-project-card");
    expect(roadCard).not.toBeNull();
    const roadProjectId = projectIdFrom(roadCard);
    expect(roadProjectId).not.toBeNull();
    await click("road-workflow-place");

    await navigate("/pro/workflow/bridge");
    const bridgeCard = query("bridge-workflow-project-card");
    expect(bridgeCard).not.toBeNull();
    const bridgeProjectId = projectIdFrom(bridgeCard);
    expect(bridgeProjectId).toBe(roadProjectId);
  });

  it("data entered in Road (placed alignment) appears in the Bridge context", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/workflow/road");
    await render(<App />);

    expect(query("road-workflow-placement")).not.toBeNull();
    await click("road-workflow-place");
    expect(query("road-workflow-placed")).not.toBeNull();

    await navigate("/pro/workflow/bridge");
    const context = query("bridge-workflow-context");
    expect(context).not.toBeNull();
    expect(context?.textContent).toContain("RB001-ROAD-1");
    const spanRow = query("bridge-workflow-span-config");
    expect(spanRow?.textContent).toContain("50.0");
  });

  it("Bridge span arrangement can be confirmed onto the same Project", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/workflow/road");
    await render(<App />);
    await click("road-workflow-place");
    await navigate("/pro/workflow/bridge");

    expect(query("bridge-workflow-arrangement")).not.toBeNull();
    expect(query("bridge-workflow-spans")).not.toBeNull();
    expect(query("bridge-workflow-piers")).not.toBeNull();

    await click("bridge-workflow-confirm-button");
    expect(query("bridge-workflow-placed")).not.toBeNull();
  });

  it("back/forward/refresh-like navigation restores route + project without reset", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/workflow/road");
    await render(<App />);
    await click("road-workflow-place");
    const roadProjectId = projectIdFrom(query("road-workflow-project-card"));

    await navigate("/pro/workflow/bridge");
    await click("bridge-workflow-confirm-button");
    expect(query("bridge-workflow-placed")).not.toBeNull();

    await navigate("/pro/workflow/road");
    await navigate("/pro/workflow/bridge");

    expect(query("bridge-workflow-project-card")).not.toBeNull();
    expect(projectIdFrom(query("bridge-workflow-project-card"))).toBe(roadProjectId);
    expect(query("bridge-workflow-placed")).not.toBeNull();

    await navigate("/pro/site-context");
    expect(query("site-context-page")).not.toBeNull();
    expect(projectIdFrom(query("site-context-project-card"))).toBe(roadProjectId);
  });

  it("legacy routes are unaffected (LINER launcher / site-context entry)", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/linear-coordinate");
    await render(<App />);
    expect(query("liner-launcher-page")).not.toBeNull();

    await navigate("/pro/site-context");
    expect(query("site-context-entry-page")).not.toBeNull();

    await navigate("/pro");
    expect(query("mock-viewer3d")).not.toBeNull();
  });
});