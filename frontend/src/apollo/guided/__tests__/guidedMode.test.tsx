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
    expect(getGuidedSlideDefinition("G15").decideWhat).toContain("4-G");
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
  });
});

describe("GuidedModeShell", () => {
  it("renders theme, progress, collapsed diagnostics, and save-next navigation", () => {
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
    expect(container.querySelector("[data-testid='apollo-guided-progress']")?.textContent).toContain("1/15");
    expect(container.querySelector("[data-testid='apollo-guided-theme']")?.textContent).toContain("サンプル");
    expect(container.querySelector("[data-testid='apollo-guided-decide-what']")?.textContent).toContain(
      "この画面で決めること",
    );

    const diagnostics = container.querySelector(
      "[data-testid='apollo-guided-diagnostics']",
    ) as HTMLDetailsElement | null;
    expect(diagnostics).not.toBeNull();
    expect(diagnostics?.open).toBe(false);

    act(() => {
      (container.querySelector("[data-testid='apollo-guided-save-next']") as HTMLButtonElement).click();
    });
    expect(saves).toHaveLength(1);
    expect(container.querySelector("[data-testid='apollo-guided-current-id']")?.textContent).toContain("G02");

    act(() => {
      (container.querySelector("[data-testid='apollo-guided-detail-escape']") as HTMLButtonElement).click();
    });
    expect(escapes.some((label) => label.includes("LINER"))).toBe(true);

    act(() => {
      (container.querySelector("[data-testid='apollo-guided-jump-G15']") as HTMLButtonElement).click();
    });
    expect(container.querySelector("[data-testid='apollo-guided-g15-pending']")?.textContent).toContain(
      "未実装",
    );
    expect((container.querySelector("[data-testid='apollo-guided-save-next']") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
