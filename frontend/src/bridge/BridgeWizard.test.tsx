// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BridgeWizard } from "./BridgeWizard";
import { makeInitialBridgeProject } from "./BridgeWizardState";
import type { BridgeFemResponse, BridgeProject } from "./types";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class FakeRenderer {
    domElement: HTMLCanvasElement = document.createElement("canvas");
    setPixelRatio() {}
    setSize() {}
    render() {}
    dispose() {}
  }
  function FakeWebGLRenderer() {
    return new FakeRenderer();
  }
  return {
    ...actual,
    WebGLRenderer: FakeWebGLRenderer,
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver = ResizeObserverPolyfill;
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
});

function cleanup() {
  act(() => {
    root?.unmount();
  });
  root = null;
  host?.remove();
  host = null;
}

describe("BridgeWizard", () => {
  it("renders nothing when open is false", async () => {
    await act(async () => {
      root = createRoot(host!); root.render(<BridgeWizard open={false} onClose={() => {}} onCommit={() => {}} />);
    });
    expect(document.querySelector(".bw-modal")).toBeNull();
    cleanup();
  });

  it("renders header progress when open", async () => {
    const mockBridge: BridgeProject = makeInitialBridgeProject("X", "bridge-x");
    const fetchMock = vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/api/bridge/template")) {
        return Promise.resolve(new Response(JSON.stringify({ project: mockBridge }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => {
      root = createRoot(host!);
      root.render(<BridgeWizard open={true} onClose={() => {}} onCommit={() => {}} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(document.querySelector(".bw-modal")).not.toBeNull();
    expect(document.querySelector(".bw-step-counter")?.textContent).toContain("Step 1 / 6");
    expect(document.querySelector(".bw-step-title")?.textContent).toContain("道路条件");
    vi.unstubAllGlobals();
    cleanup();
  });

  it("switches steps via the sidebar", async () => {
    const mockBridge: BridgeProject = makeInitialBridgeProject("X", "bridge-x");
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/api/bridge/template")) {
        return Promise.resolve(new Response(JSON.stringify({ project: mockBridge }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    }));
    await act(async () => {
      root = createRoot(host!);
      root.render(<BridgeWizard open={true} onClose={() => {}} onCommit={() => {}} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const stepButtons = document.querySelectorAll<HTMLButtonElement>(".bw-sidebar ol li button");
    expect(stepButtons.length).toBe(6);
    const step4 = Array.from(stepButtons).find((b) => b.textContent?.includes("活荷重走行ライン設定"));
    expect(step4).toBeDefined();
    await act(async () => {
      step4!.click();
    });
    expect(document.querySelector(".bw-step-counter")?.textContent).toContain("Step 4 / 6");
    expect(document.querySelector(".bw-step-line")).not.toBeNull();
    vi.unstubAllGlobals();
    cleanup();
  });

  it("export bridgeProjectToProjectModel is re-exported", async () => {
    const mod = await import("./BridgeWizard");
    expect(typeof mod.bridgeProjectToProjectModel).toBe("function");
  });
});
