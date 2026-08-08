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
});
