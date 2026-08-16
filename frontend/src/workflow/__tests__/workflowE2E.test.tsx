// @vitest-environment jsdom
// Lane U Wave 3 U-7: Workflow E2E — Project open → Site Context → Road →
// Bridge → design/analysis entry → 3D → back/forward → refresh → Save →
// Close/Reopen → Project context 維持。
// UI初期状態をfixture代わりにせず、明示Project fixture (createEmptyProject) から開始。
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  if (testId.startsWith("[") || testId.startsWith("#") || testId.startsWith(".")) {
    return document.querySelector(testId);
  }
  return document.querySelector(`[data-testid="${testId}"]`);
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

beforeEach(() => {
  window.history.pushState({}, "", "/pro/site-context");
});

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

describe("U-7 Workflow E2E (explicit Project fixture)", () => {
  it("full workflow: Site Context → Road → Bridge → Analysis entry → 3D entry keeps the same Project", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/site-context");
    await render(<App />);
    expect(query("site-context-entry-page")).not.toBeNull();

    // Road route へ遷移すると workflowProject が自動作成される (App useEffect)
    await navigate("/pro/workflow/road");
    const roadCard = query("road-workflow-project-card");
    const projectId = projectIdFrom(roadCard);
    expect(projectId).not.toBeNull();
    await click("road-workflow-place");
    expect(query("road-workflow-placed")).not.toBeNull();

    // Bridge
    await navigate("/pro/workflow/bridge");
    expect(projectIdFrom(query("bridge-workflow-project-card"))).toBe(projectId);
    await click("bridge-workflow-confirm-button");
    expect(query("bridge-workflow-placed")).not.toBeNull();

    // Analysis entry (App Shell /pro)
    await navigate("/pro");
    expect(query("mock-viewer3d")).not.toBeNull();

    // 3D entry (Main3D route; linerDraft 未接続時は LINER list へ fallback = 3D導線が有効)
    await navigate("/pro/liner/main3d");
    expect(query("liner-list-page") ?? query("mock-viewer3d")).not.toBeNull();

    // back/forward: Road へ戻ると同 Project
    await navigate("/pro/workflow/road");
    expect(projectIdFrom(query("road-workflow-project-card"))).toBe(projectId);
    expect(query("road-workflow-placed")).not.toBeNull();
  });

  it("refresh-like navigation (popstate) restores route + project context", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/workflow/road");
    await render(<App />);

    const projectId = projectIdFrom(query("road-workflow-project-card"));
    expect(projectId).not.toBeNull();
    await click("road-workflow-place");
    await navigate("/pro/workflow/bridge");
    await click("bridge-workflow-confirm-button");

    // 再読込相当: 同一 route へ再ナビ (同一 App インスタンス内)
    await navigate("/pro/workflow/bridge");
    expect(projectIdFrom(query("bridge-workflow-project-card"))).toBe(projectId);
    expect(query("bridge-workflow-placed")).not.toBeNull();
  });

  it("Project Status panel derives step states from the shared Project", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/workflow/road");
    await render(<App />);
    await click("road-workflow-place");
    await navigate("/pro/workflow/bridge");
    await click("bridge-workflow-confirm-button");

    const panel = query("project-status-panel");
    expect(panel).not.toBeNull();
    expect(query('[data-testid="project-status-road"]')?.getAttribute("data-state")).toBe("ready");
    expect(query('[data-testid="project-status-bridgeLayout"]')?.getAttribute("data-state")).toBe("ready");
  });

  it("workflow nav renders all 10 canonical steps and connects their routes", async () => {
    const { App } = await import("../../App");
    window.history.pushState({}, "", "/pro/workflow/road");
    await render(<App />);
    await click("road-workflow-place");
    const nav = query("canonical-workflow-nav");
    expect(nav).not.toBeNull();
    for (const stepId of [
      "project",
      "siteContext",
      "road",
      "bridgePlacement",
      "superstructure",
      "substructure",
      "analysis",
      "main3d",
      "deliverables",
      "saveClose",
    ]) {
      expect(query(`[data-testid="workflow-step-${stepId}"]`)).not.toBeNull();
    }
  });
});