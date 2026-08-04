// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";
import { createDefaultProject } from "../../../data/defaultProject";
import {
  adjacentGuidedSlide,
  buildGuidedModeChromeState,
  GUIDED_SLIDE_DEFINITIONS,
  GUIDED_SLIDE_IDS,
  GuidedModeShell,
  getGuidedSlideDefinition,
  GUIDED_PHASES,
  getPhaseForSlide,
} from "../index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const { root, container } of mountedRoots.splice(0)) {
    root.unmount();
    container.remove();
  }
});

function render(node: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(node);
  });
  return container;
}

describe("guided slide registry (DEC-S5-0009)", () => {
  it("exposes exactly 15 slides G01–G15 in order", () => {
    expect(GUIDED_SLIDE_IDS).toHaveLength(15);
    expect(GUIDED_SLIDE_DEFINITIONS).toHaveLength(15);
    expect(GUIDED_SLIDE_DEFINITIONS.map((s) => s.slideId)).toEqual([...GUIDED_SLIDE_IDS]);
    expect(getGuidedSlideDefinition("G03").theme).toContain("舗装");
    expect(getGuidedSlideDefinition("G15").decideWhat).toContain("未実装");
  });

  it("navigates adjacent slides without wrapping", () => {
    expect(adjacentGuidedSlide("G01", "back")).toBeNull();
    expect(adjacentGuidedSlide("G01", "next")).toBe("G02");
    expect(adjacentGuidedSlide("G15", "next")).toBeNull();
    expect(adjacentGuidedSlide("G15", "back")).toBe("G14");
  });

  it("builds chrome progress labels", () => {
    const chrome = buildGuidedModeChromeState("G07");
    expect(chrome.progressLabel).toBe("7/15");
    expect(chrome.canGoBack).toBe(true);
    expect(chrome.canGoNext).toBe(true);
    expect(chrome.currentPhaseId).toBe(2);
    expect(chrome.currentPhaseLabel).toBe("主桁・床版");
  });

  it("defines exactly 6 phases with correct slide grouping", () => {
    expect(GUIDED_PHASES).toHaveLength(6);
    expect(GUIDED_PHASES[0].label).toBe("計画");
    expect(GUIDED_PHASES[0].slideIds).toEqual(["G01", "G02", "G03", "G04"]);
    expect(GUIDED_PHASES[1].label).toBe("主桁・床版");
    expect(GUIDED_PHASES[1].slideIds).toEqual(["G05", "G06", "G07"]);
    expect(GUIDED_PHASES[2].label).toBe("二次部材");
    expect(GUIDED_PHASES[2].slideIds).toEqual(["G08", "G09", "G10"]);
    expect(GUIDED_PHASES[3].label).toBe("荷重");
    expect(GUIDED_PHASES[3].slideIds).toEqual(["G11"]);
    expect(GUIDED_PHASES[4].label).toBe("確認");
    expect(GUIDED_PHASES[4].slideIds).toEqual(["G12", "G13", "G14"]);
    expect(GUIDED_PHASES[5].label).toBe("完了");
    expect(GUIDED_PHASES[5].slideIds).toEqual(["G15"]);
  });

  it("maps each slide to correct phase", () => {
    expect(getPhaseForSlide("G01").phaseId).toBe(1);
    expect(getPhaseForSlide("G05").phaseId).toBe(2);
    expect(getPhaseForSlide("G08").phaseId).toBe(3);
    expect(getPhaseForSlide("G11").phaseId).toBe(4);
    expect(getPhaseForSlide("G12").phaseId).toBe(5);
    expect(getPhaseForSlide("G15").phaseId).toBe(6);
  });
});

describe("GuidedModeShell", () => {
  it("renders phase bar, step strip, and sticky footer", () => {
    const escapes: string[] = [];
    const saves: number[] = [];
    const container = render(
      <GuidedModeShell
        project={createDefaultProject()}
        onOpenDetail={(escape) => escapes.push(escape.label)}
        onSave={() => saves.push(1)}
      />,
    );

    expect(container.querySelector("[data-testid='apollo-guided-mode-shell']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-guided-phase-bar']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-guided-step-strip']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-guided-progress']")?.textContent).toContain("計画");
    expect(container.querySelector("[data-testid='apollo-guided-theme']")?.textContent).toContain("サンプル");
    expect(container.querySelector("[data-testid='apollo-guided-decide-what']")?.textContent).toContain(
      "この画面で決めること",
    );

    const diagnostics = container.querySelector(
      "[data-testid='apollo-guided-diagnostics']",
    ) as HTMLDetailsElement | null;
    expect(diagnostics).not.toBeNull();
    expect(diagnostics?.open).toBe(false);

    expect(container.querySelector("[data-testid='apollo-guided-nav']")?.className).toContain("apollo-sticky-footer");
    expect(container.querySelector("[data-testid='apollo-guided-back']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-guided-next']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-guided-save']")).not.toBeNull();
  });

  it("navigates forward on next and shows correct slide ID", () => {
    const saves: number[] = [];
    const container = render(
      <GuidedModeShell
        project={createDefaultProject()}
        onOpenDetail={() => {}}
        onSave={() => saves.push(1)}
      />,
    );

    expect(container.querySelector("[data-testid='apollo-guided-current-id']")?.textContent).toContain("G01");

    act(() => {
      (container.querySelector("[data-testid='apollo-guided-next']") as HTMLButtonElement).click();
    });
    expect(saves).toHaveLength(0); // next should NOT save
    expect(container.querySelector("[data-testid='apollo-guided-current-id']")?.textContent).toContain("G02");
  });

  it("shows G15 pending message and next button shows confirmation label", () => {
    const container = render(
      <GuidedModeShell
        project={createDefaultProject()}
        initialSlideId="G15"
        onOpenDetail={() => {}}
        onSave={() => {}}
      />,
    );

    expect(container.querySelector("[data-testid='apollo-guided-g15-pending']")?.textContent).toContain(
      "未実装",
    );
    expect(
      (container.querySelector("[data-testid='apollo-guided-next']") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("allows direct jump to any slide via all-steps toggle", () => {
    const container = render(
      <GuidedModeShell
        project={createDefaultProject()}
        onOpenDetail={() => {}}
        onSave={() => {}}
      />,
    );

    expect(container.querySelector("[data-testid='apollo-guided-show-all-toggle']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-guided-show-all-toggle']")?.textContent).toContain("全工程");

    // Show all steps first
    act(() => {
      (container.querySelector("[data-testid='apollo-guided-show-all-toggle']") as HTMLButtonElement).click();
    });
    // Now jump to G05
    act(() => {
      (container.querySelector("[data-testid='apollo-guided-jump-G05']") as HTMLButtonElement).click();
    });
    expect(container.querySelector("[data-testid='apollo-guided-current-id']")?.textContent).toContain("G05");
  });

  it("detail escape button works", () => {
    const escapes: string[] = [];
    const container = render(
      <GuidedModeShell
        project={createDefaultProject()}
        onOpenDetail={(escape) => escapes.push(escape.label)}
        onSave={() => {}}
      />,
    );

    act(() => {
      (container.querySelector("[data-testid='apollo-guided-detail-escape']") as HTMLButtonElement).click();
    });
    expect(escapes.length).toBeGreaterThan(0);
  });

  it("back button is disabled on first slide", () => {
    const container = render(
      <GuidedModeShell
        project={createDefaultProject()}
        onOpenDetail={() => {}}
      />,
    );

    expect((container.querySelector("[data-testid='apollo-guided-back']") as HTMLButtonElement).disabled).toBe(true);
  });
});