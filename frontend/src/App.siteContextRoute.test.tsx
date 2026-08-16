// @vitest-environment jsdom
// Lane U Wave 1: App /pro/site-context route (site conditions entry page) integration test.
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

async function click(testId: string) {
  await act(async () => {
    query(testId)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

describe("App /pro/site-context route", () => {
  it("deep link renders the Site Context entry page with the workflow skeleton", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro/site-context");
    await render(<App />);
    expect(query("site-context-entry-page")).not.toBeNull();
    expect(query("canonical-workflow-nav")).not.toBeNull();
    expect(query("workflow-step-siteContext")).not.toBeNull();
    expect(query("workflow-step-road")).not.toBeNull();
    expect(query("workflow-step-bridgePlacement")).not.toBeNull();
    expect(query("workflow-step-superstructure")).not.toBeNull();
    expect(query("workflow-step-substructure")).not.toBeNull();
    expect(query("workflow-step-analysis")).not.toBeNull();
    expect(query("workflow-step-main3d")).not.toBeNull();
    expect(query("workflow-step-deliverables")).not.toBeNull();
    expect(query("workflow-step-saveClose")).not.toBeNull();
  });

  it("shows the empty-project guard when no project is loaded", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro/site-context");
    await render(<App />);
    expect(query("site-context-empty-guard")).not.toBeNull();
    expect(query("site-context-open-project")).not.toBeNull();
  });

  it("renders source cards and marks non-map sources as pending/disabled", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro/site-context");
    await render(<App />);
    expect(query("site-context-source-map")).not.toBeNull();
    const cad2d = query("site-context-source-cad2d") as HTMLButtonElement | null;
    const cad3d = query("site-context-source-cad3d") as HTMLButtonElement | null;
    const survey = query("site-context-source-survey") as HTMLButtonElement | null;
    expect(cad2d).not.toBeNull();
    expect(cad3d).not.toBeNull();
    expect(survey).not.toBeNull();
    expect(cad2d!.disabled).toBe(true);
    expect(cad3d!.disabled).toBe(true);
    expect(survey!.disabled).toBe(true);
  });

  it("navigates back to the App Shell via the back button", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro/site-context");
    await render(<App />);
    await click("site-context-back");
    expect(window.location.pathname).toBe("/pro");
  });

  it("workflow step buttons navigate to their canonical route", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro/site-context");
    await render(<App />);
    await click("workflow-step-road");
    expect(window.location.pathname).toBe("/pro/linear-coordinate");
  });

  it("route stays reachable via popstate after refresh-like navigation", async () => {
    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");
    await render(<App />);
    await navigate("/pro/site-context");
    expect(query("site-context-entry-page")).not.toBeNull();
    await navigate("/pro");
    expect(query("mock-viewer3d")).not.toBeNull();
  });
});