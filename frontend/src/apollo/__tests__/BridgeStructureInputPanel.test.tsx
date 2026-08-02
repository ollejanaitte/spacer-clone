// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { createDefaultProject } from "../../data/defaultProject";
import type { ProjectModel } from "../../types";
import {
  getBridgeStructureInputDraft,
  withBridgeStructureField,
  withBridgeStructureSystem,
  BridgeSystem,
} from "../bridgeStructure";
import { BridgeStructureInputPanel } from "../components/BridgeStructureInputPanel";
import { fillContinuousBridgeStructureInput } from "../testing/bridgeStructureFixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
});

function setInputValue(input: HTMLInputElement, value: string) {
  act(() => {
    input.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.blur();
  });
}

function fillValidInput(project: ProjectModel): ProjectModel {
  return fillContinuousBridgeStructureInput(project);
}

function renderPanel(initialProject: ProjectModel = createDefaultProject()) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });

  function Harness() {
    const [project, setProject] = useState(initialProject);
    return (
      <BridgeStructureInputPanel
        project={project}
        onProjectChange={setProject}
      />
    );
  }

  act(() => {
    root.render(<Harness />);
  });
  return container;
}

describe("BridgeStructureInputPanel (Visible Vertical Slice input UI)", () => {
  it("renders all required bridge structure input fields", () => {
    const container = renderPanel();
    expect(container.querySelector("[data-testid='apollo-bridge-structure-panel']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-generate-structure']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-structure-quantities']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-input-spanLength']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-input-bridgeLength']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-input-width']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-input-girderCount']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-input-girderSpacing']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-input-girderDepth']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-input-deckThickness']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-input-crossBeamSpacing']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-structure-not-generated']")).not.toBeNull();
  });

  it("shows INCOMPLETE quantity status before input is complete", () => {
    const container = renderPanel();
    const incompleteRow = container.querySelector("[data-testid='apollo-quantity-row-概算数量']");
    expect(incompleteRow).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-quantity-status-概算数量']")?.textContent).toBe(
      "INCOMPLETE",
    );
  });

  it("generates StructuralDesignModel and NOT_AUTHORIZED quantities from the panel", () => {
    const container = renderPanel(fillValidInput(createDefaultProject()));

    act(() => {
      const button = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      button.click();
    });

    expect(container.querySelector("[data-testid='apollo-bridge-structure-sdm-summary']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-structure-not-generated']")).toBeNull();
    expect(container.textContent).toContain("主桁: 4 件（designStatus: NOT_AUTHORIZED）");
    expect(container.textContent).toContain("RC床版: 1 件（designStatus: NOT_AUTHORIZED）");
    expect(container.textContent).toContain("nonCompositeAssertion.compositeAction: false");
    expect(container.querySelector("[data-testid='apollo-bridge-structure-main-girder-status']")?.textContent).toBe(
      "主桁1: NOT_AUTHORIZED",
    );
    expect(container.querySelector("[data-testid='apollo-quantity-status-床版体積（概算）']")?.textContent).toBe(
      "NOT_AUTHORIZED",
    );
    expect(container.querySelector("[data-testid='apollo-bridge-structure-message']")?.textContent).toContain(
      "構造設計モデルを生成しました",
    );
  });

  it("commits nullable field edits through CompositionAwareInput blur", () => {
    const container = renderPanel();
    const bridgeLengthInput = container.querySelector(
      "[data-testid='apollo-bridge-input-bridgeLength']",
    ) as HTMLInputElement;
    act(() => {
      setInputValue(bridgeLengthInput, "200");
    });
    expect(bridgeLengthInput.value).toBe("200");
  });

  it("shows stale message and INCOMPLETE quantities after generate-then-edit", () => {
    const container = renderPanel(fillValidInput(createDefaultProject()));

    act(() => {
      const button = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      button.click();
    });
    expect(container.querySelector("[data-testid='apollo-bridge-structure-stale-message']")).toBeNull();
    expect(container.querySelector("[data-testid='apollo-quantity-status-床版体積（概算）']")?.textContent).toBe(
      "NOT_AUTHORIZED",
    );

    const girderCountInput = container.querySelector(
      "[data-testid='apollo-bridge-input-girderCount']",
    ) as HTMLInputElement;
    act(() => {
      setInputValue(girderCountInput, "5");
    });

    expect(container.querySelector("[data-testid='apollo-bridge-structure-stale-message']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-bridge-structure-stale-message']")?.textContent).toContain(
      "入力が変更されました",
    );
    expect(container.querySelector("[data-testid='apollo-quantity-status-概算数量']")?.textContent).toBe(
      "INCOMPLETE",
    );
  });

  it("recovers NOT_AUTHORIZED quantities after regenerating stale input", () => {
    const container = renderPanel(fillValidInput(createDefaultProject()));

    act(() => {
      const button = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      button.click();
    });

    const girderCountInput = container.querySelector(
      "[data-testid='apollo-bridge-input-girderCount']",
    ) as HTMLInputElement;
    act(() => {
      setInputValue(girderCountInput, "2");
    });
    act(() => {
      const button = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      button.click();
    });

    expect(container.querySelector("[data-testid='apollo-bridge-structure-stale-message']")).toBeNull();
    expect(container.textContent).toContain("主桁: 2 件");
    expect(container.querySelector("[data-testid='apollo-quantity-status-床版体積（概算）']")?.textContent).toBe(
      "NOT_AUTHORIZED",
    );
  });

  it("renders upper and lower lateral bracing checkboxes and toggles them", () => {
    const container = renderPanel();
    const lower = container.querySelector(
      "[data-testid='apollo-bridge-input-lateralBracingEnabled']",
    ) as HTMLInputElement;
    const upper = container.querySelector(
      "[data-testid='apollo-bridge-input-upperLateralBracingEnabled']",
    ) as HTMLInputElement;
    expect(lower).not.toBeNull();
    expect(upper).not.toBeNull();
    expect(lower.checked).toBe(false);
    expect(upper.checked).toBe(false);

    act(() => {
      lower.click();
    });
    expect(lower.checked).toBe(true);

    act(() => {
      upper.click();
    });
    expect(upper.checked).toBe(true);
  });

  it("shows section properties when the input is complete and generation is current", () => {
    const container = renderPanel(fillValidInput(createDefaultProject()));
    act(() => {
      const button = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      button.click();
    });

    expect(container.querySelector("[data-testid='apollo-bridge-structure-section-properties']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-section-property-ウェブ高さ']")?.textContent).toContain("2.455");
    expect(container.querySelector("[data-testid='apollo-section-property-断面積合計']")).not.toBeNull();
  });

  it("keeps adoption buttons present and fail-closed under NOT_GRANTED authority", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "steelUnitWeight", 77);
    const container = renderPanel(project);
    act(() => {
      const button = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      button.click();
    });

    expect(container.querySelector("[data-testid='apollo-steel-unit-weight-status']")?.textContent).toBe("PENDING");
    act(() => {
      const adopt = container.querySelector("[data-testid='apollo-adopt-steel-unit-weight']") as HTMLButtonElement;
      adopt.click();
    });

    expect(container.querySelector("[data-testid='apollo-steel-unit-weight-status']")?.textContent).toBe("PENDING");
    expect(container.querySelector("[data-testid='apollo-bridge-structure-message']")?.textContent).toContain(
      "数値設計権限が付与されていない",
    );
  });

  it("shows the current bridge system and sample disclaimer", () => {
    const container = renderPanel();
    expect(
      container.querySelector("[data-testid='apollo-current-bridge-system']")?.textContent,
    ).toContain("単径間単純桁（現在対応）");
    expect(container.querySelector("[data-testid='apollo-sample-disclaimer']")?.textContent).toContain(
      "動作確認用サンプル値です。設計基準に基づく採用値・照査済み断面ではありません。正式設計には使用しないでください。",
    );
  });

  it("fills the sample values without auto-generating, then generates on demand", () => {
    const container = renderPanel();
    act(() => {
      const sample = container.querySelector("[data-testid='apollo-sample-input']") as HTMLButtonElement;
      sample.click();
    });

    const spanInput = container.querySelector(
      "[data-testid='apollo-bridge-input-spanLength']",
    ) as HTMLInputElement;
    const widthInput = container.querySelector(
      "[data-testid='apollo-bridge-input-width']",
    ) as HTMLInputElement;
    expect(spanInput.value).toBe("30");
    expect(widthInput.value).toBe("10.5");

    expect(container.querySelector("[data-testid='apollo-bridge-structure-sdm-summary']")).toBeNull();

    act(() => {
      const generate = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      generate.click();
    });

    expect(container.querySelector("[data-testid='apollo-bridge-structure-sdm-summary']")).not.toBeNull();
    expect(container.textContent).toContain("主桁: 4 件（designStatus: NOT_AUTHORIZED）");
  });

  it("clears all inputs through the clear button", () => {
    const container = renderPanel();
    act(() => {
      const sample = container.querySelector("[data-testid='apollo-sample-input']") as HTMLButtonElement;
      sample.click();
    });
    act(() => {
      const clear = container.querySelector("[data-testid='apollo-clear-input']") as HTMLButtonElement;
      clear.click();
    });

    const spanInput = container.querySelector(
      "[data-testid='apollo-bridge-input-spanLength']",
    ) as HTMLInputElement;
    expect(spanInput.value).toBe("");
    expect(container.textContent).toContain("入力をクリアしました");
  });

  it("derives the structural model length from the span length when unset", () => {
    const container = renderPanel();
    const spanInput = container.querySelector(
      "[data-testid='apollo-bridge-input-spanLength']",
    ) as HTMLInputElement;
    act(() => {
      setInputValue(spanInput, "30");
    });
    const bridgeInput = container.querySelector(
      "[data-testid='apollo-bridge-input-bridgeLength']",
    ) as HTMLInputElement;
    expect(bridgeInput.value).toBe("30");
  });
});

