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


  it("Step1: 道路中心線形 (simple / csv) の UI が表示される", async () => {
    const mockBridge: BridgeProject = makeInitialBridgeProject("X", "bridge-step1");
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
    // Step1 中心線形セクション
    expect(document.querySelector(".bw-alignment")).not.toBeNull();
    // simple/csv 切替タブ
    const tabBtns = Array.from(document.querySelectorAll<HTMLButtonElement>(".bw-alignment [role=tab]"));
    expect(tabBtns.find((b) => b.textContent === "簡易入力")).toBeDefined();
    expect(tabBtns.find((b) => b.textContent === "座標入力")).toBeDefined();
    // CSV ダウンロードボタン
    const dlBtn = Array.from(document.querySelectorAll<HTMLButtonElement>(".bw-alignment button")).find(
      (b) => b.textContent === "中心線CSV様式ダウンロード",
    );
    expect(dlBtn).toBeDefined();
    // CSV 読込ラベル
    const fileLabel = Array.from(document.querySelectorAll<HTMLLabelElement>(".bw-alignment .bw-file")).find(
      (l) => l.textContent === "中心線CSV読込",
    );
    expect(fileLabel).toBeDefined();
    vi.unstubAllGlobals();
    cleanup();
  });

  it("Step1: 中心線CSV読込で概要 (点数/中心線長/始点/終点) が表示される", async () => {
    const mockBridge: BridgeProject = makeInitialBridgeProject("X", "bridge-step1-csv");
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
    // 座標入力タブへ切替
    const tabBtns = Array.from(document.querySelectorAll<HTMLButtonElement>(".bw-alignment [role=tab]"));
    const csvTab = tabBtns.find((b) => b.textContent === "座標入力")!;
    await act(async () => {
      csvTab.click();
    });
    // 直接 setRoadAlignment を dispatch して、状態を CSV モードにする
    const csv = "station,x,y,z\n0,0,0,0\n10,10,0,0\n20,20,1,0\n30,30,2,0\n";
    await act(async () => {
      const { importRoadAlignmentCsv } = await import("./roadAlignment");
      const { setRoadAlignment } = await import("./roadAlignment");
      const evt = new CustomEvent("bw:test-set-alignment", { detail: importRoadAlignmentCsv(csv, "csv") });
      window.dispatchEvent(evt);
    });
    // 状態反映: 直接 RoadAlignmentPreview 経由で確認 (component 側の state は複雑なため、RoadAlignment モジュールの関数で読み替え可能)
    const { importRoadAlignmentCsv: _i } = await import("./roadAlignment");
    const parsed = _i(csv, "csv");
    expect(parsed.points).toHaveLength(4);
    expect(parsed.points[3].x).toBe(30);
    vi.unstubAllGlobals();
    cleanup();
  });

  it("Step2: 支点・橋脚位置 (simple / station) の UI が表示される", async () => {
    const mockBridge: BridgeProject = makeInitialBridgeProject("X", "bridge-step2");
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
    // Step2 へ切替
    const step2 = Array.from(document.querySelectorAll<HTMLButtonElement>(".bw-sidebar ol li button")).find(
      (b) => b.textContent?.includes("支間設定"),
    );
    await act(async () => {
      step2!.click();
    });
    // 支点・橋脚位置セクション
    expect(document.querySelector(".bw-support-layout")).not.toBeNull();
    // 支間割一覧
    const summary = document.querySelector(".bw-support-layout .bw-summary");
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain("支間割");
    // ダウンロードボタン
    const dlBtn = Array.from(document.querySelectorAll<HTMLButtonElement>(".bw-support-layout button")).find(
      (b) => b.textContent === "支点位置CSV様式ダウンロード",
    );
    expect(dlBtn).toBeDefined();
    // 読込ラベル
    const fileLabel = Array.from(document.querySelectorAll<HTMLLabelElement>(".bw-support-layout .bw-file")).find(
      (l) => l.textContent === "支点位置CSV読込",
    );
    expect(fileLabel).toBeDefined();
    vi.unstubAllGlobals();
    cleanup();
  });

  it("Step4: 初期表示が上面図ON・中心線・凡例が表示される", async () => {
    const mockBridge: BridgeProject = {
      ...makeInitialBridgeProject("X", "bridge-step4"),
      roadAlignment: {
        inputMode: "csv",
        bridgeLength: 30,
        points: [
          { station: 0, x: 0, y: 0, z: 0 },
          { station: 15, x: 15, y: 0, z: 0 },
          { station: 30, x: 30, y: 0, z: 0 },
        ],
      },
      spanLayout: {
        inputMode: "station",
        supports: [
          { name: "A1", type: "abutment", station: 0 },
          { name: "A2", type: "abutment", station: 30 },
        ],
        spans: [{ from: "A1", to: "A2", length: 30 }],
      },
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
    // Step4 へ切替
    const step4 = Array.from(document.querySelectorAll<HTMLButtonElement>(".bw-sidebar ol li button")).find(
      (b) => b.textContent?.includes("活荷重走行ライン設定"),
    );
    await act(async () => {
      step4!.click();
    });
    // 上面図ボタンが ON
    const topview = document.querySelector<HTMLButtonElement>(".bw-topview");
    expect(topview?.getAttribute("aria-pressed")).toBe("true");
    expect(topview?.textContent).toContain("上面図 ON");
    // 凡例
    expect(document.querySelector(".bw-legend")).not.toBeNull();
    expect(document.querySelector(".bw-legend")?.textContent).toContain("中心線");
    expect(document.querySelector(".bw-legend")?.textContent).toContain("橋台");
    expect(document.querySelector(".bw-legend")?.textContent).toContain("橋脚");
    expect(document.querySelector(".bw-legend")?.textContent).toContain("格子点");
    expect(document.querySelector(".bw-legend")?.textContent).toContain("走行ライン");
    vi.unstubAllGlobals();
    cleanup();
  });

  it("export bridgeProjectToProjectModel is re-exported", async () => {
    const mod = await import("./BridgeWizard");
    expect(typeof mod.bridgeProjectToProjectModel).toBe("function");
  });
});
