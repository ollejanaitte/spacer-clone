// @vitest-environment jsdom
// Phase C1 (M2-05) リアルタイム2D/3D更新フック テスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect } from "vitest";
import {
  REALTIME_3D_DEBOUNCE_MS,
  useSubstructureRealtimeUpdate,
  makeSnapshots,
  type RealtimeOutput,
} from "../planning/useSubstructureRealtimeUpdate";
import type { Support } from "../model";

function support(id: string, width = 1.2, height = 7, station = 0): Support {
  return {
    supportId: id,
    supportType: "pier",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "aln", station, offset: 0 },
    bearingSeats: [],
    pier: {
      id,
      formType: "single_column_rect",
      column: { id: `${id}-C`, width, depth: 1.6, height },
      cap: { id: `${id}-CAP`, width: 1.6, depth: 8, height: 1.2, overhangL: 0, overhangR: 0 },
      footing: { id: `${id}-F`, length: 6, width: 8, thickness: 1.8, topElevation: 0 },
    },
  };
}

function invalidSupport(): Support {
  return support("BAD", 0, 0, 0); // width=0 → buildPierSolids throws
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ホストコンポーネント経由でフックをラップし、最新 output を取得する。 */
function mountHook(initial: readonly Support[]) {
  let latest: RealtimeOutput | null = null;
  let hostSupports = initial;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  function Host({ supports }: { supports: readonly Support[] }) {
    latest = useSubstructureRealtimeUpdate(supports);
    return null;
  }

  act(() => {
    root.render(<Host supports={hostSupports} />);
  });

  return {
    get latest() {
      return latest;
    },
    rerender(next: readonly Support[]) {
      hostSupports = next;
      act(() => {
        root.render(<Host supports={hostSupports} />);
      });
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("useSubstructureRealtimeUpdate", () => {
  it("2D projections update immediately on input change", async () => {
    const h = mountHook([support("P1")]);
    expect(h.latest!.projections).toHaveLength(1);

    h.rerender([support("P1"), support("P2", 1.5, 8, 60)]);
    // 2D は即時（フック render 直後）
    expect(h.latest!.projections).toHaveLength(2);
    h.unmount();
  });

  it("3D groups update after 300ms debounce", async () => {
    const h = mountHook([support("P1")]);
    const initialGroups = h.latest!.groups;
    expect(initialGroups).toHaveLength(1);

    h.rerender([support("P1", 2.5, 9, 10)]);
    // debounce 前は古いグループ参照
    expect(h.latest!.groups).toBe(initialGroups);

    await sleep(REALTIME_3D_DEBOUNCE_MS + 200);
    await act(async () => {
      await Promise.resolve();
    });
    const col = h.latest!.groups[0]?.solids.find((n) => n.id === "P1-COLUMN");
    expect(col?.localSize.y).toBe(2.5);
    h.unmount();
  });

  it("rapid input regenerates 3D once (debounced)", async () => {
    const h = mountHook([support("P1")]);
    await sleep(REALTIME_3D_DEBOUNCE_MS + 100);
    await act(async () => {});
    const before = h.latest!.regenCount;

    // 連続入力（debounce 未満で間隔）
    h.rerender([support("P1", 2.0)]);
    await sleep(60);
    h.rerender([support("P1", 3.0)]);
    await sleep(60);
    h.rerender([support("P1", 4.0)]);
    await sleep(60);
    h.rerender([support("P1", 5.0)]);

    await sleep(REALTIME_3D_DEBOUNCE_MS + 200);
    await act(async () => {});
    // 最後の入力のみ1回反映
    expect(h.latest!.regenCount).toBe(before + 1);
    const col = h.latest!.groups[0]?.solids.find((n) => n.id === "P1-COLUMN");
    expect(col?.localSize.y).toBe(5.0);
    h.unmount();
  }, 10000);

  it("FATAL input stops 3D generation and recovery resumes", async () => {
    const h = mountHook([support("P1")]);
    await sleep(REALTIME_3D_DEBOUNCE_MS + 100);
    await act(async () => {});

    h.rerender([invalidSupport()]);
    await sleep(REALTIME_3D_DEBOUNCE_MS + 200);
    await act(async () => {});
    expect(h.latest!.generationBlocked).toBe(true);
    expect(h.latest!.groups).toHaveLength(0);

    h.rerender([support("P1", 2.0)]);
    await sleep(REALTIME_3D_DEBOUNCE_MS + 200);
    await act(async () => {});
    expect(h.latest!.generationBlocked).toBe(false);
    expect(h.latest!.groups).toHaveLength(1);
    h.unmount();
  }, 10000);

  it("no duplicate objects: 3D groups match supports count", async () => {
    const h = mountHook([support("P1"), support("P2"), support("P3")]);
    await sleep(REALTIME_3D_DEBOUNCE_MS + 100);
    await act(async () => {});
    expect(h.latest!.groups).toHaveLength(3);
    h.unmount();
  });
});

describe("makeSnapshots", () => {
  it("builds snapshot per support with placement values", () => {
    const map = makeSnapshots([support("P1", 1.2, 7, 100)]);
    const snap = map.get("P1")!;
    expect(snap.position.x).toBe(100);
    expect(snap.source).toBe("liner");
  });
});