describe("BridgeStructureInputPanel (continuous girder C2 UI)", () => {
  function renderContinuousPanel(initialProject: ProjectModel = createDefaultProject()) {
    return renderPanel(withBridgeStructureSystem(initialProject, BridgeSystem.CONTINUOUS));
  }

  it("renders bridge system select and continuous layout controls", () => {
    const container = renderContinuousPanel();
    expect(container.querySelector("[data-testid='apollo-bridge-system-select']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-continuous-layout-panel']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-continuous-span-table']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-continuous-support-table']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-continuous-analysis-disclaimer']")?.textContent).toContain(
      "解析・照査は未対応",
    );
    expect(container.querySelector("[data-testid='apollo-bridge-input-spanLength']")).toBeNull();
  });

  it("shows cumulative support stations and abutment/pier roles", () => {
    const container = renderContinuousPanel();
    act(() => {
      const sample = container.querySelector("[data-testid='apollo-continuous-sample-input']") as HTMLButtonElement;
      sample.click();
    });
    expect(container.querySelector("[data-testid='apollo-continuous-support-station-0']")?.textContent).toBe("0");
    expect(container.querySelector("[data-testid='apollo-continuous-support-station-1']")?.textContent).toBe("30");
    expect(container.querySelector("[data-testid='apollo-continuous-support-station-2']")?.textContent).toBe("65");
    expect(container.querySelector("[data-testid='apollo-continuous-support-station-3']")?.textContent).toBe("95");
    expect(container.querySelector("[data-testid='apollo-continuous-support-role-0']")?.textContent).toContain("橋台");
    expect(container.querySelector("[data-testid='apollo-continuous-support-role-1']")?.textContent).toContain("橋脚");
    expect(container.querySelector("[data-testid='apollo-continuous-support-role-3']")?.textContent).toContain("橋台");
  });

  it("fills continuous sample [30,35,30] without auto-generating and derives bridgeLength", () => {
    const container = renderContinuousPanel();
    act(() => {
      const sample = container.querySelector("[data-testid='apollo-continuous-sample-input']") as HTMLButtonElement;
      sample.click();
    });

    const span0 = container.querySelector("[data-testid='apollo-continuous-span-length-0']") as HTMLInputElement;
    const span1 = container.querySelector("[data-testid='apollo-continuous-span-length-1']") as HTMLInputElement;
    const span2 = container.querySelector("[data-testid='apollo-continuous-span-length-2']") as HTMLInputElement;
    expect(span0.value).toBe("30");
    expect(span1.value).toBe("35");
    expect(span2.value).toBe("30");

    const bridgeInput = container.querySelector(
      "[data-testid='apollo-bridge-input-bridgeLength']",
    ) as HTMLInputElement;
    expect(bridgeInput.value).toBe("95");
    expect(bridgeInput.readOnly).toBe(true);
    expect(container.querySelector("[data-testid='apollo-bridge-structure-sdm-summary']")).toBeNull();
    expect(container.querySelector("[data-testid='apollo-sample-disclaimer']")?.textContent).toContain(
      "連続桁の動作確認用サンプル値",
    );
  });

  it("adds and removes spans within 2-5 limits", () => {
    const container = renderContinuousPanel();
    act(() => {
      const sample = container.querySelector("[data-testid='apollo-continuous-sample-input']") as HTMLButtonElement;
      sample.click();
    });
    expect(container.querySelector("[data-testid='apollo-continuous-span-count']")?.textContent).toContain("支間数: 3");

    act(() => {
      const add = container.querySelector("[data-testid='apollo-continuous-add-span']") as HTMLButtonElement;
      add.click();
    });
    act(() => {
      const add = container.querySelector("[data-testid='apollo-continuous-add-span']") as HTMLButtonElement;
      add.click();
    });
    expect(container.querySelector("[data-testid='apollo-continuous-span-count']")?.textContent).toContain("支間数: 5");
    expect(
      (container.querySelector("[data-testid='apollo-continuous-add-span']") as HTMLButtonElement).disabled,
    ).toBe(true);

    act(() => {
      const remove = container.querySelector("[data-testid='apollo-continuous-remove-span']") as HTMLButtonElement;
      remove.click();
    });
    act(() => {
      const remove = container.querySelector("[data-testid='apollo-continuous-remove-span']") as HTMLButtonElement;
      remove.click();
    });
    act(() => {
      const remove = container.querySelector("[data-testid='apollo-continuous-remove-span']") as HTMLButtonElement;
      remove.click();
    });
    expect(container.querySelector("[data-testid='apollo-continuous-span-count']")?.textContent).toContain("支間数: 2");
    expect(
      (container.querySelector("[data-testid='apollo-continuous-remove-span']") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("shows stale message after editing a continuous span length post-generate", () => {
    const container = renderPanel(fillValidInput(createDefaultProject()));
    act(() => {
      const button = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      button.click();
    });

    const spanInput = container.querySelector(
      "[data-testid='apollo-continuous-span-length-0']",
    ) as HTMLInputElement;
    act(() => {
      setInputValue(spanInput, "45");
    });

    expect(container.querySelector("[data-testid='apollo-bridge-structure-stale-message']")).not.toBeNull();
    const bridgeInput = container.querySelector(
      "[data-testid='apollo-bridge-input-bridgeLength']",
    ) as HTMLInputElement;
    expect(bridgeInput.value).toBe("205");
  });

  it("generates continuous StructuralDesignModel with NOT_AUTHORIZED entities", () => {
    const container = renderContinuousPanel();
    act(() => {
      const sample = container.querySelector("[data-testid='apollo-continuous-sample-input']") as HTMLButtonElement;
      sample.click();
    });
    act(() => {
      const button = container.querySelector("[data-testid='apollo-generate-structure']") as HTMLButtonElement;
      button.click();
    });

    expect(container.querySelector("[data-testid='apollo-bridge-structure-sdm-summary']")).not.toBeNull();
    expect(container.textContent).toContain("主桁: 4 件（designStatus: NOT_AUTHORIZED）");
    expect(container.querySelector("[data-testid='apollo-bridge-structure-main-girder-status']")?.textContent).toBe(
      "主桁1: NOT_AUTHORIZED",
    );
  });

  it("switches back to SIMPLE_SINGLE and restores span length input", () => {
    const container = renderContinuousPanel();
    act(() => {
      const sample = container.querySelector("[data-testid='apollo-continuous-sample-input']") as HTMLButtonElement;
      sample.click();
    });
    act(() => {
      const select = container.querySelector("[data-testid='apollo-bridge-system-select']") as HTMLSelectElement;
      select.value = BridgeSystem.SIMPLE_SINGLE;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.querySelector("[data-testid='apollo-bridge-input-spanLength']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-continuous-layout-panel']")).toBeNull();
    expect(
      container.querySelector("[data-testid='apollo-current-bridge-system']")?.textContent,
    ).toContain("単径間単純桁（現在対応）");
  });
});
