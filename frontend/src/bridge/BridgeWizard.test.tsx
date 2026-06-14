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
    // 初期は上面図 ON
    const topview = document.querySelector<HTMLButtonElement>(".bw-topview");
    expect(topview).not.toBeNull();
    expect(topview?.getAttribute("aria-pressed")).toBe("true");
    expect(topview?.textContent).toContain("上面図 ON");
    // 説明文ボックス
    expect(document.querySelector(".bw-explain")).not.toBeNull();
    expect(document.querySelector(".bw-explain")?.textContent).toContain("格子点");
    // draw_line に切替
    const drawLineBtn = Array.from(document.querySelectorAll<HTMLButtonElement>(".bw-mode")).find(
      (b) => b.textContent === "draw_line",
    );
    expect(drawLineBtn).toBeDefined();
    await act(async () => {
      drawLineBtn!.click();
    });
    expect(drawLineBtn?.getAttribute("aria-pressed")).toBe("true");
    // bw:pick-message を「格子点をクリックしてください」で発火
    await act(async () => {
      window.dispatchEvent(new CustomEvent("bw:pick-message", { detail: { text: "格子点をクリックしてください" } }));
    });
    expect(document.querySelector(".bw-viewer-toast")?.textContent).toContain("格子点をクリックしてください");
    vi.unstubAllGlobals();
    cleanup();
  });

  it("Step4 survives SPACER-coordinate-mode toggle (display-only)", async () => {
    // 既存 Viewer3D の SPACER 座標系表示トグル(localStorage) が ON でも
    // Step4 のレンダリングが例外を出さず、ヘッダ・説明文・上面図ボタンが
    // 存在することを保証する(モデルデータは触らない)。
    const STORAGE_KEY = "spacerClone.viewerCoordinateMode";
    window.localStorage.setItem(STORAGE_KEY, "spacer");
    const mockBridge: BridgeProject = {
      ...makeInitialBridgeProject("X", "bridge-spacer"),
      lines: [
        {
          id: "line-pre-1",
          type: "traffic",
          name: "既存走行ライン",
          points: [
            [0, 0, 0],
            [10, 0, 0],
          ],
        },
      ],
    };
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
    const step4 = Array.from(document.querySelectorAll<HTMLButtonElement>(".bw-sidebar ol li button")).find(
      (b) => b.textContent?.includes("活荷重走行ライン設定"),
    );
    await act(async () => {
      step4!.click();
    });
    // ライン一覧に既存ラインが復元される
    const rows = document.querySelectorAll(".bw-line-row");
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain("走行ライン");
    expect(rows[0].textContent).toContain("既存走行ライン");
    // 上面図ボタンは引き続き ON
    const topview = document.querySelector<HTMLButtonElement>(".bw-topview");
    expect(topview?.getAttribute("aria-pressed")).toBe("true");
    window.localStorage.removeItem(STORAGE_KEY);
    vi.unstubAllGlobals();
    cleanup();
  });

  it("export bridgeProjectToProjectModel is re-exported", async () => {
    const mod = await import("./BridgeWizard");
    expect(typeof mod.bridgeProjectToProjectModel).toBe("function");
  });
});
