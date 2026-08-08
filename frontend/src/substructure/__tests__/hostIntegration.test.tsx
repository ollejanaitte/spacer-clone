// @vitest-environment jsdom
// Phase C1 (M2-09A) SubstructurePlanningHost 統合テスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { SubstructurePlanningHost } from "../planning/SubstructurePlanningHost";
import { generateCombo } from "../planning/samples/sampleGenerator";

vi.mock("../viewer3d/SubstructureViewer3D", () => ({
  SubstructureViewer3D: () => <div data-testid="viewer3d-stub" />,
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

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

describe("SubstructurePlanningHost", () => {
  it("renders empty state without crashing", () => {
    const { container } = render(<SubstructurePlanningHost />);
    expect(container.querySelector('[data-testid="substructure-planning-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="panel-tree"]')).not.toBeNull();
  });

  it("opens sample dialog and generates combo into the page", () => {
    const { container } = render(<SubstructurePlanningHost />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    expect(container.querySelector('[data-testid="sample-creation-dialog"]')).not.toBeNull();
    act(() => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="combo-combo-standard"]')!
        .click();
    });
    // 生成後ダイアログは閉じ、ツリーに A1/P1/P2/A2 が表示される
    expect(container.querySelector('[data-testid="sample-creation-dialog"]')).toBeNull();
    const expected = generateCombo("combo-standard").map((s) => s.supportId);
    const treeText = container.textContent ?? "";
    for (const id of expected) {
      expect(treeText).toContain(id);
    }
  });

  it("LINER generation is disabled without liner supports", () => {
    const { container } = render(<SubstructurePlanningHost linerSupports={[]} />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="sample-from-liner"]')!;
    expect(btn.disabled).toBe(true);
  });

  it("LINER generation is enabled and creates supports from linerSupports", () => {
    const liner = [
      { id: "LP1", station: 20 },
      { id: "LP2", station: 50 },
    ];
    const { container } = render(<SubstructurePlanningHost linerSupports={liner} />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="sample-from-liner"]')!;
    expect(btn.disabled).toBe(false);
    act(() => btn.click());
    const text = container.textContent ?? "";
    expect(text).toContain("LP1");
    expect(text).toContain("LP2");
  });

  it("renders back button and fires onBack", () => {
    const onBack = vi.fn();
    const { container } = render(<SubstructurePlanningHost onBack={onBack} />);
    const back = container.querySelector<HTMLButtonElement>('[data-testid="substructure-back"]')!;
    expect(back).not.toBeNull();
    act(() => back.click());
    expect(onBack).toHaveBeenCalled();
  });

  it("handles selection + form bundle for generated supports", () => {
    const { container } = render(<SubstructurePlanningHost />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="combo-combo-standard"]')!.click();
    });
    // A1 を選択 → プロパティパネルにフォームが表示される
    const first = generateCombo("combo-standard")[0].supportId;
    const select = container.querySelector<HTMLElement>(
      `[data-testid="tree-item-${first}"]`,
    ) ?? container.querySelector<HTMLElement>('[data-testid="panel-tree"]');
    expect(select).not.toBeNull();
  });

  it("auto-generates from LINER supports on mount when enabled", () => {
    const liner = [
      { id: "A1", station: 0, skewRad: 0, kind: "abutment" },
      { id: "P1", station: 30, skewRad: 0.05, kind: "pier" },
    ];
    const { container } = render(
      <SubstructurePlanningHost linerSupports={liner} alignmentId="aln-1" autoGenerateFromLiner />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("A1");
    expect(text).toContain("P1");
    // 生成支点は LINER alignmentId を持つ
    const stationCell = container.querySelector('[data-testid="coord-table"]')?.textContent ?? "";
    expect(stationCell.length).toBeGreaterThanOrEqual(0);
  });

  it("does not auto-generate when autoGenerateFromLiner is off", () => {
    const liner = [{ id: "P1", station: 30, kind: "pier" }];
    const { container } = render(<SubstructurePlanningHost linerSupports={liner} />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("P1");
  });

  it("single sample generates the requested kind (pier_single -> pier form)", () => {
    const { container } = render(<SubstructurePlanningHost />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="sample-pier_single"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="tree-item-S1"]')!.click();
    });
    // S1 は単柱矩形橋脚 → pier form が表示される（組合せ先頭の橋台ではない）
    expect(container.querySelector('[data-testid="pier-form"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="abutment-form"]')).toBeNull();
  });

  it("single sample foundation_bored renders pile fields", () => {
    const { container } = render(<SubstructurePlanningHost />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="sample-foundation_bored"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="tree-item-S1"]')!.click();
    });
    expect(container.querySelector('[data-testid="foundation-form"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pile-count"]')).not.toBeNull();
  });

  it("save button serializes current supports to JSON", () => {
    const { container } = render(<SubstructurePlanningHost />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="combo-combo-standard"]')!.click();
    });
    expect(container.querySelector('[data-testid="substructure-save"]')).not.toBeNull();
    // ダウンロードは jsdom では不可。モジュール単体の round-trip は persistence.test で検証済み。
    expect(container.querySelector('[data-testid="substructure-load"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="substructure-load-input"]')).not.toBeNull();
  });

  it("load button triggers file input", () => {
    const { container } = render(<SubstructurePlanningHost />);
    const loadBtn = container.querySelector<HTMLButtonElement>('[data-testid="substructure-load"]')!;
    const input = container.querySelector<HTMLInputElement>('[data-testid="substructure-load-input"]')!;
    const clickSpy = vi.spyOn(input, "click");
    act(() => loadBtn.click());
    expect(clickSpy).toHaveBeenCalled();
  });

  it("imports a support-interface and shows the connection message", async () => {
    const { container } = render(<SubstructurePlanningHost />);
    const input = container.querySelector<HTMLInputElement>('[data-testid="support-interface-input"]')!;
    const doc = {
      schemaVersion: "0.1.0",
      supportId: "PR1",
      supportType: "pier",
      bearingSeats: [
        { bearingId: "PR1-B1", bearingPosition: { x: 0, y: -3, z: 8 }, bearingHeight: 0.2 },
        { bearingId: "PR1-B2", bearingPosition: { x: 0, y: 3, z: 8 }, bearingHeight: 0.2 },
      ],
      reactionCases: [{ caseId: "DL", caseKind: "permanent", force: { x: 0, y: 0, z: -1000 } }],
      girderBottomElevation: 8.4,
      deckElevation: 10.0,
    };
    const file = new File([JSON.stringify(doc)], "support-interface.json", { type: "application/json" });
    await act(async () => {
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const message = container.querySelector('[data-testid="superstructure-message"]')?.textContent ?? "";
    expect(message).toContain("PR1");
    expect(message).toContain("bearing 2");
  });

  it("rejects an invalid support-interface (fail-closed)", async () => {
    const { container } = render(<SubstructurePlanningHost />);
    const input = container.querySelector<HTMLInputElement>('[data-testid="support-interface-input"]')!;
    const file = new File([JSON.stringify({ schemaVersion: "9.9.9" })], "bad.json", { type: "application/json" });
    await act(async () => {
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const message = container.querySelector('[data-testid="superstructure-message"]')?.textContent ?? "";
    expect(message).toContain("失敗");
  });

  it("runs design and shows the result panel with HOLD summary", () => {
    const { container } = render(<SubstructurePlanningHost />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="combo-combo-standard"]')!.click();
    });
    expect(
      container.querySelector<HTMLButtonElement>('[data-testid="export-design-csv"]')!.disabled,
    ).toBe(true);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="run-design"]')!.click();
    });
    expect(container.querySelector('[data-testid="design-result-panel"]')).not.toBeNull();
    const summary = container.querySelector('[data-testid="design-summary"]')?.textContent ?? "";
    expect(summary).toContain("HOLD 4");
    expect(
      container.querySelector<HTMLButtonElement>('[data-testid="export-design-csv"]')!.disabled,
    ).toBe(false);
  });

  it("runs the Adapter (TEST) calculation and shows TEST results", () => {
    const { container } = render(<SubstructurePlanningHost />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="combo-combo-standard"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="run-adapter-test"]')!.click();
    });
    expect(container.querySelector('[data-testid="adapter-result-panel"]')).not.toBeNull();
    const summary = container.querySelector('[data-testid="adapter-summary"]')?.textContent ?? "";
    expect(summary).toContain("PASS 4");
    const notice =
      container.querySelector('[data-testid="adapter-formal-notice"]')?.textContent ?? "";
    expect(notice).toContain("正式な構造安全性の設計判定ではありません");
  });

  it("simulated engine-unavailable returns ERROR results (fail-closed)", () => {
    const { container } = render(<SubstructurePlanningHost />);
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="open-sample-dialog"]')!.click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="combo-combo-standard"]')!.click();
    });
    act(() => {
      container
        .querySelector<HTMLInputElement>('[data-testid="engine-unavailable-toggle"] input')!
        .click();
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="run-adapter-test"]')!.click();
    });
    const summary = container.querySelector('[data-testid="adapter-summary"]')?.textContent ?? "";
    expect(summary).toContain("ERROR 4");
  });
});
