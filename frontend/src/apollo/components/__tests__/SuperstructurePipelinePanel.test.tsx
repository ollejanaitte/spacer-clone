// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { SuperstructurePipelinePanel } from "../SuperstructurePipelinePanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
  vi.restoreAllMocks();
});

function renderPanel() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(
      <Harness>
        <SuperstructurePipelinePanel />
      </Harness>,
    );
  });
  return container;
}

function Harness({ children }: { children: React.ReactNode }): React.ReactNode {
  const [, setTick] = useState(0);
  return children;
}

function click(container: HTMLElement, text: string): void {
  const button = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  );
  if (!button) throw new Error(`button not found: ${text}`);
  act(() => {
    button.click();
  });
}

describe("SuperstructurePipelinePanel (STEP 3)", () => {
  it("runs Geometry generation and shows the snapshot summary", () => {
    const container = renderPanel();
    click(container, "Geometry 生成");
    const ok = container.querySelector('[data-testid="pipeline-geometry"] .pipeline-ok');
    expect(ok).toBeTruthy();
    expect(ok!.textContent).toContain("supports=4");
    expect(ok!.textContent).toContain("hold=50");
    expect(ok!.textContent).toContain("fingerprint=fnv1a32:");
  });

  it("runs 3D model generation after Geometry", () => {
    const container = renderPanel();
    click(container, "Geometry 生成");
    click(container, "3D モデル生成");
    const ok = container.querySelector('[data-testid="pipeline-3d"] .pipeline-ok');
    expect(ok).toBeTruthy();
    expect(ok!.textContent).toContain("solid parameters=");
    const count = container.querySelector('[data-testid="pipeline-solid-count"]');
    expect(count!.textContent).toContain("solid=15"); // 2 girders + 1 deck + 4 cross-beams + 8 bearings
  });

  it("runs design and reports PENDING_AUTHORIZATION", () => {
    const container = renderPanel();
    click(container, "Geometry 生成");
    click(container, "設計実行");
    const ok = container.querySelector('[data-testid="pipeline-design"] .pipeline-ok');
    expect(ok).toBeTruthy();
    expect(ok!.textContent).toContain("PENDING_AUTHORIZATION");
    expect(ok!.textContent).toContain("NOT_GRANTED");
  });

  it("runs replay and reports PASS", () => {
    const container = renderPanel();
    click(container, "Geometry 生成");
    click(container, "Replay 実行");
    const ok = container.querySelector('[data-testid="pipeline-replay"] .pipeline-ok');
    expect(ok).toBeTruthy();
    expect(ok!.textContent).toContain("verdict=PASS");
  });

  it("runs analysis against the backend and reports the authorization", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ authorization: "NOT_GRANTED" }),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);
    const container = renderPanel();
    click(container, "Geometry 生成");
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent?.includes("解析実行"))
        ?.click();
    });
    await act(async () => {});
    const ok = container.querySelector('[data-testid="pipeline-analysis"] .pipeline-ok');
    expect(ok).toBeTruthy();
    expect(ok!.textContent).toContain("authorization=NOT_GRANTED");
    vi.unstubAllGlobals();
  });
});
